import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function ClienteFiadoSelector({ value, onChange, total }) {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    base44.entities.Clientes.list().then(setClientes).catch(() => {});
  }, []);

  const resultados = useMemo(() => {
    if (!busqueda.trim()) return clientes.slice(0, 6);
    const q = busqueda.toLowerCase();
    return clientes
      .filter((c) => (c.nombre || '').toLowerCase().includes(q) || (c.telefono || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [busqueda, clientes]);

  const saldo = Number(value?.saldo_pendiente) || 0;
  const limite = Number(value?.limite_credito) || 0;
  const disponible = limite - saldo;
  const insuficiente = value && total > disponible;

  if (value) {
    return (
      <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{value.nombre}</p>
            <p className="text-xs text-slate-500">{value.telefono || 'Sin teléfono'}</p>
            <p className="text-xs mt-1">
              Saldo: <span className="font-medium text-slate-700">{formatCurrency(saldo)}</span> · Disponible:{' '}
              <span className={cn('font-medium', insuficiente ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(Math.max(disponible, 0))}</span>
            </p>
            {insuficiente && <p className="text-xs text-red-600 mt-1">Crédito insuficiente para esta venta</p>}
          </div>
          <button onClick={() => onChange(null)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente por nombre o teléfono..." className="pl-9 h-9" autoFocus />
      </div>
      {resultados.length > 0 && (
        <div className="mt-2 space-y-1">
          {resultados.map((c) => {
            const cDispo = (Number(c.limite_credito) || 0) - (Number(c.saldo_pendiente) || 0);
            return (
              <button
                key={c.id}
                onClick={() => { onChange(c); setBusqueda(''); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.nombre}</p>
                  <p className="text-xs text-slate-400">{c.telefono || 'Sin teléfono'}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0 ml-2">Disp: {formatCurrency(Math.max(cDispo, 0))}</span>
              </button>
            );
          })}
        </div>
      )}
      {busqueda.trim() && resultados.length === 0 && (
        <p className="text-xs text-slate-400 mt-2 text-center">No se encontraron clientes. Crea el cliente desde "Clientes y Cobranza".</p>
      )}
    </div>
  );
}