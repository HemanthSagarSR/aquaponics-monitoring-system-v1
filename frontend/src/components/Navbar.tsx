import React from 'react';
import { PageTab, SystemStatus } from '../types';
import {
  Activity,
  Droplets,
  Sprout,
  BarChart2,
  Settings,
  Bell,
  Cpu,
  Fish
} from 'lucide-react';

interface NavbarProps {
  currentTab: PageTab;
  onSelectTab: (tab: PageTab) => void;
  systemStatus: SystemStatus | null;
  wsConnected: boolean;
  onOpenAlerts: () => void;
  unreadAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  systemStatus,
  wsConnected,
  onOpenAlerts,
  unreadAlertsCount,
}) => {
  const isDemo = systemStatus?.app_mode === 'demo';

  const navItems: Array<{ id: PageTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'water', label: 'Water Monitoring', icon: <Droplets className="w-4 h-4" /> },
    { id: 'plants', label: 'Plant Growth', icon: <Sprout className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
    { id: 'fish', label: 'Fish Tank', icon: <Fish className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                AQUAPONICS<span className="text-teal-400 font-mono font-normal ml-1">V1</span>
              </span>
              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold ${
                isDemo
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {isDemo ? 'DEMO MODE' : 'LIVE ESP32'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">IoT Sensor Acquisition & Research Platform</p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: WS Status & Alerts Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WebSocket Live Stream Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400 hidden sm:inline">
              {wsConnected ? 'WS LIVE' : 'WS RECONNECTING'}
            </span>
          </div>

          {/* Alerts Quick Drawer Button */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 transition-colors"
            title="System Alerts Drawer"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around bg-slate-950 border-t border-white/10 py-2 px-1 overflow-x-auto">
        {navItems.map((item) => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                active ? 'text-teal-400' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
