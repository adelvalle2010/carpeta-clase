// Arma anep.html a partir de marcador-anep.js y anep.plantilla.html.  Uso: node armar-anep.js
// Si está instalado terser (npm i -g terser) el marcador queda más corto; si no, se usa tal cual sin comentarios.
const fs = require("fs"), cp = require("child_process");
let js = fs.readFileSync(__dirname + "/marcador-anep.js", "utf8");
try { js = cp.execSync("npx --no-install terser --compress --mangle", { input: js, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim(); }
catch (e) { js = js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s+/gm, "").replace(/\n+/g, "\n"); }
// El marcador carga la última versión publicada de marcador-anep.js (así no hay que reinstalarlo después de cada arreglo);
// si no se puede descargar, usa la copia que lleva adentro.
const cargador = "(function(){var s=document.createElement('script');s.src='https://adelvalle2010.github.io/carpeta-clase/marcador-anep.js?t='+Date.now();s.onerror=function(){" + js.replace(/;?\s*$/, "") + "};(document.body||document.documentElement).appendChild(s)})()";
const href = "javascript:" + encodeURIComponent(cargador).replace(/'/g, "%27");
fs.writeFileSync(__dirname + "/anep.html", fs.readFileSync(__dirname + "/anep.plantilla.html", "utf8").replace("__MARCADOR__", href));
console.log("anep.html listo:", href.length, "caracteres en el marcador");
