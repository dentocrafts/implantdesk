import { Navigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ComponentManager from '@/components/admin/ComponentManager';
import SettingsPanel from '@/components/admin/SettingsPanel';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Settings2, SlidersHorizontal } from 'lucide-react';

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const { canManageComponents } = usePermissions();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'settings' ? 'settings' : 'components';

  if (loading) return null;
  if (!isAdmin && !canManageComponents) return <Navigate to="/catalog" replace />;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage components and app settings</p>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="components" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Components
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="components" className="mt-4">
            <ComponentManager />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="mt-4">
              <SettingsPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
