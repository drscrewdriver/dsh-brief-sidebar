# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.9.0-local.8 — 2026-10-13

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
