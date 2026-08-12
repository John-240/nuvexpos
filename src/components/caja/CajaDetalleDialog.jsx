import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function CajaDetalleDialog({ caja, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caja) return;
    setLoading(true);
    base44.functions.invoke('resumen_caja', { caja_id: caja.id })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [caja?.id]);

  const r = data?.resumen;
  const colorTipo = (t) => (t === 'APERTURA' || t === 'INGRESO' || t === 'VENTA') ? 'text-emerald-600' : (t === 'RETIRO' || t === 'DEVOLUCION') ? 'text-amber-600' : 'text-slate-600';

  return (
    <Dialog open={!!caja} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Caja #{caja?.id?.slice(-6)}</DialogTitle></DialogHeader>
        {caja && (
          <div className="text-sm text-slate-500 mb-3">
            {caja.nombre_usuario_apertura} · {formatDate(caja.fecha_apertura)}
            {caja.fecha_cierre ? ` → ${formatDate(caja.fecha_cierre)}` : ''}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-400 py-4">Cargando...</p>
        ) : r ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Monto inicial</span><span className="font-medium">{formatCurrency(r.monto_inicial)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total ventas</span><span className="font-medium">{formatCurrency(r.total_ventas)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Efectivo</span><span className="font-medium">{formatCurrency(r.total_efectivo)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tarjeta</span><span className="font-medium">{formatCurrency(r.total_tarjeta)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SINPE</span><span className="font-medium">{formatCurrency(r.total_sinpe)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Transferencia</span><span className="font-medium">{formatCurrency(r.total_transferencia)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ingresos</span><span className="font-medium">{formatCurrency(r.ingresos)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Retiros</span><span className="font-medium">{formatCurrency(r.retiros)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Devoluciones</span><span className="font-medium">{formatCurrency(r.devoluciones)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="font-semibold text-slate-900">Efectivo esperado</span><span className="font-bold text-emerald-700">{formatCurrency(r.efectivo_esperado)}</span></div>
              {caja.estado === 'CERRADA' && (
                <>
                  <div className="flex justify-between"><span className="font-semibold text-slate-900">Efectivo contado</span><span className="font-bold">{formatCurrency(caja.efectivo_contado)}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-slate-900">Diferencia</span><span className={cn('font-bold', Math.abs(caja.diferencia) >= 0.01 ? (caja.diferencia < 0 ? 'text-red-600' : 'text-amber-600') : 'text-emerald-600')}>{caja.diferencia < 0 ? '-' : '+'}{formatCurrency(Math.abs(caja.diferencia))}</span></div>
                </>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-2">Movimientos</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(data.movimientos || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm py-1">
                    <div>
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 mr-2">{m.tipo}</span>
                      <span className="text-slate-500 text-xs">{m.motivo}</span>
                    </div>
                    <span className={cn('font-semibold', colorTipo(m.tipo))}>{m.tipo === 'RETIRO' || m.tipo === 'DEVOLUCION' ? '-' : '+'}{formatCurrency(m.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}