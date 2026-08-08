import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function ClienteForm({ onSubmit, initialData, onCancel }) {
  const [form, setForm] = useState({
    nombre: initialData?.nombre || '',
    telefono: initialData?.telefono || '',
    limite_credito: initialData?.limite_credito ?? ''
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    onSubmit({
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      limite_credito: Number(form.limite_credito) || 0
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cli-nombre">Nombre *</Label>
        <Input id="cli-nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: María González" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cli-tel">Teléfono</Label>
        <Input id="cli-tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Ej: 8888-1234" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cli-limite">Límite de crédito</Label>
        <Input id="cli-limite" type="number" step="0.01" value={form.limite_credito} onChange={(e) => set('limite_credito', e.target.value)} placeholder="0" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-1.5" /> Cancelar
          </Button>
        )}
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {initialData ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  );
}