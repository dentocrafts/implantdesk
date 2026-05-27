import { useState } from 'react';
import { Sun, Moon, Monitor, RotateCcw, Save, Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useSettings, SETTINGS_DEFAULTS } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function SettingSection({ title, description, children }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <div className="sm:w-52 shrink-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark',  label: 'Dark',  icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPanel({ isAdmin = true }) {
  const { settings, updateSettings, resetSettings } = useSettings();

  // Local draft state so changes only apply on Save
  const [draft, setDraft] = useState({ ...settings });
  const [uploading, setUploading] = useState(false);

  // Theme applies immediately (live preview)
  function handleThemeChange(theme) {
    setDraft(d => ({ ...d, theme }));
    updateSettings({ theme });
  }

  function set(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function setWaField(key, value) {
    setDraft(d => ({ ...d, waFields: { ...d.waFields, [key]: value } }));
  }

  function setSubPerm(key, value) {
    setDraft(d => ({ ...d, subUserPermissions: { ...d.subUserPermissions, [key]: value } }));
  }

  // Logo upload — saves immediately (no Save button needed)
  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/lab-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      updateSettings({ logoUrl: data.publicUrl });
      setDraft(d => ({ ...d, logoUrl: data.publicUrl }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleRemoveLogo() {
    updateSettings({ logoUrl: '' });
    setDraft(d => ({ ...d, logoUrl: '' }));
    toast.success('Logo removed');
  }

  function handleSave() {
    updateSettings(draft);
    toast.success('Settings saved');
  }

  function handleReset() {
    if (!confirm('Reset all settings to defaults?')) return;
    resetSettings();
    setDraft({ ...SETTINGS_DEFAULTS });
    toast.success('Settings reset to defaults');
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Appearance ── */}
      {isAdmin && <SettingSection
        title="Appearance"
        description="Choose how the app looks. System follows your device's preference."
      >
        <SettingRow label="Theme">
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  draft.theme === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingSection>}

      {/* ── Branding ── */}
      {isAdmin && <SettingSection
        title="Branding"
        description="Your logo appears in the navbar and on printed dispatch slips. Recommended: square PNG or SVG, at least 256×256px."
      >
        <SettingRow label="Lab Logo" hint="Saved instantly on upload">
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {settings.logoUrl
                ? <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
              }
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              <label className={cn(
                'flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                uploading
                  ? 'opacity-50 pointer-events-none border-border text-muted-foreground'
                  : 'border-border hover:bg-accent text-foreground'
              )}>
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading…' : settings.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </label>
              {settings.logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-2 text-xs text-destructive hover:opacity-80 transition-opacity"
                >
                  <X className="h-3 w-3" />
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </SettingRow>
      </SettingSection>}

      {/* ── Lab Information ── */}
      {isAdmin && <SettingSection
        title="Lab / Clinic Information"
        description="Shown in the navbar, printed dispatch slips, and exported documents."
      >
        <SettingRow label="Lab Name" hint="Appears in the navbar logo and print header">
          <Input
            value={draft.labName}
            onChange={e => set('labName', e.target.value)}
            placeholder="e.g. DentoCrafts Lab"
          />
        </SettingRow>
        <SettingRow label="Tagline" hint="Subtitle shown on printed dispatch slips">
          <Input
            value={draft.labTagline}
            onChange={e => set('labTagline', e.target.value)}
            placeholder="e.g. Precision Dental Solutions"
          />
        </SettingRow>
      </SettingSection>}

      {/* ── Display ── */}
      {isAdmin && <SettingSection
        title="Display"
        description="Control what information is visible across the app."
      >
        <SettingRow label="Show Pricing" hint="Hides all prices in catalog, stock, and dispatch when off">
          <Switch
            checked={draft.showPricing}
            onCheckedChange={v => set('showPricing', v)}
          />
        </SettingRow>
      </SettingSection>}

      {/* ── Inventory ── */}
      {isAdmin && <SettingSection
        title="Inventory"
        description="Controls how stock levels are flagged across the app."
      >
        <SettingRow
          label="Low Stock Threshold"
          hint="Items at or below this quantity are marked as Low Stock"
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={100}
              value={draft.lowStockThreshold}
              onChange={e => set('lowStockThreshold', Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">units</span>
          </div>
        </SettingRow>
      </SettingSection>}

      {/* ── Dispatch / WhatsApp ── */}
      <SettingSection
        title="Dispatch & WhatsApp"
        description="Customise the default text and which fields appear in copied WhatsApp messages."
      >
        <SettingRow
          label="Default Status Text"
          hint="The *Status:* line at the bottom of WhatsApp messages"
        >
          <Input
            value={draft.waStatusText}
            onChange={e => set('waStatusText', e.target.value)}
            placeholder="e.g. Pending Dispatch"
          />
        </SettingRow>
        <SettingRow label="Include Case ID" hint="Show *Case ID:* in copied message">
          <Switch
            checked={draft.waFields?.caseId ?? true}
            onCheckedChange={v => setWaField('caseId', v)}
          />
        </SettingRow>
        <SettingRow label="Include Patient Name" hint="Show *Patient Name:* line (blank, staff fills manually)">
          <Switch
            checked={draft.waFields?.patientName ?? true}
            onCheckedChange={v => setWaField('patientName', v)}
          />
        </SettingRow>
        <SettingRow label="Include Notes" hint="Show *Notes:* if notes are present">
          <Switch
            checked={draft.waFields?.notes ?? true}
            onCheckedChange={v => setWaField('notes', v)}
          />
        </SettingRow>
        <SettingRow label="Include Component Code" hint="Show (code) after each component name">
          <Switch
            checked={draft.waFields?.componentCode ?? true}
            onCheckedChange={v => setWaField('componentCode', v)}
          />
        </SettingRow>
        <SettingRow label="Include Status" hint="Show *Status:* line at the bottom">
          <Switch
            checked={draft.waFields?.status ?? true}
            onCheckedChange={v => setWaField('status', v)}
          />
        </SettingRow>
      </SettingSection>

      {/* ── Sub-user Permissions ── */}
      {isAdmin && <SettingSection
        title="Sub-user Permissions"
        description="Controls what non-admin staff can do. Admins always have full access regardless of these settings."
      >
        <SettingRow label="Manage Components" hint="Allow staff to add, edit, deactivate, or delete components">
          <Switch
            checked={draft.subUserPermissions?.canManageComponents ?? false}
            onCheckedChange={v => setSubPerm('canManageComponents', v)}
          />
        </SettingRow>
        <SettingRow label="Log Stock Movements" hint="Allow staff to use Outward / Inward / Received buttons">
          <Switch
            checked={draft.subUserPermissions?.canLogStock ?? false}
            onCheckedChange={v => setSubPerm('canLogStock', v)}
          />
        </SettingRow>
        <SettingRow label="View Stock History" hint="Allow staff to see the movement history tab">
          <Switch
            checked={draft.subUserPermissions?.canViewHistory ?? true}
            onCheckedChange={v => setSubPerm('canViewHistory', v)}
          />
        </SettingRow>
        <SettingRow label="View Pricing" hint="Allow staff to see component prices">
          <Switch
            checked={draft.subUserPermissions?.canViewPricing ?? true}
            onCheckedChange={v => setSubPerm('canViewPricing', v)}
          />
        </SettingRow>
        <SettingRow label="Export CSV" hint="Allow staff to export catalog and screws to CSV">
          <Switch
            checked={draft.subUserPermissions?.canExportCSV ?? true}
            onCheckedChange={v => setSubPerm('canExportCSV', v)}
          />
        </SettingRow>
        <SettingRow label="Print Dispatch Slips" hint="Allow staff to print or save dispatch slips as PDF">
          <Switch
            checked={draft.subUserPermissions?.canPrintDispatch ?? true}
            onCheckedChange={v => setSubPerm('canPrintDispatch', v)}
          />
        </SettingRow>
      </SettingSection>}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Defaults
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
