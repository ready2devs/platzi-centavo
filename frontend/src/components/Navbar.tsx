import React from 'react';
import { LogOut, User as UserIcon, Coins } from 'lucide-react';
import { User } from '../types/auth';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1">
              Centavo <span className="text-emerald-600">.</span>
            </span>
            <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
              Finanzas Personales
            </span>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <UserIcon className="w-4 h-4 text-emerald-600" />
            <span className="font-medium hidden sm:inline">{user?.name || user?.email || 'Usuario'}</span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>

      </div>
    </header>
  );
};
