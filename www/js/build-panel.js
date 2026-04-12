// ============ BUILD PANEL ============
let currentBuildSubtab = 'builder';
let buildSlot = [{ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null }];

function getBuildTables() {
    return buildStableTables(); // Always use stable tables
}

function switchBuildSubtab(subtab) {
    currentBuildSubtab = subtab;
    
    // Update buttons
    const buttons = document.getElementById('build-subtab').getElementsByClassName('team-subtab-btn');
    Array.from(buttons).forEach(btn => btn.classList.remove('active'));
    document.getElementById(`build-subtab-${subtab}`).classList.add('active');
    
    // Hide all content
    document.getElementById('build-builder-content').style.display = 'none';
    document.getElementById('build-saved-content').style.display = 'none';
    
    // Show selected content
    document.getElementById(`build-${subtab}-content`).style.display = 'block';
    
    if (subtab === 'saved') loadSavedBuilds();
}

function initBuildBuilder() {
    const buildInput = document.getElementById('build-search');
    buildInput.placeholder = t('searchPokemonPlaceholder') || 'Search Pokémon...';
    buildInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addBuildPokemon(); }
    });
}

function renderBuildSlot() {
    const container = document.getElementById('build-slot');
    if (!container) return;
    
    const slot = buildSlot[0];
    
    if (slot.pokemon) {
        const p = pokemons[slot.pokemon];
        if (!p) return;
        
        // Validate nature - reset if no longer available for this Pokemon
        if (slot.nature && !isNatureAvailable(p, slot.nature)) {
            slot.nature = null;
        }
        
        const learnableMoves = getLearnableMoves(slot.pokemon);
        const possibleAbilities = getPossibleAbilities(slot.pokemon);
        
        // Add the Pokemon's specific HA to the list if not already there
        const pokemonHA = p.hiddenAbility;
        if (pokemonHA && !possibleAbilities.includes(pokemonHA)) {
            possibleAbilities.unshift(pokemonHA);
        }
        
        // Add Memory abilities (learnable via Memory items)
        // Get all unique abilities from Memory items + map to memory item
        const memoryAbilities = new Set();
        const abilityToMemory = {};
        Object.values(items).forEach(item => {
            if (item.type === 'memory' && item.ability && abilities[item.ability]) {
                // Don't add if it's the Pokemon's own HA (already shown separately)
                if (item.ability !== pokemonHA) {
                    memoryAbilities.add(item.ability);
                    abilityToMemory[item.ability] = item.name;
                }
            }
        });
        
        // Add all Memory abilities to the list
        memoryAbilities.forEach(a => {
            if (!possibleAbilities.includes(a)) {
                possibleAbilities.push(a);
            }
        });
        
        // Sort alphabetically
        possibleAbilities.sort((a, b) => {
            const aa = abilities[a], ab = abilities[b];
            return (aa?.displayName || a).localeCompare(ab?.displayName || b);
        });
        
        // Get ribbons from save data
        let ribbonsHtml = '';
        if (loadedSaveData && loadedSaveData[slot.pokemon]) {
            const pkmnData = loadedSaveData[slot.pokemon];
            if (pkmnData && pkmnData.ribbons && pkmnData.ribbons.length > 0) {
                ribbonsHtml = `<div class="dream-ribbons">${getRibbonsHtml(pkmnData.ribbons)}</div>`;
            }
        }
        
        container.innerHTML = `<div class="dream-slot">
            <button class="dream-slot-remove" onclick="clearBuild()">✕</button>
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
                        <label class="dream-slot-shiny"><input type="checkbox" ${slot.shiny ? 'checked' : ''} onchange="toggleBuildShiny(this.checked)"> ✨ ${t('shiny') || 'Shiny'}</label>
                        ${GAME_CONFIG.STAR_SIGNS ? `
                        <select onchange="setBuildStarSign(this.value)" style="padding:2px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.75rem;color:var(--accent-gold);margin-left:4px">
                            <option value="">Normal</option>
                            ${Object.keys(GAME_CONFIG.STAR_SIGNS).map(ss => `<option value="${ss}" ${slot.starSign === ss ? 'selected' : ''}>${format(ss)}</option>`).join('')}
                        </select>` : ''}
                        ${GAME_CONFIG.NATURES ? `
                        <select onchange="setBuildNature(this.value)" style="padding:2px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.75rem;color:#82dba4;margin-left:4px" title="${t('nature') || 'Nature'}">
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
            ${(() => {
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
                return `
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
                            <span onclick="cycleBuildIV('${stat}')" title="Cliquer pour changer" style="font-size:0.8rem;color:#ff4444;cursor:pointer;user-select:none;letter-spacing:-1px">${stars}</span>
                        </div>
                    `}).join('')}
                </div>
            </div>`})()}
            <div class="dream-slot-section">
                <div class="dream-slot-section-title">${t('ability') || 'Ability'}</div>
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
                    const isHA = selectedAbility === pokemonHA;
                    const selectedMemoryImg = getMemoryImg(selectedAbility);
                    const selectedAbilityName = selectedAbility ? (abilities[selectedAbility]?.displayName || format(selectedAbility)) : ('-- ' + (t('selectAbility') || 'Select Ability') + ' --');
                    return `<div class="ability-dropdown" id="build-ability-dropdown">
                        <div class="ability-dropdown-trigger" onclick="toggleBuildAbilityDropdown()">
                            ${selectedMemoryImg ? `<img src="${selectedMemoryImg}" style="width:16px;height:16px;image-rendering:pixelated;" onerror="this.style.display='none'">` : ''}
                            <span>${selectedAbilityName}${isHA ? ' (HA)' : ''}</span>
                        </div>
                        <div class="ability-dropdown-menu" id="build-ability-menu">
                            <div class="ability-dropdown-item" onclick="selectBuildAbility('')">
                                <span>-- ${t('selectAbility') || 'Select Ability'} --</span>
                            </div>
                            ${possibleAbilities.map(a => {
                                const isHAOpt = a === pokemonHA;
                                const memoryImg = getMemoryImg(a);
                                return `<div class="ability-dropdown-item" onclick="selectBuildAbility('${a}')">
                                    ${memoryImg ? `<img src="${memoryImg}" style="width:16px;height:16px;image-rendering:pixelated;" onerror="this.style.display='none'">` : '<span style="width:16px;"></span>'}
                                    <span>${abilities[a]?.displayName || format(a)}${isHAOpt ? ' (HA)' : ''}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
                })()}
                ${pokemonHA ? `
                <div style="margin-top:8px;padding:6px 10px;background:var(--bg-dark);border-radius:6px;font-size:0.8rem;">
                    <span style="color:var(--text-dim)">Hidden Ability:</span> 
                    <span style="color:var(--accent-gold);font-weight:600">${abilities[pokemonHA]?.displayName || format(pokemonHA)}</span>
                </div>
                ` : ''}
            </div>
            <div class="dream-slot-section">
                <div class="dream-slot-section-title">${t('item') || 'Item'}</div>
                <div class="dream-item-row">
                    <select class="dream-item-select" onchange="setBuildItem(this.value)">
                        <option value="">-- ${t('selectItem') || 'Select Item'} --</option>
                        ${Object.values(items).filter(i => i.type === 'held' || i.type === 'goods').sort((a,b) => a.displayName.localeCompare(b.displayName)).map(i => `<option value="${i.name}" ${slot.item === i.name ? 'selected' : ''}>${i.displayName || format(i.name)}</option>`).join('')}
                    </select>
                    ${slot.item ? `<img class="dream-item-icon" src="https://play-pokechill.github.io/img/items/${slot.item}.png" onerror="this.style.display='none'">` : ''}
                </div>
            </div>
            <div class="dream-slot-section">
                <div class="dream-slot-section-title">${t('moves') || 'Moves'}</div>
                <div class="dream-moves">
                    ${[0,1,2,3].map(i => `
                        <select class="dream-move-select" onchange="setBuildMove(${i}, this.value)">
                            <option value="">-- ${t('selectMove') || 'Move'} ${i+1} --</option>
                            ${learnableMoves.map(m => {
                                const moveData = moves[m];
                                const p = pokemons[slot.pokemon];
                                const isEggMove = moveData?.isEggMove;
                                const isNativeSignature = p?.signature === m;
                                const isReplicatorSignature = moveData?.isSignature && !isNativeSignature;
                                let suffix = '';
                                if (isEggMove) suffix += ' 🥚';
                                if (isReplicatorSignature) suffix += ' 🔬';
                                if (isNativeSignature) suffix += ' ⭐';
                                return `<option value="${m}" ${slot.moves[i] === m ? 'selected' : ''}>${moveData?.displayName || format(m)}${suffix}</option>`;
                            }).join('')}
                        </select>
                    `).join('')}
                </div>
            </div>
        </div>`;
    } else {
        container.innerHTML = `<div class="dream-slot empty" onclick="focusBuildSearch()">
            <div style="text-align:center;color:var(--text-dim)">
                <div style="font-size:3rem;margin-bottom:10px">+</div>
                <div>${t('emptySlot') || 'Empty slot - Click to add'}</div>
            </div>
        </div>`;
    }
}

function focusBuildSearch() {
    document.getElementById('build-search').focus();
}

function addBuildPokemon() {
    const input = document.getElementById('build-search');
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
    
    buildSlot[0] = { pokemon: name, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null };
    renderBuildSlot();
    input.value = '';
    updateBuildURL();
}

function clearBuild() {
    buildSlot[0] = { pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null };
    renderBuildSlot();
    updateBuildURL();
}

function setBuildNature(natureName) {
    // Check if nature is available for this Pokemon
    if (natureName && buildSlot[0].pokemon) {
        const pkmnData = pokemons[buildSlot[0].pokemon];
        if (!isNatureAvailable(pkmnData, natureName)) {
            // Nature not available, reset to null
            buildSlot[0].nature = null;
            renderBuildSlot();
            updateBuildURL();
            return;
        }
    }
    buildSlot[0].nature = natureName || null;
    renderBuildSlot();
    updateBuildURL();
}

function setBuildMove(moveIndex, moveName) {
    buildSlot[0].moves[moveIndex] = moveName || null;
    updateBuildURL();
}

// Ability dropdown functions for Build
function toggleBuildAbilityDropdown() {
    const menu = document.getElementById('build-ability-menu');
    if (menu) {
        menu.classList.toggle('open');
    }
}

function selectBuildAbility(abilityName) {
    buildSlot[0].ability = abilityName || null;
    const menu = document.getElementById('build-ability-menu');
    if (menu) menu.classList.remove('open');
    renderBuildSlot();
    updateBuildURL();
}

function setBuildAbility(abilityName) {
    buildSlot[0].ability = abilityName || null;
    updateBuildURL();
}

function setBuildItem(itemName) {
    buildSlot[0].item = itemName || null;
    renderBuildSlot();
    updateBuildURL();
}

function toggleBuildShiny(isShiny) {
    buildSlot[0].shiny = isShiny;
    // Star Sign can be kept even without shiny
    renderBuildSlot();
    updateBuildURL();
}

function setBuildStarSign(starSign) {
    buildSlot[0].starSign = starSign || null;
    renderBuildSlot();
    updateBuildURL();
}

function updateBuildURL() {
    const filters = getTabFilterValues('build');
    updateURLHash('build', filters);
}

function saveCurrentBuild() {
    const build = buildSlot[0];
    if (!build.pokemon) {
        alert(t('emptyError') || 'Add Pokémon before saving.');
        return;
    }
    
    const name = prompt(t('buildNamePrompt') || 'Build name:', pokemons[build.pokemon].displayName + ' Build');
    if (!name) return;
    
    const savedBuilds = JSON.parse(localStorage.getItem('buildsDB') || '[]');
    const newBuild = {
        id: 'build_' + Date.now(),
        name: name,
        created: new Date().toISOString(),
        build: JSON.parse(JSON.stringify(build))
    };
    
    savedBuilds.push(newBuild);
    localStorage.setItem('buildsDB', JSON.stringify(savedBuilds));
    alert(t('buildSavedSuccess') || 'Build saved successfully!');
}

function loadSavedBuilds() {
    const container = document.getElementById('saved-builds-list');
    const savedBuilds = JSON.parse(localStorage.getItem('buildsDB') || '[]');
    
    savedBuilds.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    if (savedBuilds.length === 0) {
        container.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-dim);background:var(--bg-card);border-radius:12px;border:2px dashed var(--border)">
            <div style="font-size:2rem;margin-bottom:10px">📭</div>
            <div data-i18n="noSavedBuilds">No saved builds</div>
            <div style="font-size:0.85rem;margin-top:10px;opacity:0.7">${t('createBuildHint') || 'Create a build in the Builder and click "Save"'}</div>
        </div>`;
        return;
    }
    
    container.innerHTML = savedBuilds.map(build => {
        const b = build.build;
        const p = pokemons[b.pokemon];
        return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:15px;position:relative">
            <div style="display:flex;gap:15px;margin-bottom:12px">
                <img src="${b.shiny ? spriteShiny(b.pokemon) : sprite(b.pokemon)}" style="width:64px;height:64px;image-rendering:pixelated;${b.starSign ? getStellarStyle(b.starSign) : ''}">
                <div style="flex:1">
                    <div style="font-weight:700;font-size:1.1rem">${build.name}</div>
                    <div style="font-size:0.85rem;color:var(--text-dim)">${p.displayName || format(b.pokemon)} ${b.shiny ? '✨' : ''} ${b.starSign ? `(${format(b.starSign)})` : ''}</div>
                    <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px">${new Date(build.created).toLocaleDateString()}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn-small" onclick="loadBuildIntoBuilder('${build.id}')" style="flex:1;background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,200,83,0.2));border-color:var(--success)">📝 ${t('load') || 'Load'}</button>
                <button class="btn btn-small btn-danger" onclick="deleteSavedBuild('${build.id}')" style="flex:1">🗑️ ${t('delete') || 'Delete'}</button>
            </div>
        </div>`;
    }).join('');
}

function loadBuildIntoBuilder(buildId) {
    const savedBuilds = JSON.parse(localStorage.getItem('buildsDB') || '[]');
    const build = savedBuilds.find(b => b.id === buildId);
    if (!build) return;
    
    buildSlot[0] = JSON.parse(JSON.stringify(build.build));
    renderBuildSlot();
    switchBuildSubtab('builder');
    updateBuildURL();
}

function deleteSavedBuild(buildId) {
    if (!confirm(t('confirmDeleteBuild') || 'Delete this build?')) return;
    
    const savedBuilds = JSON.parse(localStorage.getItem('buildsDB') || '[]');
    const filtered = savedBuilds.filter(b => b.id !== buildId);
    localStorage.setItem('buildsDB', JSON.stringify(filtered));
    loadSavedBuilds();
}

function exportAllBuilds() {
    const savedBuilds = JSON.parse(localStorage.getItem('buildsDB') || '[]');
    if (savedBuilds.length === 0) {
        alert(t('noBuildsToExport') || 'No builds to export');
        return;
    }
    
    const dataStr = JSON.stringify(savedBuilds, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokechill_builds_' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importBuildsFromFile() {
    document.getElementById('builds-import-file').click();
}

function onBuildsFileImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error('Invalid format');
            
            const savedBuilds = JSON.parse(localStorage.getItem('buildsDB') || '[]');
            const merged = [...savedBuilds, ...imported];
            localStorage.setItem('buildsDB', JSON.stringify(merged));
            
            alert(t('buildsImported') || 'Builds imported!');
            loadSavedBuilds();
        } catch (err) {
            alert(t('importFailed') || 'Import failed: ' + err.message);
        }
        input.value = '';
    };
    reader.readAsText(file);
}