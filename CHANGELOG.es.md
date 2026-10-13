# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.9.0-local.8 — 2026-10-13

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
