import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useCreateComponent } from '@/hooks/useComponents';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, MATERIALS } from '@/lib/utils';
import { toast } from 'sonner';

const EXPECTED_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'system', label: 'Implant System', required: true },
  { key: 'abutment_type', label: 'Abutment Type', required: false },
  { key: 'gingival_height_mm', label: 'Gingival Height (mm)', required: false },
  { key: 'platform_diameter', label: 'Platform Diameter (mm)', required: false },
  { key: 'material', label: 'Material', required: false },
  { key: 'component_code', label: 'Component Code', required: true },
  { key: 'manufacturer_code', label: 'Manufacturer Code', required: false },
  { key: 'price', label: 'Price (INR)', required: false },
  { key: 'stock_qty', label: 'Stock Qty', required: false },
  { key: 'description', label: 'Description', required: false },
];

function guessMapping(headers) {
  const lower = headers.map(h => h?.toString().toLowerCase().trim());
  const mapping = {};
  EXPECTED_FIELDS.forEach(({ key }) => {
    const aliases = {
      name: ['name', 'component name', 'product name', 'description', 'title'],
      system: ['system', 'brand', 'implant system', 'manufacturer'],
      abutment_type: ['abutment type', 'abutment', 'type'],
      gingival_height_mm: ['gingival height', 'gh', 'gingival height (mm)', 'gh (mm)', 'gingival'],
      platform_diameter: ['platform diameter', 'diameter', 'platform', 'platform (mm)', 'pd'],
      material: ['material', 'materials'],
      component_code: ['component code', 'sku', 'code', 'internal code', 'item code', 'part no', 'part number'],
      manufacturer_code: ['manufacturer code', 'mfr code', 'oem code', 'mfr part', 'original code', 'catalog no'],
      price: ['price', 'unit price', 'price (inr)', 'mrp', 'cost'],
      stock_qty: ['stock', 'qty', 'quantity', 'stock qty', 'available', 'inventory'],
      description: ['description', 'notes', 'details', 'remarks'],
    };
    const found = lower.findIndex(h => aliases[key]?.includes(h));
    if (found >= 0) mapping[key] = headers[found];
  });
  return mapping;
}

function parseRow(row, mapping) {
  const obj = {};
  EXPECTED_FIELDS.forEach(({ key }) => {
    const col = mapping[key];
    if (col !== undefined && col !== '__skip__') {
      obj[key] = row[col] ?? '';
    }
  });
  obj.gingival_height_mm = obj.gingival_height_mm ? Number(obj.gingival_height_mm) : null;
  obj.platform_diameter = obj.platform_diameter ? Number(obj.platform_diameter) : null;
  obj.price = obj.price ? Number(obj.price) : 0;
  obj.stock_qty = obj.stock_qty ? parseInt(obj.stock_qty, 10) : 0;
  obj.is_active = true;
  return obj;
}

function validateRow(row) {
  const errors = [];
  if (!row.name?.toString().trim()) errors.push('Missing name');
  if (!row.system?.toString().trim()) errors.push('Missing system');
  if (!row.component_code?.toString().trim()) errors.push('Missing component code');
  return errors;
}

export default function ImportExcel({ open, onClose }) {
  const fileRef = useRef();
  const [step, setStep] = useState('upload'); // upload | map | preview | done
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const createComponent = useCreateComponent();

  function reset() {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResults(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data.length) { toast.error('Sheet is empty'); return; }
        const hdrs = data[0].map(h => h?.toString().trim()).filter(Boolean);
        const dataRows = data.slice(1).filter(r => r.some(c => c !== ''));
        // Convert to objects
        const objRows = dataRows.map(r => {
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
    const parsed = rows.map(r => parseRow(r, mapping));
    const valid = parsed.filter(r => validateRow(r).length === 0);
    const invalid = parsed.length - valid.length;

    setImporting(true);
    let success = 0, failed = 0;
    for (const row of valid) {
      try {
        await createComponent.mutateAsync(row);
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResults({ success, failed, invalid });
    setStep('done');
  }

  const previewRows = rows.slice(0, 5).map(r => parseRow(r, mapping));
  const previewErrors = previewRows.map(r => validateRow(r));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import from Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload an <strong>.xlsx</strong> file. The first row must be column headers.
              Required columns: <strong>Name</strong>, <strong>Implant System</strong>, <strong>Component Code</strong>.
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

        {/* Step: Map columns */}
        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Detected <strong>{rows.length} rows</strong> in your file. Map your columns to the fields below.
              Auto-detected mappings are pre-filled.
            </p>
            <div className="space-y-2">
              {EXPECTED_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-44 shrink-0 text-sm">
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

        {/* Step: Preview */}
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
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">GH</th>
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
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep('map')}>← Back</Button>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? `Importing… (${rows.length} rows)` : `Import ${rows.length} Components`}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && results && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <div className="flex justify-center gap-4 mt-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{results.success}</div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                {results.failed > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{results.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed (duplicates)</div>
                  </div>
                )}
                {results.invalid > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{results.invalid}</div>
                    <div className="text-xs text-muted-foreground">Skipped (invalid)</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={reset}>Import Another</Button>
              <Button onClick={() => { reset(); onClose(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// needed since this file uses cn directly
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
