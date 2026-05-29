import { useState, useRef, useEffect } from 'react';
import { ArrowUpRight, Undo2, PackagePlus, SlidersHorizontal, History, Download, X, Plus } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import DentalPlaceholder from '@/components/common/DentalPlaceholder';
import CopyableCode from '@/components/common/CopyableCode';
import EmptyState from '@/components/common/EmptyState';
import { useAllComponents } from '@/hooks/useComponents';
import { useAllStockMovements, useLogStockMovement, useLogBatchStockMovements } from '@/hooks/useStock';
import { formatCurrency, getStockStatus, getSystemStyle, cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { parseImagePos } from '@/lib/imageUtils';

// ── Movement type config ──────────────────────────────────────────────
const MOVEMENT_TYPES = {
  out: {
    label: 'Outward',
    description: 'Sent to doctor',
    icon: ArrowUpRight,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    btnClass: 'text-orange-600 border-orange-200 hover:bg-orange-50',
    sign: '-',
    notesPlaceholder: 'e.g. Sent to Dr. Mehta, Smile Dental',
    submitLabel: 'Mark Outward',
    submitClass: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  in: {
    label: 'Inward',
    description: 'Returned by doctor',
    icon: Undo2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    btnClass: 'text-blue-600 border-blue-200 hover:bg-blue-50',
    sign: '+',
    notesPlaceholder: 'e.g. Returned by Dr. Mehta after use',
    submitLabel: 'Mark Inward',
    submitClass: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  received: {
    label: 'Received',
    description: 'Order received — log only',
    icon: PackagePlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    btnClass: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50',
    sign: '',
    noStockImpact: true,
    notesPlaceholder: 'e.g. Order from Osstem, PO #1234',
    submitLabel: 'Mark Received',
    submitClass: '',
  },
};

// ── Dialog ────────────────────────────────────────────────────────────
function StockDialog({ component, type, open, onClose }) {
  const [qty,         setQty]         = useState(1);
  const [caseId,      setCaseId]      = useState('');
  const [doctorName,  setDoctorName]  = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes,       setNotes]       = useState('');
  const [showNotes,   setShowNotes]   = useState(false);
  const logMovement = useLogStockMovement();
  const cfg  = MOVEMENT_TYPES[type] || MOVEMENT_TYPES.out;
  const Icon = cfg.icon;
  // out / in use structured fields; received keeps plain notes
  const isStructured = type === 'out' || type === 'in';

  if (!component) return null;

  function resetForm() {
    setQty(1);
    setCaseId(''); setDoctorName(''); setPatientName('');
    setNotes(''); setShowNotes(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!qty || qty <= 0) return;

    const combinedNotes = isStructured
      ? [
          caseId.trim()      && `Case: ${caseId.trim()}`,
          doctorName.trim()  && `Dr: ${doctorName.trim()}`,
          patientName.trim() && `Patient: ${patientName.trim()}`,
          notes.trim(),
        ].filter(Boolean).join(' · ') || null
      : notes.trim() || null;

    try {
      await logMovement.mutateAsync({
        component_id:  component.id,
        type,
        quantity:      Number(qty),
        notes:         combinedNotes,
        current_stock: component.stock_qty,
      });
      toast.success(`${cfg.label}: ${cfg.sign}${qty} × ${component.name}`);
      resetForm();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', cfg.color)} />
            {cfg.label}
            <span className="text-xs font-normal text-muted-foreground">— {cfg.description}</span>
          </DialogTitle>
        </DialogHeader>

        <div className={cn('rounded-md px-3 py-2 text-sm space-y-0.5', cfg.bg, 'border', cfg.border)}>
          <p className="font-semibold">{component.name}</p>
          <CopyableCode code={component.component_code} />
          <p className="text-muted-foreground text-xs">
            Current stock: <span className="font-bold text-foreground">{component.stock_qty}</span> units
          </p>
        </div>

        {cfg.noStockImpact && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-start gap-1.5">
            <span className="mt-0.5">ⓘ</span>
            <span>This is logged as an order receipt only. It does <strong>not</strong> affect internal lab stock.</span>
          </div>
        )}

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {/* Quantity — always shown */}
          <div className="space-y-1.5">
            <Label htmlFor="qty">Quantity *</Label>
            <Input id="qty" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} required autoFocus />
          </div>

          {isStructured ? (
            <>
              {/* Case ID */}
              <div className="space-y-1.5">
                <Label htmlFor="dlg-caseId">Case ID</Label>
                <Input id="dlg-caseId" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="e.g. SSAA452015AH" />
              </div>
              {/* Doctor + Patient side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dlg-doctor">Doctor Name</Label>
                  <Input id="dlg-doctor" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Smith" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dlg-patient">Patient Name</Label>
                  <Input id="dlg-patient" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="John Doe" />
                </div>
              </div>
              {/* Collapsible extra notes */}
              {(showNotes || notes) ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                    {!notes && (
                      <button type="button" onClick={() => setShowNotes(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={cfg.notesPlaceholder} />
                </div>
              ) : (
                <button type="button" onClick={() => setShowNotes(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Plus className="h-3 w-3" />
                  Add additional notes
                </button>
              )}
            </>
          ) : (
            /* Received — plain notes */
            <div className="space-y-1.5">
              <Label htmlFor="dlg-notes">Notes (optional)</Label>
              <Textarea id="dlg-notes" placeholder={cfg.notesPlaceholder} value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={logMovement.isPending} className={cfg.submitClass}>
              {logMovement.isPending ? 'Saving…' : cfg.submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Component detail modal ────────────────────────────────────────────
function ComponentDetailModal({ component, open, onClose, onAction, isAdmin }) {
  const { settings } = useSettings();
  if (!component) return null;
  const stock = getStockStatus(component.stock_qty);
  const { className: sysClass, style: sysStyle } = getSystemStyle(component.system, settings.systemColors);
  const { src: imgSrc, x: imgX, y: imgY } = parseImagePos(component.image_url);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="w-full h-44 bg-muted overflow-hidden">
          {imgSrc
            ? <img src={imgSrc} alt={component.name} className="w-full h-full object-cover" style={{ objectPosition: `${imgX}% ${imgY}%` }} />
            : <DentalPlaceholder />}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold leading-tight">{component.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', sysClass)} style={sysStyle}>
                {component.system}
              </span>
              <Badge variant={stock.variant} className="text-xs">{stock.label}</Badge>
            </div>
          </div>
          <div className={cn('divide-x divide-border rounded-lg border border-border text-center', settings.showPricing ? 'grid grid-cols-3' : 'grid grid-cols-2')}>
            {settings.showPricing && (
              <div className="px-3 py-2.5">
                <div className="text-xs text-muted-foreground mb-0.5">Price</div>
                <div className="font-bold text-primary text-sm">{formatCurrency(component.price)}</div>
              </div>
            )}
            <div className="px-3 py-2.5">
              <div className="text-xs text-muted-foreground mb-0.5">In Stock</div>
              <div className="font-bold text-lg leading-tight">{component.stock_qty}</div>
            </div>
            <div className="px-3 py-2.5">
              <div className="text-xs text-muted-foreground mb-0.5">Code</div>
              <CopyableCode code={component.component_code} className="font-semibold" />
            </div>
          </div>
          {isAdmin ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button variant="outline" className={cn('flex-col h-auto py-3 gap-1.5', MOVEMENT_TYPES.out.btnClass)} disabled={component.stock_qty === 0} onClick={() => onAction('out')}>
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs font-semibold">Outward</span>
              </Button>
              <Button variant="outline" className={cn('flex-col h-auto py-3 gap-1.5', MOVEMENT_TYPES.in.btnClass)} onClick={() => onAction('in')}>
                <Undo2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Inward</span>
              </Button>
              <Button variant="outline" className={cn('flex-col h-auto py-3 gap-1.5', MOVEMENT_TYPES.received.btnClass)} onClick={() => onAction('received')}>
                <PackagePlus className="h-4 w-4" />
                <span className="text-xs font-semibold">Received</span>
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center pt-1">Contact an admin to update stock.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Type badge for history ────────────────────────────────────────────
function MovementBadge({ type }) {
  const cfg = MOVEMENT_TYPES[type];
  if (!cfg) return <span className="text-xs capitalize text-muted-foreground">{type}</span>;
  const Icon = cfg.icon;
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border', cfg.bg, cfg.border, cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function Stock() {
  const { data: components, isLoading: loadingComponents } = useAllComponents();
  const { data: movements, isLoading: loadingMovements } = useAllStockMovements();
  const logBatch = useLogBatchStockMovements();
  const { isAdmin } = useAuth();
  const { canLogStock, canViewHistory } = usePermissions();
  const { settings } = useSettings();

  const [search,            setSearch]            = useState('');
  const [dialog,            setDialog]            = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [activeTab,         setActiveTab]         = useState('inventory');
  const [selected,          setSelected]          = useState(new Set());
  const [batchQty,          setBatchQty]          = useState(1);

  // ── Drag-select + auto-scroll refs ──────────────────────────────────
  const isDragging           = useRef(false);
  const dragStartIndex       = useRef(null);
  const dragStartValue       = useRef(true);
  const dragOriginalSelected = useRef(null);
  const mouseXRef            = useRef(0);
  const mouseYRef            = useRef(0);
  const scrollRafRef         = useRef(null);
  const filteredRef          = useRef([]);

  const filtered = (components ?? []).filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.system.toLowerCase().includes(search.toLowerCase()) ||
    c.component_code?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { filteredRef.current = filtered; });

  // ── Selection ────────────────────────────────────────────────────────
  const visibleSelected = filtered.filter(c => selected.has(c.id));
  const selectedCount   = visibleSelected.length;
  const allSelected     = filtered.length > 0 && selectedCount === filtered.length;
  const someSelected    = selectedCount > 0 && !allSelected;

  function toggleAll()       { setSelected(allSelected ? new Set() : new Set(filtered.map(c => c.id))); }
  function clearSelection()  { setSelected(new Set()); }

  function applyDragAt(idx) {
    if (!isDragging.current || dragStartIndex.current === null) return;
    const f    = filteredRef.current;
    const orig = dragOriginalSelected.current;
    if (!orig) return;
    const lo = Math.min(dragStartIndex.current, idx);
    const hi = Math.max(dragStartIndex.current, idx);
    setSelected(() => {
      const next = new Set(orig);
      for (let i = lo; i <= hi; i++) {
        if (!f[i]) continue;
        dragStartValue.current ? next.add(f[i].id) : next.delete(f[i].id);
      }
      return next;
    });
  }

  // ── Global mouse listeners ──────────────────────────────────────────
  useEffect(() => {
    const ZONE = 80, MAX_SPEED = 14;
    function speed(y) {
      if (y < ZONE) return -Math.ceil(MAX_SPEED * (1 - y / ZONE));
      const d = window.innerHeight - y;
      if (d < ZONE) return Math.ceil(MAX_SPEED * (1 - d / ZONE));
      return 0;
    }
    function rowAt(x, y) {
      const el = document.elementFromPoint(x, y);
      const row = el?.closest('[data-row-index]');
      return row ? Number(row.dataset.rowIndex) : null;
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
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  function handleCheckboxMouseDown(e, idx) {
    if (e.button !== 0) return;
    e.preventDefault();
    const id = filtered[idx].id;
    dragOriginalSelected.current = new Set(selected);
    isDragging.current     = true;
    dragStartIndex.current = idx;
    dragStartValue.current = !selected.has(id);
    applyDragAt(idx);
  }

  // ── Batch actions ────────────────────────────────────────────────────
  async function handleBatchOutward() {
    const qty = Number(batchQty);
    if (!qty || qty < 1) return;
    if (!confirm(`Log Outward ×${qty} for ${selectedCount} component${selectedCount > 1 ? 's' : ''}?`)) return;
    await logBatch.mutateAsync({ components: visibleSelected, type: 'out', quantity: qty });
    clearSelection();
    toast.success(`Outward ×${qty} logged for ${selectedCount} component${selectedCount > 1 ? 's' : ''}`);
  }

  async function handleBatchReceived() {
    const qty = Number(batchQty);
    if (!qty || qty < 1) return;
    if (!confirm(`Log Received ×${qty} for ${selectedCount} component${selectedCount > 1 ? 's' : ''}?`)) return;
    await logBatch.mutateAsync({ components: visibleSelected, type: 'received', quantity: qty });
    clearSelection();
    toast.success(`Received ×${qty} logged for ${selectedCount} component${selectedCount > 1 ? 's' : ''}`);
  }

  function handleBatchExport() {
    const headers = ['Name', 'System', 'Code', 'Stock', 'Status'];
    const rows = visibleSelected.map(c => [
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      c.system ?? '',
      c.component_code ?? '',
      c.stock_qty ?? 0,
      c.is_active ? 'Active' : 'Hidden',
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `implantdesk-stock-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedCount} component${selectedCount > 1 ? 's' : ''} exported`);
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Sticky action bar: title + tab switcher + search */}
        <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-3 pb-3 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Stock Management</h2>
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Outward/Inward affect lab stock · Received is an order log only</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {activeTab === 'inventory' && (
                <Input
                  placeholder="Search components…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 w-44 text-sm"
                />
              )}
              <Button variant={activeTab === 'inventory' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('inventory')} className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Inventory
              </Button>
              {canViewHistory && (
                <Button variant={activeTab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('history')} className="gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  History
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(MOVEMENT_TYPES).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 border font-medium', cfg.bg, cfg.border, cfg.color)}>
                <Icon className="h-3.5 w-3.5" />
                <span>{cfg.label}</span>
                <span className="text-muted-foreground font-normal">— {cfg.description}</span>
              </div>
            );
          })}
        </div>

        {/* ── Inventory Tab ── */}
        {activeTab === 'inventory' && (
          <>

            {/* Batch action bar */}
            {selectedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
                <div className="flex items-center gap-1.5 mr-auto">
                  <span className="text-sm font-medium">
                    {selectedCount} component{selectedCount > 1 ? 's' : ''} selected
                  </span>
                  <button onClick={clearSelection} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors" title="Clear selection">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {canLogStock && (
                  <>
                    {/* Quantity input */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Qty:</span>
                      <Input
                        type="number"
                        min={1}
                        value={batchQty}
                        onChange={e => setBatchQty(Math.max(1, Number(e.target.value)))}
                        className="h-8 w-16 text-xs text-center"
                      />
                    </div>
                    <Button variant="outline" size="sm" className={cn('gap-1.5 h-8', MOVEMENT_TYPES.out.btnClass)} onClick={handleBatchOutward} disabled={logBatch.isPending}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Outward
                    </Button>
                    <Button variant="outline" size="sm" className={cn('gap-1.5 h-8', MOVEMENT_TYPES.received.btnClass)} onClick={handleBatchReceived} disabled={logBatch.isPending}>
                      <PackagePlus className="h-3.5 w-3.5" />
                      Received
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleBatchExport} disabled={logBatch.isPending}>
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pr-0">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead className="hidden md:table-cell">System</TableHead>
                    <TableHead className="hidden sm:table-cell">Code</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    {canLogStock && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingComponents
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : filtered.map((c, idx) => {
                        const stock    = getStockStatus(c.stock_qty);
                        const { className: sysClass, style: sysStyle } = getSystemStyle(c.system, settings.systemColors);
                        const isChecked = selected.has(c.id);
                        return (
                          <TableRow
                            key={c.id}
                            data-row-index={idx}
                            className={cn('cursor-pointer select-none', isChecked && 'bg-muted/40')}
                            onClick={() => setSelectedComponent(c)}
                            onMouseEnter={() => {
                              if (isDragging.current && dragStartIndex.current !== null) applyDragAt(idx);
                            }}
                          >
                            {/* Checkbox cell — stops row click, starts drag */}
                            <TableCell
                              className="w-10 pr-0"
                              onClick={e => e.stopPropagation()}
                              onMouseDown={e => handleCheckboxMouseDown(e, idx)}
                            >
                              <Checkbox
                                checked={isChecked}
                                className="pointer-events-none"
                                aria-label={`Select ${c.name}`}
                              />
                            </TableCell>

                            <TableCell className="font-medium text-sm max-w-[180px]">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="line-clamp-1 block">{c.name}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">{c.name}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-1">
                                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold w-fit', sysClass)} style={sysStyle}>
                                  {c.system}
                                </span>
                                {c.category === 'screw' && (
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit bg-violet-50 text-violet-700 border-violet-200">
                                    Screw
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <CopyableCode code={c.component_code} />
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-lg">{c.stock_qty}</span>
                              <span className="text-muted-foreground text-xs ml-1">units</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={stock.variant} className="text-xs">{stock.label}</Badge>
                            </TableCell>
                            {canLogStock && (
                              <TableCell onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" variant="outline" className={cn('h-7 gap-1 text-xs', MOVEMENT_TYPES.out.btnClass)} onClick={() => setDialog({ component: c, type: 'out' })} disabled={c.stock_qty === 0} title="Outward">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    Outward
                                  </Button>
                                  <Button size="sm" variant="outline" className={cn('h-7 gap-1 text-xs', MOVEMENT_TYPES.in.btnClass)} onClick={() => setDialog({ component: c, type: 'in' })} title="Inward">
                                    <Undo2 className="h-3.5 w-3.5" />
                                    Inward
                                  </Button>
                                  <Button size="sm" variant="outline" className={cn('h-7 gap-1 text-xs', MOVEMENT_TYPES.received.btnClass)} onClick={() => setDialog({ component: c, type: 'received' })} title="Received">
                                    <PackagePlus className="h-3.5 w-3.5" />
                                    Received
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                  }
                </TableBody>
              </Table>
              {!loadingComponents && filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No components found.</div>
              )}
            </div>
          </>
        )}

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead className="hidden md:table-cell">System</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="hidden sm:table-cell">Notes</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMovements
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : movements?.map(m => {
                      const cfg = MOVEMENT_TYPES[m.type] || MOVEMENT_TYPES.out;
                      return (
                        <TableRow key={m.id}>
                          <TableCell><MovementBadge type={m.type} /></TableCell>
                          <TableCell className="text-sm max-w-[180px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="line-clamp-1">{m.implant_components?.name || '—'}</span>
                              {m.implant_components?.category === 'screw' && (
                                <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold bg-violet-50 text-violet-700 border-violet-200">Screw</span>
                              )}
                            </div>
                            <CopyableCode code={m.implant_components?.component_code} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {m.implant_components?.system && (() => {
                              const { className: hSysClass, style: hSysStyle } = getSystemStyle(m.implant_components.system, settings.systemColors);
                              return (
                                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', hSysClass)} style={hSysStyle}>
                                  {m.implant_components.system}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <span className={cn('font-bold text-sm', cfg.color)}>
                              {cfg.noStockImpact ? m.quantity : `${cfg.sign}${m.quantity}`}
                            </span>
                            {cfg.noStockImpact && <span className="text-xs text-muted-foreground ml-1">log</span>}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[200px]">
                            <span className="line-clamp-1">{m.notes || '—'}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(m.created_at), 'dd MMM yyyy, h:mm a')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                }
              </TableBody>
            </Table>
            {!loadingMovements && !movements?.length && (
              <EmptyState icon={History} title="No movements yet" description="Use the Inventory tab to log outward, inward, and received events." />
            )}
          </div>
        )}
      </div>

      <ComponentDetailModal
        component={selectedComponent}
        open={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        isAdmin={canLogStock}
        onAction={(type) => { setDialog({ component: selectedComponent, type }); setSelectedComponent(null); }}
      />

      {dialog && (
        <StockDialog component={dialog.component} type={dialog.type} open={!!dialog} onClose={() => setDialog(null)} />
      )}
    </Layout>
  );
}
