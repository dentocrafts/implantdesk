import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

function FilterSection({ title, items, selected, onToggle }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div className="space-y-1.5">
        {items.map(item => {
          const val   = typeof item === 'object' ? item.value : item;
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

export default function FilterPanel({ filters, onChange, activeCount, category = 'component', options = {} }) {
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

  const {
    systems           = [],
    abutmentTypes     = [],
    materials         = [],
    gingivalHeights   = [],
    platformDiameters = [],
  } = options;

  const ghItems  = gingivalHeights.map(h => ({ value: h, label: `${h} mm` }));
  const pdItems  = platformDiameters.map(d => ({ value: d, label: `${d} mm` }));

  // Only render separators between sections that have items
  const sections = [
    { key: 'systems',       title: 'Implant System',               items: systems,       filterKey: 'systems' },
    { key: 'abutmentTypes', title: isScrew ? 'Screw Type' : 'Abutment Type', items: abutmentTypes, filterKey: 'abutmentTypes' },
    { key: 'ghItems',       title: isScrew ? 'Length (mm)' : 'Gingival Height', items: ghItems, filterKey: 'gingivalHeights' },
    { key: 'pdItems',       title: 'Platform Diameter',            items: pdItems,       filterKey: 'platformDiameters' },
    { key: 'materials',     title: 'Material',                     items: materials,     filterKey: 'materials' },
  ].filter(s => s.items.length > 0);

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
            {sections.map((s, i) => (
              <div key={s.key}>
                {i > 0 && <Separator className="mb-5" />}
                <FilterSection
                  title={s.title}
                  items={s.items}
                  selected={filters[s.filterKey] || []}
                  onToggle={v => toggle(s.filterKey, v)}
                />
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Loading filters…</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
