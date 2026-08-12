import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }

    if (body.accion === 'cambiar_rol') {
      if (body.usuario_id === user.id) {
        return Response.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });
      }
      const rolesValidos = ['admin', 'user', 'cajero', 'superadmin'];
      if (!rolesValidos.includes(body.rol)) {
        return Response.json({ error: 'Rol inválido' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.update(body.usuario_id, { role: body.rol });
      return Response.json({ ok: true });
    }

    // Acción por defecto: listar usuarios (service role para saltar RLS del User)
    const usuarios = await base44.asServiceRole.entities.User.list();
    return Response.json({
      usuarios: usuarios.map((u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}