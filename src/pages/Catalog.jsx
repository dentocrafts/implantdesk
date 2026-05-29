import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Download, EyeOff, Eye } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ScrewIcon from '@/components/common/ScrewIcon';
import FilterPanel from '@/components/catalog/FilterPanel';
import ComponentGrid from '@/components/catalog/ComponentGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComponents, useFilterOptions } from '@/hooks/useComponents';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

export default function Catalog() {
  const { canExportCSV } = usePermissions();
  const { settings } = useSettings();

  // #2 segmented view toggle
  const [catalogView,    setCatalogView]    = useState('component'); // 'component' | 'screw'
  const [filters,        setFilters]        = useState({
    search: '', systems: [], abutmentTypes: [], materials: [], gingivalHeights: [], platformDiameters: [],
  });
  const [showFilters,    setShowFilters]    = useState(false);
  // #5 Hide Out of Stock toggle
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  // #6 Sort by
  const [sortBy,         setSortBy]         = useState('default');

  const { data: rawItems, isLoading } = useComponents({ ...filters, category: catalogView });
  const { data: filterOptions }       = useFilterOptions(catalogView);

  const activeFilterCount = useMemo(() => (
    filters.systems.length + filters.abutmentTypes.length + filters.materials.length +
    filters.gingivalHeights.length + filters.platformDiameters.length
  ), [filters]);

  // #7 / #20 strip hidden/deleted options — switch keys per view
  const visibleFilterOptions = useMemo(() => {
    if (!filterOptions) return filterOptions;
    const isScrew = catalogView === 'screw';
    const hidSys  = (isScrew ? settings.hiddenScrewSystems   : settings.hiddenSystems)       || [];
    const hidType = (isScrew ? settings.hiddenScrewTypes      : settings.hiddenAbutmentTypes) || [];
    const hidMat  = (isScrew ? settings.hiddenScrewMaterials  : settings.hiddenMaterials)     || [];
    const delSys  = (isScrew ? settings.deletedScrewSystems   : settings.deletedSystems)      || [];
    const delType = (isScrew ? settings.deletedScrewTypes     : settings.deletedAbutmentTypes)|| [];
    const delMat  = (isScrew ? settings.deletedScrewMaterials : settings.deletedMaterials)    || [];
    return {
      ...filterOptions,
      systems:       filterOptions.systems.filter(s       => !hidSys.includes(s)  && !delSys.includes(s)),
      abutmentTypes: filterOptions.abutmentTypes.filter(t => !hidType.includes(t) && !delType.includes(t)),
      materials:     filterOptions.materials.filter(m     => !hidMat.includes(m)  && !delMat.includes(m)),
    };
  }, [
    filterOptions, catalogView,
    settings.hiddenSystems,      settings.hiddenAbutmentTypes,  settings.hiddenMaterials,
    settings.deletedSystems,     settings.deletedAbutmentTypes, settings.deletedMaterials,
    settings.hiddenScrewSystems, settings.hiddenScrewTypes,     settings.hiddenScrewMaterials,
    settings.deletedScrewSystems,settings.deletedScrewTypes,    settings.deletedScrewMaterials,
  ]);

  // #5 / #6 client-side hide-OOS + sort
  const displayItems = useMemo(() => {
    let items = rawItems ?? [];
    if (hideOutOfStock) items = items.filter(c => c.stock_qty > 0);
    if (sortBy === 'name-az')   items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'low-stock') items = [...items].sort((a, b) => a.stock_qty - b.stock_qty);
    if (sortBy === 'in-stock')  items = [...items].sort((a, b) => b.stock_qty - a.stock_qty);
    return items;
  }, [rawItems, hideOutOfStock, sortBy]);

  function switchView(view) {
    setCatalogView(view);
    setFilters({ search: '', systems: [], abutmentTypes: [], materials: [], gingivalHeights: [], platformDiameters: [] });
    setHideOutOfStock(false);
    setSortBy('default');
    setShowFilters(false);
  }

  function handleClearFilters() {
    setFilters(f => ({ ...f, systems: [], abutmentTypes: [], materials: [], gingivalHeights: [], platformDiameters: [] }));
  }

  function exportCSV() {
    if (!displayItems?.length) return;
    const isScrew = catalogView === 'screw';
    const headers = isScrew
      ? ['Name', 'System', 'Screw Type', 'Length (mm)', 'Diameter (mm)', 'Material', 'Component Code', 'Price (INR)', 'Stock']
      : ['Name', 'System', 'Abutment Type', 'GH (mm)', 'Platform (mm)', 'Material', 'Component Code', 'Price (INR)', 'Stock'];
    const rows = displayItems.map(c => [
      c.name, c.system, c.abutment_type, c.gingival_height_mm,
      c.platform_diameter, c.material, c.component_code, c.price, c.stock_qty,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `implantdesk-${isScrew ? 'screws' : 'catalog'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isScrew = catalogView === 'screw';

  return (
    <Layout title="Catalog">
      {/* Page title + #2 segmented toggle */}
      <div className="mb-3">
        <h2 className="text-xl font-bold">Catalog</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading
            ? 'Loading…'
            : `${displayItems.length} ${isScrew ? 'screw' : 'component'}${displayItems.length !== 1 ? 's' : ''}`}
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
          {hideOutOfStock && ' · hiding out of stock'}
        </p>
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mt-2.5">
          {[
            { view: 'component', label: 'Components' },
            { view: 'screw',     label: 'Screws', icon: true },
          ].map(({ view, label, icon }) => (
            <button
              key={view}
              onClick={() => switchView(view)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                catalogView === view
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {icon && <ScrewIcon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={isScrew ? 'Search screws by name, code, or size…' : 'Search by name, code, or size — e.g. 4.5 or 2mm…'}
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

          {/* #6 Sort by */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-40 text-sm shrink-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="name-az">Name A–Z</SelectItem>
              <SelectItem value="low-stock">Low Stock First</SelectItem>
              <SelectItem value="in-stock">In Stock First</SelectItem>
            </SelectContent>
          </Select>

          {/* #5 Hide Out of Stock */}
          <Button
            variant={hideOutOfStock ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 shrink-0 h-9"
            onClick={() => setHideOutOfStock(v => !v)}
          >
            {hideOutOfStock ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{hideOutOfStock ? 'Show All' : 'Hide Out of Stock'}</span>
            <span className="sm:hidden">{hideOutOfStock ? 'Show All' : 'Hide OOS'}</span>
          </Button>

          {/* Filter toggle — mobile only */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 lg:hidden shrink-0 h-9"
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
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9" onClick={exportCSV} disabled={!displayItems?.length}>
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
            category={catalogView}
            options={visibleFilterOptions}
          />
        </div>
        <div className="flex-1 min-w-0">
          <ComponentGrid
            components={displayItems}
            isLoading={isLoading}
            hasFilters={activeFilterCount > 0 || !!filters.search || hideOutOfStock}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
    </Layout>
  );
}
