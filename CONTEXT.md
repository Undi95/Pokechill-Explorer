# 📋 CONTEXT — PokeChill Explorer

> Fichier de contexte et suivi des avancées. Mis à jour à chaque session de travail.

---

## 🎮 Présentation du Projet

**Nom** : PokeChill Explorer  
**URL** : [pokechill-explorer.alwaysdata.net](https://pokechill-explorer.alwaysdata.net)  
**Repo** : [github.com/play-pokechill/play-pokechill.github.io](https://github.com/play-pokechill/play-pokechill.github.io)  
**Version actuelle** : v5.0  
**Dernière modif** : 18 avril 2026  

C'est un outil communautaire "fan-made" pour le jeu **PokeChill** (fan game Pokémon). Il permet aux joueurs d'explorer les données du jeu, de builder leurs équipes, simuler des dégâts, etc.

---

## 🗂️ Structure du Projet

```
/github
├── www/                    ← Frontend (site web statique)
│   ├── index.html          ← Page principale (~509 KB, ~6192 lignes après refacto)
│   ├── favicon.ico
│   ├── run.gif
│   ├── sw.js               ← Service Worker (PWA)
│   ├── css/
│   │   ├── style.css       ← Styles principaux (~74 KB)
│   │   └── mobile.css      ← Styles mobile (~20 KB)
│   ├── js/                 ← 24 modules JavaScript (résultat du refactoring)
│   │   ├── core.js         ← Fonctions core (rotations, préférences)
│   │   ├── utils.js        ← Utilitaires (format, getDivision, escapeHtml…)
│   │   ├── i18n.js         ← Traductions FR/EN (~123 KB, très complet)
│   │   ├── parsers.js      ← Parsing des données du jeu (~124 KB)
│   │   ├── damage-calc.js  ← Calculateur de dégâts (~150 KB)
│   │   ├── savezone.js     ← Gestion sauvegarde/lecture de save (~181 KB — le plus gros)
│   │   ├── team-subtabs.js ← Teams sauvegardées, import/export (~131 KB)
│   │   ├── export-image.js ← Export GIF/PNG (~60 KB)
│   │   ├── exchange.js     ← Échange Cable Link (~64 KB)
│   │   ├── zones.js        ← Zones Wild/Dungeon/Event/Active (~72 KB)
│   │   ├── areas.js        ← Zones normales (~34 KB)
│   │   ├── pokemon.js      ← Rendu des cards Pokémon (~25 KB)
│   │   ├── division.js     ← Recherche par division (~33 KB)
│   │   ├── build-panel.js  ← Panel de build (~24 KB)
│   │   ├── shop.js         ← Boutique (~27 KB)
│   │   ├── genetics.js     ← Génétique (~24 KB)
│   │   ├── type-chart.js   ← Table des types (~27 KB)
│   │   ├── auth.js         ← Authentification (~14 KB)
│   │   ├── items.js        ← Objets (~23 KB)
│   │   ├── moves.js        ← Attaques (~13 KB)
   │   ├── abilities.js    ← Talents (~13 KB)
│   │   ├── trainers.js     ← Dresseurs (~9 KB)
│   │   ├── compare.js      ← Comparaison Pokémon (~4 KB)
│   │   ├── guide.js        ← Guide + Thèmes (~6 KB)
│   │   └── notifications.js← Système de notifications (~8 KB)
│   ├── scripts/
│   │   ├── challenges-explorer.js ← Explorateur de défis (~123 KB)
│   │   ├── gif.js          ← Librairie GIF.js
│   │   └── gif.worker.js   ← Worker GIF
│   ├── guides/
│   │   ├── guide-fr.html   ← Guide complet FR
│   │   └── guide-en.html   ← Guide complet EN
│   ├── teams/              ← Teams des membres (dossiers par pseudo)
│   │   ├── manifest.json   ← Liste de toutes les teams membres (~459 KB)
│   │   ├── Undi/, Kridx/, Baltimor/, Zenith/… (15 membres)
│   │   └── Archives/       ← Anciennes versions
│   └── Featured/           ← (vide ou réservé)
│
└── exchange/               ← Backend PHP (Cable Link)
    ├── api.php             ← API principale (~45 KB)
    ├── api.php.backup      ← Backup
    ├── data/               ← Données persistantes
    ├── rooms/              ← Rooms d'échange temporaires (TTL 10min)
    ├── saves/              ← Sauvegardes utilisateurs (persistantes)
    └── gifts/              ← Système de cadeaux
```

---

## ✨ Fonctionnalités Principales

### 🔍 Pokédex / Explorer
- Recherche avancée : nom, type, talent, egg moves
- Affichage : BST, stats réelles, talents cachés, signatures
- Système de **divisions** : D, C, B, A, S, SS, SSS (calculé sur les étoiles de stats)
- Calcul des étoiles : `statToRating(baseStat)` → 1 à 6 étoiles par stat

### 🛠️ Team Builder
- 6 slots Pokémon avec personnalisation complète
- **IVs** (0–6 étoiles par stat)
- **Natures** : Adamant, Modest, Jolly, Relaxed, Quiet, Bold (avec coloration des stats boostées/réduites)
- **Star Signs** : Sol, Luna, Pluto, Ceres, Terra, Eris (variants shiny avec rotation de teinte)
- **Médailles/Ribbons** sur les cartes
- Sauvegarde locale + authentification (équipes cloud)
- Export **GIF animé** avec sprites (via gif.js / gif.worker.js)

### ⚔️ Calculateur de Dégâts
- Mode Wild ou Raid
- Prend en compte : natures, talents, objets, buffs cuisine, types, stabilités
- Affichage coloré des stats selon la nature

### 🌐 Zones
- **Wild** : rotations de 12h (12 rotations max)
- **Dungeon** : rotations décalées de 4 (12 rotations max)
- **Event** : rotations de 3 jours (6 rotations max)
- **Frontier** : (4 rotations, décalé de 2)
- **Mega Dimension** : (5 rotations)
- Calcul automatique de la rotation actuelle basé sur UTC

### 🔄 Cable Link (Échange)
- Système de rooms temporaires (10 min TTL) via `exchange/api.php`
- Échange de Pokémon entre joueurs
- Système de **cadeaux** (gifts) entre utilisateurs

### 📖 Savezone
- Lecture et parsing des fichiers de sauvegarde du jeu
- Affichage des Pokémon capturés, équipes, stats
- Challenges tracker

### 🌟 Featured Teams
- Teams communautaires partagées dans `www/teams/`
- `manifest.json` auto-généré (~459 KB)
- Système de tags (version, auteur)
- Soumission via interface web (`www/teams/submit.php` etc.)

---

## 🎨 Thèmes Disponibles

| Thème | Description |
|-------|-------------|
| **Défaut** | Dark blue/purple (accent: cyan + pink) |
| **Halloween** | Dark orange/red |
| **Mega Dimension** | Starry night avec purple |
| **PokeChill** (Game) | Authentique game palette + font "Winky Sans" |

---

## 🔧 Architecture Technique

### Frontend
- **Vanilla HTML5/CSS3/JS (ES6+)** — aucun framework
- **Polices** : Rajdhani, Orbitron (Google Fonts) + Winky Sans (custom)
- **IndexedDB** : cache des données pour les performances
- **Service Worker** (`sw.js`) : mode PWA / offline partiel
- **GIF.js** : export GIF animé des équipes

### Backend
- **PHP** (hébergé sur AlwaysData)
- API REST JSON dans `exchange/api.php`
- Stockage fichier (JSON, pas de base de données)
- Rooms d'échange TTL 10 min, sauvegardes persistantes

### Données du Jeu
- Parsées dynamiquement depuis les fichiers JS du jeu officiel via `fetch` GitHub
- `parsers.js` extrait : constantes, Pokémon, moves, items, areas, egg moves, event names…
- Constants parsées : `T4_BASE`, `DEMERIT_BP`, `EVOLUTION_LEVELS`, `ROTATION_MAX`, niveaux Wild/Dungeon, difficultés

### Chargement des Scripts (ordre important)
```
gif.js → i18n.js → core.js → utils.js → guide.js → parsers.js
→ [body]
→ challenges-explorer.js → compare.js → build-panel.js → trainers.js
→ shop.js → genetics.js → zones.js → export-image.js → team-subtabs.js
→ division.js → abilities.js → moves.js → items.js → areas.js
→ pokemon.js → type-chart.js → damage-calc.js → auth.js → exchange.js
```

---

## 📊 Constantes du Jeu (v5.0)

| Constante | Valeur connue | Description |
|-----------|---------------|-------------|
| `DEMERIT_BP` | 150 | BP des moves de demerit (était 130 avant v4.9) |
| Divisions | D/C/B/A/S/SS/SSS | Basé sur somme des étoiles de stats |
| Evolution | Level 1/2/3 | Parsés depuis pkmnDictionary |
| Rotations Wild | Max 12 | Toutes les 12h |
| Rotations Dungeon | Max 12 | Décalé de 4 |
| Rotations Event | Max 6 | Tous les 3 jours |
| Z-Crystals | 18 cristaux | Farmables dans Sunken Temple |
| Natures | 6 | Adamant, Modest, Jolly, Relaxed, Quiet, Bold |

---

## 🕓 Historique des Versions

| Version | Nom | Contenu clé |
|---------|-----|-------------|
| **v5.0** | Z-Crystals & EggMove | 18 Z-Crystals, 4 nouveaux dresseurs (AZ/Ash/Blue/Prof Oak), Replicator E, section Gems/Drops Donjons, guides FR/EN synchro |
| v4.9 | Demerit Update | DEMERIT_BP 130→150 |
| v4.8 | Nature Update | 6 natures, filtrage, coloration stats, export GIF |
| v4.7 | Star Sign Update | Star Signs (shiny variants), hue rotation, export GIF |

---

## 🏆 Refactoring Accompli (Mars 2026)

| Métrique | Avant | Après |
|----------|-------|-------|
| Fichier principal | 22 700 lignes | ~6 192 lignes |
| Réduction | — | **73%** |
| Modules JS | 0 | **24 fichiers** |
| CSS | inline | fichier externe |

---

## 📁 Teams Membres

Dossiers dans `www/teams/` :
`Adaves`, `Aigris_num__ro_2`, `Apielickmyballs`, `Archives`, `Baltimor`, `Darkaufeu`, `Kridx`, `Majorchewie`, `Undi`, `Weffles`, `Zenith`, `personne`, `rtwarthur`, `sk777`, `z1`

---

## 📝 Journal des Avancées

### 🗓️ 2026-04-18 — Mission 1 : Nettoyage + Allègement + Mode Zone

**Contexte** : Demande de l'utilisateur pour (1) nettoyer le code, (2) réduire le poids du site, (3) ajouter le mode Zone dans le calculateur de dégâts (suggestion de Baltimor).

**Ce qui a été fait** :

#### 🧹 Nettoyage
- ✅ Bug corrigé : `</option` → `</option>` (balise HTML incomplète dans `damage-calc.js` ligne 337)
- ✅ Strings FR hardcodées `"Difficulté: ..."`, `"Dégâts:"`, `"coup(s) pour KO"` → remplacées par `t('...')` (i18n-compatibles)
- ✅ Refactoring du bloc `setDmgMode()` : reset unifié des boutons (évite la duplication)
- ✅ Extraction de la logique `calcHPFromDifficulty()` en fonction réutilisable (était dupliquée entre raid et zone)

#### ⚡ Allègement
- ✅ **-83 KB sur `index.html`** : le bloc `<style>...</style>` (1900 lignes) était dupliqué dans `style.css` mais jamais linkée. `style.css` est maintenant correctement linkée et le bloc inline supprimé.
- **Avant** : index.html ~501 KB (CSS inline + CSS fichier non utilisé)
- **Après** : index.html ~416 KB + style.css ~70 KB (cacheable séparément par le navigateur)

#### 🆕 Fonctionnalité : Mode Zone dans le calculateur de dégâts
**Fichiers modifiés** : `damage-calc.js`, `index.html`, `i18n.js`

- ✅ Nouveau bouton `🏰 Zone Battle` entre Wild et Raid
- ✅ Sélecteur de zones filtré via la logique de Baltimor :
  ```js
  Object.values(areas).filter(a => a.difficulty && a.drops && a.type !== 'dungeon')
  ```
- ✅ Zones groupées par type dans le `<optgroup>` (Event / Wild)
- ✅ Chaque zone affiche : nom + tier (Tier I/II/III/IV ou ×N) + valeur brute
- ✅ Affichage d'une info-box avec couleur du tier à la sélection
- ✅ Formule HP unifiée `calcHPFromDifficulty()` :
  - Tier IV (×600) → 1 302 000 HP
  - Tier III (×200) → 398 000 HP
  - Tier II (×70) → 139 300 HP
  - Tier I (×25) → 45 250 HP
  - Autre difficulté → `(100 + hpStars×30×(1+level×0.2)) × difficulty`
- ✅ Mode zone : défenseur = tout pokémon (pas de filtre boss), pas de buff cuisine (raid-only)
- ✅ Traductions FR et EN complètes pour toutes les nouvelles clés

**Nouvelles clés i18n** :
`zoneBattle`, `zoneBattleInfo`, `selectZone`, `zoneDifficultyLabel`, `zoneDiffValue`, `zoneType_event`, `zoneType_dungeon`, `zoneType_wild`, `dmgDamageLabel`, `dmgHitsToKO`, `dmgOneShot`

**Pistes pour la suite** :
- Pouvoir aussi sélectionner les donjons à clé (difficulty=5, type=dungeon) dans le mode Zone
- Ajouter un lien "Aller à la zone" depuis le résultat du calc
- Afficher le niveau recommandé de la zone sélectionnée

#### 🩹 Patch suivant — Filtrage par zone + vérif formule

- ✅ **Filtrage des pokémon par zone** : quand une zone est sélectionnée en mode Zone, le dropdown défenseur ne montre QUE les pokémon présents dans cette zone (sources : `spawns.common/uncommon/rare`, `bossPkmn`, `team.slot1/2/3...`).
- ✅ **Auto-sélection** : si la zone n'a qu'un seul pokémon (cas typique des events de type trainer comme Mega-Showdown), il est sélectionné automatiquement.
- ✅ **Vérification formule HP** : la formule actuelle est CONFIRMÉE identique à celle du jeu (`explore.js` ligne 566-574) :
  ```js
  wildPkmnHp = (100 + (hpStars * 30) * (1 + wildLevel * 0.2)) * hpMultiplier;
  // hpMultiplier = area.difficulty (sinon 2 par défaut pour wild)
  // PUIS override hardcodé pour les tiers raids :
  // tier1 (×25)→45 250, tier2 (×70)→139 300, tier3 (×200)→398 000, tier4 (×600)→1 302 000
  ```
- ✅ **Vérification stats** : la difficulté n'affecte **PAS** les stats Atk/Def/SpA/SpD/Spe du défenseur dans le jeu (cf. ligne 2515 d'`explore.js` : la formule de dégâts n'utilise que `defender.bst.def`/`sdef` brut). Notre calculateur fait pareil.
- ✅ **Bump APP_VERSION** : `3.5.3 → 3.6.0` pour forcer le refresh du cache navigateur (sinon les utilisateurs gardent l'ancien `i18n.js` et `damage-calc.js` qui ne connaissent pas le mode Zone).

#### 🩹 Patch 2 — Filtre du dropdown : exclure les raids et les wild

- ✅ Le filtre du dropdown Zone exclut maintenant les zones gérées par les autres modes :
  - `type !== 'wild'` (déjà couvert par le mode Wild)
  - `!a.trainer && !a.team` (raids / events trainer déjà couverts par le mode Raid)
- Restent : **donjons à clé** (`type=dungeon`, `difficulty=5`, ex: Glistering Cave, Sunken Temple) + **events de farm endgame** (Cerulean Cave, Primal Fissure, etc.)
- Tri : par difficulté puis par nom
- Le dropdown se reconstruit à chaque entrée en mode Zone (préserve la sélection si encore valide)

#### 🩹 Patch 3 — Vrai filtre anti-raid (les champs `trainer`/`team` ne sont pas dans `areas`)

**Découverte importante** : le `parsers.js` (ligne 763-793) stocke les champs `trainer` et `team` dans un objet **séparé** (`trainers`), pas dans `areas`. Donc filtrer `!a.trainer && !a.team` sur `areas` ne sert à RIEN — c'était toujours vrai.

**Vrai marqueur de raid dans `areas`** :
- `a.encounter === true` → tous les Mega-Showdown, Tier I/II/III/IV revivals (Great Tusk, Slither Wing, Brute Bonnet…)
- `a.bossPkmn` (truthy) → le parser a trouvé `slot1: pkmn.X` dans la zone → c'est un boss unique

**Filtre final** :
```js
a.difficulty && a.drops && a.type !== 'wild'
&& !a.encounter && !a.bossPkmn
&& a.spawns && (a.spawns.common.length || a.spawns.uncommon.length || a.spawns.rare.length)
```

Le check sur `spawns` garantit qu'il y a au moins un pokémon farmable (= zone de collecte légitime).

#### 🩹 Patch 4 — Inclusion des zones standard + exclusion explicite des dimensions

**Problèmes restants** :
1. Les zones de Mega Dimension (Palkia, Pikachu Gmax, Kyurem White, Mega Rayquaza) leakaient potentiellement (random pokemon, pas de spawns fixes).
2. Beaucoup de zones dungeon/event manquaient (sinnohUnderground, beginnerDojo, advancedDojo, expertDojo, victoryRoad, cosplayConvention, suspiciousManor, etc.) parce que mon filtre exigeait `a.difficulty` (truthy).

**Découverte** :
- 21 dungeons non-raid au total : 6 avec difficulté (Glistering/Sunken I/II/III ×5) + 15 sans (utilisent ×2 par défaut)
- 28 events non-raid au total : 6 avec difficulté (×5) + 22 sans (utilisent ×2 par défaut)

**Logique du jeu confirmée** (`explore.js` ligne 204 + 531) : `let hpMultiplier = 2; if (area.difficulty != undefined) hpMultiplier = area.difficulty;` → les zones sans difficulté utilisent ×2.

**Filtre final** :
```js
a.drops
&& (a.type === 'event' || a.type === 'dungeon')   // exclut wild, dimension, frontier
&& !a.encounter && !a.bossPkmn                     // exclut les raids
&& a.spawns avec ≥1 pokémon                       // garantit zone farmable
```

**Affichage dropdown** :
- Tier I/II/III/IV pour les difficultés tier
- "×N" pour les autres difficultés
- "Default ×2" pour les zones sans difficulté explicite
- Groupé par type : Dungeon puis Event
- Triés par difficulté effective (×2 d'abord)

**Helper unifié `getDifficultyTierInfo()`** retourne maintenant aussi `effective` (la valeur de multiplicateur réelle, soit difficulty soit 2). Utilisé partout pour cohérence.

#### 🩹 Patch 5 — Hash de partage complet pour le calculateur

**Problème** : 3 champs n'étaient pas inclus dans le hash de partage du calc :
- `dmg-zone-select` — la zone sélectionnée en mode Zone (mon nouveau feature)
- `dmg-atk-nature` — la nature de l'attaquant (v4.8)
- `dmg-field-effect` — l'effet de terrain (electric/misty/grassy terrain…)

Résultat : un partage de calc en mode Zone perdait la zone, ou un calc avec une nature Adamant la perdait.

**Encode** (dans `getTabFilterValues('damage')`) :
- `z` = zone key (uniquement si mode === 'zone')
- `n` = nature de l'attaquant
- `fe` = field effect

**Decode** (dans `loadDamageCalcFromURL()`) :
- **Zone** : pré-set `dmgCalcZoneKey` + `dmgCalcZoneDifficulty` AVANT `setDmgMode('zone')` pour que le filtre des défenseurs marche dès le départ. Puis restore la valeur du dropdown.
- **Nature** : appel ajouté à `updateNatureSelect('atk', pokemon)` lors du chargement de l'attaquant (sinon les options ne sont pas peuplées). Set la valeur AVANT `updateStatsDisplay` pour que la coloration des stats soit correcte dès le 1er rendu.
- **Field effect** : simple set de la valeur, pas de dépendance.

**Helper `formatZoneTierLabel()`** ajouté pour éviter la redondance "×5 ×5" dans le dropdown / HP bar / info-box. Détecte si le label commence déjà par "×" (= label custom) et n'ajoute pas de suffixe redondant. Utilisé partout pour cohérence.

#### 🩹 Patch 6 — Tri & édition des équipes sauvegardées en local

**Problème** : aucune façon de trier les équipes sauvegardées (toujours par date desc), pas d'édition possible (il fallait supprimer + refaire pour le moindre changement).

**Ajouts** :
1. **Tri** : nouvelle barre au-dessus de la liste avec un dropdown sortant (date asc/desc, nom A→Z / Z→A, auteur, nombre de pokémons). Le mode sélectionné est persisté en `localStorage` (`savedTeamsSortMode`).
2. **Édition métadonnées** : nouveau bouton `✏️` sur chaque card → 3 prompts pour modifier nom/auteur/description (sans toucher aux slots).
3. **Édition complète "in-place"** : quand on charge une équipe dans le builder, un nouveau **banner doré** apparaît avec son nom et 2 boutons :
   - `💾 Enregistrer les modifications` → écrase l'ancienne (préserve id/created/name/author/description, ajoute `updated`)
   - `✖ Annuler` → quitte l'édition sans sauvegarder
4. Le bouton `💾 Sauvegarder` original reste : il crée une **NOUVELLE** équipe (et clear l'édition en cours pour éviter la confusion).
5. Card highlightée en doré + badge `✏️ édition` si elle est en cours d'édition.
6. Date "mise à jour" affichée si `team.updated` existe.

**Code** :
- Nouveaux globals : `currentEditingTeamId`, `savedTeamsSortMode`
- Nouvelles fonctions : `setSavedTeamsSort`, `renderEditingBanner`, `cancelEditing`, `updateEditedTeam`, `editTeamMetadata`
- Map `SAVED_TEAMS_SORTS` avec 6 fonctions de comparaison
- Hook dans `loadTeamIntoBuilder` pour activer l'édition
- Hook dans `saveCurrentTeam` pour clear l'édition (puisque ça crée une nouvelle équipe)

**i18n** : 16 nouvelles clés FR + EN (`editingTeam`, `saveChanges`, `cancelEdit`, `editMetadata`, `editing`, `updated`, `teams`, `sortDateNewest/Oldest`, `sortNameAZ/ZA`, `sortAuthor`, `sortMostPkmn`, `noTeamBeingEdited`, `teamNotFound`, `teamUpdatedSuccess`).

**Compatibilité** : 100% backward-compatible. Les anciennes équipes (sans `updated`) s'affichent normalement, le sort par défaut reste `date_desc`.

#### 🩹 Patch 7 — Recherche + réordonnancement manuel des équipes locales

**Ajouts** :
1. **Textbox de recherche** dans la sortbar : filtre les équipes par nom / auteur / description (case-insensitive). Persiste le focus + caret pendant la frappe (re-render n'interrompt pas la saisie).
2. **Boutons ▲▼** sur chaque card pour réordonner manuellement.
3. **Mode de tri "Manuel"** : ajouté en première option du dropdown. Auto-activé dès le premier clic sur ▲ ou ▼ (snapshot l'ordre courant comme nouveau baseline manuel pour que le changement soit intuitif).
4. Filtre respecté pour les ▲▼ : permet de chercher "fire" puis réordonner uniquement les équipes Fire entre elles.
5. Boutons ▲ et ▼ grayed out aux extrémités de la liste visible.
6. Message "🔍 Aucune équipe ne correspond" si filtre actif sans résultat.

**Code** :
- Nouveaux globals : `savedTeamsFilter`
- Nouvelles fonctions : `setSavedTeamsFilter`, `passesSavedTeamsFilter`, `moveSavedTeam(teamId, direction)`
- Nouvelle entrée dans `SAVED_TEAMS_SORTS` : `manual: () => 0` (préserve l'ordre du storage)
- `loadSavedTeams` : restauration du focus/caret après re-render pour ne pas perdre la frappe utilisateur

**Bug fix initial** : conflit de nom entre `currentEditingTeamId` (existant pour les featured teams) et ma nouvelle variable. Renommée en `currentEditingLocalTeamId` pour éviter la collision (qui empêchait tout le fichier de se charger → erreur "switchTeamSubtab is not defined").

**i18n** : 5 nouvelles clés FR + EN (`sortManual`, `searchTeam`, `noMatchingTeams`, `moveUp`, `moveDown`).

#### 🩹 Patch 8 — Retrait du "(Défaut ×2)" verbeux

Baltimor a confirmé : ×2 est le multiplicateur **par défaut partout** dans le jeu. Afficher "Default ×2" à côté de 37 zones sur 49 est donc juste du bruit visuel.

**Changements** :
- `formatZoneTierLabel()` retourne maintenant `''` pour les zones sans difficulté explicite (au lieu de "Default ×2")
- Dropdown : option = juste le nom de la zone (pas de "—" trainant)
- Info-box : masquée complètement pour les zones sans difficulté explicite (rien à informer, c'est le défaut du jeu)
- HP bar : `difficultyDisplay` vide → pas de suffixe

Résultat : dropdown lisible, seules les zones spéciales (×5, Tier I-IV) affichent leur multiplicateur distinctif.

---

### 🗓️ 2026-04-18 — Grand chantier : nettoyage / thèmes / mobile / push

**Demandes** : nettoyer, réduire la complexité, mutualiser les duplications, vérifier le parsing, améliorer thèmes (sauf mega-dim), refonte mobile.

#### 🧹 Nettoyage & consolidation
- ✅ **Helpers `teamsDB`** : 18 call-sites (`JSON.parse(localStorage.getItem('teamsDB') || '[]')` / `localStorage.setItem('teamsDB', JSON.stringify(...))`) réduits à des appels `getSavedTeams()` / `setSavedTeams(...)` / `findSavedTeam(id)`.
- ✅ Suppression de **`savezone.js.debug`** (115 KB de logs inutiles)
- ✅ Suppression de **`exchange/api.php.backup.20250409`**
- ✅ Strings FR hardcodées restantes : corrigées avec i18n (prompts `saveCurrentTeam`, alert `deleteOwnTeam`, label `Difficulté` dans `getPokemonDifficultyTier`)
- ✅ Nouvelles clés i18n FR+EN : `defaultTeamName`, `defaultTeamAuthor`, `deleteOwnTeamOnly`, `yourNickname`, `teamAuthorLabel`

#### 📦 Parsing du jeu — audit complet
Les 6 fichiers essentiels du jeu sont **tous parsés** :
| Fichier | Usage | Statut |
|---------|-------|--------|
| `moveDictionary.js` | Attaques | ✅ |
| `pkmnDictionary.js` | Pokémon | ✅ |
| `itemDictionary.js` | Items + décors (parseDecor) | ✅ |
| `areasDictionary.js` | Zones | ✅ |
| `shop.js` | Boutique | ✅ |
| `explore.js` | Constantes, events, egg moves | ✅ |

Fichiers **non-parsés mais non-critiques** :
- `teams.js` (1323 lignes) : teams hardcodées de démonstration du jeu — candidate pour futur feature "templates"
- `teamPreviews.js` (139 lignes) : config d'affichage des previews
- `dictionarySearch.js` (438 lignes) : alias de recherche
- `decor.js` (192 lignes) : UI du décor (pas de données)
- `script.js`, `save.js`, `tooltip.js`, `fuse.js`, `HackTimer.js` : code UI/libs (rien à parser)

#### 🎨 Polish des thèmes (sauf mega-dimension, qui gère déjà)

Bloc ajouté à la fin de `style.css` :

**Défaut** :
- Fond radial gradient (plus de profondeur)
- Shadows + gradients subtils sur cards/boutons
- Scrollbar custom avec gradient sur hover
- Hover tabs / boutons avec légère translation + glow

**Halloween** :
- Radial gradient orange brûlé en fond
- Text-shadow orange sur les titres
- Scrollbar orange flamme
- Shadows orangées sur cards/boutons
- Glow plus intense au hover

**PokeChill (game)** :
- Shadows flat pixel-art (style authentique du jeu)
- Boutons qui "s'enfoncent" au clic (translate +1px + shadow réduite)
- Scrollbar façon pixel-art (tan/cream)
- Outline `accent` sur hover des cards

#### 📱 Refonte mobile

Bloc ajouté à la fin de `mobile.css` (+195 lignes) :

- **Safe-area iOS** (notch) : padding `env(safe-area-inset-*)` partout où ça compte
- **Plus de hover** : annule les `transform/box-shadow/filter` au hover (évitait les flickers)
- **Touch targets 44px min** sur tous les éléments cliquables (boutons, tabs, selects, inputs)
- **Tabs** : `scroll-snap-type`, indicateur actif en bottom inset shadow
- **Cards** : padding plus serré, border-radius plus doux, whole-card tap area
- **Grid résultats** : 1 colonne sur mobile, gap généreux
- **Modals = bottom-sheet** : plein écran avec border-radius haut, animation slide-up
- **Damage calc** : boutons de mode en 2 lignes propres
- **Team slots** : 2 colonnes au lieu de 3 sur téléphone (plus lisible)
- **Sortbar équipes** : wrap avec search input pleine largeur en dessous
- **Notifications** : toast bas-droite respectant safe-area
- **Scrollbars masquées** sur mobile
- **Très petits écrans (≤380px)** : layout encore plus compact

#### 🚀 Bump version

`APP_VERSION: 3.6.0 → 3.7.0` pour forcer le refresh sur tous les clients (nouveau CSS + JS mutualisé).

---

### 🗓️ 2026-04-18 — Analyse initiale du projet

**Contexte** : Première analyse complète du projet pour établir ce fichier de contexte.

**Ce qui a été fait** :
- ✅ Lecture complète de la structure du projet (www/, exchange/)
- ✅ Analyse du README.md et REFACTORING.md
- ✅ Inventaire des 24 modules JS et leur rôle
- ✅ Compréhension du système de données (parsers, rotations)
- ✅ Compréhension du backend PHP (Cable Link / Exchange)
- ✅ Identification des thèmes, features, constantes du jeu
- ✅ Création de ce fichier CONTEXT.md

**Observations notables** :
- `savezone.js` est le module le plus gros (181 KB) — potentiel candidat à un futur split
- `index.html` fait encore ~510 KB (beaucoup de CSS inline pour les thèmes)
- Le `manifest.json` des teams fait 459 KB — à surveiller pour les performances
- Pas de bundler/framework : tout est vanilla, ce qui est intentionnel pour la simplicité du déploiement

**Prochaines pistes possibles** :
- Identifier des bugs ou demandes spécifiques de l'utilisateur
- Optimiser le `manifest.json` si le chargement devient lent
- Continuer à externaliser le CSS inline de `index.html` dans `style.css`

---

> _Ce fichier est maintenu manuellement. Chaque session de travail doit ajouter une entrée dans le **Journal des Avancées**._
