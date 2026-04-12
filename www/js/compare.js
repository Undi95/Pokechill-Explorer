// ============ COMPARE ============
function initCompare() {
    renderCompare();
}

function addToCompare(name) {
    if (!name) name = document.getElementById('compare-search').value;
    if (!name || !pokemons[name]) return;
    if (compareList.includes(name)) return;
    if (compareList.length >= 4) { alert(t('maxCompare')); return; }
    compareList.push(name);
    document.getElementById('compare-search').value = '';
    renderCompare();
    // Update URL hash
    const filters = getTabFilterValues('compare');
    updateURLHash('compare', filters);
}

function clearCompare() {
    compareList = [];
    renderCompare();
    // Update URL hash
    const filters = getTabFilterValues('compare');
    updateURLHash('compare', filters);
}

function renderCompare() {
    const container = document.getElementById('compare-grid');
    
    if (compareList.length === 0) {
        container.innerHTML = `<div class="no-results">${t('addToComparePrompt')}</div>`;
        return;
    }
    
    const pkmnList = compareList.map(n => pokemons[n]);
    const maxStats = {
        hp: Math.max(...pkmnList.map(p => statToStars(p.bst.hp))),
        atk: Math.max(...pkmnList.map(p => statToStars(p.bst.atk))),
        def: Math.max(...pkmnList.map(p => statToStars(p.bst.def))),
        satk: Math.max(...pkmnList.map(p => statToStars(p.bst.satk))),
        sdef: Math.max(...pkmnList.map(p => statToStars(p.bst.sdef))),
        spe: Math.max(...pkmnList.map(p => statToStars(p.bst.spe))),
        total: Math.max(...pkmnList.map(p => p.stars))
    };
    
    container.innerHTML = pkmnList.map((p, idx) => `<div class="compare-slot">
        <div class="compare-slot-header">
            <img src="${sprite(p.name)}">
            <div style="font-weight:700;margin-top:8px">${p.displayName || format(p.name)}</div>
            ${divBadge(p.division)}
            <div style="margin-top:5px;font-size:1.1rem;color:var(--accent-gold)">${'★'.repeat(p.stars)} <span style="font-size:0.8rem;color:var(--text-dim)">(${p.stars})</span></div>
            <button class="btn btn-small btn-danger" style="margin-top:8px" onclick="compareList.splice(${idx},1);renderCompare();const filters=getTabFilterValues('compare');updateURLHash('compare',filters);">${t('remove')}</button>
        </div>
        <div class="type-badges" style="justify-content:center">${p.types.map(t => typeBadge(t)).join('')}</div>
        ${GAME_CONFIG.STATS.map(stat => {
            const stars = statToStars(p.bst[stat]);
            const isBest = stars === maxStats[stat];
            return `<div class="compare-stat-row">
            <span style="width:45px;font-size:0.75rem">${stat.toUpperCase()}</span>
            <span style="width:70px;color:var(--accent-gold);font-size:0.8rem">${'★'.repeat(stars)}</span>
            <div class="compare-stat-bar"><div class="compare-stat-fill ${isBest ? 'best' : ''}" style="width:${(stars/6)*100}%"></div></div>
            <span style="width:35px;text-align:right;font-weight:700;color:${isBest ? 'var(--accent-gold)' : 'var(--text-main)'}">${p.bst[stat]}</span>
        </div>`}).join('')}
        <div class="compare-stat-row" style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px">
            <span style="font-weight:700">${t('totalStars')}</span>
            <span style="margin-left:auto;font-weight:700;font-size:1.1rem;color:${p.stars === maxStats.total ? 'var(--accent-gold)' : 'var(--accent-blue)'}">${p.stars}</span>
        </div>
        <div class="compare-stat-row">
            <span style="font-weight:700">${t('tabBST')}</span>
            <span style="margin-left:auto;font-weight:700;color:var(--text-dim)">${p.totalBST}</span>
        </div>
    </div>`).join('');
}

function searchComparePokemon() {
    const se = document.getElementById('compare-search').value.toLowerCase();
    const res = Object.values(pokemons).filter(p => p.name.toLowerCase().includes(se)).sort((a,b) => b.stars - a.stars);
    renderPokemonGrid(res, 'compare-results', 'compare');
}