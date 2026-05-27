import { useState } from 'react';
import { ArrowUpRight, Undo2, PackagePlus, SlidersHorizontal, History } from 'lucide-react';
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
import { formatCurrency, getStockStatus, SYSTEM_COLORS, cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const logMovement = useLogStockMovement();
  const cfg = MOVEMENT_TYPES[type] || MOVEMENT_TYPES.out;
  const Icon = cfg.icon;

  if (!component) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!qty || qty <= 0) return;
    try {
      await logMovement.mutateAsync({
        component_id: component.id,
        type,
        quantity: Number(qty),
        notes,
        current_stock: component.stock_qty,
      });
      toast.success(`${cfg.label}: ${cfg.sign}${qty} × ${component.name}`);
      setQty(1);
      setNotes('');
      onClose();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder={cfg.notesPlaceholder}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
  const sysColor = SYSTEM_COLORS[component.system] || '';

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
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', sysColor)}>
                {component.system}
              </span>
              <Badge variant={stock.variant} className="text-xs">{stock.label}</Badge>
            </div>
          </div>

          {/* Stats row */}
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

          {/* Action buttons — admin only */}
          {isAdmin ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                variant="outline"
                className={cn('flex-col h-auto py-3 gap-1.5', MOVEMENT_TYPES.out.btnClass)}
                disabled={component.stock_qty === 0}
                onClick={() => onAction('out')}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs font-semibold">Outward</span>
              </Button>
              <Button
                variant="outline"
                className={cn('flex-col h-auto py-3 gap-1.5', MOVEMENT_TYPES.in.btnClass)}
                onClick={() => onAction('in')}
              >
                <Undo2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Inward</span>
              </Button>
              <Button
                variant="outline"
                className={cn('flex-col h-auto py-3 gap-1.5', MOVEMENT_TYPES.received.btnClass)}
                onClick={() => onAction('received')}
              >
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
  const { isAdmin } = useAuth();
  const { canLogStock, canViewHistory } = usePermissions();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null); // { component, type }
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory');

  const filtered = components?.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.system.toLowerCase().includes(search.toLowerCase()) ||
    c.component_code?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Stock Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Outward/Inward affect lab stock · Received is an order log only</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant={activeTab === 'inventory' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('inventory')}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Inventory
            </Button>
            {canViewHistory && (
              <Button
                variant={activeTab === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('history')}
                className="gap-1.5"
              >
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            )}
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
            <Input
              placeholder="Search components…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
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
                  {loadingComponents ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.map(c => {
                    const stock = getStockStatus(c.stock_qty);
                    const sysColor = SYSTEM_COLORS[c.system] || '';
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
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {c.name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold w-fit', sysColor)}>
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
                              <Button
                                size="sm"
                                variant="outline"
                                className={cn('h-7 gap-1 text-xs', MOVEMENT_TYPES.out.btnClass)}
                                onClick={() => setDialog({ component: c, type: 'out' })}
                                disabled={c.stock_qty === 0}
                                title="Outward — sent to doctor"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                Outward
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className={cn('h-7 gap-1 text-xs', MOVEMENT_TYPES.in.btnClass)}
                                onClick={() => setDialog({ component: c, type: 'in' })}
                                title="Inward — returned by doctor"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                                Inward
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className={cn('h-7 gap-1 text-xs', MOVEMENT_TYPES.received.btnClass)}
                                onClick={() => setDialog({ component: c, type: 'received' })}
                                title="Received — new stock from order"
                              >
                                <PackagePlus className="h-3.5 w-3.5" />
                                Received
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
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
                {loadingMovements ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : movements?.map(m => {
                  const cfg = MOVEMENT_TYPES[m.type] || MOVEMENT_TYPES.out;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <MovementBadge type={m.type} />
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="line-clamp-1">{m.implant_components?.name || '—'}</span>
                          {m.implant_components?.category === 'screw' && (
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold bg-violet-50 text-violet-700 border-violet-200">
                              Screw
                            </span>
                          )}
                        </div>
                        <CopyableCode code={m.implant_components?.component_code} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {m.implant_components?.system && (
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', SYSTEM_COLORS[m.implant_components.system] || '')}>
                            {m.implant_components.system}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-bold text-sm', cfg.color)}>
                          {cfg.noStockImpact
                            ? m.quantity
                            : `${cfg.sign}${m.quantity}`}
                        </span>
                        {cfg.noStockImpact && (
                          <span className="text-xs text-muted-foreground ml-1">log</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[200px]">
                        <span className="line-clamp-1">{m.notes || '—'}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.created_at), 'dd MMM yyyy, h:mm a')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {!loadingMovements && !movements?.length && (
              <EmptyState
                icon={History}
                title="No movements yet"
                description="Use the Inventory tab to log outward, inward, and received events."
              />
            )}
          </div>
        )}
      </div>

      {/* Component detail modal */}
      <ComponentDetailModal
        component={selectedComponent}
        open={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        isAdmin={canLogStock}
        onAction={(type) => {
          setDialog({ component: selectedComponent, type });
          setSelectedComponent(null);
        }}
      />

      {/* Movement form dialog */}
      {dialog && (
        <StockDialog
          component={dialog.component}
          type={dialog.type}
          open={!!dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </Layout>
  );
}
