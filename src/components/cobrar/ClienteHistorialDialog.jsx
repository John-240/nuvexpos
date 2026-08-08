import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/format';

export default function ClienteHistorialDialog({ cliente, onClose }) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    setLoading(true);
    base44.entities.Ventas
      .filter({ cliente_id: cliente.id }, '-fecha_hora', 100)
      .then(setVentas)
      .finally(() => setLoading(false));
  }, [cliente?.id]);

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de crédito · {cliente?.nombre}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-slate-400 py-4">Cargando...</p>
        ) : ventas.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Sin ventas a crédito registradas.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {ventas.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">{formatCurrency(v.monto_total)}</p>
                  <p className="text-xs text-slate-400">{formatDate(v.fecha_hora)}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  v.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600' :
                  v.estado === 'Anulada' ? 'bg-red-50 text-red-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {v.estado || 'Pagado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}