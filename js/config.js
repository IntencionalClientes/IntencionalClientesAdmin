/* ═══════════════════════════════════════════════════════════
   CONEXIÓN — mismo proyecto de Supabase que usa el Catálogo y
   la app de Intencional. La clave publishable es pública por
   diseño: quien protege los datos son las políticas RLS.
   ═══════════════════════════════════════════════════════════ */

var SB_URL = 'https://mcobunyyuahxtjkykfby.supabase.co';
var SB_KEY = 'sb_publishable_BWiNB58kOu1NQOXbFZPbQw_N-BOcaDn';

/* ── Login con una sola contraseña compartida ─────────────────
   Esta página pide solo la contraseña (nada de usuario). Por
   detrás, esa contraseña entra con una cuenta fija de Supabase
   Auth (así las políticas RLS —que exigen estar autenticado para
   escribir— funcionan igual que en la app de Intencional, sin
   tener que abrir la base a cualquiera).

   Antes de usar esta página hay que crear ESA cuenta una sola vez:
   Supabase → tu proyecto → Authentication → Users → Add user,
   con este mismo email y la contraseña que le quieras dar al
   equipo (podés cambiarla cuando quieras desde ahí, sin tocar
   ningún archivo). */
var ADMIN_LOGIN_EMAIL = 'equipo@catalogo-intencional.local';

/* Tablas que administra esta página y su clave primaria */
var TABLAS = {
  colores: 'id',
  pedidos_b2b: 'id',
  pedidos_b2b_items: 'id',
  productos: 'id',
  packs: 'id',
  pack_items: 'id'
};

/* ── Link al catálogo público ─────────────────────────────────
   El ícono del ojo en la barra de arriba lleva acá. CAMBIALO por
   la URL real una vez que el catálogo (carpeta catalogo-b2b) esté
   desplegado — Vercel te la da al terminar el despliegue. */
var URL_CATALOGO_PUBLICO = 'https://intencional-clientes.vercel.app';

/* ═══════════════════════════════════════════════════════════
   TEMA — sigue al sistema, igual que en las otras dos apps.
   ═══════════════════════════════════════════════════════════ */
function temaGuardado() {
  try { return localStorage.getItem('catadmin_tema') || 'auto'; }
  catch (e) { return 'auto'; }
}
function aplicarTema(t) {
  var tema = t || temaGuardado();
  document.documentElement.setAttribute('data-tema', tema);
}
function guardarTema(t) {
  try { localStorage.setItem('catadmin_tema', t); } catch (e) {}
  aplicarTema(t);
}
aplicarTema();
