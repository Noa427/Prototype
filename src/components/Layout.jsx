import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header.jsx';
import { useAuth } from '../App';

export const Layout = () => {
    const { user } = useAuth();

    // Vérification de sécurité supplémentaire
    if (!user) {
        return null;
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
            {/* ConfigPanel removed for Client Interface */}
        </div>
    );
};
