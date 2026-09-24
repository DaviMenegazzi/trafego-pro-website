// Copia os dados que o Manus guardava no MySQL da plataforma para o Supabase do site.
// Idempotente: faz upsert pelo id, pode rodar mais de uma vez (ex.: de novo na virada do DNS).
//
// Uso:
//   MANUS_DATABASE_URL="mysql://..." node --env-file=.env scripts/migrate-manus-mysql-to-supabase.mjs [--dry-run]
//
// A MANUS_DATABASE_URL está no painel do Manus (Database / Secrets → DATABASE_URL).
// Depois de rodar, ajuste a sequência de feedback_leads (o script imprime o SQL).
import mysql from "mysql2/promise";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const mysqlUrl = process.env.MANUS_DATABASE_URL;
if (!mysqlUrl) throw new Error("Defina MANUS_DATABASE_URL com a DATABASE_URL do Manus");
const supabase = createClient(process.env.EVOLUTION_SUPABASE_URL, process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const bool = (v) => (v == null ? v : Boolean(Number(v)));
const json = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const date = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);

// Ordem respeita as chaves estrangeiras (pais antes dos filhos).
const TABLES = [
  { name: "feedback_leads", columns: ["id", "unit", "responsible", "week_start", "week_end", "total_leads", "leads_contacted", "leads_responded", "leads_converted", "leads_lost", "leads_in_negotiation", "main_reason", "loss_reason", "lead_quality", "creative_feedback", "general_observations", "observations", "agency_satisfaction", "communication_clarity", "agency_adjustment", "support_needed", "submitted_at", "submitted_by_user_id", "submitted_by_email", "created_at", "leads_card", "leads_consultation", "leads_dentistry", "leads_business_pj", "leads_out_of_area", "leads_answered", "leads_no_answer", "sales_closed"], transform: { week_start: date, week_end: date, submitted_by_user_id: (v) => (v == null ? null : String(v)) } },
  { name: "form_api_keys", columns: ["id", "name", "key_prefix", "key_hash", "client_ids", "allowed_origins", "created_by", "expires_at", "revoked_at", "rate_window_started_at", "rate_window_count", "created_at"], transform: { client_ids: json, allowed_origins: json } },
  { name: "form_submissions", columns: ["id", "form_key_id", "form_name", "client_id", "fields", "metadata", "ip_hash", "submitted_at"], transform: { fields: json, metadata: json } },
  { name: "external_ai_api_tokens", columns: ["id", "owner_user_id", "name", "token_prefix", "token_hash", "scopes_json", "unit_ids_json", "expires_at", "revoked_at", "last_used_at", "rate_window_started_at", "rate_window_count", "created_at", "revoked_by_user_id", "updated_at"], transform: { scopes_json: json, unit_ids_json: json } },
  { name: "social_meta_connections", columns: ["id", "owner_user_id", "unit_id", "unit_name", "facebook_page_id", "facebook_page_name", "instagram_account_id", "instagram_username", "access_token_encrypted", "token_expires_at", "granted_scopes", "connection_status", "automation_enabled", "automation_paused_at", "automation_last_error", "last_error_code", "last_error_message", "created_at", "updated_at"], transform: { automation_enabled: bool } },
  { name: "social_posts", columns: ["id", "client_batch_key", "owner_user_id", "unit_id", "unit_name", "social_connection_id", "title", "caption", "link_url", "content_format", "target_facebook", "target_instagram", "status", "scheduled_for", "published_at", "facebook_post_id", "instagram_media_id", "facebook_schedule_status", "instagram_schedule_status", "instagram_attempt_count", "instagram_next_attempt_at", "facebook_schedule_error", "provider_state_encrypted", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at"], transform: { target_facebook: bool, target_instagram: bool } },
  { name: "social_post_media", columns: ["id", "post_id", "sort_order", "storage_key", "public_url", "media_type", "alt_text", "created_at"] },
  { name: "social_meta_oauth_sessions", columns: ["id", "owner_user_id", "candidates_encrypted", "expires_at", "created_at"] },
  { name: "social_publishing_settings", columns: ["id", "schedule_cron_task_uid", "scheduler_status", "updated_at"], skip: true }, // a VPS usa o próprio agendador
];

// DATETIME do MySQL chega como Date em UTC com timezone "Z".
const db = await mysql.createConnection({ uri: mysqlUrl, timezone: "Z", dateStrings: false });
const report = [];
for (const table of TABLES) {
  if (table.skip) continue;
  let rows;
  try {
    [rows] = await db.query(`SELECT * FROM \`${table.name}\``);
  } catch (error) {
    report.push({ table: table.name, status: `não existe no MySQL (${error.code ?? error.message})` });
    continue;
  }
  const mapped = rows.map((row) => Object.fromEntries(table.columns.filter((c) => c in row).map((c) => {
    const value = row[c];
    const fn = table.transform?.[c];
    return [c, fn ? fn(value) : value instanceof Date ? value.toISOString() : value];
  })));
  const extra = rows[0] ? Object.keys(rows[0]).filter((c) => !table.columns.includes(c)) : [];
  if (!dryRun) {
    for (let i = 0; i < mapped.length; i += 500) {
      const { error } = await supabase.from(table.name).upsert(mapped.slice(i, i + 500), { onConflict: "id" });
      if (error) throw new Error(`${table.name}: ${error.message}`);
    }
  }
  report.push({ table: table.name, linhas: rows.length, colunas_ignoradas: extra.join(", ") || "-" });
}
await db.end();
console.table(report);
if (!dryRun) console.log("\nRode no Supabase: select setval(pg_get_serial_sequence('public.feedback_leads','id'), coalesce((select max(id) from public.feedback_leads), 1));");
console.log(`\nAtenção: mídias antigas das publicações apontam para /manus-storage/... — elas deixam de abrir quando o domínio sair do Manus.`);
