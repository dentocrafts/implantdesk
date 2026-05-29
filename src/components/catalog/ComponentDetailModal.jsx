import { useState } from 'react';
import { ClipboardList, Minus, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import DentalPlaceholder from '@/components/common/DentalPlaceholder';
import CopyableCode from '@/components/common/CopyableCode';
import { useDispatchNote } from '@/context/DispatchContext';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import { cn, formatCurrency, getStockStatus, getSystemStyle } from '@/lib/utils';
import { parseImagePos } from '@/lib/imageUtils';
import { toast } from 'sonner';

function SpecRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ComponentDetailModal({ component, open, onClose }) {
  const [qty, setQty] = useState(1);
  const { addItem } = useDispatchNote();
  const { settings } = useSettings();
  const { canViewPricing } = usePermissions();

  if (!component) return null;

  const stock  = getStockStatus(component.stock_qty);
  const isOos  = component.stock_qty === 0;
  const { className: sysClass, style: sysStyle } = getSystemStyle(component.system, settings.systemColors);
  const { src: imgSrc, x: imgX, y: imgY } = parseImagePos(component.image_url);

  function handleAddToDispatch() {
    addItem(component, qty);
    toast.success(`Added ${qty}× to dispatch`, { description: component.name, duration: 2000 });
    setQty(1);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="sm:w-56 shrink-0 aspect-square sm:aspect-auto bg-muted rounded-tl-lg rounded-bl-lg overflow-hidden">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={component.name}
                className="h-full w-full object-cover"
                style={{ objectPosition: `${imgX}% ${imgY}%` }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <DentalPlaceholder />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <DialogHeader className="mb-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <DialogTitle className="text-xl leading-tight pr-8">{component.name}</DialogTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', sysClass)} style={sysStyle}>
                  {component.system}
                </span>
                <Badge variant={stock.variant} className="text-xs">{stock.label}</Badge>
                {canViewPricing && (
                  <span className="text-2xl font-bold text-primary">{formatCurrency(component.price)}</span>
                )}
              </div>
            </DialogHeader>

            {component.description && (
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{component.description}</p>
            )}

            {/* Spec table */}
            <div className="rounded-md border border-border px-3 mb-4">
              <SpecRow label={component.category === 'screw' ? 'Screw Type' : 'Abutment Type'} value={component.abutment_type} />
              <SpecRow label={component.category === 'screw' ? 'Length' : 'Gingival Height'} value={`${component.gingival_height_mm} mm`} />
              <SpecRow label="Diameter" value={`${component.platform_diameter} mm`} />
              <SpecRow label="Material" value={component.material} />
              <SpecRow label="Stock" value={`${component.stock_qty} units`} />
            </div>

            {/* Codes */}
            <div className="flex flex-wrap gap-2 mb-5">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Component Code</div>
                <CopyableCode code={component.component_code} className="rounded px-2 py-1 bg-muted hover:bg-accent" />
              </div>
            </div>

            {/* #9 / #13 Add to Dispatch — disabled + tooltip when OOS */}
            <TooltipProvider>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
                <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-primary">Add to Dispatch</span>
                  {/* #13 helper tooltip text */}
                  <p className="text-xs text-muted-foreground mt-0.5">Adds to your current Dispatch Note</p>
                </div>
                {/* Qty picker */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={isOos}
                    className="h-7 w-7 flex items-center justify-center rounded border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    disabled={isOos}
                    className="h-7 w-7 flex items-center justify-center rounded border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {/* #9 disabled Add button with tooltip when OOS */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={isOos ? 0 : undefined}>
                      <Button
                        size="sm"
                        onClick={handleAddToDispatch}
                        disabled={isOos}
                        className="h-7 px-3 text-xs"
                      >
                        Add
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isOos && (
                    <TooltipContent side="top" className="text-xs">
                      Cannot add — out of stock
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
