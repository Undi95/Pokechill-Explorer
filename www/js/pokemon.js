// ============ POKEMON ============
function searchPokemon() {
    const se = document.getElementById('pokemon-search').value.toLowerCase();
    const ty = document.getElementById('pokemon-type').value;
    const ty2 = document.getElementById('pokemon-type2').value;
    const div = document.getElementById('pokemon-div').value;
    const obt = document.getElementById('pokemon-obt').value;
    const season = document.getElementById('pokemon-season').value;
    const eggMove = document.getElementById('pokemon-eggmove')?.checked || false;
    
    // Update URL hash
    updateURLHash('pokemon', { search: se, type: ty, type2: ty2, div, obt, season, egg: eggMove ? '1' : '' });
    
    // Pre-compute which Pokemon appear in which seasonal areas for efficient filtering
    // AND which Pokemon appear in non-seasonal areas (to exclude non-exclusives)
    const pokemonSeasons = {};
    const pokemonInOtherAreas = new Set();
    if (season) {
        Object.values(areas).forEach(a => {
            const allSpawns = [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare];
            // Also include boss Pokemon and rewards for seasonal areas
            if (a.bossPkmn) allSpawns.push(a.bossPkmn);
            if (a.rewards && a.rewards.pokemon) {
                a.rewards.pokemon.forEach(pkmnName => {
                    if (!allSpawns.includes(pkmnName)) allSpawns.push(pkmnName);
                });
            }
            
            if (a.type === 'season' && a.season === season && !a.uncatchable) {
                // Pokemon in the selected seasonal areas
                allSpawns.forEach(pkmnName => {
                    if (!pokemonSeasons[pkmnName]) pokemonSeasons[pkmnName] = new Set();
                    pokemonSeasons[pkmnName].add(a.season);
                });
            } else if (a.type !== 'season' && !a.uncatchable && a.type !== 'dungeon') {
                // Pokemon in non-seasonal catchable areas (wild, event, etc.)
                // Dungeon is excluded because Pokemon there are not catchable
                allSpawns.forEach(pkmnName => {
                    pokemonInOtherAreas.add(pkmnName);
                });
            }
        });
    }
    
    const res = Object.values(pokemons).filter(p => {
        if (se && !p.searchText.includes(se)) return false;
        if (ty && !p.types.includes(ty)) return false;
        if (ty2 && !p.types.includes(ty2)) return false;
        if (div && p.division !== div) return false;
        // Filter by obtainability - special case for 'secret' to include both secret and hidden Pokemon
        if (obt) {
            if (obt === 'secret') {
                if (!p.isSecret && !p.hidden) return false;
            } else if (obt === 'available') {
                // Filter out unobtainable Pokemon (inverse of unobtainable)
                if (p.obtainedIn === 'unobtainable') return false;
            } else if (p.obtainedIn !== obt) {
                return false;
            }
        }
        // Season filter: Pokemon must be EXCLUSIVE to the selected season
        // (appear in seasonal areas of this season AND don't appear elsewhere)
        if (season) {
            // Must appear in the selected seasonal area
            if (!pokemonSeasons[p.name]) return false;
            // Must NOT appear in any other catchable area (wild, event, etc.)
            if (pokemonInOtherAreas.has(p.name)) return false;
        }
        // Egg Move filter: only show Pokemon with a valid egg move
        if (eggMove && (!p.eggMove || !moves[p.eggMove])) return false;
        return true;
    }).sort((a,b) => a.name.localeCompare(b.name));
    renderPokemonGrid(res, 'pokemon-results');
}

// Helper function to get season info for a Pokemon based on where it spawns
// Returns the season ONLY if the Pokemon is EXCLUSIVE to that season (not found elsewhere)
function getPokemonSeason(pkmnName) {
    const seasons = new Set();
    const otherAreas = new Set();
    
    Object.values(areas).forEach(a => {
        const allSpawns = [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare];
        if (!allSpawns.includes(pkmnName)) return;
        
        if (a.type === 'season' && !a.uncatchable) {
            seasons.add(a.season);
        } else if (a.type !== 'dungeon' && !a.uncatchable) {
            // Found in non-seasonal catchable area
            otherAreas.add(a.type);
        }
    });
    
    // Only return season if:
    // 1. Pokemon is found in exactly ONE season
    // 2. Pokemon is NOT found in any other catchable area (wild, event, etc.)
    if (seasons.size === 1 && otherAreas.size === 0) {
        return [...seasons][0];
    }
    return null;
}

// Get emoji for a season
function getSeasonEmoji(season) {
    const emojis = {
        halloween: '🎃',
        christmas: '🎄',
        easter: '🥚',
        summer: '☀️',
        spring: '🌸',
        autumn: '🍂'
    };
    return emojis[season] || '🎉';
}

function renderPokemonCard(p, clickAction = 'details') {
    const b = p.bst;
    const onclick = clickAction === 'details' ? `showPokemonDetails('${p.name}')` : 
                   clickAction === 'team' ? `addToTeam('${p.name}')` : 
                   `addToCompare('${p.name}')`;
    const haDisplay = p.hiddenAbility && abilities[p.hiddenAbility] ? abilities[p.hiddenAbility].displayName : p.hiddenAbility;
    // Check if signature is actually a move (not an ability - game data bug fix)
    const isSignatureMove = p.signature && moves[p.signature] && !abilities[p.signature];
    const sigDisplay = isSignatureMove ? moves[p.signature].displayName : '';
    
    // Check if Pokemon is exclusive to a specific season
    // Use p.season if directly set (from seasonal area parsing), otherwise compute from zones
    const pkmnSeason = p.season || getPokemonSeason(p.name);
    const seasonBadge = pkmnSeason ? `<span style="padding:2px 6px;background:rgba(255,102,0,0.2);color:var(--accent-orange);border:1px solid rgba(255,102,0,0.4);border-radius:4px;font-size:0.7rem" title="${t('seasonalArea') || 'Seasonal Area'} - ${t(pkmnSeason) || pkmnSeason}">${getSeasonEmoji(pkmnSeason)} ${t(pkmnSeason) || pkmnSeason}</span>` : '';
    
    // Check if Halloween Pokemon is currently available
    // Pokemon with season='halloween' are only available during October
    const isHalloweenPokemon = p.season === 'halloween';
    const halloweenAvailable = isHalloweenPokemon && isHalloweenActive();
    const halloweenUnavailable = isHalloweenPokemon && !isHalloweenActive();
    
    // Check if this Mega has its stone available (use evolveMethod for exact match)
    let megaStoneIcon = '';
    if (p.name.startsWith('mega') && !p.noMegaStone) {
        const method = evolutionRelations.evolveMethod[p.name];
        if (method?.type === 'item') {
            megaStoneIcon = `<span title="Mega Stone disponible en Event" style="font-size:0.8rem">💎</span>`;
        }
    }
    
    // For evolve-only Pokemon, create a clickable badge with pre-evo sprite
    let obtainBadgeHtml = obtainBadge(p.obtainedIn);
    
    // Override for Halloween Pokemon when not in Halloween season - show as unavailable
    if (halloweenUnavailable) {
        obtainBadgeHtml = obtainBadge('unobtainable');
    }
    
    if (p.obtainedIn === 'evolve' && !halloweenUnavailable) {
        const preEvo = evolutionRelations.evolvesFrom[p.name];
        if (preEvo && pokemons[preEvo]) {
            obtainBadgeHtml = `<span class="obtain-badge" style="background:#A8A87820;color:#A8A878;border:1px solid #A8A87840;padding:2px 6px;border-radius:4px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;gap:3px" title="Evolve from ${format(preEvo)}" onclick="event.stopPropagation();showPokemonDetails('${preEvo}')">${megaStoneIcon}🔄 <img src="${sprite(preEvo)}" style="width:16px;height:16px;image-rendering:pixelated"></span>`;
        }
    }
    
    // Event form badge - only show if not exclusive to a season (season badge takes precedence)
    const eventFormBadge = (p.isEventForm && !pkmnSeason && !p.season) ? `<span style="padding:2px 6px;background:rgba(255,136,0,0.2);color:var(--accent-orange);border:1px solid rgba(255,136,0,0.4);border-radius:4px;font-size:0.7rem" title="${t('eventForm') || 'Event Form'}">🎃 ${t('event') || 'Event'}</span>` : '';
    
    // Unavailable badge for Halloween Pokemon outside of October
    const unavailableBadge = halloweenUnavailable ? `<span style="padding:2px 6px;background:rgba(255,68,68,0.2);color:var(--accent-red);border:1px solid rgba(255,68,68,0.4);border-radius:4px;font-size:0.7rem" title="${t('seasonalUnavailable') || 'Currently unavailable - returns next Halloween'}">❌ ${t('unavailable') || 'Unavailable'}</span>` : '';
    
    return `<div class="card" onclick="${onclick}">
        <div class="card-header">
            <div class="card-title-row">
                <img class="pkmn-sprite" src="${sprite(p.name)}" onerror="this.style.display='none'">
                <span class="card-name">${p.displayName || format(p.name)}</span>
            </div>
            <div style="display:flex;gap:4px;align-items:center">${obtainBadgeHtml} ${eventFormBadge} ${seasonBadge} ${unavailableBadge} ${divBadge(p.division)}</div>
        </div>
        <div class="type-badges">${p.types.map(t => typeBadge(t)).join('')}</div>
        <div class="stats-row">
            <div class="stat-mini"><div class="stat-mini-name">HP</div><div class="stat-mini-value">${b.hp}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.hp))}</div></div>
            <div class="stat-mini"><div class="stat-mini-name">ATK</div><div class="stat-mini-value">${b.atk}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.atk))}</div></div>
            <div class="stat-mini"><div class="stat-mini-name">DEF</div><div class="stat-mini-value">${b.def}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.def))}</div></div>
            <div class="stat-mini"><div class="stat-mini-name">SATK</div><div class="stat-mini-value">${b.satk}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.satk))}</div></div>
            <div class="stat-mini"><div class="stat-mini-name">SDEF</div><div class="stat-mini-value">${b.sdef}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.sdef))}</div></div>
            <div class="stat-mini"><div class="stat-mini-name">SPE</div><div class="stat-mini-value">${b.spe}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.spe))}</div></div>
        </div>
        ${p.hiddenAbility ? `<div class="ha-badge"><span class="ha-label">${t('hiddenAbility')}:</span> ${haDisplay}</div>` : ''}
        ${isSignatureMove ? `<div class="sig-badge"><span class="sig-label">${t('signatureMove')}:</span> ${sigDisplay}</div>` : ''}
        ${p.lore ? `<div style="margin-top:6px;padding:8px;background:rgba(100,100,255,0.08);border:1px solid rgba(100,100,255,0.2);border-radius:6px;font-size:0.8rem;font-style:italic;color:var(--text-dim);line-height:1.4">📜 ${p.lore}</div>` : ''}
        <p class="click-hint">${clickAction === 'details' ? t('clickDetails') : t('clickAdd')}</p>
    </div>`;
}

const BATCH_SIZE = 50; // Number of cards to load at once
let currentListData = {}; // Store list data for lazy loading

function renderPokemonGrid(list, containerId, clickAction = 'details') {
    const c = document.getElementById(containerId);
    if (list.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    
    // Store data for lazy loading
    currentListData[containerId] = { list, clickAction, loaded: BATCH_SIZE };
    
    const initial = list.slice(0, BATCH_SIZE);
    const remaining = list.length - BATCH_SIZE;
    
    let html = `<div class="results-info">${list.length} ${t('results')}</div>
        <div class="results-grid" id="${containerId}-grid">${initial.map(p => renderPokemonCard(p, clickAction)).join('')}</div>`;
    
    if (remaining > 0) {
        html += `<div style="text-align:center;margin-top:15px">
            <button class="btn" onclick="loadMorePokemon('${containerId}')" id="${containerId}-loadmore">
                ➕ ${t('loadMore')} (${remaining} ${t('remaining')})
            </button>
        </div>`;
    }
    c.innerHTML = html;
}

function loadMorePokemon(containerId) {
    const data = currentListData[containerId];
    if (!data) return;
    
    const grid = document.getElementById(`${containerId}-grid`);
    const btn = document.getElementById(`${containerId}-loadmore`);
    
    const nextBatch = data.list.slice(data.loaded, data.loaded + BATCH_SIZE);
    data.loaded += BATCH_SIZE;
    
    nextBatch.forEach(p => {
        grid.insertAdjacentHTML('beforeend', renderPokemonCard(p, data.clickAction));
    });
    
    const remaining = data.list.length - data.loaded;
    if (remaining <= 0) {
        btn.parentElement.remove();
    } else {
        btn.innerHTML = `➕ ${t('loadMore')} (${remaining} ${t('remaining')})`;
    }
}


function setDreamAbility(slot, abilityName) {
    dreamTeam[slot].ability = abilityName || null;
    updateTeamURL();
}

function setDreamItem(slot, itemName) {
    dreamTeam[slot].item = itemName || null;
    renderDreamTeam();
    updateTeamURL();
}

function toggleDreamShiny(slot, isShiny) {
    dreamTeam[slot].shiny = isShiny;
    // Reset star sign if disabling shiny
    if (!isShiny) {
        dreamTeam[slot].starSign = null;
    }
    renderDreamTeam();
    updateTeamURL();
}

function setDreamStarSign(slot, starSign) {
    dreamTeam[slot].starSign = starSign || null;
    renderDreamTeam();
    updateTeamURL();
}

function setDreamNature(slot, natureName) {
    // Check if nature is available for this Pokemon
    if (natureName && dreamTeam[slot].pokemon) {
        const pkmnData = pokemons[dreamTeam[slot].pokemon];
        if (!isNatureAvailable(pkmnData, natureName)) {
            // Nature not available, reset to null
            dreamTeam[slot].nature = null;
            renderDreamTeam();
            updateTeamURL();
            return;
        }
    }
    dreamTeam[slot].nature = natureName || null;
    renderDreamTeam();
    updateTeamURL();
}

function setDreamIV(slot, stat, value) {
    if (!dreamTeam[slot].ivs) {
        dreamTeam[slot].ivs = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
    }
    dreamTeam[slot].ivs[stat] = Math.min(6, Math.max(0, parseInt(value) || 0));
    renderDreamTeam();
    updateTeamURL();
}

function cycleDreamIV(slot, stat) {
    if (!dreamTeam[slot].ivs) {
        dreamTeam[slot].ivs = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
    }
    const current = dreamTeam[slot].ivs[stat] || 0;
    dreamTeam[slot].ivs[stat] = current >= 6 ? 0 : current + 1;
    renderDreamTeam();
    updateTeamURL();
}

function cycleBuildIV(stat) {
    if (!buildSlot[0].ivs) {
        buildSlot[0].ivs = { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 };
    }
    const current = buildSlot[0].ivs[stat] || 0;
    buildSlot[0].ivs[stat] = current >= 6 ? 0 : current + 1;
    renderBuildSlot();
    updateBuildURL();
}

function removeDreamSlot(slot) {
    dreamTeam[slot] = { pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null };
    renderDreamTeam();
    updateTeamURL();
}

function addToTeam(name) {
    let slot = window.pendingTeamSlot !== undefined ? window.pendingTeamSlot : dreamTeam.findIndex(s => !s.pokemon);
    if (slot === -1) { alert(t('teamFull')); return; }
    dreamTeam[slot] = { pokemon: name, moves: [null, null, null, null], ability: null, item: null, shiny: false };
    window.pendingTeamSlot = undefined;
    renderDreamTeam();
    updateTeamURL();
}

function updateTeamURL() {
    const filters = getTabFilterValues('team');
    updateURLHash('team', filters);
}

// Ultra-compact future-proof team encoding
// Uses short codes mapped to indices, then packed into base64
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const TEAM_CODE_VERSION = 'B'; // Version B = current stable table ordering

// Build lookup tables once - STABLE ORDERING (ne change pas quand on ajoute du contenu)
// On utilise l'ordre alphabétique des IDs qui est déterministe
let stableTablesCache = null;
function buildStableTables() {
    if (stableTablesCache) return stableTablesCache;
    
    const tables = { pokemon: {}, move: {}, ability: {}, item: {} };
    const reverse = { pokemon: [], move: [], ability: [], item: [] };
    
    // Ordonner par ID (nom interne) de manière alphabétique - stable dans le temps
    Object.keys(pokemons).sort().forEach((name, i) => { 
        tables.pokemon[name] = i; 
        reverse.pokemon[i] = name; 
    });
    Object.keys(moves).sort().forEach((name, i) => { 
        tables.move[name] = i; 
        reverse.move[i] = name; 
    });
    Object.keys(abilities).sort().forEach((name, i) => { 
        tables.ability[name] = i; 
        reverse.ability[i] = name; 
    });
    Object.keys(items).sort().forEach((name, i) => { 
        tables.item[name] = i; 
        reverse.item[i] = name; 
    });
    
    tables._reverse = reverse;
    tables._version = TEAM_CODE_VERSION;
    tables._checksum = computeTableChecksum(tables);
    stableTablesCache = tables;
    return tables;
}

// Computed checksum for table validation
function computeTableChecksum(tables) {
    // Simple checksum based on table sizes
    return `${Object.keys(tables.pokemon).length}-${Object.keys(tables.move).length}-${Object.keys(tables.ability).length}-${Object.keys(tables.item).length}`;
}

// Backward compatibility - use old method for legacy codes
function buildLegacyTables() {
    const tables = { pokemon: {}, move: {}, ability: {}, item: {} };
    const reverse = { pokemon: [], move: [], ability: [], item: [] };
    
    Object.keys(pokemons).sort().forEach((name, i) => { tables.pokemon[name] = i; reverse.pokemon[i] = name; });
    Object.keys(moves).sort().forEach((name, i) => { tables.move[name] = i; reverse.move[i] = name; });
    Object.keys(abilities).sort().forEach((name, i) => { tables.ability[name] = i; reverse.ability[i] = name; });
    Object.keys(items).sort().forEach((name, i) => { tables.item[name] = i; reverse.item[i] = name; });
    
    tables._reverse = reverse;
    return tables;
}

// Build lookup tables once (legacy alias)
function buildShortCodeTables() {
    return buildStableTables();
}

// Fixed-width 2-char base64 encoding (max value 4095)
function encode2(n) {
    n = n || 0;
    return B64_CHARS[Math.floor(n / 64)] + B64_CHARS[n % 64];
}

// Fixed-width 2-char base64 decoding
function decode2(s, i) {
    return B64_CHARS.indexOf(s[i]) * 64 + B64_CHARS.indexOf(s[i + 1]);
}

// Pack team: each slot = 14 chars fixed [pkmn+shiny(2), ability(2), item(2), move1-4(8)]
// Format: [VERSION_CHAR][14*n chars]
function packTeam(teamData) {
    let packed = TEAM_CODE_VERSION; // Version prefix
    teamData.forEach(slot => {
        if (!slot) return;
        // slot: [pkmnIdx, shiny, abilityIdx, itemIdx, move1..move4]
        packed += encode2(slot[0] * 2 + (slot[1] ? 1 : 0)); // pokemon + shiny in LSB
        packed += encode2(slot[2]);  // ability
        packed += encode2(slot[3]);  // item
        packed += encode2(slot[4]); packed += encode2(slot[5]); // move 1, 2
        packed += encode2(slot[6]); packed += encode2(slot[7]); // move 3, 4
    });
    return packed;
}

function migrateTeamCode(legacyCode) {
    // Convert legacy team code (version A) to new format (version B)
    // Returns null if migration fails
    try {
        // Decode with legacy tables
        const legacyTables = buildLegacyTables();
        const stableTables = buildStableTables();
        
        const legacyData = [];
        for (let i = 0; i + 13 < legacyCode.length && legacyData.length < 6; i += 14) {
            const pkmnShiny = decode2(legacyCode, i);
            const pkmnIdx = Math.floor(pkmnShiny / 2);
            const shiny = pkmnShiny % 2;
            legacyData.push([
                pkmnIdx, shiny,
                decode2(legacyCode, i + 2),   // ability
                decode2(legacyCode, i + 4),   // item
                decode2(legacyCode, i + 6),   // move1
                decode2(legacyCode, i + 8),   // move2
                decode2(legacyCode, i + 10),  // move3
                decode2(legacyCode, i + 12)   // move4
            ]);
        }
        
        // Convert legacy indices to names, then to stable indices
        const stableData = legacyData.map(slot => {
            if (!slot || slot[0] === 0) return [0, 0, 0, 0, 0, 0, 0, 0];
            
            const pkmnName = legacyTables._reverse.pokemon[slot[0]];
            const abilityName = legacyTables._reverse.ability[slot[2]];
            const itemName = legacyTables._reverse.item[slot[3]];
            const moveNames = [
                legacyTables._reverse.move[slot[4]],
                legacyTables._reverse.move[slot[5]],
                legacyTables._reverse.move[slot[6]],
                legacyTables._reverse.move[slot[7]]
            ];
            
            // Check if all exist in stable tables
            if (!pkmnName || !stableTables.pokemon.hasOwnProperty(pkmnName)) {
                throw new Error(`Pokemon ${pkmnName} not found in stable tables`);
            }
            
            return [
                stableTables.pokemon[pkmnName] || 0,
                slot[1], // shiny
                abilityName ? (stableTables.ability[abilityName] || 0) : 0,
                itemName ? (stableTables.item[itemName] || 0) : 0,
                moveNames[0] ? (stableTables.move[moveNames[0]] || 0) : 0,
                moveNames[1] ? (stableTables.move[moveNames[1]] || 0) : 0,
                moveNames[2] ? (stableTables.move[moveNames[2]] || 0) : 0,
                moveNames[3] ? (stableTables.move[moveNames[3]] || 0) : 0
            ];
        });
        
        // Pack with new format (version B prefix)
        return packTeam(stableData);
    } catch (err) {
        console.error('Migration failed for code:', legacyCode, err);
        return null;
    }
}

function unpackTeam(packed) {
    const team = [];
    
    // Check for version prefix
    let version = 'A'; // Default legacy version
    let startIdx = 0;
    
    if (packed.length > 0 && !B64_CHARS.includes(packed[0]) && packed[0] >= 'A' && packed[0] <= 'Z') {
        // New format with version prefix
        version = packed[0];
        startIdx = 1;
    }
    
    // Get appropriate tables for this version
    const tables = (version === TEAM_CODE_VERSION) ? buildStableTables() : buildLegacyTables();
    
    // Each slot = 14 chars fixed
    for (let i = startIdx; i + 13 < packed.length && team.length < 6; i += 14) {
        const pkmnShiny = decode2(packed, i);
        const pkmnIdx = Math.floor(pkmnShiny / 2);
        const shiny = pkmnShiny % 2;
        team.push([
            pkmnIdx, shiny,
            decode2(packed, i + 2),   // ability
            decode2(packed, i + 4),   // item
            decode2(packed, i + 6),   // move1
            decode2(packed, i + 8),   // move2
            decode2(packed, i + 10),  // move3
            decode2(packed, i + 12)   // move4
        ]);
    }
    return team;
}

function addTeamPokemon() {
    const input = document.getElementById('team-search');
    const val = input.value.trim();
    if (!val) return;
    // Try direct internal name first
    let name = pokemons[val] ? val : null;
    // Then try matching by display name
    if (!name) {
        const lower = val.toLowerCase();
        name = Object.keys(pokemons).find(k => (pokemons[k].displayName || format(k)).toLowerCase() === lower);
    }
    if (!name) return;
    addToTeam(name);
    input.value = '';
}

function filterTeamDropdown(mode) {
    const type = document.getElementById((mode || 'team') + '-type').value;
    const datalist = document.getElementById((mode || 'team') + '-search-list');
    if (!datalist) return;

    let filtered = Object.values(pokemons).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    if (type) filtered = filtered.filter(p => p.types.includes(type));

    datalist.innerHTML = filtered.map(p => `<option value="${p.displayName || format(p.name)}" data-name="${p.name}">`).join('');
}

function clearDreamTeam() {
    dreamTeam = Array(6).fill(null).map(() => ({ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } }));
    renderDreamTeam();
    updateTeamURL();
}

// Toggle temporary decor display (for screenshots only, not saved)

function getPokemonDecor(pokemonName) {
    if (!pokemonName || !pokemons[pokemonName]) return null;
    const p = pokemons[pokemonName];
    return p.decor || null;
}

function searchTeamPokemon(){
    const se = document.getElementById('team-search').value.toLowerCase();
    const ty = document.getElementById('team-type').value;
    const res = Object.values(pokemons).filter(p => {
        if (se && !p.name.toLowerCase().includes(se)) return false;
        if (ty && !p.types.includes(ty)) return false;
        return true;
    }).sort((a,b) => b.stars - a.stars);
    renderPokemonGrid(res, 'team-results', 'team');
}