/* Marcador «📒 Migrar desde la Libreta» — fuente legible del marcador que se instala desde anep.html.
   Lee el paquete que copia la Libreta de Clase (botón «⇪ Migrar a ANEP») y completa la pantalla abierta:
     · asistencia  → Registro de inasistencias de UTU (Pasaje de Lista): horas injustificadas y justificadas de una fecha
     · evaluacion  → Portafolio Docente → Evaluación grupal: tipo de actividad, fecha, descripción y notas
     · cierre      → Portafolio Docente → Cerrar promedios: calificación y juicio conceptual del período abierto
   Y al revés («⬇ De esta pantalla a la Libreta»): en el Registro de inasistencias lee las faltas de un rango de fechas
   (pide la misma pantalla con otra fecha, de a tres por vez) y en Cerrar promedios lee el total de fictas; copia un paquete
   «tipo: faltas | fictas» que se pega en la Libreta (Resumen → «⬇ Traer de ANEP»).
   Nunca aprieta «Guardar» y no envía datos a ningún lado. Después de cambiar este archivo: node armar-anep.js */
(function () {
  "use strict";
  if (window.__migrarLibreta) { window.__migrarLibreta.mostrar(); return; }

  var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim(); };
  var toks = function (s) { return norm(s).split(" ").filter(function (w) { return w.length > 1 && !/^\d+$/.test(w); }); };
  var vis = function (e) { return !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var byId = function (id) { return document.getElementById(id); };
  var LIBRETA = "https://adelvalle2010.github.io/carpeta-clase/";
  var NOMBRES = { asistencia: "asistencia", evaluacion: "evaluación", cierre: "cierre de promedios" };
  var DONDE = { asistencia: "«Pasaje de Lista» (Registro de inasistencias de UTU)", evaluacion: "Calificaciones → Evaluación grupal → Nueva evaluación grupal", cierre: "Calificaciones → Cerrar promedios" };

  function poner(el, v) {
    try { el.dispatchEvent(new Event("focus")); } catch (e) {}
    var d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    if (d && d.set) d.set.call(el, v); else el.value = v;
    ["input", "change", "keyup", "blur"].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  var marca = function (el, color) { el.style.outline = color ? "3px solid " + color : ""; el.style.outlineOffset = color ? "1px" : ""; };
  var dmy = function (iso) { var p = String(iso).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0].slice(2) : ""; };
  var mismaFecha = function (iso, txt) { // "2026-11-13" contra "13/11/26", "13/11/2026" o "3/8/26"
    var p = String(iso).split("-").map(Number), q = String(txt || "").trim().split("/").map(Number);
    return p.length === 3 && q.length === 3 && p[2] === q[0] && p[1] === q[1] && p[0] % 100 === q[2] % 100;
  };

  /* ---- qué pantalla es ---- */
  function pantalla() {
    var sp = Array.prototype.slice.call(document.querySelectorAll('[id^="span_BDALUPERNOMCOM_"]'));
    if (sp.length && byId("vFECHA")) {
      return { tipo: "asistencia", fecha: byId("vFECHA").value, filas: sp.map(function (s) {
        var suf = s.id.slice("span_BDALUPERNOMCOM_".length);
        return { nombre: s.textContent, inj: byId("vCNTI_" + suf), jus: byId("vCNTJ_" + suf) };
      }).filter(function (f) { return f.inj && f.jus && !f.inj.disabled && !f.jus.disabled; }) };
    }
    var F = function (id) { return byId("form_evaluacion_grupal:" + id); };
    if (F("input_tipo_evaluacion")) {
      return { tipo: "evaluacion", selTipo: F("input_tipo_evaluacion"), fecha: F("input_fecha_eval_grupal_input"), desc: F("evalDescripc"), tipoCalif: F("tipo_calif"),
        filas: Array.prototype.map.call(document.querySelectorAll("tr.estudiante_fila"), function (tr) {
          var n = tr.querySelector("td.fit-content-eval-est") || tr.cells[1];
          if (n) { n = n.cloneNode(true); Array.prototype.forEach.call(n.querySelectorAll(".dataadcurricular"), function (x) { x.remove(); }); } // sin la marca «AR» de ajuste razonable
          return { nombre: n ? n.textContent : "", nota: tr.querySelector("input.campoCalificacion"), texto: tr.querySelector("td.calif-comentario textarea") || tr.querySelector("textarea") };
        }).filter(function (f) { return f.nota && !f.nota.disabled && !f.nota.readOnly; }) };
    }
    var al = document.querySelectorAll("tr.filaalumno");
    if (al.length) {
      return { tipo: "cierre", filas: Array.prototype.map.call(al, function (tr) {
        var n = tr.querySelector("td.nombre");
        var nota = Array.prototype.filter.call(tr.querySelectorAll("input.campoCalificacion"), function (e) { return vis(e) && !e.disabled && !e.readOnly; });
        var ta = Array.prototype.filter.call(tr.querySelectorAll("textarea"), function (e) { return vis(e) && !e.disabled && !e.readOnly; });
        return { nombre: n ? n.textContent : "", nota: nota[nota.length - 1] || null, texto: ta[ta.length - 1] || null };
      }).filter(function (f) { return f.nota || f.texto; }) };
    }
    return null;
  }

  /* ---- emparejar nombres: «Ana Pérez» encuentra a «PEREZ GOMEZ, ANA MARIA»; si hay dos posibles, no completa ---- */
  function emparejar(pag, paq) {
    var P = pag.map(function (f) { var nom = f.nombre.replace(/^\s*\d+\.?\s+/, ""); return { n: norm(nom), t: toks(nom) }; }); // sin el número de lista («0. », «12 »)
    var res = paq.map(function (f) {
      var n = norm(f.nombre), t = toks(f.nombre), c = [];
      if (!t.length) return -1;
      P.forEach(function (p, i) { if (p.n === n) c.push(i); });
      if (!c.length) P.forEach(function (p, i) {
        var chico = t.length <= p.t.length ? t : p.t, grande = t.length <= p.t.length ? p.t : t;
        if (chico.length && chico.every(function (w) { return grande.indexOf(w) >= 0; })) c.push(i);
      });
      return c.length === 1 ? c[0] : c.length ? -2 : -1;
    });
    var usos = {};
    res.forEach(function (i) { if (i >= 0) usos[i] = (usos[i] || 0) + 1; });
    return res.map(function (i) { return i >= 0 && usos[i] > 1 ? -2 : i; });
  }

  function leerPaquete(txt) {
    var m = /LIBRETA-ANEP\s*(\{[\s\S]*\})/.exec(String(txt || ""));
    if (!m) return null;
    try { var p = JSON.parse(m[1]); return p && p.app === "libreta-anep" && Array.isArray(p.filas) && NOMBRES[p.tipo] ? p : null; } catch (e) { return null; }
  }
  function resumenPaquete(p) {
    var n = p.filas.length + " estudiante" + (p.filas.length === 1 ? "" : "s");
    if (p.tipo === "asistencia") return "Asistencia del " + dmy(p.fecha) + " · " + n + " · «" + p.grupo + "»";
    if (p.tipo === "evaluacion") return "Evaluación «" + p.actividad + "» del " + dmy(p.fecha) + " · " + n + " · «" + p.grupo + "»";
    return "Cierre (promedio " + p.promedio + ") · " + n + " · «" + p.grupo + "»";
  }

  /* ---- completar ---- */
  var hechos = [], marcados = [];
  function escribir(el, v, reemplazar, r, nombre, vacio) {
    var act = String(el.value == null ? "" : el.value).trim();
    if (act === String(v)) { r.iguales++; marca(el, "#2f9e5b"); marcados.push(el); return; }
    if (act !== "" && act !== vacio && !reemplazar) { r.ocupados.push(nombre); marca(el, "#c2410c"); marcados.push(el); return; }
    hechos.push([el, el.value]); poner(el, String(v)); marca(el, "#2f9e5b"); marcados.push(el); r.puestos++;
  }
  function completar(p, reemplazar) {
    var pg = pantalla(), r = { puestos: 0, iguales: 0, ocupados: [], sin: [], dudosos: [], avisos: [], error: "" };
    if (!pg) { r.error = "Esta pantalla no tiene nada para completar. Para este paquete abrí " + DONDE[p.tipo] + "."; return r; }
    if (pg.tipo !== p.tipo) { r.error = "El paquete copiado es de " + NOMBRES[p.tipo] + ", y esta pantalla es de " + NOMBRES[pg.tipo] + ". Abrí " + DONDE[p.tipo] + ", o copiá el otro paquete en la Libreta."; return r; }
    if (!pg.filas.length) { r.error = p.tipo === "cierre" ? "No encontré casilleros abiertos: desplegá el período a cerrar (por ejemplo Oct-Nov) y probá de nuevo." : "No encontré casilleros para completar en esta pantalla."; return r; }
    if (p.tipo === "asistencia" && !mismaFecha(p.fecha, pg.fecha)) { r.error = "El paquete es del " + dmy(p.fecha) + " y esta pantalla está en " + pg.fecha + ". Cambiá la fecha de la pantalla a " + dmy(p.fecha) + ", esperá a que recargue la lista y tocá «Completar» otra vez."; return r; }
    if (p.tipo === "evaluacion") {
      if (pg.tipoCalif && pg.tipoCalif.value !== "numerico_1_10") { r.error = "En «Tipos de calificaciones» elegí «Calificaciones del 1 al 10» y tocá «Completar» otra vez."; return r; }
      var op = Array.prototype.filter.call(pg.selTipo.options, function (o) { return norm(o.text) === norm(p.actividad); })[0];
      if (!pg.selTipo.disabled && op) { if (pg.selTipo.value !== op.value) { hechos.push([pg.selTipo, pg.selTipo.value]); poner(pg.selTipo, op.value); } marca(pg.selTipo, "#2f9e5b"); marcados.push(pg.selTipo); }
      else r.avisos.push("No pude poner el tipo de actividad «" + p.actividad + "»: elegilo a mano.");
      if (pg.fecha && !pg.fecha.disabled) { if (!mismaFecha(p.fecha, pg.fecha.value)) { hechos.push([pg.fecha, pg.fecha.value]); poner(pg.fecha, dmy(p.fecha)); } marca(pg.fecha, "#2f9e5b"); marcados.push(pg.fecha); }
      if (pg.desc && p.descripcion && (reemplazar || !pg.desc.value.trim())) { hechos.push([pg.desc, pg.desc.value]); poner(pg.desc, p.descripcion); marca(pg.desc, "#2f9e5b"); marcados.push(pg.desc); }
    }
    var par = emparejar(pg.filas, p.filas), usados = {};
    p.filas.forEach(function (f, i) {
      if (par[i] === -1) { r.sin.push(f.nombre); return; }
      if (par[i] === -2) { r.dudosos.push(f.nombre); return; }
      var d = pg.filas[par[i]]; usados[par[i]] = 1;
      if (p.tipo === "asistencia") { escribir(d.inj, f.inj || 0, reemplazar, r, f.nombre, "0"); escribir(d.jus, f.jus || 0, reemplazar, r, f.nombre, "0"); return; }
      if (f.nota !== "" && f.nota != null && d.nota) escribir(d.nota, f.nota, reemplazar, r, f.nombre, "");
      if (p.tipo === "cierre" && f.juicio && d.texto) escribir(d.texto, f.juicio, reemplazar, r, f.nombre + " (juicio)", "");
    });
    r.resto = 0;
    pg.filas.forEach(function (d, i) {
      if (usados[i]) return; r.resto++;
      if (p.tipo !== "asistencia" && d.nota && !String(d.nota.value).trim()) { marca(d.nota, "#e0a100"); marcados.push(d.nota); }
    });
    return r;
  }
  function deshacer() {
    hechos.reverse().forEach(function (h) { poner(h[0], h[1]); }); hechos = [];
    marcados.forEach(function (e) { marca(e, ""); }); marcados = [];
  }

  /* ---- llevar a la Libreta: faltas día a día (Registro de inasistencias de UTU) y total de fictas (Cerrar promedios) ---- */
  var RE_FECHA = /^20\d\d(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
  var dos = function (n) { return String(n).padStart(2, "0"); };
  var isoDe = function (d) { return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); };
  var isoDeDmy = function (s) { var p = String(s || "").trim().split("/"); return p.length === 3 ? (p[2].length === 2 ? "20" + p[2] : p[2]) + "-" + dos(p[1]) + "-" + dos(p[0]) : ""; };
  function esRegistroUtu() { return !!(byId("vFECHA") && document.querySelector('input[name="Grid1ContainerDataV"]')); }
  function esCierre() { return !!document.querySelector("tr.filaalumno td.tdasis"); }
  var BASE_UTU = "libreta-anep-utu";
  function urlDeFecha(iso) { // la misma dirección de esta pantalla, con otra fecha
    var d = iso.replace(/-/g, ""), q = location.search.slice(1).split(",");
    var idx = q.map(function (x, i) { return RE_FECHA.test(x) ? i : -1; }).filter(function (i) { return i >= 0; });
    if (idx.length && q.length >= 11) {
      var actual = isoDeDmy(byId("vFECHA") ? byId("vFECHA").defaultValue : "").replace(/-/g, "");
      var i = idx.filter(function (k) { return q[k] === actual; })[0]; if (i === undefined) i = idx[0];
      try { localStorage.setItem(BASE_UTU, JSON.stringify({ path: location.pathname, q: q, i: i })); } catch (e) {}
      q[i] = d; return location.pathname + "?" + q.join(",");
    }
    // después de «Guardar» o «Renovar» la dirección queda sin los datos del curso: se arman con la planilla y el usuario de la pantalla
    try {
      var r = JSON.parse(document.querySelector('input[name="Grid1ContainerDataV"]').value)[0], st = JSON.parse(document.querySelector('input[name="GXState"]').value);
      var u = String(st.vCSUSUARIOCODIGO || "").trim();
      if (r && r.length >= 11 && /^\d+$/.test(u)) return location.pathname + "?" + [r[1], r[2], r[3], r[5], r[8], r[6], r[7], r[4], r[9], r[10], d, u, "null"].join(",");
    } catch (e) {}
    try { var b = JSON.parse(localStorage.getItem(BASE_UTU) || "null"); if (b && b.path === location.pathname) { b.q[b.i] = d; return b.path + "?" + b.q.join(","); } } catch (e) {}
    return null;
  }
  function leerFechaUtu(iso) {
    var url = urlDeFecha(iso); if (!url) return Promise.reject(new Error("direccion"));
    return fetch(url, { credentials: "include" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html"), inp = doc.querySelector('input[name="Grid1ContainerDataV"]');
      if (!inp) throw new Error("sesion");
      var rows = JSON.parse(inp.value || "[]"); if (!Array.isArray(rows)) throw new Error("formato");
      var num = function (x) { x = String(x == null ? "" : x).trim(); return /^\d+$/.test(x) ? Number(x) : 0; }; // vacío (p. ej. «No debe asistir») = 0
      var filas = rows.filter(function (r) { return Array.isArray(r) && r.length >= 18 && /[A-Za-zÁÉÍÓÚÑ]{2}/.test(String(r[13])) && !/^C\.?\s?I\s/i.test(String(r[13])); })
        .map(function (r) { return { nombre: String(r[13]).replace(/\s+/g, " ").trim(), inj: num(r[16]), jus: num(r[17]) }; });
      if (rows.length && !filas.length) throw new Error("formato");
      return filas;
    });
  }
  var lectura = null;
  function leerFaltas(desde, hasta, dias, avance) {
    var fechas = [], d = new Date(desde + "T12:00"), fin = new Date(hasta + "T12:00");
    for (; d <= fin; d.setDate(d.getDate() + 1)) if (dias.indexOf(d.getDay()) >= 0) fechas.push(isoDe(d));
    var st = lectura = { parar: false, hechas: 0, total: fechas.length, fallidas: [], seguidas: 0, res: {}, nombres: {}, error: "" }, i = 0;
    function uno() {
      if (st.parar || i >= fechas.length) return Promise.resolve();
      var f = fechas[i++];
      return leerFechaUtu(f).then(function (filas) {
        st.seguidas = 0;
        filas.forEach(function (x) { st.nombres[x.nombre] = 1; });
        var con = filas.filter(function (x) { return x.inj || x.jus; });
        if (con.length) st.res[f] = con;
      }, function (e) {
        st.fallidas.push(f); st.seguidas++;
        if (e.message === "formato" || e.message === "direccion" || st.seguidas >= 6) { st.parar = true; st.error = e.message === "formato" || e.message === "direccion" ? e.message : e.message === "sesion" ? "sesion" : "red"; }
      }).then(function () { st.hechas++; avance(st); return new Promise(function (r) { setTimeout(r, 120); }); }).then(uno);
    }
    return Promise.all([uno(), uno(), uno()]).then(function () { return st; }); // de a tres pedidos por vez
  }
  function paqueteFaltas(st, desde, hasta, dias) {
    return { app: "libreta-anep", v: 1, tipo: "faltas", origen: "utu", asignatura: ((byId("MATCODDES") || {}).value || "").replace(/^\d+-/, "").trim(), grupo: (byId("GRPCOD_0001") || {}).value || "",
      desde: desde, hasta: hasta, dias: dias, leidas: st.hechas - st.fallidas.length, fallidas: st.fallidas, estudiantes: Object.keys(st.nombres), fechas: st.res };
  }
  function leerTotales() {
    var obtenido = "", asign = "";
    var filas = Array.prototype.map.call(document.querySelectorAll("tr.filaalumno"), function (tr) {
      var td = tr.querySelector("td.tdasis"), sp = td && td.querySelector(".calif_inas_fictas_update"), tt = td && td.querySelector(".data-tooltip");
      var ne = tt && tt.querySelector(".nombreEstudiante"), nom = ne ? ne.textContent : ((tr.querySelector("td.nombre") || {}).textContent || "").replace(/^\s*\d+\.?\s+/, "");
      var txt = tt ? tt.innerHTML.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ") : ""; // los <br> separan «6» de «Justificadas»
      var num = sp ? Array.prototype.filter.call(sp.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.nodeValue; }).join("").trim() : "";
      var mo = /Fecha de obtenci[oó]n:\s*([\d\/]+(?:\s+[\d:]+)?)/i.exec(txt); if (mo && !obtenido) obtenido = mo[1];
      var ma = /Detalle inasistencias de\s*(.+?):/i.exec(txt); if (ma && !asign) asign = ma[1].trim();
      var n = function (re) { var m = re.exec(txt); return m ? Number(m[1].replace(",", ".")) : null; };
      var f = Number(num.replace(",", ".")), ok = num !== "" && isFinite(f);
      return { nombre: nom.replace(/\s+/g, " ").trim(), fictas: ok ? f : null, inj: n(/Injustificadas:\s*(\d+(?:[.,]\d+)?)/i), jus: n(/(?:^|[^a-z])Justificadas:\s*(\d+(?:[.,]\d+)?)/i), nd: !ok };
    });
    return { app: "libreta-anep", v: 1, tipo: "fictas", obtenido: obtenido, asignatura: asign, filas: filas };
  }

  /* ---- cuadro ---- */
  var host = document.createElement("div");
  host.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647";
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  root.innerHTML = '<style>.p{width:370px;max-height:88vh;overflow:auto;background:#fff;color:#1b2333;border:2px solid #2a4ea8;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:14px/1.45 system-ui,sans-serif;padding:12px 14px;position:relative;text-align:left}h2{margin:0 26px 6px 0;font-size:16px;color:#2a4ea8}textarea{width:100%;box-sizing:border-box;height:64px;font:12px ui-monospace,monospace}label{display:block;margin:6px 0}button{font:inherit;border:0;border-radius:6px;padding:6px 12px;cursor:pointer;background:#2a4ea8;color:#fff;margin:6px 6px 0 0}button.alt{background:#e9edf5;color:#1b2333}button:disabled{opacity:.5;cursor:default}.x{position:absolute;top:4px;right:6px;background:none;color:#1b2333;font-size:20px;padding:0 6px;margin:0}.pq{background:#e8e4f8;border-radius:6px;padding:6px 8px;margin:6px 0}.r{margin-top:8px;font-size:13px}.r ul{margin:4px 0 0;padding-left:18px}h3{margin:4px 0;font-size:14px;color:#2a4ea8}.tr{border-top:1px solid #d9dfea;margin-top:10px;padding-top:6px}label.inl{display:inline-block;margin:3px 8px 3px 0}input[type=date]{font:inherit;font-size:13px}.out{height:46px}.ok{color:#1f7a4d}.av{color:#946200}.mal{color:#b3332b}small{color:#5d6880;display:block;margin-top:6px}</style>' +
    '<div class="p"><button class="x" title="Cerrar">×</button><h2>📒 Migrar desde la Libreta</h2><h3>⬆ De la Libreta a esta pantalla</h3><div class="pq">Buscando lo copiado…</div><textarea placeholder="Si no aparece solo, pegá acá lo copiado en la Libreta (Ctrl+V)"></textarea><label><input type="checkbox" class="rp"> Reemplazar lo que ya esté escrito</label><button class="go">Completar</button><button class="alt un" disabled>Deshacer</button><div class="r"></div><small>No se guarda nada: revisá y apretá «Guardar» en la pantalla.</small>' +
    '<div class="tr" hidden><h3>⬇ De esta pantalla a la Libreta</h3>' +
    '<div class="trutu" hidden><small style="margin:0 0 4px">Lee las faltas guardadas en este registro, fecha por fecha. Solo lee: no cambia nada.</small><label class="inl">Desde <input type="date" class="d1"></label><label class="inl">hasta <input type="date" class="d2"></label><div class="dias">Días: ' +
    ["L", "M", "X", "J", "V", "S"].map(function (d, i) { return '<label class="inl"><input type="checkbox" value="' + (i + 1) + '">' + d + "</label>"; }).join("") + '</div><button class="leer">Leer faltas</button><button class="alt det" hidden>Detener</button></div>' +
    '<div class="trci" hidden><small style="margin:0 0 4px">Lee el total de faltas fictas de cada estudiante (columna In.Fictas). Para tenerlo al día, actualizá antes esa columna con su ícono.</small><button class="leer2">Leer el total de faltas</button></div>' +
    '<div class="r trr"></div><button class="ab" hidden>Abrir en la Libreta ↗</button><button class="alt cp" hidden>Copiar</button><textarea class="out" readonly hidden></textarea></div></div>';
  var q = function (s) { return root.querySelector(s); };
  var paquete = null;
  function ver() {
    paquete = leerPaquete(q("textarea").value);
    q(".pq").textContent = paquete ? resumenPaquete(paquete) : q("textarea").value.trim() ? "Eso no es un paquete de la Libreta. En la Libreta: Resumen → «⇪ Migrar a ANEP» → Copiar." : "Pegá abajo lo copiado en la Libreta (Resumen → «⇪ Migrar a ANEP»).";
    q(".go").disabled = !paquete;
  }
  function leerPortapapeles() {
    if (!navigator.clipboard || !navigator.clipboard.readText) { ver(); return; }
    navigator.clipboard.readText().then(function (t) { if (leerPaquete(t)) q("textarea").value = t; ver(); }, ver);
  }
  var lista = function (clase, titulo, a) { return a.length ? '<div class="' + clase + '">' + titulo + "<ul>" + a.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : ""; };
  q("textarea").addEventListener("input", ver);
  q(".x").addEventListener("click", function () { host.remove(); });
  q(".un").addEventListener("click", function () { deshacer(); q(".un").disabled = true; q(".r").innerHTML = "Deshecho: los casilleros volvieron a como estaban."; });
  q(".go").addEventListener("click", function () {
    if (!paquete) return;
    deshacer();
    var r = completar(paquete, q(".rp").checked), el = q(".r");
    if (r.error) { el.innerHTML = '<span class="mal">' + esc(r.error) + "</span>"; return; }
    q(".un").disabled = !hechos.length;
    var uno = r.puestos === 1, que = (uno ? "casillero" : "casilleros") + (paquete.tipo === "asistencia" ? " de horas" : "");
    el.innerHTML = '<span class="ok"><b>' + r.puestos + "</b> " + que + (uno ? " completado" : " completados") + (r.iguales ? " (" + r.iguales + (r.iguales === 1 ? " ya estaba igual)" : " ya estaban igual)") : "") + ".</span>" +
      lista("av", "Ya tenían otro valor y no se tocaron (en naranja; marcá «Reemplazar» para pisarlos):", r.ocupados) +
      lista("mal", "No los encontré en esta pantalla:", r.sin) +
      lista("av", "Nombre dudoso (coincide con más de un estudiante), completalo a mano:", r.dudosos) +
      lista("av", "Para revisar:", r.avisos) +
      (r.resto ? '<div class="av">' + r.resto + " estudiante" + (r.resto === 1 ? "" : "s") + " de esta pantalla no venía" + (r.resto === 1 ? "" : "n") + " en el paquete" + (paquete.tipo === "asistencia" ? "" : " (casillero vacío en amarillo)") + ".</div>" : "");
  });
  var PREF = "libreta-anep-traer", prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREF) || "{}") || {}; } catch (e) {}
  function prepararTraer() {
    var utu = esRegistroUtu(), ci = !utu && esCierre();
    q(".tr").hidden = !(utu || ci); q(".trutu").hidden = !utu; q(".trci").hidden = !ci;
    if (utu && !q(".d2").value) {
      var hoy = isoDe(new Date()), enPantalla = isoDeDmy(byId("vFECHA").defaultValue); if (enPantalla > hoy) hoy = enPantalla;
      q(".d2").value = hoy; q(".d1").value = prefs.desde && prefs.desde < hoy ? prefs.desde : hoy.slice(0, 4) + "-03-01";
      var dias = Array.isArray(prefs.dias) && prefs.dias.length ? prefs.dias : [1, 2, 3, 4, 5];
      Array.prototype.forEach.call(root.querySelectorAll(".dias input"), function (c) { c.checked = dias.indexOf(Number(c.value)) >= 0; });
    }
  }
  function mostrarSalida(paq, html) {
    q(".trr").innerHTML = html;
    var txt = "LIBRETA-ANEP " + JSON.stringify(paq);
    q(".out").value = txt; q(".out").hidden = true; q(".cp").hidden = false; q(".ab").hidden = false; q(".cp").textContent = "Copiar";
    q(".trr").insertAdjacentHTML("beforeend", '<div>Tocá <b>Abrir en la Libreta</b>: se abre con estos datos listos para revisar.</div>');
    try { q(".ab").scrollIntoView({ block: "nearest" }); } catch (e) {} // que el botón quede a la vista dentro del cuadro
  }
  q(".cp").addEventListener("click", function () {
    var t = q(".out").value, listo = function () { q(".cp").textContent = "✓ Copiado"; q(".trr").insertAdjacentHTML("beforeend", '<div class="ok">Copiado. En la Libreta: Resumen del grupo → «⬇ Traer de ANEP» → «Pegar lo copiado en ANEP».</div>'); };
    var aMano = function () { q(".out").hidden = false; q(".out").select(); try { if (document.execCommand("copy")) return listo(); } catch (e) {} q(".trr").insertAdjacentHTML("beforeend", '<div class="av">No pude copiar solo: el texto quedó seleccionado abajo, copialo con Ctrl+C.</div>'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(listo, aMano); else aMano();
  });
  q(".ab").addEventListener("click", function () { // pasa el paquete en la dirección (#anep=…): no hace falta copiar ni pegar
    var w = window.open(LIBRETA + "#anep=" + encodeURIComponent(q(".out").value.replace(/^LIBRETA-ANEP\s*/, "")), "_blank");
    if (!w) q(".trr").insertAdjacentHTML("beforeend", '<div class="av">El navegador bloqueó la ventana nueva: permití las ventanas emergentes de este sitio o usá «Copiar».</div>');
  });
  q(".det").addEventListener("click", function () { if (lectura) lectura.parar = true; });
  q(".leer").addEventListener("click", function () {
    var d1 = q(".d1").value, d2 = q(".d2").value, dias = Array.prototype.filter.call(root.querySelectorAll(".dias input"), function (c) { return c.checked; }).map(function (c) { return Number(c.value); });
    if (!d1 || !d2 || d1 > d2) { q(".trr").innerHTML = '<span class="mal">Revisá las fechas: «desde» tiene que ser anterior a «hasta».</span>'; return; }
    if (!dias.length) { q(".trr").innerHTML = '<span class="mal">Marcá al menos un día de la semana.</span>'; return; }
    try { localStorage.setItem(PREF, JSON.stringify({ desde: d1, dias: dias })); } catch (e) {}
    q(".leer").disabled = true; q(".det").hidden = false; q(".cp").hidden = true; q(".ab").hidden = true; q(".out").hidden = true;
    leerFaltas(d1, d2, dias, function (st) { q(".trr").textContent = "Leyendo " + st.hechas + " de " + st.total + " fechas…"; }).then(function (st) {
      q(".leer").disabled = false; q(".det").hidden = true;
      if (st.error === "direccion") { q(".trr").innerHTML = '<span class="mal">No reconozco esta pantalla. Volvé a abrir «Pasaje de Lista» desde el Portafolio de ANEP y tocá el marcador otra vez.</span>'; return; }
      if (st.error === "formato") { q(".trr").innerHTML = '<span class="mal">No pude leer las faltas de este registro. Volvé a abrir «Pasaje de Lista» desde el Portafolio y probá otra vez; si sigue igual, puede que la pantalla de UTU haya cambiado.</span>'; return; }
      if (st.error && !Object.keys(st.nombres).length) { q(".trr").innerHTML = '<span class="mal">' + (st.error === "sesion" ? "Parece que se cerró la sesión: volvé a entrar al Portafolio, abrí «Pasaje de Lista» y probá de nuevo." : "No pude conectarme con el registro de UTU. Probá de nuevo en un rato.") + "</span>"; return; }
      var fs = Object.keys(st.res).sort(), horas = 0;
      fs.forEach(function (f) { st.res[f].forEach(function (x) { horas += x.inj + x.jus; }); });
      var paq = paqueteFaltas(st, d1, d2, dias);
      mostrarSalida(paq, '<span class="ok">Leí ' + paq.leidas + " fecha" + (paq.leidas === 1 ? "" : "s") + ": <b>" + fs.length + "</b> con faltas (" + horas + " h en total).</span>" +
        (fs.length ? '<div style="font-size:12px">' + fs.map(function (f) { return dmy(f) + " (" + st.res[f].length + ")"; }).join(" · ") + "</div>" : "") +
        (st.parar && !st.error ? '<div class="av">Detenido antes de terminar: el paquete tiene solo lo leído.</div>' : "") +
        (st.fallidas.length ? '<div class="av">No pude leer ' + st.fallidas.length + " fecha" + (st.fallidas.length === 1 ? "" : "s") + ": " + st.fallidas.map(dmy).join(", ") + (st.error === "sesion" ? ". Parece que se cerró la sesión." : "") + "</div>" : ""));
    });
  });
  q(".leer2").addEventListener("click", function () {
    var paq = leerTotales(), con = paq.filas.filter(function (x) { return !x.nd; }).length;
    if (!paq.filas.length) { q(".trr").innerHTML = '<span class="mal">No encontré la columna In.Fictas.</span>'; return; }
    mostrarSalida(paq, '<span class="ok">' + paq.filas.length + " estudiantes, " + con + " con dato" + (paq.obtenido ? " (obtenido el " + esc(paq.obtenido) + ")" : "") + ".</span>");
  });
  var enLibreta = location.href.indexOf(LIBRETA) === 0 || /^Libreta de Clase/.test(document.title);
  if (enLibreta) root.querySelector(".p").innerHTML = '<button class="x" title="Cerrar">×</button><h2>📒 Migrar desde la Libreta</h2><p>Esta es tu <b>Libreta</b>. El marcador se toca <b>en las pantallas de ANEP</b>, no acá:</p><ul style="padding-left:18px;margin:4px 0"><li><b>Para llevar datos a ANEP:</b> acá, en Resumen → «⇪ Migrar a ANEP», tocá un botón «Copiar…»; después abrí la pantalla de ANEP y tocá el marcador allá.</li><li><b>Para traer faltas de ANEP:</b> abrí «Pasaje de Lista» o «Cerrar promedios» en ANEP y tocá el marcador allá.</li></ul>', q(".x").addEventListener("click", function () { host.remove(); });
  window.__migrarLibreta = { mostrar: function () { if (enLibreta) { if (!host.isConnected) document.body.appendChild(host); return; } prepararTraer(); if (!host.isConnected) document.body.appendChild(host); leerPortapapeles(); }, _probar: { leerFechaUtu: leerFechaUtu, leerTotales: leerTotales, urlDeFecha: urlDeFecha, pantalla: pantalla, completar: completar, deshacer: deshacer, emparejar: emparejar, leerPaquete: leerPaquete } };
  window.__migrarLibreta.mostrar();
})();
