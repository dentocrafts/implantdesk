import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, X, Plus, Crosshair } from 'lucide-react';
import { IMPLANT_SYSTEMS, ABUTMENT_TYPES, SCREW_TYPES, MATERIALS } from '@/lib/utils';
import { parseImagePos, encodeImagePos } from '@/lib/imageUtils';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

const ADD_NEW = '__add_new__';

// ── Helpers ──────────────────────────────────────────────────────────────────

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

// ── Focal point picker ────────────────────────────────────────────────────────

function FocalPointPicker({ src, x, y, onChange }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function calcPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100))),
      y: Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top)   / rect.height) * 100))),
    };
  }

  function handleMouseDown(e) {
    e.preventDefault();
    setDragging(true);
    const p = calcPos(e);
    onChange(p.x, p.y);
  }

  useEffect(() => {
    if (!dragging) return;
    const move = e => { const p = calcPos(e); onChange(p.x, p.y); };
    const up   = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',  up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging]); // eslint-disable-line

  const isCenter = x === 50 && y === 50;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" />
          Crop Focus Point
        </Label>
        {!isCenter && (
          <button
            type="button"
            onClick={() => onChange(50, 50)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Reset to center
          </button>
        )}
      </div>

      {/* Interactive image — click or drag to set focal point */}
      <div
        ref={containerRef}
        className="relative aspect-[3/2] rounded-md overflow-hidden cursor-crosshair border border-border select-none"
        onMouseDown={handleMouseDown}
      >
        {/* Live preview: image with current focal point applied */}
        <img
          src={src}
          alt="focal point preview"
          draggable={false}
          className="h-full w-full object-cover pointer-events-none"
          style={{ objectPosition: `${x}% ${y}%` }}
        />

        {/* Subtle dark vignette so the crosshair is always visible */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Crosshair marker */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        >
          {/* outer ring */}
          <div className="w-7 h-7 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] flex items-center justify-center">
            {/* inner dot */}
            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
          </div>
        </div>

        <p className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/70 pointer-events-none">
          Click or drag to move focus point
        </p>
      </div>
    </div>
  );
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
  const [isActive, setIsActive]       = useState(component?.is_active ?? true);
  const [stockType, setStockType]     = useState(component?.stock_type || 'sale');
  const [addingField, setAddingField] = useState(null); // 'system' | 'abutmentType' | 'material'

  // Image base URL + focal point (encoded in the #pos= fragment on save)
  const initImg = parseImagePos(component?.image_url || '');
  const [imageBase, setImageBase]     = useState(initImg.src);
  const [focalX, setFocalX]           = useState(initImg.x);
  const [focalY, setFocalY]           = useState(initImg.y);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name:               component?.name               || '',
      system:             component?.system             || '',
      abutment_type:      component?.abutment_type      || '',
      gingival_height_mm: component?.gingival_height_mm || '',
      platform_diameter:  component?.platform_diameter  || '',
      material:           component?.material           || '',
      component_code:     component?.component_code     || '',
      price:              component?.price              || '',
      stock_qty:          component?.stock_qty          || 0,
      description:        component?.description        || '',
    },
  });

  // Controlled values for the three selects — use local state so that
  // newly added custom options and the selected value update in the same
  // React render pass (avoids a blank select after "+ Add new…")
  const [selectedSystem, setSelectedSystem] = useState(component?.system        || '');
  const [selectedType,   setSelectedType]   = useState(component?.abutment_type || '');
  const [selectedMat,    setSelectedMat]    = useState(component?.material      || '');

  // Hidden + deleted lists from settings
  const hiddenSys    = settings.hiddenSystems       || [];
  const hiddenType   = isScrew ? (settings.hiddenScrewTypes || []) : (settings.hiddenAbutmentTypes || []);
  const hiddenMat    = settings.hiddenMaterials     || [];
  const deletedSys   = settings.deletedSystems      || [];
  const deletedType  = isScrew ? (settings.deletedScrewTypes || []) : (settings.deletedAbutmentTypes || []);
  const deletedMat   = settings.deletedMaterials    || [];

  // Merged option lists (hardcoded minus hidden/deleted + user-added customs)
  const allSystems   = uniq([...IMPLANT_SYSTEMS.filter(s => !hiddenSys.includes(s)  && !deletedSys.includes(s)),  ...(settings.customSystems   || [])]);
  const allTypes     = uniq([...(isScrew ? SCREW_TYPES : ABUTMENT_TYPES).filter(t => !hiddenType.includes(t) && !deletedType.includes(t)), ...(isScrew ? (settings.customScrewTypes || []) : (settings.customAbutmentTypes || []))]);
  const allMaterials = uniq([...MATERIALS.filter(m => !hiddenMat.includes(m)         && !deletedMat.includes(m)), ...(settings.customMaterials || [])]);

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
      setImageBase(data.publicUrl);
      setFocalX(50); setFocalY(50); // reset focal point for new image
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
        image_url:          encodeImagePos(imageBase, focalX, focalY) || null,
        is_active:          isActive,
        stock_type:         stockType,
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
      setSelectedSystem(newVal);
      setValue('system', newVal, { shouldDirty: true });
    } else if (field === 'abutmentType') {
      if (isScrew) {
        updateSettings({ customScrewTypes: uniq([...(settings.customScrewTypes || []), newVal]) });
      } else {
        updateSettings({ customAbutmentTypes: uniq([...(settings.customAbutmentTypes || []), newVal]) });
      }
      setSelectedType(newVal);
      setValue('abutment_type', newVal, { shouldDirty: true });
    } else if (field === 'material') {
      updateSettings({ customMaterials: uniq([...(settings.customMaterials || []), newVal]) });
      setSelectedMat(newVal);
      setValue('material', newVal, { shouldDirty: true });
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
              value={selectedSystem}
              onValueChange={v => {
                if (v === ADD_NEW) { setAddingField('system'); return; }
                setSelectedSystem(v);
                setValue('system', v, { shouldDirty: true });
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
              value={selectedType}
              onValueChange={v => {
                if (v === ADD_NEW) { setAddingField('abutmentType'); return; }
                setSelectedType(v);
                setValue('abutment_type', v, { shouldDirty: true });
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
              value={selectedMat}
              onValueChange={v => {
                if (v === ADD_NEW) { setAddingField('material'); return; }
                setSelectedMat(v);
                setValue('material', v, { shouldDirty: true });
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

          {/* Stock Type */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Stock Type</Label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              {[{ value: 'sale', label: 'Sale' }, { value: 'returnable', label: 'Returnable' }].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStockType(opt.value)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    stockType === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" {...register('description')} placeholder="Short product description…" rows={2} />
          </div>

          {/* Image upload */}
          <div className="sm:col-span-2 space-y-2">
            <Label>Product Image</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-4 py-2 hover:bg-accent transition-colors text-sm">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : imageBase ? 'Replace Image' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {imageBase && (
                <button
                  type="button"
                  onClick={() => { setImageBase(''); setFocalX(50); setFocalY(50); }}
                  className="flex items-center gap-1 text-xs text-destructive hover:opacity-80"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
            <Input
              placeholder="Or paste image URL…"
              value={imageBase}
              onChange={e => {
                const parsed = parseImagePos(e.target.value);
                setImageBase(parsed.src);
                setFocalX(parsed.x);
                setFocalY(parsed.y);
              }}
            />
            {/* Focal point picker — only shown when an image is set */}
            {imageBase && (
              <FocalPointPicker
                src={imageBase}
                x={focalX}
                y={focalY}
                onChange={(x, y) => { setFocalX(x); setFocalY(y); }}
              />
            )}
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
