import { useState, useMemo } from "react";
import type { Ata, DatabaseState } from "../types";
import { PARTICIPANTES, now } from "../constants";
import { saveAta, deleteAta } from "../lib/firebase";
import { FileText, Calendar, User, Users, Trash2, Plus, CheckCircle2 } from "lucide-react";

interface TabAtasProps {
  dbState: DatabaseState;
  currentUser?: string;
}

export function TabAtas({ dbState, currentUser = "admin" }: TabAtasProps) {
  const [titulo, setTitulo] = useState("");
  const [demandante, setDemandante] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [pauta, setPauta] = useState("");
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [msgAta, setMsgAta] = useState("");
  const [showNewAtaForm, setShowNewAtaForm] = useState(false);

  const handleToggleParticipante = (p: string) => {
    if (participantes.includes(p)) {
      setParticipantes(participantes.filter((x) => x !== p));
    } else {
      setParticipantes([...participantes, p]);
    }
  };

  const handleSalvarAta = async () => {
    if (!titulo.trim()) {
      alert("Informe o título da reunião.");
      return;
    }
    if (!demandante) {
      alert("Selecione quem abriu a demanda.");
      return;
    }
    if (!data) {
      alert("Informe a data da reunião.");
      return;
    }
    if (!pauta.trim()) {
      alert("Descreva o que foi tratado na reunião.");
      return;
    }
    if (participantes.length === 0) {
      alert("Selecione ao menos um participante.");
      return;
    }

    const id = "ata_" + Date.now();
    const novaAta: Ata = {
      id,
      titulo: titulo.trim(),
      demandante,
      data,
      pauta: pauta.trim(),
      participantes,
      criadoEm: now(),
      criadoPor: currentUser,
    };

    try {
      await saveAta(novaAta);
      setMsgAta("Ata registrada com sucesso!");
      setTimeout(() => setMsgAta(""), 4000);

      setTitulo("");
      setDemandante("");
      setPauta("");
      setParticipantes([]);
      setShowNewAtaForm(false);
    } catch (err: any) {
      alert("Erro ao registrar ata: " + err.message);
    }
  };

  const handleDeleteAta = async (a: Ata) => {
    if (confirm(`Excluir a ata "${a.titulo}"?`)) {
      await deleteAta(a.id);
    }
  };

  const atasOrdenadas = useMemo(() => {
    return Object.values(dbState.atas || {}).sort((a, b) =>
      b.data.localeCompare(a.data)
    );
  }, [dbState.atas]);

  return (
    <div className="space-y-6">
      {/* ═══ 1. NOVA ATA DE REUNIÃO ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Atas e Decisões de Reunião
              </h2>
              <p className="text-xs text-zinc-400">
                Alinhamentos societários, pautas comerciais e decisões operacionais.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNewAtaForm(!showNewAtaForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="size-4" />
            <span>{showNewAtaForm ? "Fechar Formulário" : "Registrar Nova Ata"}</span>
          </button>
        </div>

        {showNewAtaForm && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
              <div className="space-y-1 sm:col-span-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Título da Reunião
                </label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Alinhamento comercial Julho 2026"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Quem abriu a demanda
                </label>
                <select
                  value={demandante}
                  onChange={(e) => setDemandante(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione...</option>
                  {PARTICIPANTES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Data da Reunião
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Participantes */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Participantes
              </label>
              <div className="flex items-center gap-4 flex-wrap">
                {PARTICIPANTES.map((p) => (
                  <label
                    key={p}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={participantes.includes(p)}
                      onChange={() => handleToggleParticipante(p)}
                      className="size-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500 text-emerald-500"
                    />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pauta */}
            <div className="space-y-1 mb-5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                O que foi tratado / Pauta e Decisões
              </label>
              <textarea
                rows={5}
                value={pauta}
                onChange={(e) => setPauta(e.target.value)}
                placeholder="Descreva os tópicos discutidos, decisões tomadas e próximos passos..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 resize-y leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSalvarAta}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl px-6 py-2.5 text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
              >
                Salvar Ata
              </button>
              {msgAta && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>{msgAta}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. ATAS REGISTRADAS ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 mb-5">
          <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Atas Registradas ({atasOrdenadas.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Documentação de atas passadas.
            </p>
          </div>
        </div>

        {atasOrdenadas.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3">Nenhuma ata registrada ainda.</p>
        ) : (
          <div className="space-y-4">
            {atasOrdenadas.map((a) => (
              <div
                key={a.id}
                className="border border-white/10 rounded-2xl p-5 bg-zinc-950/60 shadow-md space-y-3"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-sm text-white mb-1">
                      {a.titulo}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="size-3.5 text-zinc-500" />
                        {a.data}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <User className="size-3.5 text-zinc-500" />
                        Demanda: <strong className="text-zinc-200">{a.demandante}</strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5 text-zinc-500" />
                        {a.participantes.join(", ")}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAta(a)}
                    className="text-zinc-500 hover:text-red-400 p-1 transition-colors flex items-center gap-1 text-xs"
                    title="Excluir ata"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>

                <div className="bg-zinc-900/70 border border-white/5 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {a.pauta}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
