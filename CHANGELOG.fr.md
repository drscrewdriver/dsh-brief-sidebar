# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.9.11 — 2026-10-15 (visionneuse de mémoire intégrée dans ce plugin)

- **Accès au détail enfin câblé** : un bouton à droite de la barre de notation et sur chaque ligne `ref` des emplacements ouvre l'onglet `dsh-md-memory-viewer:memory` via `betterSidebar.openTab`. **Canal onglet, pas de système de fichiers** : l'ancienne approche fileViewer (chemin `<id>.memory` déguisé) était résolue par l'EditorHost hôte comme un fichier réel et finissait en ENOENT.
- **Le composant visionneuse vit désormais ici** (`src/client/memory-viewer/viewer.tsx`) ; le plugin autonome `dsh-md-memory-viewer` est supprimé. Le type d'onglet est enregistré dans `apply()` (`hidden: true`, absent du menu +), donc les onglets restaurés après redémarrage gardent un propriétaire.
- **Référence au service via le module `memory-tab.ts`** : dans les composants profonds, `ctx.get('betterSidebar')` est silencieusement refusé par le proxy strict (clic sans effet ni erreur) ; la référence est capturée une fois dans `apply()`.
- **État vide** : sans `memoryId` (onglet restauré avant l'enregistrement), le panneau affiche « Aucune mémoire sélectionnée pour cette session de démarrage » au lieu d'un vide.
- **Corps en Markdown** : bulle et visionneuse partagent `renderMd` sans dépendance (titres / gras / code inline / listes) ; toutes les données viennent de `dsh-memory/records-meta`.
- **Hiérarchie visuelle** : le titre prend le champ `name` (13px/600/couleur primaire), la ligne de scénario retombe à 10px — auparavant un `## Conclusion` de corps était affiché comme nom.

## 0.9.10 — 2026-10-14 (plafonds relevés d’après mesure, replay des anciennes sessions)

- Nouveaux plafonds du pliage de recherche : sources 20→**64**, requêtes 20→**48**, URLs du tour courant 20→**64**
  (extrait 160 caractères et 5 requêtes par source inchangés).
- Chiffres mesurés sur 348 sessions locales (70 avec recherche) : requêtes par session p50=7/p90=29/p95=38/p99=67,
  sources par session p50=16/p90=54/p95=63/p99=164, sources par tour p50=16/p90=41/p95=51/max=65.
  L’ancienne valeur 20 correspondait à p55 : **même la session médiane était tronquée** — voilà d’où vient « 0 résultat ».
- `stateVersion` passe à 2 : **obligatoire même sans changement de forme**. Un point de reprise écrit sous
  les anciens plafonds a déjà jeté des sources ; seule une ligne jetée est re-pliée depuis le journal.
- Nouveau test de budget permanent : pire remplissage = 62 047 octets par trame (budget 96 Ko), avec l’assertion que les
  plafonds serrent vraiment ; une session typique fait environ 15 Ko.
- Pas de réglage exposé pour l’instant : les plafonds vivent du côté hôte, et un champ de réglage impliquerait le schéma
  Config, `.volatile()` et le formulaire sur les six lignes — en plus d’un effet uniquement vers l’avant.

## 0.9.9 — 2026-10-14 (groupes de recherche repliés par défaut)

- Tous les groupes de requêtes de l’onglet « Recherche » sont **repliés par défaut**, y compris ceux du tour courant :
  on voit une ligne par question avec le nombre qu’elle contient vraiment, au lieu d’un flot de bulles.
- La règle précédente (« ouvrir le tour courant ») masquait, sur une session réelle, la liste des questions que l’on vient parcourir.
- On ouvre ce que l’on clique ; l’état est indexé sur le texte de la requête, un nouveau cadre ne referme rien.
- Le champ `SearchCluster.latest` a été supprimé, personne ne le consommant plus.
- Les tests épinglent : tout replié par défaut, un clic n’ouvre qu’un groupe, un second le referme ; le test de désinfection
  des liens ouvre d’abord, au lieu de confondre « non rendu » et « pas de lien ».

## 0.9.8 — 2026-10-14 (groupes vides corrigés : un changement de forme exige une nouvelle stateVersion)

- Corrige un défaut de 0.9.7 : les titres de groupe comptaient des résultats, le panneau ouvert restait vide.
- Cause : l’état de pliage est passé d’un simple `query` à `queries[]` sans que `stateVersion` quitte 0.
  Le `restore` de l’hôte ne jette un point de reprise qu’en cas de version différente, puis rejoue le journal
  (`session-projection/src/index.ts:88-92`, `:122-126`) : la ligne ancienne a traversé le nouveau schéma, chaque champ
  `queries` est tombé à sa valeur par défaut vide, et toutes les sources ont glissé dans le groupe final.
- `stateVersion` passe à 1 : les points de reprise périmés sont jetés et re-pliés correctement.
- Les titres affichent désormais le nombre **réellement contenu**, plus les `hits` de l’appel : titre et contenu ne peuvent plus se contredire.
- Un groupe vide devient une ligne simple sans chevron ; les sources non réclamées restent dans « Sources · N », rien ne disparaît en silence.
- Nouveau garde d’enregistrement : `stateVersion`=1 est épinglée, avec la preuve qu’une ligne ancienne ressort vide du nouveau schéma.

## 0.9.7 — 2026-10-14 (résultats groupés par requête et repliés)

- L’onglet « Recherche » groupe désormais **par requête** : une ligne repliable par question
  (`requête · N résultats`), et sous la ligne les bulles apportées par cette requête.
- Seul le groupe du tour courant est ouvert ; les autres restent repliés. L’état est indexé sur le texte de la
  requête, donc un nouveau frame ne referme pas ce que le lecteur vient d’ouvrir.
- Une source mémorise **toutes** les requêtes qui l’ont ramenée (`queries[]`, max 5, union entre appels) :
  un appel multi-requêtes n’est plus rattaché à la seule dernière ; une source peut figurer dans plusieurs groupes — fait, pas doublon.
- Les sources sans requête listée (liste saturée, ancien frame) tombent dans un groupe « Sources · N » au lieu de disparaître.
- Rétro-compatible : valeurs par défaut sur `queries` dans le schéma, et un vieil `query` unique est réparé en `[query]` à la lecture.
- L’étiquette d’outil ajoutée en 0.9.5 est retirée (les données restent dans la trame).

## 0.9.6 — 2026-10-14 (l’onglet Recherche devient un fil de bulles)

- L’onglet « Recherche » n’affiche plus la liste des requêtes ni les marques d’outil
NaNadvanced_search`/`web_search` ;
  les titres de groupe « Requêtes · N » et « Sources · N » disparaissent aussi.
- Chaque source devient une **bulle alignée à gauche**, lisible comme la conversation de gauche :
  titre (lien cliquable), domaine, extrait.
- La pastille « Ce tour » passe dans la bulle ; une source retrouvée plusieurs fois y porte un `×N`.
- Rien ne change au pliage : requête et outil restent dans la trame `dshSummarySearchRefs`, ils ne sont plus dessinés.
- L’astuce « sources absentes » et la note de troncature restent ; discipline des liens inchangée (http/https seulement, avec `rel="noreferrer noopener"`).

## 0.9.5 — 2026-10-14 (l’onglet Recherche couvre aussi l’outil hôte web_search)

- En plus de `advanced_search`, les appels de `web_search` (outil du hôte) sont désormais pliés :
  le modèle utilise celui-là par défaut, si bien que les sessions ayant cherché restaient vides.
- Les deux formes d’arguments sont lues : `query` (chaîne unique) et `queries` (tableau ; une
  requête par ligne, le nombre de sources restant le total de l’appel).
- Chaque ligne de requête affiche le nom de l’outil qui a répondu (non traduit : c’est un identifiant que l’on retrouve dans le transcript).
- Rejeu sur 250 sessions réelles : sessions avec requêtes passées de 20 à 52, 472 lignes d’hôte et 777 sources.
- Le message vide cite les deux outils (9 langues) ; sans champ `tool` dans un ancien frame, la ligne est lue
  comme `advanced_search` au lieu d’être jetée.

## 0.9.4 — 2026-10-14 (troisième onglet « Recherches » dans les Références)

- Nouvelle projection `dshSummarySearchRefs` : ne replie que `advanced_search`, jamais le
  `web_search` de l’hôte — deux faits distincts pour le lecteur. Requête depuis
  `tool/call.arguments.query`, sources depuis `tool/result.meta.sources[]` ;
  un résultat non réglé ou en erreur ne compte pas.
- Groupes « Requêtes · N » et « Sources · N » ; les URL renvoyées par le fournisseur sont des données
  non fiables : seules http/https deviennent des liens (avec `rel="noreferrer noopener"`).
- Repli : les anciennes versions de dsh-free-search n’émettent pas de `presentationMeta` — les
  requêtes restent comptées, les sources à 0, avec une explication au lieu d’une liste vide.
- Bornes : 20 entrées par liste, résumé coupé à 160 caractères ; 10 clés nouvelles dans les 9 langues.

## 0.9.3 — 2026-10-13 (compétences et mémoire côte à côte sous « Références »)

- Les trois sections du bas (références de compétences, rappels de session, emplacements mémoire)
  deviennent une section « Références » à deux onglets « Compétences » / « Mémoire », commutables au
  clic ou avec les flèches gauche/droite ; le board et les fichiers ne sont plus chassés de la vue.
- Le panneau inactif reste monté (`display:none`) : sélection en cours, note en attente et
  historique déplié survivent au changement d’onglet.
- Chaque onglet est conditionnel : aucun onglet menant à un vide ; si seule la mémoire est vivante,
  l’onglet par défaut bascule dessus. Sans aucune capacité, la section disparaît.
- 3 nouvelles clés dans les 9 langues.

## 0.9.2 — 2026-10-13 (second canal pour les références + catalogue)

- « Références de compétences » ne lit plus seulement l’appel à l’outil `skill` : le marqueur posé par
  l’hôte lui-même, `user/message.source.kind === 'skill-invocation'` (invocation directe par
  l’utilisateur ; l’hôte demande explicitement au modèle de ne pas rappeler l’outil) entre dans le même
  comptage. Sur 250 sessions réelles, 10 n’avaient qu’une invocation et aucun appel d’outil — rien
  n’apparaissait auparavant.
- Nouveau groupe « Disponibles dans cette session » depuis `entries[].name` des trames
  `skill-catalog`, replié par défaut. Chaque trame REMPLACE la liste (commentaire de l’hôte : `update`
  marque un remplacement) — pas d’union, sinon les compétences ne disparaîtraient jamais. Les noms déjà
  référencés sont retirés du groupe.
- Le texte d’état vide nomme les deux chemins ; 3 clés de groupe dans les 9 langues. État enrichi de
  `catalog`/`catalogCount`, `stateVersion` 0→1 (valeurs par défaut, les états anciens se rejouent).

## 0.9.1 — 2026-10-13 (affichage groupé)

- La section « Fichiers produits » compte désormais deux groupes séparés : « Ce tour-ci · N » en liste
  directe, « Modifications antérieures · N » replié derrière un interrupteur. Quand la liste est bornée,
  une ligne annexe donne le chiffre réel de la session.
- La section des rappels sépare « Rappels actifs · N » (texte encore dans le contexte) de « Rappels
  antérieurs · N » (remplacés par un résumé) : repliés, et marqués « remplacé par le résumé » une fois
  ouverts. Auparavant il ne restait qu'un nombre.
- Composants `FoldToggle`/`GroupHeader` partagés ; 5 clés de groupe dans les 9 langues.

## 0.9.0 — 2026-10-13（首次上 npm；合并 0.9.0-local.0…8 全部装机测试内容）

Cette version est la première publiée sur npm et contient toute la série locale : la section « Références de
compétences » (l’entrée 0.9.0-local.8 ci-dessous), le repli et le comptage des lignes remplacées par la
compaction, ainsi que la synchronisation des deux manifestes (`dsh.plugin.json` était resté à `local.4`).

### Ajout

- Section « Références de compétences » : la liste des compétences que cette session a réellement chargées via l’outil skill de l’hôte (nom · chargements · étiquette « ce tour »). Source : la projection dshSummarySkillUsage (enregistrée par la moitié host de ce plugin ; pliage synchrone de turn/start, tool/call, tool/result). Le nom vient de tool/call.arguments : l’outil skill ne déclare aucun presentationMeta sur les six lignes (vérifié tag par tag), donc pas de tool/result.meta structuré ; le texte de résultat n’est volontairement pas lu (une présentation ne devient pas une seconde source de vérité). Les chargements échoués ne comptent pas. Sans interrupteur — projection absente ⇒ section cachée. 6 clés × 9 langues.
- Synchronisation des deux manifestes : dsh.plugin.json était à 0.9.0-local.4 pendant que package.json était déjà à local.7 (barrière V1 du contrôle de paquet) ; les deux sont désormais 0.9.0-local.8.

## 0.9.0-local.0 – local.7 — 2026-10-12 → 10-13 (pointeurs d’installation, jamais publiés sur le registry)

### Ajout

- Surface d’affichage du rappel : titres bridés à deux lignes, bulle au survol avec le texte complet, lignes déclarées obsolètes (retired) conservées dans la liste et barrées.
- Contrat de pliage et de comptage épinglé par des tests, y compris le cas « toutes les lignes remplacées ⇒ avis chiffré » (il porte lui aussi la marque recall-superseded-note).

### Modifié

- La compression ne vide plus la liste de rappel : les lignes remplacées par un résumé (superseded) sont repliées par défaut et comptées en pied ; les lignes obsolètes restent visibles, barrées — c’est le verdict humain sur ce souvenir. Textes ajustés dans les 9 langues.

### Corrigé

- La bulle s’ouvre maintenant vers la gauche de la ligne et ne couvre plus la barre de notation.
- Les clics dans la barre de notation arrêtent de remonter : la confirmation « déclarer obsolète » ne se déclenchait jamais.
- Plus d’attribut natif title sur le titre de ligne : il peignait une infobulle sombre hors contrat de skin qui répétait le contenu de la bulle.

## 0.8.0 — 2026-10-12

### Ajout

- Section « Rappel de cette session » : alimentée par la projection memoryRecall de dsh-prime-memory — quels souvenirs ont réellement été injectés ; avec notation de pertinence (0–5) et « déclarer obsolète » (-1, réversible).

### Modifié

- Section des emplacements mémoire désactivée par défaut : une carte « emplacements permanents » apprenait à lire la mémoire comme résidente, l’inverse du rappel par pertinence. L’interrupteur reste pour qui veut la liste épinglée.

## 0.6.0 — 2026-10-09

### Modifié

- Version unique à portée maximale : plus de découpage par ligne d’hôte ; engines.dsh et les peers énumèrent d’un coup les 15 lignes rc (génération via sync-hosts).

## 0.5.0 — 2026-10-03 → 10-04 (beta.1–3 promues)

### Ajout

- Section des emplacements mémoire (troisième section de l’onglet Résumé), alimentée par dsh-prime-memory ; interrupteur showMemorySlots sur deux sièges de réglages (carte de famille et page Plugins).
- refViews résolus (record_id → résumé du nom) selon le contrat wire de prime-memory 0.20.1.
- Étage d’historique des livrables : les modifications antérieures de la session sont repliées derrière une ligne de bascule et dédupliquées contre les fichiers actifs.

## 0.4.0 — 2026-09-29

### Changed

- **Migration de la ligne hôte vers DSH 0.2.0** (`main`, promue depuis `compat/0.2.0`) : `engines.dsh` et le peer `@deepseek-ai/dsh-client-locale` passent de `>=0.1.5-rc.1 <0.2.0-0` à `>=0.2.0-rc.1 <0.2.1-0` (verrouillage sur la fenêtre rc ; réévaluation à partir de 0.2.1). Adaptation purement métadonnées — toute la surface consommée se limite à des callers purs de `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, avec définitions d'interfaces locales), et 0.2.0-rc.1 est totalement rétrocompatible avec l'API de plugins 0.1.7 : zéro modification de code. La ligne 0.1.x (0.1.5/0.1.7) continue d'être servie par les branches gelées `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Arbre de dépendances actualisé pour la nouvelle ligne (pnpm 12), lockfile régénérée ; `pnpm-workspace.yaml` ajoute `minimumReleaseAgeExclude` (garantit qu'une machine fraîchement installée peut résoudre 0.2.0-rc.1).
- Les assertions de plage hôte de `tests/purity.spec.ts` sont alignées sur la ligne 0.2.0.
- **Installation (cette ligne)** : `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Correspondance des dist-tags npm : `dsh-0.2.0` → cette ligne (`main`) ; `dsh-0.1.7` / `dsh-0.1.5` → lignes 0.1.x (issues des branches `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- Ajout au README d'aperçus d'installation et de compatibilité en cinq langues (de/fr/ru/es/it).
