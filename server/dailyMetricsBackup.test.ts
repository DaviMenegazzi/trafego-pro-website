import { describe, expect, it } from "vitest";
import {
  calculateNextBackupSchedule,
  getBackupTargetDates,
  getDailyBackupStatus,
  getPriorityUnitsForBackup,
  recordClientAccess,
} from "./dailyMetricsBackupService.js";

describe("Daily Metrics Backup Service", () => {
  it("calcula datas de hoje e ontem no formato YYYY-MM-DD", () => {
    const { today, yesterday } = getBackupTargetDates();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(today).getTime()).toBeGreaterThanOrEqual(new Date(yesterday).getTime());
  });

  it("calcula o próximo agendamento para 23:45 com delay positivo", () => {
    const { delayMs, targetDate } = calculateNextBackupSchedule();
    expect(delayMs).toBeGreaterThan(0);
    expect(targetDate.getHours()).toBe(23);
    expect(targetDate.getMinutes()).toBe(45);
  });

  it("registra contagem de acessos de clientes e prioriza os mais consultados", async () => {
    recordClientAccess("client-prioritario-1");
    recordClientAccess("client-prioritario-1");
    recordClientAccess("client-prioritario-1");
    recordClientAccess("client-secundario-2");

    const priority = await getPriorityUnitsForBackup(5);
    expect(priority.length).toBeGreaterThan(0);
    expect(priority[0].id).toBe("client-prioritario-1");
    expect(priority[0].reason).toContain("Mais acessada na Dashboard");
  });

  it("retorna o status formatado do serviço de backup", () => {
    const status = getDailyBackupStatus();
    expect(status).toHaveProperty("lastRunAt");
    expect(status).toHaveProperty("lastRunSuccess");
    expect(status).toHaveProperty("unitsProcessed");
    expect(status).toHaveProperty("totalRowsUpserted");
    expect(status).toHaveProperty("isRunning");
    expect(typeof status.isRunning).toBe("boolean");
  });
});
