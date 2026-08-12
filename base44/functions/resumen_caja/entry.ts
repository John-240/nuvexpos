import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obtenerCajaAbierta, resumenCaja, efectivoDisponible } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { caja_id } = body;

    let caja = null;
    if (caja_id) {
      caja = await base44.asServiceRole.entities.Cajas.get(caja_id);
      if (!caja) return Response.json({ error: 'Caja no encontrada' }, { status: 404 });
      if (user.role !== 'admin' && user.role !== 'superadmin' && caja.usuario_apertura !== user.id) {
        return Response.json({ error: 'No autorizado para esta caja' }, { status: 403 });
      }
    } else {
      caja = await obtenerCajaAbierta(base44, user);
    }

    if (!caja) return Response.json({ abierta: false });

    const resumen = await resumenCaja(base44, caja);
    const movimientos = await base44.asServiceRole.entities.Movimientos_Caja.filter(
      { caja_id: caja.id }, '-fecha_hora', 50
    );
    const ultimas_ventas = await base44.asServiceRole.entities.Ventas.filter(
      { caja_id: caja.id }, '-fecha_hora', 10
    );
    const efectivo_disponible = await efectivoDisponible(base44, caja);

    return Response.json({
      abierta: caja.estado === 'ABIERTA',
      caja,
      resumen,
      movimientos,
      ultimas_ventas,
      efectivo_disponible
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}