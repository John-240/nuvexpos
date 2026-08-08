import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Shield, User as UserIcon } from 'lucide-react';

export default function GestionUsuarios() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('user');
  const [invitando, setInvitando] = useState(false);

  const load = async () => {
    try {
      const data = await base44.entities.User.list();
      setUsuarios(data);
    } catch (e) {
      toast({ title: 'Error al cargar usuarios', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const cambiarRol = async (u, nuevoRol) => {
    if (u.id === me?.id) {
      toast({ title: 'No puedes cambiar tu propio rol', variant: 'destructive' });
      return;
    }
    try {
      await base44.entities.User.update(u.id, { role: nuevoRol });
      toast({ title: 'Rol actualizado', description: `${u.email} ahora es ${nuevoRol === 'admin' ? 'administrador' : 'usuario'}` });
      await load();
    } catch (e) {
      toast({ title: 'Error al cambiar el rol', description: e.message, variant: 'destructive' });
    }
  };

  const invitar = async () => {
    if (!email.trim()) return;
    setInvitando(true);
    try {
      await base44.users.inviteUser(email.trim(), rol);
      toast({ title: 'Invitación enviada', description: `Se invitó a ${email.trim()} como ${rol === 'admin' ? 'administrador' : 'usuario'}` });
      setEmail('');
      await load();
    } catch (e) {
      toast({ title: 'Error al invitar', description: e.message, variant: 'destructive' });
    } finally {
      setInvitando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4 text-emerald-600" /> Invitar usuario</h2>
        <p className="text-sm text-slate-500 mb-4">Envía una invitación para que una persona se una a NuvexPos.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
          <select value={rol} onChange={(e) => setRol(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          <Button onClick={invitar} disabled={invitando} className="bg-emerald-600 hover:bg-emerald-700">
            <UserPlus className="w-4 h-4 mr-1.5" /> {invitando ? 'Enviando...' : 'Invitar'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Usuarios registrados</h2></div>
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando...</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {usuarios.map((u) => {
              const esAdmin = u.role === 'admin';
              const esYo = u.id === me?.id;
              return (
                <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${esAdmin ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {esAdmin ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}{esYo ? ' · (tú)' : ''}</p>
                  </div>
                  <select
                    value={u.role || 'user'}
                    disabled={esYo}
                    onChange={(e) => cambiarRol(u, e.target.value)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-60"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}