import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, FileSpreadsheet } from 'lucide-react';
import ScrewIcon from '@/components/common/ScrewIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import ComponentForm from './ComponentForm';
import ImportExcel from './ImportExcel';
import { useAllComponents, useCreateComponent, useUpdateComponent, useDeleteComponent } from '@/hooks/useComponents';
import { formatCurrency, getStockStatus, SYSTEM_COLORS, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ComponentManager() {
  const { data: components, isLoading } = useAllComponents();
  const createComponent = useCreateComponent();
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('component'); // 'component' | 'screw'

  const isScrew = activeCategory === 'screw';

  const filtered = components?.filter(c =>
    (c.category ?? 'component') === activeCategory &&
    (!search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.component_code?.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  async function handleSave(payload) {
    if (editing) {
      await updateComponent.mutateAsync({ id: editing.id, ...payload });
      toast.success(`${isScrew ? 'Screw' : 'Component'} updated`);
    } else {
      await createComponent.mutateAsync(payload);
      toast.success(`${isScrew ? 'Screw' : 'Component'} created`);
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleToggleActive(c) {
    await updateComponent.mutateAsync({ id: c.id, is_active: !c.is_active });
    toast.success(`${c.name} ${!c.is_active ? 'activated' : 'deactivated'}`);
  }

  async function handleDelete(c) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    await deleteComponent.mutateAsync(c.id);
    toast.success('Component deleted');
  }

  async function handleStockChange(id, qty) {
    await updateComponent.mutateAsync({ id, stock_qty: Number(qty) });
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveCategory('component')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeCategory === 'component' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          Components
        </button>
        <button
          onClick={() => setActiveCategory('screw')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeCategory === 'screw' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          <ScrewIcon className="h-3.5 w-3.5" />
          Screws
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder={`Search ${isScrew ? 'screws' : 'components'}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5 flex-1 sm:flex-none">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm" className="gap-1.5 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Add {isScrew ? 'Screw' : 'Component'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead className="hidden md:table-cell">System</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">Code</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.map(c => {
              const stock = getStockStatus(c.stock_qty);
              const systemColor = SYSTEM_COLORS[c.system] || '';
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-[180px]">
                    <span className="line-clamp-1 text-sm">{c.name}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', systemColor)}>
                      {c.system}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{c.abutment_type || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">{c.component_code}</TableCell>
                  <TableCell className="text-primary font-medium text-sm">{formatCurrency(c.price)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={c.stock_qty}
                      className="h-7 w-16 text-xs"
                      onBlur={e => handleStockChange(c.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'success' : 'secondary'} className="text-xs">
                      {c.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleActive(c)}
                        title={c.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {c.is_active
                          ? <ToggleRight className="h-4 w-4 text-primary" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditing(c); setFormOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!isLoading && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No components found.</div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${isScrew ? 'Screw' : 'Component'}` : `Add New ${isScrew ? 'Screw' : 'Component'}`}</DialogTitle>
          </DialogHeader>
          <ComponentForm
            component={editing}
            category={activeCategory}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      <ImportExcel open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
