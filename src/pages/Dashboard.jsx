import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, Plus, ArrowRight, Bell } from 'lucide-react';
import { formatCurrency, formatDate, isToday } from '@/lib/format';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsubP = base44.entities.Productos.subscribe(() => loadData());
    const unsubV = base44.entities.Ventas.subscribe(() => loadData());
    const unsubA = base44.entities.Alertas.subscribe(() => loadData());
    return () => { unsubP(); unsubV(); unsubA(); };
  }, []);

  const loadData = async () => {
    try {
      const [p, v, a] = await Promise.all([
        base44.entities.Productos.list(),
        base44.entities.Ventas.list('-fecha_hora', 50),
        base44.entities.Alertas.filter({ leida: false }, '-fecha', 20)
      ]);
      setProductos(p);
      setVentas(v);
      setAlertas(a);
    } finally {
      setLoading(false);
    }
  };

  const valorInventario = productos.reduce((sum, p) => sum + (p.stock_actual || 0) * (p.precio_costo || 0), 0);
  const ventasHoy = ventas.filter((v) => isToday(v.fecha_hora));
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + (v.monto_total || 0), 0);
  const stockBajo = productos.filter((p) => (p.stock_actual || 0) <= (p.stock_minimo || 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Total de productos', value: productos.length, icon: Package, color: 'bg-blue-500' },
    { label: 'Valor del inventario', value: formatCurrency(valorInventario), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Ventas de hoy', value: formatCurrency(totalVentasHoy), sub: `${ventasHoy.length} transacciones`, icon: TrendingUp, color: 'bg-violet-500' }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de tu tienda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1.5">{s.value}</p>
                  {s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
                </div>
                <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link to="/productos" className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Plus className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Registrar productos</p>
                <p className="text-sm text-slate-500">Agrega o edita tu catálogo</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/venta" className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Punto de venta</p>
                <p className="text-sm text-slate-500">Procesa una nueva venta</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock bajo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-slate-900">Productos con stock bajo</h2>
            <span className="ml-auto text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">{stockBajo.length}</span>
          </div>
          {stockBajo.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No hay productos con stock bajo.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {stockBajo.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.nombre_producto}</p>
                    <p className="text-xs text-slate-500">{p.categoria || 'Sin categoría'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{p.stock_actual} u.</p>
                    <p className="text-xs text-slate-400">Mín: {p.stock_minimo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas / Notificaciones */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Notificaciones de stock</h2>
            <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">{alertas.length}</span>
          </div>
          {alertas.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin notificaciones pendientes.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {alertas.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-sm text-slate-700">{a.mensaje}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(a.fecha)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}