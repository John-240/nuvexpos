import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/format';
import { Plus, Phone, Pencil, Trash2, Wallet, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClienteForm from '@/components/cobrar/ClienteForm';
import CobroDialog from '@/components/cobrar/CobroDialog';
import ClienteHistorialDialog from '@/components/cobrar/ClienteHistorialDialog';

export default function CobrarDeuda() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [cobrar, setCobrar] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      setClientes(await base44.entities.Clientes.list());
    } catch (e) {
      toast({ title: 'Error al cargar clientes', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Clientes.subscribe(() => load());
    return unsub;
  }, []);

  const conDeuda = useMemo(
    () => clientes.filter((c) => (Number(c.saldo_pendiente) || 0) > 0).sort((a, b) => (Number(b.saldo_pendiente) || 0) - (Number(a.saldo_pendiente) || 0)),
    [clientes]
  );

  const totalDeuda = conDeuda.reduce((s, c) => s + (Number(c.saldo_pendiente) || 0), 0);

  const handleSubmit = async (data) => {
    try {
      if (editando) {
        await base44.entities.Clientes.update(editando.id, data);
        toast({ title: 'Cliente actualizado' });
      } else {
        await base44.entities.Clientes.create({ ...data, saldo_pendiente: 0 });
        toast({ title: 'Cliente creado' });
      }
      setShowForm(false);
      setEditando(null);
      await load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Clientes.delete(deleting.id);
      toast({ title: 'Cliente eliminado' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setDeleting(null);
    await load();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Clientes y Cobranza</h1>
          <p className="text-slate-500 mt-1">Gestiona clientes y cobra las cuentas a crédito</p>
        </div>
        <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 self-start">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo cliente
        </Button>
      </div>

      {/* Cuentas por cobrar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-amber-600" />
          <h2 className="font-semibold text-slate-900">Cuentas por cobrar</h2>
          <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">
            {conDeuda.length} clientes · {formatCurrency(totalDeuda)}
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : conDeuda.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No hay cuentas pendientes. 🎉</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {conDeuda.map((c) => {
                const saldo = Number(c.saldo_pendiente) || 0;
                const limite = Number(c.limite_credito) || 0;
                return (
                  <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">{c.nombre}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono || 'Sin teléfono'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-600">{formatCurrency(saldo)}</p>
                      <p className="text-xs text-slate-400">Límite: {formatCurrency(limite)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" onClick={() => setCobrar(c)} className="bg-emerald-600 hover:bg-emerald-700 h-8">Cobrar</Button>
                      <button onClick={() => setHistorial(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Ver historial"><History className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Todos los clientes */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Todos los clientes</h2>
        {clientes.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">No hay clientes registrados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {clientes.map((c) => {
                const saldo = Number(c.saldo_pendiente) || 0;
                return (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{c.nombre}</p>
                      <p className="text-xs text-slate-400">{c.telefono || 'Sin teléfono'} · Límite: {formatCurrency(Number(c.limite_credito) || 0)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${saldo > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {saldo > 0 ? `Debe ${formatCurrency(saldo)}` : 'Saldado'}
                    </span>
                    <button onClick={() => { setEditando(c); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditando(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <ClienteForm onSubmit={handleSubmit} initialData={editando} onCancel={() => { setShowForm(false); setEditando(null); }} />
        </DialogContent>
      </Dialog>

      <CobroDialog cliente={cobrar} onClose={() => setCobrar(null)} onPaid={load} />
      <ClienteHistorialDialog cliente={historial} onClose={() => setHistorial(null)} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">¿Eliminar a <span className="font-semibold">{deleting?.nombre}</span>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}