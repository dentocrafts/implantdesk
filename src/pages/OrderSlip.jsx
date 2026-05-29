import { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Printer, Search, FileText, RotateCcw, LayoutGrid, ClipboardList, X, MessageSquare, Check, Trash2, AlertTriangle, Truck } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import DentalPlaceholder from '@/components/common/DentalPlaceholder';
import CopyableCode from '@/components/common/CopyableCode';
import { useComponents } from '@/hooks/useComponents';
import { useDispatchStock } from '@/hooks/useStock';
import { useDispatchNote } from '@/context/DispatchContext';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getSystemStyle, cn, formatCurrency, getStockStatus, copyToClipboard, toTitleCase } from '@/lib/utils';
import { toast } from 'sonner';

function SlipNumber() {
  const now = new Date();
  return `DC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

// ── Component detail modal (dispatch version) ─────────────────────────
function DispatchComponentModal({ component, open, onClose, onAdd, currentQty }) {
  const [qty, setQty] = useState(1);
  const { settings } = useSettings();
  const { canViewPricing } = usePermissions();
  if (!component) return null;
  const stock = getStockStatus(component.stock_qty);
  const { className: sysClass, style: sysStyle } = getSystemStyle(component.system, settings.systemColors);

  function handleAdd() {
    onAdd(component, qty);
    setQty(1);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Image */}
        <div className="w-full h-44 bg-muted overflow-hidden">
          {component.image_url
            ? <img src={component.image_url} alt={component.name} className="w-full h-full object-cover" />
            : <DentalPlaceholder />
          }
        </div>

        <div className="p-5 space-y-4">
          {/* Name + badges */}
          <div>
            <h2 className="text-lg font-bold leading-tight">{component.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', sysClass)} style={sysStyle}>
                {component.system}
              </span>
              <Badge variant={stock.variant} className="text-xs">{stock.label}</Badge>
            </div>
          </div>

          {/* Stats row */}
          <div className={cn('divide-x divide-border rounded-lg border border-border text-center', canViewPricing ? 'grid grid-cols-3' : 'grid grid-cols-2')}>
            {canViewPricing && (
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
              <CopyableCode code={component.component_code} className="justify-center text-xs font-semibold" />
            </div>
          </div>

          {/* Add to dispatch */}
          <div className="flex items-center gap-3 pt-1">
            {/* Qty picker */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-base font-bold">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button onClick={handleAdd} className="flex-1 gap-2 h-9">
              <Plus className="h-4 w-4" />
              Add to Dispatch
              {currentQty > 0 && (
                <span className="ml-1 text-primary-foreground/70 text-xs">({currentQty} already)</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Compact catalog card ───────────────────────────────────────────────
function CatalogCard({ component, onAdd, onViewDetail, dispatchQty }) {
  const { settings } = useSettings();
  const { className: sysClass, style: sysStyle } = getSystemStyle(component.system, settings.systemColors);
  const isOos = component.stock_qty === 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 p-2 rounded-lg border bg-card hover:border-primary/30 hover:bg-accent/30 transition-colors cursor-pointer',
        isOos ? 'border-destructive/30' : 'border-border',
      )}
      onClick={() => onViewDetail(component)}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-muted">
        {component.image_url
          ? <img src={component.image_url} alt="" className="w-full h-full object-cover" />
          : <DentalPlaceholder />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold line-clamp-1 leading-tight">{component.name}</div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4', sysClass)} style={sysStyle}>
            {component.system}
          </span>
          {component.category === 'screw' && (
            <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4 bg-violet-50 text-violet-700 border-violet-200">
              Screw
            </span>
          )}
          <span onClick={e => e.stopPropagation()}>
            <CopyableCode code={component.component_code} className="text-[10px]" />
          </span>
        </div>
        {/* Stock count */}
        <div className="mt-0.5">
          {isOos
            ? <span className="text-[10px] font-medium text-destructive">Out of Stock</span>
            : <span className="text-[10px] text-muted-foreground">{component.stock_qty} in stock</span>}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={e => { e.stopPropagation(); onAdd(component); }}
        className={cn(
          'shrink-0 flex items-center gap-1 rounded-md px-2 h-7 text-xs font-semibold transition-colors',
          isOos
            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            : dispatchQty > 0
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        <Plus className="h-3 w-3" />
        {dispatchQty > 0 ? dispatchQty : 'Add'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function OrderSlip() {
  const { caseId, setCaseId, doctorName, setDoctorName, patientName, setPatientName, notes, setNotes, items, addItem, removeItem, updateQty, clearDispatch } = useDispatchNote();
  const { settings } = useSettings();
  const { canViewPricing, canPrintDispatch } = usePermissions();
  const [search,           setSearch]          = useState('');
  const [slipNo]                               = useState(SlipNumber);
  const [mobileView,       setMobileView]      = useState('catalog');
  const [detailComponent,  setDetailComponent] = useState(null);
  const [waCopied,         setWaCopied]        = useState(false);
  const [selectedItems,      setSelectedItems]      = useState(new Set());
  const [outOfStockTarget,   setOutOfStockTarget]   = useState(null);
  const [confirmingDispatch, setConfirmingDispatch] = useState(false);
  const [showNotes,          setShowNotes]          = useState(false);

  // Auto-collapse notes field when notes is cleared (e.g. after dispatch)
  useEffect(() => { if (!notes) setShowNotes(false); }, [notes]);
  const dispatchStock = useDispatchStock();
  // outOfStockTarget: null | { component, qty }

  // ── Drag-select refs for the dispatch items list ─────────────────────
  const listRef              = useRef(null); // the scrollable items container
  const isDragging           = useRef(false);
  const dragStartIndex       = useRef(null);
  const dragStartValue       = useRef(true);
  const dragOriginalSelected = useRef(null);
  const mouseYRef            = useRef(0);
  const scrollRafRef         = useRef(null);
  const itemsRef             = useRef([]);

  useEffect(() => { itemsRef.current = items; }, [items]);
  // Clear selection when items list changes size (item removed etc.)
  useEffect(() => {
    setSelectedItems(prev => {
      const ids = new Set(items.map(i => i.id));
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  // ── Drag mouse listeners (scroll within listRef container) ──────────
  useEffect(() => {
    const ZONE = 60, MAX_SPEED = 10;
    function containerSpeed(y) {
      const el = listRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const relY = y - rect.top;
      if (relY < ZONE) return -Math.ceil(MAX_SPEED * (1 - relY / ZONE));
      const fromBottom = rect.height - relY;
      if (fromBottom < ZONE) return Math.ceil(MAX_SPEED * (1 - fromBottom / ZONE));
      return 0;
    }
    function rowAt(x, y) {
      const el  = document.elementFromPoint(x, y);
      const row = el?.closest('[data-item-index]');
      return row ? Number(row.dataset.itemIndex) : null;
    }
    function applyAt(idx) {
      if (!isDragging.current || dragStartIndex.current === null) return;
      const items = itemsRef.current;
      const orig  = dragOriginalSelected.current;
      if (!orig) return;
      const lo = Math.min(dragStartIndex.current, idx);
      const hi = Math.max(dragStartIndex.current, idx);
      setSelectedItems(() => {
        const next = new Set(orig);
        for (let i = lo; i <= hi; i++) {
          if (!items[i]) continue;
          dragStartValue.current ? next.add(items[i].id) : next.delete(items[i].id);
        }
        return next;
      });
    }
    function frame() {
      if (!isDragging.current) { scrollRafRef.current = null; return; }
      const s = containerSpeed(mouseYRef.current);
      if (s !== 0 && listRef.current) {
        listRef.current.scrollTop += s;
        const idx = rowAt(window.innerWidth / 2, mouseYRef.current); // approx x centre
        if (idx !== null) applyAt(idx);
      }
      scrollRafRef.current = requestAnimationFrame(frame);
    }
    function onMove(e) {
      mouseYRef.current = e.clientY;
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

  function handleItemMouseDown(e, idx) {
    if (e.button !== 0) return;
    e.preventDefault();
    const id = items[idx].id;
    dragOriginalSelected.current = new Set(selectedItems);
    isDragging.current     = true;
    dragStartIndex.current = idx;
    dragStartValue.current = !selectedItems.has(id);
    // apply immediately
    const orig = new Set(selectedItems);
    setSelectedItems(() => {
      const next = new Set(orig);
      selectedItems.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedItemCount  = items.filter(i => selectedItems.has(i.id)).length;
  const allItemsSelected   = items.length > 0 && selectedItemCount === items.length;
  const someItemsSelected  = selectedItemCount > 0 && !allItemsSelected;

  function toggleAllItems() {
    setSelectedItems(allItemsSelected ? new Set() : new Set(items.map(i => i.id)));
  }
  function clearItemSelection() { setSelectedItems(new Set()); }

  function handleRemoveSelected() {
    const ids = [...selectedItems];
    ids.forEach(id => removeItem(id));
    clearItemSelection();
    toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} removed`);
  }

  const { data: components = [] } = useComponents({});

  const filtered = search.trim().length > 0
    ? components.filter(c => {
        const q      = search.trim().toLowerCase();
        const numStr = q.replace(/mm$/i, '').trim();
        const num    = parseFloat(numStr);
        const isNum  = numStr !== '' && !isNaN(num) && isFinite(num);
        return (
          c.name.toLowerCase().includes(q) ||
          c.component_code?.toLowerCase().includes(q) ||
          c.manufacturer_code?.toLowerCase().includes(q) ||
          (isNum && (c.gingival_height_mm == num || c.platform_diameter == num))
        );
      })
    : components;

  function handleAdd(component, qty = 1) {
    if (component.stock_qty === 0) {
      setOutOfStockTarget({ component, qty });
      return;
    }
    addItem(component, qty);
    toast.success('Added to dispatch', { description: component.name, duration: 1500 });
  }

  function confirmAddOutOfStock() {
    if (!outOfStockTarget) return;
    addItem(outOfStockTarget.component, outOfStockTarget.qty);
    toast.success('Added to dispatch', { description: outOfStockTarget.component.name, duration: 1500 });
    setOutOfStockTarget(null);
  }

  async function handleConfirmDispatch() {
    try {
      await dispatchStock.mutateAsync({ items, caseId, doctorName, patientName, notes });
      const count = items.length;
      clearDispatch();
      setConfirmingDispatch(false);
      toast.success('Dispatched!', {
        description: `${count} component${count !== 1 ? 's' : ''} dispatched. Stock updated.`,
        duration: 3000,
      });
    } catch (err) {
      toast.error('Dispatch failed', { description: err.message, duration: 4000 });
    }
  }

  function getDispatchQty(id) {
    return items.find(i => i.id === id)?.qty ?? 0;
  }

  async function handleCopyWhatsApp() {
    const wf = settings.waFields ?? {};
    const lines = [];
    if (wf.caseId      !== false)                              lines.push(`*Case ID:* ${caseId || '—'}`);
    if (wf.doctorName  !== false && doctorName.trim())        lines.push(`*Doctor:* Dr. ${doctorName.trim()}`);
    if (wf.patientName !== false && patientName.trim())       lines.push(`*Patient:* ${patientName.trim()}`);
    if (wf.notes       !== false && notes.trim())             lines.push(`*Notes:* ${notes.trim()}`);
    lines.push('');
    lines.push('*Components:*');
    items.forEach(item => {
      const code = wf.componentCode !== false ? ` (${item.component_code})` : '';
      lines.push(`• ${item.name}${code} × ${item.qty}`);
    });
    if (wf.status !== false) {
      lines.push('');
      lines.push(`*Status:* ${settings.waStatusText}`);
    }

    const message = lines.join('\n');
    try {
      await copyToClipboard(message);
      setWaCopied(true);
      toast.success('WhatsApp message copied!', { description: 'Paste it directly into your chat.', duration: 2500 });
      setTimeout(() => setWaCopied(false), 2500);
    } catch (err) {
      toast.error('Could not copy automatically', { description: 'Please copy the text from the box below.', duration: 4000 });
      prompt('Copy this WhatsApp message:', message);
    }
  }

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ── Screen UI ── */}
      <Layout>
        <div className="print:hidden">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold">Dispatch Note</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">Browse catalog and build a printable slip</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearDispatch} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWhatsApp}
                disabled={!items.length}
                className={cn('gap-1.5', waCopied ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-green-700 border-green-300 hover:bg-green-50')}
              >
                {waCopied
                  ? <Check className="h-3.5 w-3.5" />
                  : <MessageSquare className="h-3.5 w-3.5" />
                }
                {waCopied ? 'Copied!' : 'Copy for WhatsApp'}
              </Button>
              {items.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setConfirmingDispatch(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Dispatch
                </Button>
              )}
              {canPrintDispatch && (
                <Button onClick={() => window.print()} disabled={!items.length} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print / Save PDF
                </Button>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden gap-1 p-1 bg-muted rounded-lg mb-4">
            <button
              onClick={() => setMobileView('catalog')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                mobileView === 'catalog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Catalog
            </button>
            <button
              onClick={() => setMobileView('slip')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                mobileView === 'slip' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Slip
              {items.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {items.length > 9 ? '9+' : items.length}
                </span>
              )}
            </button>
          </div>

          {/* Two-panel layout */}
          <div className="flex gap-5 items-start">

            {/* ── LEFT: Catalog browser ── */}
            <div className={cn('flex-1 min-w-0 flex flex-col gap-3', mobileView !== 'catalog' && 'hidden md:flex')}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, code, or size — e.g. 4.5 or 2mm…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {filtered.length === components.length
                  ? `${components.length} components`
                  : `${filtered.length} of ${components.length} components`}
              </div>

              <div className="flex flex-col gap-1.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {filtered.length > 0
                  ? filtered.map(c => (
                      <CatalogCard
                        key={c.id}
                        component={c}
                        onAdd={handleAdd}
                        onViewDetail={setDetailComponent}
                        dispatchQty={getDispatchQty(c.id)}
                      />
                    ))
                  : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No components match your search.
                    </div>
                  )
                }
              </div>
            </div>

            {/* ── RIGHT: Dispatch slip builder ── */}
            <div className={cn('w-full md:w-[380px] shrink-0 flex flex-col gap-3', mobileView !== 'slip' && 'hidden md:flex')}>

              {/* Case info */}
              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <div className="space-y-1.5">
                  <Label>Case ID *</Label>
                  <Input value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="e.g. SSAA452015AH" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Doctor Name</Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-medium text-muted-foreground pointer-events-none select-none">Dr.</span>
                      <Input value={doctorName} onChange={e => setDoctorName(toTitleCase(e.target.value))} placeholder="Smith" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Patient Name</Label>
                    <Input value={patientName} onChange={e => setPatientName(toTitleCase(e.target.value))} placeholder="John Doe" />
                  </div>
                </div>
                {/* Notes — collapsed by default */}
                {(showNotes || notes) ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Instructions / Notes</Label>
                      {!notes && (
                        <button type="button" onClick={() => setShowNotes(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Please arrange pickup" className="text-sm" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNotes(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add instructions / notes
                  </button>
                )}
              </div>

              {/* Items list */}
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Header row with select-all */}
                <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {items.length > 0 && (
                      <Checkbox
                        checked={allItemsSelected ? true : someItemsSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAllItems}
                        aria-label="Select all items"
                      />
                    )}
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Components</span>
                  </div>
                  {items.length > 0 && (
                    <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Batch action bar */}
                {selectedItemCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border">
                    <span className="text-xs font-medium mr-auto">
                      {selectedItemCount} item{selectedItemCount > 1 ? 's' : ''} selected
                    </span>
                    <button onClick={clearItemSelection} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors" title="Clear">
                      <X className="h-3 w-3" />
                    </button>
                    <Button variant="destructive" size="sm" className="h-6 gap-1 text-xs px-2" onClick={handleRemoveSelected}>
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                )}

                {items.length > 0 ? (
                  <div ref={listRef} className="divide-y divide-border max-h-[calc(100vh-400px)] overflow-y-auto">
                    {items.map((item, idx) => {
                      const isChecked = selectedItems.has(item.id);
                      return (
                        <div
                          key={item.id}
                          data-item-index={idx}
                          className={cn('flex items-center gap-2 px-3 py-2 select-none', isChecked && 'bg-muted/40')}
                          onMouseEnter={() => {
                            if (isDragging.current && dragStartIndex.current !== null) {
                              const orig = dragOriginalSelected.current;
                              if (!orig) return;
                              const lo = Math.min(dragStartIndex.current, idx);
                              const hi = Math.max(dragStartIndex.current, idx);
                              setSelectedItems(() => {
                                const next = new Set(orig);
                                for (let i = lo; i <= hi; i++) {
                                  if (!items[i]) continue;
                                  dragStartValue.current ? next.add(items[i].id) : next.delete(items[i].id);
                                }
                                return next;
                              });
                            }
                          }}
                        >
                          {/* Checkbox — drag starts here */}
                          <div
                            className="cursor-pointer shrink-0"
                            onMouseDown={e => handleItemMouseDown(e, idx)}
                          >
                            <Checkbox checked={isChecked} className="pointer-events-none" />
                          </div>

                          <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-muted">
                            {item.image_url
                              ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                              : <DentalPlaceholder />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium line-clamp-1">{item.name}</div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <CopyableCode code={item.component_code} className="text-[10px]" />
                              <span className={cn(
                                'text-[10px]',
                                item.stock_qty === 0 ? 'text-destructive font-medium' : 'text-muted-foreground'
                              )}>
                                · {item.stock_qty === 0 ? 'No stock' : `${item.stock_qty} in stock`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-5 h-5 flex items-center justify-center rounded border border-border hover:bg-accent text-xs font-bold">−</button>
                            <span className="w-5 text-center text-xs font-semibold">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-5 h-5 flex items-center justify-center rounded border border-border hover:bg-accent text-xs font-bold">+</button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <FileText className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Pick components from the catalog →</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </Layout>

      {/* ── Confirm Dispatch dialog ── */}
      <Dialog open={confirmingDispatch} onOpenChange={v => { if (!v) setConfirmingDispatch(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0" />
              Confirm Dispatch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {(caseId || doctorName || patientName) && (
              <div className="text-sm space-y-0.5">
                {caseId      && <p><span className="text-muted-foreground">Case:</span>    <strong>{caseId}</strong></p>}
                {doctorName  && <p><span className="text-muted-foreground">Doctor:</span>  <strong>Dr. {doctorName}</strong></p>}
                {patientName && <p><span className="text-muted-foreground">Patient:</span> <strong>{patientName}</strong></p>}
              </div>
            )}
            <div className="rounded-md border border-border divide-y divide-border max-h-52 overflow-y-auto text-xs">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="font-medium line-clamp-1 flex-1 min-w-0">{item.name}</span>
                  <span className="shrink-0 font-semibold">× {item.qty}</span>
                  <span className={cn('shrink-0', item.stock_qty === 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    ({item.stock_qty} in stock)
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Stock quantities will be reduced by the dispatched amounts. This cannot be undone automatically.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmingDispatch(false)} disabled={dispatchStock.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDispatch}
              disabled={dispatchStock.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Truck className="h-3.5 w-3.5" />
              {dispatchStock.isPending ? 'Dispatching…' : 'Dispatch & Deduct Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Out of Stock disclaimer dialog ── */}
      <Dialog open={!!outOfStockTarget} onOpenChange={v => { if (!v) setOutOfStockTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              Out of Stock
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <p className="text-sm">
              <strong>{outOfStockTarget?.component.name}</strong> currently has <strong>no stock</strong> in inventory.
            </p>
            <p className="text-xs text-muted-foreground">
              You can still add it to the dispatch slip, but please verify availability before dispatching.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOutOfStockTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={confirmAddOutOfStock}>Add Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Component detail modal ── */}
      <DispatchComponentModal
        component={detailComponent}
        open={!!detailComponent}
        onClose={() => setDetailComponent(null)}
        onAdd={handleAdd}
        currentQty={detailComponent ? getDispatchQty(detailComponent.id) : 0}
      />

      {/* ── Print-only Dispatch Slip ── */}
      <div className="hidden print:block slip-print">
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '700px', margin: '0 auto', padding: '24px', color: '#111' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #16a34a', paddingBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.labName}
                    style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                ) : (
                  <div style={{ width: '28px', height: '28px', background: '#16a34a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                )}
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{settings.labName}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>{settings.labTagline}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>DISPATCH NOTE</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Slip No: <strong>{slipNo}</strong></div>
              <div style={{ fontSize: '11px', color: '#666' }}>Date: <strong>{today}</strong></div>
            </div>
          </div>

          {/* Case info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '20px', background: '#f0fdf4', borderRadius: '8px', padding: '14px', border: '1px solid #bbf7d0' }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#16a34a', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '2px' }}>Case ID</div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{caseId || '—'}</div>
            </div>
            {doctorName && (
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#16a34a', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '2px' }}>Doctor</div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Dr. {doctorName}</div>
              </div>
            )}
            {patientName && (
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#16a34a', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '2px' }}>Patient</div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{patientName}</div>
              </div>
            )}
            {notes && (
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#16a34a', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '2px' }}>Instructions</div>
                <div style={{ fontSize: '13px' }}>{notes}</div>
              </div>
            )}
          </div>

          {/* Components table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#16a34a', color: 'white' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', width: '52px' }}>Image</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600' }}>Component Name</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', width: '160px' }}>Component Code</th>
                {canViewPricing && (
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: '600', width: '80px' }}>Price</th>
                )}
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: '600', width: '60px' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      {item.image_url
                        ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                            <rect width="120" height="120" fill="hsl(142 30% 96%)" />
                            <rect x="52" y="20" width="16" height="50" rx="3" fill="hsl(142 40% 78%)" />
                            <rect x="50" y="20" width="20" height="8" rx="2" fill="hsl(142 50% 68%)" />
                            <rect x="48" y="65" width="24" height="6" rx="1" fill="hsl(142 40% 72%)" />
                            <rect x="52" y="30" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
                            <rect x="52" y="35" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
                            <rect x="52" y="40" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
                            <rect x="52" y="45" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
                            <rect x="52" y="50" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
                            <rect x="52" y="55" width="16" height="1.5" rx="0.5" fill="hsl(142 30% 88%)" />
                            <path d="M42 80 Q60 72 78 80 L75 100 Q60 108 45 100 Z" fill="hsl(142 40% 72%)" stroke="hsl(142 50% 62%)" strokeWidth="1" />
                          </svg>
                      }
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', fontFamily: 'monospace', color: '#374151' }}>{item.component_code}</td>
                  {canViewPricing && (
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>{formatCurrency(item.price)}</td>
                  )}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '15px', fontWeight: '700', color: '#16a34a' }}>{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer / Signature */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '28px' }}>Dispatched by</div>
              <div style={{ borderBottom: '1px solid #999', width: '180px' }}></div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>Signature</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '28px' }}>Received by</div>
              <div style={{ borderBottom: '1px solid #999', width: '180px' }}></div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>Signature &amp; Date</div>
            </div>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
            Generated by {settings.labName} · {today}
          </div>
        </div>
      </div>
    </>
  );
}
