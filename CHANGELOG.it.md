# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.9.11 — 2026-10-15 (visore delle memorie integrato in questo plugin)

- **Apertura del dettaglio finalmente collegata**: un pulsante a destra della barra di valutazione e su ogni riga `ref` degli slot apre la scheda `dsh-md-memory-viewer:memory` tramite `betterSidebar.openTab`. **Canale scheda, niente filesystem**: il precedente approccio fileViewer (percorso `<id>.memory` fingendo un file) veniva risolto dall'EditorHost ospite come file reale e finiva sempre in ENOENT.
- **Il componente visore ora vive qui** (`src/client/memory-viewer/viewer.tsx`); il plugin autonomo `dsh-md-memory-viewer` è rimosso. Il tipo di scheda è registrato in `apply()` (`hidden: true`, assente dal menu +), così le schede ripristinate dopo il riavvio hanno ancora un proprietario.
- **Riferimento al service tramite il modulo `memory-tab.ts`**: nei componenti profondi `ctx.get('betterSidebar')` viene rifiutato in silenzio dal proxy strict (clic senza effetto né errore); il riferimento viene catturato una volta in `apply()`.
- **Stato vuoto**: senza `memoryId` (scheda ripristinata prima della registrazione) il pannello mostra «Nessuna memoria scelta per visualizzazione in questo avvio» invece di un bianco.
- **Corpo in Markdown**: fumetto e visore condividono `renderMd` senza dipendenze (titoli / grassetto / codice inline / liste); tutti i dati arrivano da `dsh-memory/records-meta`.
- **Gerarchia visiva**: il titolo usa il campo `name` (13px/600/colore primario), la riga degli scenari scende a 10px — prima un `## Conclusione` del corpo veniva mostrato come nome.

## 0.9.10 — 2026-10-14 (limiti alzati in base alla misura, replay delle sessioni vecchie)

- Nuovi tetti della piegatura ricerche: fonti 20→**64**, query 20→**48**, URL del turno corrente 20→**64**
  (estratto 160 caratteri e 5 query per fonte invariati).
- Misurato su 348 sessioni locali (70 con ricerca): query per sessione p50=7/p90=29/p95=38/p99=67, fonti per sessione
  p50=16/p90=54/p95=63/p99=164, fonti per turno p50=16/p90=41/p95=51/max=65.
  Il vecchio 20 cadeva a p55: **anche la sessione mediana veniva troncata**; da lì arriva «0 risultati».
- `stateVersion` sale a 2: **obbligatorio anche se la forma non cambia**. Un checkpoint scritto sotto i tetti
  vecchi ha già scartato fonti; solo una riga scartata viene ripiegata dal registro degli eventi.
- Nuovo test di budget permanente: caso peggiore = 62.047 byte per frame (budget 96 KB), più l’asserzione che i tetti
  stringano davvero; una sessione tipica sta sui 15 KB.
- Nessuna impostazione esposta per ora: i tetti vivono nella metà host, ed esporli richiederebbe schema Config,
  `.volatile()` e il modulo su tutte e sei le linee, oltre a un effetto solo verso il futuro.

## 0.9.9 — 2026-10-14 (cluster di ricerca compressi per impostazione predefinita)

- Tutti i gruppi di query della scheda «Ricerche» sono **compressi per impostazione predefinita**, incluso quello del turno corrente:
  si vede una riga per domanda col numero che contiene davvero, invece di rovesciare fumetti all’ingresso.
- La regola precedente («apri il turno corrente») copriva, in una sessione reale, l’elenco delle domande che si viene a scandire.
- Si apre ciò che si clicca; lo stato è indicizzato sul testo della query, quindi un frame nuovo non chiude nulla.
- Rimossa la proprietà `SearchCluster.latest` da quando nessuno la consumava più.
- I test fissano: tutto compresso per default, un clic apre un solo gruppo e un secondo lo richiude; il test di bonifica dei
  link apre prima, invece di confondere «non renderizzato» con «nessun link».

## 0.9.8 — 2026-10-14 (gruppi vuoti risolti: un cambio di forma richiede una nuova stateVersion)

- Corregge un difetto di 0.9.7: i titoli dei gruppi contavano risultati, ma aprendoli non c’era nulla.
- Causa: lo stato di piegatura è passato da un singolo `query` a `queries[]` mentre `stateVersion` restava 0.
  Il `restore` dell’host scarta un checkpoint solo se la versione differisce e poi rigioca il log degli eventi
  (`session-projection/src/index.ts:88-92`, `:122-126`): la riga vecchia è passata dallo schema nuovo, ogni campo
  `queries` è finito sul valore predefinito vuoto e tutte le fonti sono scivolate nel gruppo finale.
- `stateVersion` sale a 1: i checkpoint vecchi vengono scartati e ripiegati correttamente.
- I titoli ora indicano quanti elementi **contengono davvero**, non i `hits` della chiamata: titolo e contenuto non possono più contraddirsi.
- Un gruppo vuoto diventa una riga semplice senza freccia; le fonti non rivendicate restano in «Fonti · N», nulla scompare in silenzio.
- Nuova guardia sulla registrazione: `stateVersion`=1 è fissata, più la prova che una riga vecchia esce vuota dallo schema nuovo.

## 0.9.7 — 2026-10-14 (risultati raggrupati per query e compressi)

- La scheda «Ricerche» raggruppa ora **per query**: una riga comprimibile per domanda
  (`query · N risultati`) e, aprendola, i fumetti portati da quella query.
- Per impostazione predefinita è aperto solo il gruppo del turno corrente; lo stato è indicizzato sul testo della
  query, quindi un frame nuovo non chiude ciò che si è appena aperto.
- Una fonte ricorda **tutte** le query che l’hanno riportata (`queries[]`, max 5, unione tra chiamate):
  una chiamata multi-query non pende più solo dall’ultima; una fonte può comparire in più gruppi — fatto, non duplicato.
- Le fonti senza query elencata (lista satura, frame precedente) finiscono in un gruppo «Fonti · N» invece di sparire.
- Retrocompatibile: default sullo schema per `queries` e un vecchio `query` singolo riparato in `[query]` in lettura.
- Rimossa l’etichetta dello strumento aggiunta in 0.9.5 (i dati restano nel frame).

## 0.9.6 — 2026-10-14 (la scheda ricerche diventa un flusso di fumetti)

- La scheda «Ricerche» non elenca più i titoli delle query né i marchi di strumento
  `advanced_search`/`web_search`; cadono anche le intestazioni «Query · N» e «Fonti · N».
- Ogni fonte è un **fumetto allineato a sinistra**, con la stessa lettura della chat a fianco:
  titolo (collegamento cliccabile), dominio, estratto.
- Il contrassegno «Questo giro» sta dentro il fumetto; una fonte trovata più volte mostra `×N`.
- La piegatura non cambia: query e strumento restano nel frame `dshSummarySearchRefs`, non vengono più disegnati.
- Restano l’avviso per le fonti assenti e la nota di troncamento; disciplina dei link invariata (solo http/https, con `rel="noreferrer noopener"`).

## 0.9.5 — 2026-10-14 (la scheda ricerche copre anche web_search dell’host)

- Oltre a `advanced_search` viene ora piegato `web_search`, lo strumento dell’host: il modello
  usa quello di default, quindi le sessioni con ricerche restavano vuote.
- Sono lette entrambe le forme di argomento: `query` (stringa singola) e `queries` (elenco; una
  riga per query, col numero di fonti come totale della chiamata).
- Ogni riga riporta lo strumento che ha risposto (non tradotto: è un identificatore ricercabile nella trascrizione).
- Ricostruzione su 250 sessioni reali: sessioni con query da 20 a 52, 472 righe dell’host e 777 fonti.
- Il messaggio a vuoto cita entrambi gli strumenti (9 lingue); se `tool` manca in un frame vecchio, la riga è
  letta come `advanced_search` invece di essere scartata.

## 0.9.4 — 2026-10-14 (terza scheda «Ricerche» nei Riferimenti)

- Nuova proiezione `dshSummarySearchRefs`: ripiega solo `advanced_search`, mai il
  `web_search` dell’host — per chi legge sono fatti diversi. Query da
  `tool/call.arguments.query`, fonti da `tool/result.meta.sources[]`; un risultato non
  risolto o in errore non conta come riferimento.
- Gruppi «Query · N» e «Fonti · N»; gli URL del provider sono dati non affidabili: solo http/https
  diventano link (con `rel="noreferrer noopener"`), il resto resta testo.
- Fallback: le vecchie build di dsh-free-search non emettono `presentationMeta` — le query si
  contano comunque, le fonti restano 0, e una nota lo spiega invece di mostrare un elenco vuoto.
- Limiti: 20 righe per elenco, riassunto tagliato a 160 caratteri; 10 chiavi nuove in tutte le 9 lingue.

## 0.9.3 — 2026-10-13 (skill e memoria affiancate in «Riferimenti»)

- Le tre sezioni in basso (riferimenti alle skill, richiami di sessione, slot di memoria) diventano una
  sezione «Riferimenti» con due schede «Skill» / «Memoria», commutabili al clic o con i tasti freccia;
  board e file non vengono più spinti fuori dalla vista.
- Il pannello inattivo resta montato (`display:none`): selezione, voto in corso e cronologia
  aperta sopravvivono al cambio di scheda.
- Ogni scheda è condizionale: nessuna scheda che punta al vuoto; se solo la memoria è attiva, la vista
  predefinita cade su memoria. Senza alcuna capacità, la sezione scompare.
- 3 nuove chiavi in tutte le 9 lingue.

## 0.9.2 — 2026-10-13 (secondo canale per i riferimenti + catalogo)

- «Riferimenti alle skill» non legge più soltanto la chiamata al tool `skill`: il marcatore che l’host
  stesso pubblica, `user/message.source.kind === 'skill-invocation'` (invocazione diretta dell’utente;
  l’host chiede esplicitamente al modello di non richiamare il tool) entra nello stesso conteggio. Su 250
  sessioni reali, 10 avevano solo l’invocazione e nessuna chiamata: prima non compariva nulla.
- Nuovo gruppo «Disponibili in questa sessione» da `entries[].name` dei frame `skill-catalog`, ripiegato
  per impostazione predefinita. Ogni frame SOSTITUISCE l’elenco (commento dell’host: `update` marca una
  sostituzione), non un’unione — altrimenti le skill non sparirebbero mai. I nomi già riferiti vengono
  sottratti dal gruppo.
- Il testo di stato vuoto nomina entrambi i percorsi; 3 chiavi di gruppo in tutte le 9 lingue. Lo stato
  guadagna `catalog`/`catalogCount`, `stateVersion` 0→1 (con default; stati vecchi si riprodurrebbero).

## 0.9.1 — 2026-10-13 (visualizzazione raggruppata)

- La sezione «File prodotti» conta due gruppi separati: «Questo turno · N» in elenco diretto,
  «Modifiche precedenti · N» ripiegato dietro un interruttore. Se l’elenco ha un limite, una nota
  riporta il numero reale della sessione.
- La sezione dei richiami separa «Richiami attivi · N» (testo ancora nel contesto) da «Richiami
  precedenti · N» (sostituiti da un riassunto): ripiegati e, una volta aperti, ogni riga porta la
  marcatura «sostituito dal riassunto». Prima restava solo un contatore.
- Componenti `FoldToggle`/`GroupHeader` condivisi; 5 chiavi di gruppo in tutte le 9 lingue.

## 0.9.0 — 2026-10-13（首次上 npm；合并 0.9.0-local.0…8 全部装机测试内容）

Questa versione è la prima pubblicata su npm e contiene tutta la serie locale: la sezione «Riferimenti alle skill»
(la voce 0.9.0-local.8 qui sotto), il ripiegamento e il conteggio delle righe sostituite dalla compattazione,
e la sincronia dei due manifesti (`dsh.plugin.json` era a `local.4`).

### Aggiunto

- Sezione «Riferimenti alle skill»: elenca le skill che questa sessione ha realmente caricato tramite il tool skill dell’host (nome · caricamenti · etichetta «questo giro»). Fonte: la proiezione dshSummarySkillUsage (registrata dalla metà host di questo plugin; fold sincrono di turn/start, tool/call, tool/result). Il nome viene da tool/call.arguments: il tool skill non dichiara alcun presentationMeta su nessuna delle sei linee (verificato tag per tag), quindi non esiste un tool/result.meta strutturato; il testo del risultato non viene letto di proposito (una presentazione non diventa una seconda fonte di verità). I caricamenti falliti non contano. Nessun interruttore — proiezione assente ⇒ sezione nascosta. 6 chiavi × 9 lingue.
- Sincronia dei due manifesti: dsh.plugin.json era a 0.9.0-local.4 mentre package.json era già local.7 (cancello V1 del controllo pacchetto); ora entrambi 0.9.0-local.8.

## 0.9.0-local.0 – local.7 — 2026-10-12 → 10-13 (puntatori di installazione, mai pubblicati su registry)

### Aggiunto

- Vetrina del recall: titoli a due righe con clamp, bubble al passaggio con il testo completo, le righe dichiarate obsolete (retired) restano nell’elenco barrate.
- Contratto di fold e conteggio fissato da test, incluso il ramo «tutte le righe sostituite ⇒ avviso numerato» (porta anch’esso il marcatore recall-superseded-note).

### Modificato

- La compattazione non svuota più l’elenco di recall: le righe sostituite da un riassunto (superseded) sono ripiegate per impostazione predefinita e contate a piè di pagina; le obsolete restano barrate — è il verdetto umano su quel ricordo. Testi allineati nelle 9 lingue.

### Corretto

- La bubble ora si apre verso sinistra e non copre più la barra di valutazione.
- I clic dentro la barra di valutazione non risalgono più: la conferma «dichiara obsoleta» non partiva mai.
- Tolto l’attributo nativo title dal titolo della riga: disegnava un riquadro scuro fuori dal contratto skin che ripeteva il contenuto della bubble.

## 0.8.0 — 2026-10-12

### Aggiunto

- Sezione «Questa sessione ha richiamato»: alimentata dalla proiezione memoryRecall di dsh-prime-memory — quali ricordi sono stati davvero iniettati; con punteggio di rilevanza (0–5) e «dichiara obsoleta» (-1, reversibile).

### Modificato

- Sezione degli slot di memoria spenta di default: una card «slot permanenti» insegnava a leggere la memoria come residente, l’opposto del recall per rilevanza. L’interruttore resta per chi vuole l’elenco fissato.

## 0.6.0 — 2026-10-09

### Modificato

- Versione unica a raggio massimo: niente più taglio per linea host; engines.dsh e i peer enumerano in un colpo le 15 linee rc (generati da sync-hosts).

## 0.5.0 — 2026-10-03 → 10-04 (beta.1–3 promosse)

### Aggiunto

- Sezione degli slot di memoria (terza sezione della scheda Riepilogo), alimentata da dsh-prime-memory; interruttore showMemorySlots su due sedi di impostazioni (card di famiglia e pagina Plugins).
- refViews risolti (record_id → nome riassuntivo) secondo il contratto wire di prime-memory 0.20.1.
- Livello storico dei deliverable: le modifiche precedenti della sessione sono ripiegate dietro una riga commutabile e deduplicate rispetto ai file attivi.

## 0.4.0 — 2026-09-29

### Changed

- **Passaggio della linea host a DSH 0.2.0** (`main`, promosso da `compat/0.2.0`): `engines.dsh` e il peer `@deepseek-ai/dsh-client-locale` passano da `>=0.1.5-rc.1 <0.2.0-0` a `>=0.2.0-rc.1 <0.2.1-0` (blocco sulla finestra rc; rivalutazione da 0.2.1 in poi). Adattamento di soli metadati — la superficie consumata è interamente fatta di caller puri di `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, con definizioni di interfacce locali), e 0.2.0-rc.1 è pienamente compatibile con l'API plugin di 0.1.7: zero modifiche al codice. La linea 0.1.x (0.1.5/0.1.7) resta servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Albero delle dipendenze aggiornato alla nuova linea (pnpm 12), lockfile rigenerato; `pnpm-workspace.yaml` aggiunge `minimumReleaseAgeExclude` (garantisce che una macchina appena installata possa risolvere 0.2.0-rc.1).
- Le asserzioni sull'intervallo host di `tests/purity.spec.ts` sono allineate alla linea 0.2.0.
- **Installazione (questa linea)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Mappatura dei dist-tag npm: `dsh-0.2.0` → questa linea (`main`); `dsh-0.1.7` / `dsh-0.1.5` → linee 0.1.x (provenienti dai rami `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- README arricchito con panoramiche di installazione e compatibilità in cinque lingue (de/fr/ru/es/it).
