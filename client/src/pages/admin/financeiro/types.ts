export interface Cliente {
  id: string;
  metaId?: string;
  nome: string;
  cnpj: string;
  endereco?: string;
  respUnid?: string;
  respFin?: string;
  emailBol?: string;
  vencDia: string | number;
  mensalidade: number;
  dataInicio?: string;
  mesInicial?: string;
  criadoEm?: string;
  editadoEm?: string;
  editadoPor?: string;
}

export interface CobrancaDivisao {
  caixa: number;
  patrono?: number;
  socio3?: number;
  davi: number;
  lucas: number;
  ana: number;
  em: string;
}

export interface Cobranca {
  mes: string;
  boletoGerado: boolean;
  nfGerada: boolean;
  recebido: boolean;
  valorRecebido: number | null;
  divisao?: CobrancaDivisao | null;
}

export interface ChecklistItemState {
  marcado: boolean;
  por?: string | null;
  quando?: string | null;
  texto?: string;
  grupo?: string;
  extra?: boolean;
}

export interface Despesa {
  id: string;
  nome: string;
  cat: string;
  val: number;
  dia: number;
  mes: string;
  desc?: string;
  status: "pendente" | "paga";
  criadoEm?: string;
  criadoPor?: string;
  editadoEm?: string;
  editadoPor?: string;
}

export interface Ata {
  id: string;
  titulo: string;
  demandante: string;
  data: string;
  pauta: string;
  participantes: string[];
  criadoEm?: string;
  criadoPor?: string;
}

export interface Caixa {
  saldo: number;
  metaFimAno: number;
  atualizadoEm?: string;
}

export interface DespesaFixa {
  id: string;
  nome: string;
  val: number;
  desc?: string;
}

export interface ClienteArquivado {
  nome: string;
  cnpj: string;
  mensalidade: number;
  encerradoEm: string;
  encerradoPor: string;
  cobrancas: Record<string, Cobranca>;
}

export interface FinancialLog {
  u: string;
  a: string;
  q: string;
}

export interface DatabaseState {
  clientes: Record<string, Cliente>;
  cobrancas: Record<string, Record<string, Cobranca>>;
  checklists: Record<string, Record<string, ChecklistItemState>>;
  arquivados: Record<string, ClienteArquivado>;
  despesas: Record<string, Despesa>;
  atas: Record<string, Ata>;
  caixa: Caixa;
  despFixas: Record<string, DespesaFixa>;
  logs: FinancialLog[];
}
