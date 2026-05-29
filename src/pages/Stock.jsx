import { useState } from 'react';
import { ArrowUpRight, Undo2, PackagePlus, SlidersHorizontal, History, X, Plus, AlertTriangle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useAllStockMovements, useLogStockMovement } from '@/hooks/useStock';
import { formatCurrency, getStockStatus, getSystemStyle, cn, toTitleCase } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
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
          <div className="space-y-1.5">
            <Label htmlFor="qty">Quantity *</Label>
            <Input id="qty" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} required autoFocus />
          </div>

          {isStructured ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-caseId">Case ID</Label>
                <Input id="dlg-caseId" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="e.g. SSAA452015AH" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dlg-doctor">Doctor Name</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-medium text-muted-foreground pointer-events-none select-none">Dr.</span>
                    <Input id="dlg-doctor" value={doctorName} onChange={e => setDoctorName(toTitleCase(e.target.value))} placeholder="Smith" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dlg-patient">Patient Name</Label>
                  <Input id="dlg-patient" value={patientName} onChange={e => setPatientName(toTitleCase(e.target.value))} placeholder="John Doe" />
                </div>
              </div>
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
  const { data: movements, isLoading: loadingMovements }   = useAllStockMovements();
  const { canLogStock, canViewHistory } = usePermissions();
  const { settings } = useSettings();

  const [search,            setSearch]            = useState('');
  const [dialog,            setDialog]            = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [activeTab,         setActiveTab]         = useState('inventory');
  // #22 low-stock filter toggle
  const [showLowStockOnly,  setShowLowStockOnly]  = useState(false);

  // #22 Low Stock items count
  const threshold     = settings.lowStockThreshold ?? 5;
  const lowStockItems = (components ?? []).filter(c => c.stock_qty <= threshold);

  const filtered = (components ?? []).filter(c => {
    if (showLowStockOnly) return c.stock_qty <= threshold;
    return (
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.system.toLowerCase().includes(search.toLowerCase()) ||
      c.component_code?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Layout title="Stock">
      <div className="space-y-5">
        {/* Sticky action bar */}
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
                  onChange={e => { setSearch(e.target.value); setShowLowStockOnly(false); }}
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
            {/* #22 Low Stock banner */}
            {!loadingComponents && lowStockItems.length > 0 && (
              <button
                onClick={() => setShowLowStockOnly(v => !v)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border text-left transition-colors',
                  showLowStockOnly
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} {lowStockItems.length === 1 ? 'is' : 'are'} low on stock or out of stock
                </span>
                <span className="ml-auto text-xs underline shrink-0">
                  {showLowStockOnly ? 'Show all' : 'Show only these'}
                </span>
              </button>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
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
                          {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : filtered.map(c => {
                        const stock = getStockStatus(c.stock_qty);
                        const { className: sysClass, style: sysStyle } = getSystemStyle(c.system, settings.systemColors);
                        return (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedComponent(c)}
                          >
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
