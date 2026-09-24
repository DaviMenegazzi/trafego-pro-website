import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env manually
const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const evoUrl = env.EVOLUTION_SUPABASE_URL;
const evoKey = env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(evoUrl, evoKey);

async function run() {
  console.log("=== BANCO DE TALENTOS (SUPABASE) ===");
  const { data: forms, error: fErr } = await supabase
    .from("talent_forms")
    .select("id, title, subtitle, public_slug, client_id, is_published, created_at");
  if (fErr) console.error("Erro talent_forms:", fErr.message);
  else {
    console.log(`Formulários de Talentos (${forms.length}):`);
    forms.forEach(f => {
      console.log(`- [${f.id}] "${f.title}" (slug: /trabalhe-conosco/${f.public_slug}) - Publicado: ${f.is_published} - Unidade: ${f.client_id}`);
    });
  }

  const { data: fields } = await supabase
    .from("talent_form_fields")
    .select("form_id, field_key, label, field_type, is_required, order_index")
    .order("order_index", { ascending: true });
  console.log(`\nCampos configurados nos formulários (${fields?.length || 0}):`);
  fields?.forEach(f => {
    console.log(`  * ${f.label} (chave: "${f.field_key}", tipo: ${f.field_type}, obrigatório: ${f.is_required})`);
  });

  const { data: submissions, error: sErr } = await supabase
    .from("talent_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (sErr) console.error("Erro talent_submissions:", sErr.message);
  else {
    console.log(`\nTotal de Candidatos / Submissões de Talentos: ${submissions?.length || 0}`);
    submissions?.forEach((s, idx) => {
      console.log(`\n--- Candidato #${idx + 1} ---`);
      console.log(`ID: ${s.id}`);
      console.log(`Nome: ${s.candidate_name}`);
      console.log(`Email: ${s.candidate_email}`);
      console.log(`Telefone: ${s.candidate_phone}`);
      console.log(`Status: ${s.status}`);
      console.log(`Data: ${s.created_at}`);
      console.log(`Respostas (Answers):`, JSON.stringify(s.answers, null, 2));
      console.log(`Anexos (Currículo):`, s.file_attachments);
      console.log(`Notas:`, s.notes);
    });
  }

  console.log("\n=== FORMULÁRIOS EXTERNOS (API/DASHBOARD) ===");
  const keysPath = "data/form_api_keys.json";
  const subsPath = "data/form_submissions.json";
  if (fs.existsSync(keysPath)) {
    const keys = JSON.parse(fs.readFileSync(keysPath, "utf8"));
    console.log(`Chaves/Endpoints criados no JSON local: ${keys.length}`);
    console.log(keys);
  } else {
    console.log("data/form_api_keys.json não existe (nenhuma chave criada no JSON local)");
  }

  if (fs.existsSync(subsPath)) {
    const subs = JSON.parse(fs.readFileSync(subsPath, "utf8"));
    console.log(`Submissões de formulários externos no JSON local: ${subs.length}`);
    console.log(subs);
  } else {
    console.log("data/form_submissions.json não existe (nenhuma submissão no JSON local)");
  }
}

run().catch(console.error);
