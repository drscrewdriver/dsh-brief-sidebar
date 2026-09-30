# dsh-brief-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

Plugin web pour DSH (consommateur de `dsh-better-sidebar`), dépôt/paquet **`dsh-brief-sidebar`** (panneau latéral de briefs de session).
Il rend le **brief** de la session sous forme d'un onglet « Résumé » dans le panneau latéral droit ; le brief se compose de deux listes :

- **liste todo** — le tableau de **progression** de la projection `todos`, qui affiche les trois états et le résumé d'avancement des tâches de la session en cours ;
- **liste des livrables** — la section **livrables** de la projection `dshSummaryDeliverables`, qui affiche en temps réel, au fil du tour, les fichiers écrits/modifiés avec succès ;
  les livrables de planification codeplan sont annotés en ligne par une pastille (« pill ») « Planification ».

Il **masque** en même temps le panneau todo officiel de DSH situé au-dessus du composer, faisant du tableau le seul support visible des todos.

Affichage en lecture seule : pas d'édition, pas d'écriture en retour, pas d'agrégation multi-sessions, aucune copie d'une couche de rendu tierce.

**Périmètre de compatibilité** : cette ligne (branche `main`, promue depuis `compat/0.2.0`) cible la **ligne DSH 0.2.0** — `engines.dsh` vaut `>=0.2.0-rc.1 <0.2.1-0`, base testée DSH 0.2.0-rc.1, publications via le dist-tag npm **`dsh-0.2.0`**. 0.2.0 est purément additif pour toutes les API d'hôte utilisées par ce plugin (la surface consommée se limite à des callers purs de `ctx.get(...)`, zéro suppression d'exports) — la ligne de support est donc décalée en bloc vers l'avant, sans branche de compatibilité à l'exécution. **Choisissez toujours la version du plugin selon la version de DSH** (n'utilisez pas `latest` aveuglément sur un hôte ancien : les `engines` de l'ancien hôte ne sont plus satisfaites et la prévérification de démarrage le désactive en silence ; les plages caret ne traversent pas non plus les minor de l'hôte) :

| Hôte DSH | Dernière version du plugin | dist-tag d'installation |
|---|---|---|
| 0.2.0 | **0.4.0** (latest) | `dsh-0.2.0` |
| 0.1.7 | 0.3.1 | `dsh-0.1.7` |
| 0.1.5 | 0.3.1 | `dsh-0.1.5` |
| 0.1.2 et antérieurs | non pris en charge (la ligne 0.1.x a pour borne inférieure 0.1.5-rc.1 ; npm n'a pas de dist-tag correspondant) | — |

(au 2026-09-30 ; la ligne 0.1.x continue d'être servie par les branches gelées `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).)

![brief-sidebar](assets/brief.png)

**Frontière de nommage** : l'identité de ce plugin (nom de paquet / id de plugin / id de bundle cordis / espace de noms locale / hook DOM
`data-dsh-brief-sidebar`) utilise toujours `brief` ; en revanche, la projection `todos`, l'outil `todo_write`, la cellule de dock officielle `{ id: 'todo' }` et `dsh-tool-todo` relèvent du domaine amont de DSH : le terme original `todo` est conservé, sans renommage par ce plugin.

**Système de mémoire** : la troisième section du brief (rappel de mémoire) n'est pour l'instant qu'un **emplacement de mise en page réservé** ; elle est **en cours de planification** et n'est pas rendue dans cette version — voir R11 / K4.

## Correspondance des exigences

| N° | Exigence | Emplacement d'implémentation |
|---|---|---|
| R1 | Pendant le montage du plugin, la barre todo officielle n'est pas rendue du tout | `src/client/brief/dock-shadow.tsx` |
| R2 | Plugin indépendant dédié, qui enregistre l'onglet « Résumé » auprès de better-sidebar | `src/client/index.tsx` |
| R3 | Les données proviennent uniquement de la projection `todos` calculée par l'hôte ; aucune fusion côté client, aucune écriture en retour | `src/client/brief/use-todos.ts` + `board.ts` |
| R4 | React ordinaire + tokens `--dsw-alias-*` ; zéro relation de code/nommage avec le plugin Canvas | `src/client/TodoBoardTab.tsx` (TodoSection) + `BriefIcon.tsx` |
| R5 | Réversible : après désactivation/désinstallation du plugin, le dock officiel se rétablit automatiquement | Tous les enregistrements passent par `ctx.effect`, les disposers sont récupérés avec la fiber |
| R6 | Non destructif : pas de modification du checkout DSH / de better-sidebar / du plugin canvas | Ce paquet se suffit à lui-même, aucun des dépôts ci-dessus n'est touché |
| R7 | L'onglet devient « Résumé », `TAB_ID` inchangé (remplacement sur place, les onglets déjà ouverts ne se déconnectent pas) | `src/client/SummaryTab.tsx` + `index.tsx` |
| R8 | Section 1 « Progression » : le contrat des trois états de todos descendu au niveau de la section | `src/client/TodoBoardTab.tsx` |
| R9 | Section 2 « Livrables » : liste en temps réel du dernier tour + cumul de la session, la partie hôte enregistre la projection | `src/projection/*` + `src/client/summary/*` |
| R10 | Les livrables codeplan sont un sous-ensemble annoté de la section livrables (pastille « Planification » en ligne), pas une section indépendante | `src/client/summary/deliverables.ts` + `DeliverablesSection.tsx` |
| R11 | Rappel de mémoire : simple emplacement de mise en page réservé (tout en bas de la séquence de sections), **en cours de planification**, non rendu dans cette version | Commentaire de l'emplacement dans `src/client/SummaryTab.tsx` / K4 |
| R12 | Préservation du comportement : masquage, badge, pause via `visible`, contrat de hauteur, adaptation 0.1.5 | Un peu partout, voir ci-dessous |
| R13 | La partie hôte ne fait pas d'E/S synchrone ; la projection est une contribution optionnelle (attente via `ctx.inject`) | `src/index.ts` + `src/projection/register.ts` |

## Installation

```powershell
# choisissez le dist-tag selon la version de l'hôte DSH (recommandé, pas de latest aveugle)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0   # ligne DSH 0.2.0 (0.4.0)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.1.7   # ligne DSH 0.1.7 (0.3.1)
dsh plugin --profile web add dsh-brief-sidebar@dsh-0.1.5   # ligne DSH 0.1.5 (0.3.1)
# Alternative 1 : tarball local (cette ligne : dsh-brief-sidebar-0.4.0.tgz)
dsh plugin --profile web add <dsh-brief-sidebar-0.4.0.tgz>
# Alternative 2 : installation directe depuis GitHub (build à faire soi-même)
dsh plugin --profile web add github:drscrewdriver/dsh-brief-sidebar#main
```

`--profile` doit suivre immédiatement `plugin`. Après l'installation, rechargez `http://127.0.0.1:3080`.

## Points de conception

### Chaîne de données : résoudre directement la face de projections au lieu du `useProjection` du framework

Le corps d'onglet de better-sidebar **n'est pas dans l'arbre de slots de DSH** et n'a pas accès aux props standards de portée session ; on procède donc ainsi :

```ts
ctx.get('sessions')                                  // accès sûr (pas de lecture directe du Proxy)
  ?.binding(scope.sessionId)?.session.projections    // SessionBinding.session = SessionFace
  ?.faceOf(key)                                      // ProjectionsFace
=> useSyncExternalStore(...)                         // pas de miroir local, pas de fusion
```

Cette chaîne est partagée par les deux projections (`src/client/use-projection.ts` contient la résolution générique indépendante des clés) :

- `todos` — enregistrée par `dsh-tool-todo`, l'hôte est l'unique point de calcul, `TodoItem[] | null`.
- `dshSummaryDeliverables` — enregistrée par la partie hôte de ce plugin (voir la section suivante), `DeliverablesView`.

**Les trois états de la section progression doivent rester distincts** (contrat de `readTodos`, verrouillé par les tests) :

| Valeur | Signification | Rendu |
|---|---|---|
| `undefined` | capacité absente (pas de session / unité hôte non montée / pas encore de baseline) | « Tâches momentanément indisponibles » |
| `null` → `[]` | projection présente et vide | état vide |
| tableau | entrées réelles | liste + résumé de progression |

Confondre les deux premiers revient à affirmer au lecteur « cette session n'a pas de tâches », alors que la réalité est « les données sont inaccessibles ».

La section livrables est différente : c'est une **capacité d'enrichissement optionnelle** ; quand la projection est absente (la partie hôte n'a pas enregistré cette unit), toute la section se masque, sans rendre de bruit « indisponible » ; quand la projection est là, `latest: null` et `sessionTotal: 0` constituent son état vide (l'unit publie dès son enregistrement).

### Chaîne de données des livrables : la partie hôte enregistre une unit de projection

Les données de la ligne officielle « production du tour » (`ui-deliverables`) s'accumulent déjà au fil du tour, entrée par entrée, à chaque `tool/result` réussi ; seulement, l'UI officielle est accrochée à `conversation.chat.turnTail` et ne se rend qu'à la fin du tour, tandis que l'onglet latéral n'a pas accès aux données de tour du moteur conversation (`SessionFace` n'expose pas la fenêtre d'événements, `IConversation` n'expose pas les données de tour). La partie hôte de ce plugin contribue donc sa propre unit via `ctx.sessionProjections.register()` :

- le **critère de fold** est strictement identique à celui du `turn-deliverables.ts` officiel : seuls les chemins des `write` / `edit` /
  `str_replace_editor` réussis (variantes create/str_replace/insert) sont pris en compte, avec déduplication, échecs non comptés, opérations de lecture non comptées ;
  écrire puis modifier dans le même tour ne compte que pour une entrée (`src/projection/deliverables-fold.ts`, fonction pure, verrouillée par les tests).
- **temps réel dans le tour** : chaque événement de commit de la registry déclenche le `apply` de toutes les unit ; chaque fichier modifié avec succès qui se confirme pousse une frame.
- **contribution optionnelle** : `ctx.inject(['sessionProjections'], …)` attend le service ; un déploiement sans registry charge quand même ce plugin
  (la section livrables se masque silencieusement) ; l'enregistrement est un effect, à la désinstallation la clé disparaît et le client lit une capacité absente.
- **capacité** : chemins du dernier tour plafonnés à 50, cumul de session plafonné à 100 (les plus récents conservés) ; `sessionTotal` n'a pas de plafond,
  la ligne de cumul « N fichiers au total dans cette session » reste toujours fidèle à la réalité.
- **clé namespacée** (`dshSummaryDeliverables`) : la registry refuse le partage d'une même clé avec un `stateVersion` différent,
  pour éviter une collision frontale avec une éventuelle future projection hôte officielle.

### Livrables codeplan : sous-ensemble annoté de la section livrables

Le **critère de la pastille « Planification » est une règle purement fondée sur les chemins** : si le chemin du fichier produit, après normalisation des séparateurs, contient le segment `.agents/plans/` (slash ou antislash), la pastille « Planification » est posée et le premier segment après `.agents/plans/` (nom de la tâche) est placé dans `title`.
Le plugin ne lit pas le contenu des fichiers et ne vérifie pas que l'auteur de l'écriture est bien le skill codeplan — tout fichier écrit dans ce répertoire se retrouve annoté ;
l'avantage de ce critère est l'absence de toute chaîne de données supplémentaire, le prix à payer est que la convention de chemins est elle-même l'unique source de vérité (voir la lacune K5).

Le skill codeplan écrit `spec.md` / `findings.md` / `checklist.md` / `tasks.md` avec write sous
`$workspace\.agents\plans\<任务名>\` — ces fichiers apparaissent naturellement dans le fold des livrables, sans collecte supplémentaire.
Les livrables de planification n'ont pas de section indépendante : ils font partie des livrables par nature.

### Ouverture au clic : le même canal d'aperçu Sidebar que le flux de conversation

Dans la section livrables, chaque ligne de chemin est un bouton ; un clic passe par `ctx.sidebarRight.openResource(<address>)` — exactement le même canal que les chips « production du tour » de la conversation et les mentions `code` en ligne (l'approche `openFile` de ui-chat). L'adresse est construite par le `fileAddressFor` porté en ligne (source `@deepseek-ai/dsh-util-workspace-path`) : chemin relatif, ou chemin absolu dans l'espace de travail de la session, adressé selon `dsh-resource://file/session/<id>/<相对路径>` (le préfixe de l'espace de travail est retiré) ; un chemin absolu situé hors de l'espace de travail conserve son orthographe absolue dans la même adresse de session. Le cwd de la session est lu depuis l'instantané de `sessions.list`, re-lecture à chaque clic.
Quand le service `sidebarRight` est absent, la ligne se dégrade en texte brut (même discipline de dégradation que pour l'absence de la projection livrables).

### Masquer le dock officiel : compétition de cellules sur le slot list

`conversation.input.dock` est un **slot list** ; les cellules sont identifiées par l'`id` de l'entrée. Le comportement de SlotCore est le suivant :

1. la clé de déduplication de `register()` est `(id, priority)` — le même `id` avec une autre `priority` est un enregistrement légal ;
2. les entrées sont triées par `priority` croissante (puis par `order`), le message d'erreur portant lui-même la sémantique "lowest renders" ;
3. `entriesOfSlot()` prend les cellules d'un slot list par `options.id`, **en ne conservant que la première après tri pour une même cellule**.

L'entrée officielle enregistre `{ id: 'todo', order: 0 }` (priority par défaut = 0) ; ce plugin l'emporte avec **`{ id: 'todo', priority: -1 }**.
L'enregistrement passe par `ctx.slots.inject('conversation.input.dock', …)` (attend la déclaration du slot et se réinstalle à sa reconstruction),
et non par un `register` nu (qui partirait en course avec la table de déclaration children de l'entrée parente). La même technique est déjà un précédent en production avec `dsh-input-traffic` face à la cellule voisine `queue`.

**Ne masquer que si `betterSidebar` est disponible** ; sinon on cacherait le panneau sans que les tâches soient visibles nulle part.

### Surface de support : le panneau latéral droit natif de DSH

Depuis 0.1.5, le panneau latéral droit appartient nativement à DSH ; le `openTab` de better-sidebar, avec son `target: 'right'` par défaut, enregistre le contenu comme type d'onglet natif,
et le menu `+` est la page guide native (`description` n'est rendue que si la page guide compte ≤4 entrées). Le corps d'onglet reçoit toujours
`TabComponentProps = { ctx, store, scope, tab, visible, … }` ; ce plugin n'en utilise que `ctx` / `scope` / `visible`.

Quand `visible === false`, la carte entière (shell compris) n'est pas rendue, pour éviter que l'onglet masqué se re-rende à chaque frame de projection.

## Risques de couplage et auto-vérification

| Risque | Conséquence | Méthode d'auto-vérification |
|---|---|---|
| L'amont renomme l'id de la cellule `todo` | Le masquage tombe en panne silencieusement, le panneau officiel réapparaît (**fail-open** : les données ne sont pas perdues, juste affichées en double) | Exécuter dans la console `ctx.slots.entriesOfSlot('conversation.input.dock').filter(e => e.options.id === 'todo')` ; il ne doit rester que l'entrée de ce plugin (`registrant: 'dsh-brief-sidebar'`, `priority: -1`) |
| Le panneau/la barre latérale better-sidebar est fermé(e) | Les tâches sont invisibles | Le badge de l'onglet affiche le nombre de tâches non terminées comme indice |
| L'amont change la clé ou les champs de la projection `todos` | Le tableau affiche « indisponible » ou rejette les entrées invalides | `SessionProjectionMap.todos` dans le `types.d.ts` de `dsh-tool-todo` reste l'unique source de vérité |
| Dérive de l'API better-sidebar | La surface d'enregistrement cesse de fonctionner | N'utiliser que les champs de base de `registerTab` (`id/title/description/icon/order/single/badge/component`) ; `peerDependencies` élargi à `>=0.18.1`, `devDependencies` épinglé à la version exécutée |
| Dérive du critère de fold officiel (nouveaux outils de mutation admis dans la liste, etc.) | La liste de livrables de ce plugin s'éloigne progressivement du « production du tour » officiel | Le critère prend pour référence d'alignement le `mutationPath` de `ui-deliverables/turn-deliverables.ts` ; comparer par diff à chaque montée de version |
| L'amont change la forme des événements `tool/call` / `tool/result` | Le fold des livrables perd des données (défense à la `readTodos` resserrée, pas de crash) | Les entrées `'tool/call'` / `'tool/result'` du `SessionEventMap` de `dsh-session` font foi |

## Lacunes connues

- **K1** Quand l'utilisateur désactive ce type d'onglet dans la carte Side, le dock reste masqué → les tâches sont invisibles partout.
  On pourrait ensuite conditionner sur `prefs.tabsEnabled` ; pas fait cette fois (l'utilisateur a choisi « tout masquer »).
- **K2** Les tâches sont invisibles quand le panneau/la barre latérale better-sidebar est fermé(e) (acceptation confirmée).
- **K3** L'amont renomme la cellule `todo` → le masquage tombe en panne silencieusement (fail-open, voir le tableau ci-dessus).
- **K4** La section de rappel de mémoire n'a qu'un emplacement de mise en page (**en cours de planification**) : le système n'a pas de mémoire par défaut ; la chaîne de données sera raccordée quand un plugin de mémoire enregistrera une clé de projection.
- **K5** La pastille « Planification » est un simple critère de préfixe de chemin (segment `.agents/plans/`), sans vérification de l'auteur de l'écriture : les fichiers écrits dans ce répertoire par des sources autres que codeplan sont aussi annotés ; si codeplan change sa convention de répertoire de livrables, la constante de `summary/deliverables.ts` devra être synchronisée.
- **K6** L'ouverture des lignes de chemin au clic dépend du service hôte `sidebarRight` (consommation optionnelle) ; sur les déploiements qui en sont dépourvus, les lignes de livrables ne sont pas cliquables et restent en texte brut.

## Développement

```powershell
pnpm install        # dépendances : react / @deepseek-ai/cordis / zod en devDep, fournies à l'exécution par la table de modules de l'hôte ou empaquetées avec le paquet
pnpm typecheck      # tsc -p tsconfig.json && tsc -p tsconfig.client.json
pnpm test           # vitest (jsdom)
pnpm build          # tsc produit lib/types + tsdown produit lib/index.mjs / lib/client.js (zod intégré au paquet host, autonome)
npm pack            # produit le tarball (ce répertoire a un pnpm-workspace.yaml mais sans champ packages : pnpm pack est inutilisable)
```

`lib/` **doit être versionné** : quand le profile installe via une ref GitHub, il n'y a pas d'étape de build.

## Compatibilité

Les relevés de tests au cas par cas de la ligne 0.1.x figurent dans les README des branches `compat/0.1.7` / `compat/0.1.5` (≤0.3.1) ; cette ligne (`main`) cible la **ligne DSH 0.2.0**, avec pour base testée **DSH 0.2.0-rc.1 + dsh-better-sidebar 0.19.1**.
0.2.0-rc.1 est totalement rétrocompatible avec l'API de plugins de 0.1.7 (manifest/settings/HMR/slot/session V4 intacts) ; toute la surface consommée de ce plugin se limite à des callers purs de `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, avec définitions d'interfaces locales), sans override des contrats de l'hôte : cette ligne est donc une adaptation purement métadonnées, zéro modification de code.
`engines.dsh` vaut `>=0.2.0-rc.1 <0.2.1-0`, et les trois emplacements — `engines.dsh` de `package.json`, la plage du paquet client DSH dans `peerDependencies`, et `engines.dsh` de `dsh.plugin.json` — **doivent rester cohérents** (actuellement cohérents).
La dernière version du plugin par ligne d'hôte, avec son dist-tag d'installation, figure dans le tableau « Périmètre de compatibilité » en tête de fichier (0.2.0 → 0.4.0 / 0.1.7 → 0.3.1 / 0.1.5 → 0.3.1 ; 0.1.2 et antérieurs ne sont pas pris en charge).
**Les lignes hôtes à partir de 0.2.1 ne sont pas couvertes par cette ligne** : discipline de verrouillage sur la fenêtre rc ; à partir de 0.2.1, l'adaptation devra être réévaluée (une nouvelle ligne de version sera alors ouverte).

## Notes multilingues / Sprachen / Langues / Языки / Idiomas / Lingue

Le README original est rédigé en chinois ; le présent document en est la traduction française. Aperçu installation et compatibilité (cette ligne exige DSH 0.2.0 : `>=0.2.0-rc.1 <0.2.1-0` ; dist-tag selon la ligne d'hôte : 0.2.0 → `dsh-0.2.0` (0.4.0) / 0.1.7 → `dsh-0.1.7` (0.3.1) / 0.1.5 → `dsh-0.1.5` (0.3.1) ; DSH 0.1.2 et antérieurs ne sont pas pris en charge, pas de `latest` aveugle sur un hôte ancien):

- **Deutsch** — benötigt DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), getestet gegen DSH 0.2.0-rc.1. dist-tag je nach Host-Linie: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 und früher werden nicht unterstützt. Kein blindes `latest` auf alten Hosts (die Start-Vorprüfung deaktiviert das Plugin still). Tabelle: Abschnitt „Kompatibilitätsbereich".
- **Français** — nécessite DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testé avec DSH 0.2.0-rc.1. dist-tag selon la ligne d'hôte : `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1) ; DSH 0.1.2 et antérieurs ne sont pas pris en charge. Pas de `latest` aveugle sur un hôte ancien (la prévérification de démarrage le désactive en silence). Tableau : section « Périmètre de compatibilité ».
- **Русский** — требуется DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), протестировано на DSH 0.2.0-rc.1. dist-tag по линии хоста: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 и ранее не поддерживаются. Не используйте `latest` вслепую на старых хостах (плагин молча отключается стартовой предпроверкой). Таблица: раздел «Диапазон совместимости».
- **Español** — requiere DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), probado con DSH 0.2.0-rc.1. dist-tag según la línea del host: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 y anteriores no están soportados. No use `latest` a ciegas en hosts antiguos (la preverificación de arranque lo desactiva en silencio). Tabla: sección «Alcance de compatibilidad».
- **Italiano** — richiede DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testato su DSH 0.2.0-rc.1. dist-tag in base alla linea dell'host: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0` (0.2.0 → 0.4.0), `…@dsh-0.1.7` (0.1.7 → 0.3.1), `…@dsh-0.1.5` (0.1.5 → 0.3.1); DSH 0.1.2 e precedenti non sono supportati. Niente `latest` alla cieca su host vecchi (la preverifica di avvio lo disattiva in silenzio). Tabella: sezione «Perimetro di compatibilità».
