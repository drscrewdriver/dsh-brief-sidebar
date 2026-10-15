# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.9.12 — 2026-10-15 (un memoryId vacío tras reiniciar ya no parece un error)

- Corregido `⚠️ [object Object]`: al reiniciar, better-sidebar restaura primero las pestañas persistidas, así que `tab.path` está vacío, pero el código viejo enviaba igual `{ids:['']}`, y el servidor lo rechazaba («ids vacío tras el filtro»). El sobre de error del RPC del anfitrión es un **objeto** `error:{code,message}`; interpolado como texto daba `[object Object]`. Ahora un id vacío va directo al aviso «Ninguna memoria elegida para ver en este ciclo de arranque», **sin petición**.
- Mensajes de fallo legibles: primero `error.message`, luego `HTTP <status>` para no-2xx, y solo al final «memoria no encontrada». La única fuente de datos del visor quedó cubierta con pruebas de servidor (prime-memory `tests/records-meta.test.ts`).

## 0.9.11 — 2026-10-15 (visor de memoria integrado en este plugin)

- **Salto al detalle ya conectado**: un botón a la derecha de la barra de valoración y en cada línea `ref` de los espacios abre la pestaña `dsh-md-memory-viewer:memory` vía `betterSidebar.openTab`. **Canal de pestaña, sin sistema de archivos**: el enfoque fileViewer previo (ruta `<id>.memory` fingida) el EditorHost anfitrión la resolvía como archivo físico y siempre daba ENOENT.
- **El componente visor vive aquí ahora** (`src/client/memory-viewer/viewer.tsx`); el plugin independiente `dsh-md-memory-viewer` se retira. El tipo de pestaña se registra en `apply()` (`hidden: true`, fuera del menú +), así las pestañas restauradas tras reiniciar siguen teniendo dueño.
- **Referencia al service vía el módulo `memory-tab.ts`**: en componentes profundos `ctx.get('betterSidebar')` es rechazado en silencio por el proxy estricto (clic sin efecto ni error); la referencia se captura una vez en `apply()`.
- **Estado vacío**: sin `memoryId` (pestaña restaurada antes del registro) el panel muestra «Ninguna memoria elegida para ver en este ciclo de arranque» en lugar de un hueco.
- **Cuerpo en Markdown**: la burbuja y el visor comparten `renderMd` sin dependencias (encabezados / negrita / código inline / listas); todos los datos vienen de `dsh-memory/records-meta`.
- **Jerarquía visual**: el título usa el campo `name` (13px/600/color primario) y la línea de escenarios baja a 10px — antes un `## Conclusión` del cuerpo se mostraba como nombre.

## 0.9.10 — 2026-10-14 (límites alzados según medición y replay de sesiones viejas)

- Nuevos topes del plegado de búsqueda: fuentes 20→**64**, consultas 20→**48**, URLs del turno actual 20→**64**
  (extracto de 160 caracteres y 5 consultas por fuente sin cambios).
- Medido sobre 348 sesiones locales (70 con búsqueda): consultas por sesión p50=7/p90=29/p95=38/p99=67, fuentes por
  sesión p50=16/p90=54/p95=63/p99=164, fuentes por turno p50=16/p90=41/p95=51/max=65.
  El valor 20 anterior caía en p55: **hasta la sesión mediana quedaba truncada**; de ahí sale el «0 resultados».
- `stateVersion` sube a 2: **obligatorio aunque la forma no cambie**. Un punto de control escrito bajo los
  topes viejos ya tiró fuentes; solo una fila descartada se repliega desde el registro de eventos.
- Nueva prueba de presupuesto permanente: peor caso = 62.047 bytes por trama (presupuesto 96 KB), más la aserción de que
  los topes realmente aprietan; una sesión típica ronda los 15 KB.
- Sin ajuste expuesto por ahora: los topes viven en la mitad del anfitrión, y exponerlos pediría esquema de Config,
  `.volatile()` y el formulario en las seis líneas, además de afectar solo hacia adelante.

## 0.9.9 — 2026-10-14 (clústeres de búsqueda plegados por defecto)

- Todos los grupos de consulta de la pestaña «Búsquedas» están **plegados por defecto**, incluidos los del turno actual:
  se ve una línea por pregunta con el número real que contiene, en vez de volcar burbujas al entrar.
- La regla anterior («abrir el turno actual») tapaba, en una sesión real, la lista de preguntas que uno viene a recorrer.
- Se abre lo que se pulsa; el estado cuelga del texto de la consulta, así que un fotograma nuevo no cierra nada.
- Se quitó el campo `SearchCluster.latest` en cuanto dejó de consumirse.
- Las pruebas ahora fijan: todo plegado por defecto, un clic abre un solo grupo y un segundo lo vuelve a cerrar; el test de
  desinfección de enlaces abre primero, en vez de confundir «no renderizado» con «sin enlace».

## 0.9.8 — 2026-10-14 (grupos vacíos corregidos: cambiar la forma exige subir stateVersion)

- Corrige un fallo de 0.9.7: los encabezados de grupo contaban resultados y al abrirlos no había nada.
- Causa: el estado del plegado pasó de un `query` simple a `queries[]` y `stateVersion` siguió en 0.
  El `restore` del anfitrión solo descarta un punto de control si la versión difiere y entonces reinterpreta el registro
  (`session-projection/src/index.ts:88-92`, `:122-126`): la fila antigua cruzó el esquema nuevo, cada campo
  `queries` quedó en su valor por defecto vacío y todas las fuentes cayeron al grupo final.
- `stateVersion` pasa a 1: los puntos de control rancios se descartan y se pliegan bien desde el evento.
- Los encabezados ahora muestran cuántas entradas **contienen de verdad**, no los `hits` de la llamada: título y contenido ya no pueden contradecirse.
- Un grupo vacío pasa a ser una línea normal sin flecha; las fuentes sin reclamo siguen en «Fuentes · N», nada desaparece en silencio.
- Nueva guarda de registro: `stateVersion`=1 queda clavada, más la prueba de que una fila antigua sale vacía del esquema nuevo.

## 0.9.7 — 2026-10-14 (resultados agrupados por consulta y plegados)

- La pestaña «Búsquedas» agrupa ahora **por consulta**: una plegable por pregunta
  (`consulta · N resultados`) y, al abrirla, las burbujas que esa consulta trajo.
- Por defecto solo está abierto el grupo del turno actual; el estado cuelga del texto de la consulta, así que
  un fotograma nuevo no cierra lo que la persona acaba de abrir.
- Una fuente recuerda **todas** las consultas que la trajeron (`queries[]`, máx 5, unión entre llamadas):
  una llamada multi-consulta ya no cuelga solo de la última; una fuente puede salir en varios grupos — hecho, no duplicado.
- Las fuentes sin consulta listada (lista saturada, fotograma antiguo) van a un grupo «Fuentes · N» en vez de desaparecer.
- Compatible hacia atrás: valores por defecto en `queries` y un viejo `query` único se repara como `[query]` al leer.
- Se retira la etiqueta de herramienta que añadió 0.9.5 (los datos siguen en el fotograma).

## 0.9.6 — 2026-10-14 (la pestaña de búsquedas pasa a flujo de burbujas)

- La pestaña «Búsquedas» ya no enumera títulos de consulta ni muestra las marcas de herramienta
  `advanced_search`/`web_search`; caen también los encabezados «Consultas · N» y «Fuentes · N».
- Cada fuente se dibuja como **burbuja alineada a la izquierda**, con la misma lectura que el chat:
  título (enlace pulsable), dominio, extracto.
- La marca «Esta ronda» vive dentro de la burbuja; una fuente encontrada varias veces muestra `×N`.
- El plegado no cambia: consulta y herramienta siguen en el fotograma `dshSummarySearchRefs`, solo dejan de dibujarse.
- Se conservan el aviso de fuentes ausentes y la nota de recorte; disciplina de enlaces igual (solo http/https, con `rel="noreferrer noopener"`).

## 0.9.5 — 2026-10-14 (la pestaña de búsquedas también cubre web_search del anfitrión)

- Además de `advanced_search` se plie ahora `web_search`, la herramienta del anfitrión: el modelo
  la usa por defecto, así que las sesiones que buscaron quedaban vacías.
- Se leen ambas formas de argumento: `query` (cadena única) y `queries` (lista; una fila por
  consulta, con el número de fuentes como total de la llamada).
- Cada fila de consulta muestra la herramienta que respondió (sin traducir: es un identificador buscable en el transcript).
- Reconstrucción de 250 sesiones reales: sesiones con consultas de 20 a 52, 472 filas del anfitrión y 777 fuentes.
- El aviso de vacío menciona ambas herramientas (9 idiomas); si falta `tool` en un frame antiguo, la fila se
  lee como `advanced_search` en vez de descartarse.

## 0.9.4 — 2026-10-14 (tercera pestaña «Búsquedas» en Referencias)

- Nueva proyección `dshSummarySearchRefs`: pliega solo `advanced_search`, nunca el
  `web_search` del host — son hechos distintos para quien lee. Consulta desde
  `tool/call.arguments.query`, fuentes desde `tool/result.meta.sources[]`; un resultado
  sin resolver o con error no cuenta como referencia.
- Grupos «Consultas · N» y «Fuentes · N»; las URL del proveedor son datos no confiables: solo http/https
  se vuelven enlace (con `rel="noreferrer noopener"`), lo demás queda como texto.
- Degradación: las versiones antiguas de dsh-free-search no emiten `presentationMeta` — las
  consultas se siguen contando, las fuentes quedan en 0 y un aviso lo explica.
- Límites: 20 filas por lista, resumen recortado a 160 caracteres; 10 claves nuevas en los 9 idiomas.

## 0.9.3 — 2026-10-13 (skills y memoria lado a lado en «Referencias»)

- Las tres secciones inferiores (referencias de skills, recuerdos de sesión, ranuras de memoria) pasan
  a una sección «Referencias» con dos pestañas «Skills» / «Memoria», conmutables por clic o con las
  flechas izquierda/derecha; ya no desplazan el tablero y los archivos fuera de la vista.
- El panel inactivo permanece montado (`display:none`): la selección, la nota pendiente y
  el historial desplegado sobreviven al cambiar de pestaña.
- Cada pestaña es condicional: ninguna que lleve a la nada; si solo memoria está viva, la vista por
  defecto cae en memoria. Sin ninguna capacidad, la sección desaparece.
- 3 claves nuevas en los 9 idiomas.

## 0.9.2 — 2026-10-13 (segundo canal de referencias + catálogo)

- «Referencias de skills» ya no lee solo la llamada a la herramienta `skill`: el marcador que el propio
  host publica, `user/message.source.kind === 'skill-invocation'` (invocación directa del usuario; el
  host pide explícitamente al modelo que no vuelva a llamar la herramienta), entra en el mismo conteo.
  De 250 sesiones reales, 10 tenían solo invocación y ninguna llamada: antes no se mostraba nada.
- Nuevo grupo «Disponibles en esta sesión» desde `entries[].name` de los fotogramas `skill-catalog`,
  plegado por defecto. Cada fotograma REEMPLAZA la lista (comentario del host: `update` marca una
  sustitución), no una unión — si no, las skills nunca desaparecerían. Los nombres ya referenciados se
  descuentan del grupo.
- El texto de vacío nombra los dos caminos; 3 claves de grupo en los 9 idiomas. El estado gana
  `catalog`/`catalogCount`, `stateVersion` 0→1 (con valores por defecto; estados viejos se reproducen).

## 0.9.1 — 2026-10-13 (agrupación visible)

- La sección «Archivos producidos» cuenta dos grupos aparte: «Este turno · N» en lista directa y
  «Cambios anteriores · N» plegado tras un interruptor. Si la lista tiene tope, una nota da el número
  real de la sesión.
- La sección de recuerdos separa «Recuerdos activos · N» (texto aún en contexto) de «Recuerdos
  anteriores · N» (reemplazados por un resumen): plegados y, al abrirlos, cada fila marcada
  «reemplazado por el resumen». Antes solo quedaba un contador.
- Componentes `FoldToggle`/`GroupHeader` compartidos; 5 claves de grupo en los 9 idiomas.

## 0.9.0 — 2026-10-13（首次上 npm；合并 0.9.0-local.0…8 全部装机测试内容）

Esta versión es la primera publicada en npm e incluye toda la serie local: la sección «Referencias de skills»
(la entrada 0.9.0-local.8 más abajo), el plegado y conteo de filas reemplazadas por la compactación, y la
sincronía de los dos manifiestos (`dsh.plugin.json` estaba en `local.4`).

### Añadido

- Sección «Referencias de skills»: lista las skills que esta sesión cargó realmente mediante la herramienta skill del host (nombre · cargas · etiqueta «este turno»). Fuente: la proyección dshSummarySkillUsage (registrada por la mitad host de este plugin; plegado síncrono de turn/start, tool/call, tool/result). El nombre sale de tool/call.arguments: la herramienta skill no declara presentationMeta en ninguna de las seis líneas (verificado tag por tag), así que no existe un tool/result.meta estructurado; el texto del resultado deliberadamente no se lee (una presentación no es una segunda fuente de verdad). Las cargas falladas no cuentan. Sin interruptor — proyección ausente ⇒ sección oculta. 6 claves × 9 idiomas.
- Sincronía de los dos manifiestos: dsh.plugin.json estaba en 0.9.0-local.4 mientras package.json ya era local.7 (barrera V1 del control de paquete); ahora ambos en 0.9.0-local.8.

## 0.9.0-local.0 – local.7 — 2026-10-12 → 10-13 (punteros de instalación, nunca publicados en el registry)

### Añadido

- Superficie de visualización del recuerdo: títulos recortados a dos líneas, burbuja al pasar el cursor con el texto completo, las filas declaradas obsoletas (retired) permanecen en la lista con tachado.
- Contrato de plegado y recuento fijado con pruebas, incluido el caso «todas las filas reemplazadas ⇒ aviso con conteo» (lleva también la marca recall-superseded-note).

### Cambiado

- La compactación ya no vacía la lista de recuerdo: las filas reemplazadas por un resumen (superseded) se pliegan por defecto y se cuentan al pie; las obsoletas siguen visibles con tachado — son el veredicto humano sobre ese recuerdo. Textos ajustados en los 9 idiomas.

### Corregido

- La burbuja ahora se abre hacia la izquierda de la fila y no tapa la barra de puntuación.
- Los clics dentro de la barra de puntuación dejan de propagarse: la confirmación de «declarar obsoleto» nunca se ejecutaba.
- Sin atributo nativo title en el título de la fila: pintaba un recuadro oscuro fuera del contrato de piel que repetía el contenido de la burbuja.

## 0.8.0 — 2026-10-12

### Añadido

- Sección «Recuerdo de esta sesión»: alimentada por la proyección memoryRecall de dsh-prime-memory — qué recuerdos se inyectaron de verdad; con puntuación de relevancia (0–5) y «declarar obsoleto» (-1, reversible).

### Cambiado

- Sección de slots de memoria apagada por defecto: una tarjeta de «slots permanentes» enseñaba a leer la memoria como residente, lo contrario del recuerdo por relevancia. El interruptor queda para quien quiera la lista fijada.

## 0.6.0 — 2026-10-09

### Cambiado

- Versión única de rango máximo: adiós al corte por línea de host; engines.dsh y los peers enumeran de una vez las 15 líneas rc (generado por sync-hosts).

## 0.5.0 — 2026-10-03 → 10-04 (beta.1–3 promovidas)

### Añadido

- Sección de slots de memoria (tercera sección de la pestaña Resumen), alimentada por dsh-prime-memory; interruptor showMemorySlots en dos asientos de ajustes (tarjeta de familia y página Plugins).
- refViews resueltos (record_id → resumen del nombre) según el contrato wire de prime-memory 0.20.1.
- Capa de historial en entregables: los cambios anteriores de la sesión quedan plegados tras una línea conmutable y deduplicados contra los archivos activos.

## 0.4.0 — 2026-09-29

### Changed

- **Cambio de la línea host a DSH 0.2.0** (`main`, ascendida desde `compat/0.2.0`): `engines.dsh` y el peer `@deepseek-ai/dsh-client-locale` pasan de `>=0.1.5-rc.1 <0.2.0-0` a `>=0.2.0-rc.1 <0.2.1-0` (fijación a la ventana rc; reevaluación a partir de 0.2.1). Adaptación puramente de metadatos — la superficie consumida consiste íntegramente en callers puros de `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, con definiciones de interfaces locales), y 0.2.0-rc.1 es totalmente compatible con la API de plugins de 0.1.7: cero cambios de código. La línea 0.1.x (0.1.5/0.1.7) sigue siendo atendida por las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Árbol de dependencias actualizado a la nueva línea (pnpm 12), lockfile regenerado; `pnpm-workspace.yaml` añade `minimumReleaseAgeExclude` (garantiza que una máquina recién instalada pueda resolver 0.2.0-rc.1).
- Las aserciones de rango de host en `tests/purity.spec.ts` se sincronizan con la línea 0.2.0.
- **Instalación (esta línea)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Mapa de dist-tags de npm: `dsh-0.2.0` → esta línea (`main`); `dsh-0.1.7` / `dsh-0.1.5` → líneas 0.1.x (salidas de las ramas `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- README ampliado con resúmenes de instalación y compatibilidad en cinco idiomas (de/fr/ru/es/it).
