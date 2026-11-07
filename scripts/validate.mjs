#!/usr/bin/env node
/**
 * Valide la banque de questions (aucune dépendance externe).
 *   node scripts/validate.mjs           → vérifie tout et affiche les statistiques
 *   node scripts/validate.mjs --sample  → affiche aussi 5 questions générées au hasard
 * Code de sortie 1 si une erreur est trouvée (utilisé par la CI GitHub Actions).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "assets/js/core.js",
  "data/objectives.js",
  "data/questions-core.js",
  "data/pbqs.js",
  "data/ports.js",
  ...[1, 2, 3, 4, 5].map((d) => `data/concepts/domain-${d}.js`),
  "assets/js/generator.js",
];

const ctx = vm.createContext({ console });
for (const f of files) {
  try {
    vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
  } catch (e) {
    console.error(`✗ Erreur de syntaxe dans ${f} : ${e.message}`);
    process.exit(1);
  }
}

const S = ctx.SECPLUS;
const errors = [];
const warn = [];
const err = (m) => errors.push(m);

// --- Questions écrites à la main ---
S.data.core.forEach((q, i) => {
  const where = `core #${i}`;
  if (![1, 2, 3, 4, 5].includes(q.d)) err(`${where} : domaine invalide`);
  if (!q.q || !q.e) err(`${where} : question ou explication manquante`);
  if (!Array.isArray(q.o) || q.o.length < 4) err(`${where} : au moins 4 options requises`);
  const ans = [].concat(q.a);
  if (ans.some((a) => !Number.isInteger(a) || a < 0 || a >= q.o.length)) err(`${where} : index de réponse hors limites`);
  if (new Set(q.o).size !== q.o.length) err(`${where} : options en double`);
});

// --- PBQ ---
S.data.pbqs.forEach((p, i) => {
  const where = `PBQ #${i} (${p.title})`;
  if (!p.rows?.length || !p.choices?.length) err(`${where} : lignes ou choix manquants`);
  p.rows?.forEach((r) => { if (!p.choices.includes(r.a)) err(`${where} : réponse « ${r.a} » absente des choix`); });
});

// --- Concepts ---
const terms = new Map();
const cats = new Map();
S.data.concepts.forEach((c) => {
  const where = `concept « ${c.term} »`;
  if (terms.has(c.term)) err(`${where} : terme en double`);
  terms.set(c.term, c);
  if (!c.def || !c.fr) err(`${where} : définition ou explication manquante`);
  if (!Array.isArray(c.sc) || c.sc.length !== 3) err(`${where} : 3 mises en situation requises`);
  c.sc?.forEach((s) => { if (s.toLowerCase().includes(c.term.toLowerCase())) warn.push(`${where} : le terme apparaît dans la mise en situation (« ${s.slice(0, 50)}… »)`); });
  const k = `${c.d}|${c.cat}`;
  cats.set(k, (cats.get(k) || 0) + 1);
});
for (const [k, n] of cats) if (n < 4) warn.push(`catégorie ${k} : seulement ${n} concepts (distracteurs complétés depuis le domaine)`);

// --- Génération : chaque question doit être valide ---
const bank = S.buildBank();
const ids = new Set();
for (const b of bank) {
  if (ids.has(b.id)) err(`id en double : ${b.id}`);
  ids.add(b.id);
  for (let t = 0; t < 3; t++) {
    const q = b.make();
    if (!q.q || !Array.isArray(q.o) || q.o.length < 2) { err(`${b.id} : question générée invalide`); break; }
    if (new Set(q.o).size !== q.o.length) { err(`${b.id} : options générées en double`); break; }
    if (q.a.some((a) => a < 0 || a >= q.o.length)) { err(`${b.id} : réponse générée introuvable`); break; }
    if (b.kind !== "core" && b.kind !== "calc" && q.o.length !== 4) { err(`${b.id} : 4 options attendues, ${q.o.length} obtenues`); break; }
  }
}

// --- Rapport ---
const st = S.bankStats(bank);
console.log("Banque de questions Security+ SY0-701");
console.log(`  QCM          : ${st.total}`);
console.log(`  PBQ          : ${st.pbqs}`);
console.log(`  Concepts     : ${st.concepts}`);
console.log(`  Par domaine  : ${Object.entries(st.byDomain).map(([d, n]) => `D${d}=${n}`).join("  ")}`);
console.log(`  Par type     : ${Object.entries(st.byKind).map(([k, n]) => `${k}=${n}`).join("  ")}`);

if (process.argv.includes("--sample")) {
  console.log("\nExemples :");
  for (let i = 0; i < 5; i++) {
    const b = bank[Math.floor(Math.random() * bank.length)];
    const q = b.make();
    console.log(`\n[${b.id}] ${q.q}`);
    q.o.forEach((o, k) => console.log(`  ${q.a.includes(k) ? "✓" : " "} ${"ABCD"[k]}. ${o}`));
  }
}

if (warn.length) {
  console.log(`\n⚠ ${warn.length} avertissement(s) :`);
  warn.slice(0, 30).forEach((w) => console.log("  - " + w));
  if (warn.length > 30) console.log(`  … et ${warn.length - 30} autres`);
}
if (errors.length) {
  console.error(`\n✗ ${errors.length} erreur(s) :`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("\n✓ Validation réussie");
