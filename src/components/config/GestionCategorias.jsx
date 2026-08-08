import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Pencil, Tag } from 'lucide-react';

export default function GestionCategorias() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState('');
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState('');

  const load = async () => {
    try {
      const data = await base44.entities.Categorias.list();
      setItems(data);
    } catch (e) {
      toast({ title: 'Error al cargar categorías', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const agregar = async () => {
    if (!nuevo.trim()) return;
    try {
      await base44.entities.Categorias.create({ nombre: nuevo.trim() });
      setNuevo('');
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const guardarEdicion = async () => {
    if (!editVal.trim()) return;
    try {
      await base44.entities.Categorias.update(editId, { nombre: editVal.trim() });
      setEditId(null);
      setEditVal('');
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const eliminar = async (id) => {
    try {
      await base44.entities.Categorias.delete(id);
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-600" /> Categorías de productos</h2>
        <p className="text-sm text-slate-500 mb-4">Define las categorías disponibles al registrar productos.</p>
        <div className="flex gap-3">
          <Input placeholder="Nueva categoría (Ej: Lácteos)..." value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} className="flex-1" />
          <Button onClick={agregar} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1.5" /> Agregar</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">No hay categorías. Agrega la primera.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center gap-3">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                {editId === c.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input value={editVal} onChange={(e) => setEditVal(e.target.value)} className="h-8" autoFocus onKeyDown={(e) => e.key === 'Enter' && guardarEdicion()} />
                    <Button size="sm" onClick={guardarEdicion} className="bg-emerald-600 hover:bg-emerald-700">Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditId(null); setEditVal(''); }}>Cancelar</Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-800">{c.nombre}</span>
                    <button onClick={() => { setEditId(c.id); setEditVal(c.nombre); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => eliminar(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}