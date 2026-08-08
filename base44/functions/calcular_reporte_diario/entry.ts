import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Ventana del día actual en zona horaria de Costa Rica (UTC-6 fijo)
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    const dayStart = new Date(`${y}-${m}-${d}T00:00:00-06:00`);
    const dayEnd = new Date(`${y}-${m}-${d}T23:59:59.999-06:00`);
    const fechaStr = `${d}/${m}/${y}`;

    const ventas = await base44.asServiceRole.entities.Ventas.list('-created_date', 1000);
    const gastos = await base44.asServiceRole.entities.Gastos.list('-created_date', 1000);

    const ventasHoy = ventas.filter(v => {
      const f = v.fecha_hora ? new Date(v.fecha_hora) : null;
      return f && f >= dayStart && f <= dayEnd;
    });
    const gastosHoy = gastos.filter(g => {
      const f = g.fecha ? new Date(g.fecha) : null;
      return f && f >= dayStart && f <= dayEnd;
    });

    const totalVentas = ventasHoy.reduce((s, v) => s + (Number(v.monto_total) || 0), 0);
    const totalGastos = gastosHoy.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const gananciaNeta = totalVentas - totalGastos;
    const margen = totalVentas > 0 ? (gananciaNeta / totalVentas) * 100 : 0;

    const fmt = (n) => (Number(n) || 0).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 });

    const subject = `Reporte diario NuvexPos - ${fechaStr}`;
    const body =
`Reporte diario de operaciones - ${fechaStr}

Total de ventas del día: ${fmt(totalVentas)} (${ventasHoy.length} transacciones)
Total de gastos del día: ${fmt(totalGastos)} (${gastosHoy.length} registros)
Ganancia neta: ${fmt(gananciaNeta)}
Margen de ganancia neta: ${margen.toFixed(2)}%

-- NuvexPos`;

    const users = await base44.asServiceRole.entities.User.list();
    const admins = (users || []).filter(u => u.role === 'admin' && u.email);
    let enviados = 0;
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email, subject, body, from_name: 'NuvexPos'
        });
        enviados++;
      } catch (e) { /* continuar con otros destinatarios */ }
    }

    return Response.json({
      success: true,
      fecha: fechaStr,
      total_ventas: totalVentas,
      total_gastos: totalGastos,
      ganancia_neta: gananciaNeta,
      margen_porcentaje: margen,
      transacciones: ventasHoy.length,
      correos_enviados: enviados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}