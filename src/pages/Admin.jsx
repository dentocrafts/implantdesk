import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ComponentManager from '@/components/admin/ComponentManager';
import SettingsPanel from '@/components/admin/SettingsPanel';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Settings2, SlidersHorizontal } from 'lucide-react';

export default function Admin() {
  const { isAdmin, loading, user } = useAuth();
  const { canManageComponents } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const hasComponentAccess = isAdmin || canManageComponents;

  // Derive the intended tab from the URL each render
  const resolvedTab =
    searchParams.get('tab') === 'settings' || !hasComponentAccess ? 'settings' : 'components';

  // Controlled tab state — initialised from URL
  const [activeTab, setActiveTab] = useState(resolvedTab);

  // Sync whenever the URL param changes (e.g. navbar "Settings" click while already on /admin)
  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }

  if (loading) return null;
  if (!user) return <Navigate to="/catalog" replace />;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">{hasComponentAccess ? 'Admin Panel' : 'Settings'}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasComponentAccess ? 'Manage components and app settings' : 'Manage app settings'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full sm:w-auto">
            {hasComponentAccess && (
              <TabsTrigger value="components" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Components
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {hasComponentAccess && (
            <TabsContent value="components" className="mt-4">
              <ComponentManager />
            </TabsContent>
          )}

          <TabsContent value="settings" className="mt-4">
            <SettingsPanel isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
