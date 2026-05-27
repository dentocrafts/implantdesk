import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, SCREW_TYPES, MATERIALS, GINGIVAL_HEIGHTS, SCREW_LENGTHS, PLATFORM_DIAMETERS } from '@/lib/utils';

function FilterSection({ title, items, selected, onToggle }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div className="space-y-1.5">
        {items.map(item => {
          const val = typeof item === 'object' ? item.value : item;
          const label = typeof item === 'object' ? item.label : String(item);
          const isChecked = selected.includes(val);
          return (
            <div key={val} className="flex items-center gap-2">
              <Checkbox
                id={`${title}-${val}`}
                checked={isChecked}
                onCheckedChange={() => onToggle(val)}
              />
              <Label
                htmlFor={`${title}-${val}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterPanel({ filters, onChange, activeCount, category = 'component' }) {
  const isScrew = category === 'screw';
  function toggle(key, value) {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  function clearAll() {
    onChange({
      search: filters.search || '',
      systems: [],
      abutmentTypes: [],
      materials: [],
      gingivalHeights: [],
      platformDiameters: [],
    });
  }

  return (
    <aside className="w-full lg:w-60 shrink-0">
      <div className="rounded-lg border border-border bg-card p-4 sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Filters</span>
            {activeCount > 0 && (
              <Badge variant="default" className="text-xs px-1.5 py-0 h-4">
                {activeCount}
              </Badge>
            )}
          </div>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-5 pr-3">
            <FilterSection
              title="Implant System"
              items={IMPLANT_SYSTEMS}
              selected={filters.systems || []}
              onToggle={v => toggle('systems', v)}
            />
            <Separator />
            <FilterSection
              title={isScrew ? 'Screw Type' : 'Abutment Type'}
              items={isScrew ? SCREW_TYPES : ABUTMENT_TYPES}
              selected={filters.abutmentTypes || []}
              onToggle={v => toggle('abutmentTypes', v)}
            />
            <Separator />
            <FilterSection
              title={isScrew ? 'Length (mm)' : 'Gingival Height'}
              items={(isScrew ? SCREW_LENGTHS : GINGIVAL_HEIGHTS).map(h => ({ value: h, label: `${h} mm` }))}
              selected={filters.gingivalHeights || []}
              onToggle={v => toggle('gingivalHeights', v)}
            />
            <Separator />
            <FilterSection
              title="Platform Diameter"
              items={PLATFORM_DIAMETERS.map(d => ({ value: d, label: `${d} mm` }))}
              selected={filters.platformDiameters || []}
              onToggle={v => toggle('platformDiameters', v)}
            />
            <Separator />
            <FilterSection
              title="Material"
              items={MATERIALS}
              selected={filters.materials || []}
              onToggle={v => toggle('materials', v)}
            />
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
