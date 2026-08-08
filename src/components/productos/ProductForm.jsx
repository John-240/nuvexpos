import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function ProductForm({ onSubmit, initialData, onCancel }) {
  const [form, setForm] = useState({
    codigo_barras: initialData?.codigo_barras || '',
    nombre_producto: initialData?.nombre_producto || '',
    categoria: initialData?.categoria || '',
    precio_costo: initialData?.precio_costo || '',
    precio_venta: initialData?.precio_venta || '',
    stock_actual: initialData?.stock_actual ?? '',
    stock_minimo: initialData?.stock_minimo ?? ''
  });
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre_producto.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    onSubmit({
      ...form,
      precio_costo: Number(form.precio_costo) || 0,
      precio_venta: Number(form.precio_venta) || 0,
      stock_actual: parseInt(form.stock_actual, 10) || 0,
      stock_minimo: parseInt(form.stock_minimo, 10) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombre_producto">Nombre del producto *</Label>
          <Input id="nombre_producto" value={form.nombre_producto} onChange={(e) => set('nombre_producto', e.target.value)} placeholder="Ej: Leche entera 1L" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="codigo_barras">Código de barras</Label>
          <Input id="codigo_barras" value={form.codigo_barras} onChange={(e) => set('codigo_barras', e.target.value)} placeholder="Ej: 7501234567890" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Input id="categoria" value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ej: Lácteos" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precio_costo">Precio de costo</Label>
          <Input id="precio_costo" type="number" step="0.01" value={form.precio_costo} onChange={(e) => set('precio_costo', e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precio_venta">Precio de venta</Label>
          <Input id="precio_venta" type="number" step="0.01" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock_actual">Stock actual</Label>
          <Input id="stock_actual" type="number" value={form.stock_actual} onChange={(e) => set('stock_actual', e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock_minimo">Stock mínimo</Label>
          <Input id="stock_minimo" type="number" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} placeholder="0" />
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
          {initialData ? 'Guardar cambios' : 'Registrar producto'}
        </Button>
      </div>
    </form>
  );
}