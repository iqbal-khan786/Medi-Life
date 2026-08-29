import React from 'react';
import { LogOut, User, ShieldCheck, RefreshCw, Building2 } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ currentUser, currentRole, onLogout, onSwitchPortal, onRefresh, isRefreshing }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Hospital Brand */}
          <Logo size="md" />

          {/* User Status, Role Indicator, and Navigation */}
          {currentUser && (
            <div className="flex items-center space-x-3">
              {/* Role badge */}
              <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                currentRole === 'management'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}>
                {currentRole === 'management' ? <ShieldCheck className="w-4 h-4 text-amber-600" /> : <User className="w-4 h-4 text-sky-600" />}
                <span>{currentRole === 'management' ? 'Management Portal' : 'Patient Portal'}</span>
              </div>

              {/* User Profile display */}
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-800">{currentUser.name}</div>
                <div className="text-xs text-slate-500 font-mono">{currentUser.id} {currentUser.role ? `• ${currentUser.role}` : ''}</div>
              </div>

              {/* Refresh button */}
              <button
                onClick={onRefresh}
                title="Refresh Live Data"
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition border border-slate-200"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
              </button>

              {/* Quick Switch Portal (if Management wants to view patient perspective) */}
              {currentUser.id.startsWith('STAFF') && (
                <button
                  onClick={onSwitchPortal}
                  className="hidden lg:flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 border border-slate-200 transition"
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Switch to {currentRole === 'management' ? 'Patient View' : 'Admin View'}</span>
                </button>
              )}

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
