# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

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
