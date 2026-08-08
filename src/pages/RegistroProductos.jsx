import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductForm from '@/components/productos/ProductForm';
import { formatCurrency } from '@/lib/format';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function RegistroProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    load();
    const unsub = base44.entities.Productos.subscribe(() => load());
    return unsub;
  }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Productos.list();
      setProductos(data);
    } finally {
      setLoading(false);
    }
  };

  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return Array.from(set);
  }, [productos]);

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusqueda = !busqueda ||
        p.nombre_producto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_barras?.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
      return matchBusqueda && matchCategoria;
    });
  }, [productos, busqueda, filtroCategoria]);

  const handleSubmit = async (data) => {
    if (editando) {
      await base44.entities.Productos.update(editando.id, data);
    } else {
      await base44.entities.Productos.create(data);
    }
    setShowForm(false);
    setEditando(null);
    await load();
  };

  const handleEdit = (p) => {
    setEditando(p);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await base44.entities.Productos.delete(deleting.id);
    setDeleting(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Registro de Productos</h1>
          <p className="text-slate-500 mt-1">Gestiona el catálogo de tu tienda</p>
        </div>
        <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 self-start">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo producto
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código de barras..."
            className="pl-9"
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay productos registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Producto</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Código</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Categoría</th>
                  <th className="text-right font-medium px-4 py-3">P. venta</th>
                  <th className="text-center font-medium px-4 py-3">Stock</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((p) => {
                  const bajo = (p.stock_actual || 0) <= (p.stock_minimo || 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{p.nombre_producto}</p>
                        <p className="text-xs text-slate-400 sm:hidden">{p.categoria} · {p.codigo_barras || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{p.codigo_barras || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{p.categoria || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(p.precio_venta)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${bajo ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {p.stock_actual || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(p)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar producto' : 'Registrar nuevo producto'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            onSubmit={handleSubmit}
            initialData={editando}
            onCancel={() => { setShowForm(false); setEditando(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar eliminación */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            ¿Seguro que deseas eliminar <span className="font-semibold">{deleting?.nombre_producto}</span>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}