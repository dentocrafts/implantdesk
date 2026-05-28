import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'implantdesk-settings';

export const SETTINGS_DEFAULTS = {
  theme: 'light',
  logoUrl: '',
  labName: 'ImplantDesk',
  labTagline: 'Dental Implant Component Management',
  lowStockThreshold: 5,
  waStatusText: 'Pending Dispatch',
  showPricing: true,
  // Custom hex colours per system name, e.g. { Osstem: '#ff6600' }
  systemColors: {},
  // User-added catalog options
  customSystems: [],
  customAbutmentTypes: [],
  customScrewTypes: [],
  customMaterials: [],
  // Built-in options the user has chosen to hide from dropdowns
  hiddenSystems: [],
  hiddenAbutmentTypes: [],
  hiddenScrewTypes: [],
  hiddenMaterials: [],
  // Built-in options the user has permanently deleted (removed from all dropdowns and filters)
  deletedSystems: [],
  deletedAbutmentTypes: [],
  deletedScrewTypes: [],
  deletedMaterials: [],
  waFields: {
    caseId: true,
    patientName: true,
    notes: true,
    componentCode: true,
    status: true,
  },
  subUserPermissions: {
    canLogStock: false,
    canExportCSV: true,
    canViewHistory: true,
    canViewPricing: true,
    canPrintDispatch: true,
    canManageComponents: false,
  },
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) } : { ...SETTINGS_DEFAULTS };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings({ ...SETTINGS_DEFAULTS });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
