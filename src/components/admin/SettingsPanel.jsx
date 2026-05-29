import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, RotateCcw, Save, Upload, X, ImageIcon, EyeOff, Eye, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useSettings, SETTINGS_DEFAULTS } from '@/context/SettingsContext';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, SCREW_TYPES, MATERIALS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function SettingSection({ title, description, children }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <div className="sm:w-52 shrink-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'dark',   label: 'Dark',   icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

// ── Colour swatch (top-level to avoid re-mounting on every render) ────────────
function ColorSwatch({ item, colors, onColorChange }) {
  const hex = colors?.[item];
  return (
    <span className="flex items-center gap-1 shrink-0">
      <label className="relative cursor-pointer" title="Pick colour">
        <span
          className="block w-4 h-4 rounded-full border border-border shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: hex || '#94a3b8' }}
        />
        <input
          type="color"
          value={hex || '#94a3b8'}
          onChange={e => onColorChange(item, e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
      {hex && (
        <button type="button" onClick={() => onColorChange(item, null)} title="Reset colour"
          className="text-muted-foreground hover:text-foreground transition-colors leading-none">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ── Permanent-delete confirmation dialog ─────────────────────────────────────
function ConfirmDeleteDialog({ open, target, onConfirm, onCancel }) {
  if (!target) return null;
  const isBatch   = target.kind === 'batch';
  const isBuiltIn = target.kind === 'single' ? target.isBuiltIn : target.hasBuiltIn;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            Delete Permanently?
          </DialogTitle>
          <DialogDescription>
            {isBatch
              ? `You are about to delete ${target.count} item${target.count > 1 ? 's' : ''}.`
              : `You are about to delete "${target.item}".`}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive space-y-1">
          <p className="font-semibold">This is irreversible and deletes permanently.</p>
          {isBuiltIn && (
            <p>Built-in options cannot be restored individually — you would need to reset all settings to get them back.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Delete Permanently</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Catalog option list with rubber-band drag selection ───────────────────────
function CatalogOptionList({
  label, addLabel,
  builtIn, custom, hidden,
  onToggleHidden, onDeleteBuiltIn, onDeleteCustom, onAddCustom,
  onBatchHide, onBatchShow, onBatchDeleteBuiltIn, onBatchDeleteCustom,
  colors, onColorChange,
}) {
  const showColors = !!onColorChange;

  // Flat ordered list of every visible row (for index-based drag)
  const allRows = [
    ...builtIn.map(item => ({ item, type: 'builtin' })),
    ...custom.map(item  => ({ item, type: 'custom'  })),
  ];

  const [selected,     setSelected]     = useState(new Set());
  const [addValue,     setAddValue]     = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // deleteTarget: null | { kind:'single', item:string, isBuiltIn:boolean }
  //                     | { kind:'batch', count:number, hasBuiltIn:boolean, builtIns:string[], customs:string[] }

  // ── Drag-select refs ──────────────────────────────────────────────────────
  const isDragging           = useRef(false);
  const dragStartIndex       = useRef(null);
  const dragStartValue       = useRef(true);
  const dragOriginalSelected = useRef(null);
  const mouseXRef            = useRef(0);
  const mouseYRef            = useRef(0);
  const scrollRafRef         = useRef(null);
  const allRowsRef           = useRef(allRows);
  const containerRef         = useRef(null);

  useEffect(() => { allRowsRef.current = allRows; });

  function applyDragAt(idx) {
    if (!isDragging.current || dragStartIndex.current === null) return;
    const rows = allRowsRef.current;
    const orig = dragOriginalSelected.current;
    if (!orig) return;
    const lo = Math.min(dragStartIndex.current, idx);
    const hi = Math.max(dragStartIndex.current, idx);
    setSelected(() => {
      const next = new Set(orig);
      for (let i = lo; i <= hi; i++) {
        if (!rows[i]) continue;
        dragStartValue.current ? next.add(rows[i].item) : next.delete(rows[i].item);
      }
      return next;
    });
  }

  useEffect(() => {
    const ZONE = 80, MAX_SPEED = 14;
    function speed(y) {
      if (y < ZONE) return -Math.ceil(MAX_SPEED * (1 - y / ZONE));
      const d = window.innerHeight - y;
      if (d < ZONE) return Math.ceil(MAX_SPEED * (1 - d / ZONE));
      return 0;
    }
    function rowAt(x, y) {
      const el  = document.elementFromPoint(x, y);
      const row = el?.closest('[data-catalog-row]');
      if (!row || !containerRef.current?.contains(row)) return null;
      return Number(row.dataset.catalogRow);
    }
    function frame() {
      if (!isDragging.current) { scrollRafRef.current = null; return; }
      const s = speed(mouseYRef.current);
      if (s !== 0) {
        window.scrollBy(0, s);
        const idx = rowAt(mouseXRef.current, mouseYRef.current);
        if (idx !== null) applyDragAt(idx);
      }
      scrollRafRef.current = requestAnimationFrame(frame);
    }
    function onMove(e) {
      mouseXRef.current = e.clientX; mouseYRef.current = e.clientY;
      if (isDragging.current && !scrollRafRef.current)
        scrollRafRef.current = requestAnimationFrame(frame);
    }
    function onUp() {
      isDragging.current = false;
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  function handleCheckboxMouseDown(e, idx) {
    if (e.button !== 0) return;
    e.preventDefault();
    const item = allRows[idx].item;
    dragOriginalSelected.current = new Set(selected);
    isDragging.current     = true;
    dragStartIndex.current = idx;
    dragStartValue.current = !selected.has(item);
    applyDragAt(idx);
  }

  function clearSelection() { setSelected(new Set()); }
  function toggleAll() {
    setSelected(selected.size === allRows.length ? new Set() : new Set(allRows.map(r => r.item)));
  }

  // ── Derived selection sets ────────────────────────────────────────────────
  const selBuiltIn = allRows.filter(r => selected.has(r.item) && r.type === 'builtin');
  const selCustom  = allRows.filter(r => selected.has(r.item) && r.type === 'custom');
  const selVisible = selBuiltIn.filter(r => !hidden.includes(r.item));
  const selHidden  = selBuiltIn.filter(r =>  hidden.includes(r.item));
  const selActive  = [...selBuiltIn, ...selCustom];
  const totalSel   = selected.size;
  const allSel     = allRows.length > 0 && totalSel === allRows.length;
  const someSel    = totalSel > 0 && !allSel;

  // ── Batch handlers ────────────────────────────────────────────────────────
  function handleBatchHide() {
    if (selVisible.length) onBatchHide(selVisible.map(r => r.item));
    clearSelection();
  }
  function handleBatchShow() {
    if (selHidden.length) onBatchShow(selHidden.map(r => r.item));
    clearSelection();
  }
  function handleBatchDelete() {
    setDeleteTarget({
      kind:       'batch',
      count:      selActive.length,
      hasBuiltIn: selBuiltIn.length > 0,
      builtIns:   selBuiltIn.map(r => r.item),
      customs:    selCustom.map(r => r.item),
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'single') {
      if (deleteTarget.isBuiltIn) onDeleteBuiltIn(deleteTarget.item);
      else                        onDeleteCustom(deleteTarget.item);
    } else {
      if (deleteTarget.builtIns?.length) onBatchDeleteBuiltIn(deleteTarget.builtIns);
      if (deleteTarget.customs?.length)  onBatchDeleteCustom(deleteTarget.customs);
      clearSelection();
    }
    setDeleteTarget(null);
  }

  // ── Add handler ───────────────────────────────────────────────────────────
  function handleAdd() {
    const v = addValue.trim();
    if (!v) return;
    onAddCustom(v);
    setAddValue('');
    setShowAdd(false);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add {addLabel}
        </button>
      </div>

      {/* Batch action bar */}
      {totalSel > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
          <div className="flex items-center gap-1.5 mr-auto">
            <span className="text-sm font-medium">{totalSel} selected</span>
            <button onClick={clearSelection} title="Clear selection"
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {selVisible.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBatchHide}>
              <EyeOff className="h-3 w-3" /> Hide ({selVisible.length})
            </Button>
          )}
          {selHidden.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBatchShow}>
              <Eye className="h-3 w-3" /> Show ({selHidden.length})
            </Button>
          )}
          {selActive.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBatchDelete}
              className="h-7 gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="h-3 w-3" /> Delete ({selActive.length})
            </Button>
          )}
        </div>
      )}

      {allRows.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground italic">No options.</p>
      )}

      <div ref={containerRef} className="rounded-md border border-border divide-y divide-border">

        {/* Select-all header */}
        {allRows.length > 0 && (
          <div className="flex items-center px-3 py-1.5 bg-muted/30 cursor-pointer select-none"
            onClick={toggleAll} onMouseDown={e => e.preventDefault()}>
            <Checkbox
              checked={allSel ? true : someSel ? 'indeterminate' : false}
              className="pointer-events-none"
              aria-label="Select all"
            />
            <span className="ml-2 text-[11px] text-muted-foreground">Select all</span>
          </div>
        )}

        {/* Built-in items */}
        {builtIn.map((item, i) => {
          const isHidden  = hidden.includes(item);
          const isChecked = selected.has(item);
          return (
            <div
              key={item}
              data-catalog-row={i}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm select-none',
                isHidden  && 'opacity-60',
                isChecked && 'bg-muted/40',
              )}
              onMouseEnter={() => {
                if (isDragging.current && dragStartIndex.current !== null) applyDragAt(i);
              }}
            >
              <div className="shrink-0 cursor-pointer" onMouseDown={e => handleCheckboxMouseDown(e, i)}>
                <Checkbox checked={isChecked} className="pointer-events-none" />
              </div>
              {showColors && <ColorSwatch item={item} colors={colors} onColorChange={onColorChange} />}
              <span className={cn('flex-1', isHidden && 'line-through text-muted-foreground')}>{item}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => onToggleHidden(item)}
                  title={isHidden ? 'Show in dropdowns' : 'Hide from dropdowns'}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {isHidden
                    ? <><Eye     className="h-3.5 w-3.5" /> Show</>
                    : <><EyeOff className="h-3.5 w-3.5" /> Hide</>}
                </button>
                <button type="button"
                  onClick={() => setDeleteTarget({ kind: 'single', item, isBuiltIn: true })}
                  title="Delete permanently"
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Custom items */}
        {custom.map((item, i) => {
          const idx       = builtIn.length + i;
          const isChecked = selected.has(item);
          return (
            <div
              key={item}
              data-catalog-row={idx}
              className={cn('flex items-center gap-2 px-3 py-2 text-sm select-none', isChecked && 'bg-muted/40')}
              onMouseEnter={() => {
                if (isDragging.current && dragStartIndex.current !== null) applyDragAt(idx);
              }}
            >
              <div className="shrink-0 cursor-pointer" onMouseDown={e => handleCheckboxMouseDown(e, idx)}>
                <Checkbox checked={isChecked} className="pointer-events-none" />
              </div>
              {showColors && <ColorSwatch item={item} colors={colors} onColorChange={onColorChange} />}
              <span className="flex-1 flex items-center gap-1.5">
                {item}
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">custom</Badge>
              </span>
              <button type="button"
                onClick={() => setDeleteTarget({ kind: 'single', item, isBuiltIn: false })}
                title="Remove"
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {/* Add row — shown when the top-right button is clicked */}
        {showAdd && (
          <div className="flex items-center gap-2 px-3 py-2">
            <Input
              autoFocus
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleAdd();
                if (e.key === 'Escape') { setShowAdd(false); setAddValue(''); }
              }}
              placeholder={`New ${addLabel.toLowerCase()}…`}
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" className="h-7 text-xs px-2.5" onClick={handleAdd}>Add</Button>
            <button type="button" onClick={() => { setShowAdd(false); setAddValue(''); }}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Confirmation dialog for permanent deletion */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function SettingsPanel({ isAdmin = true }) {
  const { settings, updateSettings, resetSettings } = useSettings();

  const [draft,     setDraft]     = useState({ ...settings });
  const [uploading, setUploading] = useState(false);

  function handleThemeChange(theme) {
    setDraft(d => ({ ...d, theme }));
    updateSettings({ theme });
  }
  function set(key, value)          { setDraft(d => ({ ...d, [key]: value })); }
  function setWaField(key, value)   { setDraft(d => ({ ...d, waFields: { ...d.waFields, [key]: value } })); }
  function setSubPerm(key, value)   { setDraft(d => ({ ...d, subUserPermissions: { ...d.subUserPermissions, [key]: value } })); }

  // ── Single-item catalog helpers (save immediately) ────────────────────────
  function toggleHidden(hiddenKey, value) {
    const current = settings[hiddenKey] || [];
    const next    = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateSettings({ [hiddenKey]: next });
    setDraft(d => ({ ...d, [hiddenKey]: next }));
  }

  function deleteBuiltIn(deletedKey, hiddenKey, value) {
    const nextDeleted = [...(settings[deletedKey] || []), value];
    const nextHidden  = (settings[hiddenKey]  || []).filter(v => v !== value);
    updateSettings({ [deletedKey]: nextDeleted, [hiddenKey]: nextHidden });
    setDraft(d => ({ ...d, [deletedKey]: nextDeleted, [hiddenKey]: nextHidden }));
    toast.success(`"${value}" deleted`);
  }

  function deleteCustom(customKey, value) {
    const next = (settings[customKey] || []).filter(v => v !== value);
    updateSettings({ [customKey]: next });
    setDraft(d => ({ ...d, [customKey]: next }));
    toast.success(`"${value}" removed`);
  }

  function addCustom(customKey, value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = settings[customKey] || [];
    if (current.includes(trimmed)) { toast.error(`"${trimmed}" already exists`); return; }
    const next = [...current, trimmed];
    updateSettings({ [customKey]: next });
    setDraft(d => ({ ...d, [customKey]: next }));
    toast.success(`"${trimmed}" added`);
  }

  // ── Batch catalog helpers ─────────────────────────────────────────────────
  function batchHide(hiddenKey, items) {
    if (!items.length) return;
    const next = [...new Set([...(settings[hiddenKey] || []), ...items])];
    updateSettings({ [hiddenKey]: next });
    setDraft(d => ({ ...d, [hiddenKey]: next }));
    toast.success(`${items.length} item${items.length > 1 ? 's' : ''} hidden`);
  }

  function batchShow(hiddenKey, items) {
    if (!items.length) return;
    const next = (settings[hiddenKey] || []).filter(v => !items.includes(v));
    updateSettings({ [hiddenKey]: next });
    setDraft(d => ({ ...d, [hiddenKey]: next }));
    toast.success(`${items.length} item${items.length > 1 ? 's' : ''} shown`);
  }

  function batchDeleteBuiltIn(deletedKey, hiddenKey, items) {
    if (!items.length) return;
    const nextDeleted = [...new Set([...(settings[deletedKey] || []), ...items])];
    const nextHidden  = (settings[hiddenKey] || []).filter(v => !items.includes(v));
    updateSettings({ [deletedKey]: nextDeleted, [hiddenKey]: nextHidden });
    setDraft(d => ({ ...d, [deletedKey]: nextDeleted, [hiddenKey]: nextHidden }));
    toast.success(`${items.length} item${items.length > 1 ? 's' : ''} deleted`);
  }

  function batchDeleteCustom(customKey, items) {
    if (!items.length) return;
    const next = (settings[customKey] || []).filter(v => !items.includes(v));
    updateSettings({ [customKey]: next });
    setDraft(d => ({ ...d, [customKey]: next }));
    toast.success(`${items.length} item${items.length > 1 ? 's' : ''} removed`);
  }

  function handleColorChange(system, hex) {
    const next = { ...(settings.systemColors || {}) };
    if (hex) { next[system] = hex; } else { delete next[system]; }
    updateSettings({ systemColors: next });
    setDraft(d => ({ ...d, systemColors: next }));
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `logos/lab-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      updateSettings({ logoUrl: data.publicUrl });
      setDraft(d => ({ ...d, logoUrl: data.publicUrl }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleRemoveLogo() {
    updateSettings({ logoUrl: '' });
    setDraft(d => ({ ...d, logoUrl: '' }));
    toast.success('Logo removed');
  }

  function handleSave()  { updateSettings(draft); toast.success('Settings saved'); }
  function handleReset() {
    if (!confirm('Reset all settings to defaults?')) return;
    resetSettings();
    setDraft({ ...SETTINGS_DEFAULTS });
    toast.success('Settings reset to defaults');
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  // Pre-filter built-in lists to exclude permanently deleted items
  const activeSystems      = IMPLANT_SYSTEMS.filter(s => !(settings.deletedSystems      || []).includes(s));
  const activeAbutments    = ABUTMENT_TYPES.filter(t  => !(settings.deletedAbutmentTypes || []).includes(t));
  const activeScrewTypes   = SCREW_TYPES.filter(t    => !(settings.deletedScrewTypes     || []).includes(t));
  const activeMaterials    = MATERIALS.filter(m       => !(settings.deletedMaterials     || []).includes(m));

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Appearance ── */}
      <SettingSection title="Appearance" description="Choose how the app looks. System follows your device's preference.">
        <SettingRow label="Theme">
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => handleThemeChange(value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  draft.theme === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                )}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingSection>

      {/* ── Branding ── */}
      {isAdmin && (
        <SettingSection title="Branding"
          description="Your logo appears in the navbar and on printed dispatch slips. Recommended: square PNG or SVG, at least 256×256px.">
          <SettingRow label="Lab Logo" hint="Saved instantly on upload">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {settings.logoUrl
                  ? <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                  : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />}
              </div>
              <div className="flex flex-col gap-2">
                <label className={cn(
                  'flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  uploading ? 'opacity-50 pointer-events-none border-border text-muted-foreground' : 'border-border hover:bg-accent text-foreground'
                )}>
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading…' : settings.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
                {settings.logoUrl && (
                  <button onClick={handleRemoveLogo} className="flex items-center gap-2 text-xs text-destructive hover:opacity-80 transition-opacity">
                    <X className="h-3 w-3" /> Remove logo
                  </button>
                )}
              </div>
            </div>
          </SettingRow>
        </SettingSection>
      )}

      {/* ── Lab Information ── */}
      {isAdmin && (
        <SettingSection title="Lab / Clinic Information" description="Shown in the navbar, printed dispatch slips, and exported documents.">
          <SettingRow label="Lab Name" hint="Appears in the navbar logo and print header">
            <Input value={draft.labName} onChange={e => set('labName', e.target.value)} placeholder="e.g. DentoCrafts Lab" />
          </SettingRow>
          <SettingRow label="Tagline" hint="Subtitle shown on printed dispatch slips">
            <Input value={draft.labTagline} onChange={e => set('labTagline', e.target.value)} placeholder="e.g. Precision Dental Solutions" />
          </SettingRow>
        </SettingSection>
      )}

      {/* ── Display ── */}
      {isAdmin && (
        <SettingSection title="Display" description="Control what information is visible across the app.">
          <SettingRow label="Show Pricing" hint="Hides all prices in catalog, stock, and dispatch when off">
            <Switch checked={draft.showPricing} onCheckedChange={v => set('showPricing', v)} />
          </SettingRow>
        </SettingSection>
      )}

      {/* ── Inventory ── */}
      {isAdmin && (
        <SettingSection title="Inventory" description="Controls how stock levels are flagged across the app.">
          <SettingRow label="Low Stock Threshold" hint="Items at or below this quantity are marked as Low Stock">
            <div className="flex items-center gap-2">
              <Input type="number" min={1} max={100} value={draft.lowStockThreshold}
                onChange={e => set('lowStockThreshold', Number(e.target.value))} className="w-24" />
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </SettingRow>
        </SettingSection>
      )}

      {/* ── Dispatch / WhatsApp ── */}
      <SettingSection title="Dispatch & WhatsApp"
        description="Customise the default text and which fields appear in copied WhatsApp messages.">
        <SettingRow label="Default Status Text" hint="The *Status:* line at the bottom of WhatsApp messages">
          <Input value={draft.waStatusText} onChange={e => set('waStatusText', e.target.value)} placeholder="e.g. Pending Dispatch" />
        </SettingRow>
        <SettingRow label="Include Case ID"        hint="Show *Case ID:* in copied message">
          <Switch checked={draft.waFields?.caseId        ?? true} onCheckedChange={v => setWaField('caseId', v)} />
        </SettingRow>
        <SettingRow label="Include Patient Name"   hint="Show *Patient Name:* line (blank, staff fills manually)">
          <Switch checked={draft.waFields?.patientName   ?? true} onCheckedChange={v => setWaField('patientName', v)} />
        </SettingRow>
        <SettingRow label="Include Notes"          hint="Show *Notes:* if notes are present">
          <Switch checked={draft.waFields?.notes         ?? true} onCheckedChange={v => setWaField('notes', v)} />
        </SettingRow>
        <SettingRow label="Include Component Code" hint="Show (code) after each component name">
          <Switch checked={draft.waFields?.componentCode ?? true} onCheckedChange={v => setWaField('componentCode', v)} />
        </SettingRow>
        <SettingRow label="Include Status"         hint="Show *Status:* line at the bottom">
          <Switch checked={draft.waFields?.status        ?? true} onCheckedChange={v => setWaField('status', v)} />
        </SettingRow>
      </SettingSection>

      {/* ── Catalog Options ── */}
      {isAdmin && (
        <SettingSection title="Catalog Options"
          description="Add, hide, or delete options from the System, Type, and Material dropdowns. Drag to multi-select. Changes apply immediately.">
          <CatalogOptionList
            label="Implant Systems" addLabel="System"
            builtIn={activeSystems}
            custom={settings.customSystems      || []}
            hidden={settings.hiddenSystems      || []}
            colors={settings.systemColors       || {}}
            onColorChange={handleColorChange}
            onToggleHidden={v     => toggleHidden('hiddenSystems', v)}
            onDeleteBuiltIn={v    => deleteBuiltIn('deletedSystems', 'hiddenSystems', v)}
            onDeleteCustom={v     => deleteCustom('customSystems', v)}
            onAddCustom={v        => addCustom('customSystems', v)}
            onBatchHide={items          => batchHide('hiddenSystems', items)}
            onBatchShow={items          => batchShow('hiddenSystems', items)}
            onBatchDeleteBuiltIn={items => batchDeleteBuiltIn('deletedSystems', 'hiddenSystems', items)}
            onBatchDeleteCustom={items  => batchDeleteCustom('customSystems', items)}
          />
          <CatalogOptionList
            label="Abutment Types" addLabel="Abutment Type"
            builtIn={activeAbutments}
            custom={settings.customAbutmentTypes    || []}
            hidden={settings.hiddenAbutmentTypes    || []}
            onToggleHidden={v     => toggleHidden('hiddenAbutmentTypes', v)}
            onDeleteBuiltIn={v    => deleteBuiltIn('deletedAbutmentTypes', 'hiddenAbutmentTypes', v)}
            onDeleteCustom={v     => deleteCustom('customAbutmentTypes', v)}
            onAddCustom={v        => addCustom('customAbutmentTypes', v)}
            onBatchHide={items          => batchHide('hiddenAbutmentTypes', items)}
            onBatchShow={items          => batchShow('hiddenAbutmentTypes', items)}
            onBatchDeleteBuiltIn={items => batchDeleteBuiltIn('deletedAbutmentTypes', 'hiddenAbutmentTypes', items)}
            onBatchDeleteCustom={items  => batchDeleteCustom('customAbutmentTypes', items)}
          />
          <CatalogOptionList
            label="Screw Types" addLabel="Screw Type"
            builtIn={activeScrewTypes}
            custom={settings.customScrewTypes    || []}
            hidden={settings.hiddenScrewTypes    || []}
            onToggleHidden={v     => toggleHidden('hiddenScrewTypes', v)}
            onDeleteBuiltIn={v    => deleteBuiltIn('deletedScrewTypes', 'hiddenScrewTypes', v)}
            onDeleteCustom={v     => deleteCustom('customScrewTypes', v)}
            onAddCustom={v        => addCustom('customScrewTypes', v)}
            onBatchHide={items          => batchHide('hiddenScrewTypes', items)}
            onBatchShow={items          => batchShow('hiddenScrewTypes', items)}
            onBatchDeleteBuiltIn={items => batchDeleteBuiltIn('deletedScrewTypes', 'hiddenScrewTypes', items)}
            onBatchDeleteCustom={items  => batchDeleteCustom('customScrewTypes', items)}
          />
          <CatalogOptionList
            label="Materials" addLabel="Material"
            builtIn={activeMaterials}
            custom={settings.customMaterials    || []}
            hidden={settings.hiddenMaterials    || []}
            onToggleHidden={v     => toggleHidden('hiddenMaterials', v)}
            onDeleteBuiltIn={v    => deleteBuiltIn('deletedMaterials', 'hiddenMaterials', v)}
            onDeleteCustom={v     => deleteCustom('customMaterials', v)}
            onAddCustom={v        => addCustom('customMaterials', v)}
            onBatchHide={items          => batchHide('hiddenMaterials', items)}
            onBatchShow={items          => batchShow('hiddenMaterials', items)}
            onBatchDeleteBuiltIn={items => batchDeleteBuiltIn('deletedMaterials', 'hiddenMaterials', items)}
            onBatchDeleteCustom={items  => batchDeleteCustom('customMaterials', items)}
          />
        </SettingSection>
      )}

      {/* ── Sub-user Permissions ── */}
      {isAdmin && (
        <SettingSection title="Sub-user Permissions"
          description="Controls what non-admin staff can do. Admins always have full access regardless of these settings.">
          <SettingRow label="Manage Components"    hint="Allow staff to add, edit, deactivate, or delete components">
            <Switch checked={draft.subUserPermissions?.canManageComponents ?? false} onCheckedChange={v => setSubPerm('canManageComponents', v)} />
          </SettingRow>
          <SettingRow label="Log Stock Movements"  hint="Allow staff to use Outward / Inward / Received buttons">
            <Switch checked={draft.subUserPermissions?.canLogStock         ?? false} onCheckedChange={v => setSubPerm('canLogStock', v)} />
          </SettingRow>
          <SettingRow label="View Stock History"   hint="Allow staff to see the movement history tab">
            <Switch checked={draft.subUserPermissions?.canViewHistory      ?? true}  onCheckedChange={v => setSubPerm('canViewHistory', v)} />
          </SettingRow>
          <SettingRow label="View Pricing"         hint="Allow staff to see component prices">
            <Switch checked={draft.subUserPermissions?.canViewPricing      ?? true}  onCheckedChange={v => setSubPerm('canViewPricing', v)} />
          </SettingRow>
          <SettingRow label="Export CSV"           hint="Allow staff to export catalog and screws to CSV">
            <Switch checked={draft.subUserPermissions?.canExportCSV        ?? true}  onCheckedChange={v => setSubPerm('canExportCSV', v)} />
          </SettingRow>
          <SettingRow label="Print Dispatch Slips" hint="Allow staff to print or save dispatch slips as PDF">
            <Switch checked={draft.subUserPermissions?.canPrintDispatch    ?? true}  onCheckedChange={v => setSubPerm('canPrintDispatch', v)} />
          </SettingRow>
        </SettingSection>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!isDirty} className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
