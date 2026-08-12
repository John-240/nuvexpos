import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeftRight, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';

const TIPOS = ['APERTURA', 'VENTA', 'INGRESO', 'RETIRO', 'DEVOLUCION', 'AJUSTE', 'CIERRE'];

const tipoColor = (t) => {
  if (t === 'APERTURA' || t === 'INGRESO' || t === 'VENTA') return 'bg-emerald-50 text-emerald-700';
  if (t === 'RETIRO' || t === 'DEVOLUCION') return 'bg-amber-50 text-amber-700';
  if (t === 'CIERRE') return 'bg-slate-200 text-slate-700';
  return 'bg-blue-50 text-blue-700';
};

export default function MovimientosCaja() {
  const { user } = useAuth();
  const esAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [cajas, setCajas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cajaSel, setCajaSel] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const cajasData = esAdmin
        ? await base44.entities.Cajas.list('-fecha_apertura', 200)
        : await base44.entities.Cajas.filter({ usuario_apertura: user.id }, '-fecha_apertura', 200);
      setCajas(cajasData);
      const abierta = cajasData.find((c) => c.estado === 'ABIERTA');
      setCajaSel(abierta ? abierta.id : '');
      const movs = await base44.entities.Movimientos_Caja.list('-fecha_hora', 1000);
      setMovimientos(movs);
    } finally { setLoading(false); }
  };

  const filtrados = useMemo(() => movimientos.filter((m) => {
    if (cajaSel && m.caja_id !== cajaSel) return false;
    if (tipo && m.tipo !== tipo) return false;
    const f = new Date(m.fecha_hora);
    if (desde && f < new Date(desde + 'T00:00:00')) return false;
    if (hasta && f > new Date(hasta + 'T23:59:59')) return false;
    return true;
  }), [movimientos, cajaSel, tipo, desde, hasta]);

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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Movimientos de Caja</h1>
        <p className="text-slate-500 mt-1">Consulta los movimientos de la caja actual o de cajas cerradas</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium"><Filter className="w-4 h-4" /> Filtros</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Caja</label>
            <select value={cajaSel} onChange={(e) => setCajaSel(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todas</option>
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>#{c.id.slice(-6)} · {c.estado} · {formatDate(c.fecha_apertura)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        {(cajaSel || tipo || desde || hasta) && (
          <Button variant="ghost" size="sm" onClick={() => { setCajaSel(''); setTipo(''); setDesde(''); setHasta(''); }}>Limpiar filtros</Button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ArrowLeftRight className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay movimientos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Fecha y hora</th>
                  <th className="text-left font-medium px-4 py-3">Tipo</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Caja</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Usuario</th>
                  <th className="text-left font-medium px-4 py-3">Motivo</th>
                  <th className="text-right font-medium px-4 py-3">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((m) => {
                  const sign = (m.tipo === 'RETIRO' || m.tipo === 'DEVOLUCION') ? '-' : '+';
                  const montoColor = (m.tipo === 'RETIRO' || m.tipo === 'DEVOLUCION') ? 'text-amber-600' : (m.tipo === 'VENTA' || m.tipo === 'INGRESO' || m.tipo === 'APERTURA') ? 'text-emerald-600' : 'text-slate-700';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(m.fecha_hora)}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${tipoColor(m.tipo)}`}>{m.tipo}</span></td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">#{(m.caja_id || '').slice(-6)}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{m.nombre_usuario || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{m.motivo || '—'}{m.metodo_pago ? ` · ${m.metodo_pago}` : ''}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${montoColor}`}>{sign}{formatCurrency(m.monto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}