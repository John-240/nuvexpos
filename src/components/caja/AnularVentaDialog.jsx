import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle } from 'lucide-react';

export default function AnularVentaDialog({ venta, onClose, onDone }) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) { toast({ title: 'El motivo es obligatorio', variant: 'destructive' }); return; }
    setGuardando(true);
    try {
      await base44.functions.invoke('anular_venta', { venta_id: venta.id, motivo });
      toast({ title: 'Venta anulada', description: `Se devolvió el stock y se revirtió el movimiento de caja.` });
      onDone();
    } catch (e) {
      toast({ title: 'Error al anular', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={!!venta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Anular venta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>La venta <strong>#{venta?.id?.slice(-6)}</strong> ({formatCurrency(venta?.monto_total)}) no se eliminará. Cambiará a estado <strong>Anulada</strong>, se devolverá el stock al inventario y se revertirá el efecto en caja/crédito.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Motivo de anulación *</label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Error de registro, devolución del cliente..." autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={guardando} className="bg-red-600 hover:bg-red-700">
            {guardando ? 'Anulando...' : 'Anular venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}