import React, { useState } from 'react';
import { Users, Tag, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import GestionUsuarios from '@/components/config/GestionUsuarios';
import GestionCategorias from '@/components/config/GestionCategorias';
import GestionMetodosPago from '@/components/config/GestionMetodosPago';

const tabs = [
  { id: 'usuarios', label: 'Usuarios', icon: Users, comp: GestionUsuarios },
  { id: 'categorias', label: 'Categorías', icon: Tag, comp: GestionCategorias },
  { id: 'metodos', label: 'Métodos de pago', icon: CreditCard, comp: GestionMetodosPago },
];

export default function Configuracion() {
  const [tab, setTab] = useState('usuarios');
  const Active = tabs.find((t) => t.id === tab).comp;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1">Gestiona usuarios, categorías y métodos de pago</p>
      </div>

      <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <Active />
    </div>
  );
}