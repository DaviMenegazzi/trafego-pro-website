import fs from "node:fs";

const content = fs.readFileSync('client/src/pages/EvolutionAdmin.tsx', 'utf8');

const checks = [
  'canAccessEvolutionPanel',
  'scopeEvolutionData',
  'isEvolutionAiAutomationRunning',
  'readEvolutionJson',
  'fetch("/api/evolution/overview"',
  'fetch("/api/evolution/attributions"',
  '/api/evolution/leads/',
  '/api/evolution/instances/',
  'DndContext',
  'useSensor',
  'PointerSensor',
  'DragOverlay',
  'localStorage.getItem("tp_token")'
];

console.log('=== BUSINESS LOGIC INTEGRITY AUDIT ===');
let allPassed = true;
checks.forEach(c => {
  const present = content.includes(c);
  console.log(`${c}: ${present ? 'PASS' : 'FAIL'}`);
  if (!present) allPassed = false;
});

// Check tabs
const tabs = ['operacao', 'crm', 'atribuicao', 'conversas', 'origem', 'auditoria'];
console.log('\n=== TABS AUDIT ===');
tabs.forEach(t => {
  const present = content.includes(`view === "${t}"`);
  console.log(`Tab "${t}": ${present ? 'PASS' : 'FAIL'}`);
  if (!present) allPassed = false;
});

console.log(`\nOverall logic checks: ${allPassed ? 'ALL PASS' : 'FAILURES DETECTED'}`);
