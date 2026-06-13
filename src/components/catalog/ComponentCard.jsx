import { Eye, ClipboardList } from 'lucide-react';
import { toTitleCase } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DentalPlaceholder from '@/components/common/DentalPlaceholder';
import CopyableCode from '@/components/common/CopyableCode';
import { useDispatchNote } from '@/context/DispatchContext';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import { cn, formatCurrency, getStockStatus, getSystemStyle } from '@/lib/utils';
import { parseImagePos } from '@/lib/imageUtils';
import { toast } from 'sonner';

export default function ComponentCard({ component, onViewDetail }) {
  const stock = getStockStatus(component.stock_qty);
  const { src: imgSrc, x: imgX, y: imgY } = parseImagePos(component.image_url);
  const { addItem } = useDispatchNote();
  const { settings } = useSettings();
  const { className: sysClass, style: sysStyle } = getSystemStyle(component.system, settings.systemColors);
  const { canViewPricing } = usePermissions();

  function handleAddToDispatch(e) {
    e.stopPropagation();
    addItem(component, 1);
    toast.success(`Added to dispatch`, { description: component.name, duration: 2000 });
  }

  return (
    <Card
      className="group flex flex-col overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
      onClick={() => onViewDetail(component)}
    >
      {/* Image */}
      <div className="relative aspect-[3/2] bg-muted overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={component.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            style={{ objectPosition: `${imgX}% ${imgY}%` }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
        ) : null}
        <div className={imgSrc ? 'hidden' : 'block h-full w-full'}>
          <DentalPlaceholder />
        </div>

        {/* System badge overlay */}
        <div className="absolute top-2 left-2">
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', sysClass)} style={sysStyle}>
            {component.system}
          </span>
        </div>

        {/* View detail button on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5 text-white text-xs font-medium border border-white/20">
            <Eye className="h-3.5 w-3.5" />
            View Details
          </div>
        </div>
      </div>

      <CardContent className="flex flex-col gap-1.5 p-2.5 flex-1">
        {/* #8 Name wraps fully — no truncation */}
        <h3 className="font-semibold text-sm leading-tight">{component.name}</h3>

        {/* #7 / #20 Tags with title-case labels */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {toTitleCase(component.abutment_type ?? '')}
          </Badge>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-muted-foreground/20">
            {component.category === 'screw' ? 'L' : 'GH'} {component.gingival_height_mm}mm
          </Badge>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-muted-foreground/20">
            Ø{component.platform_diameter}
          </Badge>
          <span className={cn(
            'inline-flex items-center rounded-full px-1.5 py-0 h-5 text-[10px] font-bold uppercase',
            (component.stock_type || 'sale') === 'returnable'
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          )}>
            {component.stock_type || 'sale'}
          </span>
        </div>

        {/* Codes */}
        <div className="space-y-0.5" onClick={e => e.stopPropagation()}>
          <CopyableCode code={component.component_code} />
        </div>

        {/* Price + stock */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {canViewPricing
            ? <span className="font-bold text-primary">{formatCurrency(component.price)}</span>
            : <span />
          }
          <div className="flex items-center gap-1.5">
            <Badge variant={stock.variant} className="text-xs">{stock.label}</Badge>
            <button
              onClick={handleAddToDispatch}
              title="Add to Dispatch"
              className="flex items-center justify-center h-5 w-5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <ClipboardList className="h-3 w-3" />
            </button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
