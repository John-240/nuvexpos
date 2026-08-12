import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Permitir invocación desde workflow programado (sin usuario) y desde admin directo.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const periodo = body.periodo === 'semanal' ? 'semanal' : 'diario';

    const now = new Date();
    let dayStart, dayEnd, label;
    if (periodo === 'semanal') {
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      dayStart = start; dayEnd = end; label = 'últimos 7 días';
    } else {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(now);
      const y = parts.find((p) => p.type === 'year').value;
      const m = parts.find((p) => p.type === 'month').value;
      const d = parts.find((p) => p.type === 'day').value;
      dayStart = new Date(`${y}-${m}-${d}T00:00:00-06:00`);
      dayEnd = new Date(`${y}-${m}-${d}T23:59:59.999-06:00`);
      label = `${d}/${m}/${y}`;
    }

    const ventas = await base44.asServiceRole.entities.Ventas.list('-created_date', 2000);
    const cajas = await base44.asServiceRole.entities.Cajas.list('-created_date', 500);
    const movs = await base44.asServiceRole.entities.Movimientos_Caja.list('-created_date', 2000);

    const enRango = (f) => {
      const d = f ? new Date(f) : null;
      return d && d >= dayStart && d <= dayEnd;
    };
    const ventasP = (ventas || []).filter((v) => (v.estado === 'COMPLETADA' || v.estado === 'Pagado') && enRango(v.fecha_hora));
    const porMetodo = (m) => ventasP.filter((v) => v.metodo_pago === m).reduce((s, v) => s + (Number(v.monto_total) || 0), 0);
    const totalVentas = ventasP.reduce((s, v) => s + (Number(v.monto_total) || 0), 0);
    const ingresos = (movs || []).filter((m) => m.tipo === 'INGRESO' && enRango(m.fecha_hora)).reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const retiros = (movs || []).filter((m) => m.tipo === 'RETIRO' && enRango(m.fecha_hora)).reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const devoluciones = (movs || []).filter((m) => m.tipo === 'DEVOLUCION' && enRango(m.fecha_hora)).reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const cajasCerradas = (cajas || []).filter((c) => c.estado === 'CERRADA' && enRango(c.fecha_cierre));
    const diferencias = cajasCerradas.reduce((s, c) => s + (Number(c.diferencia) || 0), 0);

    const fmt = (n) => (Number(n) || 0).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 });

    let bodyText;
    if (periodo === 'semanal') {
      const porDia = {};
      for (const v of ventasP) {
        const k = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(v.fecha_hora));
        porDia[k] = (porDia[k] || 0) + (Number(v.monto_total) || 0);
      }
      const diasTxt = Object.entries(porDia).map(([k, val]) => `  ${k}: ${fmt(val)}`).join('\n') || '  Sin ventas';
      const maxDia = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0];
      const metodos = { EFECTIVO: porMetodo('EFECTIVO'), TARJETA: porMetodo('TARJETA'), SINPE: porMetodo('SINPE'), TRANSFERENCIA: porMetodo('TRANSFERENCIA'), OTRO: porMetodo('OTRO') };
      const masUsado = Object.entries(metodos).sort((a, b) => b[1] - a[1])[0];
      bodyText =
`Reporte SEMANAL de caja - NuvexPos (${label})

Total semanal: ${fmt(totalVentas)} (${ventasP.length} ventas)
Promedio diario: ${fmt(totalVentas / 7)}
Día con mayores ventas: ${maxDia ? maxDia[0] : '-'} (${maxDia ? fmt(maxDia[1]) : '-'})
Método más utilizado: ${masUsado ? masUsado[0] : '-'}

Ventas por día:
${diasTxt}

EFECTIVO: ${fmt(porMetodo('EFECTIVO'))}
TARJETA: ${fmt(porMetodo('TARJETA'))}
SINPE: ${fmt(porMetodo('SINPE'))}
TRANSFERENCIA: ${fmt(porMetodo('TRANSFERENCIA'))}
Otros: ${fmt(porMetodo('OTRO'))}
Ingresos manuales: ${fmt(ingresos)}
Retiros: ${fmt(retiros)}
Devoluciones: ${fmt(devoluciones)}
Cajas cerradas: ${cajasCerradas.length}
Diferencias totales: ${fmt(diferencias)}

-- NuvexPos`;
    } else {
      bodyText =
`Reporte diario de caja - NuvexPos (${label})

Total de ventas: ${fmt(totalVentas)} (${ventasP.length} ventas)
EFECTIVO: ${fmt(porMetodo('EFECTIVO'))}
TARJETA: ${fmt(porMetodo('TARJETA'))}
SINPE: ${fmt(porMetodo('SINPE'))}
TRANSFERENCIA: ${fmt(porMetodo('TRANSFERENCIA'))}
Otros: ${fmt(porMetodo('OTRO'))}
Ingresos manuales: ${fmt(ingresos)}
Retiros: ${fmt(retiros)}
Devoluciones: ${fmt(devoluciones)}
Cajas cerradas: ${cajasCerradas.length}
Diferencias totales: ${fmt(diferencias)}

-- NuvexPos`;
    }

    const subject = periodo === 'semanal' ? 'Reporte semanal de caja - NuvexPos' : `Reporte diario de caja - NuvexPos ${label}`;
    const users = await base44.asServiceRole.entities.User.list();
    const admins = (users || []).filter((u) => (u.role === 'admin' || u.role === 'superadmin') && u.email);
    let enviados = 0;
    for (const a of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: a.email, subject, body: bodyText, from_name: 'NuvexPos' });
        enviados++;
      } catch (e) { /* continuar */ }
    }

    return Response.json({ success: true, periodo, correos_enviados: enviados, total_ventas: totalVentas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}