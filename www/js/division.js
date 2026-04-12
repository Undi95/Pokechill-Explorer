// ============ DIVISION ============
function searchByDivision() {
    const se = document.getElementById('div-search').value.toLowerCase();
    const div = document.getElementById('div-filter').value;
    const ty = document.getElementById('div-type').value;
    const ty2 = document.getElementById('div-type2').value;
    
    // Update URL hash
    updateURLHash('division', { search: se, div, type: ty, type2: ty2 });
    
    // Division order for sorting (D=0 weakest to SSS=6 strongest)
    const divOrder = { 'D': 0, 'C': 1, 'B': 2, 'A': 3, 'S': 4, 'SS': 5, 'SSS': 6 };
    
    const res = Object.values(pokemons).filter(p => {
        if (se && !p.name.toLowerCase().includes(se) && !(p.displayName || '').toLowerCase().includes(se)) return false;
        if (div && p.division !== div) return false;
        if (ty && !p.types.includes(ty)) return false;
        if (ty2 && !p.types.includes(ty2)) return false;
        return true;
    }).sort((a, b) => {
        // Sort by division first (D to SSS), then by BST within division
        const divDiff = divOrder[a.division] - divOrder[b.division];
        if (divDiff !== 0) return divDiff;
        return b.totalBST - a.totalBST;
    });
    
    const c = document.getElementById('division-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    
    const divText = div ? `${t("division")} ${div}` : t('allDivisions');
    
    // Use lazy loading
    currentListData['division-results'] = { list: res, clickAction: 'details', loaded: BATCH_SIZE };
    
    const initial = res.slice(0, BATCH_SIZE);
    const remaining = res.length - BATCH_SIZE;
    
    let html = `<div class="results-info">${res.length} Pokémon (${divText})</div>
        <div class="results-grid" id="division-results-grid">${initial.map(p => renderPokemonCard(p, 'details')).join('')}</div>`;
    
    if (remaining > 0) {
        html += `<div style="text-align:center;margin-top:15px">
            <button class="btn" onclick="loadMorePokemon('division-results')" id="division-results-loadmore">
                ➕ ${t('loadMore')} (${remaining} ${t('remaining')})
            </button>
        </div>`;
    }
    c.innerHTML = html;
}

function showPokemonDetails(name) {
    const p = pokemons[name]; if (!p) return;
    const b = p.bst;
    
    // Find where this Pokemon can be CAUGHT
    const wildLocations = [];
    const eventLocations = [];
    const seasonalLocations = [];
    Object.values(areas).forEach(a => {
        if (!a.spawns.common.includes(name) && !a.spawns.uncommon.includes(name) && !a.spawns.rare.includes(name)) return;
        
        const rarity = a.spawns.rare.includes(name) ? 'rare' : a.spawns.uncommon.includes(name) ? 'uncommon' : 'common';
        
        // Wild type = always catchable
        if (a.type === 'wild') {
            wildLocations.push({ area: a.name, rarity, level: a.level });
        }
        // Event type = catchable ONLY if NOT uncatchable
        else if (a.type === 'event' && !a.uncatchable) {
            eventLocations.push({ area: a.name, rarity, level: a.level, rotation: a.rotation || 0 });
        }
        // Season type (Limited areas) = catchable ONLY if NOT uncatchable (treated as event)
        else if (a.type === 'season' && !a.uncatchable) {
            seasonalLocations.push({ area: a.name, rarity, level: a.level, season: a.season });
        }
        // Dungeon type = NEVER catchable (skip)
    });
    
    // Check if this Pokemon is an event REWARD
    const eventRewardAreas = [];
    Object.values(areas).forEach(a => {
        if (a.rewards && a.rewards.pokemon && a.rewards.pokemon.includes(name)) {
            eventRewardAreas.push({ area: a.name, rotation: a.rotation || 0 });
        }
    });
    
    // For Mega Pokemon, find where to get the mega stone (use evolveMethod for exact match)
    let megaStoneSource = null;
    if (name.startsWith('mega')) {
        const method = evolutionRelations.evolveMethod[name];
        const stoneName = method?.type === 'item' ? method.value : null;
        if (stoneName) {
            Object.values(areas).forEach(a => {
                if (a.rewards && a.rewards.items && a.rewards.items.includes(stoneName)) {
                    megaStoneSource = { area: a.name, rotation: a.rotation || 0, stone: stoneName };
                }
            });
        }
    }
    
    // Get possible abilities (by type)
    const possibleAbilities = Object.values(abilities).filter(a => {
        if (a.name === p.hiddenAbility) return false;
        return a.types.includes('all') || p.types.some(t => a.types.includes(t));
    }).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    
    // Get learnable moves (by type/moveset) - exclude signatures
    const learnableMoves = Object.values(moves).filter(m => {
        if (m.name === p.signature) return false;
        if (m.isSignature) return false;
        if (!m.moveset || m.moveset.length === 0) return false;
        return m.moveset.includes('all') || p.types.some(t => m.moveset.includes(t));
    }).sort((a, b) => (a.rarity || 1) - (b.rarity || 1) || (b.power || 0) - (a.power || 0));
    
    // Obtain badge and event form badge for header (skip secret badge here, shown in availability)
    const obtainBadgeHtml = p.isSecret ? '' : obtainBadge(p.obtainedIn);
    // Show season badge if Pokemon has a season, otherwise show event form badge
    const eventFormBadge = p.isEventForm ? 
        (p.season ? 
            `<span style="padding:2px 8px;background:rgba(255,102,0,0.2);color:var(--accent-orange);border:1px solid rgba(255,102,0,0.4);border-radius:4px;font-size:0.8rem;margin-left:8px" title="${t('seasonalArea') || 'Seasonal Area'} - ${t(p.season) || p.season}">${getSeasonEmoji(p.season)} ${t(p.season) || p.season}</span>` :
            `<span style="padding:2px 8px;background:rgba(255,136,0,0.2);color:var(--accent-orange);border:1px solid rgba(255,136,0,0.4);border-radius:4px;font-size:0.8rem;margin-left:8px" title="${t('eventForm') || 'Event Form'}">🎃 ${t('event') || 'Event'}</span>`
        ) : '';
    
    let html = `<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">
        <div style="text-align:center">
            <img id="modal-sprite" src="${sprite(p.name)}" style="width:96px;height:96px;image-rendering:pixelated;transition:filter 0.2s">
            ${divBadge(p.division)}
            <div style="margin-top:8px;color:var(--text-dim)">${p.stars} ★ | BST: ${p.totalBST}</div>
            ${obtainBadgeHtml ? `<div style="margin-top:8px">${obtainBadgeHtml}${eventFormBadge}</div>` : ''}
        </div>
        <div style="flex:1">
            <div class="type-badges">${p.types.map(t => typeBadge(t)).join('')}</div>
            <!-- Shiny Toggle & Star Sign Selector (v4.8) -->
            <div style="margin-top:12px;padding:10px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)">
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.9rem">
                        <input type="checkbox" id="modal-shiny-toggle" onchange="toggleModalShiny('${name}')" style="width:18px;height:18px;accent-color:var(--accent-gold)">
                        <span>✨ ${t('shiny') || 'Shiny'}</span>
                    </label>
                    <div id="modal-starsign-container" style="display:inline-block">
                        <select id="modal-starsign-select" onchange="updateModalSprite('${name}')" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.8rem;color:var(--accent-gold)">
                            <option value="">✨ Normal</option>
                            ${GAME_CONFIG.STAR_SIGNS ? Object.keys(GAME_CONFIG.STAR_SIGNS).map(ss => `<option value="${ss}">${format(ss)}</option>`).join('') : ''}
                        </select>
                    </div>
                </div>
            </div>
            <div class="stats-row" style="max-width:400px">
                <div class="stat-mini"><div class="stat-mini-name">HP</div><div class="stat-mini-value">${b.hp}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.hp))}</div></div>
                <div class="stat-mini"><div class="stat-mini-name">ATK</div><div class="stat-mini-value">${b.atk}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.atk))}</div></div>
                <div class="stat-mini"><div class="stat-mini-name">DEF</div><div class="stat-mini-value">${b.def}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.def))}</div></div>
                <div class="stat-mini"><div class="stat-mini-name">SATK</div><div class="stat-mini-value">${b.satk}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.satk))}</div></div>
                <div class="stat-mini"><div class="stat-mini-name">SDEF</div><div class="stat-mini-value">${b.sdef}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.sdef))}</div></div>
                <div class="stat-mini"><div class="stat-mini-name">SPE</div><div class="stat-mini-value">${b.spe}</div><div class="stat-mini-stars">${'★'.repeat(statToStars(b.spe))}</div></div>
            </div>
        </div>
    </div>`;
    
    // Lore (legendary/mythical Pokemon)
    if (p.lore) {
        html += `<div class="modal-section"><div class="modal-section-title" style="color:var(--accent-blue)">📜 ${t('lore')}</div>
            <div style="padding:12px;background:rgba(100,100,255,0.08);border:1px solid rgba(100,100,255,0.15);border-radius:8px;font-style:italic;color:var(--text-dim);line-height:1.5">${p.lore}</div></div>`;
    }
    
    // Hidden Ability
    if (p.hiddenAbility && abilities[p.hiddenAbility]) {
        const ha = abilities[p.hiddenAbility];
        html += `<div class="modal-section"><div class="modal-section-title ha">⭐ ${t('hiddenAbility')} (${t('ability2Fixed')})</div>
            <div style="padding:10px;background:rgba(255,215,0,0.1);border-radius:6px">
                <strong style="color:var(--accent-gold)">${ha.displayName}</strong> ${rarityBadge(ha.rarity)}
                ${ha.info ? `<p style="margin-top:6px;color:var(--text-dim)">${ha.info}</p>` : ''}
            </div></div>`;
    }
    
    // Note: Star Signs sont des variations aléatoires des shinies (1/4000 chance)
    // Ce ne sont pas des propriétés fixes du Pokémon, donc on ne les affiche pas ici
    
    // Signature Move (only if it's actually a move, not an ability - game data bug fix)
    if (p.signature && moves[p.signature] && !abilities[p.signature]) {
        const sig = moves[p.signature];
        html += `<div class="modal-section"><div class="modal-section-title sig">💫 ${t('signatureMove')}</div>
            <div style="padding:10px;background:rgba(255,0,170,0.1);border-radius:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                ${typeBadge(sig.type)}
                <strong style="color:var(--accent-pink)">${sig.displayName}</strong>
                <span style="color:var(--text-dim)">${sig.split}</span>
                ${sig.power ? `<span style="color:var(--accent-blue)">${t('power')}: ${sig.power}</span>` : ''}
                ${(sig.timer === 'fast' || sig.timer === 'veryFast' || sig.timer === 'extremelyFast') ? `<span class="speed-badge speed-fast">${t('timerFast')}${sig.timer === 'extremelyFast' ? '++' : (sig.timer === 'veryFast' ? '+' : '')}</span>` : sig.timer === 'slow' ? `<span class="speed-badge speed-slow">${t('timerSlow')}</span>` : sig.timer === 'verySlow' ? `<span class="speed-badge speed-slow">${t('timerSlow')}+</span>` : ''}
                ${sig.info ? `<p style="width:100%;margin-top:6px;color:var(--text-dim)">${sig.info}</p>` : ''}
            </div></div>`;
    }
    
    // Egg Move (new in v3.8)
    if (p.eggMove && moves[p.eggMove]) {
        const egg = moves[p.eggMove];
        html += `<div class="modal-section"><div class="modal-section-title" style="color:#ff9ecd">🥚 ${t('eggMove') || 'Egg Move'}</div>
            <div style="padding:10px;background:rgba(255,158,205,0.1);border:1px solid rgba(255,158,205,0.3);border-radius:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                ${typeBadge(egg.type)}
                <strong style="color:#ff9ecd">${egg.displayName}</strong>
                <span style="color:var(--text-dim)">${egg.split}</span>
                ${egg.power ? `<span style="color:var(--accent-blue)">${t('power')}: ${egg.power}</span>` : ''}
                ${(egg.timer === 'fast' || egg.timer === 'veryFast' || egg.timer === 'extremelyFast') ? `<span class="speed-badge speed-fast">${t('timerFast')}${egg.timer === 'extremelyFast' ? '++' : (egg.timer === 'veryFast' ? '+' : '')}</span>` : egg.timer === 'slow' ? `<span class="speed-badge speed-slow">${t('timerSlow')}</span>` : egg.timer === 'verySlow' ? `<span class="speed-badge speed-slow">${t('timerSlow')}+</span>` : ''}
                ${egg.info ? `<p style="width:100%;margin-top:6px;color:var(--text-dim)">${egg.info}</p>` : ''}
            </div></div>`;
    }
    
    // Float property (if applicable)
    if (p.float) {
        html += '<div style="margin-top:8px;font-size:0.85rem;color:var(--accent-blue);">✓ ' + t('float') + '</div>';
    }
    
    // Possible Abilities
    if (possibleAbilities.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title">🎲 ${t('possibleAbilities')} (${t('ability1Random')}) <span style="color:var(--text-dim);font-weight:400">(${possibleAbilities.length})</span></div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:200px;overflow-y:auto">
                ${possibleAbilities.map(a => `<div style="padding:6px 10px;background:var(--bg-input);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid var(--border)" onclick="showAbilityPokemon('${a.name}')" title="${escapeAttr(a.info || '')}">
                    <span style="color:${a.rarity === 3 ? 'var(--accent-gold)' : a.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${a.displayName}</span>
                    <span style="font-size:0.7rem;color:var(--text-dim);margin-left:4px">R${a.rarity}</span>
                </div>`).join('')}
            </div></div>`;
    }

    // Memory Abilities (learnable via Memory items)
    const memoryAbilities = Object.values(items).filter(item => {
        if (item.type !== 'memory') return false;
        if (!item.ability || !abilities[item.ability]) return false;
        if (abilities[item.ability].name === p.hiddenAbility) return false;
        if (item.memoryTypings && item.memoryTypings.length > 0) {
            return item.memoryTypings.some(ty => p.types.includes(ty));
        } else {
            const ab = abilities[item.ability];
            return ab.types.includes('all') || p.types.some(ty => ab.types.includes(ty));
        }
    });
    if (memoryAbilities.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title">🧠 ${t('memoryAbilities') || 'Memory Abilities'} <span style="color:var(--text-dim);font-weight:400">(${memoryAbilities.length})</span></div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:200px;overflow-y:auto">
                ${memoryAbilities.map(item => {
                    const ab = abilities[item.ability];
                    const imgSrc = item.memoryImage ? itemImg(`${item.memoryImage}Memory`) : itemImg(item.name);
                    return `<div style="padding:6px 10px;background:var(--bg-input);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid var(--border);display:flex;align-items:center;gap:6px" onclick="showAbilityPokemon('${ab.name}')" title="${escapeAttr(ab.info || '')}">
                        <img src="${imgSrc}" style="width:20px;height:20px;image-rendering:pixelated" onerror="this.style.display='none'">
                        <span style="color:${ab.rarity === 3 ? 'var(--accent-gold)' : ab.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${ab.displayName || format(item.ability)}</span>
                        <span style="font-size:0.7rem;color:var(--text-dim)">R${ab.rarity || 1}</span>
                    </div>`;
                }).join('')}
            </div></div>`;
    }

    // Learnable Moves
    if (learnableMoves.length > 0) {
        // Check which moves have TMs
        const tmMoves = new Set(Object.values(items).filter(i => i.isTM && i.moveInfo).map(i => i.moveInfo.name));
        
        html += `<div class="modal-section"><div class="modal-section-title">⚔️ ${t('learnableMoves')} <span style="color:var(--text-dim);font-weight:400">(${learnableMoves.length})</span></div>
            <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px">${t('levelHint')} | 💿 = ${t('viaTM')}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;max-height:300px;overflow-y:auto">
                ${learnableMoves.map(m => `<div style="padding:6px 10px;background:var(--bg-input);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid var(--border);display:flex;align-items:center;gap:8px" onclick="showMovePokemon('${m.name}')" title="${m.info || ''}">
                    ${tmMoves.has(m.name) ? '<span title="' + t('viaTM') + '" style="font-size:0.7rem">💿</span>' : ''}
                    ${typeBadge(m.type)}
                    <span style="flex:1;color:${m.rarity === 3 ? 'var(--accent-gold)' : m.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${m.displayName}</span>
                    ${m.isEggMove ? '<span title="Egg Move" style="font-size:0.7rem">🥚</span>' : ''}
                    ${m.power ? `<span style="color:var(--accent-blue);font-size:0.8rem">${m.power}</span>` : ''}
                    ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? '<span class="speed-badge speed-fast" style="font-size:0.6rem">' + (m.timer === 'extremelyFast' ? 'F++' : (m.timer === 'veryFast' ? 'F+' : 'F')) + '</span>' : (m.timer === 'slow' || m.timer === 'verySlow') ? '<span class="speed-badge speed-slow" style="font-size:0.6rem">' + (m.timer === 'verySlow' ? 'S+' : 'S') + '</span>' : ''}
                    ${m.multihit ? '<span style="color:var(--accent-gold);font-size:0.7rem">×'+m.multihit[1]+'</span>' : ''}
                </div>`).join('')}
            </div></div>`;
    }
    
    // Genetics-Only Moves - Split by STAB (Same Type Attack Bonus) vs Coverage
    const learnableMoveNames = new Set(learnableMoves.map(m => m.name));
    const pokemonTypes = p.types;
    
    // All inheritable moves (have moveset, not signature, not naturally learnable)
    const allGeneticsMoves = Object.values(moves).filter(m => {
        if (m.name === p.signature) return false;
        if (m.isSignature) return false;
        if (!m.moveset || m.moveset.length === 0) return false;
        if (learnableMoveNames.has(m.name)) return false;
        return true;
    });
    
    // Split: STAB moves (same type as Pokemon) vs Coverage (other types)
    const geneticsSTAB = allGeneticsMoves.filter(m => pokemonTypes.includes(m.type));
    const geneticsCoverage = allGeneticsMoves.filter(m => !pokemonTypes.includes(m.type));
    
    // Sort by power
    geneticsSTAB.sort((a, b) => (b.power || 0) - (a.power || 0));
    geneticsCoverage.sort((a, b) => (b.power || 0) - (a.power || 0));
    
    // STAB Genetics (same type as Pokemon - gets 1.5x damage bonus)
    if (geneticsSTAB.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title genetics">🧬 ${t("geneticsStab")} <span style="color:var(--text-dim);font-weight:400">(${geneticsSTAB.length})</span></div>
            <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px">${t("geneticsStabDesc")}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;max-height:200px;overflow-y:auto">
                ${geneticsSTAB.map(m => `<div style="padding:6px 10px;background:rgba(170,0,255,0.08);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid rgba(170,0,255,0.3);display:flex;align-items:center;gap:8px" onclick="showMovePokemon('${m.name}')" title="${m.info || ''}">
                    ${typeBadge(m.type)}
                    <span style="flex:1;color:${m.rarity === 3 ? 'var(--accent-gold)' : m.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${m.displayName}</span>
                    ${m.power ? `<span style="color:var(--accent-blue);font-size:0.8rem">${m.power}</span>` : ''}
                    ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? '<span class="speed-badge speed-fast" style="font-size:0.6rem">' + (m.timer === 'extremelyFast' ? 'F++' : (m.timer === 'veryFast' ? 'F+' : 'F')) + '</span>' : (m.timer === 'slow' || m.timer === 'verySlow') ? '<span class="speed-badge speed-slow" style="font-size:0.6rem">' + (m.timer === 'verySlow' ? 'S+' : 'S') + '</span>' : ''}
                </div>`).join('')}
            </div></div>`;
    }
    
    // Coverage Genetics (different type - for coverage)
    if (geneticsCoverage.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title" style="color:#4ecdc4">🎯 ${t("geneticsCoverage")} <span style="color:var(--text-dim);font-weight:400">(${geneticsCoverage.length})</span></div>
            <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px">${t("geneticsCoverageDesc")}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;max-height:200px;overflow-y:auto">
                ${geneticsCoverage.map(m => `<div style="padding:6px 10px;background:rgba(78,205,196,0.08);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid rgba(78,205,196,0.3);display:flex;align-items:center;gap:8px" onclick="showMovePokemon('${m.name}')" title="${m.info || ''}">
                    ${typeBadge(m.type)}
                    <span style="flex:1;color:${m.rarity === 3 ? 'var(--accent-gold)' : m.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${m.displayName}</span>
                    ${m.power ? `<span style="color:var(--accent-blue);font-size:0.8rem">${m.power}</span>` : ''}
                    ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? '<span class="speed-badge speed-fast" style="font-size:0.6rem">' + (m.timer === 'extremelyFast' ? 'F++' : (m.timer === 'veryFast' ? 'F+' : 'F')) + '</span>' : (m.timer === 'slow' || m.timer === 'verySlow') ? '<span class="speed-badge speed-slow" style="font-size:0.6rem">' + (m.timer === 'verySlow' ? 'S+' : 'S') + '</span>' : ''}
                </div>`).join('')}
            </div></div>`;
    }
    
    // === AVAILABILITY SECTION ===
    const shopPkmn = shopItems['pokemon_' + name];
    const preEvo = evolutionRelations.evolvesFrom[name];
    const evolutions = evolutionRelations.evolvesTo[name] || [];
    
    html += `<div class="modal-section"><div class="modal-section-title">📍 ${t('availability')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">`;
    
    // Mega stone source (for Mega Pokemon)
    if (megaStoneSource) {
        html += `<span style="padding:6px 12px;background:rgba(170,0,255,0.15);border:1px solid var(--accent-purple);border-radius:6px;font-size:0.85rem;cursor:pointer" onclick="showAreaDetails('${megaStoneSource.area}')">
            💎 Mega Stone: ${areas[megaStoneSource.area]?.displayName || format(megaStoneSource.area)} ${megaStoneSource.rotation ? `<span style="color:var(--text-dim)">(Rot.${megaStoneSource.rotation})</span>` : ''}
        </span>`;
    }
    
    // Event rewards (Pokemon obtained by defeating event boss)
    if (eventRewardAreas.length > 0) {
        html += eventRewardAreas.map(loc => `<span style="padding:6px 12px;background:rgba(248,208,48,0.15);border:1px solid var(--accent-gold);border-radius:6px;font-size:0.85rem;cursor:pointer" onclick="showAreaDetails('${loc.area}')">
            🏆 ${t('reward')}: ${areas[loc.area]?.displayName || format(loc.area)} ${loc.rotation ? `<span style="color:var(--text-dim)">(Rot.${loc.rotation})</span>` : ''}
        </span>`).join('');
    }
    
    // Shop availability
    if (shopPkmn) {
    const isGold = shopPkmn.currency === 'goldenBottleCap' || shopPkmn.currency === 'gold';
    const currImg = isGold ? itemImg('goldenBottleCap') : itemImg('bottleCap');
    html += `<span style="padding:6px 12px;background:rgba(0,212,255,0.1);border:1px solid var(--accent-blue);border-radius:6px;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px">
        🛒 ${t('inShop')} <img src="${currImg}" style="width:20px;height:20px;image-rendering:pixelated"> ${shopPkmn.price}
    </span>`;
}
    
    // Wild spawn locations
    if (wildLocations.length > 0) {
        html += wildLocations.map(loc => `<span style="padding:6px 12px;background:var(--bg-input);border-radius:6px;font-size:0.85rem;cursor:pointer;border:1px solid var(--border)" onclick="showAreaDetails('${loc.area}')">
            🌿 ${areas[loc.area]?.displayName || format(loc.area)} <span style="color:${loc.rarity === 'rare' ? 'var(--accent-gold)' : loc.rarity === 'uncommon' ? 'var(--accent-blue)' : '#aaa'}">(${loc.rarity})</span> Lv${loc.level}
        </span>`).join('');
    }
    
    // Event locations (catchable ones only)
    if (eventLocations.length > 0) {
        html += eventLocations.map(loc => `<span style="padding:6px 12px;background:rgba(248,208,48,0.1);border:1px solid rgba(248,208,48,0.4);border-radius:6px;font-size:0.85rem;cursor:pointer" onclick="showAreaDetails('${loc.area}')">
            ⭐ ${areas[loc.area]?.displayName || format(loc.area)} ${loc.rotation ? `<span style="color:var(--text-dim)">(Rot.${loc.rotation})</span>` : ''}
        </span>`).join('');
    }
    
    // Seasonal/Limited Event locations
    if (seasonalLocations.length > 0) {
        html += seasonalLocations.map(loc => `<span style="padding:6px 12px;background:rgba(255,102,0,0.1);border:1px solid rgba(255,102,0,0.4);border-radius:6px;font-size:0.85rem;cursor:pointer" onclick="showAreaDetails('${loc.area}')">
            🎃 ${areas[loc.area]?.displayName || format(loc.area)} <span style="color:var(--text-dim)">(${loc.rarity})</span> Lv${loc.level}
        </span>`).join('');
    }
    
    // Wildlife Park
    if (wildlifePool.common.includes(name) || wildlifePool.uncommon.includes(name) || wildlifePool.rare.includes(name)) {
        const parkRarity = wildlifePool.rare.includes(name) ? 'rare' : wildlifePool.uncommon.includes(name) ? 'uncommon' : 'common';
        html += `<span style="padding:6px 12px;background:rgba(0,255,170,0.1);border:1px solid var(--accent-green);border-radius:6px;font-size:0.85rem">
            🏞️ Wildlife Park <span style="color:${parkRarity === 'rare' ? 'var(--accent-gold)' : parkRarity === 'uncommon' ? 'var(--accent-blue)' : '#aaa'}">(${parkRarity})</span>
        </span>`;
    }
    
    // Battle Frontier exclusive
    if (exclusiveFrontierPkmn.includes(name)) {
        html += `<span style="padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid var(--accent-gold);border-radius:6px;font-size:0.85rem">
            🏆 Battle Frontier
        </span>`;
    }
    
    // Secret Pokemon - clickable badge
    if (p.isSecret) {
        html += `<span style="padding:6px 12px;background:rgba(148,0,211,0.15);border:1px solid rgba(148,0,211,0.5);border-radius:6px;font-size:0.85rem;cursor:pointer;color:#9400D3" onclick="showSecretInfo()">
            🔒 ${t('obtSecret') || 'Secret'} - ${t('clickForInfo') || 'Click for info'}
        </span>`;
    }
    
    // Check if Pokemon has ANY availability (including seasonal areas and secret Pokemon)
    const hasDirectObtain = shopPkmn || wildLocations.length > 0 || eventLocations.length > 0 || seasonalLocations.length > 0 || eventRewardAreas.length > 0 || megaStoneSource ||
        wildlifePool.common.includes(name) || wildlifePool.uncommon.includes(name) || wildlifePool.rare.includes(name) ||
        exclusiveFrontierPkmn.includes(name) || p.isSecret;
    
    if (p.obtainedIn === 'unobtainable') {
        html += `<span style="padding:6px 12px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);border-radius:6px;font-size:0.85rem;color:#ff6666">
            ❌ ${t('unobtainable')}
        </span>`;
    }
    
    html += `</div></div>`;
    
    // === EVOLUTION FAMILY SECTION ===
const getFullEvolutionChain = (startName) => {
    const chain = [];
    const visited = new Set();
    
    let base = startName;
    while (evolutionRelations.evolvesFrom[base]) {
        base = evolutionRelations.evolvesFrom[base];
    }
    
    const addToChain = (pkmnName) => {
        if (visited.has(pkmnName) || !pokemons[pkmnName]) return;
        visited.add(pkmnName);
        
        const p = pokemons[pkmnName];
        const method = evolutionRelations.evolveMethod[pkmnName];
        
        chain.push({
            name: pkmnName,
            displayName: p.displayName || format(pkmnName),
            isCurrent: pkmnName === name,
            obtainedIn: p.obtainedIn,
            method: method 
        });
        
        const evos = evolutionRelations.evolvesTo[pkmnName] || [];
        evos.forEach(evo => addToChain(evo));
    };
    
    addToChain(base);
    return chain;
};

const evoChain = getFullEvolutionChain(name);

if (evoChain.length > 1) {
    html += `<div class="modal-section"><div class="modal-section-title">🔄 ${t('evolutionFamily')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:15px;background:var(--bg-input);border-radius:10px">`;
    
    evoChain.forEach((step, index) => {
        html += `<div style="text-align:center;padding:10px;background:${step.isCurrent ? 'rgba(0,212,255,0.2)' : 'var(--bg-card)'};border:2px solid ${step.isCurrent ? 'var(--accent-blue)' : 'var(--border)'};border-radius:10px;min-width:90px;cursor:pointer" onclick="showPokemonDetails('${step.name}')">
            <img src="${sprite(step.name)}" style="width:56px;height:56px;image-rendering:pixelated">
            <div style="font-size:0.8rem;font-weight:${step.isCurrent ? '700' : '400'};color:${step.isCurrent ? 'var(--accent-blue)' : 'var(--text-main)'};margin-top:4px">${step.displayName}</div>
            <div style="font-size:0.7rem;color:var(--text-dim)">${getObtainIcon(step.obtainedIn)} ${getObtainLabel(step.obtainedIn)}</div>
        </div>`;
        
        if (index < evoChain.length - 1) {
            const nextStep = evoChain[index + 1];
            let methodHtml = '';
            
            if (nextStep.method) {
                if (nextStep.method.type === 'level') {
                    methodHtml = `<div style="background:var(--accent-blue);color:var(--bg-dark);padding:4px 12px;border-radius:12px;font-size:0.75rem;font-weight:700">${t('level')} ${nextStep.method.value}</div>`;
                } else if (nextStep.method.type === 'item') {
                    const itemData = items[nextStep.method.value];
                    methodHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                        <img src="${itemImg(nextStep.method.value)}" style="width:24px;height:24px;image-rendering:pixelated" onerror="this.style.display='none'">
                        <span style="font-size:0.7rem;color:var(--accent-gold);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${itemData?.displayName || format(nextStep.method.value)}</span>
                    </div>`;
                }
            } else {
                methodHtml = `<div style="color:var(--text-dim);font-size:1.2rem">→</div>`;
            }
            
            html += `<div style="display:flex;flex-direction:column;align-items:center;padding:0 10px;min-width:60px">${methodHtml}</div>`;
        }
    });
    
    html += `</div></div>`;
}
    
    openModal(`<img src="${sprite(p.name)}" onerror="this.style.display='none'"> ${p.displayName || format(p.name)}`, html);
}

function searchBST() {
    const sort = document.getElementById('bst-sort').value;
    const ty = document.getElementById('bst-type').value;
    const ty2 = document.getElementById('bst-type2').value;
    const div = document.getElementById('bst-div').value;
    
    // Update URL hash
    updateURLHash('bst', { sort, type: ty, type2: ty2, div });
    let res = Object.values(pokemons).filter(p => {
        if (ty && !p.types.includes(ty)) return false;
        if (ty2 && !p.types.includes(ty2)) return false;
        if (div && p.division !== div) return false;
        return true;
    });
    res.sort((a, b) => {
        if (sort === 'total') return b.totalBST - a.totalBST;
        return b.bst[sort] - a.bst[sort];
    });
    renderPokemonGrid(res, 'bst-results');
}