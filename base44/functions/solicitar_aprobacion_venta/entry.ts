import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    let body;
    try { body = await req.json(); } catch (e) { body = {}; }
    const { venta_id } = body || {};

    if (!venta_id) return Response.json({ error: 'venta_id es requerido' }, { status: 400 });

    const venta = await base44.asServiceRole.entities.Ventas.get(venta_id);
    if (!venta) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });

    const monto_total = venta.monto_total;
    const metodo_pago = venta.metodo_pago;

    // Leer monto máximo configurable (entidad Configuracion). Default 50000 si no existe.
    const cfgList = await base44.asServiceRole.entities.Configuracion.list();
    const config = cfgList && cfgList[0];
    const montoMaximo = config && config.monto_maximo_venta != null ? Number(config.monto_maximo_venta) : 50000;

    // Solo generar alerta/solicitud si la venta supera el monto máximo configurado
    if ((Number(monto_total) || 0) <= montoMaximo) {
      return Response.json({ success: true, venta_id, skipped: true, monto_maximo: montoMaximo });
    }

    const fmt = (n) => (Number(n) || 0).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 });

    const subject = `Solicitud de aprobación - Venta por ${fmt(monto_total)}`;
    const emailBody =
`Se ha registrado una venta que supera el monto máximo permitido y requiere aprobación del gerente.

Venta ID: ${venta_id}
Monto total: ${fmt(monto_total)}
Método de pago: ${metodo_pago || 'No especificado'}

Por favor revise y confirme la aprobación de esta venta en NuvexPos.

-- NuvexPos`;

    // Alerta para el gerente en el panel
    await base44.asServiceRole.entities.Alertas.create({
      mensaje: `Venta ${venta_id} por ${fmt(monto_total)} requiere aprobación del gerente (supera el monto máximo permitido).`,
      fecha: new Date().toISOString(),
      leida: false,
      descartada: false
    });

    // Solicitud por correo a los administradores
    const users = await base44.asServiceRole.entities.User.list();
    const admins = (users || []).filter(u => u.role === 'admin' && u.email);
    let enviados = 0;
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email, subject, body: emailBody, from_name: 'NuvexPos'
        });
        enviados++;
      } catch (e) { /* continuar */ }
    }

    return Response.json({ success: true, venta_id, correos_enviados: enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}