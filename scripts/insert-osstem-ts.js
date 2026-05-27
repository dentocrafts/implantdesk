/**
 * Insert Osstem TS System catalog components into Supabase.
 * Components derived from 5 catalog page screenshots provided by the user.
 *
 * Run: node scripts/insert-osstem-ts.js
 */

const SUPABASE_URL = 'https://vburonepnvkpiuxuqqdt.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZidXJvbmVwbnZrcGl1eHVxcWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUxODYyNywiZXhwIjoyMDk1MDk0NjI3fQ.hhRfT-MHmyifQ-C2HwiHaPiNTQI7M0KK8Od0RzeUuhE';

// ── Helper ──────────────────────────────────────────────────────────────────

function row(code, name, abutmentType, platformDia, gh, extra = {}) {
  return {
    component_code:    code,
    name,
    system:            'Osstem',
    abutment_type:     abutmentType,
    platform_diameter: platformDia,
    gingival_height_mm: gh,
    material:          extra.material || 'Titanium',
    category:          extra.category || 'component',
    stock_qty:         0,
    is_active:         true,
    image_url:         null,
  };
}

// ── 1. Multi Abutment  (D4.8)  ──────────────────────────────────────────────
// Mini:  TSMA5010M … TSMA5050M  (GH 1–5)
// Regular: TSMA5010 … TSMA5050 (GH 1–5)

const multiAbutment = [];
for (let gh = 1; gh <= 5; gh++) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  // Mini
  multiAbutment.push(row(
    `TSMA50${ghCode}M`,
    `Osstem TS Multi Abutment Ø4.8 GH${gh} Mini`,
    'Multi Abutment', 4.8, gh, {}
  ));
  // Regular
  multiAbutment.push(row(
    `TSMA50${ghCode}`,
    `Osstem TS Multi Abutment Ø4.8 GH${gh} Regular`,
    'Multi Abutment', 4.8, gh, {}
  ));
}
// 10 rows

// ── 2. Multi Angled Abutment  (D4.8)  ───────────────────────────────────────
// Mini 17°:  GS17MAM4820/30/40  (GH 2, 3, 4)
// Mini 30°:  GS30MAM4830/40/50  (GH 3, 4, 5)
// Regular 17°: GS17MAS4820/30/40 (GH 2, 3, 4)
// Regular 30°: GS30MAS4830/40/50 (GH 3, 4, 5)

const multiAngled = [];
const maGhMap = { 17: [2,3,4], 30: [3,4,5] };
for (const [angle, ghList] of Object.entries(maGhMap)) {
  for (const gh of ghList) {
    const ghCode = (gh * 10).toString().padStart(2, '0');
    // Mini
    multiAngled.push(row(
      `GS${angle}MAM48${ghCode}`,
      `Osstem GS Multi Angled Abutment ${angle}° Ø4.8 GH${gh} Mini`,
      `Multi Angled ${angle}°`, 4.8, gh, {}
    ));
    // Regular
    multiAngled.push(row(
      `GS${angle}MAS48${ghCode}`,
      `Osstem GS Multi Angled Abutment ${angle}° Ø4.8 GH${gh} Regular`,
      `Multi Angled ${angle}°`, 4.8, gh, {}
    ));
  }
}
// 12 rows

// ── 3. Angled Abutment  ──────────────────────────────────────────────────────
// D4.5 Mini 17°:  GSAA4520MA/MB/MN  (GH 2)
// D4.5 Mini 30°:  GSAA4540MA/MB/MN  (GH 4)
// D4.5 Regular 17°: GSAA4520A/B/N   (GH 2)
// D4.5 Regular 30°: GSAA4540A/B/N   (GH 4)
// D5.0 17°: GSAA5020A/B/N  (GH 2)
// D5.0 30°: GSAA5040A/B/N  (GH 4)
// D6.0 17°: GSAA6020A/B/N  (GH 2)
// D6.0 30°: GSAA6040A/B/N  (GH 4)

const angledAbutment = [];

// Variant label  → code suffix / name suffix
const aaVariants = [
  { code: 'A',  label: 'Type A (Engaging)'     },
  { code: 'B',  label: 'Type B (Engaging)'     },
  { code: 'N',  label: 'Non-Engaging'          },
];

// D4.5 (Mini + Regular)
for (const [angle, gh] of [[17, 2], [30, 4]]) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  for (const v of aaVariants) {
    // Mini
    angledAbutment.push(row(
      `GSAA45${ghCode}M${v.code}`,
      `Osstem GS Angled Abutment ${angle}° Ø4.5 GH${gh} Mini ${v.label}`,
      `Angled ${angle}°`, 4.5, gh, {}
    ));
    // Regular
    angledAbutment.push(row(
      `GSAA45${ghCode}${v.code}`,
      `Osstem GS Angled Abutment ${angle}° Ø4.5 GH${gh} Regular ${v.label}`,
      `Angled ${angle}°`, 4.5, gh, {}
    ));
  }
}
// 12 rows for D4.5

// D5.0 (Regular only)
for (const [angle, gh] of [[17, 2], [30, 4]]) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  for (const v of aaVariants) {
    angledAbutment.push(row(
      `GSAA50${ghCode}${v.code}`,
      `Osstem GS Angled Abutment ${angle}° Ø5.0 GH${gh} ${v.label}`,
      `Angled ${angle}°`, 5.0, gh, {}
    ));
  }
}
// 6 rows for D5.0

// D6.0 (Regular only)
for (const [angle, gh] of [[17, 2], [30, 4]]) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  for (const v of aaVariants) {
    angledAbutment.push(row(
      `GSAA60${ghCode}${v.code}`,
      `Osstem GS Angled Abutment ${angle}° Ø6.0 GH${gh} ${v.label}`,
      `Angled ${angle}°`, 6.0, gh, {}
    ));
  }
}
// 6 rows for D6.0
// Total Angled Abutment: 24 rows

// ── 4. Angled Abutment Selector  ─────────────────────────────────────────────
// D4.5 Mini: GSAAS4520MA/MB, GSAAS4540MA/MB  (GH 2, GH 4)
// D5.0:      GSAAS5020A/B,   GSAAS5040A/B    (GH 2, GH 4)
// D6.0:      GSAAS6020A/B,   GSAAS6040A/B    (GH 2, GH 4)

const abutmentSelector = [];
const selectorVariants = [
  { code: 'A', label: 'Type A' },
  { code: 'B', label: 'Type B' },
];

// D4.5 Mini
for (const [angle, gh] of [[17, 2], [30, 4]]) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  for (const v of selectorVariants) {
    abutmentSelector.push(row(
      `GSAAS45${ghCode}M${v.code}`,
      `Osstem GS Angled Abutment Selector ${angle}° Ø4.5 GH${gh} Mini ${v.label}`,
      'Angled Selector', 4.5, gh, {}
    ));
  }
}

// D5.0
for (const [angle, gh] of [[17, 2], [30, 4]]) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  for (const v of selectorVariants) {
    abutmentSelector.push(row(
      `GSAAS50${ghCode}${v.code}`,
      `Osstem GS Angled Abutment Selector ${angle}° Ø5.0 GH${gh} ${v.label}`,
      'Angled Selector', 5.0, gh, {}
    ));
  }
}

// D6.0
for (const [angle, gh] of [[17, 2], [30, 4]]) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  for (const v of selectorVariants) {
    abutmentSelector.push(row(
      `GSAAS60${ghCode}${v.code}`,
      `Osstem GS Angled Abutment Selector ${angle}° Ø6.0 GH${gh} ${v.label}`,
      'Angled Selector', 6.0, gh, {}
    ));
  }
}
// 12 rows

// ── 5. Transfer Abutment  ────────────────────────────────────────────────────
// D4.5 Mini  (engaging + non-engaging)
//   Collar 6mm: GSTA4611/21/31/41/51  (GH 1–5)  + GSTA4611N/21N/31N/41N/51N
//   Collar 7mm: GSTA4711/21/31/41/51  (GH 1–5)  + GSTA4711N/21N/31N/41N/51N
// D4.5 Regular (engaging + non-engaging)
//   Collar 6mm: GSTAS4611/21/31/41/51 + N variants
//   Collar 7mm: GSTAS4711/21/31/41/51 + N variants
// D5.0 Regular (engaging + non-engaging)
//   Collar 4mm: GSTA5410/20/30/40/50  + N variants
//   Collar 6mm: GSTA5610/20/30/40/50  + N variants
//   Collar 7mm: GSTA5710/20/30/40/50  + N variants
// D6.0 Regular (engaging + non-engaging)
//   Collar 4mm: GSTA6410/20/30/40/50  + N variants
//   Collar 6mm: GSTA6610/20/30/40/50  + N variants
//   Collar 7mm: GSTA6710/20/30/40/50  + N variants
// D7.0 Regular (engaging + non-engaging)
//   Collar 6mm: GSTA7610/20/30/40/50  + N variants

const transferAbutment = [];

// D4.5 Mini — note the code format uses XX1, XX2 ... XX5 style (trailing 1 = variant marker in Osstem code)
// Collar 6 = "46", Collar 7 = "47"
for (const collar of [6, 7]) {
  for (let gh = 1; gh <= 5; gh++) {
    const collarGhCode = `4${collar}${gh}1`; // e.g. 4611, 4621, etc.
    // Engaging
    transferAbutment.push(row(
      `GSTA${collarGhCode}`,
      `Osstem GS Transfer Abutment Ø4.5 Mini Collar${collar}mm GH${gh} Engaging`,
      'Transfer Abutment', 4.5, gh, {}
    ));
    // Non-Engaging
    transferAbutment.push(row(
      `GSTA${collarGhCode}N`,
      `Osstem GS Transfer Abutment Ø4.5 Mini Collar${collar}mm GH${gh} Non-Engaging`,
      'Transfer Abutment', 4.5, gh, {}
    ));
  }
}
// 20 rows for D4.5 Mini

// D4.5 Regular (prefix GSTAS)
for (const collar of [6, 7]) {
  for (let gh = 1; gh <= 5; gh++) {
    const collarGhCode = `4${collar}${gh}1`;
    transferAbutment.push(row(
      `GSTAS${collarGhCode}`,
      `Osstem GS Transfer Abutment Ø4.5 Regular Collar${collar}mm GH${gh} Engaging`,
      'Transfer Abutment', 4.5, gh, {}
    ));
    transferAbutment.push(row(
      `GSTAS${collarGhCode}N`,
      `Osstem GS Transfer Abutment Ø4.5 Regular Collar${collar}mm GH${gh} Non-Engaging`,
      'Transfer Abutment', 4.5, gh, {}
    ));
  }
}
// 20 rows for D4.5 Regular

// D5.0 Regular
for (const collar of [4, 6, 7]) {
  for (let gh = 1; gh <= 5; gh++) {
    const ghCode = (gh * 10).toString().padStart(2, '0');
    const collarCode = `5${collar}${ghCode}`; // e.g. 5410, 5420 … 5610 …
    transferAbutment.push(row(
      `GSTA${collarCode}`,
      `Osstem GS Transfer Abutment Ø5.0 Collar${collar}mm GH${gh} Engaging`,
      'Transfer Abutment', 5.0, gh, {}
    ));
    transferAbutment.push(row(
      `GSTA${collarCode}N`,
      `Osstem GS Transfer Abutment Ø5.0 Collar${collar}mm GH${gh} Non-Engaging`,
      'Transfer Abutment', 5.0, gh, {}
    ));
  }
}
// 30 rows for D5.0

// D6.0 Regular
for (const collar of [4, 6, 7]) {
  for (let gh = 1; gh <= 5; gh++) {
    const ghCode = (gh * 10).toString().padStart(2, '0');
    const collarCode = `6${collar}${ghCode}`;
    transferAbutment.push(row(
      `GSTA${collarCode}`,
      `Osstem GS Transfer Abutment Ø6.0 Collar${collar}mm GH${gh} Engaging`,
      'Transfer Abutment', 6.0, gh, {}
    ));
    transferAbutment.push(row(
      `GSTA${collarCode}N`,
      `Osstem GS Transfer Abutment Ø6.0 Collar${collar}mm GH${gh} Non-Engaging`,
      'Transfer Abutment', 6.0, gh, {}
    ));
  }
}
// 30 rows for D6.0

// D7.0 Regular (collar 6 only)
for (let gh = 1; gh <= 5; gh++) {
  const ghCode = (gh * 10).toString().padStart(2, '0');
  const collarCode = `76${ghCode}`; // 7610, 7620 …
  transferAbutment.push(row(
    `GSTA${collarCode}`,
    `Osstem GS Transfer Abutment Ø7.0 Collar6mm GH${gh} Engaging`,
    'Transfer Abutment', 7.0, gh, {}
  ));
  transferAbutment.push(row(
    `GSTA${collarCode}N`,
    `Osstem GS Transfer Abutment Ø7.0 Collar6mm GH${gh} Non-Engaging`,
    'Transfer Abutment', 7.0, gh, {}
  ));
}
// 10 rows for D7.0

// ── Combine all ────────────────────────────────────────────────────────────
const allRows = [
  ...multiAbutment,
  ...multiAngled,
  ...angledAbutment,
  ...abutmentSelector,
  ...transferAbutment,
];

console.log(`Total rows to insert: ${allRows.length}`);
console.log('Breakdown:');
console.log('  Multi Abutment:          ', multiAbutment.length);
console.log('  Multi Angled Abutment:   ', multiAngled.length);
console.log('  Angled Abutment:         ', angledAbutment.length);
console.log('  Angled Abutment Selector:', abutmentSelector.length);
console.log('  Transfer Abutment:       ', transferAbutment.length);

// ── Insert via REST API  ────────────────────────────────────────────────────
async function insertBatch(rows, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/implant_components`, {
    method: 'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Insert failed for "${label}": ${res.status} ${body}`);
  }
  console.log(`  ✓ ${label}: inserted ${rows.length} rows (HTTP ${res.status})`);
}

async function main() {
  console.log('\nInserting components...\n');

  try {
    await insertBatch(multiAbutment,      'Multi Abutment');
    await insertBatch(multiAngled,        'Multi Angled Abutment');
    await insertBatch(angledAbutment,     'Angled Abutment');
    await insertBatch(abutmentSelector,   'Angled Abutment Selector');

    // Transfer Abutments split into smaller batches (many rows)
    await insertBatch(transferAbutment.slice(0,  40), 'Transfer Abutment D4.5 Mini');
    await insertBatch(transferAbutment.slice(40, 80), 'Transfer Abutment D4.5 Regular');
    await insertBatch(transferAbutment.slice(80,110), 'Transfer Abutment D5.0');
    await insertBatch(transferAbutment.slice(110,140),'Transfer Abutment D6.0 part A');
    await insertBatch(transferAbutment.slice(140,160),'Transfer Abutment D6.0 part B + D7.0');
    await insertBatch(transferAbutment.slice(160),    'Transfer Abutment D7.0 remaining');

    console.log('\n✅  All components inserted successfully!');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
