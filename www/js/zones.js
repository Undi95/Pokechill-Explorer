// ============ DUNGEONS ============
function searchDungeons() {
    const mode = getZoneSearchMode('dungeon');
    const pkmn = mode === 'pkmn' ? document.getElementById('dungeon-pokemon').value.toLowerCase() : '';
    const type1 = mode === 'pkmn' ? document.getElementById('dungeon-type1').value : '';
    const type2 = mode === 'pkmn' ? document.getElementById('dungeon-type2').value : '';
    const zoneName = mode === 'zone' ? document.getElementById('dungeon-zone-search').value.toLowerCase() : '';
    const itemFilter = document.getElementById('dungeon-item').value;
    const lv = document.getElementById('dungeon-level').value;
    const rot = document.getElementById('dungeon-rotation').value;
    
    // Update URL hash
    updateURLHash('dungeon', { pokemon: pkmn, type1, type2, zone: zoneName, item: itemFilter, level: lv, rotation: rot });
    
    const res = Object.values(areas).filter(a => {
        if (a.type !== 'dungeon') return false;
        if (lv && a.level !== parseInt(lv)) return false;
        if (rot && a.rotation !== parseInt(rot)) return false;
        
        // Zone name filter
        if (zoneName) {
            if (!(a.displayName || format(a.name)).toLowerCase().includes(zoneName) && !a.name.toLowerCase().includes(zoneName)) return false;
        }
        
        const allSpawns = [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare];
        
        if (pkmn) {
            if (!allSpawns.some(p => p.toLowerCase().includes(pkmn) || (pokemons[p]?.displayName || '').toLowerCase().includes(pkmn))) return false;
        }
        
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
    
    const c = document.getElementById('dungeon-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('dungeonZones')}</div><div class="results-grid">${res.map(a => renderDungeonCard(a, pkmn, itemFilter, type1, type2)).join('')}</div>`;
}

function renderDungeonCard(a, highlightPkmn = '', highlightItem = '', type1 = '', type2 = '') {
    const highlightP = (name) => {
        const pkmnData = pokemons[name];
        const nameMatch = highlightPkmn && (name.toLowerCase().includes(highlightPkmn) || (pkmnData?.displayName || '').toLowerCase().includes(highlightPkmn));
        const typeMatch = (type1 || type2) && pkmnData && 
            (!type1 || pkmnData.types.includes(type1)) && 
            (!type2 || pkmnData.types.includes(type2));
        if (nameMatch || typeMatch) {
            return `style="background:rgba(255,215,0,0.2);border:1px solid var(--accent-gold)"`;
        }
        return '';
    };
    const highlightI = (name) => {
        if (highlightItem && name === highlightItem) {
            return `style="background:rgba(0,212,255,0.3);border:1px solid var(--accent-blue);color:var(--accent-blue)"`;
        }
        return '';
    };
    const getItemName = (name) => items[name]?.displayName || format(name);
    const allDrops = [...a.drops.common, ...a.drops.uncommon, ...a.drops.rare];
    
    // Dungeons are always uncatchable
    let badges = `<span style="padding:2px 6px;background:rgba(255,68,68,0.2);color:var(--accent-red);border-radius:3px;font-size:0.7rem">${t('uncatchable')}</span>`;
    if (a.difficulty) badges += formatDifficultyBadge(a.difficulty, true);
    
    return `<div class="area-card" onclick="showAreaDetails('${a.name}')" style="cursor:pointer;border-left:3px solid var(--accent-pink);max-height:400px;overflow-y:auto">
        <div class="area-header">
            <span class="area-name">🏰 ${a.displayName || format(a.name)}</span>
            <span class="area-level">${t('level')} ${a.level}</span>
            ${a.rotation ? `<span style="font-size:0.75rem;color:var(--text-dim)">R${a.rotation}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px">${badges}</div>
        ${areaFieldBadges(a)}
        <div class="area-spawns">
            ${a.spawns.common.length ? `<div class="spawn-tier"><div class="spawn-tier-label common">${t('common')}</div><div class="spawn-list">${a.spawns.common.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
            ${a.spawns.uncommon.length ? `<div class="spawn-tier"><div class="spawn-tier-label uncommon">${t('uncommon')}</div><div class="spawn-list">${a.spawns.uncommon.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
            ${a.spawns.rare.length ? `<div class="spawn-tier"><div class="spawn-tier-label rare">${t('rare')}</div><div class="spawn-list">${a.spawns.rare.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
        </div>
        ${allDrops.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px">🎁 ${t('drops')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:0.8rem">
                ${allDrops.map(i => `<span ${highlightI(i)} style="padding:2px 6px;background:var(--bg-input);border-radius:3px">${getItemName(i)}</span>`).join('')}
            </div>
        </div>` : ''}
        <p class="click-hint" style="margin-top:8px">${t('clickDetails')}</p>
    </div>`;
}

function areaFieldBadges(a) {
    let badges = '';
    if (a.fieldEffects && a.fieldEffects.length > 0) badges += `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">${a.fieldEffects.map(f => {
        const fieldInfo = window.fieldEffectsData?.[f]?.info || '';
        return `<span onmouseenter="showFieldTooltip(this,'${fieldInfo}')" onmouseleave="hideFieldTooltip()" style="padding:2px 6px;background:rgba(100,200,255,0.12);color:#64c8ff;border:1px solid rgba(100,200,255,0.25);border-radius:4px;font-size:0.65rem;cursor:help">⚡ ${format(f)}</span>`;
    }).join('')}</div>`;
    if (a.timed) badges += `<div style="margin-bottom:6px"><span style="padding:2px 6px;background:rgba(255,68,68,0.12);color:#ff6644;border:1px solid rgba(255,68,68,0.25);border-radius:4px;font-size:0.65rem">⏱️ ${t('timedArea')} ${a.timed}s</span></div>`;
    return badges;
}

function renderAreaCard(a, highlightPkmn = '', highlightItem = '', type1 = '', type2 = '') {
    const highlightP = (name) => {
        const pkmnData = pokemons[name];
        // Highlight if name matches OR if types match the filter
        const nameMatch = highlightPkmn && (name.toLowerCase().includes(highlightPkmn) || (pkmnData?.displayName || '').toLowerCase().includes(highlightPkmn));
        const typeMatch = (type1 || type2) && pkmnData && 
            (!type1 || pkmnData.types.includes(type1)) && 
            (!type2 || pkmnData.types.includes(type2));
        if (nameMatch || typeMatch) {
            return `style="background:rgba(255,215,0,0.2);border:1px solid var(--accent-gold)"`;
        }
        return '';
    };
    const highlightI = (name) => {
        if (highlightItem && name === highlightItem) {
            return `style="background:rgba(0,212,255,0.3);border:1px solid var(--accent-blue);color:var(--accent-blue)"`;
        }
        return '';
    };
    const getItemName = (name) => items[name]?.displayName || format(name);
    
    const allDrops = [...a.drops.common, ...a.drops.uncommon, ...a.drops.rare];
    
    // Difficulty badge with stars
    const difficultyBadge = a.difficulty > 0 ? formatDifficultyBadge(a.difficulty, true) : '';
    
    return `<div class="area-card" onclick="showAreaDetails('${a.name}')" style="cursor:pointer;max-height:400px;overflow-y:auto">
        <div class="area-header">
            <span class="area-name">${a.displayName || format(a.name)}</span>
            <span class="area-level">${t('level')} ${a.level}${difficultyBadge}</span>
            ${a.rotation ? `<span style="font-size:0.75rem;color:var(--text-dim)">R${a.rotation}</span>` : ''}
        </div>
        ${areaFieldBadges(a)}
        <div class="area-spawns">
            ${a.spawns.common.length ? `<div class="spawn-tier"><div class="spawn-tier-label common">${t('common')}</div><div class="spawn-list">${a.spawns.common.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
            ${a.spawns.uncommon.length ? `<div class="spawn-tier"><div class="spawn-tier-label uncommon">${t('uncommon')}</div><div class="spawn-list">${a.spawns.uncommon.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
            ${a.spawns.rare.length ? `<div class="spawn-tier"><div class="spawn-tier-label rare">${t('rare')}</div><div class="spawn-list">${a.spawns.rare.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
        </div>
        ${allDrops.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px">🎁 ${t('drops')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:0.8rem">
                ${allDrops.map(i => `<span ${highlightI(i)} style="padding:2px 6px;background:var(--bg-input);border-radius:3px;${highlightI(i) ? '' : ''}">${getItemName(i)}</span>`).join('')}
            </div>
        </div>` : ''}
        <p class="click-hint" style="margin-top:8px">${t('clickDetails')}</p>
    </div>`;
}

// Field effect tooltip functions
function showFieldTooltip(el, info) {
    if (!info) return;
    hideFieldTooltip();
    const tooltip = document.createElement('div');
    tooltip.id = 'field-tooltip';
    tooltip.style.cssText = 'position:fixed;background:rgba(20,20,30,0.95);color:#fff;padding:10px 14px;border-radius:8px;font-size:0.85rem;max-width:280px;z-index:99999;pointer-events:none;border:1px solid #64c8ff;box-shadow:0 4px 20px rgba(0,0,0,0.5);line-height:1.4';
    tooltip.textContent = info;
    document.body.appendChild(tooltip);
    const rect = el.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 10;
    if (left < 10) left = 10;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideFieldTooltip() {
    const tooltip = document.getElementById('field-tooltip');
    if (tooltip) tooltip.remove();
}

function showAreaDetails(areaName) {
    const a = areas[areaName]; if (!a) return;
    const getItemName = (name) => items[name]?.displayName || format(name);
    
    // Translate type for display
    let typeDisplay = a.type === 'dimensionBlueprint' ? (t('blueprint') || 'Blueprint') : a.type;
    
    // Level display
    const levelDisplay = a.level;
    
    // Check if this is a dimension farm zone
    const isFarmZoneModal = a.name && (a.name.includes('dimensionRift') || a.name === 'dimensionRift1' || a.name === 'dimensionRift2');
    
    // Entry cost for dimension zones (only boss zones, farm is free)
    let entryCostHtml = '';
    if (a.type === 'dimensionBlueprint') {
        if (a.tier === 1) {
            entryCostHtml = `<div style="margin-bottom:15px;padding:10px;background:rgba(148,0,211,0.1);border:1px solid rgba(148,0,211,0.3);border-radius:6px">
                <div style="font-size:0.9rem;color:var(--accent-purple)">🔒 <img src="https://play-pokechill.github.io/img/items/megaShard.png" style="width:20px;height:20px;vertical-align:middle;margin:0 6px"> 1 Mega Shard</div>
            </div>`;
        } else if (a.tier === 2) {
            entryCostHtml = `<div style="margin-bottom:15px;padding:10px;background:rgba(148,0,211,0.1);border:1px solid rgba(148,0,211,0.3);border-radius:6px">
                <div style="font-size:0.9rem;color:var(--accent-purple)">🔒 <img src="https://play-pokechill.github.io/img/items/megaPiece.png" style="width:20px;height:20px;vertical-align:middle;margin:0 6px"> 1 Mega Piece</div>
            </div>`;
        }
    }
    
    let html = `<div style="display:flex;gap:15px;align-items:center;margin-bottom:20px">
        <span class="area-level" style="font-size:1.2rem;padding:8px 16px">${t('level')} ${levelDisplay}</span>
        <span style="color:var(--text-dim)">${typeDisplay}</span>
        ${a.rotation ? `<span style="color:var(--text-dim)">${t('rotation')} ${a.rotation}</span>` : ''}
    </div>`;
    
    html += entryCostHtml;
    
    // Season dates for seasonal areas
    if (a.seasonDates) {
        const now = new Date(), month = now.getMonth() + 1, day = now.getDate();
        const s = a.seasonDates.start, e = a.seasonDates.end;
        let isActive = false;
        if (s.month <= e.month) {
            isActive = (month > s.month || (month === s.month && day >= s.day)) && (month < e.month || (month === e.month && day <= e.day));
        } else {
            isActive = (month > s.month || (month === s.month && day >= s.day)) || (month < e.month || (month === e.month && day <= e.day));
        }
        html += `<div style="margin-bottom:15px;padding:8px 12px;background:rgba(${isActive ? '0,255,136' : '136,136,170'},0.08);border:1px solid rgba(${isActive ? '0,255,136' : '136,136,170'},0.2);border-radius:6px;font-size:0.85rem">
            📅 ${s.day}/${s.month} → ${e.day}/${e.month} ${isActive ? `<span style="color:#00ff88;font-weight:700">● LIVE</span>` : `<span style="color:var(--text-dim)">${t('season')}</span>`}
        </div>`;
    }
    
    // Field effects & timed
    if ((a.fieldEffects && a.fieldEffects.length > 0) || a.timed) {
        html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:15px">`;
        if (a.fieldEffects) a.fieldEffects.forEach(f => {
            const fieldInfo = window.fieldEffectsData?.[f]?.info || '';
            // Only use JS tooltip, no native title attribute
            const escapedInfo = fieldInfo.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `<span style="padding:4px 10px;background:rgba(100,200,255,0.12);color:#64c8ff;border:1px solid rgba(100,200,255,0.25);border-radius:6px;font-size:0.8rem;cursor:help" onmouseenter="showFieldTooltip(this,'${escapedInfo}')" onmouseleave="hideFieldTooltip()">⚡ ${format(f)}</span>`;
        });
        if (a.timed) html += `<span style="padding:4px 10px;background:rgba(255,68,68,0.12);color:#ff6644;border:1px solid rgba(255,68,68,0.25);border-radius:6px;font-size:0.8rem">⏱️ ${t('timedArea')}: ${a.timed}s</span>`;
        html += `</div>`;
    }
    
    if (isFarmZoneModal) {
        html += `<div class="modal-section"><div class="modal-section-title">🎯 ${t('spawns')}</div>`;
        html += `<div style="padding:15px;background:rgba(148,0,211,0.1);border-radius:8px">
            <div style="font-size:1rem;color:var(--accent-purple);font-weight:600;margin-bottom:8px">🎲 ${t('randomSpawns') || 'Random Spawns'}</div>
            <div style="font-size:0.9rem;color:var(--text);margin-bottom:6px">3 Pokémon aléatoires (Tier S)</div>
            <div style="font-size:0.85rem;color:var(--text-dim)">${t('dimensionFarmDesc') || 'These Pokémon change each rotation. Tier S Pokémon from random types.'}</div>
        </div></div>`;
    } else if (a.spawns.common.length || a.spawns.uncommon.length || a.spawns.rare.length) {
        html += `<div class="modal-section"><div class="modal-section-title">🎯 ${t('spawns')}</div>`;
        if (a.spawns.common.length) {
            html += `<div style="margin-bottom:15px"><div style="color:#aaa;font-size:0.85rem;margin-bottom:8px">${t('common')}</div>
                <div class="pkmn-grid">${a.spawns.common.map(p => `<div class="pkmn-mini" onclick="showPokemonDetails('${p}')"><img src="${sprite(p)}"><div class="pkmn-mini-name">${pokemons[p]?.displayName || format(p)}</div></div>`).join('')}</div></div>`;
        }
        if (a.spawns.uncommon.length) {
            html += `<div style="margin-bottom:15px"><div style="color:var(--accent-blue);font-size:0.85rem;margin-bottom:8px">${t('uncommon')}</div>
                <div class="pkmn-grid">${a.spawns.uncommon.map(p => `<div class="pkmn-mini" onclick="showPokemonDetails('${p}')"><img src="${sprite(p)}"><div class="pkmn-mini-name">${pokemons[p]?.displayName || format(p)}</div></div>`).join('')}</div></div>`;
        }
        if (a.spawns.rare.length) {
            html += `<div style="margin-bottom:15px"><div style="color:var(--accent-gold);font-size:0.85rem;margin-bottom:8px">${t('rare')}</div>
                <div class="pkmn-grid">${a.spawns.rare.map(p => `<div class="pkmn-mini pkmn-mini-ha" onclick="showPokemonDetails('${p}')"><img src="${sprite(p)}"><div class="pkmn-mini-name">${pokemons[p]?.displayName || format(p)}</div></div>`).join('')}</div></div>`;
        }
        html += `</div>`;
    }
    
    // Show boss info for T4 raids and seasonal bosses (only if has real boss with moves)
    if (a.bossPkmn && pokemons[a.bossPkmn] && a.bossMoves && a.bossMoves.length > 0) {
        const boss = pokemons[a.bossPkmn];
        html += `<div class="modal-section"><div class="modal-section-title">👹 ${t('bossEncounter')}</div>`;
        html += `<div style="display:flex;gap:15px;align-items:center;padding:15px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:8px">`;
        html += `<img src="${sprite(a.bossPkmn)}" style="width:80px;height:80px;image-rendering:pixelated">`;
        html += `<div style="flex:1">`;
        html += `<div style="font-size:1.2rem;font-weight:700;color:var(--accent-gold);margin-bottom:5px">${boss.displayName || format(a.bossPkmn)}</div>`;
        html += `<div class="type-badges" style="margin-bottom:8px">${boss.types.map(t => typeBadge(t)).join('')}</div>`;
        html += `<div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:5px">⚔️ Attacks:</div>`;
        html += `<div style="display:flex;flex-direction:column;gap:4px">`;
        a.bossMoves.forEach((moveName, index) => {
            const moveData = moves[moveName];
            if (moveData) {
                const moveColor = typeColors[moveData.type] || '#666';
                const moveNum = index + 1;
                html += `<div style="padding:3px 8px;background:var(--bg-input);border-radius:4px;font-size:0.8rem;border-left:4px solid ${moveColor};cursor:pointer" onclick="event.stopPropagation();showMovePokemon('${moveName}')"><span style="display:inline-block;width:18px;font-weight:600;color:var(--accent-gold)">${moveNum}.</span> ${moveData.displayName || format(moveName)}</div>`;
            }
        });
        html += `</div>`;
        html += `</div></div></div>`;
    }
    
    // Show boss skills/debuffs for dimension zones
    if (a.skills && Object.keys(a.skills).length > 0) {
        const skillEntries = Object.entries(a.skills).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        html += `<div class="modal-section"><div class="modal-section-title" style="color:var(--accent-red)">⚠️ ${t('bossDebuffs') || 'Boss Debuffs'}</div>`;
        html += `<div style="display:flex;flex-direction:column;gap:8px">`;
        skillEntries.forEach(([slot, skillName]) => {
            const skillData = skills[skillName];
            const hpBarNum = slot === '1' ? 'N°1' : slot === '2' ? 'N°2' : slot === '3' ? 'N°3' : slot;
            html += `<div style="padding:10px 12px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);border-radius:6px">`;
            html += `<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:4px">On HP bar ${hpBarNum}</div>`;
            html += `<div style="font-size:0.9rem;color:var(--accent-red);font-weight:600">${skillData?.displayName || format(skillName)}</div>`;
            if (skillData?.info) {
                html += `<div style="font-size:0.8rem;color:var(--text-dim);margin-top:4px">${cleanInfoText(skillData.info)}</div>`;
            }
            html += `</div>`;
        });
        html += `</div></div>`;
    }

    // Show all drops with rarity
    if (a.drops.common.length || a.drops.uncommon.length || a.drops.rare.length) {
        html += `<div class="modal-section"><div class="modal-section-title">🎁 ${t('itemDrops')}</div>`;
        if (a.drops.common.length) {
            html += `<div style="margin-bottom:12px"><div style="color:#aaa;font-size:0.85rem;margin-bottom:6px">${t('common')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">${a.drops.common.map(i => `<span style="padding:6px 12px;background:var(--bg-input);border-radius:6px;display:flex;align-items:center;gap:6px">
                    <img src="${itemImg(i)}" style="width:24px;height:24px" onerror="this.style.display='none'">${getItemName(i)}
                </span>`).join('')}</div></div>`;
        }
        if (a.drops.uncommon.length) {
            html += `<div style="margin-bottom:12px"><div style="color:var(--accent-blue);font-size:0.85rem;margin-bottom:6px">${t('uncommon')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">${a.drops.uncommon.map(i => `<span style="padding:6px 12px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:6px;display:flex;align-items:center;gap:6px">
                    <img src="${itemImg(i)}" style="width:24px;height:24px" onerror="this.style.display='none'">${getItemName(i)}
                </span>`).join('')}</div></div>`;
        }
        if (a.drops.rare.length) {
            html += `<div style="margin-bottom:12px"><div style="color:var(--accent-gold);font-size:0.85rem;margin-bottom:6px">${t('rare')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">${a.drops.rare.map(i => `<span style="padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;display:flex;align-items:center;gap:6px">
                    <img src="${itemImg(i)}" style="width:24px;height:24px" onerror="this.style.display='none'">${getItemName(i)}
                </span>`).join('')}</div></div>`;
        }
        html += `</div>`;
    }
    
    // Apricorn drop for T3/T4 raids (v3.9) - single color based on ticketIndex
    if (a.apricornColor) {
        const isT4 = a.difficulty >= 600;
        const dropLabel = isT4 ? '100%' : '~20%';
        const color = isT4 ? 'var(--accent-gold)' : 'var(--accent-blue)';
        const bg = isT4 ? 'rgba(255,215,0,0.1)' : 'rgba(0,212,255,0.1)';
        const border = isT4 ? 'rgba(255,215,0,0.3)' : 'rgba(0,212,255,0.3)';
        html += `<div class="modal-section"><div class="modal-section-title"><img src="${itemImg(a.apricornColor)}" style="width:20px;height:20px;vertical-align:middle"> ${t('apricornDrops') || 'Drops Noigrumes'}</div>`;
        html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
        html += `<span style="padding:6px 12px;background:${bg};border:1px solid ${border};border-radius:6px;display:flex;align-items:center;gap:6px">
            <img src="${itemImg(a.apricornColor)}" style="width:24px;height:24px" onerror="this.style.display='none'">
            <span style="color:${color}">${getItemName(a.apricornColor)}</span>
            <span style="font-size:0.75rem;color:var(--text-dim)">(${dropLabel})</span>
        </span>`;
        html += `</div></div>`;
    }
    
    // Show rewards (for dimension blueprint zones with item rewards like whiteApricorn)
    if (a.rewards && (a.rewards.items.length || a.rewards.pokemon.length)) {
        html += `<div class="modal-section"><div class="modal-section-title" style="color:var(--accent-gold)">🏆 ${t('rewards') || 'Récompenses'}</div>`;
        html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
        // Item rewards
        a.rewards.items.forEach(itemName => {
            html += `<span style="padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;display:flex;align-items:center;gap:6px">
                <img src="${itemImg(itemName)}" style="width:24px;height:24px" onerror="this.style.display='none'">
                <span style="color:var(--accent-gold)">${getItemName(itemName)}</span>
            </span>`;
        });
        // Pokemon rewards
        a.rewards.pokemon.forEach(pkmnName => {
            html += `<span style="padding:6px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;display:flex;align-items:center;gap:6px">
                <img src="${sprite(pkmnName)}" style="width:24px;height:24px" onerror="this.style.display='none'">
                <span style="color:var(--accent-green)">${pokemons[pkmnName]?.displayName || format(pkmnName)}</span>
            </span>`;
        });
        html += `</div></div>`;
    }
    
    openModal(`🗺️ ${a.displayName || areaName}`, html);
}

// ============ EVENT ZONES ============
function searchEventZones() {
    const mode = getZoneSearchMode('event');
    const pkmn = mode === 'pkmn' ? document.getElementById('event-pokemon').value.toLowerCase() : '';
    const type1 = mode === 'pkmn' ? document.getElementById('event-type1').value : '';
    const type2 = mode === 'pkmn' ? document.getElementById('event-type2').value : '';
    const zoneName = mode === 'zone' ? document.getElementById('event-zone-search').value.toLowerCase() : '';
    const itemFilter = document.getElementById('event-item').value;
    const lv = document.getElementById('event-level').value;
    const rot = document.getElementById('event-rotation').value;
    const cat = document.getElementById('event-category').value;
    
    // Update URL hash
    updateURLHash('event', { pokemon: pkmn, type1, type2, zone: zoneName, item: itemFilter, level: lv, rotation: rot, category: cat });
    
    // Filter areas of type "event"
    const res = Object.values(areas).filter(a => {
        if (a.type !== 'event') return false;
        if (lv && a.level !== parseInt(lv)) return false;
        if (rot && a.rotation !== parseInt(rot)) return false;
        if (cat && a.category !== parseInt(cat)) return false;
        
        // Zone name filter
        if (zoneName) {
            if (!(a.displayName || format(a.name)).toLowerCase().includes(zoneName) && !a.name.toLowerCase().includes(zoneName)) return false;
        }
        
        const allSpawns = [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare];
        
        if (pkmn) {
            if (!allSpawns.some(p => p.toLowerCase().includes(pkmn) || (pokemons[p]?.displayName || '').toLowerCase().includes(pkmn))) return false;
        }
        
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
    
    const c = document.getElementById('event-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('eventZones')}</div><div class="results-grid">${res.map(a => renderEventZoneCard(a, pkmn, itemFilter, type1, type2)).join('')}</div>`;
}

function renderEventZoneCard(a, highlightPkmn = '', highlightItem = '', type1 = '', type2 = '') {
    const highlightP = (name) => {
        const pkmnData = pokemons[name];
        const nameMatch = highlightPkmn && (name.toLowerCase().includes(highlightPkmn) || (pkmnData?.displayName || '').toLowerCase().includes(highlightPkmn));
        const typeMatch = (type1 || type2) && pkmnData && 
            (!type1 || pkmnData.types.includes(type1)) && 
            (!type2 || pkmnData.types.includes(type2));
        if (nameMatch || typeMatch) {
            return `style="background:rgba(255,215,0,0.2);border:1px solid var(--accent-gold)"`;
        }
        return '';
    };
    const highlightI = (name) => {
        if (highlightItem && name === highlightItem) {
            return `style="background:rgba(0,212,255,0.3);border:1px solid var(--accent-blue);color:var(--accent-blue)"`;
        }
        return '';
    };
    const getItemName = (name) => items[name]?.displayName || format(name);
    
    let allDrops = [...a.drops.common, ...a.drops.uncommon, ...a.drops.rare];
    const hasNoSpawns = !a.spawns.common.length && !a.spawns.uncommon?.length && !a.spawns.rare.length;
    
    // Add apricorn drop for T3/T4 raids (v3.9) - single color based on ticketIndex
    if (a.apricornColor) {
        allDrops.push(a.apricornColor);
    }
    
    let badges = '';
    if (a.uncatchable) badges += `<span style="padding:2px 6px;background:rgba(255,68,68,0.2);color:var(--accent-red);border-radius:3px;font-size:0.7rem">${t('uncatchable')}</span>`;
    if (a.difficulty) badges += formatDifficultyBadge(a.difficulty, true);
    
    // Boss section for zones with a REAL boss (T4 raids, seasonal bosses with encounter:true and slot1Moves)
    let bossSection = '';
    const hasRealBoss = a.bossMoves && a.bossMoves.length > 0;

    // Show boss only if it's a real boss (has moves)
    if (hasRealBoss && a.bossPkmn && pokemons[a.bossPkmn]) {
        const bossPkmnData = pokemons[a.bossPkmn];
        const movesHtml = `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">${a.bossMoves.map((m, idx) => {
            const moveData = moves[m];
            if (!moveData) return '';
            const moveColor = typeColors[moveData.type] || '#666';
            const moveNum = idx + 1;
            return `<span style="padding:2px 6px;background:var(--bg-input);border-radius:3px;font-size:0.7rem;border-left:3px solid ${moveColor};cursor:pointer;display:flex;align-items:center;gap:4px" onclick="event.stopPropagation();showMovePokemon('${m}')"><span style="font-size:0.6rem;color:var(--text-dim);font-weight:700;min-width:10px;text-align:center">${moveNum}</span>${moveData.displayName || format(m)}</span>`;
        }).join('')}</div>`;
        bossSection = `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,215,0,0.1);border-radius:8px;margin-bottom:8px">
            <img src="${sprite(a.bossPkmn)}" style="width:64px;height:64px;image-rendering:pixelated" onclick="event.stopPropagation();showPokemonDetails('${a.bossPkmn}')">
            <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:var(--accent-gold)">${bossPkmnData.displayName || format(a.bossPkmn)}</div>
                ${bossPkmnData.types ? `<div class="type-badges">${bossPkmnData.types.map(t => typeBadge(t)).join('')}</div>` : ''}
                <div style="font-size:0.75rem;color:var(--text-dim)">${t('bossEncounter')}</div>
                ${movesHtml}
            </div>
        </div>`;
    }
    
    return `<div class="area-card" onclick="showAreaDetails('${a.name}')" style="cursor:pointer;border-left:3px solid var(--accent-gold);max-height:400px;overflow-y:auto">
        <div class="area-header">
            <span class="area-name">🎪 ${a.displayName || format(a.name)}</span>
            <span class="area-level">${t('level')} ${a.level}</span>
            ${a.rotation ? `<span style="font-size:0.75rem;color:var(--text-dim)">R${a.rotation}</span>` : ''}
        </div>
        ${badges ? `<div style="display:flex;gap:6px;margin-bottom:8px">${badges}</div>` : ''}
        ${areaFieldBadges(a)}
        ${a.unlockDescription ? `<div style="font-size:0.75rem;color:var(--accent-blue);margin-bottom:8px">🔓 ${a.unlockDescription}</div>` : ''}
        ${bossSection}
        <div class="area-spawns">
            ${a.spawns.common.length ? `<div class="spawn-tier"><div class="spawn-tier-label common">${t('common')}</div><div class="spawn-list">${a.spawns.common.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
            ${a.spawns.rare.length ? `<div class="spawn-tier"><div class="spawn-tier-label rare">${t('rare')}</div><div class="spawn-list">${a.spawns.rare.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
        </div>
        ${allDrops.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px">🎁 ${t('drops')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:0.8rem">
                ${allDrops.map(i => `<span ${highlightI(i)} style="padding:2px 6px;background:var(--bg-input);border-radius:3px">${getItemName(i)}</span>`).join('')}
            </div>
        </div>` : ''}
        <p class="click-hint" style="margin-top:8px">${t('clickDetails')}</p>
    </div>`;
}

function initEventItemDropdown() {
    const select = document.getElementById('event-item');
    if (!select) return;
    
    // Collect all unique drops from event areas
    const allDrops = new Set();
    Object.values(areas).filter(a => a.type === 'event').forEach(a => {
        [...a.drops.common, ...a.drops.uncommon, ...a.drops.rare].forEach(d => allDrops.add(d));
    });
    
    const sorted = [...allDrops].sort();
    select.innerHTML = '<option value="" data-i18n="all">All Items</option>' + sorted.map(d => `<option value="${d}">${items[d]?.displayName || format(d)}</option>`).join('');
}

function searchDimensionZones() {
    const mode = getZoneSearchMode('dimension');
    const pkmn = mode === 'pkmn' ? document.getElementById('dimension-pokemon')?.value.toLowerCase() || '' : '';
    const type1 = mode === 'pkmn' ? document.getElementById('dimension-type1')?.value || '' : '';
    const type2 = mode === 'pkmn' ? document.getElementById('dimension-type2')?.value || '' : '';
    const zoneName = mode === 'zone' ? document.getElementById('dimension-zone-search')?.value.toLowerCase() || '' : '';
    const tier = document.getElementById('dimension-tier')?.value || '';
    const rot = document.getElementById('dimension-rotation')?.value || '';
    
    // Update URL hash
    updateURLHash('dimension', { pokemon: pkmn, type1, type2, zone: zoneName, tier, rotation: rot, searchMode: mode });
    
    // Filter all dimension blueprint zones for datalist
    const allDimensionZones = Object.values(areas).filter(a => a.type === 'dimensionBlueprint');
    
    const res = Object.values(areas).filter(a => {
        if (a.type !== 'dimension' && a.type !== 'dimensionBlueprint') return false;
        
        // Filter out placeholder raid zones (dimensionRaid1 and dimensionRaid2 are placeholders)
        if (a.name && (a.name === 'dimensionRaid1' || a.name === 'dimensionRaid2')) return false;
        if (tier && a.tier !== parseInt(tier)) return false;
        if (rot && a.rotation !== parseInt(rot)) return false;
        
        // Zone name filter
        if (zoneName) {
            const nameToCheck = (a.displayName || format(a.name)).toLowerCase();
            if (!nameToCheck.includes(zoneName) && !a.name.toLowerCase().includes(zoneName)) return false;
        }
        
        // Get all spawning Pokemon names (safe access) - include boss for raid zones
        const allSpawns = [...(a.spawns?.common || []), ...(a.spawns?.uncommon || []), ...(a.spawns?.rare || [])];
        if (a.bossPkmn) allSpawns.push(a.bossPkmn);
        
        if (pkmn) {
            if (!allSpawns.some(p => p.toLowerCase().includes(pkmn) || (pokemons[p]?.displayName || '').toLowerCase().includes(pkmn))) return false;
        }
        
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
        
        return true;
    }).sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));
    
    const c = document.getElementById('dimension-results');
    if (res.length === 0) { 
        c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; 
        return; 
    }
    c.innerHTML = `<div class="results-info">${res.length} ${t('dimensionZones') || 'Mega Dimension Zones'}</div><div class="results-grid">${res.map(a => renderDimensionCard(a, pkmn, type1, type2)).join('')}</div>`;
}

function renderDimensionCard(a, highlightPkmn = '', type1 = '', type2 = '') {
    const getItemName = (name) => items[name]?.displayName || format(name);
    const highlightP = (name) => {
        const pkmnData = pokemons[name];
        const nameMatch = highlightPkmn && (name.toLowerCase().includes(highlightPkmn) || (pkmnData?.displayName || '').toLowerCase().includes(highlightPkmn));
        const typeMatch = (type1 || type2) && pkmnData && 
            (!type1 || pkmnData.types.includes(type1)) && 
            (!type2 || pkmnData.types.includes(type2));
        if (nameMatch || typeMatch) {
            return `style="background:rgba(255,215,0,0.2);border:1px solid var(--accent-gold)"`;
        }
        return '';
    };
    
    // Safe access to drops (filter out 'nothing' placeholder)
    const allDrops = [...(a.drops?.common || []), ...(a.drops?.uncommon || []), ...(a.drops?.rare || [])].filter(i => i !== 'nothing');
    
    // Safe access to rewards (for dimension blueprint zones)
    const rewardItems = a.rewards?.items || [];
    const rewardPokemon = a.rewards?.pokemon || [];
    
    // Check if this is a dimension farm zone (type dimension without boss = farm)
    const isFarmZone = a.type === 'dimension' && !a.bossPkmn;
    
    // Badges: Rotation, Blueprint/Farm, Uncatchable
    let badges = '';
    // Zones de farm = non-capturable (comme les autres zones de farm)
    if (isFarmZone || a.uncatchable) badges += `<span style="padding:2px 6px;background:rgba(255,68,68,0.2);color:var(--accent-red);border-radius:3px;font-size:0.7rem">${t('uncatchable')}</span>`;
    if (a.rotation) badges += `<span style="padding:2px 8px;background:rgba(0,212,255,0.2);color:var(--accent-blue);border-radius:3px;font-size:0.7rem;margin-left:5px">R${a.rotation}</span>`;
    if (a.type === 'dimensionBlueprint') badges += `<span style="padding:2px 8px;background:rgba(255,0,170,0.2);color:var(--accent-pink);border-radius:3px;font-size:0.7rem;margin-left:5px">${t('blueprint') || 'Plan'}</span>`;
    if (isFarmZone) badges += `<span style="padding:2px 8px;background:rgba(0,255,136,0.2);color:var(--accent-green);border-radius:3px;font-size:0.7rem;margin-left:5px">${t('farm') || 'Farm'}</span>`;
    
    // Étoiles de difficulté en VIOLET/MAUVE (comme T4 mais couleur spécifique Mega Dimension)
    let difficultyBadge = '';
    if (a.difficulty) {
        // Tier 1 = 1 étoile, Tier 2 = 2 étoiles (système simple pour dimension)
        const tierNum = a.tier || 1;
        const tierColor = '#c084fc'; // Violet/mauve clair
        const stars = '★'.repeat(tierNum);
        difficultyBadge = `<div style="margin-bottom:8px"><span style="padding:2px 6px;background:${tierColor}20;border:1px solid ${tierColor}60;border-radius:3px;font-size:0.7rem;color:${tierColor};font-weight:700">${stars}</span></div>`;
    }
    
    // Entry cost section (même style que "Requires x3 Steel Keystones")
    // Seuls les boss de Mega Dimension nécessitent un item pour entrer, pas les zones de farm
    let unlockSection = '';
    const isBossZone = a.type === 'dimension' && a.bossPkmn;
    if (a.type === 'dimensionBlueprint' || isBossZone) {
        if (a.tier === 1) {
            unlockSection = `<div style="font-size:0.75rem;color:var(--accent-blue);margin-bottom:8px">🔒 Requires <img src="https://play-pokechill.github.io/img/items/megaShard.png" style="width:20px;height:20px;vertical-align:middle;margin:0 2px"> 1 Mega Shard to enter</div>`;
        } else if (a.tier === 2) {
            unlockSection = `<div style="font-size:0.75rem;color:var(--accent-blue);margin-bottom:8px">🔒 Requires <img src="https://play-pokechill.github.io/img/items/megaPiece.png" style="width:20px;height:20px;vertical-align:middle;margin:0 2px"> 1 Mega Piece to enter</div>`;
        } else if (a.tier === 3) {
            unlockSection = `<div style="font-size:0.75rem;color:var(--accent-blue);margin-bottom:8px">🔒 Requires <img src="https://play-pokechill.github.io/img/items/megaChunk.png" style="width:20px;height:20px;vertical-align:middle;margin:0 2px"> 1 Mega Chunk to enter</div>`;
        } else if (a.tier === 4) {
            unlockSection = `<div style="font-size:0.75rem;color:var(--accent-blue);margin-bottom:8px">🔒 Requires <img src="https://play-pokechill.github.io/img/items/megaCluster.png" style="width:20px;height:20px;vertical-align:middle;margin:0 2px"> 1 Mega Cluster to enter</div>`;
        }
    }
    
    // Boss section - fond MAUVE/VIOLET (spécifique Mega Dimension, pas doré comme T4)
    let bossSection = '';
    if (a.bossPkmn && pokemons[a.bossPkmn] && a.bossMoves && a.bossMoves.length > 0) {
        const bossPkmnData = pokemons[a.bossPkmn];
        const movesHtml = `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">${a.bossMoves.map((m, idx) => {
            const moveData = moves[m];
            if (!moveData) return '';
            const moveColor = typeColors[moveData.type] || '#666';
            const moveNum = idx + 1;
            return `<span style="padding:2px 6px;background:var(--bg-input);border-radius:3px;font-size:0.7rem;border-left:3px solid ${moveColor};cursor:pointer;display:flex;align-items:center;gap:4px" onclick="event.stopPropagation();showMovePokemon('${m}')"><span style="font-size:0.6rem;color:var(--text-dim);font-weight:700;min-width:10px;text-align:center">${moveNum}</span>${moveData.displayName || format(m)}</span>`;
        }).join('')}</div>`;
        bossSection = `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(148,0,211,0.1);border-radius:8px;margin-bottom:8px">
            <img src="${sprite(a.bossPkmn)}" style="width:64px;height:64px;image-rendering:pixelated;cursor:pointer" onclick="event.stopPropagation();showPokemonDetails('${a.bossPkmn}')">
            <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:#c084fc">${bossPkmnData.displayName || format(a.bossPkmn)}</div>
                ${bossPkmnData.types ? `<div class="type-badges">${bossPkmnData.types.map(t => typeBadge(t)).join('')}</div>` : ''}
                <div style="font-size:0.75rem;color:var(--text-dim)">${t('bossEncounter') || 'Boss à affronter'}</div>
                ${movesHtml}
            </div>
        </div>`;
    }
    
    // Safe access to spawns
    const placeholderPkmn = ['magikarp', 'nothing'];
    const spawnsCommon = (a.spawns?.common || []).filter(p => !placeholderPkmn.includes(p));
    const spawnsRare = (a.spawns?.rare || []).filter(p => !placeholderPkmn.includes(p));
    
    // Header avec badges à la place de Niveau/Rotation
    return `<div class="area-card" onclick="showAreaDetails('${a.name}')" style="cursor:pointer;border-left:3px solid var(--accent-purple);max-height:400px;overflow-y:auto">
        <div class="area-header">
            <span class="area-name">🌌 ${a.displayName || format(a.name)}</span>
            ${badges}
        </div>
        ${difficultyBadge}
        ${unlockSection}
        ${bossSection}
        ${isFarmZone ? `<div style="padding:10px;background:rgba(148,0,211,0.1);border-radius:8px;margin-bottom:10px">
            <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:6px">🎲 ${t('randomSpawns') || 'Random Spawns'}</div>
            <div style="font-size:0.9rem;color:#c084fc">3 Pokémon aléatoires (Tier S)</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px">${t('changesEachRotation') || 'Changes each rotation'}</div>
        </div>` : `
        <div class="area-spawns">
            ${spawnsCommon.length ? `<div class="spawn-tier"><div class="spawn-tier-label common">${t('common')}</div><div class="spawn-list">${spawnsCommon.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
            ${spawnsRare.length ? `<div class="spawn-tier"><div class="spawn-tier-label rare">${t('rare')}</div><div class="spawn-list">${spawnsRare.map(p => `<div class="spawn-item" ${highlightP(p)} onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>` : ''}
        </div>`}
        ${allDrops.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px">🎁 ${t('drops')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:0.8rem">
                ${allDrops.map(i => `<span style="padding:2px 6px;background:var(--bg-input);border-radius:3px">${getItemName(i)}</span>`).join('')}
            </div>
        </div>` : ''}
        ${rewardItems.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:0.75rem;color:var(--accent-gold);margin-bottom:6px">🏆 ${t('rewards') || 'Récompenses'}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:0.8rem">
                ${rewardItems.map(i => `<span style="padding:2px 6px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:3px">${getItemName(i)}</span>`).join('')}
            </div>
        </div>` : ''}
        <p class="click-hint" style="margin-top:8px">${t('clickDetails')}</p>
    </div>`;
}

function searchSeasonalZones() {
    const pkmn = document.getElementById('seasonal-pokemon').value.toLowerCase();
    const type1 = document.getElementById('seasonal-type1').value;
    const type2 = document.getElementById('seasonal-type2').value;
    const season = document.getElementById('seasonal-season').value;
    
    // Update URL hash
    updateURLHash('seasonal', { pokemon: pkmn, type1, type2, season });
    
    // Filter areas of type "season" - show ALL seasonal zones (past, present, future)
    // Only filter by season type, not by active dates
    const res = Object.values(areas).filter(a => {
        if (a.type !== 'season') return false;
        // Removed: if (!isSeasonActive(a.seasonDates)) return false;
        // Now showing all seasonal zones for reference
        if (season && a.season !== season) return false;
        
        const allSpawns = [...(a.spawns.common || []), ...(a.spawns.uncommon || []), ...(a.spawns.rare || [])];
        
        if (pkmn) {
            if (!allSpawns.some(p => p.toLowerCase().includes(pkmn) || (pokemons[p]?.displayName || '').toLowerCase().includes(pkmn))) return false;
        }
        
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
        return true;
    }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    
    const c = document.getElementById('seasonal-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${res.length} ${t('seasonalAreas') || 'Seasonal Areas'} (${t('allSeasons') || 'all seasons'})</div><div class="results-grid">${res.map(a => renderSeasonalCard(a)).join('')}</div>`;
}

// ============ ACTIVE ZONES ============
function renderActiveZones() {
    calculateRotations();
    
    // Frontier divisions based on rotation (from areasDictionary.js structure):
    // Rotation 1 = Little Cup (D-C tiers) - League 1
    // Rotation 2 = Great League (B tiers) - League 2
    // Rotation 3 = Ultra League (A tiers) - League 3
    // Rotation 4 = Master League (S-SSS tiers) - League 4 (unlock by defeating Lusamine)
    const FRONTIER_DIVISIONS = {
        1: { name: 'D-C', fullName: t('littleCup') || 'Little Cup' },
        2: { name: 'B', fullName: t('greatLeague') || 'Great League' },
        3: { name: 'A', fullName: t('ultraLeague') || 'Ultra League' },
        4: { name: 'S-SSS', fullName: t('masterLeague') || 'Master League' }
    };
    
    // Get time remaining for each rotation
    const timeRemaining = getRotationTimeRemaining();
    
    // Rotation info cards
    const rotInfo = document.getElementById('rotation-info');
    const frontierDiv = FRONTIER_DIVISIONS[currentRotations.frontier];
    rotInfo.innerHTML = `
        <div style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:0.8rem;color:var(--text-dim)">🌿 Wild</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent-green)">${t('rotation')} ${currentRotations.wild}/${ROTATION_MAX.wild}</div>
            <div id="timer-wild" style="display:inline-block;margin-top:6px;padding:4px 10px;background:rgba(0,255,136,0.15);border:1px solid rgba(0,255,136,0.4);border-radius:6px;font-size:0.9rem;font-weight:700;color:var(--accent-green);font-family:monospace;box-shadow:0 0 8px rgba(0,255,136,0.2)" title="Temps restant">⏳ ${formatTimeRemaining(timeRemaining.wild)}</div>
        </div>
        <div style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:0.8rem;color:var(--text-dim)">🏰 Dungeon</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent-blue)">${t('rotation')} ${currentRotations.dungeon}/${ROTATION_MAX.dungeon}</div>
            <div id="timer-dungeon" style="display:inline-block;margin-top:6px;padding:4px 10px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);border-radius:6px;font-size:0.9rem;font-weight:700;color:var(--accent-blue);font-family:monospace;box-shadow:0 0 8px rgba(0,212,255,0.2)" title="Temps restant">⏳ ${formatTimeRemaining(timeRemaining.dungeon)}</div>
        </div>
        <div style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:0.8rem;color:var(--text-dim)">🎪 Event</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent-gold)">${t('rotation')} ${currentRotations.event}/${ROTATION_MAX.event}</div>
            <div style="font-size:0.75rem;color:var(--accent-pink)">${EVENT_NAMES[currentRotations.event] || ''}</div>
            <div id="timer-event" style="display:inline-block;margin-top:4px;padding:4px 10px;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);border-radius:6px;font-size:0.9rem;font-weight:700;color:var(--accent-gold);font-family:monospace;box-shadow:0 0 8px rgba(255,215,0,0.2)" title="Temps restant">⏳ ${formatTimeRemaining(timeRemaining.event)}</div>
        </div>
        <div style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:0.8rem;color:var(--text-dim)">🏆 Frontier</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent-purple)">${t('rotation')} ${currentRotations.frontier}/${ROTATION_MAX.frontier}</div>
            <div style="font-size:0.75rem;color:var(--accent-pink)">${frontierDiv?.fullName || ''} (${frontierDiv?.name || ''})</div>
            <div id="timer-frontier" style="display:inline-block;margin-top:4px;padding:4px 10px;background:rgba(148,0,211,0.15);border:1px solid rgba(148,0,211,0.4);border-radius:6px;font-size:0.9rem;font-weight:700;color:var(--accent-purple);font-family:monospace;box-shadow:0 0 8px rgba(148,0,211,0.2)" title="Temps restant">⏳ ${formatTimeRemaining(timeRemaining.frontier)}</div>
        </div>
        <div style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:0.8rem;color:var(--text-dim)">🌌 Mega Dimension</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent-purple)">${t('rotation')} ${currentRotations.dimension || 1}/${ROTATION_MAX.dimension || 1}</div>
            <div id="timer-dimension" style="display:inline-block;margin-top:6px;padding:4px 10px;background:rgba(192,132,252,0.15);border:1px solid rgba(192,132,252,0.4);border-radius:6px;font-size:0.9rem;font-weight:700;color:#c084fc;font-family:monospace;box-shadow:0 0 8px rgba(192,132,252,0.2)" title="Temps restant">⏳ ${formatTimeRemaining(timeRemaining.dimension)}</div>
        </div>
    `;
    
    // Start live countdown
    startCountdown();
    
    // Lusamine unlock checkbox
    const lusamineUnlocked = localStorage.getItem('pokechill_lusamine_defeated') === 'true';
    const tier4Raids = Object.values(areas).filter(a => a.type === 'event' && a.level >= 110);
    const tier4Count = tier4Raids.length;
    
    const lusamineDiv = document.createElement('div');
    lusamineDiv.style.cssText = 'grid-column:1/-1;margin-top:10px;padding:10px;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(148,0,211,0.1));border:1px solid var(--accent-gold);border-radius:8px';
    lusamineDiv.innerHTML = `
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" ${lusamineUnlocked ? 'checked' : ''} onchange="toggleLusamineUnlock(this.checked)" style="width:18px;height:18px;accent-color:var(--accent-gold)">
            <span style="font-size:0.9rem;color:var(--text-main)">🌟 ${t('lusamineUnlock') || 'Débloquer 4ème rotation (Lusamine battue)'}</span>
        </label>
        <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;margin-left:28px">
            ${t('lusamineUnlockDesc') || 'Active la 4ème rotation du Frontier (Master Ligue SS/S)'}
            ${!lusamineUnlocked && tier4Count > 0 ? `<br><span style="color:var(--accent-red)">🔒 ${tier4Count} Tier IV Raid${tier4Count > 1 ? 's' : ''} ${t('hidden') || 'caché(s)'}</span>` : ''}
        </div>
    `;
    rotInfo.appendChild(lusamineDiv);
    
    // Active Wild Zones
    const activeWild = Object.values(areas).filter(a => a.type === 'wild' && a.rotation === currentRotations.wild);
    const wildContainer = document.getElementById('active-wild');
    if (activeWild.length > 0) {
        wildContainer.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-green)">🌿 ${t('activeWild')} (${activeWild.length})</h4>
            <div class="results-grid">${activeWild.map(a => renderAreaCard(a, '', '', '', '')).join('')}</div>
        `;
    } else {
        wildContainer.innerHTML = `<p style="color:var(--text-dim)">${t('noActiveWild')}</p>`;
    }
    
    // Active Dungeons
    const activeDungeon = Object.values(areas).filter(a => a.type === 'dungeon' && a.rotation === currentRotations.dungeon);
    const dungeonContainer = document.getElementById('active-dungeon');
    if (activeDungeon.length > 0) {
        dungeonContainer.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-blue)">🏰 ${t('activeDungeon')} (${activeDungeon.length})</h4>
            <div class="results-grid">${activeDungeon.map(a => renderDungeonCard(a, '', '', '', '')).join('')}</div>
        `;
    } else {
        dungeonContainer.innerHTML = `<p style="color:var(--text-dim)">${t('noActiveDungeon')}</p>`;
    }
    
    // Check if Lusamine is defeated (for Tier 4 raid unlocks - level 110+)
    const lusamineDefeated = localStorage.getItem('pokechill_lusamine_defeated') === 'true';
    
    // Active Events
    const activeEvent = Object.values(areas).filter(a => {
        if (a.type !== 'event') return false;
        // Hide Tier 4 raids (level 110+) if Lusamine not defeated
        if (a.level >= 110 && !lusamineDefeated) return false;
        if (Array.isArray(a.rotation)) return a.rotation.includes(currentRotations.event);
        return a.rotation === currentRotations.event;
    });
    const eventContainer = document.getElementById('active-event');
    if (activeEvent.length > 0) {
        eventContainer.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-gold)">🎪 ${t('activeEvent')}: ${EVENT_NAMES[currentRotations.event] || ''} (${activeEvent.length})</h4>
            <div class="results-grid">${activeEvent.map(a => renderEventZoneCard(a, '', '', '', '')).join('')}</div>
        `;
    } else {
        eventContainer.innerHTML = `<p style="color:var(--text-dim)">${t('noActiveEvent')}</p>`;
    }
    
    // Active Seasonal Areas (Limited)
    const activeSeasonal = Object.values(areas).filter(a => a.type === 'season' && isSeasonActive(a.seasonDates));
    const seasonalContainer = document.getElementById('active-seasonal');
    if (!seasonalContainer) {
        // Create container if doesn't exist
        const eventDiv = document.getElementById('active-event');
        const newDiv = document.createElement('div');
        newDiv.id = 'active-seasonal';
        newDiv.style.marginBottom = '25px';
        eventDiv.parentNode.insertBefore(newDiv, eventDiv.nextSibling);
    }
    
    const seasonalDiv = document.getElementById('active-seasonal');
    const seasonalTab = document.getElementById('tab-seasonal');
    
    // Always keep the Season tab visible
    if (seasonalTab) seasonalTab.style.display = 'inline-block';
    
    if (activeSeasonal.length > 0) {
        seasonalDiv.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-orange)">📅 ${t('activeSeasonal') || 'Seasonal Areas'} (${activeSeasonal.length})</h4>
            <div class="results-grid">${activeSeasonal.map(a => renderSeasonalCard(a)).join('')}</div>
        `;
    } else {
        // Show message when no seasonal zones are currently active
        seasonalDiv.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-orange)">📅 ${t('activeSeasonal') || 'Seasonal Areas'}</h4>
            <p style="color:var(--text-dim);padding:10px;background:var(--bg-input);border-radius:8px">${t('noActiveSeasonal') || 'No seasonal areas are currently active. Check the Season tab to see all seasonal zones (past, present, and future).'}</p>
        `;
    }
    
    // Active Frontier - Show current division based on current rotation and parsed game data
    const frontierContainer = document.getElementById('active-frontier');
    
    // Map current rotation to leagues based on areasDictionary.js structure:
    // Rotation 1 = League 1 (Little Cup - D-C tiers)
    // Rotation 2 = League 2 (Great League - B tiers)
    // Rotation 3 = Leagues 3-4 (Ultra/Master League - A and S-SSS tiers)
    const rotationToLeagues = {
        1: [1],
        2: [2],
        3: [3, 4]
    };
    
    const currentLeagues = rotationToLeagues[currentRotations.frontier] || [1];
    const activeFrontierAreas = Object.values(areas).filter(a => 
        a.type === 'frontier' && currentLeagues.includes(a.league)
    );
    
    // Active Mega Dimension zones (only show if Lusamine defeated)
    // Include: dimensionBlueprint (boss zones) and dimension (farm zones like dimensionRift1/2)
    const activeDimension = Object.values(areas).filter(a => {
        if (a.type !== 'dimensionBlueprint' && a.type !== 'dimension') return false;
        // Only show if Lusamine defeated
        if (!lusamineDefeated) return false;
        // Farm zones (type 'dimension' without blueprint) don't have rotation, always show them
        if (a.type === 'dimension' && !a.bossPkmn) return true;
        // Boss zones (dimensionBlueprint) check rotation
        return a.rotation === currentRotations.dimension;
    });
    
    // Find or create container for Mega Dimension (BEFORE Frontier)
    let dimensionContainer = document.getElementById('active-dimension');
    if (!dimensionContainer) {
        dimensionContainer = document.createElement('div');
        dimensionContainer.id = 'active-dimension';
        dimensionContainer.style.marginBottom = '25px';
        frontierContainer.parentNode.insertBefore(dimensionContainer, frontierContainer);
    }
    
    if (activeDimension.length > 0 && lusamineDefeated) {
        dimensionContainer.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-purple)">🌌 ${t('activeDimension') || 'Active Mega Dimension'}</h4>
            <div class="results-grid">${activeDimension.map(a => renderDimensionCard(a)).join('')}</div>
        `;
    } else {
        dimensionContainer.innerHTML = '';
    }
    
    // Determine division name based on current rotation (from areasDictionary.js comments)
    // Rotation 4 (Master League S-SSS) is unlocked when Lusamine is defeated
    const divisionNames = {
        1: { name: 'D-C', fullName: t('littleCup'), color: 'var(--div-d)', desc: 'D-C tiers' },
        2: { name: 'B', fullName: t('greatLeague'), color: 'var(--div-b)', desc: 'B tiers' },
        3: { name: 'A', fullName: t('ultraMaster'), color: 'var(--div-a)', desc: 'A tier' },
        4: { name: 'S-SSS', fullName: t('masterLeague'), color: 'var(--div-s)', desc: 'S-SSS tiers' }
    };
    const division = divisionNames[currentRotations.frontier];
    
    if (activeFrontierAreas.length > 0 && division) {
        frontierContainer.innerHTML = `
            <h4 style="margin-bottom:10px;color:var(--accent-purple)">🏆 ${t('activeFrontier') || 'Active Frontier'}</h4>
            <div style="background:linear-gradient(135deg,${division.color}20,transparent);border-left:3px solid ${division.color};padding:15px;border-radius:0 8px 8px 0">
                <div style="font-size:1.3rem;font-weight:700;color:${division.color};margin-bottom:5px">
                    ${division.fullName} (${division.name})
                </div>
                <div style="color:var(--text-dim);font-size:0.9rem;margin-bottom:10px">
                    ${division.desc} - ${activeFrontierAreas.length} ${t('trainers') || 'trainers'}
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <span style="padding:4px 10px;background:var(--bg-card);border-radius:4px;font-size:0.8rem">🔄 ${t('rotation') || 'Rotation'}: ${currentRotations.frontier}/${ROTATION_MAX.frontier}</span>
                    <span style="padding:4px 10px;background:var(--bg-card);border-radius:4px;font-size:0.8rem">⭐ ${t('division') || 'Division'}: ${division.name}</span>
                </div>
            </div>
        `;
    } else {
        frontierContainer.innerHTML = `<p style="color:var(--text-dim)">${t('noActiveFrontier')}</p>`;
    }
}

function renderSeasonalCard(a) {
    const seasonIcon = a.season === 'halloween' ? '🎃' : '🎄';
    const seasonColor = a.season === 'halloween' ? '#ff6600' : '#00ff88';
    // Check if season is currently active based on parsed dates
    let isActive = false;
    if (a.seasonDates) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const s = a.seasonDates.start, e = a.seasonDates.end;
        if (s.month <= e.month) {
            isActive = (month > s.month || (month === s.month && day >= s.day)) && (month < e.month || (month === e.month && day <= e.day));
        } else {
            isActive = (month > s.month || (month === s.month && day >= s.day)) || (month < e.month || (month === e.month && day <= e.day));
        }
    }
    // Boss section for encounter areas with real bosses (like Spooky Encounter with Marshadow) - same design as renderEventZoneCard
    let bossSection = '';
    // Only show boss if it has moves (real boss like Marshadow), not just an encounter zone
    if (a.bossPkmn && pokemons[a.bossPkmn] && a.bossMoves && a.bossMoves.length > 0) {
        const bossPkmnData = pokemons[a.bossPkmn];
        const movesHtml = `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">${a.bossMoves.map((m, idx) => {
            const moveData = moves[m];
            if (!moveData) return '';
            const moveColor = typeColors[moveData.type] || '#666';
            const moveNum = idx + 1;
            return `<span style="padding:2px 6px;background:var(--bg-input);border-radius:3px;font-size:0.7rem;border-left:3px solid ${moveColor};cursor:pointer;display:flex;align-items:center;gap:4px" onclick="event.stopPropagation();showMovePokemon('${m}')"><span style="font-size:0.6rem;color:var(--text-dim);font-weight:700;min-width:10px;text-align:center">${moveNum}</span>${moveData.displayName || format(m)}</span>`;
        }).join('')}</div>`;
        bossSection = `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,215,0,0.1);border-radius:8px;margin-bottom:8px">
            <img src="${sprite(a.bossPkmn)}" style="width:64px;height:64px;image-rendering:pixelated;cursor:pointer" onclick="event.stopPropagation();showPokemonDetails('${a.bossPkmn}')">
            <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:var(--accent-gold)">${bossPkmnData.displayName || format(a.bossPkmn)}</div>
                ${bossPkmnData.types ? `<div class="type-badges">${bossPkmnData.types.map(t => typeBadge(t)).join('')}</div>` : ''}
                <div style="font-size:0.75rem;color:var(--text-dim)">${t('bossEncounter') || 'Boss to fight'}</div>
                ${movesHtml}
            </div>
        </div>`;
    }
    // Show unlock requirement (3 Old Gateau) if present
    const unlockSection = a.unlockDescription ? `
        <div style="margin-top:10px;padding:8px;background:rgba(148,0,211,0.1);border:1px solid rgba(148,0,211,0.3);border-radius:6px">
            <div style="font-size:0.8rem;color:var(--accent-purple)">🔒 ${a.unlockDescription}</div>
        </div>
    ` : '';
    // Build spawn sections like a wild area (common/uncommon/rare)
    const spawnSections = [];
    if (a.spawns?.common?.length) {
        spawnSections.push(`<div class="spawn-tier"><div class="spawn-tier-label common">${t('common')}</div><div class="spawn-list">${a.spawns.common.map(p => `<div class="spawn-item" onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>`);
    }
    if (a.spawns?.uncommon?.length) {
        spawnSections.push(`<div class="spawn-tier"><div class="spawn-tier-label uncommon">${t('uncommon')}</div><div class="spawn-list">${a.spawns.uncommon.map(p => `<div class="spawn-item" onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>`);
    }
    if (a.spawns?.rare?.length) {
        spawnSections.push(`<div class="spawn-tier"><div class="spawn-tier-label rare">${t('rare')}</div><div class="spawn-list">${a.spawns.rare.map(p => `<div class="spawn-item" onclick="event.stopPropagation();showPokemonDetails('${p}')"><img src="${sprite(p)}">${pokemons[p]?.displayName || format(p)}</div>`).join('')}</div></div>`);
    }
    // Difficulty badge for seasonal bosses (block display for better spacing)
    const difficultyBadge = a.difficulty > 0 ? formatDifficultyBadge(a.difficulty, true, true) : '';
    
    // Status badge: LIVE for active, INACTIVE for inactive
    const statusBadge = isActive 
        ? ` <span style="padding:1px 6px;background:rgba(0,255,136,0.2);color:#00ff88;border:1px solid rgba(0,255,136,0.4);border-radius:4px;font-size:0.65rem;font-weight:700;vertical-align:middle">LIVE</span>`
        : ` <span style="padding:1px 6px;background:rgba(136,136,170,0.2);color:var(--text-dim);border:1px solid rgba(136,136,170,0.4);border-radius:4px;font-size:0.65rem;font-weight:700;vertical-align:middle">${t('inactive') || 'INACTIVE'}</span>`;
    
    return `<div class="area-card" style="border-left:3px solid ${seasonColor};background:linear-gradient(135deg,${seasonColor}10,transparent);max-height:400px;overflow-y:auto" onclick="showAreaDetails('${a.name}')">
        <div class="area-header">
            <span class="area-name">${seasonIcon} ${a.displayName || format(a.name)}${statusBadge}</span>
            <span class="area-level">${t('level')} ${a.level}${difficultyBadge}</span>
        </div>
        ${a.seasonDates ? `<div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:4px">📅 ${a.seasonDates.start.day}/${a.seasonDates.start.month} → ${a.seasonDates.end.day}/${a.seasonDates.end.month}</div>` : ''}
        ${bossSection}
        ${spawnSections.length ? `<div class="area-spawns">${spawnSections.join('')}</div>` : ''}
        ${unlockSection}
    </div>`;
}