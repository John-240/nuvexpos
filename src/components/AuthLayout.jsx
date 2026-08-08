import React from "react";
import { Store } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 mb-3">
            <Store className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">NuvexPos</h2>
          <p className="text-sm text-muted-foreground">Inventario & Punto de Venta</p>
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
            <Icon className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}