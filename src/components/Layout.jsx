import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Store, LogOut, History, Wallet, Settings, Users, Coins, ClipboardList } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

const allNavItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, admin: true },
  { label: 'Registro de Productos', path: '/productos', icon: Package, admin: true },
  { label: 'Caja', path: '/caja', icon: Coins, admin: false },
  { label: 'Punto de Venta', path: '/venta', icon: ShoppingCart, admin: false },
  { label: 'Historial de Ventas', path: '/historial', icon: History, admin: true },
  { label: 'Historial de Cajas', path: '/historial-cajas', icon: ClipboardList, admin: false },
  { label: 'Clientes', path: '/cobrar', icon: Users, admin: true },
  { label: 'Gastos', path: '/gastos', icon: Wallet, admin: true },
  { label: 'Configuración', path: '/configuracion', icon: Settings, admin: true },
];

export default function Layout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();
  const esAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const navItems = allNavItems.filter((i) => !i.admin || esAdmin);

  const NavList = ({ onNavigate }) => (
    <>
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              active ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-100 fixed inset-y-0 left-0">
        <div className="px-6 py-6 border-b border-slate-800">
          <Link to={esAdmin ? '/' : '/caja'} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight">NuvexPos</span>
              <p className="text-xs text-slate-400">Inventario & POS</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavList />
        </nav>
        <div className="px-3 py-3 border-t border-slate-800 flex items-center gap-1">
          <div className="flex-1 px-2 text-xs text-slate-400 truncate">{user?.email}</div>
          <ThemeToggle />
          <button onClick={() => logout()} title="Cerrar sesión" className="p-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white px-4 h-14 flex items-center justify-between">
        <Link to={esAdmin ? '/' : '/caja'} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">NuvexPos</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-slate-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-slate-900 py-2" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 pb-2">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-slate-800 mt-2 pt-2 flex items-center gap-2 px-5">
              <div className="flex-1 text-xs text-slate-400 truncate">{user?.email}</div>
              <button onClick={() => logout()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800">
                <LogOut className="w-5 h-5" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-64 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}