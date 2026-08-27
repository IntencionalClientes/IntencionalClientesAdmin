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
  $$('.nav-item, .tab-inferior').forEach(function (b) {
    if (b.dataset.pagina === id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  /* Si la página abierta no está en la barra, se marca el menú:
     así siempre se ve dónde estás parado. */
  var tabMenu = porId('tab-menu');
  if (tabMenu) {
    if (id && TABS_INFERIORES.indexOf(id) === -1) tabMenu.setAttribute('aria-current', 'page');
    else tabMenu.removeAttribute('aria-current');
  }
}

function construirMenu() {
  var grupos = {};
  Object.keys(PAGINAS).forEach(function (id) {
    var p = PAGINAS[id];
    if (!p.menu) return;
    (grupos[p.grupo || 'General'] = grupos[p.grupo || 'General'] || []).push(p);
  });
  var html = '';
  Object.keys(grupos).forEach(function (g) {
    html += '<div class="nav-grupo">' + esc(g) + '</div>';
    grupos[g].forEach(function (p) {
      html += '<button class="nav-item" data-pagina="' + p.id + '" onclick="irA(\'' + p.id + '\')">' +
                '<span class="nav-ic">' + ic(p.icono, 17) + '</span>' + esc(p.menu) +
              '</button>';
    });
  });
  porId('nav').innerHTML = html;
}

/* Esta app tiene solo dos pantallas, así que las dos entran
   directo en la barra de abajo — no hace falta el botón "Menú"
   con el resto adentro, como en la app grande de Intencional. */
var TABS_INFERIORES = ['pedidos', 'colores'];

function construirBarraInferior() {
  var cont = porId('barra-inferior');
  if (!cont) return;

  cont.innerHTML = TABS_INFERIORES.map(function (id) {
    var p = PAGINAS[id];
    if (!p) return '';
    return '<button class="tab-inferior" data-pagina="' + id + '" onclick="irA(\'' + id + '\')">' +
      ic(p.icono, 20) + '<span>' + esc(p.menu) + '</span></button>';
  }).join('') +
    (paginasFueraDeLaBarra().length
      ? '<button class="tab-inferior" id="tab-menu" onclick="alternarMenuMas()">' +
          ic('menu', 20) + '<span>Menú</span></button>'
      : '');
}

/* ═══════════════════════════════════════════════════════════
   EL MENÚ DE LAS DEMÁS PÁGINAS
   ═══════════════════════════════════════════════════════════ */
function paginasFueraDeLaBarra() {
  return Object.keys(PAGINAS)
    .filter(function (id) { return TABS_INFERIORES.indexOf(id) === -1 && PAGINAS[id].menu; })
    .map(function (id) { return PAGINAS[id]; });
}

function alternarMenuMas() {
  var abierto = porId('menu-mas');
  if (abierto) { cerrarMenuMas(); return; }

  var cap = document.createElement('div');
  cap.id = 'menu-mas';
  cap.className = 'menu-mas';
  cap.onclick = function (e) { if (e.target === cap) cerrarMenuMas(); };

  cap.innerHTML =
    '<div class="menu-mas-caja" onclick="event.stopPropagation()">' +
      '<div class="menu-mas-agarre"></div>' +
      '<div class="menu-mas-grilla">' +
        paginasFueraDeLaBarra().map(function (p) {
          return '<button class="menu-mas-item" onclick="irDesdeMenu(\'' + p.id + '\')">' +
            '<span class="menu-mas-ic">' + ic(p.icono, 20) + '</span>' +
            '<span class="menu-mas-txt">' + esc(p.menu) + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';

  document.body.appendChild(cap);
  /* En el próximo cuadro, para que la transición se vea */
  var mostrar = function () { cap.classList.add('visible'); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(mostrar);
  else setTimeout(mostrar, 16);
}

function cerrarMenuMas() {
  var cap = porId('menu-mas');
  if (!cap) return;
  cap.classList.remove('visible');
  setTimeout(function () { if (cap.parentNode) cap.remove(); }, 160);
  marcarMenu((location.hash || '').replace(/^#\/?/, '').split('?')[0]);
}

function irDesdeMenu(id) {
  cerrarMenuMas();
  irA(id);
}

window.addEventListener('hashchange', pintarRuta);
