import { getAuthedSupabase } from "./supabase.js";
import {
  getMetaDirectClients,
  getMetaDirectDaily,
  isMetaDirectActive,
  isMetaDirectSuspended,
  normalizeAccountId,
  type MetaDailyRow,
} from "./metaDirectService.js";

// ─── Tracking de Acessos Recentes ───────────────────────────────────────────
const clientAccessCounts = new Map<string, { count: number; lastAccessedAt: number }>();

export function recordClientAccess(clientId: string): void {
  if (!clientId) return;
  const current = clientAccessCounts.get(clientId) || { count: 0, lastAccessedAt: 0 };
  clientAccessCounts.set(clientId, {
    count: current.count + 1,
    lastAccessedAt: Date.now(),
  });
}

// ─── Estado do Serviço de Backup ────────────────────────────────────────────
export type DailyBackupStatus = {
  lastRunAt: string | null;
  lastRunSuccess: boolean;
  unitsProcessed: number;
  totalRowsUpserted: number;
  lastError: string | null;
  nextScheduledRunAt: string | null;
  isRunning: boolean;
  priorityUnitsCount: number;
};

const backupStatus: DailyBackupStatus = {
  lastRunAt: null,
  lastRunSuccess: false,
  unitsProcessed: 0,
  totalRowsUpserted: 0,
  lastError: null,
  nextScheduledRunAt: null,
  isRunning: false,
  priorityUnitsCount: 0,
};

export function getDailyBackupStatus(): DailyBackupStatus {
  return { ...backupStatus };
}

// ─── Identificação das Contas Prioritárias / Mais Acessadas ─────────────────
export type PriorityUnit = {
  id: string;
  name: string;
  accountId: string;
  reason: string;
};

export async function getPriorityUnitsForBackup(maxUnits = 15): Promise<PriorityUnit[]> {
  const priorityMap = new Map<string, PriorityUnit>();

  // 1. Unidades mais acessadas registradas em memória
  const sortedAccesses = Array.from(clientAccessCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxUnits);

  for (const [clientId] of sortedAccesses) {
    priorityMap.set(clientId, {
      id: clientId,
      name: clientId,
      accountId: normalizeAccountId(clientId),
      reason: "Mais acessada na Dashboard recentemente",
    });
  }

  // 2. Unidades com vínculos de usuários ativos no Supabase
  try {
    const sb = await getAuthedSupabase();
    if (sb) {
      const { data: userAccess } = await sb
        .from("user_client_access")
        .select("client_id, clients(id, name, status)")
        .limit(30);

      if (Array.isArray(userAccess)) {
        for (const item of userAccess) {
          const clientData = Array.isArray(item.clients) ? item.clients[0] : item.clients;
          const id = item.client_id || clientData?.id;
          if (id && !priorityMap.has(id)) {
            priorityMap.set(id, {
              id,
              name: clientData?.name || id,
              accountId: normalizeAccountId(id),
              reason: "Vinculada a usuário ativo",
            });
          }
        }
      }

      // Se ainda houver espaço, busca unidades marcadas como ativas
      if (priorityMap.size < maxUnits) {
        const { data: activeClients } = await sb
          .from("clients")
          .select("id, name")
          .limit(maxUnits - priorityMap.size);

        if (Array.isArray(activeClients)) {
          for (const c of activeClients) {
            if (c.id && !priorityMap.has(c.id)) {
              priorityMap.set(c.id, {
                id: c.id,
                name: c.name || c.id,
                accountId: normalizeAccountId(c.id),
                reason: "Unidade ativa cadastrada",
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[daily-backup] Aviso ao buscar unidades prioritárias do Supabase:", err.message);
  }

  // 3. Fallback ou enriquecimento com catálogo de contas da Meta
  try {
    if (priorityMap.size < 5 && isMetaDirectActive()) {
      const metaClients = await getMetaDirectClients().catch(() => []);
      for (const m of metaClients.slice(0, maxUnits - priorityMap.size)) {
        if (!priorityMap.has(m.id) && !priorityMap.has(m.account_id)) {
          priorityMap.set(m.id, {
            id: m.id,
            name: m.name,
            accountId: normalizeAccountId(m.account_id || m.id),
            reason: "Conta principal Meta Ads",
          });
        }
      }
    }
  } catch {
    // ignore
  }

  const result = Array.from(priorityMap.values()).slice(0, maxUnits);
  backupStatus.priorityUnitsCount = result.length;
  return result;
}

// ─── Formatação de Datas ISO (YYYY-MM-DD) ───────────────────────────────────
export function getBackupTargetDates(): { today: string; yesterday: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  return { today, yesterday };
}

// ─── Gravação de Métricas Diárias no Supabase ────────────────────────────────
export async function saveDailyMetricsToSupabase(
  unit: PriorityUnit,
  dailyRows: MetaDailyRow[],
): Promise<number> {
  if (!dailyRows.length) return 0;
  const sb = await getAuthedSupabase();
  if (!sb) {
    throw new Error("Cliente Supabase não disponível para persistir backup");
  }

  const nowIso = new Date().toISOString();
  const rowsToInsert = dailyRows.map((row) => ({
    client_id: unit.id,
    account_id: unit.accountId,
    date_start: row.date_start,
    date_stop: row.date_stop || row.date_start,
    total_spend: row.total_spend || 0,
    total_conversas_iniciadas: row.total_conversas_iniciadas || 0,
    total_messaging_connections: row.total_messaging_connections || 0,
    total_primeiras_respostas: row.total_primeiras_respostas || 0,
    total_conversas_respondidas: row.total_conversas_respondidas || 0,
    total_leads_meta: row.total_leads_meta || 0,
    total_impressions: row.total_impressions || 0,
    impressions: row.total_impressions || 0,
    total_clicks: row.total_clicks || 0,
    clicks: row.total_clicks || 0,
    avg_ctr: row.avg_ctr || 0,
    avg_cpc: row.avg_cpc || 0,
    avg_cpm: row.avg_cpm || 0,
    avg_frequency: row.avg_frequency || 0,
    custo_por_conversa: row.custo_por_conversa ?? null,
    synced_at: nowIso,
  }));

  // Upsert com fallback de tabela (tenta meta_ads_daily_summary)
  const { error } = await sb
    .from("meta_ads_daily_summary")
    .upsert(rowsToInsert, { onConflict: "client_id,date_start" });

  if (error) {
    // Se a tabela tiver conflito em outra chave, tenta insert simples
    const { error: insertError } = await sb.from("meta_ads_daily_summary").insert(rowsToInsert);
    if (insertError) {
      throw new Error(`Falha ao gravar no Supabase: ${insertError.message}`);
    }
  }

  return rowsToInsert.length;
}

// ─── Execução da Rotina de Backup Diário ─────────────────────────────────────
export async function runDailyMetricsBackupRoutine(): Promise<{
  success: boolean;
  unitsProcessed: number;
  totalRowsUpserted: number;
  error?: string;
}> {
  if (backupStatus.isRunning) {
    return {
      success: false,
      unitsProcessed: 0,
      totalRowsUpserted: 0,
      error: "Rotina de backup já está em execução no momento.",
    };
  }

  if (isMetaDirectSuspended()) {
    return {
      success: false,
      unitsProcessed: 0,
      totalRowsUpserted: 0,
      error: "Meta Direct temporariamente suspenso por rate limit. Backup adiado.",
    };
  }

  backupStatus.isRunning = true;
  backupStatus.lastError = null;

  let totalUpserted = 0;
  let unitsProcessed = 0;
  const { today, yesterday } = getBackupTargetDates();

  try {
    const priorityUnits = await getPriorityUnitsForBackup(15);
    console.log(`[daily-backup] Iniciando backup diário de métricas para ${priorityUnits.length} contas prioritárias (${yesterday} a ${today})...`);

    for (const unit of priorityUnits) {
      if (isMetaDirectSuspended()) {
        console.warn("[daily-backup] Rate limit atingido durante rotina de backup. Interrompendo suavemente.");
        break;
      }

      try {
        // Consulta métricas dos últimos 2 dias para a conta
        const daily = await getMetaDirectDaily(unit.accountId || unit.id, yesterday, today);
        if (daily && daily.length > 0) {
          const inserted = await saveDailyMetricsToSupabase(unit, daily);
          totalUpserted += inserted;
        }
        unitsProcessed++;

        // Delay suave de 400ms entre requisições para evitar rate limit na Meta
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (unitErr: any) {
        console.warn(`[daily-backup] Aviso ao processar unidade ${unit.name} (${unit.id}):`, unitErr.message);
      }
    }

    backupStatus.lastRunAt = new Date().toISOString();
    backupStatus.lastRunSuccess = true;
    backupStatus.unitsProcessed = unitsProcessed;
    backupStatus.totalRowsUpserted = totalUpserted;

    console.log(`[daily-backup] Backup diário concluído com sucesso: ${unitsProcessed} unidades processadas, ${totalUpserted} registros gravados.`);

    return {
      success: true,
      unitsProcessed,
      totalRowsUpserted: totalUpserted,
    };
  } catch (err: any) {
    console.error("[daily-backup] Erro durante a rotina de backup diário:", err);
    backupStatus.lastRunAt = new Date().toISOString();
    backupStatus.lastRunSuccess = false;
    backupStatus.lastError = err.message;
    return {
      success: false,
      unitsProcessed,
      totalRowsUpserted: totalUpserted,
      error: err.message,
    };
  } finally {
    backupStatus.isRunning = false;
  }
}

// ─── Agendador Recorrente (Final do Dia & Periódico) ─────────────────────────
let backupTimer: NodeJS.Timeout | null = null;

export function calculateNextBackupSchedule(): { delayMs: number; targetDate: Date } {
  const now = new Date();
  const target = new Date(now);

  // Agenda para as 23:45 do dia corrente
  target.setHours(23, 45, 0, 0);

  // Se já passou das 23:45 hoje, agenda para as 23:45 de amanhã
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const delayMs = target.getTime() - now.getTime();
  return { delayMs, targetDate: target };
}

export function startDailyMetricsBackupScheduler(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }

  const scheduleNext = () => {
    const { delayMs, targetDate } = calculateNextBackupSchedule();
    backupStatus.nextScheduledRunAt = targetDate.toISOString();
    console.log(`[daily-backup] Próximo backup diário automático agendado para: ${targetDate.toLocaleString("pt-BR")}`);

    backupTimer = setTimeout(async () => {
      try {
        await runDailyMetricsBackupRoutine();
      } catch (err) {
        console.error("[daily-backup] Erro na execução automática do backup:", err);
      } finally {
        scheduleNext();
      }
    }, Math.min(delayMs, 24 * 60 * 60 * 1000));
  };

  scheduleNext();

  // Executa uma sincronização leve 1 minuto após o servidor subir (se Meta estiver ativa)
  setTimeout(() => {
    if (isMetaDirectActive() && !isMetaDirectSuspended()) {
      console.log("[daily-backup] Executando sincronização inicial de aquecimento de métricas...");
      void runDailyMetricsBackupRoutine().catch(() => {});
    }
  }, 60 * 1000);
}

export function stopDailyMetricsBackupScheduler(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
}
