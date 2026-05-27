import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

export function usePermissions() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const sp = settings.subUserPermissions ?? {};

  if (isAdmin) {
    return {
      canLogStock: true,
      canExportCSV: true,
      canViewHistory: true,
      canViewPricing: settings.showPricing,
      canPrintDispatch: true,
      canManageComponents: true,
    };
  }

  return {
    canLogStock: sp.canLogStock ?? false,
    canExportCSV: sp.canExportCSV ?? true,
    canViewHistory: sp.canViewHistory ?? true,
    canViewPricing: settings.showPricing && (sp.canViewPricing ?? true),
    canPrintDispatch: sp.canPrintDispatch ?? true,
    canManageComponents: sp.canManageComponents ?? false,
  };
}
