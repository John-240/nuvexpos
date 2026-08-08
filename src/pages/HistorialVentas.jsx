import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Filter, TrendingUp, Receipt, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import VentaDetalleDialog from '@/components/ventas/VentaDetalleDialog';

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia'];

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [metodo, setMetodo] = useState('');
  const [fechaBusqueda, setFechaBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    load();
    const unsub = base44.entities.Ventas.subscribe(() => load());
    return unsub;
  }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Ventas.list('-fecha_hora', 500);
      setVentas(data);
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    return ventas.filter((v) => {
      const f = new Date(v.fecha_hora);
      if (desde && f < new Date(desde + 'T00:00:00')) return false;
      if (hasta && f > new Date(hasta + 'T23:59:59')) return false;
      if (metodo && v.metodo_pago !== metodo) return false;
      if (fechaBusqueda) {
        const fb = new Date(fechaBusqueda + 'T00:00:00');
        const misma = f.getDate() === fb.getDate() && f.getMonth() === fb.getMonth() && f.getFullYear() === fb.getFullYear();
        if (!misma) return false;
      }
      return true;
    });
  }, [ventas, desde, hasta, metodo, fechaBusqueda]);

  const total = filtradas.reduce((s, v) => s + (v.monto_total || 0), 0);
  const ticketPromedio = filtradas.length ? total / filtradas.length : 0;

  const limpiarFiltros = () => { setDesde(''); setHasta(''); setMetodo(''); setFechaBusqueda(''); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Historial de Ventas</h1>
        <p className="text-slate-500 mt-1">Consulta y analiza todas tus ventas</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-slate-500 font-medium">Total del período</p><p className="text-xl font-bold text-slate-900">{formatCurrency(total)}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500 flex items-center justify-center"><Receipt className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-slate-500 font-medium">Transacciones</p><p className="text-xl font-bold text-slate-900">{filtradas.length}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-slate-500 font-medium">Ticket promedio</p><p className="text-xl font-bold text-slate-900">{formatCurrency(ticketPromedio)}</p></div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium"><Filter className="w-4 h-4" /> Filtros</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Método de pago</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todos</option>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Buscar por fecha</label>
            <Input type="date" value={fechaBusqueda} onChange={(e) => setFechaBusqueda(e.target.value)} />
          </div>
        </div>
        {(desde || hasta || metodo || fechaBusqueda) && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>Limpiar filtros</Button>
        )}
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay ventas en el período seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Fecha y hora</th>
                  <th className="text-right font-medium px-4 py-3">Monto total</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Método de pago</th>
                  <th className="text-right font-medium px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSeleccionada(v)}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(v.fecha_hora)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(v.monto_total)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{v.metodo_pago}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSeleccionada(v); }}>Ver detalle</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <VentaDetalleDialog venta={seleccionada} onClose={() => setSeleccionada(null)} />
    </div>
  );
}