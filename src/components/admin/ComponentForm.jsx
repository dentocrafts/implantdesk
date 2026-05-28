import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, X } from 'lucide-react';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, SCREW_TYPES, MATERIALS } from '@/lib/utils';
import { toast } from 'sonner';

export default function ComponentForm({ component, onSave, onCancel, category = 'component' }) {
  const isEditing = !!component;
  const isScrew = (component?.category ?? category) === 'screw';
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(component?.image_url || '');
  const [isActive, setIsActive] = useState(component?.is_active ?? true);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: component?.name || '',
      system: component?.system || '',
      abutment_type: component?.abutment_type || '',
      gingival_height_mm: component?.gingival_height_mm || '',
      platform_diameter: component?.platform_diameter || '',
      material: component?.material || '',
      component_code: component?.component_code || '',
      manufacturer_code: component?.manufacturer_code || '',
      price: component?.price || '',
      stock_qty: component?.stock_qty || 0,
      description: component?.description || '',
    },
  });

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
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

  async function onSubmit(values) {
    try {
      const payload = {
        ...values,
        category: component?.category ?? category,
        gingival_height_mm: Number(values.gingival_height_mm),
        platform_diameter: Number(values.platform_diameter),
        price: Number(values.price),
        stock_qty: Number(values.stock_qty),
        image_url: imageUrl || null,
        is_active: isActive,
      };
      await onSave(payload);
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">{isScrew ? 'Screw Name' : 'Component Name'} *</Label>
          <Input id="name" {...register('name', { required: true })} placeholder={isScrew ? 'e.g. Osstem Prosthetic Screw 10mm' : 'e.g. Conical Abutment 4.5mm GH2'} />
        </div>

        {/* System */}
        <div className="space-y-1.5">
          <Label>Implant System *</Label>
          <Select onValueChange={v => setValue('system', v)} defaultValue={component?.system}>
            <SelectTrigger>
              <SelectValue placeholder="Select system..." />
            </SelectTrigger>
            <SelectContent>
              {IMPLANT_SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Abutment / Screw Type */}
        <div className="space-y-1.5">
          <Label>{isScrew ? 'Screw Type' : 'Abutment Type'} *</Label>
          <Select onValueChange={v => setValue('abutment_type', v)} defaultValue={component?.abutment_type}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {(isScrew ? SCREW_TYPES : ABUTMENT_TYPES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Material */}
        <div className="space-y-1.5">
          <Label>Material *</Label>
          <Select onValueChange={v => setValue('material', v)} defaultValue={component?.material}>
            <SelectTrigger>
              <SelectValue placeholder="Select material..." />
            </SelectTrigger>
            <SelectContent>
              {MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Gingival Height / Screw Length */}
        <div className="space-y-1.5">
          <Label htmlFor="gh">{isScrew ? 'Screw Length (mm)' : 'Gingival Height (mm)'} *</Label>
          <Input id="gh" type="number" step="any" {...register('gingival_height_mm', { required: true })} placeholder={isScrew ? 'e.g. 10' : 'e.g. 2'} />
        </div>

        {/* Platform Diameter / Screw Diameter */}
        <div className="space-y-1.5">
          <Label htmlFor="pd">{isScrew ? 'Screw Diameter (mm)' : 'Platform Diameter (mm)'} *</Label>
          <Input id="pd" type="number" step="any" {...register('platform_diameter', { required: true })} placeholder="e.g. 4.5" />
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
          <Textarea id="desc" {...register('description')} placeholder="Short product description..." rows={2} />
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
            placeholder="Or paste image URL..."
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
          {isSubmitting ? 'Saving...' : isEditing ? `Update ${isScrew ? 'Screw' : 'Component'}` : `Add ${isScrew ? 'Screw' : 'Component'}`}
        </Button>
      </div>
    </form>
  );
}
