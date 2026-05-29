import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DispatchProvider } from '@/context/DispatchContext';
import { SettingsProvider } from '@/context/SettingsContext';
import Auth from '@/pages/Auth';
import Catalog from '@/pages/Catalog';
import Screws from '@/pages/Screws';
import Stock from '@/pages/Stock';
import Admin from '@/pages/Admin';
import OrderSlip from '@/pages/OrderSlip';
import HistoryPage from '@/pages/History';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/catalog" replace /> : <Auth />}
      />
      <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
      <Route path="/screws" element={<ProtectedRoute><Screws /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/slip" element={<ProtectedRoute><OrderSlip /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/catalog" replace />} />
      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
      <AuthProvider>
        <DispatchProvider>
          <AppRoutes />
        </DispatchProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                border: '1px solid hsl(220 13% 91%)',
                color: 'hsl(224 71% 4%)',
              },
            }}
          />
      </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
