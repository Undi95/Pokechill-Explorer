// ============ TRAINERS ============
function searchTrainers() {
    const se = document.getElementById('trainer-search').value.toLowerCase();
    const hideLvl0 = document.getElementById('trainer-hide-lvl0').checked;
    const trainerType = document.getElementById('trainer-type').value;
    
    // Update URL hash
    updateURLHash('trainers', { search: se, hidelvl0: hideLvl0 ? '1' : '0', type: trainerType });
    const res = Object.values(trainers).filter(tr => {
        if (se && !tr.name.toLowerCase().includes(se) && !tr.displayName.toLowerCase().includes(se)) return false;
        if (hideLvl0 && tr.level === 0) return false; // Hide level 0 trainers if checkbox is checked
        if (trainerType && tr.trainerType !== trainerType) return false; // Filter by trainer type
        return true;
    }).sort((a, b) => a.level - b.level);
    
    const c = document.getElementById('trainers-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('results')}</div><div class="results-grid">${res.map(tr => {
        const teamSlots = [];
        for (let i = 1; i <= 6; i++) {
            if (tr.team[`slot${i}`]) teamSlots.push(tr.team[`slot${i}`]);
        }
        // Difficulty badge for raids
        const difficultyBadge = tr.difficulty > 0 ? formatDifficultyBadge(tr.difficulty, true) : '';
        return `<div class="card" onclick="showTrainerDetails('${tr.name}')" style="cursor:pointer">
            <div class="card-header">
                <span class="card-name">${tr.displayName}</span>
                <span class="area-level">${t('level')} ${tr.level}${difficultyBadge}</span>
            </div>
            <div class="trainer-team">
                ${teamSlots.map(p => `<div class="trainer-pkmn" onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}"><div class="trainer-pkmn-name">${pokemons[p]?.displayName || format(p)}</div></div>`).join('')}
            </div>
        </div>`;
    }).join('')}</div>`;
}

function showTrainerDetails(trainerName) {
    const tr = trainers[trainerName];
    if (!tr) return;
    
    const teamSlots = [];
    for (let i = 1; i <= 6; i++) {
        if (tr.team[`slot${i}`]) teamSlots.push(tr.team[`slot${i}`]);
    }
    
    const isRaid = tr.trainerType === 'raid';
    
    // Field effects section (for VS trainers with field effects)
    let difficultySection = '';
    if (!isRaid && tr.fieldEffects && tr.fieldEffects.length > 0) {
        const fieldBadges = tr.fieldEffects.map(f => {
            const fieldData = window.fieldEffectsData?.[f];
            const displayName = fieldData?.displayName || format(f);
            // Determine color based on field tier or default
            let badgeColor = '#725AA4'; // Default purple for field effects
            if (fieldData?.tier) {
                if (fieldData.tier === 1) badgeColor = '#4CAF50'; // Positive - green
                else if (fieldData.tier === 2) badgeColor = '#FFC107'; // Neutral - yellow
                else if (fieldData.tier === 3) badgeColor = '#FF9800'; // Negative light - orange
                else if (fieldData.tier >= 4) badgeColor = '#f44336'; // Negative heavy - red
            }
            const fieldInfo = fieldData?.info || '';
            return `<span style="display:inline-block;padding:3px 10px;background:${badgeColor};color:white;border-radius:12px;font-size:0.8rem;margin:2px;cursor:help" title="${escapeHtml(fieldInfo.replace(/<[^>]+>/g, ''))}">${displayName}</span>`;
        }).join('');
        
        difficultySection = `
            <div style="margin:15px 0;padding:10px;background:var(--bg-card);border-radius:8px;border-left:4px solid #725AA4">
                <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:5px">${t('fieldEffects') || 'Effets de terrain'}</div>
                <div style="display:flex;flex-wrap:wrap;gap:2px">${fieldBadges}</div>
            </div>
        `;
    }
    
    // For raids: show boss with moves, for trainers: show team
    let contentSection = '';
    
    if (isRaid) {
        // Raid boss display - same style as active tab
        contentSection = teamSlots.map((p, idx) => {
            const pkmn = pokemons[p];
            if (!pkmn) return '';
            
            // Get moves for this slot
            const slotMoves = tr.bossMoves && tr.bossMoves[`slot${idx + 1}`] ? tr.bossMoves[`slot${idx + 1}`] : [];
            const movesHtml = slotMoves.map((m) => {
                const moveData = moves[m];
                if (!moveData) return '';
                const moveColor = typeColors[moveData.type] || '#666';
                return `<div style="padding:3px 8px;background:var(--bg-input);border-radius:4px;font-size:0.8rem;border-left:4px solid ${moveColor};cursor:pointer" onclick="event.stopPropagation();showMovePokemon('${m}')">${moveData.displayName || format(m)}</div>`;
            }).join('');
            
            return `
                <div style="background:rgba(255,215,0,0.1);padding:15px;border-radius:8px;border:1px solid rgba(255,215,0,0.3)">
                    <div style="display:flex;align-items:center;gap:15px;margin-bottom:10px">
                        <img src="${sprite(p)}" style="width:80px;height:80px;image-rendering:pixelated;cursor:pointer" onclick="showPokemonDetails('${p}')">
                        <div style="flex:1">
                            <div style="font-size:1.2rem;font-weight:700;color:var(--accent-gold);cursor:pointer" onclick="showPokemonDetails('${p}')">${pkmn.displayName || format(p)}</div>
                            <div class="type-badges" style="margin:5px 0">${pkmn.types.map(t => typeBadge(t)).join('')}</div>
                            <div style="font-size:0.75rem;color:var(--text-dim)">${t('bossEncounter') || 'Boss à affronter'}</div>
                        </div>
                    </div>
                    ${slotMoves.length > 0 ? `
                        <div style="margin-top:10px">
                            <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:5px">⚔️ ${t('movesLabel') || 'Attaques'}:</div>
                            <div style="display:flex;flex-direction:column;gap:4px">${movesHtml}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } else {
        // Regular trainer team display
        contentSection = teamSlots.map(p => {
            const pkmn = pokemons[p];
            if (!pkmn) return '';
            return `
                <div style="background:var(--bg-card);padding:10px;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="showPokemonDetails('${p}')">
                    <div style="display:flex;align-items:center;gap:10px">
                        <img src="${sprite(p)}" style="width:48px;height:48px;image-rendering:pixelated">
                        <div>
                            <div style="font-weight:700">${pkmn.displayName || format(p)}</div>
                            <div class="type-badges">${pkmn.types.map(t => typeBadge(t)).join('')}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    const sectionLabel = isRaid ? (t('boss') || 'Boss') : (t('team') || 'Équipe');
    
    // For raids: show apricorn drop (single color based on ticketIndex)
    let dropsSection = '';
    const areaForTrainer = areas[trainerName];
    if (isRaid && areaForTrainer?.apricornColor) {
        const isT4 = tr.difficulty >= 600;
        const dropLabel = isT4 ? '100%' : '~20%';
        const apricornName = items[areaForTrainer.apricornColor]?.displayName || format(areaForTrainer.apricornColor);

        dropsSection = `
            <div style="margin-top:20px">
                <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:10px"><img src="${itemImg(areaForTrainer.apricornColor)}" style="width:16px;height:16px;vertical-align:middle"> ${t('apricornDrops') || 'Drops Noigrumes'}:</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
                    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)">
                        <img src="${itemImg(areaForTrainer.apricornColor)}" style="width:24px;height:24px;image-rendering:pixelated">
                        <span style="font-size:0.85rem">${apricornName}</span>
                        <span style="margin-left:auto;font-size:0.75rem;color:var(--text-dim)">${dropLabel}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    const html = `
        <div style="margin-bottom:20px">
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent-purple);margin-bottom:5px">${tr.displayName}</div>
            <div style="font-size:0.9rem;color:var(--text-dim)">${t('level')} ${tr.level} • ${isRaid ? (t('raidLabel') || 'Raid') : (t('trainerLabel') || 'Dresseur')}</div>
        </div>
        ${difficultySection}
        <div style="margin-top:15px">
            <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:10px">${sectionLabel}${!isRaid ? ` (${teamSlots.length} Pokémon)` : ''}:</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${isRaid ? '280px' : '200px'},1fr));gap:10px">${contentSection}</div>
        </div>
        ${dropsSection}
    `;
    
    openModal(tr.displayName, html);
}