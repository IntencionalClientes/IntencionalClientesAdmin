/* ═══════════════════════════════════════════════════════════
   APP — arranque de la administración del Catálogo: login con
   la contraseña del equipo y arma el armazón (Pedidos, Colores).
   Separada a propósito de la app de Intencional: esa es para el
   día a día del local: acá se administra el catálogo B2B, sin
   mezclar una cosa con la otra.
   ═══════════════════════════════════════════════════════════ */

function pintarMarca(destino) {
  destino.innerHTML =
    '<img src="' + LOGO_INTENCIONAL + '" alt=""/>' +
    '<div>' +
      '<div class="marca-nombre">Catálogo</div>' +
      '<div class="marca-sub">Panel del equipo</div>' +
    '</div>';
}

/* Versión chica para la barra de arriba: solo el logo y el
   nombre, sin el subtítulo — ahí ya no hay tanto lugar. */
function pintarMarcaChica(destino) {
  destino.innerHTML = '<img src="' + LOGO_INTENCIONAL + '" alt=""/><span class="appbar-nombre">Catálogo</span>';
}

/* ── Modo oscuro ───────────────────────────────────────────────
   Un interruptor simple (no un menú con "auto/claro/oscuro"): un
   toque alterna entre los dos. Arranca seteado según el sistema
   (temaGuardado() en config.js default 'auto') y en cuanto se
   toca una vez queda guardado explícito para la próxima visita. */
function temaEsOscuroAhora() {
  var t = temaGuardado();
  if (t === 'oscuro') return true;
  if (t === 'claro') return false;
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}
function alternarTemaAdmin() {
  guardarTema(temaEsOscuroAhora() ? 'claro' : 'oscuro');
  pintarBotonesTema();
}
function botonTemaHTML() {
  var oscuro = temaEsOscuroAhora();
  return '<button class="btn btn-fantasma" onclick="alternarTemaAdmin()" ' +
    'aria-label="Cambiar a modo ' + (oscuro ? 'claro' : 'oscuro') + '" title="Modo ' + (oscuro ? 'claro' : 'oscuro') + '">' +
    ic(oscuro ? 'sun' : 'moon', 18) +
  '</button>';
}
function pintarBotonesTema() {
  var top = porId('tema-boton-topbar'); if (top) top.innerHTML = botonTemaHTML();
}

/* ── Pantalla de ingreso ─────────────────────────────────────
   Solo pide la contraseña (nada de usuario ni email): la cuenta
   fija que la recibe está en config.js (ADMIN_LOGIN_EMAIL). */
function pantallaIngreso() {
  porId('app').innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface)">' +
      '<div style="width:100%;max-width:340px">' +
        '<div class="marca" id="marca-ingreso" style="border:none;justify-content:center;margin-bottom:22px;padding:0"></div>' +
        '<div class="tarjeta"><div class="tarjeta-cuerpo">' +
          '<div class="campo">' +
            '<div class="campo-etiq">Contraseña del equipo</div>' +
            '<input class="campo-input" id="ing-pass" type="password" autocomplete="current-password" ' +
                   'onkeydown="if(event.key===\'Enter\')entrar()"/>' +
          '</div>' +
          '<button class="btn btn-primario btn-bloque" id="ing-btn" onclick="entrar()">Entrar</button>' +
          '<div id="ing-error" style="margin-top:12px"></div>' +
        '</div></div>' +
      '</div>' +
    '</div>';
  pintarMarca(porId('marca-ingreso'));
  var e = porId('ing-pass'); if (e) e.focus();
}

async function entrar() {
  var btn = porId('ing-btn');
  var pass = porId('ing-pass').value || '';
  var err = porId('ing-error');
  err.innerHTML = '';

  if (!pass) { err.innerHTML = avisoHTML('danger', 'Escribí la contraseña.'); return; }
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  try {
    await iniciarSesion(pass);
    arrancarApp();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Entrar';
    err.innerHTML = avisoHTML('danger', 'Contraseña incorrecta.');
  }
}

async function salir() {
  await cerrarSesion();
  pantallaIngreso();
}

/* ── Armazón ─────────────────────────────────────────────────
   Una sola barra de arriba (igual en PC y en celular) en vez de
   la barra lateral + barra de abajo de la app grande: con solo
   dos secciones, una barra lateral entera se ve vacía y rara.
   Las pastillas de navegación son las mismas .nav-item de
   siempre, así que el resto del sistema (marcarMenu, etc.) no
   se entera del cambio. */
function arrancarApp() {
  porId('app').innerHTML =
    '<header class="appbar">' +
      '<div class="appbar-marca" id="marca-appbar"></div>' +
      '<nav class="appbar-nav" id="nav"></nav>' +
      '<div class="appbar-acciones">' +
        '<span id="tema-boton-topbar">' + botonTemaHTML() + '</span>' +
        '<a class="btn btn-fantasma" href="' + URL_CATALOGO_PUBLICO + '" target="_blank" rel="noopener" aria-label="Ver el catálogo" title="Ver el catálogo">' + ic('eye', 18) + '</a>' +
        '<button class="btn btn-fantasma" onclick="salir()" aria-label="Cerrar sesión" title="Cerrar sesión">' + ic('undo', 18) + '</button>' +
      '</div>' +
    '</header>' +
    '<main class="contenido"><div id="contenido"></div></main>';

  pintarMarcaChica(porId('marca-appbar'));
  construirNavPills();
  pintarRuta();
}

document.addEventListener('DOMContentLoaded', function () {
  recuperarSesion();
  if (_sesion) arrancarApp();
  else pantallaIngreso();
});
