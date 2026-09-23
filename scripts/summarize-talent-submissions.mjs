import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const supabase = createClient(env.EVOLUTION_SUPABASE_URL, env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: forms } = await supabase.from("talent_forms").select("*");
  const { data: fields } = await supabase.from("talent_form_fields").select("*").order("order_index");
  const { data: subs } = await supabase.from("talent_submissions").select("*");

  console.log("=== RESUMO DETALHADO DO BANCO DE TALENTOS ===");
  console.log(`Total de Formulários: ${forms?.length || 0}`);
  console.log(`Total de Candidatos Registrados: ${subs?.length || 0}`);

  // Status count
  const statusCount = {};
  subs?.forEach(s => {
    statusCount[s.status] = (statusCount[s.status] || 0) + 1;
  });
  console.log("Distribuição por Status:", statusCount);

  // Forms breakdown
  console.log("\n--- FORMULÁRIOS E QUANTIDADE DE CANDIDATOS ---");
  forms?.forEach(f => {
    const formSubs = subs?.filter(s => s.form_id === f.id) || [];
    const formFields = fields?.filter(fd => fd.form_id === f.id) || [];
    console.log(`\n• Formulário: "${f.title}"`);
    console.log(`  ID: ${f.id}`);
    console.log(`  Slug Público: https://app.trafego.pro/trabalhe-conosco/${f.public_slug}`);
    console.log(`  Unidade / ClientId: ${f.client_id}`);
    console.log(`  Publicado: ${f.is_published ? "Sim" : "Não"}`);
    console.log(`  Total de Candidatos: ${formSubs.length}`);
    console.log(`  Campos do Formulário (${formFields.length}): ${formFields.map(fd => fd.label).join(", ")}`);

    // Status breakdown for this form
    const fStatus = {};
    formSubs.forEach(s => { fStatus[s.status] = (fStatus[s.status] || 0) + 1; });
    console.log(`  Status dos Candidatos:`, fStatus);
  });

  // Recent 5 candidates
  console.log("\n--- ÚLTIMOS 5 CANDIDATOS RECEBIDOS ---");
  const sorted = [...(subs || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  sorted.slice(0, 5).forEach((c, idx) => {
    console.log(`\n${idx + 1}. ${c.candidate_name || 'Sem nome'} | Email: ${c.candidate_email} | Tel: ${c.candidate_phone}`);
    console.log(`   Data: ${c.created_at} | Status: ${c.status}`);
    console.log(`   Currículo: ${c.file_attachments && c.file_attachments.length > 0 ? c.file_attachments[0].fileName : 'Não anexado'}`);
    console.log(`   Respostas principais:`, c.answers);
  });
}

main().catch(console.error);
