import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/format';

export default function VentaDetalleDialog({ venta, onClose }) {
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venta) return;
    setLoading(true);
    base44.entities.Detalles_Venta.filter({ venta_id: venta.id })
      .then(async (d) => {
        const productos = await base44.entities.Productos.list();
        const map = new Map(productos.map((p) => [p.id, p]));
        setDetalles(d.map((x) => ({ ...x, producto: map.get(x.producto_id) })));
      })
      .finally(() => setLoading(false));
  }, [venta]);

  return (
    <Dialog open={!!venta} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de venta</DialogTitle>
        </DialogHeader>
        {venta && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Fecha</span>
              <span className="font-medium text-slate-800">{formatDate(venta.fecha_hora)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Método de pago</span>
              <span className="font-medium text-slate-800">{venta.metodo_pago}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-4">Cargando...</p>
              ) : detalles.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin detalles.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left font-medium pb-2">Producto</th>
                      <th className="text-center font-medium pb-2">Cant.</th>
                      <th className="text-right font-medium pb-2">P. unit.</th>
                      <th className="text-right font-medium pb-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 text-slate-800">{d.producto?.nombre_producto || 'Producto eliminado'}</td>
                        <td className="py-2 text-center text-slate-600">{d.cantidad_vendida}</td>
                        <td className="py-2 text-right text-slate-600">
                          {formatCurrency(d.producto?.precio_venta || (d.cantidad_vendida ? d.subtotal / d.cantidad_vendida : 0))}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-800">{formatCurrency(d.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="font-semibold text-slate-800">Total</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(venta.monto_total)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}