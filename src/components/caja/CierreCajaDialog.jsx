import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function CierreCajaDialog({ open, efectivoEsperado, resumen, onClose, onDone }) {
  const { toast } = useToast();
  const [contado, setContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [step, setStep] = useState(1);

  const contadoNum = Number(contado) || 0;
  const diferencia = contadoNum - (efectivoEsperado || 0);
  const hayDiferencia = Math.abs(diferencia) >= 0.01;

  useEffect(() => { if (open) { setStep(1); setContado(''); setObservaciones(''); } }, [open]);

  const cerrar = async () => {
    setConfirmando(true);
    try {
      await base44.functions.invoke('cerrar_caja', { efectivo_contado: contadoNum, observaciones });
      toast({ title: 'Caja cerrada', description: `Diferencia: ${formatCurrency(diferencia)}` });
      onDone();
    } catch (e) {
      toast({ title: 'Error al cerrar caja', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setConfirmando(false); }
  };

  const Fila = ({ label, value, strong, color }) => (
    <div className="flex justify-between py-1.5">
      <span className={strong ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={cn('font-medium', strong && 'font-bold', color)}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cierre de caja</DialogTitle></DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-1 text-sm">
              <Fila label="Monto inicial" value={formatCurrency(resumen?.monto_inicial || 0)} />
              <Fila label="Ventas en efectivo" value={formatCurrency(resumen?.total_efectivo || 0)} />
              <Fila label="Tarjeta" value={formatCurrency(resumen?.total_tarjeta || 0)} />
              <Fila label="SINPE" value={formatCurrency(resumen?.total_sinpe || 0)} />
              <Fila label="Transferencia" value={formatCurrency(resumen?.total_transferencia || 0)} />
              <Fila label="Otros pagos" value={formatCurrency(resumen?.otros_pagos || 0)} />
              <Fila label="Ingresos manuales" value={formatCurrency(resumen?.ingresos || 0)} />
              <Fila label="Retiros" value={`-${formatCurrency(resumen?.retiros || 0)}`} />
              <Fila label="Devoluciones" value={`-${formatCurrency(resumen?.devoluciones || 0)}`} />
              <Fila label="Total de ventas" value={formatCurrency(resumen?.total_ventas || 0)} strong />
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm text-emerald-800 font-medium">Efectivo esperado</p>
              <p className="text-3xl font-bold text-emerald-700">{formatCurrency(efectivoEsperado || 0)}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium">Efectivo contado (cuánto dinero físico hay)</label>
              <Input type="number" value={contado} onChange={(e) => setContado(e.target.value)} placeholder="0" className="h-12 text-lg" autoFocus />
              {contado !== '' && (
                <div className={cn('rounded-lg p-3 text-sm font-semibold', hayDiferencia ? (diferencia < 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700') : 'bg-emerald-50 text-emerald-700')}>
                  Diferencia: {diferencia < 0 ? '-' : '+'}{formatCurrency(Math.abs(diferencia))}
                </div>
              )}
            </div>

            {hayDiferencia && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">Observaciones de la diferencia *</label>
                <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Explique la diferencia" />
              </div>
            )}

            <Button onClick={() => setStep(2)} disabled={contado === ''} className="w-full h-11">Continuar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center font-semibold text-slate-900">¿Está seguro de cerrar esta caja?</p>
            <div className="rounded-xl border border-slate-200 p-4 space-y-1 text-sm">
              <Fila label="Total de ventas" value={formatCurrency(resumen?.total_ventas || 0)} strong />
              <Fila label="Efectivo esperado" value={formatCurrency(efectivoEsperado || 0)} strong />
              <Fila label="Efectivo contado" value={formatCurrency(contadoNum)} strong />
              <Fila label="Diferencia" value={`${diferencia < 0 ? '-' : '+'}${formatCurrency(Math.abs(diferencia))}`} strong color={hayDiferencia ? (diferencia < 0 ? 'text-red-600' : 'text-amber-600') : 'text-emerald-600'} />
              <Fila label="Cantidad de ventas" value={resumen?.cantidad_ventas || 0} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={confirmando}>Volver</Button>
              <Button onClick={cerrar} disabled={confirmando} className="bg-slate-900 hover:bg-slate-800">
                {confirmando ? 'Cerrando...' : 'Sí, cerrar caja'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}