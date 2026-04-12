// ============ DAMAGE CALCULATOR ============
let dmgCalcInitialized = false;

// Damage Calculator Mode: 'wild' or 'raid'
let dmgCalcMode = 'wild';
let geneticMode = false;

// Cache for pokemon difficulty multipliers (must be defined before use)
let pokemonDifficultyCache = null;
let pokemonWithDifficultyCache = null;

// Get list of all pokemon that appear in raids (with difficulty)
function getPokemonWithDifficulty() {
    if (pokemonWithDifficultyCache) return pokemonWithDifficultyCache;

    pokemonWithDifficultyCache = new Set();

    // Scan areas for boss pokemon with difficulty
    Object.values(areas).forEach(area => {
        if (!area || !area.difficulty) return;
        // Boss pokemon from area (donjons/raids)
        if (area.bossPkmn) {
            pokemonWithDifficultyCache.add(area.bossPkmn);
        }
        // Event zones with trainer=true and team (ex: eventMegaBlastoise)
        if (area.team && area.difficulty >= 25) {
            Object.values(area.team).forEach(pkmn => {
                if (typeof pkmn === 'string') {
                    pokemonWithDifficultyCache.add(pkmn);
                }
            });
        }
    });

    // Trainers/raids
    Object.values(trainers).forEach(trainer => {
        if (trainer.trainerType === 'raid' && trainer.difficulty) {
            if (trainer.team && typeof trainer.team === 'object') {
                Object.values(trainer.team).forEach(pkmn => {
                    pokemonWithDifficultyCache.add(pkmn);
                });
            }
        }
    });

    return pokemonWithDifficultyCache;
}

// Returns the raw difficulty value
function getPokemonDifficultyMultiplier(pokemonName) {
    if (!pokemonDifficultyCache) {
        pokemonDifficultyCache = {};

        Object.values(areas).forEach(area => {
            if (!area || !area.difficulty) return;
            const diff = area.difficulty;

            if (area.bossPkmn) {
                if (!pokemonDifficultyCache[area.bossPkmn] || pokemonDifficultyCache[area.bossPkmn] < diff) {
                    pokemonDifficultyCache[area.bossPkmn] = diff;
                }
            }
            if (area.team) {
                Object.values(area.team).forEach(pkmn => {
                    if (typeof pkmn === 'string') {
                        if (!pokemonDifficultyCache[pkmn] || pokemonDifficultyCache[pkmn] < diff) {
                            pokemonDifficultyCache[pkmn] = diff;
                        }
                    }
                });
            }
        });

        Object.values(trainers).forEach(trainer => {
            if (trainer.trainerType === 'raid' && trainer.difficulty) {
                if (trainer.team && typeof trainer.team === 'object') {
                    Object.values(trainer.team).forEach(pkmn => {
                        if (!pokemonDifficultyCache[pkmn] || pokemonDifficultyCache[pkmn] < trainer.difficulty) {
                            pokemonDifficultyCache[pkmn] = trainer.difficulty;
                        }
                    });
                }
            }
        });
    }

    return pokemonDifficultyCache[pokemonName] || 1;
}

// Get difficulty tier for display
function getPokemonDifficultyTier(pokemonName) {
    if (!pokemonDifficultyCache) {
        getPokemonDifficultyMultiplier(pokemonName);
    }
    const diff = pokemonDifficultyCache[pokemonName] || 0;
    if (diff === 600) return { tier: 4, label: 'Tier IV', stars: '⭐⭐⭐⭐', color: '#ff4444' };
    if (diff === 200) return { tier: 3, label: 'Tier III', stars: '⭐⭐⭐', color: '#ff8800' };
    if (diff === 70)  return { tier: 2, label: 'Tier II', stars: '⭐⭐', color: '#ffd700' };
    if (diff === 25)  return { tier: 1, label: 'Tier I', stars: '⭐', color: '#00ff88' };
    if (diff > 0)    return { tier: 0, label: `Difficulté ${diff}`, stars: '🏰', color: 'var(--accent-orange)' };
    return { tier: 0, label: '-', stars: '', color: 'var(--text-dim)' };
}

// Ate abilities configuration (from explore.js lines 2468-2481)
const ABILITY_ATE_MODIFIERS = {
    ferrilate: { type: 'steel', multiplier: 1.3 },
    glaciate: { type: 'ice', multiplier: 1.3 },
    terralate: { type: 'ground', multiplier: 1.3 },
    toxilate: { type: 'poison', multiplier: 1.3 },
    hydrolate: { type: 'water', multiplier: 1.3 },
    pyrolate: { type: 'fire', multiplier: 1.3 },
    chrysilate: { type: 'bug', multiplier: 1.3 },
    galvanize: { type: 'electric', multiplier: 1.3 },
    gloomilate: { type: 'dark', multiplier: 1.3 },
    espilate: { type: 'psychic', multiplier: 1.3 },
    aerilate: { type: 'flying', multiplier: 1.3 },
    pixilate: { type: 'fairy', multiplier: 1.3 },
    dragonMaw: { type: 'dragon', multiplier: 1.3 },
    verdify: { type: 'grass', multiplier: 1.3 }
};

// Weather damage modifiers (from explore.js lines 2667-2676)
const WEATHER_DAMAGE_MODIFIERS = {
    sunny: { boost: ['fire'], reduce: ['water'] },
    rainy: { boost: ['water'], reduce: ['fire'] },
    sandstorm: { boost: ['rock', 'ground'] },
    hail: { boost: ['ice'] },
    foggy: { boost: ['ghost', 'dark'] },
    electricTerrain: { boost: ['electric', 'steel'] },
    mistyTerrain: { boost: ['fairy', 'psychic'] },
    grassyTerrain: { boost: ['grass', 'bug'] }
};

function toggleGeneticMode() {
    geneticMode = !geneticMode;
    const toggle = document.getElementById('genetic-toggle');
    if (geneticMode) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
    
    // Reset ability trackers to force rebuild
    dmgCalcCurrentAttackerForAbility = null;
    dmgCalcCurrentDefenderForAbility = null;
    
    // Refresh ability and move selects
    const atkName = document.getElementById('dmg-atk-pokemon').value;
    const defName = document.getElementById('dmg-def-pokemon').value;
    
    if (atkName && pokemons[atkName]) {
        updateAbilitySelect('atk', pokemons[atkName]);
        updateMoveSelect(pokemons[atkName]);
        updateNatureSelect('atk', pokemons[atkName]);
    }
    if (defName && pokemons[defName] && dmgCalcMode === 'raid') {
        updateAbilitySelect('def', pokemons[defName]);
    }
    
    updateDamageCalc();
}

function setDmgMode(mode) {
    dmgCalcMode = mode;
    
    // Update button styles
    const wildBtn = document.getElementById('dmg-mode-wild');
    const raidBtn = document.getElementById('dmg-mode-raid');
    const info = document.getElementById('dmg-mode-info');
    
    if (mode === 'wild') {
        wildBtn.style.background = 'linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,255,136,0.1))';
        wildBtn.style.border = '1px solid var(--accent-green)';
        wildBtn.style.color = 'var(--accent-green)';
        raidBtn.style.background = 'transparent';
        raidBtn.style.border = 'none';
        raidBtn.style.color = 'var(--text-dim)';
        info.textContent = t('wildBattleInfo');
    } else {
        raidBtn.style.background = 'linear-gradient(135deg,rgba(0,212,255,0.2),rgba(0,212,255,0.1))';
        raidBtn.style.border = '1px solid var(--accent-blue)';
        raidBtn.style.color = 'var(--accent-blue)';
        wildBtn.style.background = 'transparent';
        wildBtn.style.border = 'none';
        wildBtn.style.color = 'var(--text-dim)';
        info.textContent = t('raidBattleInfo');
    }
    
    // Defender never has IVs/ability/item (neither wild nor raid)
    document.querySelectorAll('.dmg-trainer-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show/hide raid difficulty display
    const raidDifficultyDiv = document.getElementById('dmg-raid-difficulty');
    if (raidDifficultyDiv) {
        raidDifficultyDiv.style.display = mode === 'raid' ? 'block' : 'none';
        
        // Show/hide cooking buff container (only for raid)
        const cookingContainer = document.getElementById('dmg-cooking-container');
        if (cookingContainer) {
            cookingContainer.style.display = mode === 'raid' ? 'block' : 'none';
        }
        
        // Update difficulty content if in raid mode and a pokemon is selected
        if (mode === 'raid') {
            const defName = document.getElementById('dmg-def-pokemon')?.value;
            if (defName) {
                const tierInfo = getPokemonDifficultyTier(defName);
                const diffDisplay = document.getElementById('dmg-raid-difficulty-stars');
                if (diffDisplay) {
                    if (tierInfo.tier > 0 || tierInfo.label !== '-') {
                        diffDisplay.innerHTML = `<span style="color:${tierInfo.color};font-weight:700">${tierInfo.label}</span> ${tierInfo.stars}`;
                    } else {
                        diffDisplay.textContent = '-';
                    }
                }
            }
        }
    }
    
    // Filter defender pokemon list based on mode
    const defPokemon = document.getElementById('dmg-def-pokemon');
    if (defPokemon) {
        const pokemonWithDifficulty = getPokemonWithDifficulty();
        Array.from(defPokemon.options).forEach(opt => {
            if (!opt.value) return; // Skip empty option
            if (mode === 'raid') {
                // In raid mode: only show pokemon with difficulty
                opt.style.display = pokemonWithDifficulty.has(opt.value) ? '' : 'none';
            } else {
                // In wild mode: show all pokemon
                opt.style.display = '';
            }
        });
        
        // Clear selection if currently selected pokemon is not valid in this mode
        const currentDef = defPokemon.value;
        if (currentDef && mode === 'raid' && !pokemonWithDifficulty.has(currentDef)) {
            defPokemon.value = '';
        }
    }
    
    // Reset ability trackers to force rebuild on mode change
    dmgCalcCurrentAttackerForAbility = null;
    dmgCalcCurrentDefenderForAbility = null;
    
    // Update ability selects and HA display
    const atkName = document.getElementById('dmg-atk-pokemon').value;
    const defName = document.getElementById('dmg-def-pokemon').value;
    
    // Attacker ability is always populated
    if (atkName && pokemons[atkName]) updateAbilitySelect('atk', pokemons[atkName]);
    
    // Defender ability: clear in wild mode, populate in trainer mode
    if (mode === 'wild') {
        const defAbility = document.getElementById('dmg-def-ability');
        if (defAbility) defAbility.innerHTML = `<option value="">${t('noneOption')}</option>`;
    } else if (defName && pokemons[defName]) {
        updateAbilitySelect('def', pokemons[defName]);
    }
    
    // Update HA displays for both sides
    if (atkName && pokemons[atkName]) updateHADisplay('atk', pokemons[atkName]);
    if (defName && pokemons[defName]) updateHADisplay('def', pokemons[defName]);
    
    // Update nature select for attacker
    if (atkName && pokemons[atkName]) updateNatureSelect('atk', pokemons[atkName]);
    
    // Recalculate
    updateDamageCalc();
}

function updateHADisplay(side, pokemon) {
    const haDisplay = document.getElementById(`dmg-${side}-ha-display`);
    if (!haDisplay) return;

    if (pokemon.hiddenAbility) {
        const abilityData = abilities[pokemon.hiddenAbility];
        const haName = abilityData ? abilityData.displayName : format(pokemon.hiddenAbility);
        if (side === 'atk') {
            haDisplay.innerHTML = `<span style="color:var(--accent-gold)">${haName}</span>`;
        } else if (dmgCalcMode === 'wild') {
            haDisplay.innerHTML = `<span style="color:var(--text-dim)">${haName} <span style="font-size:0.75rem">🔒 (Wild)</span></span>`;
        } else {
            haDisplay.innerHTML = `<span style="color:var(--accent-gold)">${haName}</span>`;
        }
    } else {
        haDisplay.textContent = '-';
    }

    // Show/hide HA toggle (only for attacker, only when HA exists)
    const haToggle = document.getElementById('dmg-ha-toggle');
    if (haToggle && side === 'atk') {
        haToggle.closest('label').style.display = pokemon.hiddenAbility ? 'flex' : 'none';
    }
}

// Get all available cooking ingredients (players can choose up to 3)
function getAllCookingIngredients() {
    return Object.values(GAME_CONFIG.INGREDIENTS || {});
}

function initDamageCalc() {
    if (dmgCalcInitialized) return;
    
    // Populate Cooking Buffs selects (v4.7) - All ingredients available, choose up to 3
    if (GAME_CONFIG.INGREDIENTS) {
        // Get all ingredients
        const allIngredients = getAllCookingIngredients();
        
        // Populate each of the 3 selects with ALL ingredients
        for (let i = 1; i <= 3; i++) {
            const cookingSelect = document.getElementById(`dmg-cooking-buff-${i}`);
            if (cookingSelect) {
                cookingSelect.innerHTML = '<option value="">-- ' + (t('noneOption') || 'None') + ' --</option>';
                
                allIngredients.forEach((data) => {
                    const ability = abilities[data.ability];
                    const abilityName = ability?.displayName || format(data.ability);
                    const opt = document.createElement('option');
                    opt.value = data.ability;
                    opt.textContent = `${format(data.name)} → ${abilityName}`;
                    opt.dataset.ingredient = data.name;
                    cookingSelect.appendChild(opt);
                });
            }
        }
    }
    
    // Populate Pokemon selects using DocumentFragment for better performance
    const atkPokemon = document.getElementById('dmg-atk-pokemon');
    const defPokemon = document.getElementById('dmg-def-pokemon');
    
    // Clear existing options except first
    atkPokemon.innerHTML = `<option value="">${t('selectOption')}</option>`;
    defPokemon.innerHTML = `<option value="">${t('selectOption')}</option`;
    
    const pkmnList = Object.values(pokemons).sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    const frag1 = document.createDocumentFragment();
    const frag2 = document.createDocumentFragment();
    
    // Attacker: all pokemon except secrets
    pkmnList.forEach(p => {
        if (p.isSecret) return; // Skip secret Pokemon
        const opt1 = document.createElement('option');
        opt1.value = p.name;
        opt1.textContent = p.displayName;
        frag1.appendChild(opt1);
    });
    atkPokemon.appendChild(frag1);
    
    // Defender: filter based on mode, exclude secrets
    // In RAID mode, only show pokemon with difficulty (raid bosses)
    const pokemonWithDifficulty = getPokemonWithDifficulty();
    pkmnList.forEach(p => {
        if (p.isSecret) return; // Skip secret Pokemon
        // Always include all for now, filter dynamically in setDmgMode
        const opt2 = document.createElement('option');
        opt2.value = p.name;
        opt2.textContent = p.displayName;
        // Tag options with difficulty info for filtering
        if (pokemonWithDifficulty.has(p.name)) {
            opt2.dataset.hasDifficulty = 'true';
        }
        frag2.appendChild(opt2);
    });
    defPokemon.appendChild(frag2);
    
    // Ability selects - start with only "None", populated dynamically per Pokémon
    const atkAbility = document.getElementById('dmg-atk-ability');
    const defAbility = document.getElementById('dmg-def-ability');
    
    atkAbility.innerHTML = `<option value="">${t('noneOption')}</option>`;
    defAbility.innerHTML = '<option value="">-- None --</option>';
    
    // Populate item selects
    const atkItem = document.getElementById('dmg-atk-item');
    const defItem = document.getElementById('dmg-def-item');
    
    atkItem.innerHTML = `<option value="">${t('noneOption')}</option>`;
    defItem.innerHTML = `<option value="">${t('noneOption')}</option>`;
    
    // Filter for attacker: no berries (defensive), no non-combat items
    const atkItems = Object.values(items).filter(i => {
        const isBerry = i.sort === 'berry' || i.name.toLowerCase().endsWith('berry');
        if (isBerry) return false;  // Berries are defensive
        if (nonCombatItems.has(i.name)) return false;  // No combat effect
        if (megaGemMap[i.name]) return false;  // Mega gems filtered per Pokemon
        return (i.type === 'held' && !isBerry) || i.power || i.damage;
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Filter for defender: berries allowed, still no non-combat items
    const defItems = Object.values(items).filter(i => {
        const isBerry = i.sort === 'berry' || i.name.toLowerCase().endsWith('berry');
        if (nonCombatItems.has(i.name)) return false;  // No combat effect
        if (megaGemMap[i.name]) return false;  // Mega gems filtered per Pokemon
        return (i.type === 'held' && !isBerry) || i.power || i.damage || isBerry;
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    const itemFrag1 = document.createDocumentFragment();
    const itemFrag2 = document.createDocumentFragment();
    
    atkItems.forEach(i => {
        const opt1 = document.createElement('option');
        opt1.value = i.name;
        opt1.textContent = i.displayName;
        itemFrag1.appendChild(opt1);
    });
    
    defItems.forEach(i => {
        const opt2 = document.createElement('option');
        opt2.value = i.name;
        opt2.textContent = i.displayName;
        itemFrag2.appendChild(opt2);
    });
    
    atkItem.appendChild(itemFrag1);
    defItem.appendChild(itemFrag2);
    
    // Set initial mode (hide trainer-only fields)
    document.querySelectorAll('.dmg-trainer-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // Reset current attacker tracker
    dmgCalcCurrentAttacker = null;
    
    // Reset ability trackers
    dmgCalcCurrentAttackerForAbility = null;
    dmgCalcCurrentDefenderForAbility = null;
    
    dmgCalcInitialized = true;
}

// Track current attacker to avoid rebuilding move list unnecessarily
let dmgCalcCurrentAttacker = null;

// Lock second buff dropdown if first buff is not at +2 or -2
function updateBuffLocks() {
    const buffPairs = [
        ['dmg-atk-buff-atk', 'dmg-atk-buff-atk-2'],
        ['dmg-atk-buff-def', 'dmg-atk-buff-def-2'],
        ['dmg-atk-buff-satk', 'dmg-atk-buff-satk-2'],
        ['dmg-atk-buff-spe', 'dmg-atk-buff-spe-2'],
        ['dmg-def-buff-def', 'dmg-def-buff-def-2'],
        ['dmg-def-buff-sdef', 'dmg-def-buff-sdef-2']
    ];
    
    buffPairs.forEach(([firstId, secondId]) => {
        const first = document.getElementById(firstId);
        const second = document.getElementById(secondId);
        if (!first || !second) return;
        
        const firstVal = parseInt(first.value) || 0;
        // Only enable second buff if first is at +2 or -2
        const maxedOut = firstVal === 2 || firstVal === -2;
        second.disabled = !maxedOut;
        if (!maxedOut) {
            second.value = '0';
        }
    });
}

function updateCookingSelects() {
    // Get selected values
    const selected = [
        document.getElementById('dmg-cooking-buff-1')?.value || '',
        document.getElementById('dmg-cooking-buff-2')?.value || '',
        document.getElementById('dmg-cooking-buff-3')?.value || ''
    ];
    
    // Update each select to disable already-selected options
    for (let i = 1; i <= 3; i++) {
        const select = document.getElementById(`dmg-cooking-buff-${i}`);
        if (!select) continue;
        
        const currentValue = selected[i - 1];
        
        for (const opt of select.options) {
            if (!opt.value) continue; // Skip "None" option
            // Disable if selected in another slot
            const isSelectedElsewhere = selected.some((val, idx) => val === opt.value && idx !== (i - 1));
            opt.disabled = isSelectedElsewhere;
        }
    }
}

function updateDamageCalc() {
    updateBuffLocks();
    if (!dmgCalcInitialized) initDamageCalc();
    
    // Update cooking buff selects to prevent duplicates
    updateCookingSelects();
    
    const atkName = document.getElementById('dmg-atk-pokemon').value;
    const defName = document.getElementById('dmg-def-pokemon').value;
    const moveName = document.getElementById('dmg-atk-move').value;
    
    // Update raid difficulty display
    if (defName && dmgCalcMode === 'raid') {
        const tierInfo = getPokemonDifficultyTier(defName);
        const diffDisplay = document.getElementById('dmg-raid-difficulty-stars');
        if (diffDisplay) {
            if (tierInfo.tier > 0 || tierInfo.label !== '-') {
                diffDisplay.innerHTML = `<span style="color:${tierInfo.color};font-weight:700">${tierInfo.label}</span> ${tierInfo.stars}`;
            } else {
                diffDisplay.textContent = '-';
            }
        }
    }
    
    // Only update move select when attacker changes
    if (atkName && atkName !== dmgCalcCurrentAttacker) {
        dmgCalcCurrentAttacker = atkName;
        const p = pokemons[atkName];
        updateMoveSelect(p);
        updateNatureSelect('atk', p); // Update natures when attacker changes
    }
    
    // Update stats display
    if (atkName) updateStatsDisplay('atk', pokemons[atkName]);
    if (defName) updateStatsDisplay('def', pokemons[defName]);
    
    // Update type3 warning (in case type3 selection changed)
    if (defName) updateType3Warning(pokemons[defName].types);
    
    // Update ability selects when pokemon changes
    if (atkName) updateAbilitySelect('atk', pokemons[atkName]);
    if (defName) updateAbilitySelect('def', pokemons[defName]);
    
    // Update HA displays
    if (atkName) updateHADisplay('atk', pokemons[atkName]);
    if (defName) updateHADisplay('def', pokemons[defName]);

    // Update Supreme Overlord / Ambidextrous / cross-type UI
    if (atkName) {
        const abilityName = document.getElementById('dmg-atk-ability')?.value || '';
        updateAbilityConditions(pokemons[atkName], abilityName);
    }

    // Update multihit/buildup selector visibility based on current move
    updateMultihitVisibility();
    updateBuildupVisibility();

    // Calculate damage if all selected
    if (atkName && defName && moveName) {
        calculateDamage();
    }
    
    // Update URL hash for sharing
    const filters = getTabFilterValues('damage');
    updateURLHash('damage', filters);
}

function isMoveNaturallyLearnable(move, pokemon) {
    // Check if move is naturally learnable by the pokemon
    // A move is naturally learnable if:
    // 1. It's in the 'all' moveset
    // 2. It matches one of the pokemon's types
    // 3. It's the pokemon's signature move
    if (!move || !pokemon) return false;
    
    if (move.moveset && move.moveset.includes('all')) return true;
    if (move.moveset && pokemon.types && move.moveset.some(t => pokemon.types.includes(t))) return true;
    if (pokemon.signature && move.name === pokemon.signature) return true;
    return false;
}

function isMoveGeneticallyObtainable(move, pokemon) {
    // In genetic mode: ALL moves are obtainable EXCEPT "Signature Only" moves
    // Signature Only = exclusive move that only ONE Pokemon can learn (cannot be transferred)
    // BUT: a Pokemon can always learn its own signature move!
    if (!move || !pokemon) return false;
    
    // Check if this is the Pokemon's own signature move
    if (pokemon.signature === move.name) {
        return true; // Always allow own signature move
    }
    
    // Check explicit signature flags
    const sort = move.sort || '';
    const exclusive = move.exclusive || false;
    
    if (sort === 'signature' || exclusive === true) {
        return false; // Signature-only moves can't be transferred
    }
    
    // Count how many Pokemon can learn this move naturally (via moveset or signature)
    const moveName = move.name;
    let pokemonCount = 0;
    
    for (const p of Object.values(pokemons)) {
        // Check if this Pokemon learns it naturally
        if (p.signature === moveName) {
            pokemonCount++;
        }
        // Check moveset (type-based learning)
        if (move.moveset && move.moveset.length > 0) {
            // If Pokemon shares a type with the move's moveset
            if (p.types && move.moveset.some(t => p.types.includes(t))) {
                pokemonCount++;
            }
        }
        // If more than 1 Pokemon can learn it, it's not signature-only
        if (pokemonCount > 1) {
            return true;
        }
    }
    
    // If 0 or 1 Pokemon can learn it naturally, it's signature-only
    if (pokemonCount <= 1) {
        return false;
    }
    
    return true;
}

function updateMoveSelect(pokemon) {
    const moveSelect = document.getElementById('dmg-atk-move');
    
    // Get learnable moves (natural)
    let learnable = Object.values(moves).filter(m => {
        if (m.moveset && m.moveset.includes('all')) return true;
        if (m.moveset && m.moveset.some(t => pokemon.types.includes(t))) return true;
        if (pokemon.signature && m.name === pokemon.signature) return true;
        return false;
    });
    
    // Add pokemon's specific egg move if it has one
    if (pokemon.eggMove) {
        const eggMoveData = moves[pokemon.eggMove];
        if (eggMoveData && !learnable.some(m => m.name === pokemon.eggMove)) {
            learnable.push(eggMoveData);
        }
    }
    
    // v5.0: Division B or lower can learn ALL egg moves and signature moves via Replicator Upgrade E
    // In damage calculator, these are ONLY shown in genetic mode
    const divRank = { 'SSS': 7, 'SS': 6, 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const pRank = divRank[pokemon.division] || 0;
    
    if (geneticMode && pRank <= 3) { // B, C, or D
        // Add all egg moves
        const eggMoves = Object.values(moves).filter(m => {
            if (!m.isEggMove) return false;
            // Skip if already in list
            return !learnable.some(lm => lm.name === m.name);
        });
        learnable = [...learnable, ...eggMoves];
        
        // Add all signature moves
        const signatureMoves = Object.values(moves).filter(m => {
            if (!m.isSignature) return false;
            // Skip if already in list (native signature)
            return !learnable.some(lm => lm.name === m.name);
        });
        learnable = [...learnable, ...signatureMoves];
    }
    
    // In genetic mode, also include moves that can be learned via genetics
    if (geneticMode) {
        const geneticMoves = Object.values(moves).filter(m => {
            // Skip if already naturally learnable
            if (learnable.includes(m)) return false;
            // Only include if genetically obtainable for this pokemon
            return isMoveGeneticallyObtainable(m, pokemon);
        });
        learnable = [...learnable, ...geneticMoves];
    }
    
    learnable.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    
    // Build options using DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- ' + t('select') + ' --';
    fragment.appendChild(defaultOpt);
    
    learnable.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        const power = m.power ? ` (${m.power})` : '';
        const splitMark = m.split === 'physical' ? ' [Phys]' : (m.split === 'special' ? (currentLang === 'fr' ? ' [Spé]' : ' [Spec]') : '');
        const isNativeSignature = pokemon.signature && m.name === pokemon.signature;
        const isReplicatorSignature = m.isSignature && !isNativeSignature && geneticMode && pRank <= 3;
        const sigMark = isNativeSignature ? ' ⭐' : '';
        const replicatorMark = isReplicatorSignature ? ' 🔬' : '';
        const multihitMark = m.multihit ? ` [${m.multihit[0]}-${m.multihit[1]}]` : '';
        const buildupMark = m.buildupMult ? ` [x${m.buildupMult}]` : '';
        const geneticMark = (geneticMode && !isMoveNaturallyLearnable(m, pokemon) && !isReplicatorSignature) ? ' 🧬' : '';
        const eggMark = m.isEggMove ? ' 🥚' : '';
        opt.textContent = m.displayName + eggMark + power + splitMark + multihitMark + buildupMark + sigMark + replicatorMark + geneticMark;
        // Style for signature move (via CSS class not possible on options, but we can mark it)
        if (isNativeSignature) {
            opt.style.fontWeight = 'bold';
            opt.style.color = 'var(--accent-gold)';
        }
        fragment.appendChild(opt);
    });
    
    moveSelect.innerHTML = '';
    moveSelect.appendChild(fragment);
    
    // Update multihit selector when move changes
    moveSelect.onchange = function() {
        const abilityName = document.getElementById('dmg-atk-ability')?.value;
        // Use visibility update to ensure correct state
        updateMultihitVisibility();
        updateBuildupVisibility();
        updateAbilityConditions(pokemon, abilityName);
        updateDamageCalc();
    };
}

function getIVsForStat(side, stat) {
    const input = document.getElementById(`dmg-${side}-iv-${stat}`);
    return input ? (parseInt(input.value) || 0) : 0;
}

function updateStatsDisplay(side, pokemon) {
    const level = parseInt(document.getElementById(`dmg-${side}-level`).value) || 100;
    
    // Attacker always uses Trainer stats (IVs)
    // Defender uses IVs only in Trainer mode (raid bosses don't have IVs)
    const isTrainerSide = side === 'atk' || (side === 'def' && dmgCalcMode === 'trainer');
    
    // Get IVs for each stat (0-6)
    const ivs = {
        hp: isTrainerSide ? getIVsForStat(side, 'hp') : 0,
        atk: isTrainerSide ? getIVsForStat(side, 'atk') : 0,
        def: isTrainerSide ? getIVsForStat(side, 'def') : 0,
        satk: isTrainerSide ? getIVsForStat(side, 'satk') : 0,
        sdef: isTrainerSide ? getIVsForStat(side, 'sdef') : 0,
        spe: isTrainerSide ? getIVsForStat(side, 'spe') : 0
    };
    
    // Get nature for this side
    const natureName = document.getElementById(`dmg-${side}-nature`)?.value || '';
    
    // Game uses star ratings (1-6) from statToStars(), displayed as ★
    // Damage formula: attackPower = stars * 30 * 1.1^iv
    const b = pokemon.bst;
    const totalIVs = ivs.hp + ivs.atk + ivs.def + ivs.satk + ivs.sdef + ivs.spe;
    
    // Get nature-colored stars
    const bstStars = getNatureColoredStars(b, natureName);
    const natureDisplayName = natureName ? (GAME_CONFIG.NATURES[natureName]?.name?.[currentLang] || format(natureName)) : null;

    function statCell(label, color, statKey, iv) {
        const statData = bstStars[statKey];
        const ivStr = isTrainerSide && iv > 0 ? `<span style="color:var(--accent-gold);font-size:0.7rem"> +${iv}</span>` : '';
        return `<div style="text-align:center"><div style="font-size:0.7rem;color:${color}">${label}${ivStr}</div><div style="font-size:0.8rem;letter-spacing:-1px">${statData.html}</div></div>`;
    }

    document.getElementById(`dmg-${side}-stats`).innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:0.75rem;color:var(--text-dim)">${natureDisplayName ? `<span style="color:#82dba4">${natureDisplayName}</span>` : (t('neutral') || 'Neutral')}</span>
            <span style="font-size:0.75rem;color:var(--accent-gold);font-weight:700">${bstStars.total}★</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
            ${statCell('HP', 'var(--accent-green)', 'hp', ivs.hp)}
            ${statCell('ATK', 'var(--accent-cyan)', 'atk', ivs.atk)}
            ${statCell('DEF', 'var(--accent-cyan)', 'def', ivs.def)}
            ${statCell('SpA', 'var(--accent-pink)', 'satk', ivs.satk)}
            ${statCell('SpD', 'var(--accent-pink)', 'sdef', ivs.sdef)}
            ${statCell('SPE', 'var(--accent-orange)', 'spe', ivs.spe)}
        </div>
        ${isTrainerSide ? `<div style="font-size:0.75rem;color:var(--text-dim);text-align:center;border-top:1px solid var(--border);padding-top:6px">IVs: ${totalIVs}/36</div>` : ''}
    `;
    
    // Update sprite (shiny for attacker if checkbox is checked)
    const spriteEl = document.getElementById(`dmg-${side}-sprite`);
    if (spriteEl) {
        const isShiny = side === 'atk' && document.getElementById('dmg-atk-shiny')?.checked;
        spriteEl.src = sprite(pokemon.name, isShiny);
        spriteEl.style.display = 'block';
        spriteEl.onerror = function() { this.style.display = 'none'; };
    }
    
    // Update types display
    if (side === 'def') {
        const typesHtml = pokemon.types.map(t => typeBadge(t)).join(' ');
        document.getElementById('dmg-def-types').innerHTML = typesHtml || '-';
        updateThirdTypeOptions(pokemon.types);
        updateType3Warning(pokemon.types);
    }
    
    // Update HA display for both sides
    updateHADisplay(side, pokemon);
    
    // Update ability select
    updateAbilitySelect(side, pokemon);
    
    // Update item select (filter Mega Gems for non-Mega Pokemon)
    updateItemSelectForPokemon(side, pokemon);
}

function isAbilityGeneticallyObtainable(ability, pokemon) {
    // In genetic mode: ALL abilities are obtainable EXCEPT "Signature Only" abilities
    // Signature Only = exclusive to one Pokemon (cannot be transferred)
    if (!ability || !pokemon) return false;
    
    const abilityName = ability.name;
    
    // Check if ability is available via Memory item (always obtainable via Memory)
    const hasMemoryItem = Object.values(items).some(item => 
        item.type === 'memory' && item.ability === abilityName
    );
    if (hasMemoryItem) {
        return true;
    }
    
    // Check if this ability is Signature Only (untransferable)
    // Criteria: sort === 'signature' OR exclusive === true
    const sort = ability.sort || '';
    const exclusive = ability.exclusive || false;
    
    if (sort === 'signature' || exclusive === true) {
        return false;
    }
    
    // Count how many Pokemon can learn this ability naturally
    // If only 1 Pokemon can learn it, it's "Signature Only"
    let pokemonCount = 0;
    
    for (const p of Object.values(pokemons)) {
        if (p.hiddenAbility === abilityName) {
            pokemonCount++;
        }
        // Also check regular abilities if defined
        if (p.abilities && p.abilities.includes(abilityName)) {
            pokemonCount++;
        }
        // If more than 1 Pokemon can learn it, it's not signature-only
        if (pokemonCount > 1) {
            return true;
        }
    }
    
    // If 0 or 1 Pokemon can learn it naturally, it's signature-only
    if (pokemonCount <= 1) {
        return false;
    }
    
    return true;
}

// Track current pokemon for ability select to avoid rebuilding unnecessarily
let dmgCalcCurrentAttackerForAbility = null;
let dmgCalcCurrentDefenderForAbility = null;

function getNaturalAbilities(pokemon) {
    // Get abilities that pokemon can naturally have
    // Natural abilities = abilities that match the pokemon's types OR have type 'all'
    if (!pokemon || !pokemon.types) return [];
    
    return Object.values(abilities).filter(a => {
        // Skip if it's the HA (handled separately)
        if (pokemon.hiddenAbility && a.name === pokemon.hiddenAbility) return false;
        // Ability must have types
        if (!a.types || a.types.length === 0) return false;
        // Include abilities with type 'all' (universal abilities)
        if (a.types.includes('all')) return true;
        // Pokemon must share at least one type with the ability
        return a.types.some(t => pokemon.types.includes(t));
    });
}

function updateAbilitySelect(side, pokemon) {
    const abilitySelect = document.getElementById(`dmg-${side}-ability`);
    if (!abilitySelect) return;
    
    // Check if we need to rebuild - only if pokemon changed or genetic mode changed
    const currentTracker = side === 'atk' ? dmgCalcCurrentAttackerForAbility : dmgCalcCurrentDefenderForAbility;
    const trackerKey = `${pokemon.name}_${geneticMode}_${dmgCalcMode}`;
    
    if (currentTracker === trackerKey) {
        // No need to rebuild, but still update conditions
        if (side === 'atk') {
            updateAbilityConditions(pokemon, abilitySelect.value);
        }
        return;
    }
    
    // Update tracker
    if (side === 'atk') {
        dmgCalcCurrentAttackerForAbility = trackerKey;
    } else {
        dmgCalcCurrentDefenderForAbility = trackerKey;
    }
    
    // Keep current selection (only if it's still valid for this pokemon)
    const currentValue = abilitySelect.value;
    const naturalAbilities = getNaturalAbilities(pokemon);
    const naturalAbilityNames = new Set(naturalAbilities.map(a => a.name));
    
    const isCurrentValueValid = currentValue && (
        naturalAbilityNames.has(currentValue) ||
        (geneticMode && isAbilityGeneticallyObtainable(abilities[currentValue], pokemon))
    );
    
    // Build ability options
    const fragment = document.createDocumentFragment();
    
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '-- ' + t('none') + ' --';
    fragment.appendChild(noneOpt);
    
    // For attacker: show natural abilities + genetic abilities if enabled
    // HA is shown separately in the HA display, not in dropdown
    if (side === 'atk') {
        // Add natural abilities (based on pokemon types)
        naturalAbilities.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.textContent = a.displayName || format(a.name);
            fragment.appendChild(opt);
        });
        
        // In genetic mode, add genetically obtainable abilities
        if (geneticMode) {
            Object.values(abilities).forEach(a => {
                // Skip if already added (natural)
                if (naturalAbilityNames.has(a.name)) return;
                // Only add if genetically obtainable
                if (!isAbilityGeneticallyObtainable(a, pokemon)) return;
                const opt = document.createElement('option');
                opt.value = a.name;
                opt.textContent = (a.displayName || format(a.name)) + ' 🧬';
                fragment.appendChild(opt);
            });
        }
    }
    
    // For defender: only show ability in Trainer mode
    if (side === 'def' && dmgCalcMode === 'raid') {
        // Add natural abilities
        naturalAbilities.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.textContent = a.displayName || format(a.name);
            fragment.appendChild(opt);
        });
        
        // In genetic mode for defender in trainer mode
        if (geneticMode) {
            Object.values(abilities).forEach(a => {
                // Skip if already added
                if (naturalAbilityNames.has(a.name)) return;
                // Only add if genetically obtainable
                if (!isAbilityGeneticallyObtainable(a, pokemon)) return;
                const opt = document.createElement('option');
                opt.value = a.name;
                opt.textContent = (a.displayName || format(a.name)) + ' 🧬';
                fragment.appendChild(opt);
            });
        }
    }
    
    abilitySelect.innerHTML = '';
    abilitySelect.appendChild(fragment);
    
    // Restore selection if it was valid for the new pokemon
    if (isCurrentValueValid && abilitySelect.querySelector(`option[value="${currentValue}"]`)) {
        abilitySelect.value = currentValue;
    }
    
    // Update ability conditions UI
    if (side === 'atk') {
        updateAbilityConditions(pokemon, abilitySelect.value);
    }
}

// Update nature select options based on Pokemon stats (v4.8)
// Adamant only available if ATK <= SATK
// Modest only available if ATK >= SATK
function updateNatureSelect(side, pokemon) {
    const natureSelect = document.getElementById(`dmg-${side}-nature`);
    if (!natureSelect || !GAME_CONFIG.NATURES) return;
    
    // Save current selection
    const currentValue = natureSelect.value;
    
    // Check if current nature is still valid
    const isCurrentValid = !currentValue || isNatureAvailable(pokemon, currentValue);
    
    // Build nature options
    const fragment = document.createDocumentFragment();
    
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = t('neutral') || 'Neutre';
    fragment.appendChild(noneOpt);
    
    // Add each nature if available for this Pokemon
    Object.entries(GAME_CONFIG.NATURES).forEach(([natureKey, natureData]) => {
        if (!isNatureAvailable(pokemon, natureKey)) return;
        
        const opt = document.createElement('option');
        opt.value = natureKey;
        
        // Build description with stat changes
        const changes = [];
        if (natureData.atk === 1) changes.push('+Atk');
        if (natureData.atk === -1) changes.push('-Atk');
        if (natureData.satk === 1) changes.push('+SpA');
        if (natureData.satk === -1) changes.push('-SpA');
        if (natureData.def === 1) changes.push('+Def');
        if (natureData.def === -1) changes.push('-Def');
        if (natureData.sdef === 1) changes.push('+SpD');
        if (natureData.sdef === -1) changes.push('-SpD');
        if (natureData.spe === 1) changes.push('+Spe');
        if (natureData.spe === -1) changes.push('-Spe');
        if (natureData.hp === 1) changes.push('+HP');
        if (natureData.hp === -1) changes.push('-HP');
        
        const name = natureData.name?.[currentLang] || format(natureKey);
        opt.textContent = changes.length > 0 ? `${name} (${changes.join(', ')})` : name;
        
        fragment.appendChild(opt);
    });
    
    natureSelect.innerHTML = '';
    natureSelect.appendChild(fragment);
    
    // Restore selection if still valid, otherwise reset to neutral
    if (isCurrentValid && currentValue && natureSelect.querySelector(`option[value="${currentValue}"]`)) {
        natureSelect.value = currentValue;
    } else {
        natureSelect.value = '';
    }
}

// Update 3rd type dropdown options based on defender's current types
// Prevents adding a type that the Pokemon already has
function updateThirdTypeOptions(existingTypes) {
    const type3Select = document.getElementById('dmg-def-type3');
    if (!type3Select) return;
    
    // Save current selection
    const currentValue = type3Select.value;
    
    // All possible types that can be added via signature moves
    const availableTypes = [
        { value: '', label: t('noneOption') },
        { value: 'fairy', label: 'Fairy' },
        { value: 'electric', label: 'Electric' },
        { value: 'grass', label: 'Grass' },
        { value: 'ghost', label: 'Ghost' },
        { value: 'water', label: 'Water' },
        { value: 'psychic', label: 'Psychic' },
        { value: 'ground', label: 'Ground' }
    ];
    
    // Filter out types already present on the Pokemon
    const existingTypesSet = new Set(existingTypes);
    const filteredTypes = availableTypes.filter(t => !existingTypesSet.has(t.value));
    
    // Rebuild dropdown
    type3Select.innerHTML = '';
    filteredTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = t.label;
        type3Select.appendChild(opt);
    });
    
    // Restore selection if still valid, otherwise reset to empty
    if (currentValue && !existingTypesSet.has(currentValue)) {
        type3Select.value = currentValue;
    } else {
        type3Select.value = '';
    }
}

// Update type3 warning display based on whether the selected type3 already exists on defender
function updateType3Warning(defenderTypes) {
    const type3Select = document.getElementById('dmg-def-type3');
    const warningEl = document.getElementById('dmg-type3-warning');
    if (!type3Select || !warningEl) return;
    
    const selectedType3 = type3Select.value;
    const type3AlreadyExists = selectedType3 && defenderTypes && defenderTypes.includes(selectedType3);
    
    warningEl.style.display = type3AlreadyExists ? 'block' : 'none';
}

// Update item dropdown based on selected Pokemon
// If Pokemon is a Mega: show only its specific Mega Gem
// If Pokemon is not a Mega: hide all Mega Gems
function updateItemSelectForPokemon(side, pokemon) {
    const itemSelect = document.getElementById(`dmg-${side}-item`);
    if (!itemSelect) return;
    
    const isMega = pokemon.name?.startsWith('mega');
    const specificMegaGem = isMega ? megaToGemMap[pokemon.name] : null;
    
    // Save current selection
    const currentValue = itemSelect.value;
    
    // Rebuild options
    itemSelect.innerHTML = `<option value="">${t('noAbility')}</option>`;
    
    // Filter items
    const heldItems = Object.values(items).filter(i => {
        // Non-combat items (shiny charm, incense, etc.) - never show
        if (nonCombatItems.has(i.name)) return false;
        // Berries are defensive - hide them for attacker side only
        // Check both sort and name ending with 'Berry' to be safe
        const isBerry = i.sort === 'berry' || i.name.toLowerCase().endsWith('berry');
        if (isBerry && side === 'atk') return false;
        // For Mega Gems: only show if it matches this specific Mega Pokemon
        if (megaGemMap[i.name]) {
            return isMega && i.name === specificMegaGem;
        }
        // Always show held items, power items, damage items (but NOT berries)
        if ((i.type === 'held' && !isBerry) || i.power || i.damage) return true;
        return false;
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    heldItems.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.name;
        opt.textContent = i.displayName;
        itemSelect.appendChild(opt);
    });
    
    // Restore selection if still valid
    if (currentValue && itemSelect.querySelector(`option[value="${currentValue}"]`)) {
        itemSelect.value = currentValue;
    }
}

// Handle ability change
function onAbilityChange() {
    const atkName = document.getElementById('dmg-atk-pokemon')?.value;
    const abilityName = document.getElementById('dmg-atk-ability')?.value;
    if (atkName && pokemons[atkName]) {
        updateAbilityConditions(pokemons[atkName], abilityName);
    }
    // Update multihit selector in case Skill Link was added/removed
    const pokemonName = document.getElementById('dmg-atk-pokemon')?.value;
    if (pokemonName && pokemons[pokemonName]) {
        updateMultihitSelector(pokemons[pokemonName]);
    }
    updateDamageCalc();
}

// Handle item change
function onItemChange() {
    // Update multihit selector in case Loaded Dice was added/removed
    const pokemonName = document.getElementById('dmg-atk-pokemon')?.value;
    if (pokemonName && pokemons[pokemonName]) {
        updateMultihitSelector(pokemons[pokemonName]);
    }
    updateDamageCalc();
}

// Update multihit selector visibility (independent of ability conditions)
function updateMultihitVisibility() {
    const multihitSelector = document.getElementById('dmg-multihit-selector');
    if (!multihitSelector) return;
    
    const needsMultihit = pokemonHasMultihitMove();
    if (needsMultihit) {
        multihitSelector.style.display = 'block';
        const pokemonName = document.getElementById('dmg-atk-pokemon')?.value;
        if (pokemonName && pokemons[pokemonName]) {
            updateMultihitSelector(pokemons[pokemonName]);
        }
    } else {
        multihitSelector.style.display = 'none';
    }
}

// Update ability conditional UI (cross-type label, ambidextrous, supreme overlord)
function updateAbilityConditions(pokemon, abilityName) {
    const crossTypeLabel = document.querySelector('#dmg-cross-type-section label span');
    const ambidextrousBonus = document.getElementById('dmg-ambidextrous-bonus');
    const supremeOverlordSection = document.getElementById('dmg-supreme-overlord-section');

    // Update cross-type label based on Ambidextrous ability
    const isAmbidextrous = abilityName === 'ambidextrous';
    if (crossTypeLabel) {
        crossTypeLabel.textContent = isAmbidextrous
            ? (t('crossMoveBonus') || 'Cross-type move (+0.3 bonus)')
            : (t('crossMove') || 'Cross-type move (+30%)');
    }

    // Show/hide Ambidextrous bonus info
    if (ambidextrousBonus) {
        ambidextrousBonus.style.display = isAmbidextrous ? 'block' : 'none';
    }

    // Show/hide Supreme Overlord counter (check both dropdown ability and HA with toggle)
    if (supremeOverlordSection) {
        const haEnabled = document.getElementById('dmg-ha-toggle')?.checked !== false;
        const isSupremeOverlord = abilityName === 'supremeOverlord' || (haEnabled && pokemon && pokemon.hiddenAbility === 'supremeOverlord');
        supremeOverlordSection.style.display = isSupremeOverlord ? 'flex' : 'none';
    }
}

// Check if current move has multihit
function pokemonHasMultihitMove() {
    const moveName = document.getElementById('dmg-atk-move')?.value;
    const move = getEnrichedMoveData(moveName);
    if (!moveName || !move) return false;
    return !!move.multihit;
}

// Update multihit selector based on move and abilities/items
function updateMultihitSelector(pokemon) {
    const selector = document.getElementById('dmg-multihit-selector');
    const countSelect = document.getElementById('dmg-multihit-count');
    const infoSpan = document.getElementById('dmg-multihit-info');
    const moveName = document.getElementById('dmg-atk-move')?.value;
    
    const move = getEnrichedMoveData(moveName);
    if (!selector || !countSelect || !moveName || !move || !move.multihit) {
        if (selector) selector.style.display = 'none';
        return;
    }
    const [minHits, maxHits] = move.multihit;
    
    // Safety check: validate multihit values
    if (!Array.isArray(move.multihit) || move.multihit.length !== 2 || 
        typeof minHits !== 'number' || typeof maxHits !== 'number' ||
        minHits < 1 || maxHits < minHits) {
         // console.warn('Invalid multihit data for move:', moveName, move.multihit);
        if (selector) selector.style.display = 'none';
        return;
    }
    
    const abilityName = document.getElementById('dmg-atk-ability')?.value;
    const itemName = document.getElementById('dmg-atk-item')?.value;
    
    // Check for Skill Link or Loaded Dice forcing max hits
    const hasSkillLink = abilityName === 'skillLink';
    const hasLoadedDice = itemName === 'loadedDice';
    const forcedToMax = hasSkillLink || hasLoadedDice;
    
    // Preserve current selection before rebuilding (if within new range)
    const currentValue = parseInt(countSelect.value) || 0;
    
    // Clear existing options and rebuild
    countSelect.innerHTML = '';
    
    // Update options based on min/max
    for (let i = minHits; i <= maxHits; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        const hitText = i === 1 ? (t('hit') || 'hit') : (t('hits') || 'hits');
        opt.textContent = i + ' ' + hitText;
        countSelect.appendChild(opt);
    }
    
    // Determine which value to select
    let selectedValue;
    if (forcedToMax) {
        selectedValue = maxHits;
    } else if (currentValue >= minHits && currentValue <= maxHits) {
        selectedValue = currentValue; // Preserve user's choice if valid
    } else {
        selectedValue = minHits; // Default to min
    }
    
    // Set the value
    countSelect.value = selectedValue;
    
    // Show selector
    selector.style.display = 'block';
    
    // Lock if forced to max
    if (forcedToMax) {
        countSelect.disabled = true;
        infoSpan.textContent = hasSkillLink ? '(Skill Link: Max hits)' : '(Loaded Dice: Max hits)';
    } else {
        countSelect.disabled = false;
        const minText = t('min') || 'Min';
        const maxText = t('max') || 'Max';
        infoSpan.textContent = `${minText}: ${minHits}, ${maxText}: ${maxHits}`;
    }
    
    // Trigger calculation if all fields are filled (in case the hit count changed)
    const atkName = document.getElementById('dmg-atk-pokemon')?.value;
    const defName = document.getElementById('dmg-def-pokemon')?.value;
    const currentMoveName = document.getElementById('dmg-atk-move')?.value;
    if (atkName && defName && currentMoveName) {
        calculateDamage();
    }
}

// Check if current move has buildup
function pokemonHasBuildupMove() {
    const moveName = document.getElementById('dmg-atk-move')?.value;
    const move = getEnrichedMoveData(moveName);
    if (!moveName || !move) return false;
    return move.buildupMult != null && move.buildupMax != null;
}

// Update buildup selector visibility
function updateBuildupVisibility() {
    const buildupSelector = document.getElementById('dmg-buildup-selector');
    if (!buildupSelector) return;

    if (pokemonHasBuildupMove()) {
        buildupSelector.style.display = 'block';
        updateBuildupSelector();
    } else {
        buildupSelector.style.display = 'none';
    }
}

// Update buildup selector based on move
function updateBuildupSelector() {
    const selector = document.getElementById('dmg-buildup-selector');
    const countSelect = document.getElementById('dmg-buildup-count');
    const infoSpan = document.getElementById('dmg-buildup-info');
    const moveName = document.getElementById('dmg-atk-move')?.value;

    const move = getEnrichedMoveData(moveName);
    if (!selector || !countSelect || !moveName || !move || !move.buildupMult) {
        if (selector) selector.style.display = 'none';
        return;
    }
    const mult = move.buildupMult;
    const maxStacks = move.buildupMax;

    // Preserve current selection
    const currentValue = parseInt(countSelect.value) || 0;

    // Clear and rebuild options (0 to maxStacks)
    countSelect.innerHTML = '';
    for (let i = 0; i <= maxStacks; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        const powerMult = Math.pow(mult, i);
        opt.textContent = i === 0 ? (t('buildupNone') || '0 (base)') : `${i} (x${powerMult.toFixed(2)})`;
        countSelect.appendChild(opt);
    }

    // Restore selection if valid
    if (currentValue >= 0 && currentValue <= maxStacks) {
        countSelect.value = currentValue;
    } else {
        countSelect.value = 0;
    }

    // Info text
    infoSpan.textContent = `x${mult} / ${t('max') || 'Max'}: ${maxStacks}`;

    selector.style.display = 'block';
}

// Map des items et leurs types associés (pour les items boostant un type spécifique)
const itemTypeMap = {
    'blackBelt': 'fighting', 'blackGlasses': 'dark', 'charcoal': 'fire', 'dragonFang': 'dragon',
    'fairyFeather': 'fairy', 'hardStone': 'rock', 'magnet': 'electric', 'metalCoat': 'steel',
    'miracleSeed': 'grass', 'mysticWater': 'water', 'neverMeltIce': 'ice', 'poisonBarb': 'poison',
    'sharpBeak': 'flying', 'silkScarf': 'normal', 'silverPowder': 'bug', 'softSand': 'ground',
    'spellTag': 'ghost', 'twistedSpoon': 'psychic'
};

// Map des baies et leurs types associés
const berryTypeMap = {
    'occaBerry': 'fire', 'passhoBerry': 'water', 'wacanBerry': 'electric', 'rindoBerry': 'grass',
    'yacheBerry': 'ice', 'chopleBerry': 'fighting', 'kebiaBerry': 'poison', 'shucaBerry': 'ground',
    'cobaBerry': 'flying', 'payapaBerry': 'psychic', 'tangaBerry': 'bug', 'chartiBerry': 'rock',
    'kasibBerry': 'ghost', 'habanBerry': 'dragon', 'colburBerry': 'dark', 'babiriBerry': 'steel',
    'roseliBerry': 'fairy'
};

// Map des gems et leurs types associés
const gemTypeMap = {
    'bugGem': 'bug', 'darkGem': 'dark', 'dragonGem': 'dragon', 'electricGem': 'electric',
    'fairyGem': 'fairy', 'fightingGem': 'fighting', 'fireGem': 'fire', 'flyingGem': 'flying',
    'ghostGem': 'ghost', 'grassGem': 'grass', 'groundGem': 'ground', 'iceGem': 'ice',
    'normalGem': 'normal', 'poisonGem': 'poison', 'psychicGem': 'psychic', 'rockGem': 'rock',
    'steelGem': 'steel', 'waterGem': 'water'
};

// Mega Gems - boost specific Pokemon up to 1.65x at max level
// Format: itemName -> megaPokemonName (the mega form that gets boosted)
const megaGemMap = {
    'venusaurite': 'megaVenusaur',
    'charizarditeX': 'megaCharizardX',
    'charizarditeY': 'megaCharizardY',
    'blastoisinite': 'megaBlastoise',
    'beedrillite': 'megaBeedrill',
    'pidgeotite': 'megaPidgeot',
    'alakazite': 'megaAlakazam',
    'slowbronite': 'megaSlowbro',
    'gengarite': 'megaGengar',
    'kangaskhanite': 'megaKangaskhan',
    'pinsirite': 'megaPinsir',
    'gyaradosite': 'megaGyarados',
    'aerodactylite': 'megaAerodactyl',
    'mewtwoniteX': 'megaMewtwoX',
    'mewtwoniteY': 'megaMewtwoY',
    'ampharosite': 'megaAmpharos',
    'steelixite': 'megaSteelix',
    'scizorite': 'megaScizor',
    'heracronite': 'megaHeracross',
    'houndoominite': 'megaHoundoom',
    'tyranitarite': 'megaTyranitar',
    'blazikenite': 'megaBlaziken',
    'gardevoirite': 'megaGardevoir',
    'mawilite': 'megaMawile',
    'aggronite': 'megaAggron',
    'medichamite': 'megaMedicham',
    'manectite': 'megaManectric',
    'sharpedonite': 'megaSharpedo',
    'cameruptite': 'megaCamerupt',
    'altarianite': 'megaAltaria',
    'banettite': 'megaBanette',
    'absolite': 'megaAbsol',
    'glalitite': 'megaGlalie',
    'salamencite': 'megaSalamence',
    'metagrossite': 'megaMetagross',
    'latiasite': 'megaLatias',
    'latiosite': 'megaLatios',
    'lopunnite': 'megaLopunny',
    'garchompite': 'megaGarchomp',
    'lucarionite': 'megaLucario',
    'abomasite': 'megaAbomasnow',
    'galladite': 'megaGallade',
    'audinite': 'megaAudino',
    'diancite': 'megaDiancie'
};

// Inverse map: megaPokemonName -> megaGemItemName
const megaToGemMap = Object.fromEntries(
    Object.entries(megaGemMap).map(([item, pokemon]) => [pokemon, item])
);

// Items that don't affect combat damage (breeding, shiny hunting, exp, etc.)
const nonCombatItems = new Set([
    'luckIncense',   // Rare item drops
    'pureIncense',   // Rare pokemon encounters
    'luckyEgg',      // Experience boost
    'shinyCharm',    // Shiny encounter rate
    'sootheBell',    // Friendship (affection)
    'cleanseTag',    // Repel wild pokemon
    'smokeBall',     // Escape from wild pokemon
    'escapeRope'     // Escape from dungeon
]);

// Item multipliers for attacker
function getAttackerItemMultiplier(itemName, level, move, pokemonName) {
    if (!itemName || !items[itemName]) return 1;
    
    // ==== PARSED FORMULAS (from game files) ====
    const parsedFormula = PARSED_ITEM_DAMAGE_FORMULAS[itemName];
    
    // Mega Gems - boost specific Pokemon (same formula for all: 1.15 + 0.1 * level)
    const megaGemTarget = megaGemMap[itemName];
    if (megaGemTarget && pokemonName === megaGemTarget) {
        // Use parsed formula if available, otherwise fallback
        if (parsedFormula) return parsedFormula.base + (parsedFormula.coefficient * level);
        // Fallback: Formula from itemDictionary.js: 1.15 + 0.1 * level
        return 1.15 + 0.1 * level;
    }
    
    // Type items (blackBelt, charcoal, etc.) - power() = 1 + 0.1 * level
    // Only apply if move type matches item type
    const itemType = itemTypeMap[itemName];
    if (itemType && move.type === itemType) {
        if (parsedFormula) return parsedFormula.base + (parsedFormula.coefficient * level);
        return 1 + 0.1 * level; // fallback
    }
    
    // Gems - universal bonus regardless of move type (1 + 0.1 * level)
    const gemType = gemTypeMap[itemName];
    if (gemType) {
        if (parsedFormula) return parsedFormula.base + (parsedFormula.coefficient * level);
        return 1 + 0.1 * level; // fallback
    }
    
    // Loaded Dice - fixed multiplier for skillLink moves (parsed or fallback)
    if (itemName === 'loadedDice' && move.affectedBy?.includes('skillLink')) {
        // Loaded Dice doesn't have a simple power() formula for damage, it's for hit count
        // The damage boost is a fixed multiplier
        return 1.35; // buffed from 1.2
    }
    
    // ==== CONDITIONAL ITEMS WITH PARSED FORMULAS ====
    // Check if we have a parsed formula for this item
    if (parsedFormula) {
        // Check conditions for conditional items
        if (itemName === 'choiceBand' && move.split !== 'physical') return 1;
        if (itemName === 'choiceSpecs' && move.split !== 'special') return 1;
        if (itemName === 'luckyPunch' && !move.affectedBy?.includes('ironFist')) return 1;
        if (itemName === 'metronome' && move.buildup === undefined) return 1;
        if (itemName === 'laggingTail' && !move.affectedBy?.includes('reckless')) return 1;
        
        return parsedFormula.base + (parsedFormula.coefficient * level);
    }
    
    // ==== FALLBACK TO HARDCODED VALUES ====
    const boosts = { 
        lifeOrb: 0.2,           // power() = 1 + 0.2 * level
        flameOrb: 0.15,         // power() = 1 + 0.15 * level
        toxicOrb: 0.15,         // power() = 1 + 0.15 * level
        choiceBand: move.split === 'physical' ? 0.15 : 0,
        choiceSpecs: move.split === 'special' ? 0.15 : 0,
        ejectPack: 0.15,        // power() = 1 + 0.15 * level
        ejectButton: 0.15,      // power() = 1 + 0.15 * level
        lightClay: 0.06,        // power() = 1 + 0.06 * level
        weaknessPolicy: 0.06,   // power() = 1 + 0.06 * level
        luckyPunch: move.affectedBy?.includes('ironFist') ? 0.15 : 0,
        metronome: move.buildup !== undefined ? 0.2 : 0,
        laggingTail: move.affectedBy?.includes('reckless') ? 0.15 : 0
    };
    
    if (boosts[itemName]) {
        // Special cases with base multiplier
        if (itemName === 'metronome' && boosts[itemName] > 0) return 1.1 + 0.2 * level;
        if (itemName === 'laggingTail' && boosts[itemName] > 0) return 1.1 + 0.15 * level;
        if (itemName === 'luckyPunch' && boosts[itemName] > 0) return 1.1 + 0.15 * level;
        return 1 + boosts[itemName] * level;
    }
    
    return 1;
}

// Get stat buff multiplier (unified for attacker and defender)
// Buffs: 1 = 1.5x, 2 = 2.0x | Debuffs: -1 = /1.5, -2 = /2.0
const BUFF_MULTIPLIERS = { 
    '-2': 0.5, '-1': 1/1.5, 
    '0': 1, 
    '1': 1.5, '2': 2
};

// Helper function to find highest stat for Protosynthesis/Quark Drive (from explore.js)
function returnHighestStat(pokemon) {
    if (!pokemon || !pokemon.bst) return 'atk';
    // Game uses star ratings (1-6) not raw BST values (20-200) - see pkmnDictionary.js line 20218
    const stats = {
        hp: statToRating(pokemon.bst.hp),
        atk: statToRating(pokemon.bst.atk),
        def: statToRating(pokemon.bst.def),
        satk: statToRating(pokemon.bst.satk),
        sdef: statToRating(pokemon.bst.sdef),
        spe: statToRating(pokemon.bst.spe)
    };
    let highest = 'atk';
    let highestValue = stats.atk;
    for (const [stat, value] of Object.entries(stats)) {
        if (value > highestValue) {
            highest = stat;
            highestValue = value;
        }
    }
    return highest;
}

// Low HP abilities configuration (from explore.js)
const LOW_HP_ABILITY_TYPES = {
    overgrow: 'grass', blaze: 'fire', swarm: 'bug', torrent: 'water',
    bastion: 'steel', average: 'normal', resolve: 'fighting',
    mistify: 'psychic', hexerei: 'ghost', glimmer: 'fairy',
    skyward: 'flying', draconic: 'dragon', noxious: 'poison',
    solid: 'rock', rime: 'ice', voltage: 'electric'
};

// Ability modifiers based on move.affectedBy (from explore.js)
const ABILITY_AFFECTED_BY_MODIFIERS = {
    ironFist: { multiplier: 1.5 },
    strongJaw: { multiplier: 2.0 },
    toughClaws: { multiplier: 2.0 },
    sharpness: { multiplier: 1.5 },
    megaLauncher: { multiplier: 1.5 },
    metalhead: { multiplier: 1.5 }
};

// ============================================================================
// PARSED DAMAGE DATA FROM GAME FILES
// Automatically extracted from itemDictionary.js and moveDictionary.js
// ============================================================================

// Parsed item damage formulas (extracted from item.xxx.power() functions)
// Format: { base: number, coefficient: number, condition?: string }
const PARSED_ITEM_DAMAGE_FORMULAS = {};

// Parsed move damage data (extracted from moveDictionary.js)
// Format: { powerMod?: string, buildupMult?: number, buildupMax?: number, affectedBy?: [], unaffectedBy?: [] }
const PARSED_MOVE_DAMAGE_DATA = {};

// Parse item power formulas from raw game code
function parseItemDamageFormulas(itemCode) {
    const formulas = {};
    
    // Match: item.itemName = { ... power : function() { return ... } ... }
    const itemRegex = /item\.(\w+)\s*=\s*\{([^}]*power\s*:\s*function\(\)\s*\{[^}]+\}[^}]*)\}/gs;
    let match;
    
    while ((match = itemRegex.exec(itemCode)) !== null) {
        const itemName = match[1];
        const itemBody = match[0];
        
        // Extract power function body
        const powerMatch = itemBody.match(/power\s*:\s*function\(\)\s*\{([^}]+)\}/);
        if (powerMatch) {
            const powerBody = powerMatch[1].trim();
            
            // Parse formula: return 1+(0.1*returnItemLevel(this.id))
            // or: return 1+(returnItemLevel(this.id)/5)
            // or: return 1.1+(0.15*returnItemLevel(this.id))
            
            const formulaMatch = powerBody.match(/return\s+([\d.]+)\s*\+\s*\(([\d.]+)\s*\*\s*returnItemLevel/i);
            const formulaMatch2 = powerBody.match(/return\s+([\d.]+)\s*\+\s*\(returnItemLevel\([^)]+\)\s*\/\s*(\d+)\)/i);
            const formulaMatch3 = powerBody.match(/return\s+([\d.]+)\s*\+\s*\(([\d.]+)\*returnItemLevel/i);
            
            if (formulaMatch) {
                formulas[itemName] = {
                    base: parseFloat(formulaMatch[1]),
                    coefficient: parseFloat(formulaMatch[2]),
                    formula: `${formulaMatch[1]} + ${formulaMatch[2]} * level`
                };
            } else if (formulaMatch2) {
                formulas[itemName] = {
                    base: parseFloat(formulaMatch2[1]),
                    coefficient: 1 / parseFloat(formulaMatch2[2]),
                    formula: `${formulaMatch2[1]} + level / ${formulaMatch2[2]}`
                };
            } else if (formulaMatch3) {
                formulas[itemName] = {
                    base: parseFloat(formulaMatch3[1]),
                    coefficient: parseFloat(formulaMatch3[2]),
                    formula: `${formulaMatch3[1]} + ${formulaMatch3[2]} * level`
                };
            }
        }
    }
    
    return formulas;
}

// Parse move damage data from raw game code
function parseMoveDamageData(moveCode) {
    const moves = {};
    
    // Match: move.moveName = { ... }
    const moveRegex = /move\.(\w+)\s*=\s*\{/g;
    let match;
    
    while ((match = moveRegex.exec(moveCode)) !== null) {
        const moveName = match[1];
        const startPos = match.index;
        
        // Find matching closing brace
        let braceCount = 1;
        let pos = match.index + match[0].length;
        while (braceCount > 0 && pos < moveCode.length) {
            if (moveCode[pos] === '{') braceCount++;
            else if (moveCode[pos] === '}') braceCount--;
            pos++;
        }
        
        const moveBody = moveCode.substring(startPos, pos);
        
        const data = {};
        
        // Extract affectedBy
        const affectedByMatch = moveBody.match(/affectedBy\s*:\s*\[([^\]]*)\]/);
        if (affectedByMatch) {
            data.affectedBy = affectedByMatch[1].match(/ability\.(\w+)\.id/g)?.map(s => s.replace('ability.', '').replace('.id', '')) || [];
        }
        
        // Extract unaffectedBy
        const unaffectedByMatch = moveBody.match(/unaffectedBy\s*:\s*\[([^\]]*)\]/);
        if (unaffectedByMatch) {
            data.unaffectedBy = unaffectedByMatch[1].match(/ability\.(\w+)\.id/g)?.map(s => s.replace('ability.', '').replace('.id', '')) || [];
        }
        
        // Extract buildup
        const buildupMatch = moveBody.match(/buildup\s*:\s*(\d+)/);
        if (buildupMatch) {
            data.buildup = parseInt(buildupMatch[1]);
        }
        
        // Extract powerMod (store the function body for manual handling)
        const powerModMatch = moveBody.match(/powerMod\s*:\s*function\(\)\s*\{(.*}?)\}/);
        if (powerModMatch) {
            data.hasPowerMod = true;
            data.powerModBody = powerModMatch[1].trim();
        }
        
        // Extract timer
        const timerMatch = moveBody.match(/timer\s*:\s*([^,\n]+)/);
        if (timerMatch) {
            const timerValue = timerMatch[1].trim();
            if (timerValue.includes('/2')) data.timer = 'veryFast';
            else if (timerValue.includes('/1.5')) data.timer = 'veryFast'; // Jet Punch et autres moves 1.5x rapides
            else if (timerValue.includes('/1.2')) data.timer = 'fast';
            else if (timerValue.includes('*1.2')) data.timer = 'slow';
            else if (timerValue.includes('*1.4') || timerValue.includes('*1.5') || timerValue.includes('*2')) data.timer = 'verySlow';
        }
        
        moves[moveName] = data;
    }
    
    return moves;
}

// Get item multiplier using parsed formulas
function getParsedItemMultiplier(itemName, itemLevel) {
    const level = itemLevel || 5;
    
    // Check if we have parsed formula for this item
    const formula = PARSED_ITEM_DAMAGE_FORMULAS[itemName];
    if (formula) {
        return formula.base + (formula.coefficient * level);
    }
    
    // Fallback to hardcoded values for items that couldn't be parsed
    return null; // Return null to indicate we should use fallback
}

// Get enriched move data for damage calculation
// Combines existing move data with parsed damage-specific data
function getEnrichedMoveData(moveName) {
    const move = moves[moveName];
    if (!move) return null;
    
    // Get parsed damage data for this move
    const parsedData = PARSED_MOVE_DAMAGE_DATA[moveName] || {};
    
    // Merge existing data with parsed data
    return {
        ...move,
        // Ensure affectedBy includes both parsed and existing data
        affectedBy: [...(move.affectedBy || []), ...(parsedData.affectedBy || [])],
        unaffectedBy: [...(move.unaffectedBy || []), ...(parsedData.unaffectedBy || [])],
        // Add parsed-specific data
        hasPowerMod: parsedData.hasPowerMod || move.powerMod,
        powerModBody: parsedData.powerModBody,
        timer: parsedData.timer || move.timer
    };
}

// Update parsed data when game files are loaded
function updateParsedDamageData(rawItemCode, rawMoveCode) {
    // Parse items
    const itemFormulas = parseItemDamageFormulas(rawItemCode);
    Object.assign(PARSED_ITEM_DAMAGE_FORMULAS, itemFormulas);
    
    // Parse moves
    const moveData = parseMoveDamageData(rawMoveCode);
    Object.assign(PARSED_MOVE_DAMAGE_DATA, moveData);
    
     /* console.log('Parsed damage data updated:', {
        items: Object.keys(PARSED_ITEM_DAMAGE_FORMULAS).length,
        moves: Object.keys(PARSED_MOVE_DAMAGE_DATA).length
    }); */
}

function getPowerModValue(defenderId, atkEffects, defEffects, heldItem, attackerStatus, defenderStatus, powerMod) {
    "use strict";
    const mappedStatus = {poisoned : "poisoned", paralyzed: "paralysis", burned: "burn", frozen: "freeze", sleep: "sleep", confused: "confus" }

    //contexte général pour les fonctions issues du jeu
    let context = {}
    context.exploreActiveMember = 0;
    context.team = [];
    context.team[context.exploreActiveMember] = {};
    context.team[context.exploreActiveMember].item = heldItem !== "" ? heldItem : undefined;
    if (attackerStatus !== "") atkEffects[mappedStatus[attackerStatus]] = 1;
    if (defenderStatus !== "") defEffects[mappedStatus[defenderStatus]] = 1;
    /* buff & status in game
       {atkup1: 0, atkup2: 0, atkdown1: 0, atkdown2: 0, satkup1: 0, satkup2: 0, satkdown1: 0, satkdown2: 0,
       defup1: 0, defup2: 0, defdown1: 0, defdown2: 0, sdefup1: 0, sdefup2: 0, sdefdown1: 0, sdefdown2: 0,
       speup1: 0, speup2: 0, spedown1: 0, spedown2: 0, burn: 0, paralysis: 0, sleep: 0, poisoned: 0,
       freeze: 0, sleep: 0, confus: 0};*/

    // suppression de tous les effets non impactés
    context.team[context.exploreActiveMember].buffs = Object.keys(atkEffects).filter(key => atkEffects[key] != 0)
    context.team[context.exploreActiveMember].buffs = context.team[context.exploreActiveMember].buffs.length > 0
                                                    ? context.team[context.exploreActiveMember].buffs.reduce((r, key) => ({ ...r, [key]: atkEffects[key]}), {})
                                                    : {};
    context.wildBuffs = Object.keys(defEffects).filter(key => defEffects[key] != 0)
    context.wildBuffs = context.wildBuffs.length > 0
                      ? context.wildBuffs.reduce((r, key) => ({ ...r, [key]: defEffects[key]}), {})
                      : {};
    context.saved = {currentPkmn: 0};
    context.pkmn = { 0: {type: pokemons[defenderId].types}};

    let powerModMult = new Function(...Object.keys(context), powerMod);

    let mod = 0;
    try {
        mod = powerModMult(...Object.values(context))
    }catch(e) {
        // console.log(e);
    }finally{
        return mod || 1;
    }
}

function calculateDamage() {
    try {
    const atkName = document.getElementById('dmg-atk-pokemon').value;
    const defName = document.getElementById('dmg-def-pokemon').value;
    const moveName = document.getElementById('dmg-atk-move').value;

    let hpContainer = document.getElementById('dmg-def-hp-container');
    const resultEl = document.getElementById('dmg-result');
    const breakdownEl = document.getElementById('dmg-breakdown');

    if ((!atkName || !defName || !moveName)) {
        if (hpContainer) hpContainer.style.display = 'none';
        return;
    }

    const attacker = pokemons[atkName];
    const defender = pokemons[defName];
    
    const move = getEnrichedMoveData(moveName);
    
    if (!move || !move.power || move.power <= 0) {
        if (resultEl) resultEl.textContent = '0';
        if (breakdownEl) breakdownEl.textContent = t('statusMoveNoDamage') || 'Attaque de statut - Pas de dégâts';
        if (hpContainer) hpContainer.style.display = 'none';
        return;
    }

    const atkLevel = parseInt(document.getElementById('dmg-atk-level').value) || 100;
    const defLevel = parseInt(document.getElementById('dmg-def-level').value) || 100;

    // --- Collecte des paramètres ---
    let atkAbility = document.getElementById('dmg-atk-ability')?.value || '';
    const atkHiddenAbility = attacker.hiddenAbility || '';  // Hidden Ability du Pokemon
    const atkItem = document.getElementById('dmg-atk-item')?.value || '';
    const atkStatus = document.getElementById('dmg-atk-status')?.value || '';
    const defStatus = document.getElementById('dmg-def-status')?.value || '';
    
    // Cooking Buffs (Raid only) - up to 3 ingredients that ADD to normal abilities
    const cookingBuffs = [];
    if (dmgCalcMode === 'raid') {
        for (let i = 1; i <= 3; i++) {
            const buff = document.getElementById(`dmg-cooking-buff-${i}`)?.value || '';
            if (buff) cookingBuffs.push(buff);
        }
    }
    
    // Fonction pour tester si une ability est active (normale, Hidden Ability, PLUS Cooking Buffs)
    // Cooking buffs ADD to normal abilities (don't replace)
    const haEnabled = document.getElementById('dmg-ha-toggle')?.checked !== false;
    function testAttackerAbility(abilityName) {
        if (!abilityName) return false;
        // Check normal ability or hidden ability
        const hasNormalAbility = atkAbility === abilityName || (haEnabled && atkHiddenAbility === abilityName);
        // Check cooking buffs (they add to normal abilities)
        const hasCookingBuff = dmgCalcMode === 'raid' && cookingBuffs.includes(abilityName);
        // Return true if either normal ability or cooking buff
        return hasNormalAbility || hasCookingBuff;
    }
    // Helper pour formater le label avec indication cooking (orange si buff cuisine)
    function abilityLabel(abilityName, label) {
        if (dmgCalcMode === 'raid' && cookingBuffs.includes(abilityName)) {
            return `<span style="color:#ff9800">${label}</span>`;
        }
        return label;
    }
    const atkItemLvl = parseInt(document.getElementById('dmg-atk-item-lvl')?.value) || 5;
    const hpThreshold = document.getElementById('dmg-hp-threshold')?.value || 'normal';
    const weather = document.getElementById('dmg-weather')?.value || '';
    const isShiny = document.getElementById('dmg-atk-shiny')?.checked || false;
    const isCrossMove = document.getElementById('dmg-is-cross-move')?.checked || false;

    const atkIVs = {
        hp: getIVsForStat('atk', 'hp'), atk: getIVsForStat('atk', 'atk'),
        def: getIVsForStat('atk', 'def'), satk: getIVsForStat('atk', 'satk'),
        sdef: getIVsForStat('atk', 'sdef'), spe: getIVsForStat('atk', 'spe')
    };
    const defIVs = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };

    let type3 = document.getElementById('dmg-def-type3')?.value || '';
    let defenderTypes = [...defender.types];
    
    // Check if type3 is already present on the defender (per game logic: if type already exists, temporalType does nothing)
    const type3AlreadyExists = type3 && defender.types.includes(type3);
    if (type3AlreadyExists) {
        type3 = ''; // Treat as no type3 if already present
    }
    
    if (type3) defenderTypes.push(type3);

    // Buffs individuels
    const atkBuff1 = parseInt(document.getElementById('dmg-atk-buff-atk')?.value) || 0;
    const atkBuff2 = parseInt(document.getElementById('dmg-atk-buff-atk-2')?.value) || 0;
    const defAtkBuff1 = parseInt(document.getElementById('dmg-atk-buff-def')?.value) || 0;
    const defAtkBuff2 = parseInt(document.getElementById('dmg-atk-buff-def-2')?.value) || 0;
    const satkBuff1 = parseInt(document.getElementById('dmg-atk-buff-satk')?.value) || 0;
    const satkBuff2 = parseInt(document.getElementById('dmg-atk-buff-satk-2')?.value) || 0;
    const speAtkBuff1 = parseInt(document.getElementById('dmg-atk-buff-spe')?.value) || 0;
    const speAtkBuff2 = parseInt(document.getElementById('dmg-atk-buff-spe-2')?.value) || 0;
    const defBuff1 = parseInt(document.getElementById('dmg-def-buff-def')?.value) || 0;
    const defBuff2 = parseInt(document.getElementById('dmg-def-buff-def-2')?.value) || 0;
    const sdefBuff1 = parseInt(document.getElementById('dmg-def-buff-sdef')?.value) || 0;
    const sdefBuff2 = parseInt(document.getElementById('dmg-def-buff-sdef-2')?.value) || 0;

    const usesDefAsAtk = move.usesDefAsAtk || GAME_CONFIG.DEF_AS_ATK_MOVES.includes(move.name);

    // Stats d'attaque/défense - Conversion en étoiles (comme dans le jeu)
    // Le jeu convertit les BST (20-200) en étoiles (1-6) dans pkmnDictionary.js ligne 20218
    // Voir: for (const stat in bst) { bst[stat] = statToRating(bst[stat]); }
    let attackerStat, defenderStat;

    if (move.split === 'special') {
        attackerStat = statToRating(attacker.bst.satk);
        defenderStat = statToRating(defender.bst.sdef);
    } else if (usesDefAsAtk) {
        attackerStat = statToRating(attacker.bst.def);
        defenderStat = statToRating(defender.bst.def);
    } else {
        attackerStat = statToRating(attacker.bst.atk);
        defenderStat = statToRating(defender.bst.def);
    }

    // Apply Attacker Nature (v4.8) - modify BST stats by ±1
    // Defender has no nature in this game
    const atkNature = document.getElementById('dmg-atk-nature')?.value || '';
    
    if (atkNature && GAME_CONFIG.NATURES[atkNature]) {
        const nature = GAME_CONFIG.NATURES[atkNature];
        // Apply buffs/debuffs based on nature
        if (move.split === 'special') {
            if (nature.satk === +1) attackerStat += 1;
            if (nature.satk === -1) attackerStat = Math.max(1, attackerStat - 1);
        } else if (!usesDefAsAtk) {
            if (nature.atk === +1) attackerStat += 1;
            if (nature.atk === -1) attackerStat = Math.max(1, attackerStat - 1);
        }
        if (usesDefAsAtk || move.split !== 'special') {
            if (nature.def === +1) defenderStat += 1; // For Body Press style moves
        }
    }

    // Weird Room: réduit les stats BST de 2 (min 1)
    // explore.js: Math.max(attackerStars-2, 1) où attackerStars = bst.atk
    if (weather === 'weirdRoom') {
        attackerStat = Math.max(attackerStat - 2, 1);
        defenderStat = Math.max(defenderStat - 2, 1);
    }
    
    // Ensure stats are integers (rounded)
    attackerStat = Math.round(attackerStat);
    defenderStat = Math.round(defenderStat);

    // === CALCUL UNIFIE avec breakdown détaillé ===
    // Chaque étape enregistre: { label, mult (ou add), value (dégâts à cette étape) }
    const steps = [];

    // Get multihit count early (affects base power)
    // explore.js lignes 2339-2343: skillLink force max, loadedDice ajoute des coups
    let hitCount = 1;
    if (move.multihit) {
        const [minHits, maxHits] = move.multihit;
        
        // Skill Link: force max hits (explore.js ligne 2341)
        if (testAttackerAbility('skillLink')) {
            hitCount = maxHits;
        } else {
            // Sinon, utiliser la valeur sélectionnée ou min par défaut
            const countSelect = document.getElementById('dmg-multihit-count');
            hitCount = countSelect ? (parseInt(countSelect.value) || minHits) : minHits;
            
            // Loaded Dice: ajoute des coups (explore.js ligne 2342)
            // loadedDice.power() = 1 + 0.4 * level, mais l'effet est d'ajouter des coups
            // Simplifié: +2 coups avec Loaded Dice, limité au max
            if (atkItem === 'loadedDice') {
                const loadedDiceBonus = 2;  // Approximation
                hitCount = Math.min(hitCount + loadedDiceBonus, maxHits);
            }
        }
        
        if (hitCount < minHits) hitCount = minHits;
        if (hitCount > maxHits) hitCount = maxHits;
    }

    // 1. Puissance de base
    let movePower = move.power;
    
    // 1a. powerMod - certaines attaques ont une fonction de modification de puissance
    // explore.js ligne 2313: if (nextMove.powerMod) movePower *= nextMove.powerMod()
    function getRightBuff(buff1, buff2, level){
        if (level == 2) return buff1 == 2 ? buff1 : 0;
        return (buff1 == 1 || buff2 == 1) ? 1 : 0;
    }
    if (move.hasPowerMod) {
        try {
            //const powerModMult = move.powerMod();
            let atkBuffs = {atkup1: getRightBuff(atkBuff1, atkBuff2, 1), atkup2: getRightBuff(atkBuff1, atkBuff2, 2), atkdown1: 0, atkdown2: 0, satkup1: getRightBuff(satkBuff1, satkBuff2, 1), satkup2: getRightBuff(satkBuff1, satkBuff2, 2), satkdown1: 0, satkdown2: 0,
                            defup1: getRightBuff(defAtkBuff1, defAtkBuff2, 1), defup2: getRightBuff(defAtkBuff1, defAtkBuff2, 2), defdown1: 0, defdown2: 0, sdefup1: 0, sdefup2: 0, sdefdown1: 0, sdefdown2: 0,
                            speup1: getRightBuff(speAtkBuff1, speAtkBuff2, 1), speup2: getRightBuff(speAtkBuff1, speAtkBuff2, 2), spedown1: 0, spedown2: 0, burn: 0, paralysis: 0, sleep: 0, poisoned: 0};
            let defBuffs = {atkup1: 0, atkup2: 0, atkdown1: 0, atkdown2: 0, satkup1: 0, satkup2: 0, satkdown1: 0, satkdown2: 0,
                            defup1: getRightBuff(defBuff1, defBuff2, 1), defup2: getRightBuff(defBuff1, defBuff2, 2), defdown1: 0, defdown2: 0, sdefup1: getRightBuff(sdefBuff1, sdefBuff2, 1), sdefup2: getRightBuff(sdefBuff1, sdefBuff2, 2), sdefdown1: 0, sdefdown2: 0,
                            speup1: 0, speup2: 0, spedown1: 0, spedown2: 0, burn: 0, paralysis: 0, sleep: 0, poisoned: 0};
            // Appliquer le statut du défenseur
            const mappedStatus = {poisoned: 'poisoned', paralyzed: 'paralysis', burned: 'burn', frozen: 'freeze', sleep: 'sleep', confused: 'confus'};
            if (defStatus && mappedStatus[defStatus]) defBuffs[mappedStatus[defStatus]] = 1;
            const powerModMult = getPowerModValue(defender.name, atkBuffs, defBuffs, atkItem, atkStatus, defStatus, move.powerModBody)
            if (typeof powerModMult === 'number') {
                movePower *= powerModMult;
            }
        } catch (e) {
            // Ignorer les erreurs de powerMod
        }
    }
    
    // 1b. Assault Vest - force splash si power==0 (explore.js ligne 2353)
    if (atkItem === 'assaultVest' && movePower === 0) {
        if (resultEl) resultEl.textContent = '0';
        if (breakdownEl) breakdownEl.textContent = t('assaultVestBlocks');
        if (hpContainer) hpContainer.style.display = 'none';
        return;
    }
    
    steps.push({ label: t('dmgBasePower'), type: 'base', value: movePower });

    // 1b. Buildup multiplier (Rollout, Fury Cutter, etc.)
    if (move.buildupMult && move.buildupMax) {
        const buildupCount = parseInt(document.getElementById('dmg-buildup-count')?.value) || 0;
        if (buildupCount > 0) {
            const buildupMult = Math.pow(move.buildupMult, buildupCount);
            movePower *= buildupMult;
            steps.push({ label: `${t('dmgBuildup') || 'Buildup'} (${buildupCount}/${move.buildupMax})`, type: 'mult', mult: buildupMult, value: movePower });
        }
    }

    // 2. Bonus abilities sur la puissance de base (dans l'ordre du jeu explore.js)
    // Technician: 1.5x si power <= 60
    if (testAttackerAbility('technician') && movePower <= 60) {
        movePower *= 1.5;
        steps.push({ label: abilityLabel('technician', 'Technician'), type: 'mult', mult: 1.5, value: movePower });
    }
    // Iron Fist: 1.5x pour moves affectés
    if (testAttackerAbility('ironFist') && move.affectedBy?.includes('ironFist')) {
        movePower *= 1.5;
        steps.push({ label: abilityLabel('ironFist', 'Iron Fist'), type: 'mult', mult: 1.5, value: movePower });
    }
    // Strong Jaw: 2x pour moves affectés
    if (testAttackerAbility('strongJaw') && move.affectedBy?.includes('strongJaw')) {
        movePower *= 2;
        steps.push({ label: abilityLabel('strongJaw', 'Strong Jaw'), type: 'mult', mult: 2, value: movePower });
    }
    // Tough Claws: 2x pour moves affectés
    if (testAttackerAbility('toughClaws') && move.affectedBy?.includes('toughClaws')) {
        movePower *= 2;
        steps.push({ label: abilityLabel('toughClaws', 'Tough Claws'), type: 'mult', mult: 2, value: movePower });
    }
    // Sharpness: 1.5x pour moves affectés
    if (testAttackerAbility('sharpness') && move.affectedBy?.includes('sharpness')) {
        movePower *= 1.5;
        steps.push({ label: abilityLabel('sharpness', 'Sharpness'), type: 'mult', mult: 1.5, value: movePower });
    }
    // Mega Launcher: 1.5x pour moves affectés
    if (testAttackerAbility('megaLauncher') && move.affectedBy?.includes('megaLauncher')) {
        movePower *= 1.5;
        steps.push({ label: abilityLabel('megaLauncher', 'Mega Launcher'), type: 'mult', mult: 1.5, value: movePower });
    }
    // Metalhead: 1.5x pour moves affectés
    if (testAttackerAbility('metalhead') && move.affectedBy?.includes('metalhead')) {
        movePower *= 1.5;
        steps.push({ label: abilityLabel('metalhead', 'Metalhead'), type: 'mult', mult: 1.5, value: movePower });
    }
    // Reckless: 1.5x si move timer > 1 (moves lentes)
    if (testAttackerAbility('reckless') && (move.timer === 'slow' || move.timer === 'verySlow')) {
        movePower *= 1.5;
        steps.push({ label: abilityLabel('reckless', 'Reckless'), type: 'mult', mult: 1.5, value: movePower });
    }
    // Libero: 2x si move timer < 1 (moves rapides: fast, veryFast et extremelyFast) ET power > 0
    // Note: Me First (power 0) n'est PAS affecté par Libero
    if (testAttackerAbility('libero') && move.power > 0 && (move.timer === 'fast' || move.timer === 'veryFast' || move.timer === 'extremelyFast')) {
        movePower *= 2;
        steps.push({ label: abilityLabel('libero', 'Libero'), type: 'mult', mult: 2, value: movePower });
    }
    
    // 3. Multihit s'applique APRES les abilities
    // Ex: Technician + Skill Link : (60 * 1.5) * 5 = 450, pas (60 * 5) * 1.5
    if (hitCount > 1) {
        movePower *= hitCount;
        steps.push({ label: `Multihit (${hitCount} hits)`, type: 'mult', mult: hitCount, value: movePower });
    }

    // 4. Calcul de base avec stats
    // Formule du jeu explore.js: (movePower + max(0, (atkStars * 30 * 1.1^iv) - (defStars * 30))) * levelMult
    const ivKey = move.split === 'special' ? 'satk' : (usesDefAsAtk ? 'def' : 'atk');
    const ivMult = Math.pow(1.1, atkIVs[ivKey]); // IV = multiplicateur 1.1^IV
    
    // Valeurs finales = étoiles × 30 × multiplicateur IV (pour l'attaquant)
    const attackPower = (attackerStat * 30) * ivMult;
    const defensePower = defenderStat * 30;
    
    const statDiff = Math.max(0, attackPower - defensePower);
    const levelMult = 1 + (atkLevel * 0.1);
    
    let damage = (movePower + statDiff) * levelMult;
    
    if (statDiff > 0) {
        const statsLabelKey = usesDefAsAtk ? 'dmgStatsDiffBodyPress' : 
                              (move.split === 'special' ? 'dmgStatsDiffSpec' : 'dmgStatsDiffPhys');
        const baseWithStats = movePower + statDiff;
        // Affichage : étoiles base avec multiplicateur IV
        const statDetail = `${attackerStat}★${atkIVs[ivKey]}iv vs ${defenderStat}★ (${Math.floor(attackPower)} vs ${defensePower})`;
        // Étape 1: Addition (puissance + stats) → résultat intermédiaire
        steps.push({ label: `${t(statsLabelKey)} (${statDetail})`, type: 'add', add: statDiff, basePower: movePower, value: baseWithStats });
        // Étape 2: Multiplication par le niveau
        steps.push({ label: t('dmgLevelMult'), type: 'mult', mult: levelMult, value: damage });
    } else {
        // Pas de différence de stats, on applique juste le multiplicateur de niveau
        steps.push({ label: t('dmgLevelMult'), type: 'mult', mult: levelMult, value: damage });
    }

    // 5. Buffs/Debuffs (Before buffs/After buffs dans l'ordre du jeu)
    const attackingStat = move.split === 'special' ? 'Atq Sp' : (usesDefAsAtk ? 'DEF' : 'ATK');
    const defendingStat = move.split === 'special' ? 'Def Sp' : 'DEF';

    function applyBuffStep(buffVal, statName, side) {
        if (buffVal === 0) return;
        let buffMult = BUFF_MULTIPLIERS[buffVal.toString()] || 1;
        const isDefensive = side === 'def';
        if (isDefensive) {
            buffMult = 1 / buffMult;
        }
        damage *= buffMult;
        const prefix = buffVal < 0 ? 'Debuff' : 'Buff';
        steps.push({ label: `${prefix} ${statName} ${buffVal > 0 ? '+' : ''}${buffVal}`, type: 'mult', mult: buffMult, value: damage, isDefensive: isDefensive });
    }

    if (move.split === 'special') {
        applyBuffStep(satkBuff1, attackingStat, 'atk');
        applyBuffStep(satkBuff2, attackingStat, 'atk');
        // Poison réduit les dégâts spéciaux de 33% (explore.js ligne 2424)
        if (atkStatus === 'poisoned' && !testAttackerAbility('guts')) {
            damage /= 1.5;
            steps.push({ label: 'Poison (×0.67)', type: 'mult', mult: 1/1.5, value: damage });
        }
    } else if (usesDefAsAtk) {
        applyBuffStep(defAtkBuff1, attackingStat, 'atk');
        applyBuffStep(defAtkBuff2, attackingStat, 'atk');
        // Burn réduit les dégâts physiques de 33% (explore.js ligne 2448)
        if (atkStatus === 'burned' && !testAttackerAbility('guts')) {
            damage /= 1.5;
            steps.push({ label: 'Brûlure (×0.67)', type: 'mult', mult: 1/1.5, value: damage });
        }
    } else {
        applyBuffStep(atkBuff1, attackingStat, 'atk');
        applyBuffStep(atkBuff2, attackingStat, 'atk');
        // Burn réduit les dégâts physiques de 33% (explore.js ligne 2448)
        if (atkStatus === 'burned' && !testAttackerAbility('guts')) {
            damage /= 1.5;
            steps.push({ label: 'Brûlure (×0.67)', type: 'mult', mult: 1/1.5, value: damage });
        }
    }

    // Buffs défenseur (Unaware: ignore defender's defensive buffs/debuffs)
    if (!testAttackerAbility('unaware')) {
        if (move.split === 'special') {
            applyBuffStep(sdefBuff1, defendingStat + ' (Def)', 'def');
            applyBuffStep(sdefBuff2, defendingStat + ' (Def)', 'def');
        } else {
            applyBuffStep(defBuff1, defendingStat + ' (Def)', 'def');
            applyBuffStep(defBuff2, defendingStat + ' (Def)', 'def');
        }
    }

    // 6. Type-changing abilities (normalize, -ate) - AVANT STAB selon l'ordre du jeu
    let moveType = move.type;
    if (testAttackerAbility('normalize') && moveType !== 'normal') {
        moveType = 'normal';
        damage *= 1.3;
        const normalizeLabel = abilityLabel('normalize', t('dmgNormalize') || 'Normalize');
        steps.push({ label: normalizeLabel, type: 'mult', mult: 1.3, value: damage });
    }
    // Check for "ate" abilities in regular, hidden ability, OR cooking buffs (from ABILITY_ATE_MODIFIERS)
    const allAteAbilities = Object.keys(ABILITY_ATE_MODIFIERS);
    let activeAteAbility = atkAbility && allAteAbilities.includes(atkAbility) ? atkAbility : 
                             (atkHiddenAbility && allAteAbilities.includes(atkHiddenAbility) ? atkHiddenAbility : null);
    // Also check cooking buffs for ate abilities
    if (!activeAteAbility && dmgCalcMode === 'raid') {
        for (const buff of cookingBuffs) {
            if (allAteAbilities.includes(buff)) {
                activeAteAbility = buff;
                break;
            }
        }
    }
    if (activeAteAbility && moveType === 'normal') {
        const ateConfig = ABILITY_ATE_MODIFIERS[activeAteAbility];
        moveType = ateConfig.type;
        damage *= ateConfig.multiplier;
        const ateLabel = abilityLabel(activeAteAbility, `${format(activeAteAbility)} (→${moveType})`);
        steps.push({ label: ateLabel, type: 'mult', mult: ateConfig.multiplier, value: damage });
    }

    // 7. STAB (après ate abilities, avant type effectiveness)
    const hasNaturalStab = attacker.types.includes(moveType);
    const hasGemStab = atkItem && gemTypeMap[atkItem] === moveType;
    if (hasNaturalStab || hasGemStab) {
        let stabBonus = 1.5;
        let stabNote = '';
        // Adaptability is ADDITIVE (+0.2 to STAB, not multiplicative)
        if (testAttackerAbility('adaptability')) {
            stabBonus += 0.2; // 1.5 + 0.2 = 1.7
            const adaptLabel = abilityLabel('adaptability', 'Adaptability');
            stabNote += ` + ${adaptLabel}`;
        }
        // Monotype bonus is also ADDITIVE (+0.2 to STAB)
        if (attacker.types.length === 1) {
            stabBonus += 0.2; // Additional +0.2 for monotype
            stabNote += ' (Monotype)';
        }
        if (hasGemStab && !hasNaturalStab) {
            stabNote += ' (Gem)';
        }
        damage *= stabBonus;
        steps.push({ label: `STAB${stabNote}`, type: 'mult', mult: stabBonus, value: damage });
    }

    // 8. Field Effects (explore.js ligne 2498-2506)
    const fieldEffect = document.getElementById('dmg-field-effect')?.value || '';
    let fieldEffectNote = '';
    
    // Calculate raw type effectiveness FIRST (for Wonder Ward check - explore.js ligne 2430)
    let rawEffectiveness;
    if (type3) {
        const baseTypes = defender.types.slice(0, 2);
        rawEffectiveness = getTypeEffectivenessForDamage(moveType, baseTypes);
        
        const rawEff = TYPE_CHART[moveType]?.[type3] ?? 1;
        let type3Effect;
        if (rawEff > 1) type3Effect = 1.25;
        else if (rawEff < 1 && rawEff > 0) type3Effect = 0.75;
        else if (rawEff === 0) type3Effect = 0;
        else type3Effect = 1;
        rawEffectiveness *= type3Effect;
    } else {
        rawEffectiveness = getTypeEffectivenessForDamage(moveType, defenderTypes);
    }
    
    // Wonder Ward: ×0.2 si rawEffectiveness ≤ 1 (explore.js ligne 2498)
    // APPLIQUÉ AVANT les abilities qui modifient l'effectiveness
    if (fieldEffect === 'wonderWard' && rawEffectiveness <= 1) {
        damage *= 0.2;
        steps.push({ label: 'Wonder Ward (×0.2)', type: 'mult', mult: 0.2, value: damage });
    }
    
    // 9. Type Effectiveness - apply abilities that modify it
    let effectiveness = rawEffectiveness;
    let type3Effectiveness = null;
    
    // Recalculate with type3 for display purposes
    if (type3) {
        const rawEff = TYPE_CHART[moveType]?.[type3] ?? 1;
        if (rawEff > 1) type3Effectiveness = 1.25;
        else if (rawEff < 1 && rawEff > 0) type3Effectiveness = 0.75;
        else if (rawEff === 0) type3Effectiveness = 0;
        else type3Effectiveness = 1;
    }
    
    let effectivenessNote = '';

    // Abilities that affect type effectiveness (Tinted Lens, NoGuard, Scrappy)
    if (testAttackerAbility('tintedLens') && (effectiveness === 0.5 || effectiveness === 0.25)) {
        effectiveness *= 2;
        effectivenessNote = ' (Tinted Lens)';
    }
    if (testAttackerAbility('scrappy') && defenderTypes.includes('ghost') &&
        (moveType === 'fighting' || moveType === 'normal')) {
        effectiveness = 1;
        effectivenessNote = ' (Scrappy)';
    }
    if (testAttackerAbility('noGuard') && effectiveness === 0) {
        effectiveness = 1;
        effectivenessNote = ' (No Guard)';
    }
    // Thousand Arms: override type effectiveness to 1.5
    if (testAttackerAbility('thousandArms')) {
        effectiveness = 1.5;
        effectivenessNote = ' (Thousand Arms)';
    }

    // Freeze Dry : +0.5 additif si la cible est Water
    if (moveName === 'freezeDry' && defenderTypes.includes('water')) {
        effectiveness += 0.5;
        effectivenessNote += ' (Freeze Dry)';
    }

    // Iron Body: effectiveness > 1 → 1 (explore.js ligne 2505)
    if (fieldEffect === 'ironBody' && effectiveness > 1) {
        effectiveness = 1;
        effectivenessNote = ' (Iron Body)';
    }

    damage *= effectiveness;
    let effKey;
    if (effectiveness > 1) effKey = 'dmgTypeSuperEffective';
    else if (effectiveness === 0) effKey = 'dmgTypeImmunity';
    else if (effectiveness < 1) effKey = 'dmgTypeNotVeryEffective';
    else effKey = 'dmgTypeNeutral';
    
    if (type3Effectiveness !== null) {
        const rawEff = TYPE_CHART[moveType]?.[type3] ?? 1;
        if (rawEff !== type3Effectiveness) {
            effectivenessNote += ` (Type 3: ${rawEff}→${type3Effectiveness})`;
        }
    }
    
    const typesDisplay = defenderTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' / ');
    steps.push({ label: `${t(effKey)} (${typesDisplay})${effectivenessNote}`, type: 'mult', mult: effectiveness, value: damage });

    // 9. Cross-type bonus
    if (isCrossMove) {
        let crossMult = 1.3;
        let crossNote = '';
        // Ambidextrous is ADDITIVE (+0.3 to cross-type)
        if (testAttackerAbility('ambidextrous')) {
            crossMult += 0.3; // 1.3 + 0.3 = 1.6
            const ambiLabel = abilityLabel('ambidextrous', 'Ambidextre');
            crossNote = ` + ${ambiLabel}`;
        }
        // Treasure of Ruin: +0.5 additive to cross bonus
        if (testAttackerAbility('treasureOfRuin')) {
            crossMult += 0.5;
            crossNote += ' + Treasure of Ruin';
        }
        // Cross Room: additional x1.3 on cross-type moves only
        if (weather === 'crossRoom') {
            crossMult *= 1.3;
            crossNote += ' + Cross Room';
        }
        damage *= crossMult;
        steps.push({ label: `Cross-type${crossNote}`, type: 'mult', mult: crossMult, value: damage });
    }

    // 9b. Mimic (×2) - explore.js ligne 2540
    // Mimic copie la dernière attaque utilisée par l'adversaire et double les dégâts
    if (moveName === 'mimic') {
        damage *= 2;
        steps.push({ label: 'Mimic (×2)', type: 'mult', mult: 2, value: damage });
    }

    // 10. Objet attaquant
    if (atkItem) {
        const itemMult = getAttackerItemMultiplier(atkItem, atkItemLvl, move, atkName);
        if (itemMult > 1) {
            damage *= itemMult;
            const itemData = items[atkItem];
            const itemLabel = itemData ? itemData.displayName : format(atkItem);
            steps.push({ label: t('dmgAttackerItem') + ` (${itemLabel})`, type: 'mult', mult: itemMult, value: damage });
        }
    }

    // 11. Status qui annulent les dégâts (explore.js lignes 2732-2736)
    // APPLIQUÉ APRÈS les items mais AVANT les abilities
    if (atkStatus === 'frozen' || atkStatus === 'sleep') {
        damage = 0;
        steps.push({ label: 'Status (Echec)', type: 'mult', mult: 0, value: 0 });
    }

    // 12. Talents offensifs

    // Low HP abilities - 1.3x when HP < 50% and move type matches (from LOW_HP_ABILITY_TYPES)
    const activeLowHpAbility = LOW_HP_ABILITY_TYPES[atkAbility] ? atkAbility :
                               (LOW_HP_ABILITY_TYPES[atkHiddenAbility] ? atkHiddenAbility : null);
    if (hpThreshold === 'low' && activeLowHpAbility && LOW_HP_ABILITY_TYPES[activeLowHpAbility] === moveType) {
        damage *= 1.3;
        steps.push({ label: `${format(activeLowHpAbility)} (PV bas)`, type: 'mult', mult: 1.3, value: damage });
    }

    // Rivalry - 1.5x if defender shares a type with attacker
    if (testAttackerAbility('rivalry')) {
        const sharesType = attacker.types.some(t => defenderTypes.includes(t));
        if (sharesType) {
            damage *= 1.5;
            steps.push({ label: abilityLabel('rivalry', 'Rivalry'), type: 'mult', mult: 1.5, value: damage });
        }
    }

    // Sheer Force - 1.25x if move has hitEffect
    const sheerForceApplies = testAttackerAbility('sheerForce') && move.hasHitEffect;
    if (sheerForceApplies) {
        damage *= 1.25;
        steps.push({ label: abilityLabel('sheerForce', 'Sheer Force'), type: 'mult', mult: 1.25, value: damage });
    }

    // Huge Power - 2x for physical moves
    if (testAttackerAbility('hugePower') && move.split === 'physical') {
        damage *= 2;
        steps.push({ label: abilityLabel('hugePower', 'Huge Power'), type: 'mult', mult: 2, value: damage });
    }

    // Toxic Boost / Flare Boost - 1.2x if poisoned/burned
    const hasToxicBoost = testAttackerAbility('toxicBoost') && document.getElementById('dmg-atk-status')?.value === 'poisoned';
    const hasFlareBoost = testAttackerAbility('flareBoost') && document.getElementById('dmg-atk-status')?.value === 'burned';
    if (hasToxicBoost) {
        damage *= 1.2;
        steps.push({ label: abilityLabel('toxicBoost', 'Toxic Boost'), type: 'mult', mult: 1.2, value: damage });
    }
    if (hasFlareBoost) {
        damage *= 1.2;
        steps.push({ label: abilityLabel('flareBoost', 'Flare Boost'), type: 'mult', mult: 1.2, value: damage });
    }

    // Merciless - 1.5x if attacker has status condition (buffed v4.4)
    if (testAttackerAbility('merciless') && ['burned', 'poisoned', 'paralyzed', 'confused', 'frozen', 'sleep'].includes(atkStatus)) {
        damage *= 1.5;
        steps.push({ label: abilityLabel('merciless', 'Merciless'), type: 'mult', mult: 1.5, value: damage });
    }

    // Parental Bond - 1.5x
    if (testAttackerAbility('parentalBond')) {
        damage *= 1.5;
        steps.push({ label: abilityLabel('parentalBond', 'Parental Bond'), type: 'mult', mult: 1.5, value: damage });
    }

    // Gorilla Tactics - 1.5x (buffed v4.4)
    if (testAttackerAbility('gorillaTactics')) {
        damage *= 1.5;
        steps.push({ label: abilityLabel('gorillaTactics', 'Gorilla Tactics'), type: 'mult', mult: 1.5, value: damage });
    }

    // Soul Asterism - 1.1x pour les moves ghost
    if (testAttackerAbility('soulAsterism') && moveType === 'ghost') {
        damage *= 1.1;
        steps.push({ label: abilityLabel('soulAsterism', 'Soul Asterism'), type: 'mult', mult: 1.1, value: damage });
    }

    // Supreme Overlord - 1 + 0.15 per fainted team member
    if (testAttackerAbility('supremeOverlord')) {
        const faintedCount = parseInt(document.getElementById('dmg-supreme-overlord-count')?.value) || 0;
        const supremeMult = 1 + (faintedCount * 0.15);
        damage *= supremeMult;
        steps.push({ label: abilityLabel('supremeOverlord', `Supreme Overlord (${faintedCount} KO)`), type: 'mult', mult: supremeMult, value: damage });
    }
    
    // Sword of Ruin - ignore 20% of defense (×1.25 effective damage)
    if (testAttackerAbility('swordOfRuin') && move.split === 'physical') {
        damage *= 1.25;
        steps.push({ label: abilityLabel('swordOfRuin', 'Sword of Ruin'), type: 'mult', mult: 1.25, value: damage });
    }
    
    // Beads of Ruin - ignore 20% of special defense (×1.25 effective damage)
    if (testAttackerAbility('beadsOfRuin') && move.split === 'special') {
        damage *= 1.25;
        steps.push({ label: abilityLabel('beadsOfRuin', 'Beads of Ruin'), type: 'mult', mult: 1.25, value: damage });
    }

    // 13. Protosynthesis / Quark Drive - apply +1 buff to highest stat under weather (from explore.js)
    // In the game, these abilities give a +1 buff to the highest stat. We simulate this as ×1.5 damage.
    if ((testAttackerAbility('protosynthesis') && weather === 'sunny') ||
        (testAttackerAbility('quarkDrive') && weather === 'electricTerrain')) {
        const highestStat = returnHighestStat(attacker);
        let boostMult = 1;
        // +1 buff = ×1.5 multiplier for the appropriate stat/move type
        if (highestStat === 'atk' && move.split === 'physical') boostMult = 1.5;
        if (highestStat === 'satk' && move.split === 'special') boostMult = 1.5;
        if (boostMult > 1) {
            damage *= boostMult;
            const isProtosynthesis = cookingBuffs.includes('protosynthesis') || atkAbility === 'protosynthesis' || (haEnabled && atkHiddenAbility === 'protosynthesis');
            const abilityName = isProtosynthesis ? 'Protosynthesis' : 'Quark Drive';
            const abilityKey = isProtosynthesis ? 'protosynthesis' : 'quarkDrive';
            steps.push({ label: abilityLabel(abilityKey, `${abilityName} (+1 buff, ${highestStat.toUpperCase()})`), type: 'mult', mult: boostMult, value: damage });
        }
    }

    // 14. Météo (from WEATHER_DAMAGE_MODIFIERS)
    if (weather && weather !== 'weirdRoom') {
        let weatherMult = 1;
        const weatherName = t('dmgWeather_' + weather) || weather;

        // Dynamic weather modifiers from config
        const weatherConfig = WEATHER_DAMAGE_MODIFIERS[weather];
        if (weatherConfig) {
            if (weatherConfig.boost?.includes(moveType)) weatherMult = 1.5;
            else if (weatherConfig.reduce?.includes(moveType)) weatherMult = 1/1.5;
        }
        // Trick Room: slow Pokémon hit harder (1.07^(7 - SPE))
        // explore.js: Math.pow(1.07, 7 - pkmn[team[exploreActiveMember].pkmn.id].bst.spe)
        // Game uses star ratings (1-6) not raw BST values - see pkmnDictionary.js line 20218
        else if (weather === 'trickRoom') {
            weatherMult = Math.pow(1.07, 7 - statToRating(attacker.bst.spe));
        }
        // Cross Room: handled in cross-type block above (no global bonus)

        if (weatherMult !== 1) {
            damage *= weatherMult;
            steps.push({ label: `${t('dmgWeatherLabel')} (${weatherName})`, type: 'mult', mult: weatherMult, value: damage });
        }
    }

    // 15. Field Effect Curses (explore.js lignes 2733-2734)
    // weakeningCurse: ×0.5 pour physical moves
    // fatiguingCurse: ×0.5 pour special moves
    if (fieldEffect === 'weakeningCurse' && move.split === 'physical') {
        damage *= 0.5;
        steps.push({ label: 'Weakening Curse (×0.5)', type: 'mult', mult: 0.5, value: damage });
    }
    if (fieldEffect === 'fatiguingCurse' && move.split === 'special') {
        damage *= 0.5;
        steps.push({ label: 'Fatiguing Curse (×0.5)', type: 'mult', mult: 0.5, value: damage });
    }

    // 16. Shiny
    if (isShiny) {
        damage *= 1.15;
        steps.push({ label: t('dmgShiny'), type: 'mult', mult: 1.15, value: damage });
    }

    // === Affichage du résultat ===
    resultEl.textContent = damage.toFixed(2);

    // === Construction du breakdown HTML détaillé ===
    let html = '<div style="text-align:left;display:inline-block;max-width:100%">';
    html += '<table style="border-collapse:collapse;width:100%;font-size:0.8rem">';

    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const isFirst = i === 0;
        // Pour les buffs défensifs (DEF ennemi), le mult est déjà inversé dans applyBuffStep :
        // - mult < 1 (0.5) = buff DEF = dégâts réduits = ROUGE (mauvais)
        // - mult > 1 (2.0) = debuff DEF = dégâts augmentés = VERT (bon)
        const isNegative = s.mult && s.mult < 1;
        const color = s.type === 'base' ? 'var(--accent-blue)'
                    : isNegative ? 'var(--accent-red)'
                    : 'var(--accent-green)';

        let modStr = '';
        if (s.type === 'base') {
            modStr = `<span style="color:var(--accent-blue);font-weight:600">${Math.floor(s.value)}</span>`;
        } else if (s.type === 'add') {
            // Format: basePower + statDiff → result (ex: 150 + 302 → 452)
            const base = s.basePower || 0;
            modStr = `<span style="color:var(--accent-blue)">${Math.floor(base)}</span> <span style="color:var(--accent-green)">+${Math.floor(s.add)}</span> <span style="color:var(--text-dim)">→ ${Math.floor(s.value)}</span>`;
        } else {
            const multStr = s.mult >= 1 ? `×${s.mult.toFixed(2)}` : `×${s.mult.toFixed(2)}`;
            // Couleur pour les buffs défensifs (logique inversée car on a déjà inversé le mult)
            // Pour def: mult < 1 (0.5) = buff DEF = dégâts réduits = ROUGE
            // Pour def: mult > 1 (2.0) = debuff DEF = dégâts augmentés = VERT
            const multColor = s.isDefensive
                ? (s.mult < 1 ? 'var(--accent-red)' : 'var(--accent-green)')
                : (s.mult >= 1 ? 'var(--accent-green)' : 'var(--accent-red)');
            modStr = `<span style="color:${multColor}">${multStr}</span> <span style="color:var(--text-dim)">→ ${Math.floor(s.value)}</span>`;
        }

        html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">`;
        // Add sign prefix, then label (handle HTML labels for cooking buffs)
        const sign = isFirst ? '⚡' : s.type === 'add' ? '➕' : '✖️';
        const labelHtml = s.label.includes('<span') ? `${sign} ${s.label}` : `${sign} ${s.label}`;
        html += `<td style="padding:3px 8px 3px 0;color:var(--text-dim);white-space:nowrap">${labelHtml}</td>`;
        html += `<td style="padding:3px 0;text-align:right">${modStr}</td>`;
        html += `</tr>`;
    }

    // Ligne total
    html += `<tr style="border-top:2px solid var(--accent-gold)">`;
    html += `<td style="padding:6px 8px 3px 0;color:var(--accent-gold);font-weight:700">💥 ${t('dmgTotal')}</td>`;
    html += `<td style="padding:6px 0;text-align:right;color:var(--accent-gold);font-weight:700;font-size:1rem">${Math.floor(damage)}</td>`;
    html += `</tr>`;

    html += '</table></div>';
    
    // === Affichage des talents de cuisine dans la section attaquant ===
    const cookingDisplay = document.getElementById('dmg-cooking-buffs-display');
    const cookingList = document.getElementById('dmg-cooking-buffs-list');
    if (cookingDisplay && cookingList) {
        if (dmgCalcMode === 'raid' && cookingBuffs.length > 0) {
            cookingDisplay.style.display = 'block';
            cookingList.innerHTML = cookingBuffs.map(buff => {
                const abilityName = abilities[buff]?.displayName || abilities[buff]?.name || buff;
                return `<span style="background:rgba(255,152,0,0.2);border:1px solid rgba(255,152,0,0.4);color:#ff9800;padding:2px 8px;border-radius:12px;font-size:0.75rem">${abilityName}</span>`;
            }).join('');
        } else {
            cookingDisplay.style.display = 'none';
            cookingList.innerHTML = '';
        }
    }
    
    breakdownEl.innerHTML = html;

    // === Barre de HP du défenseur ===
    // Formule du jeu (explore.js): 
    // - Wild: HP = (100 + hpStars * 30 * (1 + level * 0.2)) * 2
    // - Raids: Valeurs hardcodées (T1:45250, T2:139300, T3:398000, T4:1302000)
    let defenderMaxHP;
    let difficultyDisplay = '';
    if (dmgCalcMode === 'raid') {
        // Raids: exact tier matching like the game (== not >=)
        const difficulty = getPokemonDifficultyMultiplier(defName);
        if (difficulty === 600) defenderMaxHP = 1302000;       // T4
        else if (difficulty === 200) defenderMaxHP = 398000;   // T3
        else if (difficulty === 70) defenderMaxHP = 139300;    // T2
        else if (difficulty === 25) defenderMaxHP = 45250;     // T1
        else if (difficulty > 0) {
            // Non-tier difficulty: use difficulty as hpMultiplier in formula
            const hpStars = statToRating(defender.bst.hp);
            const hpStatPart = hpStars * 30 * (1 + defLevel * 0.2);
            defenderMaxHP = Math.floor((100 + hpStatPart) * difficulty);
            difficultyDisplay = `Difficulté: ${difficulty}`;
        } else {
            // Fallback: use wild formula
            const hpStars = statToRating(defender.bst.hp);
            const hpStatPart = hpStars * 30 * (1 + defLevel * 0.2);
            defenderMaxHP = Math.floor((100 + hpStatPart) * 2);
        }
    } else {
        // Wild: formule normale
        // Formule du jeu: HP = (100 + hpStars * 30 * (1 + level * 0.2)) * hpMultiplier
        // où hpStars = bst.hp [1-6 étoiles], hpMultiplier = 2
        const hpStars = statToRating(defender.bst.hp);
        const hpStatPart = hpStars * 30 * (1 + defLevel * 0.2);
        defenderMaxHP = Math.floor((100 + hpStatPart) * 2);
    }
    const hpAfterDamage = Math.max(0, defenderMaxHP - damage);
    const hpPercent = (hpAfterDamage / defenderMaxHP) * 100;
    const damagePercent = Math.min(100, (damage / defenderMaxHP) * 100);

    hpContainer = document.getElementById('dmg-def-hp-container');
    const hpBar = document.getElementById('dmg-def-hp-bar');
    const hpText = document.getElementById('dmg-def-hp-text');
    const damageText = document.getElementById('dmg-def-damage-text');

    if (hpContainer && hpBar && hpText && damageText) {
        hpContainer.style.display = 'block';
        hpBar.style.width = `${hpPercent}%`;

        if (hpPercent > 50) {
            hpBar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
        } else if (hpPercent > 20) {
            hpBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
        } else {
            hpBar.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
        }

        const diffSuffix = difficultyDisplay ? ` <span style="color:var(--accent-orange);font-size:0.8rem">(${difficultyDisplay})</span>` : '';
        hpText.innerHTML = `<span style="color:var(--accent-green);font-weight:600">${Math.floor(hpAfterDamage)}</span> <span style="color:var(--text-dim)">/ ${defenderMaxHP}</span>${diffSuffix}`;

        if (damage >= defenderMaxHP) {
            const hitsText = hitCount > 1 ? ` (${hitCount} coups)` : '';
            damageText.innerHTML = `💥 <span style="color:var(--accent-red);font-size:1.1rem;font-weight:700">ONE SHOT!</span> <span style="color:var(--text-dim)">(${Math.floor(damagePercent)}%)${hitsText}</span>`;
        } else {
            const hitsToKO = Math.ceil(defenderMaxHP / damage);
            const dmgDisplay = Math.floor(damage);
            damageText.innerHTML = `Dégâts: <span style="color:var(--accent-orange);font-weight:600">${dmgDisplay}</span> <span style="color:var(--text-dim)">(${damagePercent.toFixed(1)}%)</span> <span style="color:var(--text-dim);font-size:0.8rem">| ${hitsToKO} coup${hitsToKO > 1 ? 's' : ''} pour KO</span>`;
        }
    }
    } catch (e) {
        // console.error('[DamageCalc] Error:', e);
        const resultEl = document.getElementById('dmg-result');
        if (resultEl) resultEl.textContent = t('error');
    }
}

function getTypeEffectivenessForDamage(moveType, defenderTypes) {
    // Use the global TYPE_CHART from the app
    let multiplier = 1;
    defenderTypes.forEach(defType => {
        const effectiveness = TYPE_CHART[moveType]?.[defType];
        if (effectiveness !== undefined) multiplier *= effectiveness;
    });
    return multiplier;
}

// List of 67 exclusive Frontier Pokemon (from game code)
const EXCLUSIVE_FRONTIER_POKEMON = [
    'vivillonModern', 'relicanth', 'heatmor', 'durant', 'comfey', 'morpeko', 'klefki', 'munna', 
    'finneon', 'skorupi', 'stunky', 'zangoose', 'gulpin', 'teddiursa', 'pineco', 'shuckle', 
    'minccino', 'pincurchin', 'stonjourner', 'smeargle', 'stantler', 'nickit', 'porygon', 
    'lickitung', 'pinsir', 'natu', 'nosepass', 'spoink', 'anorith', 'clamperl', 'falinks', 
    'grubbin', 'wattrel', 'rellor', 'charmander', 'squirtle', 'bulbasaur', 'chikorita', 
    'cyndaquil', 'totodile', 'mudkip', 'torchic', 'treecko', 'turtwig', 'piplup', 'chimchar',
    'tepig', 'snivy', 'oshawott', 'froakie', 'chespin', 'fennekin', 'rowlet', 'litten', 
    'popplio', 'grookey', 'scorbunny', 'sobble', 'sprigatito', 'fuecoco', 'quaxly', 'meltan'
];

// Populate Frontier Pokemon list
function populateFrontierPokemon() {
    const container = document.getElementById('frontier-pokemon-list');
    if (!container) return;
    
    // If data not loaded yet, retry in 500ms
    if (!pokemons || Object.keys(pokemons).length === 0) {
        container.innerHTML = '<div style="color:var(--text-dim);font-size:0.8rem;grid-column:1/-1;text-align:center;padding:20px">⏳ Loading Pokemon data...<br><button class="btn btn-small" onclick="populateFrontierPokemon()" style="margin-top:10px">Retry</button></div>';
        setTimeout(() => {
            if (pokemons && Object.keys(pokemons).length > 0) {
                populateFrontierPokemon();
            }
        }, 1000);
        return;
    }
    
    let html = '';
    let count = 0;
    EXCLUSIVE_FRONTIER_POKEMON.forEach(pkmnId => {
        const pkmnData = pokemons[pkmnId];
        if (pkmnData) {
            count++;
            const displayName = pkmnData.displayName || format(pkmnId);
            html += `
                <div style="text-align:center;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:all 0.2s" 
                     onclick="showPokemonDetails('${pkmnId}')"
                     onmouseover="this.style.borderColor='var(--accent-blue)'" 
                     onmouseout="this.style.borderColor='var(--border)'">
                    <img src="${sprite(pkmnId)}" style="width:48px;height:48px;image-rendering:pixelated" onerror="this.style.display='none'">
                    <div style="font-size:0.65rem;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px">${displayName}</div>
                </div>
            `;
        }
    });
    
    if (count === 0) {
        container.innerHTML = '<div style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:20px">⚠️ Pokemon data not found<br><button class="btn btn-small" onclick="populateFrontierPokemon()" style="margin-top:10px">Retry</button></div>';
    } else {
        container.innerHTML = html;
    }
}

// List of 18 types for Battle Tower rotations
// List of 18 types for Battle Tower rotations
const TOWER_ROTATION_TYPES = [
    'normal', 'fire', 'water', 'grass', 'bug', 'poison',
    'dark', 'ghost', 'psychic', 'fighting', 'flying',
    'dragon', 'fairy', 'steel', 'ground', 'rock', 'electric', 'ice'
];

// Divisions for Battle Tower (C, B, A, S, SS, SSS)
const TOWER_DIVISIONS = ['C', 'B', 'A', 'S', 'SS'];

// Switch between Guide, Tower, Factory and Arena subtabs
function switchFrontierSubtab(subtab) {
    // Update buttons
    document.querySelectorAll('#frontier-subtab-guide, #frontier-subtab-tower, #frontier-subtab-factory, #frontier-subtab-arena').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`frontier-subtab-${subtab}`).classList.add('active');
    
    // Hide all content
    document.getElementById('frontier-guide-content').style.display = 'none';
    document.getElementById('frontier-tower-content').style.display = 'none';
    document.getElementById('frontier-factory-content').style.display = 'none';
    document.getElementById('frontier-arena-content').style.display = 'none';
    
    // Show selected content
    document.getElementById(`frontier-${subtab}-content`).style.display = 'block';
    
    // Populate content if needed
    if (subtab === 'tower') {
        populateTowerRotations();
    } else if (subtab === 'factory') {
        populateFactoryRotations();
    } else if (subtab === 'arena') {
        populateArenaTrainers();
    }
    
    // Update URL hash for shareability
    updateURLHash('frontier', { subtab: subtab });
}

// Zones subtab switching
let currentZonesSubtab = 'wild';

function switchZonesSubtab(subtab) {
    currentZonesSubtab = subtab;
    
    // Update buttons
    document.querySelectorAll('#zones-subtab-wild, #zones-subtab-dungeon, #zones-subtab-event, #zones-subtab-dimension, #zones-subtab-seasonal').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`zones-subtab-${subtab}`).classList.add('active');
    
    // Hide all content
    document.getElementById('zones-wild-content').style.display = 'none';
    document.getElementById('zones-dungeon-content').style.display = 'none';
    document.getElementById('zones-event-content').style.display = 'none';
    document.getElementById('zones-dimension-content').style.display = 'none';
    document.getElementById('zones-seasonal-content').style.display = 'none';
    
    // Show selected content
    document.getElementById(`zones-${subtab}-content`).style.display = 'block';
    
    // Update URL hash for shareability
    updateURLHash('zones', { subtab: subtab });
}

// Toggle tower type section expansion
function toggleTowerType(type) {
    const header = document.getElementById(`tower-type-header-${type}`);
    const content = document.getElementById(`tower-type-content-${type}`);
    const arrow = document.getElementById(`tower-type-arrow-${type}`);
    
    if (header && content) {
        header.classList.toggle('expanded');
        content.classList.toggle('expanded');
        if (arrow) {
            arrow.textContent = content.classList.contains('expanded') ? '▼' : '▶';
        }
    }
}

// Toggle factory division section expansion
function toggleFactoryDivision(div) {
    const header = document.getElementById(`factory-div-header-${div}`);
    const content = document.getElementById(`factory-div-content-${div}`);
    const arrow = document.getElementById(`factory-div-arrow-${div}`);
    
    if (header && content) {
        header.classList.toggle('expanded');
        content.classList.toggle('expanded');
        if (arrow) {
            arrow.textContent = content.classList.contains('expanded') ? '▼' : '▶';
        }
    }
}


// Populate Battle Tower rotations
function populateTowerRotations() {
    const container = document.getElementById('tower-rotations-list');
    if (!container) return;
    
    // If data not loaded yet, retry
    if (!pokemons || Object.keys(pokemons).length === 0) {
        container.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px">⏳ Loading Pokemon data...<br><button class="btn btn-small" onclick="populateTowerRotations()" style="margin-top:10px">Retry</button></div>';
        setTimeout(() => {
            if (pokemons && Object.keys(pokemons).length > 0) {
                populateTowerRotations();
            }
        }, 1000);
        return;
    }
    
    // If already populated, don't re-populate
    if (container.dataset.populated === 'true') return;
    
    let html = `<div style="background:rgba(255,215,0,0.1);border:1px solid var(--accent-gold);border-radius:8px;padding:12px;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-dim)">
            <strong style="color:var(--accent-gold)">⚠️ ${t('movesRandom') || 'Random moves'}:</strong> 
            <span data-i18n="towerMovesNote">${t('towerMovesNote') || 'Moves are randomly generated for each Pokémon!'}</span>
        </div>
    </div>`;
    
    TOWER_ROTATION_TYPES.forEach(type => {
        const typeColor = typeColors[type] || '#888';
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        
        // Get Pokémon for each division (C, B, A, S, SS)
        const divisions = { C: [], B: [], A: [], S: [], SS: [] };
        
        Object.entries(pokemons).forEach(([id, pkmn]) => {
            if (!pkmn.types || !pkmn.types.includes(type)) return;
            if (id.includes('unown')) return;
            
            const div = pkmn.division || returnPkmnDivision(pkmn);
            if (divisions[div]) {
                divisions[div].push({ id, ...pkmn });
            }
        });
        
        // Sort each division by name
        Object.keys(divisions).forEach(div => {
            divisions[div].sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));
        });
        
        const totalCount = divisions.C.length + divisions.B.length + divisions.A.length + divisions.S.length + divisions.SS.length;
        
        html += `
            <div class="tower-type-section">
                <div class="tower-type-header" id="tower-type-header-${type}" onclick="toggleTowerType('${type}')">
                    <div style="display:flex;align-items:center">
                        <span class="tower-type-icon" style="background:${typeColor}"></span>
                        <span style="font-weight:700;color:var(--text-main)">${typeName}</span>
                        <span style="margin-left:10px;font-size:0.8rem;color:var(--text-dim)">(${totalCount} Pokémon)</span>
                    </div>
                    <span style="font-size:1.2rem;color:var(--text-dim)" id="tower-type-arrow-${type}">▼</span>
                </div>
                <div class="tower-type-content" id="tower-type-content-${type}">
                    <div class="tower-type-inner">
                        ${renderDivisionSection('C', divisions.C, 'var(--div-c)')}
                        ${renderDivisionSection('B', divisions.B, 'var(--div-b)')}
                        ${renderDivisionSection('A', divisions.A, 'var(--div-a)')}
                        ${renderDivisionSection('S', divisions.S, 'var(--div-s)')}
                        ${renderDivisionSection('SS', divisions.SS, 'var(--div-ss)')}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.dataset.populated = 'true';
}

// Helper function to render a division section
function renderDivisionSection(division, pokemonList, color) {
    if (pokemonList.length === 0) return '';
    
    const divisionLabels = {
        C: t('divisionC') || 'Division C',
        B: t('divisionB') || 'Division B',
        A: t('divisionA') || 'Division A',
        S: t('divisionS') || 'Division S',
        SS: t('divisionSS') || 'Division SS'
    };
    
    let html = `
        <div class="division-section">
            <div class="division-title" style="background:${color}20;color:${color};border:1px solid ${color}40">
                ${divisionLabels[division]} (${pokemonList.length})
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">
    `;
    
    pokemonList.forEach(pkmn => {
        const displayName = pkmn.displayName || format(pkmn.id);
        html += `
            <div style="text-align:center;padding:6px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:all 0.2s" 
                 onclick="showPokemonDetails('${pkmn.id}')"
                 onmouseover="this.style.borderColor='${color}'" 
                 onmouseout="this.style.borderColor='var(--border)'"
                 title="${displayName}">
                <img src="${sprite(pkmn.id)}" style="width:40px;height:40px;image-rendering:pixelated" onerror="this.style.display='none'">
                <div style="font-size:0.6rem;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${displayName}</div>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

// Helper function to check if a Pokémon has double weakness to any type
function hasDoubleWeakness(pkmnTypes) {
    const allTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 
                      'fighting', 'poison', 'ground', 'flying', 'psychic', 
                      'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    
    for (const attackType of allTypes) {
        let effectiveness = 1;
        pkmnTypes.forEach(defType => {
            const eff = TYPE_CHART[attackType]?.[defType];
            if (eff !== undefined) effectiveness *= eff;
        });
        if (effectiveness >= 2.25) return true; // 1.5 * 1.5 = 2.25
    }
    return false;
}

// Populate Battle Factory rotations
function populateFactoryRotations() {
    const container = document.getElementById('factory-rotations-list');
    if (!container) return;
    
    // If data not loaded yet, retry
    if (!pokemons || Object.keys(pokemons).length === 0 || !TYPE_CHART) {
        container.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px">⏳ Loading Pokemon data...<br><button class="btn btn-small" onclick="populateFactoryRotations()" style="margin-top:10px">Retry</button></div>';
        setTimeout(() => {
            if (pokemons && Object.keys(pokemons).length > 0 && TYPE_CHART) {
                populateFactoryRotations();
            }
        }, 1000);
        return;
    }
    
    // If already populated, don't re-populate
    if (container.dataset.populated === 'true') return;
    
    // Get Pokémon for each division (C, B, A, S, SS) that have NO double weakness
    const divisions = { C: [], B: [], A: [], S: [], SS: [] };
    
    Object.entries(pokemons).forEach(([id, pkmn]) => {
        if (id.includes('unown')) return;
        if (!pkmn.types || pkmn.types.length === 0) return;
        
        // Check if Pokémon has double weakness
        if (hasDoubleWeakness(pkmn.types)) return;
        
        const div = pkmn.division || returnPkmnDivision(pkmn);
        if (divisions[div]) {
            divisions[div].push({ id, ...pkmn });
        }
    });
    
    // Sort each division by name
    Object.keys(divisions).forEach(div => {
        divisions[div].sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));
    });
    
    let html = `<div style="background:rgba(0,255,136,0.1);border:1px solid var(--accent-green);border-radius:8px;padding:12px;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-dim)">
            <strong style="color:var(--accent-green)">✓ ${t('factoryNoDoubleWeakness') || 'No double weakness'}:</strong> 
            <span data-i18n="factoryTargetInfo">${t('factoryTargetInfo') || 'Target knows only Splash - deal maximum damage!'}</span>
        </div>
    </div>`;
    
    // Create sections for each division (collapsible)
    TOWER_DIVISIONS.forEach(div => {
        if (divisions[div].length === 0) return;
        
        const colorVar = div === 'SS' ? 'var(--div-ss)' : 
                        div === 'S' ? 'var(--div-s)' : 
                        div === 'A' ? 'var(--div-a)' : 
                        div === 'B' ? 'var(--div-b)' : 'var(--div-c)';
        
        const divisionLabels = {
            C: t('divisionC') || 'Division C',
            B: t('divisionB') || 'Division B',
            A: t('divisionA') || 'Division A',
            S: t('divisionS') || 'Division S',
            SS: t('divisionSS') || 'Division SS'
        };
        
        html += `
            <div class="tower-type-section">
                <div class="tower-type-header" id="factory-div-header-${div}" onclick="toggleFactoryDivision('${div}')">
                    <div style="display:flex;align-items:center">
                        <span style="font-weight:700;color:var(--text-main);font-size:1.1rem">${divisionLabels[div]}</span>
                        <span style="margin-left:10px;font-size:0.8rem;color:var(--text-dim)">(${divisions[div].length} Pokémon)</span>
                    </div>
                    <span style="font-size:1.2rem;color:var(--text-dim)" id="factory-div-arrow-${div}">▼</span>
                </div>
                <div class="tower-type-content" id="factory-div-content-${div}">
                    <div class="tower-type-inner">
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">
                            ${divisions[div].map(p => `
                                <div style="text-align:center;padding:6px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:all 0.2s" 
                                     onclick="showPokemonDetails('${p.id}')"
                                     onmouseover="this.style.borderColor='${colorVar}'" 
                                     onmouseout="this.style.borderColor='var(--border)'"
                                     title="${p.displayName || format(p.id)}">
                                    <img src="${sprite(p.id)}" style="width:40px;height:40px;image-rendering:pixelated" onerror="this.style.display='none'">
                                    <div style="font-size:0.6rem;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${p.displayName || format(p.id)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.dataset.populated = 'true';
}

// Arena Trainers Data - 72 trainers across 4 leagues
const ARENA_TRAINERS = {
    1: [ // Little Cup - League 1 (Division C max)
        { name: 'Morty', type: 'rock', sprite: 'hiker' },
        { name: 'Hamburg', type: 'water', sprite: 'sailor' },
        { name: 'Laila', type: 'electric', sprite: 'beauty' },
        { name: 'Bianque', type: 'grass', sprite: 'aromaLady' },
        { name: 'Miguel', type: 'poison', sprite: 'janitor' },
        { name: 'Mistica', type: 'psychic', sprite: 'psychic' },
        { name: 'Pierro', type: 'fire', sprite: 'firebreather' },
        { name: 'Mauro', type: 'normal', sprite: 'artist' },
        { name: 'Kiro', type: 'dark', sprite: 'shadow' },
        { name: 'Katarina', type: 'flying', sprite: 'birdkeeper' },
        { name: 'Fausto', type: 'dragon', sprite: 'pokemaniac' },
        { name: 'Momo', type: 'fairy', sprite: 'channeler' },
        { name: 'Jairo', type: 'bug', sprite: 'bugCatcher' },
        { name: 'Junimo', type: 'ice', sprite: 'gentleman' },
        { name: 'Lion', type: 'steel', sprite: 'scientist' },
        { name: 'Gordon', type: 'ground', sprite: 'hiker2' },
        { name: 'Taria', type: 'fighting', sprite: 'battlegirl' },
        { name: 'Iota', type: 'ghost', sprite: 'hexmaniac' }
    ],
    2: [ // Great League - League 2 (Division B max)
        { name: 'Roark', type: 'rock', sprite: 'roark' },
        { name: 'Nessa', type: 'water', sprite: 'nessa' },
        { name: 'Lt. Surge', type: 'electric', sprite: 'ltsurge' },
        { name: 'Erika', type: 'grass', sprite: 'erika' },
        { name: 'Roxie', type: 'poison', sprite: 'roxie' },
        { name: 'Sabrina', type: 'psychic', sprite: 'sabrina' },
        { name: 'Blaine', type: 'fire', sprite: 'blaine' },
        { name: 'Norman', type: 'normal', sprite: 'norman' },
        { name: 'Marnie', type: 'dark', sprite: 'marnie' },
        { name: 'Skyla', type: 'flying', sprite: 'skyla' },
        { name: 'Iris', type: 'dragon', sprite: 'iris' },
        { name: 'Opal', type: 'fairy', sprite: 'opal' },
        { name: 'Burgh', type: 'bug', sprite: 'burgh' },
        { name: 'Candice', type: 'ice', sprite: 'candice' },
        { name: 'Jasmine', type: 'steel', sprite: 'jasmine' },
        { name: 'Clay', type: 'ground', sprite: 'clay' },
        { name: 'Korrina', type: 'fighting', sprite: 'korrina' },
        { name: 'Morty', type: 'ghost', sprite: 'morty' }
    ],
    3: [ // Ultra League - League 3 (Division A max)
        { name: 'Olivia', type: 'rock', sprite: 'olivia' },
        { name: 'Siebold', type: 'water', sprite: 'siebold' },
        { name: 'Diamant', type: 'electric', sprite: 'ingo' },
        { name: 'Matron', type: 'grass', sprite: 'madame' },
        { name: 'Koga', type: 'poison', sprite: 'koga' },
        { name: 'Lucian', type: 'psychic', sprite: 'lucian' },
        { name: 'Crispin', type: 'fire', sprite: 'crispin' },
        { name: 'Larry', type: 'normal', sprite: 'larry' },
        { name: 'Sidney', type: 'dark', sprite: 'sidney' },
        { name: 'Kahili', type: 'flying', sprite: 'kahili' },
        { name: 'Drake', type: 'dragon', sprite: 'drake' },
        { name: 'Lacey', type: 'fairy', sprite: 'lacey' },
        { name: 'Aaron', type: 'bug', sprite: 'aaron' },
        { name: 'Glacia', type: 'ice', sprite: 'glacia' },
        { name: 'Wikstrom', type: 'steel', sprite: 'wikstrom' },
        { name: 'Bertha', type: 'ground', sprite: 'bertha' },
        { name: 'Bruno', type: 'fighting', sprite: 'bruno' },
        { name: 'Acerola', type: 'ghost', sprite: 'acerola' }
    ],
    4: [ // Master League - League 4 (Division S-SSS)
        { name: 'Peony', type: 'rock', sprite: 'peony' },
        { name: 'Archie', type: 'water', sprite: 'archie' },
        { name: 'Colress', type: 'electric', sprite: 'colress' },
        { name: 'Nemona', type: 'grass', sprite: 'nemona' },
        { name: 'Guzma', type: 'poison', sprite: 'guzma' },
        { name: 'Kieran', type: 'psychic', sprite: 'kieran' },
        { name: 'Maxie', type: 'fire', sprite: 'maxie' },
        { name: 'Penny', type: 'normal', sprite: 'penny' },
        { name: 'Giovanni', type: 'dark', sprite: 'giovanni' },
        { name: 'Wallace', type: 'flying', sprite: 'wallace' },
        { name: 'Cyrus', type: 'dragon', sprite: 'cyrus' },
        { name: 'Diantha', type: 'fairy', sprite: 'diantha' },
        { name: 'Trace', type: 'bug', sprite: 'trace' },
        { name: 'Ghetsis', type: 'ice', sprite: 'ghetsis' },
        { name: 'Steven', type: 'steel', sprite: 'steven' },
        { name: 'Leon', type: 'ground', sprite: 'leon' },
        { name: 'Alder', type: 'fighting', sprite: 'alder' },
        { name: 'Geeta', type: 'ghost', sprite: 'geeta' }
    ]
};

// Populate Arena Trainers
function populateArenaTrainers() {
    // Populate each league
    [1, 2, 3, 4].forEach(league => {
        const container = document.getElementById(`arena-trainers-league${league}`);
        if (!container) return;
        
        // If already populated, skip
        if (container.dataset.populated === 'true') return;
        
        const trainers = ARENA_TRAINERS[league];
        const leagueDivisions = {
            1: ['C', 'D'],
            2: ['B', 'C', 'D'],
            3: ['A', 'B', 'C', 'D'],
            4: ['SS', 'S', 'A', 'B', 'C', 'D']
        };
        const leagueColors = {
            1: 'var(--div-c)',
            2: 'var(--div-b)',
            3: 'var(--div-a)',
            4: 'var(--div-ss)'
        };
        const color = leagueColors[league];
        const divisions = leagueDivisions[league];
        const maxDivision = divisions[0]; // First division is the max (e.g., 'C' for league 1, 'SS' for league 4)
        
        let html = '';
        trainers.forEach(trainer => {
            const typeName = trainer.type.charAt(0).toUpperCase() + trainer.type.slice(1);
            
            html += `
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;align-items:center;gap:10px;transition:all 0.2s;cursor:pointer" 
                     onmouseover="this.style.borderColor='${color}'" 
                     onmouseout="this.style.borderColor='var(--border)'"
                     onclick="showTrainerPokemonPool('${trainer.name}', '${trainer.type}', ${league})"
                     title="${t('clickTrainerForPool') || 'Click to see possible Pokémon'}">
                    <div style="position:relative">
                        <img src="https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main/img/trainers/${trainer.sprite}.png" 
                             style="width:48px;height:48px;image-rendering:pixelated;border-radius:4px;background:var(--bg-input);padding:4px"
                             onerror="this.style.display='none'">
                        <span class="type-badge type-${trainer.type}" style="position:absolute;bottom:-4px;right:-4px;font-size:0.55rem;padding:1px 4px">${typeName.substring(0,3)}</span>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trainer.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-dim)">${typeName} Specialist</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.dataset.populated = 'true';
    });
}

// Show Pokémon pool for a trainer based on their type and league
function showTrainerPokemonPool(trainerName, type, league) {
    if (!pokemons || Object.keys(pokemons).length === 0) return;
    
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Define which divisions are available for each league
    // Based on game code: rotationFrontierCurrent determines the EXACT division
    // League 1 = C only, League 2 = B only, League 3 = A only, League 4 = S or SS
    const leagueDivisions = {
        1: ['C'],      // Little Cup: Division C ONLY
        2: ['B'],      // Great League: Division B ONLY
        3: ['A'],      // Ultra League: Division A ONLY
        4: ['SS', 'S'] // Master League: S or SS only (50/50 chance per encounter)
    };
    
    const divisions = leagueDivisions[league] || ['C', 'D'];
    const maxDiv = divisions[0]; // Highest division for this league
    
    // Get Pokémon for each division
    const pokemonByDivision = {};
    divisions.forEach(div => {
        pokemonByDivision[div] = [];
    });
    
    Object.entries(pokemons).forEach(([id, pkmn]) => {
        if (id.includes('unown')) return;
        if (!pkmn.types || pkmn.types.length === 0) return;
        if (!pkmn.types.includes(type)) return;
        
        const div = pkmn.division || returnPkmnDivision(pkmn);
        
        // Only include Pokémon whose division is in the allowed list for this league
        if (!divisions.includes(div)) return;
        
        if (pokemonByDivision[div]) {
            pokemonByDivision[div].push({ id, ...pkmn });
        }
    });
    
    // Sort each division by name
    divisions.forEach(div => {
        pokemonByDivision[div].sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));
    });
    
    // Build modal content
    let content = `<div style="max-height:70vh;overflow-y:auto">`;
    
    // Show info about division selection
    let divisionInfo = '';
    if (league === 4) {
        divisionInfo = t('masterLeagueDivInfo') || 'Division S to SSS (random per encounter)';
    } else {
        divisionInfo = `${t('divisionOnly') || 'Division'} ${maxDiv} ${t('only') || 'only'}`;
    }
    
    content += `
        <div style="background:rgba(0,212,255,0.1);border:1px solid var(--accent-blue);border-radius:6px;padding:8px 12px;margin-bottom:15px;font-size:0.8rem;color:var(--text-dim)">
            <strong style="color:var(--accent-blue)">ℹ️</strong> ${divisionInfo}
        </div>
    `;
    
    divisions.forEach(div => {
        const pokemonList = pokemonByDivision[div];
        if (pokemonList.length === 0) return;
        
        const colorVar = div === 'SS' ? 'var(--div-ss)' : 
                        div === 'S' ? 'var(--div-s)' : 
                        div === 'A' ? 'var(--div-a)' : 
                        div === 'B' ? 'var(--div-b)' : 
                        div === 'C' ? 'var(--div-c)' : 'var(--div-d)';
        
        content += `
            <div style="margin-bottom:20px">
                <div style="background:${colorVar}20;border:1px solid ${colorVar}40;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-weight:700;color:${colorVar};display:flex;align-items:center;gap:8px">
                    <span class="division-badge div-${div.toLowerCase()}">${div}</span>
                    <span>${pokemonList.length} Pokémon</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">
        `;
        
        pokemonList.forEach(p => {
            const spriteName = p.sprite || p.id;
            content += `
                <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center;cursor:pointer" 
                     onclick="showPokemonDetails('${p.id}')"
                     onmouseover="this.style.borderColor='var(--accent-blue)'"
                     onmouseout="this.style.borderColor='var(--border)'">
                    <img src="https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main/img/pkmn/sprite/${spriteName}.png" 
                         style="width:48px;height:48px;image-rendering:pixelated"
                         onerror="this.src='https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main/img/pkmn/sprite/unknown.png'">
                    <div style="font-size:0.65rem;color:var(--text-dim);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.displayName || p.id}</div>
                </div>
            `;
        });
        
        content += `</div></div>`;
    });
    
    content += `</div>`;
    
    openModal(`
        <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:1.5rem">⚔️</span>
            <div>
                <div style="font-size:1.1rem;font-weight:700">${trainerName}</div>
                <div style="font-size:0.85rem;color:var(--text-dim)">${typeName} Type • ${t('arenaTrainerPoolTitle') || 'Possible Pokémon'}</div>
            </div>
        </div>
    `, content);
}