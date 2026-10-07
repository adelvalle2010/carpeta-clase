# Libreta de Clase

Página web para llevar la libreta del docente por día de clase: asistencia, actividades y notas de cada estudiante, con un resumen del grupo y descarga a Excel.

Es un solo archivo (`index.html`), sin servidor ni instalación.

## Qué hace

- **Varios grupos**, cada uno con su lista de estudiantes y sus columnas.
- **Clase del día:** elegís la fecha, creás la clase y marcás cada celda:
  - Presente: `P` presente · `A` ausente · `T` tarde · `J` falta justificada
  - Actividad: `✓` hecho · `½` parcial · `✗` no hecho
  - Nota: de 1 a 10 (verde si es 5 o más, ámbar si es de 1 a 4)
  - Observación: texto libre
- **Resumen del grupo:** % de asistencia (en rojo si es menos de 75 %), faltas, entregas, promedio y situación (**Aprobado** con 5 o más, **APE** de 1 a 4).
- **Excel:** descarga una planilla con tres hojas (Planilla, Resumen, Detalle).
- **Estudiantes:** se agregan de a uno, pegando una lista o importando la plantilla de Excel (lee la fila con `fecha | presente | actividad | nota | nombres…`).
- **Columnas configurables:** por ejemplo "Ejercicio 2" o "Tarea domiciliaria".

## Dónde se guardan los datos

Fuera de claude.ai (abriendo el archivo o desde GitHub Pages), los datos quedan en el **navegador** (`localStorage`). Por eso:

- Cada navegador y cada equipo tiene sus propios datos.
- Si borrás los datos del navegador, se pierden.
- Usá **Estudiantes y columnas → Respaldo → Exportar respaldo (.json)** seguido, y **Restaurar desde respaldo** para pasarlos a otro equipo.

Dentro de claude.ai la misma página guarda en la nube automáticamente.

## Publicarla con GitHub Pages

1. Subí `index.html` y `README.md` a un repositorio.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En un par de minutos queda en `https://<tu-usuario>.github.io/<repositorio>/`.

## Configuración

Al principio del script de `index.html`:

```js
const NOTA_MAX = 10, APRUEBA = 5; // 5 o más aprueba; de 1 a 4 va al APE de diciembre
```

## Dependencias

Se cargan desde CDN, así que la página necesita internet la primera vez:

- [SheetJS (xlsx 0.18.5)](https://cdnjs.com/libraries/xlsx) para importar y exportar Excel.
- Google Fonts: Bricolage Grotesque, Atkinson Hyperlegible, IBM Plex Mono.

## Privacidad

Si el repositorio es público, el código queda a la vista de cualquiera, pero los datos de los estudiantes **no**. Viven en tu navegador o en tus archivos de respaldo. No subas los `.json` de respaldo ni los Excel exportados a un repositorio público.
