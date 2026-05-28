import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Download } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ScrewIcon from '@/components/common/ScrewIcon';
import FilterPanel from '@/components/catalog/FilterPanel';
import ComponentGrid from '@/components/catalog/ComponentGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useComponents, useFilterOptions } from '@/hooks/useComponents';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/context/SettingsContext';

export default function Screws() {
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

  const activeFilterCount = useMemo(() => (
    filters.systems.length +
    filters.abutmentTypes.length +
    filters.materials.length +
    filters.gingivalHeights.length +
    filters.platformDiameters.length
  ), [filters]);

  const { settings } = useSettings();
  const { data: screws, isLoading } = useComponents({ ...filters, category: 'screw' });
  const { data: filterOptions } = useFilterOptions('screw');

  // Strip out any values the user has hidden in Settings → Catalog Options
  const visibleFilterOptions = useMemo(() => {
    if (!filterOptions) return filterOptions;
    const hidSys  = settings.hiddenSystems    || [];
    const hidType = settings.hiddenScrewTypes || [];   // screws use hiddenScrewTypes
    const hidMat  = settings.hiddenMaterials  || [];
    return {
      ...filterOptions,
      systems:      filterOptions.systems.filter(s => !hidSys.includes(s)),
      abutmentTypes: filterOptions.abutmentTypes.filter(t => !hidType.includes(t)),
      materials:    filterOptions.materials.filter(m => !hidMat.includes(m)),
    };
  }, [filterOptions, settings.hiddenSystems, settings.hiddenScrewTypes, settings.hiddenMaterials]);

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
    if (!screws?.length) return;
    const headers = ['Name', 'System', 'Screw Type', 'Length (mm)', 'Diameter (mm)', 'Material', 'Component Code', 'Mfr Code', 'Price (INR)', 'Stock'];
    const rows = screws.map(c => [
      c.name, c.system, c.abutment_type, c.gingival_height_mm, c.platform_diameter,
      c.material, c.component_code, c.manufacturer_code, c.price, c.stock_qty,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `implantdesk-screws-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      {/* Page title — scrolls away */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <ScrewIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Prosthetic Screws</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? 'Loading…' : `${screws?.length ?? 0} screws`}
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
              placeholder="Search by name, component code, or manufacturer code…"
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
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={exportCSV} disabled={!screws?.length}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            activeCount={activeFilterCount}
            category="screw"
            options={visibleFilterOptions}
          />
        </div>
        <div className="flex-1 min-w-0">
          <ComponentGrid
            components={screws}
            isLoading={isLoading}
            hasFilters={activeFilterCount > 0 || !!filters.search}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
    </Layout>
  );
}
