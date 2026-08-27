/* ── Bloques compartidos entre Pedidos y Colores ─────────────
   Copia chica del que usa la app de Intencional (pag-inicio.js);
   acá no hace falta traer el archivo entero por una sola función. */
function stat(icono, etiqueta, valor, sub, color, accion) {
  var cuerpo =
    '<div class="stat-etiq">' + ic(icono, 14) + esc(etiqueta) +
      (accion ? '<span style="margin-left:auto;opacity:.5">' + ic('chevron', 12) + '</span>' : '') + '</div>' +
    '<div class="stat-val" style="color:' + color + '">' + esc(valor) + '</div>' +
    (sub ? '<div class="stat-sub">' + esc(sub) + '</div>' : '');
  return accion
    ? '<button class="stat stat-tocable" onclick="' + accion + '">' + cuerpo + '</button>'
    : '<div class="stat">' + cuerpo + '</div>';
}

/* ── Texto con *negrita*, mayúsculas y saltos de línea tal cual ──
   La descripción de un color se escribe libre (el equipo puede
   poner MAYÚSCULAS, varios renglones, y marcar una palabra entre
   *asteriscos* para que salga en negrita). Por default el HTML
   colapsa los espacios y saltos de línea y no entiende *nada* de
   eso — acá se arma a mano: se escapa primero (por seguridad) y
   recién después se interpretan *bold* y \n, nunca al revés. */
function textoConFormato(s) {
  var e = esc(s || '');
  e = e.replace(/\*([^\n*]+)\*/g, '<strong>$1</strong>');
  return e.replace(/\n/g, '<br>');
}
