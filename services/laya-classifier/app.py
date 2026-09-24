import hmac
import json
import logging
import re
import os
import threading
import time

os.environ.setdefault("USE_TF", "0")  # evita deadlock do abseil ao importar transformers com TF instalado

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("laya-classifier")

SERVICE_SECRET = os.environ.get("LAYA_SERVICE_SECRET", "")
if not SERVICE_SECRET:
    raise RuntimeError("LAYA_SERVICE_SECRET não configurada")

CRM_STAGE_CRITERIA = {
    "lead_not_responded": "existe um lead, mas a equipe ainda não respondeu de forma útil",
    "lead_responded": "a equipe respondeu, mas o contato ainda não respondeu à equipe",
    "follow_up": "a equipe precisa retomar a conversa após ausência de resposta ou pendência",
    "lead_replied": "o contato respondeu e há interesse/continuidade, sem negociação clara",
    "negotiation": "há proposta, preço, condições, documentos, agendamento final ou negociação ativa",
    "closed_won": "há confirmação clara e inequívoca de contratação, compra ou conversão",
    "closed_lost": "há desistência clara, recusa definitiva ou perda confirmada",
}

app = FastAPI(title="Laya Lead Stage Classifier")
agent = None
# Inferências em paralelo multiplicam a memória de ativação e estouram o mem_limit do container.
predict_lock = threading.Lock()


@app.on_event("startup")
def load_model() -> None:
    global agent
    import torch
    import laya

    # O container roda com limite de ~0,6 vCPU; mais threads só disputam o core com a Evolution API.
    torch.set_num_threads(1)
    started = time.monotonic()
    # Só o checkpoint multilíngue (322M, cobre PT-BR). Router(preload=True) carrega 3 checkpoints
    # (~4,6GB em fp32) e esgotou a RAM da VPS em 2026-09-23.
    agent = laya.load("convaiinnovations/laya", subfolder="multilingual", device="cpu")
    logger.info("Laya multilingual carregado em %.1fs", time.monotonic() - started)


class Message(BaseModel):
    direction: str
    bodyText: str
    sentAt: str | None = None


class ClassifyRequest(BaseModel):
    leadId: str
    instanceName: str
    currentStage: str
    messages: list[Message]


class ClassifyResponse(BaseModel):
    proposedStage: str
    confidence: float


def sanitize(value: str) -> str:
    return value.replace("<", "&lt;").replace(">", "&gt;").strip()[:1200]


def build_transcript(messages: list[Message]) -> str:
    lines = []
    for message in messages:
        if not message.bodyText.strip():
            continue
        speaker = "CONTATO" if message.direction == "incoming" else "EQUIPE"
        lines.append(f"[{speaker}] {sanitize(message.bodyText)}")
    return "\n".join(lines) if lines else "Sem mensagens de texto disponíveis."


def verify_secret(authorization: str | None) -> None:
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token or not hmac.compare_digest(token, SERVICE_SECRET):
        raise HTTPException(status_code=401, detail="não autorizado")


@app.get("/health")
def health():
    return {"ok": agent is not None}


@app.post("/classify", response_model=ClassifyResponse)
def classify(payload: ClassifyRequest, authorization: str | None = Header(default=None)):
    verify_secret(authorization)
    if agent is None:
        raise HTTPException(status_code=503, detail="modelo ainda carregando")

    state = {
        "instance": payload.instanceName,
        "current_stage": payload.currentStage,
        "conversation": build_transcript(payload.messages),
    }
    questions = {
        "stage": {
            "type": "choice",
            "instructions": (
                "Classifique de forma conservadora a etapa do funil de vendas desta conversa de "
                "WhatsApp com base estritamente no histórico fornecido. A etapa atual é "
                f"{payload.currentStage}. Só escolha closed_won ou closed_lost com evidência explícita."
            ),
            "criteria": CRM_STAGE_CRITERIA,
        }
    }

    with predict_lock:
        result = agent.predict(state, questions)
    answer = result.get("answers", {}).get("stage", {})
    proposed_stage = answer.get("choice")
    confidence = answer.get("confidence", answer.get("probability"))

    if proposed_stage not in CRM_STAGE_CRITERIA or confidence is None:
        logger.warning("Resposta inesperada da Laya para lead %s: %s", payload.leadId, result)
        raise HTTPException(status_code=502, detail="resposta inválida do modelo")

    return ClassifyResponse(proposedStage=proposed_stage, confidence=float(confidence))


# Limites do /predict genérico. O custo da inferência cresce com o número de perguntas x opções
# (cada opção vira uma sequência no forward pass) e o container tem só 2000m: estes tetos mantêm o
# pior caso próximo do /classify medido (~9s, ~1,7GB) em vez de deixar um cliente estourar a memória.
MAX_STATE_CHARS = 12000
MAX_QUESTIONS = 4
MAX_OPTIONS = 10
MAX_INSTRUCTIONS_CHARS = 800
MAX_CRITERION_CHARS = 300
QUESTION_ID = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


def _check_text(value: object, limit: int, where: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{where}: texto obrigatório")
    if len(value) > limit:
        raise ValueError(f"{where}: máximo de {limit} caracteres")


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    instructions: str
    criteria: dict[str, str] | list[str] | None = None

    @model_validator(mode="after")
    def check_shape(self):
        _check_text(self.instructions, MAX_INSTRUCTIONS_CHARS, "instructions")
        crit = self.criteria
        if self.type == "choice":
            if not isinstance(crit, dict) or not 2 <= len(crit) <= MAX_OPTIONS:
                raise ValueError(f"choice exige criteria como objeto opção→descrição com 2 a {MAX_OPTIONS} opções")
            for key, desc in crit.items():
                _check_text(key, 64, "opção")
                _check_text(desc, MAX_CRITERION_CHARS, f"descrição de {key}")
        elif self.type == "score":
            if not isinstance(crit, list) or not 2 <= len(crit) <= MAX_OPTIONS:
                raise ValueError(f"score exige criteria como lista ordenada de 2 a {MAX_OPTIONS} níveis")
            for i, level in enumerate(crit):
                _check_text(level, MAX_CRITERION_CHARS, f"nível {i}")
        elif self.type == "noul":
            if crit is not None:
                if not isinstance(crit, dict) or not set(crit) <= {"true", "false"}:
                    raise ValueError("noul aceita criteria apenas com as chaves 'true' e 'false'")
                for key, desc in crit.items():
                    _check_text(desc, MAX_CRITERION_CHARS, f"descrição de {key}")
        else:
            raise ValueError("type deve ser choice, score ou noul")
        return self


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: str | dict | list
    questions: dict[str, Question] = Field(min_length=1, max_length=MAX_QUESTIONS)

    @model_validator(mode="after")
    def check_limits(self):
        size = len(self.state) if isinstance(self.state, str) else len(json.dumps(self.state, ensure_ascii=False))
        if size == 0 or size > MAX_STATE_CHARS:
            raise ValueError(f"state deve ter entre 1 e {MAX_STATE_CHARS} caracteres")
        for qid in self.questions:
            if not QUESTION_ID.match(qid):
                raise ValueError(f"id de pergunta inválido: {qid!r} (use snake_case, até 40 caracteres)")
        return self


@app.post("/predict")
def predict(payload: PredictRequest, authorization: str | None = Header(default=None)):
    verify_secret(authorization)
    if agent is None:
        raise HTTPException(status_code=503, detail="modelo ainda carregando")

    questions = {qid: q.model_dump(exclude_none=True) for qid, q in payload.questions.items()}
    started = time.monotonic()
    with predict_lock:
        result = agent.predict(payload.state, questions)
    answers = result.get("answers", {})
    if set(answers) != set(questions):
        logger.warning("Resposta incompleta da Laya no /predict: %s", result)
        raise HTTPException(status_code=502, detail="resposta inválida do modelo")

    return {
        "answers": {
            qid: {key: value for key, value in answer.items() if key != "action"}
            for qid, answer in answers.items()
        },
        "elapsedMs": round((time.monotonic() - started) * 1000),
    }
