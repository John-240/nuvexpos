import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obtenerCajaAbierta, registrarAuditoria, efectivoDisponible } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { tipo, monto, motivo, observacion } = body;
    if (!['INGRESO', 'RETIRO'].includes(tipo)) {
      return Response.json({ error: 'Tipo de movimiento inválido' }, { status: 400 });
    }
    const m = Number(monto);
    if (isNaN(m) || m <= 0) return Response.json({ error: 'Monto inválido' }, { status: 400 });
    if (!motivo || !motivo.trim()) return Response.json({ error: 'El motivo es obligatorio' }, { status: 400 });

    const caja = await obtenerCajaAbierta(base44, user);
    if (!caja) return Response.json({ error: 'No hay caja abierta' }, { status: 400 });

    if (tipo === 'RETIRO') {
      const disp = await efectivoDisponible(base44, caja);
      if (m > disp) {
        return Response.json({ error: `El retiro excede el efectivo disponible en caja (₡${disp.toLocaleString('es-CR')})` }, { status: 400 });
      }
    }

    await base44.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo, usuario_id: user.id,
      nombre_usuario: user.full_name || user.email,
      fecha_hora: new Date().toISOString(), monto: parseFloat(m.toFixed(2)),
      motivo: motivo.trim(), observaciones: observacion || null, referencia: caja.id
    });

    const nuevoDisponible = await efectivoDisponible(base44, caja);
    await registrarAuditoria(base44, user, tipo === 'INGRESO' ? 'INGRESO_CAJA' : 'RETIRO_CAJA',
      'Movimientos_Caja', caja.id, { monto: m, motivo });

    return Response.json({ success: true, efectivo_disponible: nuevoDisponible });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}