import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, CreditCard } from 'lucide-react';

export default function GestionMetodosPago() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState('');

  const load = async () => {
    try {
      const data = await base44.entities.MetodosPago.list();
      setItems(data);
    } catch (e) {
      toast({ title: 'Error al cargar métodos de pago', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const agregar = async () => {
    if (!nuevo.trim()) return;
    try {
      await base44.entities.MetodosPago.create({ nombre: nuevo.trim(), activo: true });
      setNuevo('');
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const toggleActivo = async (m) => {
    try {
      await base44.entities.MetodosPago.update(m.id, { activo: m.activo === false });
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const eliminar = async (id) => {
    try {
      await base44.entities.MetodosPago.delete(id);
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-600" /> Métodos de pago</h2>
        <p className="text-sm text-slate-500 mb-4">Define los métodos de pago aceptados en el punto de venta.</p>
        <div className="flex gap-3">
          <Input placeholder="Nuevo método (Ej: Sinpe)..." value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} className="flex-1" />
          <Button onClick={agregar} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1.5" /> Agregar</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">No hay métodos. Agrega el primero.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((m) => {
              const activo = m.activo !== false;
              return (
                <div key={m.id} className="px-6 py-3 flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="flex-1 text-sm text-slate-800">{m.nombre}</span>
                  <button onClick={() => toggleActivo(m)} className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                    {activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => eliminar(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}