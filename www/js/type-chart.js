// ============ TYPE CHART ============
// Type effectiveness data from explore.js (lines 2796-2834)
const TYPE_CHART = {
    normal:  { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:    { fire: 0.5, water: 0.5, grass: 1.5, ice: 1.5, bug: 1.5, rock: 0.5, dragon: 0.5, steel: 1.5 },
    water:   { fire: 1.5, water: 0.5, grass: 0.5, ground: 1.5, rock: 1.5, dragon: 0.5 },
    electric:{ water: 1.5, electric: 0.5, grass: 0.5, ground: 0, flying: 1.5, dragon: 0.5 },
    grass:   { fire: 0.5, water: 1.5, grass: 0.5, poison: 0.5, ground: 1.5, flying: 0.5, bug: 0.5, rock: 1.5, dragon: 0.5, steel: 0.5 },
    ice:     { fire: 0.5, water: 0.5, grass: 1.5, ice: 0.5, ground: 1.5, flying: 1.5, dragon: 1.5, steel: 0.5 },
    fighting:{ normal: 1.5, ice: 1.5, rock: 1.5, dark: 1.5, steel: 1.5, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
    poison:  { grass: 1.5, fairy: 1.5, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
    ground:  { fire: 1.5, electric: 1.5, grass: 0.5, poison: 1.5, flying: 0, bug: 0.5, rock: 1.5, steel: 1.5 },
    flying:  { electric: 0.5, grass: 1.5, fighting: 1.5, bug: 1.5, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 1.5, poison: 1.5, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:     { fire: 0.5, grass: 1.5, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 1.5, ghost: 0.5, dark: 1.5, steel: 0.5, fairy: 0.5 },
    rock:    { fire: 1.5, ice: 1.5, fighting: 0.5, ground: 0.5, flying: 1.5, bug: 1.5, steel: 0.5 },
    ghost:   { normal: 0, psychic: 1.5, ghost: 1.5, dark: 0.5 },
    dragon:  { dragon: 1.5, steel: 0.5, fairy: 0 },
    dark:    { fighting: 0.5, psychic: 1.5, ghost: 1.5, dark: 0.5, fairy: 0.5 },
    steel:   { fire: 0.5, water: 0.5, electric: 0.5, ice: 1.5, rock: 1.5, steel: 0.5, fairy: 1.5 },
    fairy:   { fire: 0.5, fighting: 1.5, poison: 0.5, dragon: 1.5, dark: 1.5, steel: 0.5 }
};

let isTypeChartInverted = false;

function getEffectiveness(attacking, defending) {
    const chart = TYPE_CHART[attacking];
    if (!chart) return 1;
    let eff = chart[defending] ?? 1;
    
    // Inverser la logique si activé
    if (isTypeChartInverted) {
        if (eff === 1.5) eff = 0.5;      // Super efficace -> Résisté
        else if (eff === 0.5) eff = 1.5; // Résisté -> Super efficace
        else if (eff === 0) eff = 1.5;   // Immunisé -> Super efficace
    }
    
    return eff;
}

function getEffectivenessAgainstTypes(attacking, defendingTypes, thirdType = null) {
    // Check if thirdType already exists in defendingTypes (per game logic: if type already exists, temporalType does nothing)
    const type3AlreadyExists = thirdType && defendingTypes && defendingTypes.includes(thirdType);
    const effectiveThirdType = type3AlreadyExists ? null : thirdType;
    
    let total = 1;
    for (const defType of defendingTypes) {
        let eff = getEffectiveness(attacking, defType);
        // 3rd type effectiveness is reduced: 1.5→1.25, 0.5→0.75
        if (effectiveThirdType && defType === effectiveThirdType) {
            if (eff === 1.5) eff = 1.25;
            else if (eff === 0.5) eff = 0.75;
            // Immunities (0) stay 0
        }
        total *= eff;
    }
    return total;
}

function toggle3TypesMode() {
    const enabled = document.getElementById('types-3mode')?.checked;
    document.getElementById('type3-selector').style.display = enabled ? 'block' : 'none';
    document.getElementById('highlight-group').style.display = enabled ? 'none' : 'block';
    renderTypeChart();
}

function renderTypeChart() {
    const container = document.getElementById('types-results');
    if (!container) return;
    
    const viewMode = document.getElementById('types-view-mode')?.value || 'full';
    const highlightType = document.getElementById('types-highlight')?.value || '';
    const mode3Enabled = document.getElementById('types-3mode')?.checked;
    isTypeChartInverted = document.getElementById('types-inverted')?.checked || false;
    
    const types = TYPES.length > 0 ? TYPES : ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
    
    // Get 3-type selection
    const type1 = document.getElementById('types-type1')?.value || '';
    const type2 = document.getElementById('types-type2')?.value || '';
    let type3 = document.getElementById('types-type3')?.value || '';
    
    // Check if type3 already exists (per game logic: if type already exists, temporalType does nothing)
    const existingTypes = [type1, type2].filter(t => t);
    const type3AlreadyExists = type3 && existingTypes.includes(type3);
    
    // Update warning display
    const type3Warning = document.getElementById('types-type3-warning');
    if (type3Warning) {
        type3Warning.style.display = type3AlreadyExists ? 'block' : 'none';
    }
    
    if (type3AlreadyExists) {
        type3 = ''; // Treat as no type3 if already present
    }
    
    const selectedTypes = [type1, type2, type3].filter(t => t);
    
    // Update URL hash
    updateURLHash('types', { 
        mode3: mode3Enabled ? '1' : '0', 
        view: viewMode, 
        highlight: highlightType,
        type1, type2, type3,
        inverted: isTypeChartInverted ? '1' : '0'
    });
    
    let html = '<div style="overflow-x:auto">';
    
    if (viewMode === 'full') {
        if (mode3Enabled && selectedTypes.length > 0) {
            // 3-type mode - show effectiveness against the selected type combination
            html += '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;text-align:center">';
            html += `<thead><tr><th style="padding:8px;background:var(--bg-card);border:1px solid var(--border)">${t('attackingType') || 'Attacking Type'}</th><th style="padding:8px;background:var(--bg-card);border:1px solid var(--border)">${t('effectiveness') || 'Effectiveness'}</th><th style="padding:8px;background:var(--bg-card);border:1px solid var(--border)">${t('result') || 'Result'}</th></tr></thead><tbody>`;
            
            types.forEach(atk => {
                const eff = getEffectivenessAgainstTypes(atk, selectedTypes, type3);
                let bg = 'var(--bg-input)';
                let color = 'var(--text-main)';
                let text = eff.toFixed(2);
                
                if (eff > 1) { bg = 'rgba(0,255,136,0.25)'; color = '#00ff88'; }
                else if (eff < 1 && eff > 0) { bg = 'rgba(255,68,68,0.25)'; color = '#ff6666'; }
                else if (eff === 0) { bg = 'rgba(136,136,170,0.3)'; color = '#8888aa'; }
                
                html += `<tr>`;
                html += `<td style="padding:8px;background:${typeColors[atk]};color:${atk === 'electric' || atk === 'ice' || atk === 'steel' || atk === 'ground' || atk === 'normal' ? '#333' : '#fff'};border:1px solid var(--border);font-weight:700">${atk.charAt(0).toUpperCase() + atk.slice(1)}</td>`;
                html += `<td style="padding:8px;background:${bg};color:${color};border:1px solid var(--border);font-weight:700;font-size:1.1rem">${text}</td>`;
                html += `<td style="padding:8px;border:1px solid var(--border);color:var(--text-dim);font-size:0.8rem">${eff > 1 ? t('superEffective').split('(')[0] : eff < 1 && eff > 0 ? t('notVeryEffective').split('(')[0] : eff === 0 ? t('noEffect').split('(')[0] : t('normalEffect').split('(')[0]}</td>`;
                html += '</tr>';
            });
            html += '</tbody></table>';
        } else {
            // Standard full type chart matrix
            html += '<table style="width:100%;border-collapse:collapse;font-size:0.75rem;text-align:center">';
            html += '<thead><tr><th style="padding:6px;background:var(--bg-card);border:1px solid var(--border);position:sticky;left:0;z-index:10">ATK \\ DEF</th>';
            types.forEach(t => {
                const isHighlighted = t === highlightType;
                html += `<th style="padding:6px;background:${typeColors[t]};color:${t === 'electric' || t === 'ice' || t === 'steel' || t === 'ground' || t === 'normal' ? '#333' : '#fff'};border:1px solid var(--border);min-width:45px;${isHighlighted ? 'box-shadow:inset 0 0 0 3px var(--accent-gold)' : ''}">${t.charAt(0).toUpperCase() + t.slice(1,3)}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            types.forEach(atk => {
                const isHighlighted = atk === highlightType;
                html += `<tr>`;
                html += `<th style="padding:6px;background:${typeColors[atk]};color:${atk === 'electric' || atk === 'ice' || atk === 'steel' || atk === 'ground' || atk === 'normal' ? '#333' : '#fff'};border:1px solid var(--border);position:sticky;left:0;z-index:5;${isHighlighted ? 'box-shadow:inset 0 0 0 3px var(--accent-gold)' : ''}">${atk.charAt(0).toUpperCase() + atk.slice(1,3)}</th>`;
                
                types.forEach(def => {
                    const eff = getEffectiveness(atk, def);
                    let bg = 'var(--bg-input)';
                    let color = 'var(--text-main)';
                    let text = '1';
                    
                    if (eff === 1.5) { bg = 'rgba(0,255,136,0.25)'; color = '#00ff88'; text = '1.5'; }
                    else if (eff === 0.5) { bg = 'rgba(255,68,68,0.25)'; color = '#ff6666'; text = '0.5'; }
                    else if (eff === 0) { bg = 'rgba(136,136,170,0.3)'; color = '#8888aa'; text = '0'; }
                    
                    const isHighlightedCell = highlightType && (atk === highlightType || def === highlightType);
                    const opacity = highlightType && !isHighlightedCell ? 'opacity:0.3' : '';
                    
                    html += `<td style="padding:4px;background:${bg};color:${color};border:1px solid var(--border);font-weight:700;${opacity}">${text}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
        }
    } else if (viewMode === 'defense') {
        if (mode3Enabled && selectedTypes.length > 0) {
            // 3-type defensive view
            const weaknesses = [];
            const resistances = [];
            const immunities = [];
            
            types.forEach(atkType => {
                const eff = getEffectivenessAgainstTypes(atkType, selectedTypes, type3);
                if (eff > 1) weaknesses.push({ type: atkType, eff });
                else if (eff < 1 && eff > 0) resistances.push({ type: atkType, eff });
                else if (eff === 0) immunities.push(atkType);
            });
            
            weaknesses.sort((a, b) => b.eff - a.eff);
            resistances.sort((a, b) => a.eff - b.eff);
            
            html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:20px">`;
            html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px"><span style="font-size:2rem">⚔️</span><div><div style="font-size:1.3rem;font-weight:700;color:var(--accent-gold)">${t('tripleTypeDefense') || 'Triple Type Defense'}</div><div style="color:var(--text-dim)">${selectedTypes.map(t => typeBadge(t)).join(' ')}</div></div></div>`;
            
            if (weaknesses.length > 0) {
                html += `<div style="margin-bottom:15px"><div style="font-size:0.85rem;color:var(--accent-red);margin-bottom:8px">⚠️ ${t('weaknesses') || 'Weaknesses'} (${weaknesses.length}):</div><div style="display:flex;flex-wrap:wrap;gap:6px">${weaknesses.map(w => `<span style="background:rgba(255,68,68,0.15);border:1px solid rgba(255,68,68,0.4);border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:6px">${typeBadge(w.type)}<span style="color:#ff8888;font-weight:700">x${w.eff.toFixed(2)}</span></span>`).join('')}</div></div>`;
            }
            if (resistances.length > 0) {
                html += `<div style="margin-bottom:15px"><div style="font-size:0.85rem;color:var(--accent-green);margin-bottom:8px">🛡️ ${t('resistances') || 'Resistances'} (${resistances.length}):</div><div style="display:flex;flex-wrap:wrap;gap:6px">${resistances.map(r => `<span style="background:rgba(0,255,136,0.15);border:1px solid rgba(0,255,136,0.4);border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:6px">${typeBadge(r.type)}<span style="color:#88ffaa;font-weight:700">x${r.eff.toFixed(2)}</span></span>`).join('')}</div></div>`;
            }
            if (immunities.length > 0) {
                html += `<div><div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:8px">🚫 ${t('immunities') || 'Immunities'}:</div><div style="display:flex;flex-wrap:wrap;gap:6px">${immunities.map(t => typeBadge(t)).join('')}</div></div>`;
            }
            html += '</div>';
        } else {
            // Standard defensive view
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px">';
            types.forEach(defType => {
                if (highlightType && defType !== highlightType) return;
                
                const weaknesses = [];
                const resistances = [];
                const immunities = [];
                
                types.forEach(atkType => {
                    const eff = getEffectiveness(atkType, defType);
                    if (eff === 1.5) weaknesses.push(atkType);
                    else if (eff === 0.5) resistances.push(atkType);
                    else if (eff === 0) immunities.push(atkType);
                });
                
                html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;border-left:4px solid ${typeColors[defType]}">`;
                html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="type-badge type-${defType}">${defType}</span><strong style="font-size:1.1rem">${defType.charAt(0).toUpperCase() + defType.slice(1)}</strong></div>`;
                
                if (weaknesses.length > 0) {
                    html += `<div style="margin-bottom:8px"><span style="font-size:0.75rem;color:var(--accent-red)">${t('weakTo') || 'Weak to'} (x1.5):</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${weaknesses.map(t => typeBadge(t)).join('')}</div></div>`;
                }
                if (resistances.length > 0) {
                    html += `<div style="margin-bottom:8px"><span style="font-size:0.75rem;color:var(--accent-green)">${t('resists') || 'Resists'} (x0.5):</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${resistances.map(t => typeBadge(t)).join('')}</div></div>`;
                }
                if (immunities.length > 0) {
                    html += `<div><span style="font-size:0.75rem;color:var(--text-dim)">${t('immuneTo') || 'Immune to'} (x0):</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${immunities.map(t => typeBadge(t)).join('')}</div></div>`;
                }
                html += '</div>';
            });
            html += '</div>';
        }
    } else if (viewMode === 'attack') {
        // Offensive view - show what each type is super effective against
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px">';
        types.forEach(atkType => {
            if (highlightType && atkType !== highlightType) return;
            
            const superEffective = [];
            const notVeryEffective = [];
            const noEffect = [];
            
            types.forEach(defType => {
                const eff = getEffectiveness(atkType, defType);
                if (eff === 1.5) superEffective.push(defType);
                else if (eff === 0.5) notVeryEffective.push(defType);
                else if (eff === 0) noEffect.push(defType);
            });
            
            html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;border-left:4px solid ${typeColors[atkType]}">`;
            html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="type-badge type-${atkType}">${atkType}</span><strong style="font-size:1.1rem">${atkType.charAt(0).toUpperCase() + atkType.slice(1)}</strong></div>`;
            
            if (superEffective.length > 0) {
                html += `<div style="margin-bottom:8px"><span style="font-size:0.75rem;color:var(--accent-green)">${t('superEffective')}</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${superEffective.map(t => typeBadge(t)).join('')}</div></div>`;
            }
            if (notVeryEffective.length > 0) {
                html += `<div style="margin-bottom:8px"><span style="font-size:0.75rem;color:var(--accent-red)">${t('notVeryEffective')}</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${notVeryEffective.map(t => typeBadge(t)).join('')}</div></div>`;
            }
            if (noEffect.length > 0) {
                html += `<div><span style="font-size:0.75rem;color:var(--text-dim)">${t('noEffect')}</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${noEffect.map(t => typeBadge(t)).join('')}</div></div>`;
            }
            html += '</div>';
        });
        html += '</div>';
    } else if (viewMode === 'addtype') {
        // Type-Adding Moves view - shows moves that add a temporal type
        const addTypeMoves = Object.values(moves).filter(m => m.temporalType);
        
        if (addTypeMoves.length === 0) {
            html += `<div class="no-results">${t('noTypeAddingMoves')}</div>`;
        } else {
            html += `<div style="margin-bottom:15px;padding:12px;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(148,0,211,0.1));border:1px solid var(--accent-gold);border-radius:10px">`;
            html += `<div style="font-size:0.9rem;color:var(--text-dim)">${t('typeAddingMovesDesc')}</div>`;
            html += `</div>`;
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px">';
            
            addTypeMoves.forEach(m => {
                // Find Pokemon with this signature move
                const pkmnWithMove = Object.values(pokemons).filter(p => p.signature === m.name);
                
                html += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:15px;border-left:4px solid var(--accent-gold);cursor:pointer" onclick="simulateAddTypeMove('${m.name}', '${m.temporalType}')">`;
                html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">`;
                html += `<div style="font-weight:700;font-size:1.1rem;color:var(--accent-gold)">${m.displayName}</div>`;
                html += `${typeBadge(m.temporalType)}`;
                html += `</div>`;
                
                if (pkmnWithMove.length > 0) {
                    html += `<div style="margin-top:8px">`;
                    html += `<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:4px">${t('signatureOf')}:</div>`;
                    html += `<div style="display:flex;flex-wrap:wrap;gap:4px">${pkmnWithMove.slice(0,3).map(p => `<img src="${sprite(p.name)}" style="width:28px;height:28px;image-rendering:pixelated">`).join('')}${pkmnWithMove.length > 3 ? `<span style="color:var(--text-dim);font-size:0.75rem">+${pkmnWithMove.length-3}</span>` : ''}</div>`;
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            html += '</div>';
            
            // Container for simulation result
            html += `<div id="addtype-simulation" style="margin-top:20px;display:none"></div>`;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function simulateAddTypeMove(moveName, addedType) {
    const container = document.getElementById('addtype-simulation');
    if (!container) return;
    
    container.style.display = 'block';
    
    // Get current types from selectors
    const type1 = document.getElementById('types-type1')?.value || '';
    const type2 = document.getElementById('types-type2')?.value || '';
    const currentTypes = [type1, type2].filter(t => t);
    
    // Check if type already exists (per game logic: if type already exists, temporalType does nothing)
    const typeAlreadyExists = currentTypes.includes(addedType);
    
    // Simulate with added type (max 3 types)
    const simulatedTypes = [...currentTypes];
    if (!typeAlreadyExists && simulatedTypes.length < 3) {
        simulatedTypes.push(addedType);
    }
    
    const move = moves[moveName];
    
    let html = `<div style="background:var(--bg-card);border:2px solid var(--accent-gold);border-radius:12px;padding:20px">`;
    html += `<div style="font-size:1.2rem;font-weight:700;color:var(--accent-gold);margin-bottom:15px">${move?.displayName || moveName}</div>`;
    
    if (currentTypes.length === 0) {
        html += `<div style="color:var(--text-dim);margin-bottom:15px">${t('selectTypesFirst') || 'Select Type 1 and/or Type 2 first to see the simulation'}</div>`;
    } else if (typeAlreadyExists) {
        // Type already exists - show warning
        html += `<div style="margin-bottom:15px;padding:12px;background:rgba(255,136,0,0.15);border:1px solid var(--accent-orange);border-radius:8px">`;
        html += `<div style="color:var(--accent-orange);font-weight:600">⚠️ ${t('thirdTypeNoEffect') || 'Type already present - no effect'}</div>`;
        html += `<div style="color:var(--text-dim);font-size:0.85rem;margin-top:4px">${t('typeAlreadyPresentDesc') || 'This Pokémon already has this type. The signature move will have no effect.'}</div>`;
        html += `</div>`;
        html += `<div style="margin-bottom:15px">`;
        html += `<div style="color:var(--text-dim);margin-bottom:8px">${t('currentTypes')}:</div>`;
        html += `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">`;
        html += `<div>${currentTypes.map(t => typeBadge(t)).join(' ')}</div>`;
        html += `</div>`;
        html += `</div>`;
    } else {
        html += `<div style="margin-bottom:15px">`;
        html += `<div style="color:var(--text-dim);margin-bottom:8px">${t('effect')}:</div>`;
        html += `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">`;
        html += `<div>${currentTypes.map(t => typeBadge(t)).join(' ')}</div>`;
        html += `<span style="color:var(--accent-gold)">+ ${typeBadge(addedType)}</span>`;
        html += `<span>=</span>`;
        html += `<div>${simulatedTypes.map(t => typeBadge(t)).join(' ')}</div>`;
        html += `</div>`;
        html += `</div>`;
        
        // Calculate changes
        const allTypes = TYPES.length > 0 ? TYPES : ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
        const changes = [];
        
        allTypes.forEach(atkType => {
            const before = getEffectivenessAgainstTypes(atkType, currentTypes, null);
            const after = getEffectivenessAgainstTypes(atkType, simulatedTypes, addedType);
            
            if (before !== after) {
                changes.push({ type: atkType, before, after, diff: after - before });
            }
        });
        
        // Sort by biggest impact
        changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
        
        if (changes.length > 0) {
            html += `<div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border)">`;
            html += `<div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:10px">${t('changes')}:</div>`;
            html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
            
            changes.slice(0, 8).forEach(c => { // Show top 8 changes
                const isWorse = c.after > c.before;
                const color = isWorse ? '#ff6666' : '#00ff88';
                const bg = isWorse ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.15)';
                const border = isWorse ? 'rgba(255,68,68,0.4)' : 'rgba(0,255,136,0.4)';
                
                html += `<span style="background:${bg};border:1px solid ${border};border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:6px">`;
                html += `${typeBadge(c.type)}`;
                html += `<span style="color:var(--text-dim);font-size:0.75rem">${c.before.toFixed(2)}→</span>`;
                html += `<span style="color:${color};font-weight:700">${c.after.toFixed(2)}</span>`;
                html += `</span>`;
            });
            
            html += `</div>`;
            html += `</div>`;
        }
    }
    
    html += `</div>`;
    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Render type chart when tab is clicked
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.dataset.tab === 'types' && dataLoaded) {
            renderTypeChart();
        }
        if (tab.dataset.tab === 'frontier' && dataLoaded) {
            populateFrontierPokemon();
            // Check which subtab is active and populate accordingly
            const towerContent = document.getElementById('frontier-tower-content');
            const factoryContent = document.getElementById('frontier-factory-content');
            const arenaContent = document.getElementById('frontier-arena-content');
            if (towerContent && towerContent.style.display !== 'none') {
                populateTowerRotations();
            } else if (factoryContent && factoryContent.style.display !== 'none') {
                populateFactoryRotations();
            } else if (arenaContent && arenaContent.style.display !== 'none') {
                populateArenaTrainers();
            }
        }
    });
});

window.addEventListener('load', async () => {
     // console.log('PokeChill Explorer loading...');
    
    // Register Service Worker for background notifications
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
             // console.log('Service Worker registered:', registration);
        } catch (err) {
             // console.log('Service Worker registration failed:', err);
        }
    }
    if (typeof applyI18n === 'function') applyI18n();
    loadData(false).catch(err => {
         // console.error('Failed to load:', err);
        document.getElementById('loading-error').textContent = t('error') + ': ' + err.message;
        document.getElementById('loading-error').style.display = 'block';
    });
    
    // Initialize rotation notifications if enabled
    const notifPref = (localStorage.getItem('pokechill_rotation_notifications') === 'enabled') || await loadUserPreference('rotation_notifications', false);
    if (notifPref) {
        if (typeof startRotationNotifications === 'function') if (typeof startRotationNotifications === 'function') startRotationNotifications();
    }
    if (typeof updateNotificationButton === 'function') await updateNotificationButton();
});