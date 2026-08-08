import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';

export default function CobroDialog({ cliente, onClose, onPaid }) {
  const { toast } = useToast();
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const saldo = Number(cliente?.saldo_pendiente) || 0;

  useEffect(() => {
    setMonto(String(saldo));
  }, [cliente?.id]);

  const registrar = async () => {
    const pago = Number(monto) || 0;
    if (pago <= 0) {
      toast({ title: 'Ingrese un monto válido', variant: 'destructive' });
      return;
    }
    if (pago > saldo) {
      toast({ title: 'El pago excede el saldo pendiente', variant: 'destructive' });
      return;
    }
    setGuardando(true);
    try {
      const nuevoSaldo = parseFloat((saldo - pago).toFixed(2));
      await base44.entities.Clientes.update(cliente.id, { saldo_pendiente: nuevoSaldo });
      await base44.entities.Abonos.create({
        cliente_id: cliente.id,
        nombre_cliente: cliente.nombre,
        fecha: new Date().toISOString(),
        monto: parseFloat(pago.toFixed(2)),
        saldo_anterior: parseFloat(saldo.toFixed(2)),
        saldo_resultante: nuevoSaldo
      });
      toast({ title: 'Abono registrado', description: `${formatCurrency(pago)} abonado a ${cliente.nombre}` });
      onPaid();
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cobrar a {cliente?.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-0.5">
            <p>Saldo pendiente: <span className="font-semibold text-slate-800">{formatCurrency(saldo)}</span></p>
            <p className="text-slate-500">Límite de crédito: {formatCurrency(Number(cliente?.limite_credito) || 0)}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cobro-monto">Monto a pagar</Label>
            <Input id="cobro-monto" type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
            <p className="text-xs text-slate-400">Modifique el monto para un pago parcial.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={registrar} disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700">
            {guardando ? 'Guardando...' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}