import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import Dashboard from './pages/Dashboard';
import Immobilier from './pages/Immobilier';
import AnalyseZone from './pages/AnalyseZone';
import Settings from './pages/Settings';
import Leads from './pages/Leads';
import AdminKPI from './pages/AdminKPI';
import AdminAgencies from './pages/AdminAgencies';
import LicenseGuard from './components/LicenseGuard';
import Onboarding from './pages/Onboarding';
import CalendarSettings from './pages/CalendarSettings';
import Automation from './pages/Automation';
import Campaigns from './pages/Campaigns';
import Reporting from './pages/Reporting';
import Signatures from './pages/Signatures';
import Mandates from './pages/Mandates';
import Rentals from './pages/Rentals';
import Conversations from './pages/Conversations';
import ChannelSettings from './pages/ChannelSettings';

// Contexte d'authentification
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Composant de protection des routes
// roles: null = tout le monde connecté, "admin" = admin seulement, "staff" = client+commercial
const ProtectedRoute = ({ children, roles = null }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles === "admin" && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (roles === "staff" && !["client", "commercial", "admin"].includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    // Restaurer la session depuis localStorage au démarrage
    const savedUser = localStorage.getItem('aevum_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [userSettings, setUserSettings] = useState(() => {
    // Restaurer les paramètres utilisateur depuis localStorage
    const savedSettings = localStorage.getItem('aevum_settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      notifications: {
        newProperties: true,
        zoneReports: true,
        securityAlerts: true
      }
    };
  });

  const login = (userData) => {
    // Stocker uniquement les infos user — le token JWT est dans le cookie HttpOnly
    const { access_token, ...userInfo } = userData;
    setUser(userInfo);
    localStorage.setItem('aevum_user', JSON.stringify(userInfo));
  };

  const logout = async () => {
    try { await fetch('http://localhost:8000/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setUser(null);
    localStorage.removeItem('aevum_user');
    localStorage.removeItem('aevum_settings');
  };

  const updateUserProfile = (profileData) => {
    const updatedUser = { ...user, ...profileData };
    setUser(updatedUser);
    localStorage.setItem('aevum_user', JSON.stringify(updatedUser));
  };

  const updateUserSettings = (newSettings) => {
    setUserSettings(newSettings);
    localStorage.setItem('aevum_settings', JSON.stringify(newSettings));
  };

  const authValue = {
    user,
    userSettings,
    login,
    logout,
    updateUserProfile,
    updateUserSettings,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client'
  };

  return (
    <AuthContext.Provider value={authValue}>
      <LicenseGuard>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <Login onLogin={login} />
          } />
          <Route path="/" element={
            user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <Navigate to="/login" replace />
          } />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles="admin"><Layout /></ProtectedRoute>}>
            <Route index element={<AdminPanel />} />
          </Route>
          <Route path="/admin/kpi" element={<ProtectedRoute roles="admin"><Layout /></ProtectedRoute>}>
            <Route index element={<AdminKPI />} />
          </Route>
          <Route path="/admin/agencies" element={<ProtectedRoute roles="admin"><Layout /></ProtectedRoute>}>
            <Route index element={<AdminAgencies />} />
          </Route>

          {/* Staff (client + commercial + admin) */}
          <Route path="/dashboard" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/immobilier" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Immobilier />} />
          </Route>
          <Route path="/analyse" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<AnalyseZone />} />
          </Route>
          <Route path="/leads" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Leads />} />
          </Route>
          <Route path="/automation" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Automation />} />
          </Route>
          <Route path="/settings" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Settings />} />
          </Route>
          <Route path="/settings/calendar" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<CalendarSettings />} />
          </Route>
          <Route path="/onboarding" element={<ProtectedRoute roles="staff"><Onboarding /></ProtectedRoute>} />
          <Route path="/campaigns" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Campaigns />} />
          </Route>
          <Route path="/reporting" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Reporting />} />
          </Route>
          <Route path="/signatures" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Signatures />} />
          </Route>
          <Route path="/mandates" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Mandates />} />
          </Route>
          <Route path="/rentals" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Rentals />} />
          </Route>
          <Route path="/conversations" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Conversations />} />
          </Route>
          <Route path="/settings/canaux" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<ChannelSettings />} />
          </Route>

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </LicenseGuard>
    </AuthContext.Provider>
  );
}

export default App;
