import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, FileSpreadsheet, Download, X } from 'lucide-react';
import ScrewIcon from '@/components/common/ScrewIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import ComponentForm from './ComponentForm';
import ImportExcel from './ImportExcel';
import {
  useAllComponents, useCreateComponent, useUpdateComponent,
  useDeleteComponent, useDeleteComponents, useUpdateComponents,
} from '@/hooks/useComponents';
import { formatCurrency, SYSTEM_COLORS, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ComponentManager() {
  const { data: components, isLoading } = useAllComponents();
  const createComponent  = useCreateComponent();
  const updateComponent  = useUpdateComponent();
  const deleteComponent  = useDeleteComponent();
  const deleteComponents = useDeleteComponents();
  const updateComponents = useUpdateComponents();

  const [search,         setSearch]         = useState('');
  const [formOpen,       setFormOpen]       = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [importOpen,     setImportOpen]     = useState(false);
  const [activeCategory, setActiveCategory] = useState('component');
  const [selected,       setSelected]       = useState(new Set());

  // ── Drag-select + auto-scroll refs ─────────────────────────────────────
  const isDragging      = useRef(false);
  const dragStartIndex  = useRef(null);
  const dragStartValue  = useRef(true);   // true = selecting, false = deselecting
  const mouseXRef       = useRef(0);
  const mouseYRef       = useRef(0);
  const scrollRafRef    = useRef(null);
  const filteredRef     = useRef([]);     // always-current snapshot of filtered

  // ── Derived values ─────────────────────────────────────────────────────
  const isScrew = activeCategory === 'screw';
  const noun    = isScrew ? 'screw' : 'component';

  const filtered = (components ?? []).filter(c =>
    (c.category ?? 'component') === activeCategory &&
    (!search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.component_code?.toLowerCase().includes(search.toLowerCase()))
  );

  // Keep filteredRef in sync on every render (no dep array needed)
  useEffect(() => { filteredRef.current = filtered; });

  const visibleSelected = filtered.filter(c => selected.has(c.id));
  const selectedCount   = visibleSelected.length;
  const allSelected     = filtered.length > 0 && selectedCount === filtered.length;
  const someSelected    = selectedCount > 0 && !allSelected;

  // ── Core drag selection logic (uses ref so rAF can call it safely) ─────
  function applyDragAt(idx) {
    if (!isDragging.current || dragStartIndex.current === null) return;
    const f  = filteredRef.current;
    const lo = Math.min(dragStartIndex.current, idx);
    const hi = Math.max(dragStartIndex.current, idx);
    setSelected(prev => {
      const next = new Set(prev);
      for (let i = lo; i <= hi; i++) {
        if (!f[i]) continue;
        dragStartValue.current ? next.add(f[i].id) : next.delete(f[i].id);
      }
      return next;
    });
  }

  // ── Global mouse listeners: track position, handle auto-scroll, stop drag
  useEffect(() => {
    const ZONE      = 80;   // px from viewport edge that triggers scroll
    const MAX_SPEED = 14;   // px scrolled per frame at maximum proximity

    function getScrollSpeed(y) {
      if (y < ZONE) return -Math.ceil(MAX_SPEED * (1 - y / ZONE));
      const fromBottom = window.innerHeight - y;
      if (fromBottom < ZONE) return Math.ceil(MAX_SPEED * (1 - fromBottom / ZONE));
      return 0;
    }

    function rowIdxAtPoint(x, y) {
      const el  = document.elementFromPoint(x, y);
      const row = el?.closest('[data-row-index]');
      return row ? Number(row.dataset.rowIndex) : null;
    }

    function scrollFrame() {
      if (!isDragging.current) { scrollRafRef.current = null; return; }

      const speed = getScrollSpeed(mouseYRef.current);
      if (speed !== 0) {
        window.scrollBy(0, speed);
        // After scrolling, extend selection to whatever row is under the cursor
        const idx = rowIdxAtPoint(mouseXRef.current, mouseYRef.current);
        if (idx !== null) applyDragAt(idx);
      }
      scrollRafRef.current = requestAnimationFrame(scrollFrame);
    }

    function onMouseMove(e) {
      mouseXRef.current = e.clientX;
      mouseYRef.current = e.clientY;
      if (!isDragging.current) return;
      // Kick off the rAF scroll loop if not already running
      if (!scrollRafRef.current) {
        scrollRafRef.current = requestAnimationFrame(scrollFrame);
      }
    }

    function onMouseUp() {
      isDragging.current = false;
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []); // refs only — no stale-closure risk

  // ── Selection helpers ──────────────────────────────────────────────────
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map(c => c.id)));
  }

  function clearSelection() { setSelected(new Set()); }

  function switchCategory(cat) { setActiveCategory(cat); setSelected(new Set()); }

  // Starts a drag from the checkbox cell
  function handleCheckboxMouseDown(e, idx) {
    if (e.button !== 0) return;
    e.preventDefault(); // prevent text-selection cursor

    const id         = filtered[idx].id;
    const wasChecked = selected.has(id);

    isDragging.current     = true;
    dragStartIndex.current = idx;
    dragStartValue.current = !wasChecked;

    // Toggle the clicked row immediately
    setSelected(prev => {
      const next = new Set(prev);
      wasChecked ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Extends selection as the mouse sweeps over rows (normal mouse movement)
  function handleRowMouseEnter(idx) {
    applyDragAt(idx);
  }

  // ── Single-item actions ────────────────────────────────────────────────
  async function handleSave(payload) {
    if (editing) {
      await updateComponent.mutateAsync({ id: editing.id, ...payload });
      toast.success(`${isScrew ? 'Screw' : 'Component'} updated`);
    } else {
      await createComponent.mutateAsync(payload);
      toast.success(`${isScrew ? 'Screw' : 'Component'} created`);
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleToggleActive(c) {
    await updateComponent.mutateAsync({ id: c.id, is_active: !c.is_active });
    toast.success(`${c.name} ${!c.is_active ? 'activated' : 'deactivated'}`);
  }

  async function handleDelete(c) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    await deleteComponent.mutateAsync(c.id);
    setSelected(prev => { const n = new Set(prev); n.delete(c.id); return n; });
    toast.success(`${isScrew ? 'Screw' : 'Component'} deleted`);
  }

  async function handleStockChange(id, qty) {
    await updateComponent.mutateAsync({ id, stock_qty: Number(qty) });
  }

  // ── Batch actions ──────────────────────────────────────────────────────
  async function handleBatchActivate() {
    const ids = visibleSelected.map(c => c.id);
    await updateComponents.mutateAsync({ ids, updates: { is_active: true } });
    clearSelection();
    toast.success(`${ids.length} ${noun}${ids.length > 1 ? 's' : ''} activated`);
  }

  async function handleBatchDeactivate() {
    const ids = visibleSelected.map(c => c.id);
    await updateComponents.mutateAsync({ ids, updates: { is_active: false } });
    clearSelection();
    toast.success(`${ids.length} ${noun}${ids.length > 1 ? 's' : ''} deactivated`);
  }

  function handleBatchExport() {
    const headers = ['Name', 'System', 'Type', 'Code', 'Price', 'Stock', 'Status'];
    const rows = visibleSelected.map(c => [
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      c.system         ?? '',
      c.abutment_type  ?? '',
      c.component_code ?? '',
      c.price          ?? 0,
      c.stock_qty      ?? 0,
      c.is_active ? 'Active' : 'Hidden',
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `implantdesk-${noun}s-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedCount} ${noun}${selectedCount > 1 ? 's' : ''} exported`);
  }

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selectedCount} ${noun}${selectedCount > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const ids = visibleSelected.map(c => c.id);
    await deleteComponents.mutateAsync(ids);
    clearSelection();
    toast.success(`${ids.length} ${noun}${ids.length > 1 ? 's' : ''} deleted`);
  }

  const batchBusy = deleteComponents.isPending || updateComponents.isPending;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Category tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { cat: 'component', label: 'Components' },
          { cat: 'screw',     label: 'Screws', icon: true },
        ].map(({ cat, label, icon }) => (
          <button
            key={cat}
            onClick={() => switchCategory(cat)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeCategory === cat
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {icon && <ScrewIcon className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder={`Search ${isScrew ? 'screws' : 'components'}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5 flex-1 sm:flex-none">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Add {isScrew ? 'Screw' : 'Component'}
          </Button>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
          <div className="flex items-center gap-1.5 mr-auto">
            <span className="text-sm font-medium">
              {selectedCount} {noun}{selectedCount > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleBatchActivate}   disabled={batchBusy}>
            <ToggleRight className="h-3.5 w-3.5 text-primary" />
            Activate
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleBatchDeactivate} disabled={batchBusy}>
            <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
            Deactivate
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleBatchExport}     disabled={batchBusy}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="destructive" size="sm" className="gap-1.5 h-8" onClick={handleBatchDelete} disabled={batchBusy}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[640px]">
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
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">Code</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.map((c, idx) => {
                  const systemColor = SYSTEM_COLORS[c.system] || '';
                  const isChecked   = selected.has(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      data-row-index={idx}
                      className={cn('select-none', isChecked && 'bg-muted/40')}
                      onMouseEnter={() => handleRowMouseEnter(idx)}
                    >
                      {/* Checkbox cell — mousedown starts the drag */}
                      <TableCell
                        className="w-10 pr-0 cursor-pointer"
                        onMouseDown={e => handleCheckboxMouseDown(e, idx)}
                      >
                        <Checkbox
                          checked={isChecked}
                          className="pointer-events-none"
                          aria-label={`Select ${c.name}`}
                        />
                      </TableCell>

                      <TableCell className="font-medium max-w-[180px]">
                        <span className="line-clamp-1 text-sm">{c.name}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', systemColor)}>
                          {c.system}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {c.abutment_type || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                        {c.component_code}
                      </TableCell>
                      <TableCell className="text-primary font-medium text-sm">
                        {formatCurrency(c.price)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          defaultValue={c.stock_qty}
                          className="h-7 w-16 text-xs"
                          onBlur={e => handleStockChange(c.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? 'success' : 'secondary'} className="text-xs">
                          {c.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => handleToggleActive(c)}
                            title={c.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {c.is_active
                              ? <ToggleRight className="h-4 w-4 text-primary" />
                              : <ToggleLeft  className="h-4 w-4 text-muted-foreground" />
                            }
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditing(c); setFormOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
        {!isLoading && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No components found.</div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit ${isScrew ? 'Screw' : 'Component'}`
                : `Add New ${isScrew ? 'Screw' : 'Component'}`}
            </DialogTitle>
          </DialogHeader>
          <ComponentForm
            component={editing}
            category={activeCategory}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      <ImportExcel open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
