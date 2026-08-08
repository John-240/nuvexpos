import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

const CATEGORIAS = ['Compra de Mercancía', 'Servicios', 'Renta', 'Servicios Públicos', 'Salarios', 'Otros'];

export default function GastoForm({ onSubmit, initialData, onCancel }) {
  const [form, setForm] = useState({
    concepto: initialData?.concepto || '',
    categoria: initialData?.categoria || 'Otros',
    monto: initialData?.monto || '',
    proveedor: initialData?.proveedor || '',
    fecha: initialData?.fecha ? initialData.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10)
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.concepto.trim()) {
      setError('El concepto es obligatorio');
      return;
    }
    const monto = Number(form.monto);
    if (!monto || monto <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    onSubmit({
      concepto: form.concepto.trim(),
      categoria: form.categoria,
      monto: monto,
      proveedor: form.proveedor.trim(),
      fecha: new Date(form.fecha + 'T12:00:00').toISOString()
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="g-concepto">Concepto *</Label>
        <Input id="g-concepto" value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Compra de arroz a proveedor X" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="g-categoria">Categoría</Label>
          <select
            id="g-categoria"
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-monto">Monto *</Label>
          <Input id="g-monto" type="number" step="0.01" min="0" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-proveedor">Proveedor</Label>
          <Input id="g-proveedor" value={form.proveedor} onChange={(e) => set('proveedor', e.target.value)} placeholder="Opcional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-fecha">Fecha</Label>
          <Input id="g-fecha" type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-1.5" /> Cancelar
          </Button>
        )}
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {initialData ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  );
}