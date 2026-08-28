import { Router } from "express";
import { getSupabase } from "../supabase.js";
import { isMetaDirectEnabled } from "../metaDirectService.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const startedAt = Date.now();
  const mem = process.memoryUsage();

  const healthStatus: {
    status: "healthy" | "degraded" | "unhealthy";
    uptimeSeconds: number;
    timestamp: string;
    environment: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    checks: {
      supabase: { status: "up" | "down" | "unconfigured"; latencyMs?: number; error?: string };
      metaDirect: { status: "enabled" | "disabled" };
    };
  } = {
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    },
    checks: {
      supabase: { status: "unconfigured" },
      metaDirect: { status: isMetaDirectEnabled() ? "enabled" : "disabled" },
    },
  };

  // Teste de conectividade com Supabase
  const sb = getSupabase();
  if (sb) {
    const sbStart = Date.now();
    try {
      const { error } = await sb.from("user_profiles").select("id").limit(1);
      healthStatus.checks.supabase = {
        status: error ? "down" : "up",
        latencyMs: Date.now() - sbStart,
        ...(error ? { error: error.message } : {}),
      };
      if (error) healthStatus.status = "degraded";
    } catch (err) {
      healthStatus.checks.supabase = {
        status: "down",
        latencyMs: Date.now() - sbStart,
        error: err instanceof Error ? err.message : String(err),
      };
      healthStatus.status = "degraded";
    }
  }

  const httpStatus = healthStatus.status === "unhealthy" ? 503 : 200;
  res.status(httpStatus).json({
    ...healthStatus,
    responseTimeMs: Date.now() - startedAt,
  });
});
