import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Auditoria.list('-fecha_hora', 500);
      setRegistros(data);
    } finally { setLoading(false); }
  };

  const filtrados = useMemo(() => registros.filter((r) => {
    if (accion && r.accion !== accion) return false;
    const f = new Date(r.fecha_hora);
    if (desde && f < new Date(desde + 'T00:00:00')) return false;
    if (hasta && f > new Date(hasta + 'T23:59:59')) return false;
    return true;
  }), [registros, accion, desde, hasta]);

  const accionesUnicas = useMemo(() => [...new Set(registros.map((r) => r.accion))].sort(), [registros]);

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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Auditoría</h1>
        <p className="text-slate-500 mt-1">Registro inmutable de acciones sensibles del sistema</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium"><Filter className="w-4 h-4" /> Filtros</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Acción</label>
            <select value={accion} onChange={(e) => setAccion(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todas</option>
              {accionesUnicas.map((a) => <option key={a} value={a}>{a}</option>)}
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
        {(accion || desde || hasta) && (
          <Button variant="ghost" size="sm" onClick={() => { setAccion(''); setDesde(''); setHasta(''); }}>Limpiar filtros</Button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay registros de auditoría con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Fecha y hora</th>
                  <th className="text-left font-medium px-4 py-3">Acción</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Usuario</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Entidad</th>
                  <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Registro</th>
                  <th className="text-left font-medium px-4 py-3">Información</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(r.fecha_hora)}</td>
                    <td className="px-4 py-3"><span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{r.accion}</span></td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{r.nombre_usuario || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.entidad || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell font-mono text-xs">{r.registro_afectado ? `#${r.registro_afectado.slice(-6)}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={r.informacion}>{r.informacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}