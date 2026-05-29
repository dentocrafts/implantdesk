import { useState, useMemo } from 'react';
import { History, Search, Truck, ArrowUpRight, Undo2, PackagePlus, X, Download, Calendar, Clock, Hash, FileText, User, Stethoscope } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import CopyableCode from '@/components/common/CopyableCode';
import EmptyState from '@/components/common/EmptyState';
import { useAllStockMovements } from '@/hooks/useStock';
import { getSystemStyle, cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

// ── Detect / parse dispatch movements ────────────────────────────────
function isDispatch(m) {
  return (
    m.type === 'out' &&
    (m.notes?.startsWith('Case:') || m.notes === 'Dispatched via slip')
  );
}

function parseDispatchInfo(notes) {
  if (!notes) return {};
  const result = {};
  const extras = [];
  notes.split(' · ').forEach(seg => {
    if      (seg.startsWith('Case: '))    result.caseId  = seg.slice(6).trim();
    else if (seg.startsWith('Dr: '))      result.doctor  = seg.slice(4).trim();
    else if (seg.startsWith('Patient: ')) result.patient = seg.slice(9).trim();
    else if (seg.trim())                  extras.push(seg.trim());
  });
  if (extras.length) result.extra = extras.join(' · ');
  return result;
}

// True when notes contain at least one structured field
function hasStructuredNotes(notes) {
  if (!notes) return false;
  return notes.includes('Case: ') || notes.includes('Dr: ') || notes.includes('Patient: ');
}

// ── Movement type display config ──────────────────────────────────────
const TYPE_CFG = {
  dispatch: {
    label: 'Dispatched',
    icon: Truck,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    sign: '-',
    qtyColor: 'text-orange-600',
  },
  out: {
    label: 'Outward',
    icon: ArrowUpRight,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    sign: '-',
    qtyColor: 'text-orange-600',
  },
  in: {
    label: 'Inward',
    icon: Undo2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    sign: '+',
    qtyColor: 'text-blue-600',
  },
  received: {
    label: 'Received',
    icon: PackagePlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    sign: '',
    qtyColor: 'text-emerald-600',
    noStockImpact: true,
  },
};

function cfgFor(m) {
  return TYPE_CFG[isDispatch(m) ? 'dispatch' : m.type] || TYPE_CFG.out;
}

function TypeBadge({ movement }) {
  const cfg = cfgFor(movement);
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border whitespace-nowrap',
      cfg.bg, cfg.border, cfg.color,
    )}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Date grouping ─────────────────────────────────────────────────────
function groupByDate(movements) {
  const groups = new Map();
  movements.forEach(m => {
    const d = new Date(m.created_at);
    const label = isToday(d) ? 'Today'
      : isYesterday(d)       ? 'Yesterday'
      : format(d, 'EEEE, d MMMM yyyy');
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(m);
  });
  return groups;
}

// ── Filter chips ──────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'dispatch', label: 'Dispatched' },
  { key: 'out',      label: 'Outward'    },
  { key: 'in',       label: 'Inward'     },
  { key: 'received', label: 'Received'   },
];

// ── Detail dialog ─────────────────────────────────────────────────────
function MovementDetailDialog({ movement: m, open, onClose }) {
  const { settings } = useSettings();
  if (!m) return null;

  const disp = isDispatch(m);
  const cfg  = cfgFor(m);
  const Icon = cfg.icon;
  const date = new Date(m.created_at);

  const { className: sysClass, style: sysStyle } =
    getSystemStyle(m.implant_components?.system ?? '', settings.systemColors);

  function DetailRow({ icon: RowIcon, label, children }) {
    return (
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <RowIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
          <div className="text-sm">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border',
              cfg.bg, cfg.border, cfg.color,
            )}>
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </span>
            <span className="text-sm font-normal text-muted-foreground">movement</span>
          </DialogTitle>
        </DialogHeader>

        {/* Component block */}
        <div className={cn('rounded-lg border px-3 py-2.5 space-y-1', cfg.bg, cfg.border)}>
          <p className="font-semibold text-sm leading-snug line-clamp-2">
            {m.implant_components?.name || '—'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {m.implant_components?.system && (
              <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4', sysClass)} style={sysStyle}>
                {m.implant_components.system}
              </span>
            )}
            {m.implant_components?.category === 'screw' && (
              <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4 bg-violet-50 text-violet-700 border-violet-200">
                Screw
              </span>
            )}
            <CopyableCode code={m.implant_components?.component_code} className="text-[10px]" />
          </div>
        </div>

        <Separator />

        {/* Details grid */}
        <div className="space-y-3">

          {/* Quantity */}
          <DetailRow icon={Hash} label="Quantity">
            <span className={cn('font-bold', cfg.qtyColor)}>
              {cfg.noStockImpact ? `${m.quantity} units` : `${cfg.sign}${m.quantity} units`}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {cfg.noStockImpact
                ? '(order log — no stock change)'
                : disp
                  ? '(stock reduced via dispatch slip)'
                  : m.type === 'out'
                    ? '(stock reduced)'
                    : '(stock increased)'}
            </span>
          </DetailRow>

          {/* Date & time */}
          <DetailRow icon={Calendar} label="Date">
            <span>{format(date, 'EEEE, d MMMM yyyy')}</span>
          </DetailRow>
          <DetailRow icon={Clock} label="Time">
            <span>{format(date, 'h:mm a')}</span>
            {isToday(date) && (
              <span className="text-xs text-muted-foreground ml-2">
                ({formatDistanceToNow(date, { addSuffix: true })})
              </span>
            )}
          </DetailRow>

          {/* Case / Doctor / Patient — shown for any movement that has them */}
          {m.notes && (() => {
            const parsed = parseDispatchInfo(m.notes);
            const structured = !!(parsed.caseId || parsed.doctor || parsed.patient);
            return (
              <>
                {parsed.caseId  && (
                  <DetailRow icon={FileText} label="Case ID">
                    <span className="font-mono font-semibold">{parsed.caseId}</span>
                  </DetailRow>
                )}
                {parsed.doctor  && (
                  <DetailRow icon={Stethoscope} label="Doctor">
                    <span>Dr. {parsed.doctor}</span>
                  </DetailRow>
                )}
                {parsed.patient && (
                  <DetailRow icon={User} label="Patient">
                    <span>{parsed.patient}</span>
                  </DetailRow>
                )}
                {/* Extra / plain notes */}
                {(parsed.extra || !structured) && (
                  <DetailRow icon={FileText} label="Notes">
                    <span className="text-muted-foreground">{parsed.extra ?? m.notes}</span>
                  </DetailRow>
                )}
              </>
            );
          })()}

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { data: movements, isLoading } = useAllStockMovements();
  const { settings } = useSettings();
  const { canViewHistory } = usePermissions();
  const [search,            setSearch]           = useState('');
  const [typeFilter,        setTypeFilter]       = useState('all');
  const [selectedMovement,  setSelectedMovement] = useState(null);

  const filtered = useMemo(() => {
    if (!movements) return [];
    return movements.filter(m => {
      // Type filter
      if (typeFilter !== 'all') {
        const disp = isDispatch(m);
        if (typeFilter === 'dispatch' && !disp)                    return false;
        if (typeFilter === 'out'      && (m.type !== 'out' || disp)) return false;
        if (typeFilter === 'in'       && m.type !== 'in')           return false;
        if (typeFilter === 'received' && m.type !== 'received')     return false;
      }
      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.implant_components?.name?.toLowerCase().includes(q) ||
          m.implant_components?.component_code?.toLowerCase().includes(q) ||
          m.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [movements, typeFilter, search]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  function exportCSV() {
    if (!filtered.length) return;
    const headers = ['Date', 'Type', 'Component', 'Code', 'System', 'Qty', 'Case ID', 'Doctor', 'Patient', 'Notes'];
    const rows = filtered.map(m => {
      const disp = isDispatch(m);
      const info = disp ? parseDispatchInfo(m.notes) : {};
      const cfg  = cfgFor(m);
      return [
        format(new Date(m.created_at), 'dd MMM yyyy, HH:mm'),
        cfg.label,
        m.implant_components?.name  ?? '',
        m.implant_components?.component_code ?? '',
        m.implant_components?.system ?? '',
        cfg.noStockImpact ? m.quantity : `${cfg.sign}${m.quantity}`,
        info.caseId  ?? '',
        info.doctor  ?? '',
        info.patient ?? '',
        !disp ? (m.notes ?? '') : '',
      ];
    });
    const csv  = [headers, ...rows].map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `implantdesk-history-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!canViewHistory) {
    return (
      <Layout>
        <div className="py-20 text-center text-sm text-muted-foreground">
          You don't have permission to view movement history.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Sticky header ── */}
        <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-3 pb-3 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Movement History</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
                Every stock change — dispatches, outward, inward, and received orders
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, code or notes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 pl-8 w-52 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={exportCSV} disabled={!filtered.length}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {FILTERS.map(({ key, label }) => {
              const active = typeFilter === key;
              const cfg    = key !== 'all' ? TYPE_CFG[key] : null;
              const Icon   = cfg?.icon;
              return (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                    active
                      ? cfg
                        ? cn(cfg.bg, cfg.border, cfg.color)
                        : 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}
            {!isLoading && (
              <span className="ml-auto text-xs text-muted-foreground">
                {filtered.length} movement{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="space-y-5">
            {[3, 2].map((n, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {Array.from({ length: n }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 w-16 hidden sm:block" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groups.size === 0 ? (
          <EmptyState
            icon={History}
            title="No movements yet"
            description={
              typeFilter !== 'all' || search
                ? 'No movements match your current filters.'
                : 'Stock changes will appear here once components are dispatched, sent outward, returned, or received.'
            }
          />
        ) : (
          <div className="space-y-6">
            {[...groups.entries()].map(([dateLabel, rows]) => (
              <div key={dateLabel}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {dateLabel}
                </h3>
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {rows.map(m => {
                    const disp = isDispatch(m);
                    const cfg  = cfgFor(m);
                    const info = disp ? parseDispatchInfo(m.notes) : {};
                    const { className: sysClass, style: sysStyle } =
                      getSystemStyle(m.implant_components?.system ?? '', settings.systemColors);
                    const date = new Date(m.created_at);

                    return (
                      <div key={m.id} onClick={() => setSelectedMovement(m)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">

                        {/* Type badge */}
                        <div className="shrink-0 w-[108px]">
                          <TypeBadge movement={m} />
                        </div>

                        {/* Component + context */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium line-clamp-1">
                              {m.implant_components?.name || '—'}
                            </span>
                            {m.implant_components?.system && (
                              <span
                                className={cn(
                                  'hidden sm:inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4',
                                  sysClass,
                                )}
                                style={sysStyle}
                              >
                                {m.implant_components.system}
                              </span>
                            )}
                            {m.implant_components?.category === 'screw' && (
                              <span className="hidden sm:inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4 bg-violet-50 text-violet-700 border-violet-200">
                                Screw
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <CopyableCode code={m.implant_components?.component_code} className="text-[10px]" />

                            {/* Dispatch context chips */}
                            {disp && (info.caseId || info.doctor || info.patient) && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {info.caseId && (
                                  <span className="inline-flex items-center rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
                                    Case&nbsp;{info.caseId}
                                  </span>
                                )}
                                {info.doctor && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Dr.&nbsp;{info.doctor}
                                  </span>
                                )}
                                {info.patient && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ·&nbsp;{info.patient}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Non-dispatch notes: structured chips or plain text */}
                            {!disp && m.notes && (
                              hasStructuredNotes(m.notes) ? (() => {
                                const p = parseDispatchInfo(m.notes);
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {p.caseId && (
                                      <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200 px-1.5 py-0 text-[10px] font-semibold text-slate-700">
                                        Case&nbsp;{p.caseId}
                                      </span>
                                    )}
                                    {p.doctor  && <span className="text-[10px] text-muted-foreground">Dr.&nbsp;{p.doctor}</span>}
                                    {p.patient && <span className="text-[10px] text-muted-foreground">·&nbsp;{p.patient}</span>}
                                    {p.extra   && <span className="text-[10px] text-muted-foreground">·&nbsp;{p.extra}</span>}
                                  </div>
                                );
                              })() : (
                                <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[220px]">
                                  {m.notes}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {/* Qty */}
                        <div className="shrink-0 text-right min-w-[36px]">
                          <span className={cn('font-bold text-sm', cfg.qtyColor)}>
                            {cfg.noStockImpact ? m.quantity : `${cfg.sign}${m.quantity}`}
                          </span>
                          {cfg.noStockImpact && (
                            <span className="text-[10px] text-muted-foreground ml-0.5">log</span>
                          )}
                        </div>

                        {/* Time */}
                        <div className="shrink-0 text-right hidden sm:block min-w-[64px]">
                          <div className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</div>
                          {isToday(date) && (
                            <div className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(date, { addSuffix: true })}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <MovementDetailDialog
        movement={selectedMovement}
        open={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />
    </Layout>
  );
}
