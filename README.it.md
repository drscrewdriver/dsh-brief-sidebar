# dsh-brief-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

Plugin web per DSH (consumatore di `dsh-better-sidebar`), nome del repo/pacchetto **`dsh-brief-sidebar`** (barra laterale dei brief di sessione).
Renderizza il **brief** della sessione come tab «Riepilogo» nella barra laterale destra; il brief è composto da due liste:

- **lista todo** — la bacheca dell'**avanzamento** della proiezione `todos`, che mostra i tre stati e il riepilogo di avanzamento delle attività della sessione corrente;
- **lista dei deliverable** — la sezione **deliverable** della proiezione `dshSummaryDeliverables`, che mostra in tempo reale, nel corso del turno, i file scritti/modificati con successo;
  i deliverable di pianificazione di codeplan sono annotati inline con una pill «Pianificazione».

Al tempo stesso **occlude** il pannello todo ufficiale di DSH sopra il composer, facendo della bacheca l'unico contenitore visibile dei todo.

Visualizzazione in sola lettura: niente modifica, niente riscrittura, niente aggregazione multi-sessione, nessuna copia di un livello di rendering di terze parti.

**Perimetro di compatibilità (attuale)**: è supportata solo la **linea DSH 0.2.0** — `engines.dsh` vale `>=0.2.0-rc.1 <0.2.1-0`, la baseline testata è DSH 0.2.0-rc.1 (questa linea, ramo `main`, promosso da `compat/0.2.0`); la linea 0.1.x (0.1.5/0.1.7) continua a essere servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
Le linee host 0.1.2 e precedenti **non sono coperte**, e su npm non esiste un dist-tag corrispondente (le pubblicazioni della linea 0.2.0 di questo pacchetto passano per `dsh-0.2.0`).

![brief-sidebar](assets/brief.png)

**Confine di denominazione**: l'identità di questo plugin (nome del pacchetto / id del plugin / id del bundle cordis / namespace della locale / hook DOM
`data-dsh-brief-sidebar`) usa sempre `brief`; invece la proiezione `todos`, lo strumento `todo_write`, la cella di dock ufficiale `{ id: 'todo' }` e `dsh-tool-todo` appartengono al dominio upstream di DSH: il termine originale `todo` resta invariato, senza rinomina da parte di questo plugin.

**Sistema di memoria**: la terza sezione del brief (richiamo della memoria) è per ora solo uno **slot di layout riservato**, è **in pianificazione** e in questa versione non viene renderizzata — si veda R11 / K4.

## Mappa dei requisiti

| N. | Requisito | Luogo di implementazione |
|---|---|---|
| R1 | Durante il montaggio del plugin la barra todo ufficiale non viene renderizzata affatto | `src/client/brief/dock-shadow.tsx` |
| R2 | Plugin indipendente dedicato, che registra il tab «Riepilogo» presso better-sidebar | `src/client/index.tsx` |
| R3 | I dati provengono solo dalla proiezione `todos` calcolata dall'host; nessuna fusione lato client, nessuna riscrittura | `src/client/brief/use-todos.ts` + `board.ts` |
| R4 | React ordinario + token `--dsw-alias-*`; zero relazioni di codice/denominazione con il plugin Canvas | `src/client/TodoBoardTab.tsx` (TodoSection) + `BriefIcon.tsx` |
| R5 | Reversibile: dopo la disattivazione/disinstallazione del plugin il dock ufficiale si ripristina da solo | Tutte le registrazioni passano per `ctx.effect`, i disposer vengono recuperati con la fiber |
| R6 | Non distruttivo: nessuna modifica al checkout DSH / better-sidebar / plugin canvas | Questo pacchetto basta a se stesso, nessuno dei repo sopra citati viene toccato |
| R7 | Il tab diventa «Riepilogo», `TAB_ID` invariato (sostituzione sul posto, i tab già aperti non si sconnessionano) | `src/client/SummaryTab.tsx` + `index.tsx` |
| R8 | Sezione 1 «Avanzamento»: il contratto dei tre stati di todos scende a livello di sezione | `src/client/TodoBoardTab.tsx` |
| R9 | Sezione 2 «Deliverable»: lista in tempo reale dell'ultimo turno + cumulo di sessione, la parte host registra la proiezione | `src/projection/*` + `src/client/summary/*` |
| R10 | I deliverable di codeplan sono un sottoinsieme annotato della sezione deliverable (pill «Pianificazione» inline), non una sezione indipendente | `src/client/summary/deliverables.ts` + `DeliverablesSection.tsx` |
| R11 | Richiamo della memoria: solo slot di layout riservato (in fondo alla sequenza delle sezioni), **in pianificazione**, non renderizzato in questa versione | Commento dello slot in `src/client/SummaryTab.tsx` / K4 |
| R12 | Conservazione del comportamento: occlusione, badge, pausa via `visible`, contratto di altezza, adattamento 0.1.5 | In vari punti, si veda sotto |
| R13 | La parte host non fa I/O sincrono; la proiezione è un contributo opzionale (attesa via `ctx.inject`) | `src/index.ts` + `src/projection/register.ts` |

## Installazione

```powershell
# Le pubblicazioni della linea 0.2.0 passano per il dist-tag dsh-0.2.0 (la linea 0.1.x continua a essere servita dalle vecchie versioni su compat/0.1.7 / compat/0.1.5)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0
# Alternativa 1: tarball locale
dsh plugin --profile web add <dsh-brief-sidebar-0.4.0.tgz>
# Alternativa 2: installazione diretta da GitHub (build a proprio carico)
dsh plugin --profile web add github:drscrewdriver/dsh-brief-sidebar#main
```

`--profile` deve seguire immediatamente `plugin`. Dopo l'installazione, ricaricare `http://127.0.0.1:3080`.

## Punti di design

### Catena dei dati: risolvere direttamente la face delle proiezioni invece del `useProjection` del framework

Il corpo del tab di better-sidebar **non è dentro l'albero di slot di DSH** e non riceve le props standard con scope di sessione; si procede quindi così:

```ts
ctx.get('sessions')                                  // accesso sicuro (nessuna lettura diretta del Proxy)
  ?.binding(scope.sessionId)?.session.projections    // SessionBinding.session = SessionFace
  ?.faceOf(key)                                      // ProjectionsFace
=> useSyncExternalStore(...)                         // nessuno specchio locale, nessuna fusione
```

Questa catena è condivisa dalle due proiezioni (`src/client/use-projection.ts` è la risoluzione generica indipendente dalle key):

- `todos` — registrata da `dsh-tool-todo`, l'host è l'unico punto di calcolo, `TodoItem[] | null`.
- `dshSummaryDeliverables` — registrata dalla parte host di questo plugin (si veda la sezione seguente), `DeliverablesView`.

**I tre stati della sezione avanzamento devono restare distinti** (contratto di `readTodos`, bloccato dai test):

| Valore | Significato | Rendering |
|---|---|---|
| `undefined` | capacità assente (nessuna sessione / unità host non montata / baseline ancora assente) | «Attività momentaneamente non disponibili» |
| `null` → `[]` | proiezione presente e vuota | stato vuoto |
| array | voci reali | lista + riepilogo di avanzamento |

Confondere i primi due equivale a dire al lettore «questa sessione non ha attività», quando la realtà è «i dati non si riescono a ottenere».

La sezione deliverable è diversa: è una **capacità di arricchimento opzionale**; quando la proiezione manca (la parte host non ha registrato questa unit) l'intera sezione si nasconde, senza renderizzare rumore «non disponibile»; quando la proiezione c'è, `latest: null` e `sessionTotal: 0` sono il suo stato vuoto (l'unit pubblica appena viene registrata).

### Catena dei dati dei deliverable: la parte host registra una unit di proiezione

I dati della riga ufficiale «risultato del turno» (`ui-deliverables`) si accumulano già nel corso del turno, voce per voce, a ogni `tool/result` riuscito; solo che la UI ufficiale è agganciata a `conversation.chat.turnTail` e renderizza solo a fine turno, mentre il tab laterale non arriva ai dati di turno del motore conversation (`SessionFace` non espone la finestra degli eventi, `IConversation` non espone i dati di turno). Per questo la parte host del plugin contribuisce la propria unit tramite `ctx.sessionProjections.register()`:

- il **criterio di fold** è identico a quello del `turn-deliverables.ts` ufficiale: contano solo i percorsi dei `write` / `edit` /
  `str_replace_editor` riusciti (varianti create/str_replace/insert), con deduplica, i fallimenti non contano, le letture non contano;
  scrivere e poi modificare nello stesso turno conta come una sola voce (`src/projection/deliverables-fold.ts`, funzione pura, bloccata dai test).
- **tempo reale nel turno**: ogni evento di commit della registry pilota il `apply` di tutte le unit; ogni modifica di file riuscita che si consolida spinge subito un frame.
- **contributo opzionale**: `ctx.inject(['sessionProjections'], …)` attende il servizio; un deployment senza registry carica comunque questo plugin
  (la sezione deliverable si nasconde in silenzio); la registrazione è un effect, alla disinstallazione la key scompare e il client legge «capacità assente».
- **capacità**: percorsi dell'ultimo turno con cap 50, cumulo di sessione con cap 100 (si conserva il più recente); `sessionTotal` non ha limiti,
  la riga di cumulo «N file in totale in questa sessione» resta sempre veritiera.
- **key con namespace** (`dshSummaryDeliverables`): la registry rifiuta la condivisione della stessa key con un `stateVersion` diverso,
  per evitare una collisione frontale con una possibile futura proiezione host ufficiale.

### Deliverable di codeplan: sottoinsieme annotato della sezione deliverable

Il **criterio della pill «Pianificazione» è una regola puramente basata sui percorsi**: se il percorso del file prodotto, dopo normalizzazione dei separatori, intercetta il segmento `.agents/plans/` (sia slash che backslash), viene apposta la pill «Pianificazione» e il primo segmento dopo `.agents/plans/` (nome dell'attività) finisce in `title`.
Il plugin non legge il contenuto dei file e non verifica che chi scriva sia lo skill codeplan — ogni file scritto in quella directory viene annotato;
il vantaggio di questo criterio è l'assenza di qualsiasi catena di dati aggiuntiva, il prezzo è che la convenzione dei percorsi è essa stessa l'unica fonte di verità (si veda la lacuna K5).

Lo skill codeplan scrive `spec.md` / `findings.md` / `checklist.md` / `tasks.md` con write sotto
`$workspace\.agents\plans\<任务名>\` — questi file compaiono da soli nel fold dei deliverable, senza raccolte aggiuntive.
I deliverable di pianificazione non hanno una sezione indipendente: fanno parte dei deliverable per natura.

### Apertura al clic: lo stesso canale di anteprima Sidebar del flusso di conversazione

Nella sezione deliverable ogni riga di percorso è un pulsante; il clic passa per `ctx.sidebarRight.openResource(<address>)` — esattamente lo stesso canale delle chip «risultato del turno» nella conversazione e delle menzioni `code` inline (l'approccio di ui-chat `openFile`). L'indirizzo è costruito dal `fileAddressFor` portato inline (fonte `@deepseek-ai/dsh-util-workspace-path`): percorso relativo, o percorso assoluto dentro lo workspace di sessione, indirizzato secondo `dsh-resource://file/session/<id>/<相对路径>` (il prefisso del workspace viene rimosso); un percorso assoluto fuori dal workspace conserva la sua scrittura assoluta nello stesso indirizzo di sessione. Il cwd della sessione si legge dallo snapshot di `sessions.list`, rilettura a ogni clic.
Quando il servizio `sidebarRight` manca, la riga degrada a testo semplice (la stessa disciplina di degrado vale per l'assenza della proiezione deliverable).

### Occludere il dock ufficiale: competizione di celle sullo slot list

`conversation.input.dock` è uno **slot list**; le celle sono identificate dall'`id` della voce. Il comportamento di SlotCore è:

1. la chiave di deduplicazione di `register()` è `(id, priority)` — la stessa `id` con un'altra `priority` è una registrazione legittima;
2. le voci si ordinano per `priority` crescente (poi per `order`), il messaggio d'errore porta in sé la semantica "lowest renders";
3. `entriesOfSlot()` per lo slot list prende le celle per `options.id`, **conservando per la stessa cella solo la prima voce dopo l'ordinamento**.

La voce ufficiale registra `{ id: 'todo', order: 0 }` (priority predefinito = 0); questo plugin vince con **`{ id: 'todo', priority: -1 }**.
La registrazione passa per `ctx.slots.inject('conversation.input.dock', …)` (attende la dichiarazione dello slot e si reinstalla alla sua ricostruzione),
non per un `register` nudo (che andrebbe in gara con la tabella di dichiarazione children della voce padre). La stessa tecnica è già un precedente in funzione con `dsh-input-traffic` verso la cella sorella `queue`.

**Occludere solo se `betterSidebar` è disponibile**, altrimenti si nasconderebbe il pannello lasciando le attività invisibili ovunque.

### Superficie di supporto: la barra laterale destra nativa di DSH

Dalla 0.1.5 la barra laterale destra è di proprietà nativa di DSH; l'`openTab` di better-sidebar, con il suo `target: 'right'` predefinito, registra il contenuto come tipo di tab nativo,
e il menu `+` è la pagina guide nativa (`description` viene renderizzata solo se la pagina guide ha ≤4 voci). Il corpo del tab riceve comunque
`TabComponentProps = { ctx, store, scope, tab, visible, … }`; questo plugin ne usa solo `ctx` / `scope` / `visible`.

Con `visible === false` l'intera scheda (incluso il guscio) non viene renderizzata, per evitare che il tab nascosto si re-renderizzi a ogni frame di proiezione.

## Rischi di accoppiamento e autoverifica

| Rischio | Conseguenza | Metodo di autoverifica |
|---|---|---|
| L'upstream rinomina l'id della cella `todo` | L'occlusione fallisce in silenzio, il pannello ufficiale riappare (**fail-open**: i dati non si perdono, vengono solo mostrati in doppio) | Eseguire in console `ctx.slots.entriesOfSlot('conversation.input.dock').filter(e => e.options.id === 'todo')`; deve restare solo la voce di questo plugin (`registrant: 'dsh-brief-sidebar'`, `priority: -1`) |
| Pannello/barra laterale better-sidebar chiusi | Le attività sono invisibili | Il badge del tab mostra il numero di attività non completate come indizio |
| L'upstream cambia la key o i campi della proiezione `todos` | La bacheca mostra «non disponibile» o scarta le voci non valide | `SessionProjectionMap.todos` nei `types.d.ts` di `dsh-tool-todo` resta l'unica fonte di verità |
| Deriva dell'API better-sidebar | La superficie di registrazione smette di funzionare | Usare solo i campi di base di `registerTab` (`id/title/description/icon/order/single/badge/component`); `peerDependencies` allargato a `>=0.18.1`, `devDependencies` bloccato alla versione attualmente in esecuzione |
| Deriva del criterio di fold ufficiale (nuovi strumenti di mutazione ammessi nella lista, ecc.) | La lista dei deliverable di questo plugin si allontana progressivamente dal «risultato del turno» ufficiale | Come base di allineamento del criterio vale il `mutationPath` di `ui-deliverables/turn-deliverables.ts`; a ogni aggiornamento fare un diff |
| L'upstream cambia la forma degli eventi `tool/call` / `tool/result` | Il fold dei deliverable perde dati (difesa alla `readTodos` restringendosi, senza crash) | Le voci `'tool/call'` / `'tool/result'` nel `SessionEventMap` di `dsh-session` fanno fede |

## Carenze note

- **K1** Se l'utente disattiva questo tipo di tab nella scheda Side, il dock resta nascosto → le attività sono invisibili ovunque.
  In seguito si potrà condizionare su `prefs.tabsEnabled`; per questa volta non fatto (l'utente ha scelto «nascondere del tutto»).
- **K2** Le attività sono invisibili quando il pannello/la barra laterale better-sidebar è chiuso/a (accettazione confermata).
- **K3** L'upstream rinomina la cella `todo` → l'occlusione fallisce in silenzio (fail-open, si veda la tabella sopra).
- **K4** La sezione di richiamo della memoria ha solo uno slot di layout (**in pianificazione**): il sistema non ha una memoria predefinita; la catena dei dati verrà agganciata quando un plugin di memoria registrerà una key di proiezione.
- **K5** La pill «Pianificazione» è un puro giudizio di prefisso di percorso (segmento `.agents/plans/`) e non verifica chi scrive: anche i file scritti in quella directory da fonti diverse da codeplan vengono annotati; se codeplan cambia la sua convenzione di directory dei deliverable, occorrerà sincronizzare la costante di `summary/deliverables.ts`.
- **K6** L'apertura al clic delle righe di percorso dipende dal servizio host `sidebarRight` (consumo opzionale); sui deployment che ne sono privi le righe dei deliverable non sono cliccabili e restano in testo semplice.

## Sviluppo

```powershell
pnpm install        # dipendenze: react / @deepseek-ai/cordis / zod come devDep, a runtime fornite dalla tabella dei moduli dell'host o impacchettate col pacchetto
pnpm typecheck      # tsc -p tsconfig.json && tsc -p tsconfig.client.json
pnpm test           # vitest (jsdom)
pnpm build          # tsc produce lib/types + tsdown produce lib/index.mjs / lib/client.js (zod incluso nel pacchetto host, autonomo)
npm pack            # produce il tarball (questa directory ha un pnpm-workspace.yaml ma senza campo packages: pnpm pack non è utilizzabile)
```

`lib/` **deve essere versionato**: quando il profile installa tramite una ref GitHub non c'è nessun passo di build.

## Compatibilità

I rilievi dei test punto per punto della linea 0.1.x si trovano nei README dei rami `compat/0.1.7` / `compat/0.1.5` (≤0.3.1); questa linea (`main`) è orientata alla **linea DSH 0.2.0**, con baseline testata **DSH 0.2.0-rc.1 + dsh-better-sidebar 0.19.1**.
0.2.0-rc.1 è pienamente compatibile con l'API plugin di 0.1.7 (manifest/settings/HMR/slot/sessione V4 intatti); tutta la superficie consumata di questo plugin è fatta di caller puri di `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, con definizioni di interfacce locali), senza override dei contratti dell'host: questa linea è quindi un adattamento di soli metadati, zero modifiche al codice.
`engines.dsh` vale `>=0.2.0-rc.1 <0.2.1-0`, e i tre punti — `engines.dsh` di `package.json`, l'intervallo del pacchetto client DSH in `peerDependencies` e `engines.dsh` di `dsh.plugin.json` — **devono restare coerenti** (attualmente coerenti).
**Le linee host da 0.2.1 in poi non sono coperte da questa linea**: disciplina di blocco sulla finestra rc; da 0.2.1 in poi l'adattamento andrà rivalutato (a quel punto si aprirà una nuova linea di versione).

## Note multilingua / Sprachen / Langues / Языки / Idiomas / Lingue

Il README originale è scritto in cinese; questo documento ne è la traduzione italiana. Panoramica installazione e compatibilità (questa linea richiede DSH 0.2.0: `>=0.2.0-rc.1 <0.2.1-0`; installazione: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`):

- **Deutsch** — benötigt DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), getestet gegen DSH 0.2.0-rc.1. Installation: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Die 0.1.x-Wirtslinie wird von den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` (npm-Tags `dsh-0.1.7` / `dsh-0.1.5`) versorgt.
- **Français** — nécessite DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testé avec DSH 0.2.0-rc.1. Installation : `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. La lignée d'hôtes 0.1.x est assurée par les branches figées `compat/0.1.7` / `compat/0.1.5` (tags npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Русский** — требуется DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), протестировано на DSH 0.2.0-rc.1. Установка: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Линия хостов 0.1.x обслуживается замороженными ветками `compat/0.1.7` / `compat/0.1.5` (npm-теги `dsh-0.1.7` / `dsh-0.1.5`).
- **Español** — requiere DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), probado con DSH 0.2.0-rc.1. Instalación: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. La línea de anfitriones 0.1.x la atienden las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (etiquetas npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Italiano** — richiede DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testato su DSH 0.2.0-rc.1. Installazione: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. La linea di host 0.1.x è servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (tag npm `dsh-0.1.7` / `dsh-0.1.5`).
