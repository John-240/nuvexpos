import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import CajaDetalleDialog from '@/components/caja/CajaDetalleDialog';

export default function HistorialCajas() {
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('');
  const [detalle, setDetalle] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Cajas.list('-fecha_apertura', 200);
      setCajas(data);
    } finally { setLoading(false); }
  };

  const filtradas = useMemo(() => cajas.filter((c) => {
    const f = new Date(c.fecha_apertura);
    if (desde && f < new Date(desde + 'T00:00:00')) return false;
    if (hasta && f > new Date(hasta + 'T23:59:59')) return false;
    if (estado && c.estado !== estado) return false;
    return true;
  }), [cajas, desde, hasta, estado]);

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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Historial de Cajas</h1>
        <p className="text-slate-500 mt-1">Consulta el historial de aperturas y cierres de caja</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium"><Filter className="w-4 h-4" /> Filtros</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todos</option>
              <option value="ABIERTA">Abierta</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </div>
        </div>
        {(desde || hasta || estado) && (
          <Button variant="ghost" size="sm" onClick={() => { setDesde(''); setHasta(''); setEstado(''); }}>Limpiar filtros</Button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay cajas en el período seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Caja</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Usuario</th>
                  <th className="text-left font-medium px-4 py-3">Apertura</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Cierre</th>
                  <th className="text-right font-medium px-4 py-3">Monto inicial</th>
                  <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Ventas</th>
                  <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Esperado</th>
                  <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Diferencia</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetalle(c)}>
                    <td className="px-4 py-3 font-medium text-slate-800">#{c.id.slice(-6)}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{c.nombre_usuario_apertura}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.fecha_apertura)}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{c.fecha_cierre ? formatDate(c.fecha_cierre) : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.monto_inicial)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(c.total_ventas)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{c.estado === 'CERRADA' ? formatCurrency(c.efectivo_esperado) : '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold hidden md:table-cell ${c.estado === 'CERRADA' && Math.abs(c.diferencia) >= 0.01 ? (c.diferencia < 0 ? 'text-red-600' : 'text-amber-600') : 'text-slate-700'}`}>
                      {c.estado === 'CERRADA' ? `${c.diferencia < 0 ? '-' : '+'}${formatCurrency(Math.abs(c.diferencia))}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${c.estado === 'ABIERTA' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CajaDetalleDialog caja={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}