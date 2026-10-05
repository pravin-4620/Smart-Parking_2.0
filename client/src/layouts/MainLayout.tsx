import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const MainLayout: React.FC = () => {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <Navbar />

      <main className="app-main flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="app-footer border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-2">SmartPark · A simpler way to park · © 2026</p>
      </footer>
    </div>
  );
};
