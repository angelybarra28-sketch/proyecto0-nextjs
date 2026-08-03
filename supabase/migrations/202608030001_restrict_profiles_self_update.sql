-- M1: Cerrar la escalada de rol vía RLS en profiles.
--
-- Problema verificado: la política "Users can update own basic profile"
-- (creada en 202605260004_rls.sql) permitía a cualquier usuario autenticado
-- actualizar su propia fila en profiles SIN restringir columnas. Como RLS es
-- a nivel fila (no columna), un usuario podía ejecutar
--   UPDATE profiles SET role = 'ADMIN'
-- sobre su propia fila usando la anon key + sesión del browser client.
-- Eso escalaba privilegios a ADMIN/STAFF y daba acceso al panel admin y a las
-- APIs /api/admin/*.
--
-- Fix conservador: restringir el UPDATE a nivel de columnas. El rol
-- authenticated solo puede actualizar full_name de su propia fila (se preserva
-- la intención original de la política: editar el "perfil básico"). role e
-- is_active quedan inmutables para escrituras client-side.
--
-- No afecta los writes legítimos:
--   * handle_new_auth_user (trigger) y toggle_user_active_atomic (RPC) son
--     SECURITY DEFINER: corren como owner de la función, sin RLS ni column grants.
--   * service_role (usado por las APIs admin) no se ve afectado por este revoke.
--   * No hay INSERT ni DELETE policies sobre profiles: el cliente no puede
--     insertar ni borrar filas (default deny por RLS).

revoke update on profiles from anon, authenticated;
grant update (full_name) on profiles to authenticated;
