// ============ MOVES ============
// Search mode for moves: 'name' or 'description'
let movesSearchMode = 'name';

function toggleMovesSearchMode() {
    movesSearchMode = movesSearchMode === 'name' ? 'description' : 'name';
    const modeKey = movesSearchMode === 'name' ? 'searchModeName' : 'searchModeDesc';
    // Update UI
    const modeText = document.getElementById('moves-mode-text');
    const track = document.getElementById('moves-mode-track');
    const searchInput = document.getElementById('move-search');
    const searchLabel = document.getElementById('move-search-label');
    if (modeText) { modeText.textContent = t(modeKey); modeText.dataset.i18n = modeKey; }
    if (track) track.classList.toggle('right', movesSearchMode === 'description');
    if (searchInput) searchInput.placeholder = movesSearchMode === 'name' ? 'earthquake...' : 'power boost...';
    if (searchLabel) { searchLabel.textContent = t(modeKey).toUpperCase(); searchLabel.dataset.i18n = modeKey; }
    // Re-search with new mode
    searchMoves();
}

function setMovesSearchMode(mode) {
    if (mode !== 'name' && mode !== 'description') return;
    movesSearchMode = mode;
    const modeKey = movesSearchMode === 'name' ? 'searchModeName' : 'searchModeDesc';
    // Update UI
    const modeText = document.getElementById('moves-mode-text');
    const track = document.getElementById('moves-mode-track');
    const searchInput = document.getElementById('move-search');
    const searchLabel = document.getElementById('move-search-label');
    if (modeText) { modeText.textContent = t(modeKey); modeText.dataset.i18n = modeKey; }
    if (track) track.classList.toggle('right', movesSearchMode === 'description');
    if (searchInput) searchInput.placeholder = movesSearchMode === 'name' ? 'earthquake...' : 'power boost...';
    if (searchLabel) { searchLabel.textContent = t(modeKey).toUpperCase(); searchLabel.dataset.i18n = modeKey; }
}

function searchMoves() {
    const se = document.getElementById('move-search').value.toLowerCase();
    const ty = document.getElementById('move-type').value;
    const sp = document.getElementById('move-split').value;
    const learnable = document.getElementById('move-learnable').value;
    const ra = document.getElementById('move-rarity').value;
    const speed = document.getElementById('move-speed').value;
    const multi = document.getElementById('move-multi').value;
    
    // Update URL hash
    updateURLHash('moves', { search: se, type: ty, split: sp, learnable, rarity: ra, speed, multi, mode: movesSearchMode });
    
    // Build set of egg moves from pokemon data (dynamically for filtering)
    const eggMovesSet = new Set();
    Object.values(pokemons).forEach(p => {
        if (p.eggMove && moves[p.eggMove]) {
            eggMovesSet.add(p.eggMove);
        }
    });
    
    const res = Object.values(moves).filter(m => {
        if (se) {
            const inName = m.searchText.includes(se);
            const inDesc = movesSearchMode === 'description' && m.info && m.info.toLowerCase().includes(se);
            if (!inName && !inDesc) return false;
        }
        if (ty && m.type !== ty) return false;
        if (sp && m.split !== sp) return false;
        // Filter by learnable type - check if this type can learn the move
        if (learnable && m.moveset && m.moveset.length > 0) {
            if (!m.moveset.includes('all') && !m.moveset.includes(learnable)) return false;
        } else if (learnable && (!m.moveset || m.moveset.length === 0)) {
            return false; // Signature moves have no moveset, filter them out when searching by learnable
        }
        if (ra === 'sig' && !m.isSignature) return false;
        else if (ra === 'nosig' && m.isSignature && (!m.moveset || m.moveset.length === 0)) return false;
        else if (ra === 'egg' && !eggMovesSet.has(m.name)) return false;
        else if (ra && ra !== 'sig' && ra !== 'nosig' && ra !== 'egg' && m.rarity !== parseInt(ra)) return false;
        if (speed === 'fast' && (m.timer !== 'fast' && m.timer !== 'veryFast' && m.timer !== 'extremelyFast')) return false;
        if (speed === 'slow' && (m.timer !== 'slow' && m.timer !== 'verySlow')) return false;
        if (multi === 'yes' && !m.multihit) return false;
        return true;
    }).sort((a, b) => (b.power || 0) - (a.power || 0));
    
    const c = document.getElementById('moves-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('results')}</div><div class="results-grid">${res.map(m => `<div class="card" onclick="showMovePokemon('${m.name}')">
        <div class="card-header">
            <span class="card-name">${m.displayName}</span>
            ${rarityBadge(m.rarity, m.isSignature, m.isEggMove)}
        </div>
        <div class="type-badges">${typeBadge(m.type)} ${splitBadge(m.split)}</div>
        <div style="margin-top:8px;font-size:0.9rem">
            ${m.power ? `<span style="color:var(--accent-blue)">${t('power')}: ${m.power}</span>` : ''}
            ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? `<span class="speed-badge speed-fast">${t('timerFast')}${m.timer === 'extremelyFast' ? '++' : (m.timer === 'veryFast' ? '+' : '')}</span>` : (m.timer === 'slow' || m.timer === 'verySlow') ? `<span class="speed-badge speed-slow">${t('timerSlow')}${m.timer === 'verySlow' ? '+' : ''}</span>` : ''}
            ${m.multihit ? `<span style="color:var(--accent-gold);margin-left:8px">${t('hits')}: ${m.multihit[0]}-${m.multihit[1]}</span>` : ''}
        </div>
        ${m.moveset && m.moveset.length > 0 ? `<div style="margin-top:4px;font-size:0.75rem;color:var(--text-dim)">${t('learnableBy')}: ${m.moveset.map(ty => ty === 'all' ? t('all') : ty.charAt(0).toUpperCase() + ty.slice(1)).join(', ')}</div>` : ''}
        ${m.buildup != null ? `<span style="display:inline-block;margin-top:4px;padding:2px 6px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.3);border-radius:4px;font-size:0.7rem">📈 ${t('buildupBadge')}</span>` : ''}
        ${(() => { const ab = m.affectedBy || [], ua = m.unaffectedBy || [], pureAb = ab.filter(a => !ua.includes(a)), pureUa = ua.filter(a => !ab.includes(a)); 
            return (pureAb.length > 0 ? `<div style="margin-top:4px;font-size:0.7rem;color:var(--accent-green)">⬆️ ${t('boostedBy')}: ${pureAb.map(a => `<span style="cursor:pointer;text-decoration:underline" onclick="event.stopPropagation();showAbilityPokemon('${a}')">${abilities[a]?.displayName || format(a)}</span>`).join(', ')}</div>` : '') + (pureUa.length > 0 ? `<div style="margin-top:4px;font-size:0.7rem;color:var(--text-dim)">🛡️ ${t('notAffectedBy')}: ${pureUa.map(a => `<span style="cursor:pointer;text-decoration:underline" onclick="event.stopPropagation();showAbilityPokemon('${a}')">${abilities[a]?.displayName || format(a)}</span>`).join(', ')}</div>` : ''); })()}
        ${m.info ? `<p class="card-info" style="margin-top:6px">${m.info}</p>` : ''}
        <p class="click-hint">${t('clickDetails')}</p>
    </div>`).join('')}</div>`;
}

function showMovePokemon(moveName) {
    const m = moves[moveName]; if (!m) return;
    const sigPkmn = Object.values(pokemons).filter(p => p.signature === moveName);
    
    // Get Pokemon that have this move as egg move
    const eggPkmn = window.eggMoveToPokemon && window.eggMoveToPokemon[moveName] 
        ? window.eggMoveToPokemon[moveName].map(name => pokemons[name]).filter(Boolean)
        : [];
    
    // Only show "can learn" if it's not a signature-only move and not an egg-only move
    let canLearn = [];
    if (!m.isSignature && !m.isEggMove && m.moveset && m.moveset.length > 0) {
        canLearn = Object.values(pokemons).filter(p => m.moveset.includes('all') || p.types.some(t => m.moveset.includes(t)));
    }
    
    let html = `<div class="type-badges" style="margin-bottom:15px">${typeBadge(m.type)} ${splitBadge(m.split)}
        ${m.power ? `<span style="margin-left:10px;color:var(--accent-blue)">${t('power')}: ${m.power}</span>` : ''}
        ${(m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? `<span class="speed-badge speed-fast">${t('timerFast')}${m.timer === 'extremelyFast' ? '++' : (m.timer === 'veryFast' ? '+' : '')}</span>` : m.timer === 'slow' ? `<span class="speed-badge speed-slow">${t('timerSlow')}</span>` : m.timer === 'verySlow' ? `<span class="speed-badge speed-slow">${t('timerSlow')}+</span>` : ''}
        ${m.multihit ? `<span style="color:var(--accent-gold);margin-left:8px">${t('hits')}: ${m.multihit[0]}-${m.multihit[1]}</span>` : ''}
        ${m.isSignature ? '<span style="margin-left:10px;padding:3px 8px;background:rgba(255,0,170,0.2);color:var(--accent-pink);border-radius:4px;font-size:0.75rem">Signature Only</span>' : ''}
        ${m.isEggMove ? `<span style="margin-left:10px;padding:3px 8px;background:rgba(255,193,7,0.2);color:#ffc107;border-radius:4px;font-size:0.75rem">${t('eggMoveBadge') || 'Egg Move'}</span>` : ''}
    </div>
    ${m.moveset && m.moveset.length > 0 ? `<p style="color:var(--text-dim);margin-bottom:10px;font-size:0.9rem">${t('learnableBy')}: ${m.moveset.map(t => t === 'all' ? 'All Types' : typeBadge(t)).join(' ')}</p>` : ''}
    ${m.info ? `<p style="color:var(--text-dim);margin-bottom:15px">${m.info}</p>` : ''}`;
    
    // Move properties badges
    let moveBadges = '';
    if (m.buildup != null) moveBadges += `<div style="padding:6px 10px;background:rgba(255,165,0,0.1);border:1px solid rgba(255,165,0,0.3);border-radius:6px;margin-bottom:10px;font-size:0.85rem;color:#ffa500">📈 ${t('buildupMove')}</div>`;
    const ab = m.affectedBy || [], ua = m.unaffectedBy || [];
    const pureAb = ab.filter(a => !ua.includes(a));
    const pureUa = ua.filter(a => !ab.includes(a));
    if (pureAb.length > 0) moveBadges += `<div style="padding:6px 10px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.25);border-radius:6px;margin-bottom:10px;font-size:0.85rem;color:var(--accent-green)">⬆️ ${t('boostedBy')}: ${pureAb.map(a => `<span style="cursor:pointer;text-decoration:underline;font-weight:700" onclick="showAbilityPokemon('${a}')">${abilities[a]?.displayName || format(a)}</span>`).join(', ')}</div>`;
    if (pureUa.length > 0) moveBadges += `<div style="padding:6px 10px;background:rgba(136,136,170,0.08);border:1px solid rgba(136,136,170,0.25);border-radius:6px;margin-bottom:10px;font-size:0.85rem;color:var(--text-dim)">🛡️ ${t('notAffectedBy')}: ${pureUa.map(a => `<span style="cursor:pointer;text-decoration:underline;font-weight:700" onclick="showAbilityPokemon('${a}')">${abilities[a]?.displayName || format(a)}</span>`).join(', ')}</div>`;
    html += moveBadges;
    
    // Additional move properties (real ones from PokeChill)
    const hasMoveDetails = m.timer || m.buildup || m.notUsableByEnemy;
    if (hasMoveDetails) {
        html += '<div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border);">';
        html += '<div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:8px;">' + t('propertiesTab') + '</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:0.9rem;">';
        
        if (m.timer) {
            const timerColor = (m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') ? 'var(--accent-green)' : (m.timer === 'slow' ? 'var(--accent-orange)' : 'var(--accent-red)');
            const timerText = (m.timer === 'extremelyFast') ? t('timerExtremelyFast') : ((m.timer === 'fast' || m.timer === 'veryFast') ? t('timerFast') : (m.timer === 'slow' ? t('timerSlow') : (m.timer === 'verySlow' ? t('timerVerySlow') : t('timerNormal'))));
            html += '<div style="color:' + timerColor + '"><strong>' + t('timer') + ':</strong> ' + timerText + (m.timer === 'veryFast' ? ' (x2)' : (m.timer === 'extremelyFast' ? ' (x3)' : '')) + '</div>';
        }
        if (m.buildup) {
            html += '<div style="color:var(--accent-gold)"><strong>' + t('buildup') + ':</strong> ×' + m.buildup + '</div>';
        }
        if (m.notUsableByEnemy) {
            html += '<div style="color:var(--accent-purple)"><strong>' + t('notUsableByEnemy') + '</strong></div>';
        }
        
        html += '</div></div>';
    }
    
    if (sigPkmn.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title sig">💫 ${t('signatureOf')}</div>
            <div class="pkmn-grid">${sigPkmn.map(p => `<div class="pkmn-mini" onclick="showPokemonDetails('${p.name}')"><img src="${sprite(p.name)}"><div class="pkmn-mini-name">${p.displayName || format(p.name)}</div></div>`).join('')}</div></div>`;
    }
    
    if (eggPkmn.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title" style="color:#ffc107">🥚 ${t('eggMoveOf')} (${eggPkmn.length})</div>
            <div class="pkmn-grid" style="max-height:400px;overflow-y:auto">${eggPkmn.map(p => `<div class="pkmn-mini" onclick="showPokemonDetails('${p.name}')"><img src="${sprite(p.name)}"><div class="pkmn-mini-name">${p.displayName || format(p.name)}</div></div>`).join('')}</div></div>`;
    }
    
    if (canLearn.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title">${t('canLearn')} (${canLearn.length})</div>
            <div class="pkmn-grid" style="max-height:400px;overflow-y:auto">${canLearn.map(p => `<div class="pkmn-mini" onclick="showPokemonDetails('${p.name}')"><img src="${sprite(p.name)}"><div class="pkmn-mini-name">${p.displayName || format(p.name)}</div></div>`).join('')}</div></div>`;
    }
    openModal(`${m.displayName}`, html);
}