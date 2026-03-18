import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import Dashboard from './pages/Dashboard';
import Immobilier from './pages/Immobilier';
import AnalyseZone from './pages/AnalyseZone';
import Settings from './pages/Settings';

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
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    // Si un client tente d'accéder à une route admin, rediriger vers dashboard
    if (user.role === 'client' && requiredRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // Si un admin tente d'accéder à une route client, rediriger vers admin
    if (user.role === 'admin' && requiredRole === 'client') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    // Restaurer la session depuis localStorage au démarrage
    const savedUser = localStorage.getItem('sol_invictus_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData) => {
    setUser(userData);
    // Sauvegarder la session dans localStorage
    localStorage.setItem('sol_invictus_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    // Vider complètement le localStorage
    localStorage.removeItem('sol_invictus_user');
  };

  const authValue = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client'
  };

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          {/* Route de connexion */}
          <Route 
            path="/login" 
            element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={login} />
              )
            } 
          />
          
          {/* Route d'accueil - Redirection selon le rôle */}
          <Route 
            path="/" 
            element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Route Admin - Strictement réservée aux admins */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<div className="p-8"><h1 className="text-2xl font-bold text-white">Panneau d'Administration</h1></div>} />
          </Route>
          
          {/* Route Dashboard - Réservée aux clients */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requiredRole="client">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
          </Route>

          {/* Routes supplémentaires pour les clients */}
          <Route 
            path="/immobilier" 
            element={
              <ProtectedRoute requiredRole="client">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Immobilier />} />
          </Route>
          
          <Route 
            path="/analyse" 
            element={
              <ProtectedRoute requiredRole="client">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AnalyseZone />} />
          </Route>
          
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Settings />} />
          </Route>

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
