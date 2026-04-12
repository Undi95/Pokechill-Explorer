// ============ GENETICS ============
function initGeneticsDropdowns() {
    const sorted = Object.values(pokemons).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    const options = sorted.map(p => `<option value="${p.name}">${p.displayName || format(p.name)}</option>`).join('');
    
    // Genetics selects
    const hostSelect = document.getElementById('genetics-host-select');
    const sampleSelect = document.getElementById('genetics-sample-select');
    if (hostSelect) hostSelect.innerHTML = `<option value="">${t('selectHost')}</option>` + options;
    if (sampleSelect) sampleSelect.innerHTML = `<option value="">${t('selectSample')}</option>` + options;
    
    // Team search select - use filterTeamDropdown to initialize
    filterTeamDropdown('team');
    filterTeamDropdown('build');
    
    // Compare search select
    const compareSelect = document.getElementById('compare-search');
    if (compareSelect) compareSelect.innerHTML = `<option value="">-- ${t('pokemon')} --</option>` + options;
}

function initDataLists() {
    // Pokemon datalist
    const pkmnDatalist = document.getElementById('pkmn-datalist');
    if (pkmnDatalist) {
        const sorted = Object.values(pokemons).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
        pkmnDatalist.innerHTML = sorted.map(p => `<option value="${p.displayName || p.name}">`).join('');
    }
    
    // Ability datalist
    const abilityDatalist = document.getElementById('ability-datalist');
    if (abilityDatalist) {
        const sorted = Object.values(abilities).sort((a, b) => a.displayName.localeCompare(b.displayName));
        abilityDatalist.innerHTML = sorted.map(a => `<option value="${a.displayName}">`).join('');
    }
    
    // Move datalist
    const moveDatalist = document.getElementById('move-datalist');
    if (moveDatalist) {
        const sorted = Object.values(moves).sort((a, b) => a.displayName.localeCompare(b.displayName));
        moveDatalist.innerHTML = sorted.map(m => `<option value="${m.displayName}">`).join('');
    }
    
    // Item datalist (includes ingredients)
    const itemDatalist = document.getElementById('item-datalist');
    if (itemDatalist) {
        const itemNames = Object.values(items).sort((a, b) => a.displayName.localeCompare(b.displayName)).map(i => i.displayName);
        const ingredientNames = Object.values(GAME_CONFIG.INGREDIENTS || {}).map(ing => format(ing.name)).sort();
        itemDatalist.innerHTML = [...itemNames, ...ingredientNames].map(name => `<option value="${name}">`).join('');
    }
    
    // Zone datalists (filtered by type)
    const zoneTypes = { 'area-zone-datalist': 'wild', 'dungeon-zone-datalist': 'dungeon', 'event-zone-datalist': 'event', 'dimension-zone-datalist': 'dimension' };
    Object.entries(zoneTypes).forEach(([dlId, zoneType]) => {
        const dl = document.getElementById(dlId);
        if (dl) {
            const sorted = Object.values(areas).filter(a => a.type === zoneType).sort((a, b) => (a.displayName || format(a.name)).localeCompare(b.displayName || format(b.name)));
            dl.innerHTML = sorted.map(a => `<option value="${a.displayName || format(a.name)}">`).join('');
        }
    });
    
    // Shop datalist
    // Shop datalist is now dynamically updated by updateShopDatalist() based on selected category
    updateShopDatalist('');
    
    // Trainer datalist
    const trainerDatalist = document.getElementById('trainer-datalist');
    if (trainerDatalist) {
        const names = Object.keys(trainers).sort();
        trainerDatalist.innerHTML = names.map(n => `<option value="${n}">`).join('');
    }
}

function calculateGenetics() {
    const hostName = document.getElementById('genetics-host-select').value;
    const sampleName = document.getElementById('genetics-sample-select').value;
    const hasPokerus = document.getElementById('genetics-pokerus').checked;
    const sampleShiny = document.getElementById('genetics-shiny-sample').checked;
    
    // Update URL hash
    const filters = getTabFilterValues('genetics');
    updateURLHash('genetics', filters);
    
    if (!hostName || !sampleName) {
        document.getElementById('genetics-results').innerHTML = `<div class="no-results">${t('noResults')} - ${t('selectBothHostSample')}</div>`;
        return;
    }
    
    const host = pokemons[hostName];
    const sample = pokemons[sampleName];
    
    if (!host || !sample) {
        document.getElementById('genetics-results').innerHTML = `<div class="no-results">${t('pokemonNotFound')}</div>`;
        return;
    }
    
    const result = calculateCompatibility(host, sample, hasPokerus, sampleShiny);
    renderGeneticsResult(host, sample, result, hasPokerus, sampleShiny);
}

function calculateCompatibility(host, sample, hasPokerus = false, sampleShiny = false) {
    let compatibility = 1;
    const reasons = [];
    
    // Check if host can be shiny via genetics (hidden Pokemon cannot)
    const canBeShiny = !host.hidden;
    
    // Check if same evolution family
    const sameFamily = evolutionFamilies[host.name] !== undefined && 
                       evolutionFamilies[host.name] === evolutionFamilies[sample.name];
    
    if (sameFamily) {
        compatibility = 4;
        reasons.push({ text: `✨ ${t('sameFamilyBonus')}`, bonus: '=4', color: 'var(--accent-gold)', applied: true });
    } else {
        // Check shared types
        const sharedTypes = host.types.filter(tp => sample.types.includes(tp));
        if (sharedTypes.length === 2) {
            compatibility = 3;
            reasons.push({ text: `${t('sharedTypes2')} (${sharedTypes.join(', ')})`, bonus: '+2', color: 'var(--accent-green)', applied: true });
        } else if (sharedTypes.length === 1) {
            compatibility = 2;
            reasons.push({ text: `${t('sharedTypes1')} (${sharedTypes[0]})`, bonus: '+1', color: 'var(--accent-blue)', applied: true });
        } else {
            reasons.push({ text: t('noSharedTypes'), bonus: '+0', color: 'var(--text-dim)', applied: true });
        }
        
        // Ditto bonus
        if (sample.name === 'ditto') {
            compatibility++;
            reasons.push({ text: `🧬 ${t('sampleIsDitto')}`, bonus: '+1', color: 'var(--accent-pink)', applied: true });
        }
    }
    
    // Pokerus bonus (game applies pokerus BEFORE same-family override, so it has no effect when same-family)
    if (hasPokerus && !sameFamily) {
        compatibility++;
        reasons.push({ text: `🦠 ${t('pokerusActive')}`, bonus: '+1', color: 'var(--accent-pink)', applied: true });
    } else if (hasPokerus && sameFamily) {
        reasons.push({ text: `🦠 ${t('pokerusActive')}`, bonus: '+0', color: 'var(--text-dim)', applied: false, note: t('alreadyMax') || 'Already max' });
    } else {
        reasons.push({ text: t('pokerusHint'), bonus: '+1', color: 'var(--text-dim)', applied: false });
    }
    
    // Cap at 4
    compatibility = Math.min(compatibility, 4);
    
    // Calculate shiny chance (from game code)
    // Base: 1% (1/100), if sample shiny: compat 2 = 4%, compat 3 = 20%, compat 4 = 100%
    let shinyChance = 1; // 1%
    if (sampleShiny && canBeShiny) {
        if (compatibility === 2) shinyChance = 4;
        else if (compatibility === 3) shinyChance = 20;
        else if (compatibility >= 4) shinyChance = 100;
    } else if (!canBeShiny) {
        shinyChance = 0; // Cannot be shiny via genetics
    }
    
    // Power cost based on host division
    const divPowerCost = { 'D': 1, 'C': 3, 'B': 4, 'A': 5, 'S': 6, 'SS': 7, 'SSS': 8 };
    const powerCost = divPowerCost[host.division] || 1;
    const timeMinutes = powerCost * 10;
    
    // Move inheritance chance (from game code)
    const moveChanceMap = { 0: 0, 1: 5, 2: 30, 3: 50, 4: 50 };
    const moveChance = moveChanceMap[compatibility] ?? 5;
    
    // IV inheritance chance (from game code: 1/50, 1/20, 1/6.5, 1/2)
    const ivChanceMap = { 0: 0, 1: 2, 2: 5, 3: 15, 4: 50 };
    const ivChance = ivChanceMap[compatibility] ?? 2;
    
    // Max IVs inherited based on power cost (from game code warnings)
    const maxIVs = powerCost >= 8 ? 3 : powerCost >= 7 ? 4 : powerCost >= 6 ? 5 : 6;
    
    return { compatibility, reasons, powerCost, timeMinutes, sameFamily, shinyChance, canBeShiny, moveChance, ivChance, maxIVs };
}

function renderGeneticsResult(host, sample, result, hasPokerus, sampleShiny = false) {
    const compatBar = Math.min(100, ((result.compatibility - 1) / 3) * 100);
    const powerBar = (result.powerCost / 8) * 100;
    
    const compatColors = ['#ff4444', '#ff8800', '#00d4ff', '#00ff88', '#ffd700'];
    const compatColor = compatColors[Math.min(result.compatibility - 1, 4)];
    const compatLabels = [t('compatVeryLow'), t('compatLow'), t('compatMedium'), t('compatHigh'), t('compatMax')];
    const compatLabel = compatLabels[Math.min(result.compatibility - 1, 4)];
    
    // Shiny chance display
    const shinyColor = result.shinyChance >= 100 ? '#ffd700' : result.shinyChance >= 20 ? '#00ff88' : result.shinyChance >= 4 ? '#00d4ff' : '#8888aa';
    
    // Find best partners (same family)
    const familyPartners = Object.values(pokemons).filter(p => 
        p.name !== host.name && evolutionFamilies[p.name] === evolutionFamilies[host.name]
    ).slice(0, 10);

    let html = `<div class="genetics-result">
        <div class="genetics-pair">
            <div class="genetics-pkmn" onclick="showPokemonDetails('${host.name}')">
                <img src="${sprite(host.name)}" style="width:80px;height:80px">
                <div style="font-weight:700">${host.displayName || format(host.name)}</div>
                <div class="type-badges" style="justify-content:center">${host.types.map(t => typeBadge(t)).join('')}</div>
                ${divBadge(host.division)}
                <div style="color:var(--text-dim);font-size:0.8rem;margin-top:5px">🏠 ${t('host')}</div>
            </div>
            
            <div class="genetics-compat" style="text-align:center;padding:0 30px">
                <div style="font-size:3rem;font-weight:700;color:${compatColor}">${result.compatibility}</div>
                <div style="font-size:0.9rem;color:${compatColor};margin-bottom:10px">${compatLabel}</div>
                <div style="background:var(--bg-input);border-radius:10px;height:20px;overflow:hidden;margin-bottom:15px">
                    <div style="height:100%;background:${compatColor};width:${compatBar}%;transition:width 0.5s"></div>
                </div>
                
                <!-- Shiny Chance Box -->
                <div style="background:${sampleShiny ? 'rgba(255,215,0,0.15)' : 'var(--bg-input)'};border:1px solid ${sampleShiny ? 'rgba(255,215,0,0.4)' : 'var(--border)'};border-radius:8px;padding:10px;margin-bottom:10px">
                    <div style="font-size:0.75rem;color:var(--text-dim)">✨ ${t('shinyChance')}</div>
                    ${result.canBeShiny === false ? 
                        `<div style="font-size:1rem;font-weight:700;color:var(--accent-red)">❌ ${t('cannotBeShiny') || 'Cannot be Shiny'}</div>
                         <div style="font-size:0.7rem;color:var(--text-dim);font-style:italic">${t('cannotBeShinyInfo') || 'This Pokémon cannot be shiny via genetics'}</div>` :
                        `<div style="font-size:1.8rem;font-weight:700;color:${shinyColor}">${result.shinyChance}%</div>
                         ${!sampleShiny ? `<div style="font-size:0.7rem;color:var(--text-dim);font-style:italic">${t('checkShinyHint')}</div>` : ''}`
                    }
                </div>
                
                <div style="font-size:0.75rem;color:var(--text-dim)">⚡ ${t('power')}: ${result.powerCost}/8</div>
                <div style="background:var(--bg-input);border-radius:10px;height:10px;overflow:hidden;margin:5px 0">
                    <div style="height:100%;background:${result.powerCost >= 6 ? 'coral' : 'rgb(229, 143, 255)'};width:${powerBar}%"></div>
                </div>
                <div style="font-size:0.75rem;color:var(--text-dim)">⏱️ ${Math.floor(result.timeMinutes/60)}h ${result.timeMinutes%60}m</div>
                
                <!-- Move & IV Chances -->
                <div style="display:flex;gap:8px;margin-top:10px">
                    <div style="flex:1;background:var(--bg-input);border-radius:8px;padding:8px;border:1px solid var(--border)">
                        <div style="font-size:0.65rem;color:var(--text-dim)" title="${t('moveChanceDesc')}">🎯 ${t('moveChance')}</div>
                        <div style="font-size:1.2rem;font-weight:700;color:${result.moveChance >= 50 ? '#00ff88' : result.moveChance >= 30 ? '#00d4ff' : result.moveChance >= 5 ? '#ff8800' : '#ff4444'}">${result.moveChance}%</div>
                    </div>
                    <div style="flex:1;background:var(--bg-input);border-radius:8px;padding:8px;border:1px solid var(--border)">
                        <div style="font-size:0.65rem;color:var(--text-dim)" title="${t('ivChanceDesc')}">🧬 ${t('ivChance')}</div>
                        <div style="font-size:1.2rem;font-weight:700;color:${result.ivChance >= 50 ? '#00ff88' : result.ivChance >= 15 ? '#00d4ff' : result.ivChance >= 5 ? '#ff8800' : '#ff4444'}">${result.ivChance}%</div>
                    </div>
                </div>
                ${result.maxIVs < 6 ? `<div style="margin-top:8px;padding:6px 8px;background:rgba(255,100,50,0.15);border:1px solid rgba(255,100,50,0.3);border-radius:6px;font-size:0.7rem;color:coral">${result.powerCost === 6 ? t('powerWarning6') : result.powerCost === 7 ? t('powerWarning7') : t('powerWarning8')}<br><span style="font-weight:700">${t('maxIVsInherited')}: ${result.maxIVs}/6 ${t('perStat')}</span></div>` : ''}
            </div>
            
            <div class="genetics-pkmn" onclick="showPokemonDetails('${sample.name}')">
                <img src="${sampleShiny ? spriteShiny(sample.name) : sprite(sample.name)}" style="width:80px;height:80px" onerror="this.src='${sprite(sample.name)}'">
                <div style="font-weight:700">${sample.displayName || format(sample.name)} ${sampleShiny ? '✨' : ''}</div>
                <div class="type-badges" style="justify-content:center">${sample.types.map(t => typeBadge(t)).join('')}</div>
                ${divBadge(sample.division)}
                <div style="color:var(--text-dim);font-size:0.8rem;margin-top:5px">🧪 ${t('sample')}</div>
            </div>
        </div>
        
        ${familyPartners.length > 0 ? `<div style="margin-top:15px;padding:12px;background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.2);border-radius:8px"><div style="font-weight:700;margin-bottom:8px">👨‍👩‍👧 ${t('sameFamilyPartners')}</div>
            <div class="pkmn-grid">${familyPartners.map(p => `<div class="pkmn-mini" style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3)" onclick="document.getElementById('genetics-sample-select').value='${p.name}';calculateGenetics()">
                <img src="${sprite(p.name)}"><div class="pkmn-mini-name">${p.displayName || format(p.name)}</div>
            </div>`).join('')}</div>
        </div>` : ''}
        
        <div class="genetics-breakdown" style="margin-top:20px;padding:15px;background:var(--bg-input);border-radius:8px">
            <div style="font-weight:700;margin-bottom:10px">📊 ${t('compatBreakdown')}</div>
            ${result.reasons.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 0;${!r.applied ? 'opacity:0.5;font-style:italic' : ''}">
                <span style="color:${r.color}">${r.text}${r.note ? ` <span style="font-size:0.75rem">(${r.note})</span>` : ''}</span>
                <span style="font-weight:700;color:${r.color}">${r.bonus}</span>
            </div>`).join('')}
        </div>
        
        <!-- Shiny Chance Breakdown -->
        <div style="margin-top:15px;padding:15px;background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.2);border-radius:8px">
            <div style="font-weight:700;margin-bottom:10px;color:var(--accent-gold)">✨ ${t('shinyBreakdown')}</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;text-align:center">
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;${!sampleShiny ? 'border:2px solid var(--accent-gold)' : ''}">
                    <div style="font-size:0.7rem;color:var(--text-dim)">${t('base')}</div>
                    <div style="font-size:1.2rem;font-weight:700;color:#8888aa">1%</div>
                </div>
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;${sampleShiny && result.compatibility === 2 ? 'border:2px solid var(--accent-gold)' : ''}">
                    <div style="font-size:0.7rem;color:var(--text-dim)">${t('shinyCompat')} 2</div>
                    <div style="font-size:1.2rem;font-weight:700;color:#00d4ff">4%</div>
                </div>
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;${sampleShiny && result.compatibility === 3 ? 'border:2px solid var(--accent-gold)' : ''}">
                    <div style="font-size:0.7rem;color:var(--text-dim)">${t('shinyCompat')} 3</div>
                    <div style="font-size:1.2rem;font-weight:700;color:#00ff88">20%</div>
                </div>
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;${sampleShiny && result.compatibility >= 4 ? 'border:2px solid var(--accent-gold)' : ''}">
                    <div style="font-size:0.7rem;color:var(--text-dim)">${t('shinyCompat')} 4</div>
                    <div style="font-size:1.2rem;font-weight:700;color:#ffd700">100%</div>
                </div>
            </div>
        </div>
        
        <!-- Comprehensive Reference Table -->
        <div style="margin-top:15px;padding:15px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.2);border-radius:8px">
            <div style="font-weight:700;margin-bottom:10px;color:var(--accent-blue)">${t('refTableTitle')}</div>
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:0.8rem;text-align:center">
                    <thead><tr style="border-bottom:1px solid var(--border)">
                        <th style="padding:6px;color:var(--text-dim)">${t('refTableCompat')}</th>
                        <th style="padding:6px;color:var(--text-dim)">🎯 ${t('moveChance')}</th>
                        <th style="padding:6px;color:var(--text-dim)">🧬 ${t('ivChance')}</th>
                        <th style="padding:6px;color:var(--text-dim)">✨ ${t('shinyChance')}</th>
                    </tr></thead>
                    <tbody>
                        ${[0,1,2,3,4].map(c => {
                            const mc = {0:0,1:5,2:30,3:50,4:50}[c];
                            const ic = {0:0,1:2,2:5,3:15,4:50}[c];
                            const sc = {0:1,1:1,2:4,3:20,4:100}[c];
                            const active = c === result.compatibility;
                            return `<tr style="${active ? 'background:rgba(0,212,255,0.1);font-weight:700' : ''}">
                                <td style="padding:6px;border-bottom:1px solid rgba(42,42,74,0.5);color:${active ? 'var(--accent-blue)' : 'var(--text-main)'}">${c}${c === 0 ? ' ✗' : c === 4 ? ' ★' : ''}</td>
                                <td style="padding:6px;border-bottom:1px solid rgba(42,42,74,0.5);color:${mc >= 50 ? '#00ff88' : mc >= 30 ? '#00d4ff' : mc >= 5 ? '#ff8800' : '#ff4444'}">${mc}%</td>
                                <td style="padding:6px;border-bottom:1px solid rgba(42,42,74,0.5);color:${ic >= 50 ? '#00ff88' : ic >= 15 ? '#00d4ff' : ic >= 5 ? '#ff8800' : '#ff4444'}">${ic}%</td>
                                <td style="padding:6px;border-bottom:1px solid rgba(42,42,74,0.5);color:${sc >= 100 ? '#ffd700' : sc >= 20 ? '#00ff88' : sc >= 4 ? '#00d4ff' : '#8888aa'}">${sc}%*</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                <div style="font-size:0.65rem;color:var(--text-dim);margin-top:6px;font-style:italic">* ${t('shinyChance')}: ${t('base')} 1% • ${t('shinyCompat')} ≥2 ${t('sampleShiny')} ✨</div>
            </div>
        </div>
        
        <!-- Genetics Items Info -->
        <div style="margin-top:15px;padding:15px;background:rgba(170,85,255,0.05);border:1px solid rgba(170,85,255,0.2);border-radius:8px">
            <div style="font-weight:700;margin-bottom:8px;color:#aa55ff">${t('geneticsItemsTitle')}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:10px">${t('geneticsItemsDesc')}</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;display:flex;gap:8px;align-items:center">
                    <img src="https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main/img/items/destinyKnot.png" style="width:32px;height:32px;image-rendering:pixelated" onerror="this.style.display='none'">
                    <div><div style="font-weight:600;font-size:0.8rem">Destiny Knot</div><div style="font-size:0.7rem;color:var(--text-dim)">${t('destinyKnotEffect')}</div></div>
                </div>
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;display:flex;gap:8px;align-items:center">
                    <img src="https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main/img/items/everstone.png" style="width:32px;height:32px;image-rendering:pixelated" onerror="this.style.display='none'">
                    <div><div style="font-weight:600;font-size:0.8rem">Everstone</div><div style="font-size:0.7rem;color:var(--text-dim)">${t('everstoneEffect')}</div></div>
                </div>
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;display:flex;gap:8px;align-items:center">
                    <img src="https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main/img/items/lockCapsule.png" style="width:32px;height:32px;image-rendering:pixelated" onerror="this.style.display='none'">
                    <div><div style="font-weight:600;font-size:0.8rem">Lock Capsule</div><div style="font-size:0.7rem;color:var(--text-dim)">${t('lockCapsuleEffect')}</div></div>
                </div>
                <div style="padding:8px;background:var(--bg-input);border-radius:6px;display:flex;gap:8px;align-items:center">
                    <span style="font-size:1.5rem">💪</span>
                    <div><div style="font-weight:600;font-size:0.8rem">Power Items</div><div style="font-size:0.7rem;color:var(--text-dim)">${t('powerItemEffect')}</div></div>
                </div>
            </div>
        </div>
        
        <!-- Random IV Increase + Level Reset Warning -->
        <div style="margin-top:15px;padding:12px;background:rgba(255,165,0,0.05);border:1px solid rgba(255,165,0,0.2);border-radius:8px;font-size:0.8rem">
            <div style="font-weight:700;margin-bottom:6px;color:#ffa500">${t('randomIvTitle')}</div>
            <div style="color:var(--text-dim);line-height:1.4">${t('randomIvDesc')}</div>
            <div style="margin-top:8px;padding:6px 8px;background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.2);border-radius:4px;color:coral;font-size:0.75rem">${t('hostLevelReset')}</div>
        </div>
        
        <div style="margin-top:20px">
            <ul style="color:var(--text-dim);font-size:0.9rem;padding-left:20px">
                <li>${t('useDitto')}</li>
                <li>${t('sameFamily')}</li>
                <li>${t('checkPokerus')}</li>
                <li>${t('useShiny')}</li>
                <li>${t('higherDiv')}</li>
            </ul>
        </div>
    </div>`;
    
    document.getElementById('genetics-results').innerHTML = html;
}