import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, X, Plus } from 'lucide-react';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, SCREW_TYPES, MATERIALS } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

const ADD_NEW = '__add_new__';

// ── Helpers ──────────────────────────────────────────────────────────────────

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

// ── Add-new dialog ───────────────────────────────────────────────────────────

function AddNewDialog({ open, title, onAdd, onClose }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  function handleAdd() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm" onOpenAutoFocus={e => { e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 50); }}>
        <DialogHeader>
          <DialogTitle>Add {title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            placeholder={`New ${title.toLowerCase()} name…`}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleAdd} disabled={!value.trim()}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export default function ComponentForm({ component, onSave, onCancel, category = 'component' }) {
  const isEditing = !!component;
  const isScrew   = (component?.category ?? category) === 'screw';

  const { settings, updateSettings } = useSettings();

  const [uploading, setUploading]     = useState(false);
  const [imageUrl, setImageUrl]       = useState(component?.image_url || '');
  const [isActive, setIsActive]       = useState(component?.is_active ?? true);
  const [addingField, setAddingField] = useState(null); // 'system' | 'abutmentType' | 'material'

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name:               component?.name               || '',
      system:             component?.system             || '',
      abutment_type:      component?.abutment_type      || '',
      gingival_height_mm: component?.gingival_height_mm || '',
      platform_diameter:  component?.platform_diameter  || '',
      material:           component?.material           || '',
      component_code:     component?.component_code     || '',
      manufacturer_code:  component?.manufacturer_code  || '',
      price:              component?.price              || '',
      stock_qty:          component?.stock_qty          || 0,
      description:        component?.description        || '',
    },
  });

  // Controlled values for the three selects
  const watchedSystem  = watch('system');
  const watchedType    = watch('abutment_type');
  const watchedMat     = watch('material');

  // Merged option lists (hardcoded + user-added)
  const allSystems  = uniq([...IMPLANT_SYSTEMS,                          ...(settings.customSystems      || [])]);
  const allTypes    = uniq([...(isScrew ? SCREW_TYPES : ABUTMENT_TYPES), ...(isScrew ? (settings.customScrewTypes || []) : (settings.customAbutmentTypes || []))]);
  const allMaterials = uniq([...MATERIALS,                               ...(settings.customMaterials   || [])]);

  // ── Image upload ──────────────────────────────────────────────────────────

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `components/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values) {
    try {
      const payload = {
        ...values,
        category:           component?.category ?? category,
        gingival_height_mm: Number(values.gingival_height_mm),
        platform_diameter:  Number(values.platform_diameter),
        price:              Number(values.price),
        stock_qty:          Number(values.stock_qty),
        image_url:          imageUrl || null,
        is_active:          isActive,
      };
      await onSave(payload);
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  }

  // ── Add-new handler ───────────────────────────────────────────────────────

  function handleAddNew(field, newVal) {
    if (field === 'system') {
      updateSettings({ customSystems: uniq([...(settings.customSystems || []), newVal]) });
      setValue('system', newVal);
    } else if (field === 'abutmentType') {
      if (isScrew) {
        updateSettings({ customScrewTypes: uniq([...(settings.customScrewTypes || []), newVal]) });
      } else {
        updateSettings({ customAbutmentTypes: uniq([...(settings.customAbutmentTypes || []), newVal]) });
      }
      setValue('abutment_type', newVal);
    } else if (field === 'material') {
      updateSettings({ customMaterials: uniq([...(settings.customMaterials || []), newVal]) });
      setValue('material', newVal);
    }
    setAddingField(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const dialogTitles = {
    system: 'Implant System',
    abutmentType: isScrew ? 'Screw Type' : 'Abutment Type',
    material: 'Material',
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">{isScrew ? 'Screw Name' : 'Component Name'} *</Label>
            <Input
              id="name"
              {...register('name', { required: true })}
              placeholder={isScrew ? 'e.g. Osstem Prosthetic Screw 10mm' : 'e.g. Conical Abutment 4.5mm GH2'}
            />
          </div>

          {/* System */}
          <div className="space-y-1.5">
            <Label>Implant System *</Label>
            <Select
              value={watchedSystem}
              onValueChange={v => {
                if (v === ADD_NEW) { setAddingField('system'); return; }
                setValue('system', v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select system…" />
              </SelectTrigger>
              <SelectContent>
                {allSystems.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                <SelectItem value={ADD_NEW} className="text-primary font-medium border-t mt-1 pt-1">
                  <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Add new…</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Abutment / Screw Type */}
          <div className="space-y-1.5">
            <Label>{isScrew ? 'Screw Type' : 'Abutment Type'} *</Label>
            <Select
              value={watchedType}
              onValueChange={v => {
                if (v === ADD_NEW) { setAddingField('abutmentType'); return; }
                setValue('abutment_type', v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                <SelectItem value={ADD_NEW} className="text-primary font-medium border-t mt-1 pt-1">
                  <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Add new…</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Material */}
          <div className="space-y-1.5">
            <Label>Material *</Label>
            <Select
              value={watchedMat}
              onValueChange={v => {
                if (v === ADD_NEW) { setAddingField('material'); return; }
                setValue('material', v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material…" />
              </SelectTrigger>
              <SelectContent>
                {allMaterials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                <SelectItem value={ADD_NEW} className="text-primary font-medium border-t mt-1 pt-1">
                  <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Add new…</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gingival Height / Screw Length */}
          <div className="space-y-1.5">
            <Label htmlFor="gh">{isScrew ? 'Screw Length (mm)' : 'Gingival Height (mm)'} *</Label>
            <Input
              id="gh"
              type="number"
              step="any"
              {...register('gingival_height_mm', { required: true })}
              placeholder={isScrew ? 'e.g. 10' : 'e.g. 2'}
            />
          </div>

          {/* Platform Diameter / Screw Diameter */}
          <div className="space-y-1.5">
            <Label htmlFor="pd">{isScrew ? 'Screw Diameter (mm)' : 'Platform Diameter (mm)'} *</Label>
            <Input
              id="pd"
              type="number"
              step="any"
              {...register('platform_diameter', { required: true })}
              placeholder="e.g. 4.5"
            />
          </div>

          {/* Component Code */}
          <div className="space-y-1.5">
            <Label htmlFor="cc">Component Code *</Label>
            <Input
              id="cc"
              className="uppercase"
              placeholder="Internal SKU"
              {...register('component_code', {
                required: true,
                setValueAs: v => v ? v.toUpperCase() : v,
              })}
            />
          </div>

          {/* Manufacturer Code */}
          <div className="space-y-1.5">
            <Label htmlFor="mc">Manufacturer Code</Label>
            <Input id="mc" {...register('manufacturer_code')} placeholder="OEM part number" />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (INR) *</Label>
            <Input id="price" type="number" {...register('price', { required: true })} placeholder="e.g. 2500" />
          </div>

          {/* Stock */}
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock Qty *</Label>
            <Input id="stock" type="number" {...register('stock_qty', { required: true })} />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" {...register('description')} placeholder="Short product description…" rows={2} />
          </div>

          {/* Image upload */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Product Image</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-4 py-2 hover:bg-accent transition-colors text-sm">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {imageUrl && (
                <div className="flex items-center gap-2">
                  <img src={imageUrl} alt="Preview" className="h-10 w-10 rounded object-cover border border-border" />
                  <button type="button" onClick={() => setImageUrl('')} className="text-destructive hover:opacity-80">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <Input
              placeholder="Or paste image URL…"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Active toggle */}
          <div className="sm:col-span-2 flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
            <Label htmlFor="active">Active (visible in catalog)</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing
              ? `Update ${isScrew ? 'Screw' : 'Component'}`
              : `Add ${isScrew ? 'Screw' : 'Component'}`}
          </Button>
        </div>
      </form>

      {/* Add-new dialog */}
      <AddNewDialog
        open={!!addingField}
        title={addingField ? dialogTitles[addingField] : ''}
        onAdd={val => handleAddNew(addingField, val)}
        onClose={() => setAddingField(null)}
      />
    </>
  );
}
