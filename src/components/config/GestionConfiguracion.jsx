import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_MONTO = 50000;

export default function GestionConfiguracion() {
  const { addToast } = useToast();
  const [monto, setMonto] = useState(DEFAULT_MONTO);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.Configuracion.list();
      if (list && list.length > 0) {
        const c = list[0];
        setConfigId(c.id);
        setMonto(Number(c.monto_maximo_venta) || DEFAULT_MONTO);
      } else {
        setConfigId(null);
        setMonto(DEFAULT_MONTO);
      }
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    const valor = Math.max(0, Number(monto) || 0);
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.Configuracion.update(configId, { monto_maximo_venta: valor });
      } else {
        const created = await base44.entities.Configuracion.create({ monto_maximo_venta: valor });
        setConfigId(created.id);
      }
      addToast('Configuración guardada', 'success');
    } catch (e) {
      addToast(e.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-emerald-600" />
        <h2 className="font-semibold text-slate-900">Aprobación de ventas</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Define el monto máximo de una venta que <span className="font-medium">no</span> requiere aprobación del gerente.
        Las ventas que superen este monto generarán una alerta en el panel y se notificarán por correo a los administradores.
      </p>
      <div className="space-y-2">
        <Label htmlFor="monto_max">Monto máximo sin aprobación (₡)</Label>
        <Input
          id="monto_max"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          min={0}
          className="h-10"
        />
      </div>
      <Button onClick={guardar} disabled={saving} className="mt-4">
        {saving ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
        ) : (
          <><Save className="w-4 h-4 mr-2" />Guardar</>
        )}
      </Button>
    </div>
  );
}