import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/components/ui/use-toast';

export default function IngresoRetiroDialog({ tipo, onClose, onDone }) {
  const { addToast } = useToast();
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const esRetiro = tipo === 'RETIRO';

  const confirmar = async () => {
    const m = Number(monto);
    if (isNaN(m) || m <= 0) { addToast('Monto inválido', 'error'); return; }
    if (!motivo.trim()) { addToast('El motivo es obligatorio', 'error'); return; }
    setGuardando(true);
    try {
      const res = await base44.functions.invoke('operacion_caja', { tipo, monto: m, motivo, observacion });
      addToast(`${esRetiro ? 'Retiro' : 'Ingreso'} registrado — Efectivo: ${formatCurrency(res.data.efectivo_disponible)}`, 'success');
      onDone();
    } catch (e) {
      addToast(`Error: ${e.response?.data?.error || e.message}`, 'error');
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={!!tipo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esRetiro ? 'Retiro de caja' : 'Ingreso manual a caja'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Monto</label>
            <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Motivo</label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={esRetiro ? 'Pago a proveedor, retiro propietario...' : 'Aporte, cambio, otro ingreso...'} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Observación (opcional)</label>
            <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            {esRetiro ? 'No puede retirar más del efectivo disponible en caja.' : 'Este ingreso se suma al efectivo de la caja.'}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={guardando} className={esRetiro ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
            {guardando ? 'Guardando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}