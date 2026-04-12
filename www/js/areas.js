// ============ AREAS ============
function initAreaItems() {
    const wildItems = new Set();
    const dungeonItems = new Set();
    const eventItems = new Set();
    
    Object.values(areas).forEach(a => {
        const allDrops = [...a.drops.common, ...a.drops.uncommon, ...a.drops.rare];
        if (a.type === 'wild') allDrops.forEach(i => wildItems.add(i));
        else if (a.type === 'dungeon') allDrops.forEach(i => dungeonItems.add(i));
        else if (a.type === 'event') allDrops.forEach(i => eventItems.add(i));
    });
    
    // Wild area items dropdown
    const select = document.getElementById('area-item');
    if (select) {
        const sorted = [...wildItems].sort((a, b) => a.localeCompare(b));
        sorted.forEach(item => {
            const displayName = items[item]?.displayName || format(item);
            select.innerHTML += `<option value="${item}">${displayName}</option>`;
        });
    }
    
    // Dungeon items dropdown
    const dungeonSelect = document.getElementById('dungeon-item');
    if (dungeonSelect) {
        const sortedDungeon = [...dungeonItems].sort((a, b) => a.localeCompare(b));
        sortedDungeon.forEach(item => {
            const displayName = items[item]?.displayName || format(item);
            dungeonSelect.innerHTML += `<option value="${item}">${displayName}</option>`;
        });
    }
    
    // Event items dropdown
    const eventSelect = document.getElementById('event-item');
    if (eventSelect) {
        const sortedEvent = [...eventItems].sort((a, b) => a.localeCompare(b));
        sortedEvent.forEach(item => {
            const displayName = items[item]?.displayName || format(item);
            eventSelect.innerHTML += `<option value="${item}">${displayName}</option>`;
        });
    }
}

function toggleZoneSearchMode(prefix, forceTo) {
    const toggle = document.getElementById(prefix + '-toggle');
    const pkmnFields = document.getElementById(prefix + '-pkmn-fields');
    const zoneFields = document.getElementById(prefix + '-zone-fields');
    const labelPkmn = document.getElementById(prefix + '-mode-pkmn');
    const labelZone = document.getElementById(prefix + '-mode-zone');
    
    const isCurrentlyZone = toggle.classList.contains('right');
    const toZone = forceTo ? forceTo === 'zone' : !isCurrentlyZone;
    
    if (toZone) {
        toggle.classList.add('right');
        pkmnFields.style.display = 'none';
        zoneFields.style.display = '';
        labelPkmn.classList.remove('active');
        labelZone.classList.add('active');
    } else {
        toggle.classList.remove('right');
        pkmnFields.style.display = '';
        zoneFields.style.display = 'none';
        labelPkmn.classList.add('active');
        labelZone.classList.remove('active');
    }
}

function getZoneSearchMode(prefix) {
    return document.getElementById(prefix + '-toggle')?.classList.contains('right') ? 'zone' : 'pkmn';
}

function searchAreas() {
    const mode = getZoneSearchMode('area');
    const pkmn = mode === 'pkmn' ? document.getElementById('area-pokemon').value.toLowerCase() : '';
    const type1 = mode === 'pkmn' ? document.getElementById('area-type1').value : '';
    const type2 = mode === 'pkmn' ? document.getElementById('area-type2').value : '';
    const zoneName = mode === 'zone' ? document.getElementById('area-zone-search').value.toLowerCase() : '';
    const itemFilter = document.getElementById('area-item').value;
    const lv = document.getElementById('area-level').value;
    const rot = document.getElementById('area-rotation').value;
    
    // Update URL hash
    updateURLHash('areas', { pokemon: pkmn, type1, type2, zone: zoneName, item: itemFilter, level: lv, rotation: rot });
    
    const res = Object.values(areas).filter(a => {
        if (a.type !== 'wild') return false;  // Only show wild areas
        if (lv && a.level !== parseInt(lv)) return false;
        if (rot && a.rotation !== parseInt(rot)) return false;
        
        // Zone name filter
        if (zoneName) {
            if (!(a.displayName || format(a.name)).toLowerCase().includes(zoneName) && !a.name.toLowerCase().includes(zoneName)) return false;
        }
        
        // Get all spawning Pokemon names
        const allSpawns = [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare];
        
        // Filter by Pokemon name search
        if (pkmn) {
            if (!allSpawns.some(p => p.toLowerCase().includes(pkmn) || (pokemons[p]?.displayName || '').toLowerCase().includes(pkmn))) return false;
        }
        
        // Filter by type (check if any spawning Pokemon has the required types)
        if (type1 || type2) {
            const hasMatchingPkmn = allSpawns.some(p => {
                const pkmnData = pokemons[p];
                if (!pkmnData) return false;
                const t1Match = !type1 || pkmnData.types.includes(type1);
                const t2Match = !type2 || pkmnData.types.includes(type2);
                return t1Match && t2Match;
            });
            if (!hasMatchingPkmn) return false;
        }
        
        if (itemFilter) {
            const allDrops = [...a.drops.common, ...a.drops.uncommon, ...a.drops.rare];
            if (a.apricornColor) allDrops.push(a.apricornColor);
            if (!allDrops.includes(itemFilter)) return false;
        }
        return true;
    }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    
    const c = document.getElementById('areas-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('results')}</div><div class="results-grid">${res.map(a => renderAreaCard(a, pkmn, itemFilter, type1, type2)).join('')}</div>`;
}

// ============ TEAM BUILDER ============
// Dream Team data structure
let dreamTeam = Array(6).fill(null).map(() => ({ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } }));

// Temporary decor display toggle (not saved, not shared, for screenshots only)


function initTeamBuilder() {
    renderDreamTeam();
    const teamInput = document.getElementById('team-search');
    teamInput.placeholder = t('searchPokemonPlaceholder') || 'Search Pokémon...';
    teamInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addTeamPokemon(); }
    });
}

// Get ribbons HTML for display using game images (32px = x2)
window.getRibbonsHtml = function(ribbons) {
    if (!ribbons || ribbons.length === 0) return '';
    const ribbonImgs = ribbons.map(r => {
        const ribbonUrl = `${CONFIG.repoBase}img/ribbons/${r}.png`;
        return `<img src="${ribbonUrl}" style="width:32px;height:32px;image-rendering:pixelated;" onerror="this.style.display='none'">`;
    }).join('');
    return ribbonImgs;
}

function renderDreamTeam() {
    const container = document.getElementById('dream-team');
    container.innerHTML = dreamTeam.map((slot, i) => {
        if (slot.pokemon) {
            const p = pokemons[slot.pokemon];
            
            // Validate nature - reset if no longer available for this Pokemon
            if (slot.nature && !isNatureAvailable(p, slot.nature)) {
                slot.nature = null;
            }
            
            const learnableMoves = getLearnableMoves(slot.pokemon);
            const possibleAbilities = getPossibleAbilities(slot.pokemon);
            // Add Memory abilities - all Memory abilities available on all Pokemon
            const memoryAbilities = [];
            const abilityToMemory = {}; // Map ability name to memory item
            Object.values(items).forEach(item => {
                if (item.type === 'memory' && item.ability && abilities[item.ability]) {
                    // Don't add if it's the Pokemon's own HA (already shown separately)
                    if (item.ability !== p.hiddenAbility) {
                        memoryAbilities.push(item.ability);
                        abilityToMemory[item.ability] = item.name;
                    }
                }
            });
            const allAbilities = [...new Set([...possibleAbilities, ...memoryAbilities])].sort((a, b) => {
                const aa = abilities[a], ab = abilities[b];
                return (aa?.displayName || a).localeCompare(ab?.displayName || b);
            });
            
            // Parse IVs (fallback to 6 max)
            let ivs = { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 };
            if (slot.ivs) {
                ivs.hp = parseInt(slot.ivs.hp ?? slot.ivs.HP ?? 6);
                ivs.atk = parseInt(slot.ivs.atk ?? 6);
                ivs.def = parseInt(slot.ivs.def ?? 6);
                ivs.satk = parseInt(slot.ivs.satk ?? slot.ivs.spa ?? 6);
                ivs.sdef = parseInt(slot.ivs.sdef ?? slot.ivs.spd ?? 6);
                ivs.spe = parseInt(slot.ivs.spe ?? 6);
            }
            Object.keys(ivs).forEach(k => ivs[k] = Math.min(6, Math.max(0, isNaN(ivs[k]) ? 6 : ivs[k])));
            const ivTotal = ivs.hp + ivs.atk + ivs.def + ivs.satk + ivs.sdef + ivs.spe;
            
            // IV display with red stars
            const ivLabels = ['HP','ATK','DEF','SPA','SPD','SPE'];
            const ivKeys = ['hp','atk','def','satk','sdef','spe'];
            const ivDisplay = ivLabels.map((label, idx) => {
                const val = ivs[ivKeys[idx]];
                return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><span style="font-size:0.6rem;color:var(--text-dim);opacity:0.7">${label}</span><span style="font-size:0.7rem;color:#ff4444;letter-spacing:-1px">${'★'.repeat(val)}${'☆'.repeat(6-val)}</span></div>`;
            }).join('');
            
            // Get ribbons from save data
            let ribbonsHtml = '';
            if (loadedSaveData && loadedSaveData[slot.pokemon]) {
                const pkmnData = loadedSaveData[slot.pokemon];
                if (pkmnData && pkmnData.ribbons && pkmnData.ribbons.length > 0) {
                    ribbonsHtml = `<div class="dream-ribbons">${getRibbonsHtml(pkmnData.ribbons)}</div>`;
                }
            }
            
            return `<div class="dream-slot">
                <button class="dream-slot-remove" onclick="removeDreamSlot(${i})">✕</button>
                <div class="dream-slot-header">
                    <div style="display:flex;align-items:flex-start;">
                        <div class="dream-slot-sprite-container">
                            <img class="dream-slot-sprite" src="${slot.shiny ? spriteShiny(slot.pokemon) : sprite(slot.pokemon)}" style="${slot.starSign ? getStellarStyle(slot.starSign) : ''}" onerror="this.src='${sprite(slot.pokemon)}'">
                        </div>
                        ${ribbonsHtml}
                    </div>
                    <div class="dream-slot-info">
                        <div class="dream-slot-name">${p.displayName || format(slot.pokemon)} ${divBadge(p.division)}</div>
                        <div class="dream-slot-types type-badges">${p.types.map(t => typeBadge(t)).join('')}</div>
                        <div class="dream-slot-controls">
                            <label class="dream-slot-shiny"><input type="checkbox" ${slot.shiny ? 'checked' : ''} onchange="toggleDreamShiny(${i}, this.checked)"> ✨ ${t('shiny')}</label>
                            ${GAME_CONFIG.STAR_SIGNS ? `
                            <select onchange="setDreamStarSign(${i}, this.value)" style="padding:2px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.75rem;color:var(--accent-gold);margin-left:4px">
                                <option value="">Normal</option>
                                ${Object.keys(GAME_CONFIG.STAR_SIGNS).map(ss => `<option value="${ss}" ${slot.starSign === ss ? 'selected' : ''}>${format(ss)}</option>`).join('')}
                            </select>` : ''}
                            ${GAME_CONFIG.NATURES ? `
                            <select onchange="setDreamNature(${i}, this.value)" style="padding:2px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.75rem;color:#82dba4;margin-left:4px" title="${t('nature') || 'Nature'}">
                                <option value="">${t('neutral') || 'Neutral'}</option>
                                ${Object.keys(GAME_CONFIG.NATURES).filter(n => isNatureAvailable(p, n)).map(n => `<option value="${n}" ${slot.nature === n ? 'selected' : ''}>${GAME_CONFIG.NATURES[n].name?.[currentLang] || format(n)}</option>`).join('')}
                            </select>` : ''}
                        </div>
                    </div>
                </div>
                ${(() => {
                    // BST display with nature-colored stars (like in-game)
                    const bstStars = getNatureColoredStars(p.bst, slot.nature);
                    const natureName = slot.nature ? (GAME_CONFIG.NATURES[slot.nature]?.name?.[currentLang] || format(slot.nature)) : null;
                    return `
                <div class="dream-slot-section" style="padding:6px 10px;background:rgba(0,212,255,0.05);border-left:3px solid var(--accent-blue)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span style="font-size:0.7rem;color:var(--accent-blue);font-weight:700">BST ${natureName ? `<span style="color:#82dba4">(${natureName})</span>` : ''}</span>
                        <span style="font-size:0.75rem;color:var(--accent-gold);font-weight:700">${bstStars.total}★</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:2px;text-align:center">
                        ${['hp','atk','def','satk','sdef','spe'].map((stat, idx) => {
                            const statData = bstStars[stat];
                            return `
                            <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
                                <span style="font-size:0.55rem;color:var(--text-dim);opacity:0.6">${['HP','ATK','DEF','SPA','SPD','SPE'][idx]}</span>
                                <span style="font-size:0.8rem;letter-spacing:-1px">${statData.html}</span>
                            </div>
                        `}).join('')}
                    </div>
                </div>`})()}
                <div class="dream-slot-section iv-section" style="padding:6px 10px;background:rgba(255,68,68,0.05);border-left:3px solid #ff4444">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span style="font-size:0.7rem;color:#ff6666;font-weight:700">IVs</span>
                        <span style="font-size:0.75rem;color:var(--accent-gold);font-weight:700">${ivTotal}/36</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:2px;text-align:center">
                        ${['hp','atk','def','satk','sdef','spe'].map((stat, idx) => {
                            const val = ivs[stat];
                            const stars = '★'.repeat(val) + '☆'.repeat(6-val);
                            return `
                            <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
                                <span style="font-size:0.55rem;color:var(--text-dim);opacity:0.6">${['HP','ATK','DEF','SPA','SPD','SPE'][idx]}</span>
                                <span onclick="cycleDreamIV(${i}, '${stat}')" title="Cliquer pour changer" style="font-size:0.8rem;color:#ff4444;cursor:pointer;user-select:none;letter-spacing:-1px">${stars}</span>
                            </div>
                        `}).join('')}
                    </div>
                </div>
                <div class="dream-slot-section">
                    <div class="dream-slot-section-title">${t('moves')}</div>
                    <div class="dream-moves">
                        ${[0,1,2,3].map(m => `<div style="display:flex;align-items:center;gap:4px"><span style="font-size:0.7rem;color:var(--text-dim);font-weight:700;min-width:16px">${m+1}:</span><select class="dream-move-select" onchange="setDreamMove(${i}, ${m}, this.value)">
                            <option value="">${t('selectMove')}</option>
                            ${learnableMoves.map(mv => {
                                const moveData = moves[mv];
                                const p = pokemons[slot.pokemon];
                                const isEggMove = moveData?.isEggMove;
                                const isNativeSignature = p?.signature === mv;
                                const isReplicatorSignature = moveData?.isSignature && !isNativeSignature;
                                let suffix = '';
                                if (isEggMove) suffix += ' 🥚';
                                if (isReplicatorSignature) suffix += ' 🔬';
                                if (isNativeSignature) suffix += ' ⭐';
                                return `<option value="${mv}" ${slot.moves[m] === mv ? 'selected' : ''}>${moveData?.displayName || format(mv)}${suffix}</option>`;
                            }).join('')}
                        </select></div>`).join('')}
                    </div>
                </div>
                <div class="dream-slot-section">
                    <div class="dream-slot-section-title">${t('abilities')}</div>
                    <div class="dream-abilities">
                        ${(() => {
                            // Helper to get memory image URL for an ability
                            const getMemoryImg = (abilityName) => {
                                const memoryItem = Object.values(items).find(item => 
                                    item.type === 'memory' && item.ability === abilityName
                                );
                                if (!memoryItem) return null;
                                // Get type from memoryTypings or ability types
                                const ab = abilities[abilityName];
                                const memoryType = memoryItem.memoryTypings?.[0] || ab?.types?.[0] || 'normal';
                                return `${CONFIG.repoBase}img/items/${memoryType}Memory.png`;
                            };
                            
                            const selectedAbility = slot.ability || '';
                            const selectedMemoryImg = getMemoryImg(selectedAbility);
                            const selectedAbilityName = selectedAbility ? (abilities[selectedAbility]?.displayName || format(selectedAbility)) : (t('selectAbility') || 'Select Ability');
                            return `<div class="ability-dropdown" id="ability-dropdown-${i}">
                                <div class="ability-dropdown-trigger" onclick="toggleAbilityDropdown(${i})">
                                    ${selectedMemoryImg ? `<img src="${selectedMemoryImg}" style="width:16px;height:16px;image-rendering:pixelated;" onerror="this.style.display='none'">` : ''}
                                    <span>${selectedAbilityName}</span>
                                </div>
                                <div class="ability-dropdown-menu" id="ability-menu-${i}">
                                    <div class="ability-dropdown-item" onclick="selectDreamAbility(${i}, '')">
                                        <span>${t('selectAbility') || 'Select Ability'}</span>
                                    </div>
                                    ${allAbilities.filter(a => a !== p.hiddenAbility).map(a => {
                                        const memoryImg = getMemoryImg(a);
                                        return `<div class="ability-dropdown-item" onclick="selectDreamAbility(${i}, '${a}')">
                                            ${memoryImg ? `<img src="${memoryImg}" style="width:16px;height:16px;image-rendering:pixelated;" onerror="this.style.display='none'">` : '<span style="width:16px;"></span>'}
                                            <span>${abilities[a]?.displayName || format(a)}</span>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>`;
                        })()}
                        <select class="dream-ability-select locked" disabled>
                            <option value="${p.hiddenAbility || ''}">${p.hiddenAbility ? t('haPrefix') + ' ' + (abilities[p.hiddenAbility]?.displayName || format(p.hiddenAbility)) : t('noHA')}</option>
                        </select>
                    </div>
                </div>
                <div class="dream-slot-section">
                    <div class="dream-slot-section-title">${t('item')}</div>
                    <div class="dream-item-row">
                        <select class="dream-item-select" onchange="setDreamItem(${i}, this.value)">
                            <option value="">${t('selectItem')}</option>
                            ${Object.values(items).filter(it => it.type === 'held' || it.type === 'evolution' || it.type === 'mega').sort((a, b) => a.displayName.localeCompare(b.displayName)).map(it => `<option value="${it.name}" ${slot.item === it.name ? 'selected' : ''}>${it.displayName}</option>`).join('')}
                        </select>
                        ${slot.item ? `<img class="dream-item-icon" src="${itemImg(slot.item)}">` : ''}
                    </div>
                </div>
            </div>`;
        }
        return `<div class="dream-slot empty" onclick="focusTeamSearch(${i})"><div class="team-slot-empty">➕ ${t('emptySlot')}</div></div>`;
    }).join('');
}

window.getLearnableMoves = function(pkmnName) {
    const p = pokemons[pkmnName];
    if (!p) return [];
    const all = new Set();

    // Add egg move (learnable via breeding, may have no moveset)
    if (p.eggMove && moves[p.eggMove]) {
        all.add(p.eggMove);
    }

    // v5.0: Division B or lower can learn ALL egg moves
    const divRank = { 'SSS': 7, 'SS': 6, 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const pRank = divRank[p.division] || 0;
    if (pRank <= 3) { // B, C, or D
        Object.values(moves).forEach(m => {
            if (m.isEggMove) {
                all.add(m.name);
            }
        });
    }
    
    // v5.0: Division B or lower can learn ALL signature moves via Replicator Upgrade E
    if (pRank <= 3) { // B, C, or D
        Object.values(moves).forEach(m => {
            if (m.isSignature) {
                all.add(m.name);
            }
        });
    }

    // All moves this Pokemon can learn (natural + genetics)
    Object.values(moves).forEach(m => {
        // Skip signature moves of other Pokemon
        if (m.isSignature && m.name !== p.signature) return;
        if (!m.moveset || m.moveset.length === 0) {
            // Only add if it's this Pokemon's signature
            if (m.name === p.signature) all.add(m.name);
            return;
        }

        // Natural learning: moveset includes 'all' or Pokemon's type
        if (m.moveset.includes('all') || p.types.some(t => m.moveset.includes(t))) {
            all.add(m.name);
        } else {
            // Genetics: any move with moveset can be inherited via Lock Capsule
            all.add(m.name);
        }
    });

    return [...all].sort((a, b) => {
        const ma = moves[a], mb = moves[b];
        return (ma?.displayName || a).localeCompare(mb?.displayName || b);
    });
}

window.getPossibleAbilities = function(pkmnName) {
    const p = pokemons[pkmnName];
    if (!p) return [];
    const all = new Set();
    
    // Add abilities based on Pokemon's types (natural abilities)
    Object.values(abilities).forEach(a => {
        if (!a.types || !Array.isArray(a.types)) return;
        if (a.types.includes('all') || p.types.some(t => a.types.includes(t))) {
            all.add(a.name);
        }
    });
    
    // With Destiny Knot, can inherit abilities from same-type donor
    // BUT only abilities that have 'types' defined (natural abilities)
    // Hidden-only abilities (no 'types') can ONLY be obtained as HA, not via Destiny Knot
    Object.values(abilities).forEach(a => {
        // Must have types defined (natural ability) AND rarity 1-3
        if (a.types && Array.isArray(a.types) && a.types.length > 0 && a.rarity && a.rarity <= 3) {
            all.add(a.name);
        }
    });
    
    return [...all].sort((a, b) => {
        const aa = abilities[a], ab = abilities[b];
        return (aa?.displayName || a).localeCompare(ab?.displayName || b);
    });
}

// ===== ANTI-CHEAT & RESTRICTIONS SYSTEM FOR CABLE LINK =====

// List of seasonal Pokémon (event exclusive - cannot be traded)
const SEASONAL_POKEMON = ['emolgaHalloween', 'tangelaHalloween', 'snoruntHalloween', 'marshadow'];

// List of secret Pokémon (discoverable in-game secrets - cannot be traded)
// These are loaded dynamically from pokemon data with isSecret flag

// Memory items that allow learning special abilities
// Format: abilityName -> memoryItemName
const MEMORY_ABILITIES = {
    'prankster': 'abilityPranksterMemory',
    'hugePower': 'abilityHugePowerMemory',
    // Add more as they are released
};

// Check if an ability can be learned via Memory item
function canLearnAbilityViaMemory(abilityName) {
    if (!abilityName) return false;
    const memoryItem = MEMORY_ABILITIES[abilityName.toLowerCase()];
    if (!memoryItem) return false;
    // Check if the memory item exists in the game (is released)
    return items[memoryItem] !== undefined;
}

/**
 * Check if a Pokemon can be exchanged
 * Returns: { 
 *   isLegal: boolean,      // false if cheated/hacked
 *   isExchangeable: boolean, // false if restricted (Ditto, seasonal) or illegal
 *   category: 'legal'|'cheat'|'restricted',
 *   reasons: string[] 
 * }
 * 
 * Categories:
 * - 'legal': Can be traded normally
 * - 'cheat': Illegal modifications detected (level > 100, invalid moves/abilities, etc.)
 * - 'restricted': Legit but excluded from trading (Ditto, seasonal Pokémon)
 */
function checkPokemonLegality(pkmnName, pkmnData) {
    const reasons = [];
    const p = pokemons[pkmnName];
    
    // === RESTRICTED POKÉMON (Legit but not exchangeable) ===
    
    // Ditto/Metamorph - special case, completely excluded from exchange
    if (pkmnName === 'ditto') {
        return { 
            isLegal: true, 
            isExchangeable: false, 
            category: 'restricted',
            reasons: [t('restrictedDitto') || 'Ditto ne peut pas être échangé (Pokémon spécial)'] 
        };
    }
    
    // Seasonal Pokémon - event exclusive
    if (SEASONAL_POKEMON.includes(pkmnName)) {
        return { 
            isLegal: true, 
            isExchangeable: false, 
            category: 'restricted',
            reasons: [t('restrictedSeasonal') || 'Pokémon événementiel exclusif - non échangeable'] 
        };
    }
    
    // Secret Pokémon - in-game secrets to discover
    if (p && p.isSecret) {
        return { 
            isLegal: true, 
            isExchangeable: false, 
            category: 'restricted',
            reasons: [t('restrictedSecret') || 'Pokémon secret - à découvrir en jeu'] 
        };
    }
    
    // Star Sign Pokémon - échangeable (transfert family-wide géré dans exchangeGenerateNewSave)
    
    // === CHEAT DETECTION ===
    
    // 1. Check level (max 100)
    if (pkmnData.level > 100) {
        reasons.push(t('cheatLevel') || `Niveau illégal: ${pkmnData.level} (max: 100)`);
    }
    
    // 2. Check if Pokemon is unobtainable/hack
    // Mega Pokemon with available stones are marked as 'mart', not 'unobtainable'
    if (p && p.obtainedIn === 'unobtainable') {
        // Check if it has an obtainable pre-evolution (fallback check)
        const preEvo = evolutionRelations.evolvesFrom?.[pkmnName];
        const hasObtainablePreEvo = preEvo && pokemons[preEvo]?.obtainedIn && 
                                    pokemons[preEvo].obtainedIn !== 'unobtainable';
        
        if (!hasObtainablePreEvo) {
            reasons.push(t('cheatUnobtainable') || 'Pokémon non disponible dans le jeu');
        }
    }
    
    // 3. Check ability (Talent 1 - active ability)
    // Must be: real HA, OR in possibleAbilities (natural + rarity 1-3), OR learnable via Memory item
    const activeAbility = pkmnData.ability;
    const realHA = p?.hiddenAbility;
    
    if (activeAbility && p) {
        const isHA = activeAbility === realHA;
        
        if (!isHA) {
            // Check if in possibleAbilities (includes natural + rarity 1-3 from Destiny Knot)
            const possibleAbilities = getPossibleAbilities(pkmnName);
            const isPossible = possibleAbilities.includes(activeAbility);
            
            if (!isPossible) {
                // Check Memory item
                const abilityCapitalized = activeAbility.charAt(0).toUpperCase() + activeAbility.slice(1);
                const memoryItemName = `ability${abilityCapitalized}Memory`;
                const hasMemoryItem = items[memoryItemName] !== undefined;
                
                if (!hasMemoryItem) {
                    const abilityName = abilities[activeAbility]?.displayName || activeAbility;
                    reasons.push(`Talent illégal: ${abilityName}`);
                }
            }
        }
    }
    
    // 4. Check moves
    const learnableMoves = getLearnableMoves(pkmnName);
    const currentMoves = Object.values(pkmnData.moves || {}).filter(m => m);
    const illegalMoves = [];
    
    for (const moveName of currentMoves) {
        if (!learnableMoves.includes(moveName)) {
            const moveDisplay = moves[moveName]?.displayName || moveName;
            illegalMoves.push(moveDisplay);
        }
    }
    
    if (illegalMoves.length > 0) {
        if (illegalMoves.length === 1) {
            reasons.push(`${t('cheatMove') || 'Illegal move'}: ${illegalMoves[0]}`);
        } else {
            reasons.push(`${t('cheatMoves') || 'Illegal moves'}: ${illegalMoves.join(', ')}`);
        }
    }
    
    const isLegal = reasons.length === 0;
    return { 
        isLegal, 
        isExchangeable: isLegal, // Only legal Pokémon can be exchanged
        category: isLegal ? 'legal' : 'cheat',
        reasons 
    };
}

/**
 * Get all valid moves for a Pokemon (natural + egg + genetics)
 * This is a stricter version of getLearnableMoves for anti-cheat
 */
function getAllValidMoves(pkmnName) {
    return getLearnableMoves(pkmnName); // Uses the same function
}

function focusTeamSearch(slotIndex) {
    window.pendingTeamSlot = slotIndex;
    document.getElementById('team-search').focus();
}

function setDreamMove(slot, moveIndex, moveName) {
    dreamTeam[slot].moves[moveIndex] = moveName || null;
    updateTeamURL();
}

// Ability dropdown functions for Team Builder
function toggleAbilityDropdown(slot) {
    const menu = document.getElementById(`ability-menu-${slot}`);
    if (menu) {
        menu.classList.toggle('open');
    }
}

function selectDreamAbility(slot, abilityName) {
    dreamTeam[slot].ability = abilityName || null;
    const menu = document.getElementById(`ability-menu-${slot}`);
    if (menu) menu.classList.remove('open');
    renderDreamTeam();
    updateTeamURL();
}

// Close ability dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.ability-dropdown')) {
        document.querySelectorAll('.ability-dropdown-menu').forEach(menu => menu.classList.remove('open'));
    }
});

// Type-to-search functionality for custom dropdowns
(function() {
    let searchString = '';
    let searchTimeout = null;
    
    document.addEventListener('keydown', function(e) {
        // Find open dropdown menu
        const openMenu = document.querySelector('.ability-dropdown-menu.open');
        if (!openMenu) return;
        
        // Ignore special keys
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        
        // Only handle printable characters
        if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9\s]/)) {
            e.preventDefault();
            
            // Add character to search string
            searchString += e.key.toLowerCase();
            
            // Clear previous timeout
            if (searchTimeout) clearTimeout(searchTimeout);
            
            // Reset search string after 1 second of inactivity
            searchTimeout = setTimeout(() => {
                searchString = '';
            }, 1000);
            
            // Find matching item
            const items = openMenu.querySelectorAll('.ability-dropdown-item');
            for (const item of items) {
                const text = item.textContent.trim().toLowerCase();
                if (text.startsWith(searchString)) {
                    // Scroll item into view
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    // Highlight temporarily
                    item.style.background = 'var(--accent-blue)';
                    setTimeout(() => {
                        item.style.background = '';
                    }, 300);
                    break;
                }
            }
        }
        
        // Handle Escape to close dropdown
        if (e.key === 'Escape') {
            openMenu.classList.remove('open');
            searchString = '';
        }
    });
})();