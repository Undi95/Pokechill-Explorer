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
