import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, Plus, ArrowRight, Bell, Wallet, X, CheckCircle2, PackageCheck } from 'lucide-react';
import { formatCurrency, formatDate, isToday } from '@/lib/format';
import { Button } from '@/components/ui/button';
import RestockDialog from '@/components/dashboard/RestockDialog';
import DashboardCharts from '@/components/dashboard/DashboardCharts';

export default function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restock, setRestock] = useState(null);

  useEffect(() => {
    loadData();
    const unsubP = base44.entities.Productos.subscribe(() => loadData());
    const unsubV = base44.entities.Ventas.subscribe(() => loadData());
    const unsubA = base44.entities.Alertas.subscribe(() => loadData());
    const unsubG = base44.entities.Gastos.subscribe(() => loadData());
    const unsubD = base44.entities.Detalles_Venta.subscribe(() => loadData());
    return () => { unsubP(); unsubV(); unsubA(); unsubG(); unsubD(); };
  }, []);

  const loadData = async () => {
    try {
      const [p, v, a, g, d] = await Promise.all([
        base44.entities.Productos.list(),
        base44.entities.Ventas.list('-fecha_hora', 200),
        base44.entities.Alertas.filter({ leida: false }, '-fecha', 30),
        base44.entities.Gastos.list('-fecha', 200),
        base44.entities.Detalles_Venta.list('-created_date', 500)
      ]);
      setProductos(p);
      setVentas(v);
      setAlertas(a.filter((x) => !x.descartada));
      setGastos(g);
      setDetalles(d);
    } finally {
      setLoading(false);
    }
  };

  const valorInventario = productos.reduce((s, p) => s + (p.stock_actual || 0) * (p.precio_costo || 0), 0);
  const ventasHoy = ventas.filter((v) => isToday(v.fecha_hora));
  const totalVentasHoy = ventasHoy.reduce((s, v) => s + (v.monto_total || 0), 0);
  const stockBajo = productos.filter((p) => (p.stock_actual || 0) <= (p.stock_minimo || 0));

  // Ganancia Real del mes = Total Ventas - Costo de productos vendidos - Gastos
  const ahora = new Date();
  const enMes = (f) => { const d = new Date(f); return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear(); };
  const ventasMes = ventas.filter((v) => enMes(v.fecha_hora));
  const totalVentasMes = ventasMes.reduce((s, v) => s + (v.monto_total || 0), 0);
  const ventaIdsMes = new Set(ventasMes.map((v) => v.id));
  const costoMap = new Map(productos.map((p) => [p.id, p.precio_costo || 0]));
  const cogsMes = detalles
    .filter((d) => ventaIdsMes.has(d.venta_id))
    .reduce((s, d) => s + (d.cantidad_vendida || 0) * (costoMap.get(d.producto_id) || 0), 0);
  const gastosMes = gastos.filter((g) => enMes(g.fecha)).reduce((s, g) => s + (g.monto || 0), 0);
  const gananciaReal = totalVentasMes - cogsMes - gastosMes;

  const marcarLeida = async (id) => { await base44.entities.Alertas.update(id, { leida: true }); };
  const descartar = async (id) => { await base44.entities.Alertas.update(id, { descartada: true, leida: true }); };

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
    { label: 'Ventas de hoy', value: formatCurrency(totalVentasHoy), sub: `${ventasHoy.length} transacciones`, icon: TrendingUp, color: 'bg-violet-500' },
    { label: 'Necesitan reabastecimiento', value: stockBajo.length, icon: PackageCheck, color: 'bg-rose-500' }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de tu tienda</p>
      </div>

      {/* Banner de alertas activas */}
      {alertas.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800">Alertas de stock bajo</h2>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">{alertas.length}</span>
          </div>
          <div className="space-y-2">
            {alertas.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 bg-white rounded-lg border border-amber-100 p-3">
                <div>
                  <p className="text-sm text-slate-700">⚠️ {a.mensaje}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(a.fecha)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => marcarLeida(a.id)} title="Marcar como revisada" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></button>
                  <button onClick={() => descartar(a.id)} title="Descartar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* Ganancia Real */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold">Ganancia Real del mes</h2>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(gananciaReal)}</p>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><p className="text-slate-400">Ventas</p><p className="font-semibold text-emerald-400">{formatCurrency(totalVentasMes)}</p></div>
          <div><p className="text-slate-400">Costo de productos</p><p className="font-semibold text-rose-400">-{formatCurrency(cogsMes)}</p></div>
          <div><p className="text-slate-400">Gastos</p><p className="font-semibold text-amber-400">-{formatCurrency(gastosMes)}</p></div>
        </div>
      </div>

      {/* Gráficos */}
      <DashboardCharts ventas={ventas} gastos={gastos} detalles={detalles} productos={productos} />

      {/* Quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link to="/productos" className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center"><Plus className="w-6 h-6 text-emerald-600" /></div>
              <div><p className="font-semibold text-slate-900">Registrar productos</p><p className="text-sm text-slate-500">Agrega o edita tu catálogo</p></div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/venta" className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-violet-600" /></div>
              <div><p className="font-semibold text-slate-900">Punto de venta</p><p className="text-sm text-slate-500">Procesa una nueva venta</p></div>
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
            <p className="text-sm text-slate-400 py-6 text-center">Todo el inventario está en niveles saludables. 🎉</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stockBajo.map((p) => {
                const critico = (p.stock_actual || 0) === 0;
                const faltan = Math.max((p.stock_minimo || 0) - (p.stock_actual || 0), 0);
                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${critico ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{p.nombre_producto}</p>
                      <p className="text-xs text-slate-500">{p.categoria || 'Sin categoría'} · Faltan {faltan} u. para el mínimo</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${critico ? 'text-red-600' : 'text-amber-600'}`}>{p.stock_actual} u.</p>
                        <p className="text-xs text-slate-400">Mín: {p.stock_minimo}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setRestock(p)} className="h-8">Reabastecer</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Notificaciones de stock</h2>
            <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">{alertas.length}</span>
          </div>
          {alertas.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin notificaciones pendientes.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {alertas.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-700">{a.mensaje}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(a.fecha)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => marcarLeida(a.id)} className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600" title="Revisada"><CheckCircle2 className="w-4 h-4" /></button>
                      <button onClick={() => descartar(a.id)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400" title="Descartar"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RestockDialog producto={restock} onClose={() => setRestock(null)} onUpdated={loadData} />
    </div>
  );
}