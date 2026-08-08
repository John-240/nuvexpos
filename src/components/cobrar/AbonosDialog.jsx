import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/format';

export default function AbonosDialog({ cliente, onClose }) {
  const [abonos, setAbonos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    setLoading(true);
    base44.entities.Abonos
      .filter({ cliente_id: cliente.id }, '-fecha', 100)
      .then(setAbonos)
      .finally(() => setLoading(false));
  }, [cliente?.id]);

  const totalAbonado = abonos.reduce((s, a) => s + (Number(a.monto) || 0), 0);

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Abonos de {cliente?.nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm mb-3">
          <span>Saldo actual: <span className="font-semibold text-slate-800">{formatCurrency(Number(cliente?.saldo_pendiente) || 0)}</span></span>
          <span className="text-slate-500">Total abonado: <span className="font-semibold text-emerald-700">{formatCurrency(totalAbonado)}</span></span>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400 py-4">Cargando...</p>
        ) : abonos.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Sin abonos registrados.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {abonos.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-emerald-700">+{formatCurrency(a.monto)}</p>
                  <p className="text-xs text-slate-400">{formatDate(a.fecha)}</p>
                </div>
                <span className="text-xs text-slate-500">Saldo: {formatCurrency(a.saldo_resultante)}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}