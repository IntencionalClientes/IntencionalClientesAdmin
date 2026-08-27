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

/* ── Armazón ─────────────────────────────────────────────── */
function arrancarApp() {
  porId('app').innerHTML =
    '<div class="shell">' +
      '<aside class="barra-lateral">' +
        '<div class="marca" id="marca-lateral"></div>' +
        '<nav class="nav" id="nav"></nav>' +
        '<div class="pie-lateral">' +
          '<button class="btn btn-fantasma" style="padding:6px 0" onclick="salir()">' + ic('undo', 15) + ' Cerrar sesión</button>' +
        '</div>' +
      '</aside>' +
      '<main class="contenido">' +
        '<div class="topbar">' +
          '<img src="' + LOGO_INTENCIONAL + '" style="width:26px;height:26px;object-fit:contain" alt=""/>' +
          '<div class="marca-nombre">Catálogo</div>' +
          '<a class="btn btn-fantasma" style="padding:6px;margin-left:auto" href="' + URL_CATALOGO_PUBLICO + '" target="_blank" rel="noopener" aria-label="Ver el catálogo">' + ic('eye', 18) + '</a>' +
        '</div>' +
        '<div id="contenido"></div>' +
      '</main>' +
      '<nav class="barra-inferior" id="barra-inferior"></nav>' +
    '</div>';

  pintarMarca(porId('marca-lateral'));
  construirMenu();
  construirBarraInferior();
  pintarRuta();
}

document.addEventListener('DOMContentLoaded', function () {
  recuperarSesion();
  if (_sesion) arrancarApp();
  else pantallaIngreso();
});
