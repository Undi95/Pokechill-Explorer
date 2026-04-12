// ============ ABILITIES ============
// Search mode for abilities: 'name' or 'description'
let abilitiesSearchMode = 'name';

function toggleAbilitiesSearchMode() {
    abilitiesSearchMode = abilitiesSearchMode === 'name' ? 'description' : 'name';
    const modeKey = abilitiesSearchMode === 'name' ? 'searchModeName' : 'searchModeDesc';
    // Update UI
    const modeText = document.getElementById('abilities-mode-text');
    const track = document.getElementById('abilities-mode-track');
    const searchInput = document.getElementById('ability-search');
    const searchLabel = document.getElementById('ability-search-label');
    if (modeText) { modeText.textContent = t(modeKey); modeText.dataset.i18n = modeKey; }
    if (track) track.classList.toggle('right', abilitiesSearchMode === 'description');
    if (searchInput) searchInput.placeholder = abilitiesSearchMode === 'name' ? 'technician...' : 'power boost...';
    if (searchLabel) { searchLabel.textContent = t(modeKey).toUpperCase(); searchLabel.dataset.i18n = modeKey; }
    // Re-search with new mode
    searchAbilities();
}

function setAbilitiesSearchMode(mode) {
    if (mode !== 'name' && mode !== 'description') return;
    abilitiesSearchMode = mode;
    const modeKey = abilitiesSearchMode === 'name' ? 'searchModeName' : 'searchModeDesc';
    // Update UI
    const modeText = document.getElementById('abilities-mode-text');
    const track = document.getElementById('abilities-mode-track');
    const searchInput = document.getElementById('ability-search');
    const searchLabel = document.getElementById('ability-search-label');
    if (modeText) { modeText.textContent = t(modeKey); modeText.dataset.i18n = modeKey; }
    if (track) track.classList.toggle('right', abilitiesSearchMode === 'description');
    if (searchInput) searchInput.placeholder = abilitiesSearchMode === 'name' ? 'technician...' : 'power boost...';
    if (searchLabel) { searchLabel.textContent = t(modeKey).toUpperCase(); searchLabel.dataset.i18n = modeKey; }
}

function searchAbilities() {
    const se = document.getElementById('ability-search').value.toLowerCase();
    const ty = document.getElementById('ability-type').value;
    const ra = document.getElementById('ability-rarity').value;
    const sp = document.getElementById('ability-special').value;
    
    // Update URL hash
    updateURLHash('abilities', { search: se, type: ty, rarity: ra, special: sp, mode: abilitiesSearchMode });
    
    // Get all HA names
    const haNames = new Set(Object.values(pokemons).map(p => p.hiddenAbility).filter(h => h));
    
    const res = Object.values(abilities).filter(a => {
        if (se) {
            const inName = a.searchText.includes(se);
            const inDesc = abilitiesSearchMode === 'description' && a.info && a.info.toLowerCase().includes(se);
            if (!inName && !inDesc) return false;
        }
        if (ra && a.rarity !== parseInt(ra)) return false;
        // For type filter: if ability has no types (HA-only), skip type filter
        if (ty && a.hasType) { 
            const ts = a.types || []; 
            if (!ts.includes('all') && !ts.includes(ty)) return false; 
        }
        if (sp === 'ha' && !haNames.has(a.name)) return false;
        if (sp === 'haOnly' && (a.hasType || !haNames.has(a.name))) return false; // HA-only abilities (no type)
        if (sp === 'nosig' && !a.hasType && haNames.has(a.name)) return false; // Exclude HA-only abilities (no types, only obtainable via HA)
        if (sp === 'nerf' && !a.nerf && !a.hasTransferableNerf) return false; // Only show nerfed abilities
        return true;
    }).sort((a, b) => (a.rarity || 1) - (b.rarity || 1));
    
    const c = document.getElementById('abilities-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('results')}</div><div class="results-grid">${res.map(a => {
        const isHA = haNames.has(a.name);
        const isHAOnly = !a.hasType && isHA;
        const transferNerfBadge = a.hasTransferableNerf ? `<span style="padding:2px 6px;background:rgba(255,136,0,0.2);color:var(--accent-orange);border-radius:3px;font-size:0.7rem;margin-left:5px" title="${t('transferNerfTooltip') || 'Effet réduit si non obtenue naturellement en HA'}">⚠️ NERF</span>` : '';
        const nerfBadge = (a.nerf && !a.hasTransferableNerf) ? '<span style="padding:2px 6px;background:rgba(255,68,68,0.2);color:var(--accent-red);border-radius:3px;font-size:0.7rem;margin-left:5px">NERF</span>' : '';
        return `<div class="card" onclick="showAbilityPokemon('${a.name}')">
            <div class="card-header">
                <span class="card-name">${a.displayName}</span>
                ${rarityBadge(a.rarity)} ${isHAOnly ? '<span class="rarity rarity-sig">HA Only</span>' : isHA ? '<span class="rarity rarity-sig">HA</span>' : ''} ${nerfBadge}${transferNerfBadge}
            </div>
            <div class="type-badges">${a.hasType ? a.types.map(t => typeBadge(t)).join('') : `<span style="color:var(--text-dim);font-size:0.8rem">${t('haExclusive')}</span>`}</div>
            ${a.info ? `<p class="card-info">${a.info}</p>` : ''}
            <p class="click-hint">${t('clickDetails')}</p>
        </div>`;
    }).join('')}</div>`;
}

function showAbilityPokemon(abilityName) {
    const a = abilities[abilityName]; if (!a) return;
    const byHA = Object.values(pokemons).filter(p => p.hiddenAbility === abilityName);
    // Only show by type if ability has types defined
    const byType = a.hasType ? Object.values(pokemons).filter(p => {
        if (p.hiddenAbility === abilityName) return false;
        return a.types.includes('all') || p.types.some(t => a.types.includes(t));
    }) : [];
    
    // Find moves affected by this ability
    const allMoves = Object.values(moves);
    // Boosted moves = moves where affectedBy includes this ability
    // AND unaffectedBy does NOT include this ability (for cases like Overheat with Sheer Force)
    const boostedMoves = allMoves.filter(m => 
        m.affectedBy && m.affectedBy.includes(abilityName) && 
        !(m.unaffectedBy && m.unaffectedBy.includes(abilityName))
    );
    // Moves that are explicitly marked as unaffected (for info)
    const unaffectedMoves = allMoves.filter(m => 
        m.unaffectedBy && m.unaffectedBy.includes(abilityName) &&
        !(m.affectedBy && m.affectedBy.includes(abilityName))
    );
    
    let html = a.info ? `<p style="color:var(--text-dim);margin-bottom:15px">${a.info}</p>` : '';
    
    // Section: Nerf / Transferable Nerf (fusionné pour éviter le doublon)
    if (a.hasTransferableNerf) {
        // Ability avec transferable nerf - un seul message couvrant les deux cas
        const nerfDetails = abilityName === 'merciless' || abilityName === 'gorillaTactics' 
            ? '1.5x → 1.35x (10% de réduction)' 
            : (t('transferNerfTooltip') || 'Reduced effect if not naturally obtained as HA');
        html += `<div style="margin-bottom:15px;padding:10px 12px;background:rgba(255,136,0,0.1);border:1px solid rgba(255,136,0,0.3);border-radius:6px">
            <div style="font-size:0.8rem;color:var(--accent-orange);font-weight:600;margin-bottom:4px">⚠️ ${t('nerf') || 'Nerf'}</div>
            <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:6px">${t('transferNerfDesc') || 'This ability is weaker when obtained via Memory (non-native HA).'}</div>
            <div style="font-size:0.8rem;color:var(--accent-orange);padding:4px 8px;background:rgba(255,136,0,0.15);border-radius:4px;display:inline-block">${nerfDetails}</div>
        </div>`;
    } else if (a.nerf) {
        // Nerf standard (slot non-HA) - uniquement si pas de transferable nerf
        html += `<div style="margin-bottom:15px;padding:10px 12px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);border-radius:6px">
            <div style="font-size:0.8rem;color:var(--accent-red);font-weight:600;margin-bottom:4px">⚠️ ${t('nerf') || 'Nerf'}</div>
            <div style="font-size:0.85rem;color:var(--text-dim)">${a.nerf}</div>
        </div>`;
    }
    
    // Section: Boosted Moves (affectedBy)
    if (boostedMoves.length > 0) {
        boostedMoves.sort((a, b) => (b.power || 0) - (a.power || 0));
        html += `<div class="modal-section"><div class="modal-section-title" style="color:var(--accent-green)">⚔️ ${t('boostedMoves')} (${boostedMoves.length})</div>
            <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px">${t('boostedMovesDesc')}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;max-height:250px;overflow-y:auto">
                ${boostedMoves.map(m => `<div style="padding:6px 10px;background:var(--bg-input);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid var(--border);display:flex;align-items:center;gap:8px" onclick="showMovePokemon('${m.name}')" title="${m.info || ''}">
                    ${typeBadge(m.type)}
                    <span style="flex:1;color:${m.rarity === 3 ? 'var(--accent-gold)' : m.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${m.displayName}</span>
                    ${m.power ? `<span style="color:var(--accent-blue);font-size:0.8rem">${m.power}</span>` : ''}
                    ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? '<span class="speed-badge speed-fast" style="font-size:0.6rem">' + (m.timer === 'extremelyFast' ? 'F++' : (m.timer === 'veryFast' ? 'F+' : 'F')) + '</span>' : (m.timer === 'slow' || m.timer === 'verySlow') ? '<span class="speed-badge speed-slow" style="font-size:0.6rem">' + (m.timer === 'verySlow' ? 'S+' : 'S') + '</span>' : ''}
                </div>`).join('')}
            </div></div>`;
    }
    
    // Section: Unaffected Moves (unaffectedBy) - e.g. Sheer Force
    // For Sheer Force, show boosted moves instead (the ability removes secondary effects, so "unaffected" is the default)
    if (unaffectedMoves.length > 0 && abilityName !== 'sheerForce') {
        unaffectedMoves.sort((a, b) => (b.power || 0) - (a.power || 0));
        html += `<div class="modal-section"><div class="modal-section-title" style="color:var(--accent-red)">🛡️ ${t('unaffectedMoves')} (${unaffectedMoves.length})</div>
            <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px">${t('unaffectedMovesDesc')}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;max-height:250px;overflow-y:auto">
                ${unaffectedMoves.map(m => `<div style="padding:6px 10px;background:var(--bg-input);border-radius:4px;font-size:0.85rem;cursor:pointer;border:1px solid var(--border);display:flex;align-items:center;gap:8px" onclick="showMovePokemon('${m.name}')" title="${m.info || ''}">
                    ${typeBadge(m.type)}
                    <span style="flex:1;color:${m.rarity === 3 ? 'var(--accent-gold)' : m.rarity === 2 ? 'var(--accent-blue)' : 'var(--text-main)'}">${m.displayName}</span>
                    ${m.power ? `<span style="color:var(--accent-blue);font-size:0.8rem">${m.power}</span>` : ''}
                    ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? '<span class="speed-badge speed-fast" style="font-size:0.6rem">' + (m.timer === 'extremelyFast' ? 'F++' : (m.timer === 'veryFast' ? 'F+' : 'F')) + '</span>' : (m.timer === 'slow' || m.timer === 'verySlow') ? '<span class="speed-badge speed-slow" style="font-size:0.6rem">' + (m.timer === 'verySlow' ? 'S+' : 'S') + '</span>' : ''}
                </div>`).join('')}
            </div></div>`;
    }
    if (byHA.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title ha">⭐ ${t('byHA')} (${byHA.length})</div>
            <div class="pkmn-grid" style="max-height:300px;overflow-y:auto">${byHA.map(p => `<div class="pkmn-mini pkmn-mini-ha" onclick="showPokemonDetails('${p.name}')"><img src="${sprite(p.name)}"><div class="pkmn-mini-name">${p.displayName || format(p.name)}</div></div>`).join('')}</div></div>`;
    }
    if (byType.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title">🎲 ${t('byType')} (${byType.length})</div>
            <div class="pkmn-grid" style="max-height:400px;overflow-y:auto">${byType.map(p => `<div class="pkmn-mini" onclick="showPokemonDetails('${p.name}')"><img src="${sprite(p.name)}"><div class="pkmn-mini-name">${p.displayName || format(p.name)}</div></div>`).join('')}</div></div>`;
    }
    if (!a.hasType && byHA.length === 0) {
        html += `<p style="color:var(--text-dim)">This ability has no Pokemon that can learn it currently.</p>`;
    }
    openModal(`${a.displayName}`, html);
}