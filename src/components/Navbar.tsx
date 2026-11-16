import React, { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppView = 'dashboard' | 'tree' | 'register' | 'archive' | 'guide' | 'admin';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, onNavigate }) => {
  const { user, isAdmin, hasStewardAccess, theme, toggleTheme, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tree', label: 'Family Tree' },
    { id: 'register', label: 'Register' },
    { id: 'archive', label: 'Archive' },
    { id: 'guide', label: 'FamilyGuide AI' },
  ];

  if (hasStewardAccess) {
    navItems.push({ id: 'admin', label: isAdmin ? 'Family Head' : 'Branch Admin' });
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[#E2E8F0]/75 bg-[#FAF9F6]/80 text-[#0F2342] backdrop-blur-md dark:border-[#1E3252]/80 dark:bg-[#081120]/80 dark:text-[#F8FAFC]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="font-display text-xl font-semibold tracking-tight text-[#0F2342] dark:text-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer"
        >
          OurLegacy
        </button>

        {/* Zone 2: Clean single-line text links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0F2342] dark:text-[#D4AF37] font-semibold'
                    : 'text-[#475569] hover:text-[#0F2342] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C99A2E] dark:bg-[#D4AF37]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + utility theme switch */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white/70 text-[#0F2342] hover:bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]/70 dark:text-[#F8FAFC] dark:hover:bg-[#0F1D33] transition-colors cursor-pointer"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#D4AF37]" />}
          </button>

          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193561] dark:bg-[#D4AF37] dark:text-[#081120] dark:hover:bg-[#E2C052] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#0F2342] dark:border-[#1E3252] dark:text-[#F8FAFC] cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-[#FAF9F6]/95 px-4 py-3 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#081120]/95">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                  activeView === item.id
                    ? 'bg-[#0F2342] text-white dark:bg-[#1E3252] dark:text-[#D4AF37]'
                    : 'text-[#334155] dark:text-[#CBD5E1]'
                }`}
              >
                {item.label}
              </button>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void signOut();
                }}
                className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-left text-sm font-semibold text-[#0F2342] dark:border-[#1E3252] dark:text-[#F8FAFC]"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
