import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obtenerCajaAbierta, registrarAuditoria } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const montoInicial = parseFloat(body.monto_inicial);

    // Validar monto_inicial > 0
    if (isNaN(montoInicial) || montoInicial <= 0) {
      return Response.json({ error: 'El monto inicial debe ser mayor a 0' }, { status: 400 });
    }

    // Verificar que no tenga caja abierta
    const existente = await obtenerCajaAbierta(base44, user);
    if (existente) {
      return Response.json({ error: 'Ya tiene una caja abierta', caja_id: existente.id }, { status: 400 });
    }

    // Crear caja
    const caja = await base44.entities.Cajas.create({
      estado: 'ABIERTA',
      usuario_apertura: user.id,
      nombre_usuario_apertura: user.full_name || user.email,
      fecha_apertura: new Date().toISOString(),
      monto_inicial: parseFloat(montoInicial.toFixed(2)),
      total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_sinpe: 0,
      total_transferencia: 0, otros_pagos: 0, ingresos_manuales: 0, retiros: 0,
      devoluciones: 0, efectivo_esperado: 0, efectivo_contado: 0, diferencia: 0
    });

    await base44.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: 'APERTURA',
      usuario_id: user.id, nombre_usuario: user.full_name || user.email,
      fecha_hora: new Date().toISOString(), monto: parseFloat(montoInicial.toFixed(2)),
      motivo: 'Apertura de caja', referencia: caja.id
    });

    await registrarAuditoria(base44, user, 'APERTURA_CAJA', 'Cajas', caja.id, { monto_inicial: montoInicial });

    return Response.json({ success: true, caja_id: caja.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}