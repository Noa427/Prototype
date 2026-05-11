import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header.jsx';
import { InstallPWA } from './InstallPWA';
import { useAuth } from '../App';

export const Layout = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (!user) return null;

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
            <InstallPWA />
        </div>
    );
};
