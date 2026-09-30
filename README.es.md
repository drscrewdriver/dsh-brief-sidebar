# dsh-brief-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

Plugin web para DSH (consumidor de `dsh-better-sidebar`), nombre del repo/paquete **`dsh-brief-sidebar`** (barra lateral de briefs de sesión).
Renderiza el **brief** de la sesión como una pestaña «Resumen» en la barra lateral derecha; el brief se compone de dos listas:

- **lista todo** — el tablero de **progreso** de la proyección `todos`, que muestra los tres estados y el resumen de avance de las tareas de la sesión actual;
- **lista de entregables** — la sección de **entregables** de la proyección `dshSummaryDeliverables`, que muestra en tiempo real, a lo largo del turno, los archivos escritos/modificados con éxito;
  los entregables de planificación de codeplan se anotan en línea con una pill «Planificación».

Al mismo tiempo **oculta** el panel todo oficial de DSH situado sobre el composer, haciendo del tablero el único soporte visible de los todos.

Visualización de solo lectura: sin edición, sin escritura de vuelta, sin agregación multi-sesión, sin copiar ninguna capa de renderizado de terceros.

**Alcance de compatibilidad**: esta línea (rama `main`, ascendida desde `compat/0.2.0`) apunta a la **línea DSH 0.2.0** — `engines.dsh` es `>=0.2.0-rc.1 <0.2.1-0`, línea base probada DSH 0.2.0-rc.1, publicaciones por el dist-tag de npm **`dsh-0.2.0`**. 0.2.0 es puramente aditivo para todas las API del host que usa este plugin (la superficie consumida son solo callers puros de `ctx.get(...)`, cero eliminaciones de exportaciones), por lo que la línea de soporte se desplaza en bloque hacia delante sin necesidad de rama de compatibilidad en tiempo de ejecución. **Elija siempre la versión del plugin según la versión de DSH** (no use `latest` a ciegas en hosts antiguos: no se cumplen las `engines` del host antiguo y la preverificación de arranque lo desactiva en silencio; los rangos caret tampoco cruzan minor del host):

| Host DSH | Última versión del plugin | dist-tag de instalación |
|---|---|---|
| 0.2.0 | **0.4.0** (latest) | `dsh-0.2.0` |
| 0.1.7 | 0.3.1 | `dsh-0.1.7` |
| 0.1.5 | 0.3.1 | `dsh-0.1.5` |
| 0.1.2 y anteriores | no soportado (la línea 0.1.x tiene como límite inferior 0.1.5-rc.1; npm no tiene un dist-tag correspondiente) | — |

(a fecha de 2026-09-30; la línea 0.1.x sigue siendo atendida por las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).)

![brief-sidebar](assets/brief.png)

**Frontera de nombres**: la identidad de este plugin (nombre de paquete / plugin id / cordis bundle id / namespace de locale / hook de DOM
`data-dsh-brief-sidebar`) usa siempre `brief`; en cambio, la proyección `todos`, la herramienta `todo_write`, la celda de dock oficial `{ id: 'todo' }` y `dsh-tool-todo` pertenecen al dominio upstream de DSH: se conserva la palabra original `todo`, sin renombrado por parte de este plugin.

**Sistema de memoria**: la tercera sección del brief (recuperación de memoria) es por ahora solo un **hueco de layout reservado**, está **en planificación** y en esta versión no se renderiza — ver R11 / K4.

## Mapa de requisitos

| N.º | Requisito | Ubicación de la implementación |
|---|---|---|
| R1 | Durante el montaje del plugin, la barra todo oficial no se renderiza en absoluto | `src/client/brief/dock-shadow.tsx` |
| R2 | Plugin independiente dedicado, que registra la pestaña «Resumen» en better-sidebar | `src/client/index.tsx` |
| R3 | Los datos provienen únicamente de la proyección `todos` calculada por el host; sin colapso en el cliente, sin escritura de vuelta | `src/client/brief/use-todos.ts` + `board.ts` |
| R4 | React ordinario + tokens `--dsw-alias-*`; cero relación de código/nombres con el plugin Canvas | `src/client/TodoBoardTab.tsx` (TodoSection) + `BriefIcon.tsx` |
| R5 | Reversible: tras deshabilitar/desinstalar el plugin, el dock oficial se recupera automáticamente | Todos los registros van por `ctx.effect`, los disposers se recogen con la fiber |
| R6 | No destructivo: sin modificar el checkout de DSH / better-sidebar / el plugin canvas | Este paquete se sostiene por sí mismo, no toca ninguno de los repos mencionados |
| R7 | La pestaña pasa a ser «Resumen», `TAB_ID` sin cambios (reemplazo en sitio, las pestañas ya abiertas no pierden el enlace) | `src/client/SummaryTab.tsx` + `index.tsx` |
| R8 | Sección 1 «Progreso»: el contrato de los tres estados de todos baja a nivel de sección | `src/client/TodoBoardTab.tsx` |
| R9 | Sección 2 «Entregables»: lista en tiempo real del último turno + acumulado de sesión, la parte host registra la proyección | `src/projection/*` + `src/client/summary/*` |
| R10 | Los entregables de codeplan son un subconjunto anotado de la sección de entregables (pill «Planificación» en línea), no una sección independiente | `src/client/summary/deliverables.ts` + `DeliverablesSection.tsx` |
| R11 | Recuperación de memoria: solo hueco de layout reservado (al final de la secuencia de secciones), **en planificación**, sin renderizar en esta versión | Comentario del hueco en `src/client/SummaryTab.tsx` / K4 |
| R12 | Conservación del comportamiento: ocultamiento, badge, pausa vía `visible`, contrato de altura, adaptación 0.1.5 | En varios puntos, ver abajo |
| R13 | La parte host no hace E/S síncrona; la proyección es una contribución opcional (espera vía `ctx.inject`) | `src/index.ts` + `src/projection/register.ts` |

## Instalación

```powershell
# elija el dist-tag según la versión del host DSH (recomendado, no use latest a ciegas)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0   # línea DSH 0.2.0 (0.4.0)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.1.7   # línea DSH 0.1.7 (0.3.1)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.1.5   # línea DSH 0.1.5 (0.3.1)
# Alternativa 1: tarball local (esta línea: dsh-brief-sidebar-0.4.0.tgz)
dsh plugin --profile web add <dsh-brief-sidebar-0.4.0.tgz>
# Alternativa 2: instalación directa desde GitHub (compilación por cuenta propia)
dsh plugin --profile web add github:drscrewdriver/dsh-brief-sidebar#main
```

`--profile` debe ir inmediatamente después de `plugin`. Tras la instalación, recargue `http://127.0.0.1:3080`.

## Puntos de diseño

### Cadena de datos: resolver directamente la face de proyecciones en lugar del `useProjection` del framework

El cuerpo de la pestaña de better-sidebar **no está dentro del árbol de slots de DSH** y no recibe las props estándar con scope de sesión, por lo que:

```ts
ctx.get('sessions')                                  // acceso seguro (sin leer el Proxy directamente)
  ?.binding(scope.sessionId)?.session.projections    // SessionBinding.session = SessionFace
  ?.faceOf(key)                                      // ProjectionsFace
=> useSyncExternalStore(...)                         // sin espejo local, sin colapso
```

Esta cadena la comparten las dos proyecciones (`src/client/use-projection.ts` es la resolución genérica independiente de la key):

- `todos` — registrada por `dsh-tool-todo`, el host es el único punto de cálculo, `TodoItem[] | null`.
- `dshSummaryDeliverables` — registrada por la parte host de este plugin (ver la sección siguiente), `DeliverablesView`.

**Los tres estados de la sección de progreso deben mantenerse distinguibles** (contrato de `readTodos`, fijado por tests):

| Valor | Significado | Render |
|---|---|---|
| `undefined` | capacidad ausente (sin sesión / unidad del host no montada / aún sin baseline) | «Tareas no disponibles por ahora» |
| `null` → `[]` | proyección presente y vacía | estado vacío |
| array | entradas reales | lista + resumen de progreso |

Confundir los dos primeros equivale a decirle al lector «esta sesión no tiene tareas», cuando la realidad es «no se pueden obtener los datos».

La sección de entregables es distinta: es una **capacidad de enriquecimiento opcional**; cuando la proyección falta (la parte host no registró esa unit), toda la sección se oculta, sin renderizar ruido de «no disponible»; cuando la proyección está, `latest: null` y `sessionTotal: 0` son su estado vacío (la unit publica en cuanto se registra).

### Cadena de datos de los entregables: la parte host registra una unit de proyección

Los datos de la línea oficial «producción del turno» (`ui-deliverables`) ya se acumulan durante el turno, entrada por entrada, con cada `tool/result` exitoso; solo que la UI oficial cuelga de `conversation.chat.turnTail` y se renderiza solo al final del turno, mientras que la pestaña lateral no accede a los datos de turno del motor conversation (`SessionFace` no expone la ventana de eventos, `IConversation` no expone los datos de turno). Por eso la parte host del plugin contribuye su propia unit mediante `ctx.sessionProjections.register()`:

- el **criterio de fold** es idéntico al del `turn-deliverables.ts` oficial: solo cuentan los paths de los `write` / `edit` /
  `str_replace_editor` exitosos (variantes create/str_replace/insert), con deduplicación, los fallos no cuentan, las lecturas no cuentan;
  escribir y luego modificar en el mismo turno cuenta como una sola entrada (`src/projection/deliverables-fold.ts`, función pura, fijada por tests).
- **tiempo real en el turno**: cada evento de commit del registro impulsa el `apply` de todas las units; cada cambio de archivo que se consolida con éxito empuja de inmediato un frame.
- **contribución opcional**: `ctx.inject(['sessionProjections'], …)` espera el servicio; un deployment sin registro carga igualmente este plugin
  (la sección de entregables se oculta en silencio); el registro es un effect, al desinstalar desaparece la key y el cliente lee «capacidad ausente».
- **capacidad**: paths del último turno con tope de 50, acumulado de sesión con tope de 100 (se conservan los más recientes); `sessionTotal` no tiene tope,
  la línea de acumulado «N archivos en total en esta sesión» siempre es fiel a la realidad.
- **key con namespace** (`dshSummaryDeliverables`): el registro rechaza compartir la misma key con un `stateVersion` distinto,
  para evitar una colisión frontal con una posible futura proyección host oficial.

### Entregables de codeplan: subconjunto anotado de la sección de entregables

El **criterio de la pill «Planificación» es una regla puramente de rutas**: si el path del archivo producido, tras normalizar los separadores, impacta el segmento `.agents/plans/` (slash o backslash), se coloca la pill «Planificación» y el primer segmento tras `.agents/plans/` (nombre de la tarea) se pone en `title`.
El plugin no lee el contenido de los archivos ni verifica que quien escribe sea el skill codeplan — todo archivo escrito en ese directorio queda anotado;
la ventaja de este criterio es que no hace falta ninguna cadena de datos adicional, el precio es que la convención de rutas es ella misma la única fuente de verdad (ver el hueco K5).

El skill codeplan escribe `spec.md` / `findings.md` / `checklist.md` / `tasks.md` con write bajo
`$workspace\.agents\plans\<任务名>\` — estos archivos aparecen por sí solos en el fold de entregables, sin recolección adicional.
Los entregables de planificación no tienen una sección independiente: forman parte de los entregables por naturaleza.

### Abrir al hacer clic: el mismo canal de vista previa de Sidebar que el flujo de conversación

En la sección de entregables cada línea de path es un botón; el clic va por `ctx.sidebarRight.openResource(<address>)` — exactamente el mismo canal que los chips de «producción del turno» en la conversación y las menciones `code` en línea (el enfoque de ui-chat `openFile`). La dirección la construye el `fileAddressFor` portado en línea (fuente `@deepseek-ai/dsh-util-workspace-path`): path relativo, o path absoluto dentro del workspace de la sesión, direccionado según `dsh-resource://file/session/<id>/<相对路径>` (el prefijo del workspace se elimina); un path absoluto fuera del workspace conserva su escritura absoluta en la misma dirección de sesión. El cwd de la sesión se lee de la instantánea de `sessions.list`, relectura en cada clic.
Cuando el servicio `sidebarRight` falta, la línea degrada a texto plano (la misma disciplina de degradación que para la ausencia de la proyección de entregables).

### Ocultar el dock oficial: competencia de celdas en el slot list

`conversation.input.dock` es un **slot list**; las celdas se identifican por el `id` de la entrada. El comportamiento de SlotCore es:

1. la clave de deduplicación de `register()` es `(id, priority)` — la misma `id` con otra `priority` es un registro legítimo;
2. las entradas se ordenan por `priority` ascendente (y luego por `order`), el texto de error lleva consigo la semántica "lowest renders";
3. `entriesOfSlot()` en el slot list toma las celdas por `options.id`, **conservando por celda solo la primera entrada tras el ordenamiento**.

La entrada oficial registra `{ id: 'todo', order: 0 }` (priority por defecto = 0); este plugin gana con **`{ id: 'todo', priority: -1 }**.
El registro va por `ctx.slots.inject('conversation.input.dock', …)` (espera la declaración del slot y se reinstala cuando se reconstruye),
y no por un `register` desnudo (que competiría con la tabla de declaración children de la entrada padre). La misma técnica ya es un precedente en funcionamiento con `dsh-input-traffic` frente a la celda hermana `queue`.

**Ocultar solo si `betterSidebar` está disponible**, de lo contrario se escondería el panel y las tareas no serían visibles en ningún sitio.

### Superficie de soporte: la barra lateral derecha nativa de DSH

Desde 0.1.5 la barra lateral derecha es propiedad nativa de DSH; el `openTab` de better-sidebar, con su `target: 'right'` por defecto, registra el contenido como tipo de pestaña nativo,
y el menú `+` es la página guide nativa (`description` solo se renderiza si la página guide tiene ≤4 entradas). El cuerpo de la pestaña sigue recibiendo
`TabComponentProps = { ctx, store, scope, tab, visible, … }`; este plugin solo usa de ahí `ctx` / `scope` / `visible`.

Con `visible === false` toda la tarjeta (incluida la carcasa) no se renderiza, para evitar que la pestaña oculta se re-renderice en cada frame de proyección.

## Riesgos de acoplamiento y autoverificación

| Riesgo | Consecuencia | Método de autoverificación |
|---|---|---|
| El upstream renombra el id de la celda `todo` | El ocultamiento falla en silencio, el panel oficial reaparece (**fail-open**: los datos no se pierden, solo se muestran duplicados) | Ejecutar en la consola `ctx.slots.entriesOfSlot('conversation.input.dock').filter(e => e.options.id === 'todo')`; debe quedar solo la entrada de este plugin (`registrant: 'dsh-brief-sidebar'`, `priority: -1`) |
| Panel/barra lateral de better-sidebar cerrados | Las tareas son invisibles | El badge de la pestaña muestra el número de tareas incompletas como pista |
| El upstream cambia la key o los campos de la proyección `todos` | El tablero muestra «no disponible» o descarta entradas inválidas | `SessionProjectionMap.todos` en los `types.d.ts` de `dsh-tool-todo` sigue siendo la única fuente de verdad |
| Deriva de la API de better-sidebar | La superficie de registro deja de funcionar | Usar solo los campos básicos de `registerTab` (`id/title/description/icon/order/single/badge/component`); `peerDependencies` relajado a `>=0.18.1`, `devDependencies` fijado a la versión que corre actualmente |
| Deriva del criterio de fold oficial (nuevas herramientas de mutación entran en la lista, etc.) | La lista de entregables de este plugin se aleja progresivamente de la «producción del turno» oficial | El criterio toma como base de alineación el `mutationPath` de `ui-deliverables/turn-deliverables.ts`; en cada actualización, comparar con un diff |
| El upstream cambia la forma de los eventos `tool/call` / `tool/result` | El fold de entregables pierde datos (defensa al estilo `readTodos` que se estrecha, sin crash) | Las entradas `'tool/call'` / `'tool/result'` del `SessionEventMap` de `dsh-session` son la fuente de verdad |

## Huecos conocidos

- **K1** Si el usuario deshabilita este tipo de pestaña en la tarjeta Side, el dock queda oculto → las tareas no son visibles en ningún sitio.
  Más adelante se podría condicionar con `prefs.tabsEnabled`; esta vez no se hizo (el usuario eligió «ocultar por completo»).
- **K2** Con el panel/barra lateral de better-sidebar cerrados, las tareas son invisibles (aceptación confirmada).
- **K3** El upstream renombra la celda `todo` → el ocultamiento falla en silencio (fail-open, ver la tabla de arriba).
- **K4** La sección de recuperación de memoria tiene solo un hueco de layout (**en planificación**): el sistema no tiene memoria por defecto; la cadena de datos se conectará cuando un plugin de memoria registre una key de proyección.
- **K5** La pill «Planificación» es un juicio puro de prefijo de path (segmento `.agents/plans/`) y no verifica quién escribe: los archivos escritos en ese directorio por fuentes distintas de codeplan también quedan anotados; si codeplan cambia su convención de directorio de entregables, habrá que sincronizar la constante de `summary/deliverables.ts`.
- **K6** La apertura de las líneas de path al hacer clic depende del servicio host `sidebarRight` (consumo opcional); en deployments sin él, las líneas de entregables no son clicables y se muestran como texto plano.

## Desarrollo

```powershell
pnpm install        # dependencias: react / @deepseek-ai/cordis / zod como devDep, en runtime las provee la tabla de módulos del host o se empaquetan con el paquete
pnpm typecheck      # tsc -p tsconfig.json && tsc -p tsconfig.client.json
pnpm test           # vitest (jsdom)
pnpm build          # tsc produce lib/types + tsdown produce lib/index.mjs / lib/client.js (zod empaquetado dentro del paquete host, autocontenido)
npm pack            # produce el tarball (este directorio tiene un pnpm-workspace.yaml pero sin campo packages, pnpm pack no se puede usar)
```

`lib/` **debe ir versionado**: cuando el profile instala vía una ref de GitHub no hay paso de compilación.

## Compatibilidad

Los registros de pruebas caso por caso de la línea 0.1.x están en los README de las ramas `compat/0.1.7` / `compat/0.1.5` (≤0.3.1); esta línea (`main`) apunta a la **línea DSH 0.2.0**, con línea base probada **DSH 0.2.0-rc.1 + dsh-better-sidebar 0.19.1**.
0.2.0-rc.1 es totalmente compatible con la API de plugins de 0.1.7 (manifest/settings/HMR/slot/sesión V4 intactos); toda la superficie consumida de este plugin son callers puros de `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, con definiciones de interfaces locales), sin override de los contratos del host, por lo que esta línea es una adaptación puramente de metadatos, cero cambios de código.
`engines.dsh` es `>=0.2.0-rc.1 <0.2.1-0`, y los tres lugares — `engines.dsh` de `package.json`, el rango del paquete cliente DSH en `peerDependencies` y `engines.dsh` de `dsh.plugin.json` — **deben mantenerse coherentes** (actualmente coherentes).
La última versión del plugin por línea de host, junto con su dist-tag de instalación, está en la tabla de «Alcance de compatibilidad» al principio del archivo (0.2.0 → 0.4.0 / 0.1.7 → 0.3.1 / 0.1.5 → 0.3.1; 0.1.2 y anteriores no están soportados).
**Las líneas anfitrionas a partir de 0.2.1 no están cubiertas por esta línea**: disciplina de fijación a la ventana rc; a partir de 0.2.1 habrá que reevaluar la adaptación (entonces se abrirá una nueva línea de versiones).

## Nota multilingüe / Sprachen / Langues / Языки / Idiomas / Lingue

El README original está escrito en chino; este documento es su traducción al español. Resumen de instalación y compatibilidad (esta línea requiere DSH 0.2.0: `>=0.2.0-rc.1 <0.2.1-0`; dist-tag según la línea del host: 0.2.0 → `dsh-0.2.0` (0.4.0) / 0.1.7 → `dsh-0.1.7` (0.3.1) / 0.1.5 → `dsh-0.1.5` (0.3.1); DSH 0.1.2 y anteriores no están soportados, no use `latest` a ciegas en hosts antiguos):

- **Deutsch** — benötigt DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), getestet gegen DSH 0.2.0-rc.1. dist-tag je nach Host-Linie: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 und früher werden nicht unterstützt. Kein blindes `latest` auf alten Hosts (die Start-Vorprüfung deaktiviert das Plugin still). Tabelle: Abschnitt „Kompatibilitätsbereich".
- **Français** — nécessite DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testé avec DSH 0.2.0-rc.1. dist-tag selon la ligne d'hôte : `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1) ; DSH 0.1.2 et antérieurs ne sont pas pris en charge. Pas de `latest` aveugle sur un hôte ancien (la prévérification de démarrage le désactive en silence). Tableau : section « Périmètre de compatibilité ».
- **Русский** — требуется DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), протестировано на DSH 0.2.0-rc.1. dist-tag по линии хоста: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 и ранее не поддерживаются. Не используйте `latest` вслепую на старых хостах (плагин молча отключается стартовой предпроверкой). Таблица: раздел «Диапазон совместимости».
- **Español** — requiere DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), probado con DSH 0.2.0-rc.1. dist-tag según la línea del host: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 y anteriores no están soportados. No use `latest` a ciegas en hosts antiguos (la preverificación de arranque lo desactiva en silencio). Tabla: sección «Alcance de compatibilidad».
- **Italiano** — richiede DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testato su DSH 0.2.0-rc.1. dist-tag in base alla linea dell'host: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 e precedenti non sono supportati. Niente `latest` alla cieca su host vecchi (la preverifica di avvio lo disattiva in silenzio). Tabella: sezione «Perimetro di compatibilità».
