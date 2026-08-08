import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ensureStockAlert } from '@/lib/stockAlerts';

export default function RestockDialog({ producto, onClose, onUpdated }) {
  const [stockActual, setStockActual] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStockActual(producto?.stock_actual ?? '');
  }, [producto]);

  const submit = async (e) => {
    e.preventDefault();
    const nuevo = parseInt(stockActual, 10);
    if (isNaN(nuevo) || nuevo < 0) return;
    setSaving(true);
    try {
      await base44.entities.Productos.update(producto.id, { stock_actual: nuevo });
      if (nuevo > (producto.stock_minimo || 0)) {
        // Reabastecido sobre el mínimo: marcar alertas activas como revisadas
        try {
          await base44.entities.Alertas.updateMany(
            { producto_id: producto.id, leida: false },
            { $set: { leida: true } }
          );
        } catch { /* no crítico */ }
      } else {
        await ensureStockAlert({ ...producto, stock_actual: nuevo });
      }
      onUpdated?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!producto} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reabastecer producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="font-medium text-slate-800">{producto?.nombre_producto}</p>
            <p className="text-sm text-slate-500">Stock actual: {producto?.stock_actual} · Mínimo: {producto?.stock_minimo}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="restock">Nuevo stock actual</Label>
            <Input
              id="restock"
              type="number"
              min="0"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}