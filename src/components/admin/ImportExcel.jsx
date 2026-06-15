import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, SCREW_TYPES, MATERIALS } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

const MATERIAL_ALIASES = {
  'ti':                   'Titanium',
  'titanium':             'Titanium',
  'zir':                  'Zirconia',
  'zirconia':             'Zirconia',
  'peek':                 'PEEK',
  'tizir':                'Titanium-Zirconia',
  'ti-zir':               'Titanium-Zirconia',
  'titanium-zirconia':    'Titanium-Zirconia',
  'gold':                 'Gold-plated Titanium',
  'gold-ti':              'Gold-plated Titanium',
  'gold-plated':          'Gold-plated Titanium',
  'gold-plated titanium': 'Gold-plated Titanium',
};

function normalizeMaterial(val) {
  if (!val) return val;
  return MATERIAL_ALIASES[val.toString().trim().toLowerCase()] || val;
}

const EXPECTED_FIELDS = [
  { key: 'name',               label: 'Name',                  required: true  },
  { key: 'system',             label: 'Implant System',         required: true  },
  { key: 'abutment_type',      label: 'Abutment / Screw Type',  required: false },
  { key: 'gingival_height_mm', label: 'Gingival Height (mm)',   required: false },
  { key: 'platform_diameter',  label: 'Platform Diameter (mm)', required: false },
  { key: 'material',           label: 'Material',               required: false },
  { key: 'component_code',     label: 'Component Code',         required: true  },
  { key: 'price',              label: 'Price (INR)',             required: false },
  { key: 'stock_qty',          label: 'Stock Qty',              required: false },
  { key: 'description',        label: 'Description',            required: false },
];

function guessMapping(headers) {
  const lower = headers.map(h => h?.toString().toLowerCase().trim());
  const mapping = {};
  EXPECTED_FIELDS.forEach(({ key, label }) => {
    const aliases = {
      name:               ['name', 'component name', 'product name', 'title'],
      system:             ['system', 'brand', 'implant system', 'manufacturer'],
      abutment_type:      ['abutment / screw type', 'abutment type', 'abutment', 'screw type', 'type'],
      gingival_height_mm: ['gingival height (mm)', 'gingival height', 'gh (mm)', 'gh', 'gingival', 'length (mm)', 'length'],
      platform_diameter:  ['platform diameter (mm)', 'platform diameter', 'diameter', 'platform', 'platform (mm)', 'pd'],
      material:           ['material', 'materials'],
      component_code:     ['component code', 'sku', 'code', 'internal code', 'item code', 'part no', 'part number'],
      price:              ['price (inr)', 'price', 'unit price', 'mrp', 'cost'],
      stock_qty:          ['stock qty', 'stock', 'qty', 'quantity', 'available', 'inventory'],
      description:        ['description', 'notes', 'details', 'remarks'],
    };
    // 1. Exact alias match
    let found = lower.findIndex(h => aliases[key]?.includes(h));
    // 2. Fallback: the field's own label (lowercased) matches the header exactly
    if (found < 0) found = lower.findIndex(h => h === label.toLowerCase());
    // 3. Fallback: header contains the label as a substring (or vice versa)
    if (found < 0) {
      const lbl = label.toLowerCase();
      found = lower.findIndex(h => h.includes(lbl) || lbl.includes(h));
    }
    if (found >= 0) mapping[key] = headers[found];
  });
  return mapping;
}

function parseRow(row, mapping, category = 'component') {
  const obj = {};
  EXPECTED_FIELDS.forEach(({ key }) => {
    const col = mapping[key];
    if (col !== undefined && col !== '__skip__') {
      obj[key] = row[col] ?? '';
    }
  });
  obj.gingival_height_mm = obj.gingival_height_mm ? Number(obj.gingival_height_mm)    : null;
  obj.platform_diameter  = obj.platform_diameter  ? Number(obj.platform_diameter)     : null;
  obj.price              = obj.price              ? Number(obj.price)                  : 0;
  obj.stock_qty          = obj.stock_qty          ? parseInt(obj.stock_qty, 10)        : 0;
  obj.material           = normalizeMaterial(obj.material);
  obj.is_active          = true;
  obj.category           = category;
  return obj;
}

function validateRow(row) {
  const errors = [];
  if (!row.name?.toString().trim())           errors.push('Missing name');
  if (!row.system?.toString().trim())         errors.push('Missing system');
  if (!row.component_code?.toString().trim()) errors.push('Missing component code');
  return errors;
}

// needed since this file uses cn directly
function cn(...classes) { return classes.filter(Boolean).join(' '); }

export default function ImportExcel({ open, onClose, category = 'component' }) {
  const fileRef  = useRef();
  const qc       = useQueryClient();
  const { settings, updateSettings } = useSettings();

  const [step,      setStep]      = useState('upload'); // upload | map | preview | done
  const [headers,   setHeaders]   = useState([]);
  const [rows,      setRows]      = useState([]);
  const [mapping,   setMapping]   = useState({});
  const [results,   setResults]   = useState(null);
  const [importing, setImporting] = useState(false);
  const [upsert,    setUpsert]    = useState(false);

  const noun     = category === 'screw' ? 'Screw' : 'Component';
  const nounPlur = category === 'screw' ? 'Screws' : 'Components';

  function downloadTemplate() {
    const headers = EXPECTED_FIELDS.map(f => f.label);
    headers.push('Stock Type');
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, noun + 's');
    XLSX.writeFile(wb, `implantdesk-${noun.toLowerCase()}s-template.xlsx`);
  }

  function reset() {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResults(null);
    setUpsert(false);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb    = XLSX.read(evt.target.result, { type: 'array' });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const data  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data.length) { toast.error('Sheet is empty'); return; }
        const hdrs    = data[0].map(h => h?.toString().trim()).filter(Boolean);
        const dataRows = data.slice(1).filter(r => r.some(c => c !== ''));
        const objRows  = dataRows.map(r => {
          const obj = {};
          hdrs.forEach((h, i) => { obj[h] = r[i] ?? ''; });
          return obj;
        });
        setHeaders(hdrs);
        setRows(objRows);
        setMapping(guessMapping(hdrs));
        setStep('map');
      } catch (err) {
        toast.error('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setImporting(true);

    const parsed = rows.map(r => parseRow(r, mapping, category));
    const skippedRows = [];

    // Issue 4: fetch existing component_codes for duplicate detection
    const { data: existingData } = await supabase
      .from('implant_components')
      .select('component_code');
    const existingCodes = new Set((existingData || []).map(r => r.component_code?.toString().trim()));

    // Issue 2: collect unknown abutment/screw types and register them in settings
    const knownTypes = new Set([
      ...(category === 'screw' ? SCREW_TYPES : ABUTMENT_TYPES),
      ...(category === 'screw' ? (settings.customScrewTypes || []) : (settings.customAbutmentTypes || [])),
    ]);
    const newTypes = [];
    parsed.forEach(row => {
      const t = row.abutment_type?.toString().trim();
      if (t && !knownTypes.has(t) && !newTypes.includes(t)) newTypes.push(t);
    });
    if (newTypes.length > 0) {
      if (category === 'screw') {
        updateSettings({ customScrewTypes: [...(settings.customScrewTypes || []), ...newTypes] });
      } else {
        updateSettings({ customAbutmentTypes: [...(settings.customAbutmentTypes || []), ...newTypes] });
      }
    }

    let success = 0;

    for (const row of parsed) {
      const reasons = validateRow(row);

      // Issue 4: duplicate detection (skip in non-upsert mode)
      const code = row.component_code?.toString().trim();
      if (!upsert && code && existingCodes.has(code)) {
        reasons.push(`Already exists — component code ${code} already in database`);
      }

      if (reasons.length > 0) {
        skippedRows.push({ name: row.name?.toString().trim() || '(no name)', reasons });
        continue;
      }

      try {
        if (upsert) {
          const { error } = await supabase
            .from('implant_components')
            .upsert(row, { onConflict: 'component_code' });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('implant_components')
            .insert(row);
          if (error) throw error;
        }
        success++;
      } catch (err) {
        skippedRows.push({ name: row.name?.toString().trim() || '(no name)', reasons: [`Import error: ${err.message}`] });
      }
    }

    qc.invalidateQueries({ queryKey: ['components'] });
    qc.invalidateQueries({ queryKey: ['filter-options'] });

    setImporting(false);
    setResults({ success, skippedRows, upsert });
    setStep('done');
  }

  const previewRows   = rows.slice(0, 5).map(r => parseRow(r, mapping, category));
  const previewErrors = previewRows.map(r => validateRow(r));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import {nounPlur} from Excel
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload an <strong>.xlsx</strong> file. The first row must be column headers.
              Required columns: <strong>Name</strong>, <strong>Implant System</strong>, <strong>Component Code</strong>.
              All rows will be imported as <strong>{nounPlur}</strong>.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Click to upload your Excel file</p>
              <p className="text-sm text-muted-foreground">.xlsx files only</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" />
                Download Template
              </Button>
            </div>

            {/* Expected column guide */}
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expected columns</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPECTED_FIELDS.map(f => (
                  <span
                    key={f.key}
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                      f.required
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {f.label}{f.required && ' *'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Map columns ───────────────────────────────────────── */}
        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Detected <strong>{rows.length} rows</strong> in your file. Map your columns to the fields below.
              Auto-detected mappings are pre-filled.
            </p>
            <div className="space-y-2">
              {EXPECTED_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-48 shrink-0 text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <Select
                    value={mapping[field.key] || '__skip__'}
                    onValueChange={v => setMapping(m => ({ ...m, [field.key]: v === '__skip__' ? undefined : v }))}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="— skip —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__" className="text-xs text-muted-foreground">— skip —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={reset}>← Back</Button>
              <Button size="sm" onClick={() => setStep('preview')}>Preview Import →</Button>
            </div>
          </div>
        )}

        {/* ── Step: Preview ───────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview of first 5 rows. <strong>{rows.length} total</strong> will be imported (rows with errors skipped).
            </p>
            <div className="rounded-md border border-border overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Name</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">System</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Code</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">GH / Length</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Price</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 max-w-[150px] truncate">{row.name || '—'}</td>
                      <td className="px-3 py-2">{row.system || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.component_code || '—'}</td>
                      <td className="px-3 py-2">{row.gingival_height_mm ?? '—'}</td>
                      <td className="px-3 py-2">₹{row.price || 0}</td>
                      <td className="px-3 py-2">
                        {previewErrors[i].length === 0
                          ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          : <span className="text-destructive">{previewErrors[i].join(', ')}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Upsert toggle */}
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
              <Checkbox
                id="upsert-toggle"
                checked={upsert}
                onCheckedChange={v => setUpsert(!!v)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="upsert-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  Update existing {nounPlur.toLowerCase()} if Component Code matches
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {upsert
                    ? 'Existing rows will be overwritten with the spreadsheet values. New rows will be added.'
                    : 'Only new rows will be added. Any row whose Component Code already exists will be skipped.'}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep('map')}>← Back</Button>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing
                  ? `Importing… (${rows.length} rows)`
                  : `${upsert ? 'Import / Update' : 'Import'} ${rows.length} ${nounPlur}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ──────────────────────────────────────────────── */}
        {step === 'done' && results && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-lg font-semibold">Import Complete</h3>
                <p className="text-xs text-muted-foreground">
                  {results.upsert ? 'Existing rows were updated where Component Code matched.' : 'Only new rows were added.'}
                </p>
              </div>
            </div>

            {/* Summary counts */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{results.success}</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400">{results.upsert ? 'Added / Updated' : 'Imported'}</div>
              </div>
              {results.skippedRows.length > 0 && (
                <div className="flex-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{results.skippedRows.length}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">Skipped</div>
                </div>
              )}
            </div>

            {/* Detailed skip list */}
            {results.skippedRows.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skipped rows</p>
                <div className="rounded-md border border-border divide-y divide-border max-h-56 overflow-y-auto">
                  {results.skippedRows.map((s, i) => (
                    <div key={i} className="px-3 py-2 flex gap-2 items-start">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.reasons.join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset}>Import Another</Button>
              <Button onClick={() => { reset(); onClose(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
