/* ═══════════════════════════════════════════════════════════
   RUTAS — navegación por hash (#/clientes). Cada página se
   registra sola con registrarPagina() y el router se encarga
   del resto: pintar, marcar el menú, manejar errores.
   ═══════════════════════════════════════════════════════════ */

var PAGINAS = {};
var rutaActual = '';

/* def = { id, titulo, subtitulo, icono, menu, grupo, montar(cont, params) } */
function registrarPagina(def) { PAGINAS[def.id] = def; }

function irA(id, params) {
  var hash = '#/' + id + (params ? '?' + params : '');
  if (location.hash === hash) pintarRuta();
  else location.hash = hash;
}

/* Esta página no tiene "inicio": lo primero que se quiere ver al
   entrar es Pedidos (lo que hay que atender hoy), así que es la
   página por defecto cuando no hay nada en el hash. */
var PAGINA_INICIAL = 'pedidos';

function leerRuta() {
  var h = (location.hash || '').replace(/^#\/?/, '');
  var i = h.indexOf('?');
  return {
    id: (i === -1 ? h : h.slice(0, i)) || PAGINA_INICIAL,
    params: new URLSearchParams(i === -1 ? '' : h.slice(i + 1))
  };
}

async function pintarRuta() {
  var r = leerRuta();
  var pagina = PAGINAS[r.id] || PAGINAS[PAGINA_INICIAL];
  rutaActual = pagina.id;

  marcarMenu(pagina.id);

  var cont = porId('contenido');
  cont.innerHTML =
    '<div class="contenido-ancho">' +
      '<div class="cabecera">' +
        '<h1>' + esc(pagina.titulo) + '</h1>' +
        (pagina.subtitulo ? '<p>' + esc(pagina.subtitulo) + '</p>' : '') +
      '</div>' +
      '<div id="cuerpo-pagina">' + cargando() + '</div>' +
    '</div>';

  var cuerpo = porId('cuerpo-pagina');
  window.scrollTo(0, 0);

  try {
    await pagina.montar(cuerpo, r.params);
  } catch (e) {
    console.error('[' + pagina.id + ']', e);
    cuerpo.innerHTML = avisoHTML('danger',
      '<strong>No se pudo cargar esta pantalla.</strong><br>' + esc(e.message) +
      '<br><button class="btn btn-secundario" style="margin-top:10px" onclick="pintarRuta()">Reintentar</button>');
  }
}

function marcarMenu(id) {
  $$('.nav-item').forEach(function (b) {
    if (b.dataset.pagina === id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

/* Esta app tiene solo un puñado de pantallas, así que en vez de
   una barra lateral (que con dos ítems queda vacía y rara) o una
   barra de abajo con un "Menú" para el resto, van todas juntas
   como pastillas en la barra de arriba — misma barra en celular
   y en PC, nada que aparezca o desaparezca según el ancho. */
function construirNavPills() {
  var cont = porId('nav');
  if (!cont) return;
  cont.innerHTML = Object.keys(PAGINAS).filter(function (id) { return PAGINAS[id].menu; }).map(function (id) {
    var p = PAGINAS[id];
    return '<button class="nav-item" data-pagina="' + id + '" onclick="irA(\'' + id + '\')">' +
      '<span class="nav-ic">' + ic(p.icono, 16) + '</span>' + esc(p.menu) +
    '</button>';
  }).join('');
}

window.addEventListener('hashchange', pintarRuta);
