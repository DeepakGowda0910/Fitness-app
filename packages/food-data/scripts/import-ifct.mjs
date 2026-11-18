#!/usr/bin/env node
/**
 * Converts the IFCT 2017 composition CSV into src/data/ifct2017.json with the
 * nutrients the app uses.
 *
 * Source CSV: the `index.csv` of the npm package @ifct2017/compositions
 * (MIT-licensed packaging of ICMR-NIN's Indian Food Composition Tables 2017).
 * In that CSV, nutrient amounts are grams per 100 g edible portion and energy
 * is kJ per 100 g.
 *
 * Usage: node scripts/import-ifct.mjs <path/to/index.csv>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-ifct.mjs <path/to/index.csv>');
  process.exit(1);
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, newlines in quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1);
}

const [header, ...body] = parseCsv(readFileSync(csvPath, 'utf8'));
// Header cells look like "Protein; protcnt"; key by the short code.
const col = Object.fromEntries(header.map((h, i) => [h.split(';').pop().trim(), i]));
for (const k of ['code', 'name', 'lang', 'grup', 'tags', 'enerc', 'protcnt', 'fatce', 'choavldf', 'fibtg', 'fsugar', 'water', 'ca', 'fe', 'na', 'k']) {
  if (!(k in col)) throw new Error(`Column ${k} missing from CSV`);
}

const num = (r, k) => {
  const v = Number(r[col[k]]);
  return Number.isFinite(v) ? v : 0;
};
const g = (r, k) => Math.round(num(r, k) * 100) / 100;
const mg = (r, k) => Math.round(num(r, k) * 1000 * 100) / 100;

/** "H. Ramdana; Kan. Danthu beeja" → ["Ramdana", "Danthu beeja"] */
const localNames = (s) =>
  [
    ...new Set(
      s
        .split(';')
        // Drop language prefixes such as "H.", "Kan." or ", Kash., H." and a trailing full stop.
        .map((x) => x.replace(/^(\s*,?\s*[A-Z][a-z]*\.,?)+\s*/, '').replace(/\.\s*$/, '').trim())
        .filter(Boolean),
    ),
  ];

const foods = body.map((r) => {
  const tags = r[col.tags].split(/\s+/).filter(Boolean);
  const kj = num(r, 'enerc');
  return {
    code: r[col.code],
    name: r[col.name].trim(),
    localNames: localNames(r[col.lang]),
    group: r[col.grup],
    diet: {
      vegetarian: tags.includes('vegetarian'),
      eggetarian: tags.includes('eggetarian'),
      pescatarian: tags.includes('fishetarian'),
    },
    per100g: {
      /** As published (0 where IFCT gives none). The app computes energy from macros. */
      energyKcalPublished: Math.round(kj / 4.184),
      proteinG: g(r, 'protcnt'),
      fatG: g(r, 'fatce'),
      carbsG: g(r, 'choavldf'),
      fibreG: g(r, 'fibtg'),
      sugarsG: g(r, 'fsugar'),
      waterG: g(r, 'water'),
      calciumMg: mg(r, 'ca'),
      ironMg: mg(r, 'fe'),
      sodiumMg: mg(r, 'na'),
      potassiumMg: mg(r, 'k'),
    },
  };
});

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'ifct2017.json');
writeFileSync(out, JSON.stringify({ source: 'IFCT_2017', version: '2017', foods }, null, 1) + '\n');
console.log(`Wrote ${foods.length} foods to ${out}`);
