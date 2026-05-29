import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Download } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import FilterPanel from '@/components/catalog/FilterPanel';
import ComponentGrid from '@/components/catalog/ComponentGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useComponents, useFilterOptions } from '@/hooks/useComponents';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/context/SettingsContext';

export default function Catalog() {
  const { canExportCSV } = usePermissions();
  const [filters, setFilters] = useState({
    search: '',
    systems: [],
    abutmentTypes: [],
    materials: [],
    gingivalHeights: [],
    platformDiameters: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(() => {
    return (
      filters.systems.length +
      filters.abutmentTypes.length +
      filters.materials.length +
      filters.gingivalHeights.length +
      filters.platformDiameters.length
    );
  }, [filters]);

  const { settings } = useSettings();
  const { data: components, isLoading } = useComponents({ ...filters, category: 'component' });
  const { data: filterOptions } = useFilterOptions('component');

  // Strip out any values the user has hidden or deleted in Settings → Catalog Options
  const visibleFilterOptions = useMemo(() => {
    if (!filterOptions) return filterOptions;
    const hidSys  = settings.hiddenSystems        || [];
    const hidType = settings.hiddenAbutmentTypes   || [];
    const hidMat  = settings.hiddenMaterials       || [];
    const delSys  = settings.deletedSystems        || [];
    const delType = settings.deletedAbutmentTypes  || [];
    const delMat  = settings.deletedMaterials      || [];
    return {
      ...filterOptions,
      systems:       filterOptions.systems.filter(s       => !hidSys.includes(s)  && !delSys.includes(s)),
      abutmentTypes: filterOptions.abutmentTypes.filter(t => !hidType.includes(t) && !delType.includes(t)),
      materials:     filterOptions.materials.filter(m     => !hidMat.includes(m)  && !delMat.includes(m)),
    };
  }, [filterOptions, settings.hiddenSystems, settings.hiddenAbutmentTypes, settings.hiddenMaterials, settings.deletedSystems, settings.deletedAbutmentTypes, settings.deletedMaterials]);

  function handleClearFilters() {
    setFilters(f => ({
      ...f,
      systems: [],
      abutmentTypes: [],
      materials: [],
      gingivalHeights: [],
      platformDiameters: [],
    }));
  }

  function exportCSV() {
    if (!components?.length) return;
    const headers = ['Name', 'System', 'Abutment Type', 'GH (mm)', 'Platform (mm)', 'Material', 'Component Code', 'Mfr Code', 'Price (INR)', 'Stock'];
    const rows = components.map(c => [
      c.name, c.system, c.abutment_type, c.gingival_height_mm, c.platform_diameter,
      c.material, c.component_code, c.manufacturer_code, c.price, c.stock_qty,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `implantdesk-catalog-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      {/* Page title — scrolls away */}
      <div className="mb-3">
        <h2 className="text-xl font-bold">Component Catalog</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? 'Loading…' : `${components?.length ?? 0} components`}
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
        </p>
      </div>

      {/* Sticky action bar */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-6">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, code, or size — e.g. 4.5 or 2mm…"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-9 pr-9"
            />
            {filters.search && (
              <button
                onClick={() => setFilters(f => ({ ...f, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Filter toggle — mobile only */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 lg:hidden shrink-0"
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {canExportCSV && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={exportCSV} disabled={!components?.length}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter panel — always shown on desktop, toggleable on mobile */}
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            activeCount={activeFilterCount}
            category="component"
            options={visibleFilterOptions}
          />
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <ComponentGrid
            components={components}
            isLoading={isLoading}
            hasFilters={activeFilterCount > 0 || !!filters.search}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
    </Layout>
  );
}
