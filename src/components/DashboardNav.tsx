"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BarChart3, Target, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const DashboardNav: React.FC = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Analysis', href: '/', icon: BarChart3 },
    { label: 'Progression', href: '/progression', icon: Target },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <nav className="bg-white/[0.03] backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-black uppercase tracking-tighter text-lg hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded" />
            <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">Detective</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-400'
                      : 'text-white/60 hover:text-white/80 border border-transparent hover:border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                {session?.user?.email?.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">{session?.user?.email}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-semibold uppercase tracking-wider text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-400'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default DashboardNav;
