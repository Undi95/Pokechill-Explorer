function parseGameConstants(moveDict, pkmnDict, areasDict, exploreContent) {
    // T4_BASE from moveDictionary
    const t4m = moveDict.match(/const\s+t4Base\s*=\s*(\d+)/);
    if (t4m) T4_BASE = parseInt(t4m[1]);
    
    // DEMERIT_BP from moveDictionary (for moves like Draco Meteor, Outrage)
    const dbp = moveDict.match(/const\s+demeritBp\s*=\s*(\d+)/);
    if (dbp) DEMERIT_BP = parseInt(dbp[1]);
    
    // Evolution levels from pkmnDictionary
    const el1 = pkmnDict.match(/const\s+evolutionLevel1\s*=\s*(\d+)/);
    const el2 = pkmnDict.match(/const\s+evolutionLevel2\s*=\s*(\d+)/);
    const el3 = pkmnDict.match(/const\s+evolutionLevel3\s*=\s*(\d+)/);
    if (el1) EVOLUTION_LEVELS[1] = parseInt(el1[1]);
    if (el2) EVOLUTION_LEVELS[2] = parseInt(el2[1]);
    if (el3) EVOLUTION_LEVELS[3] = parseInt(el3[1]);
    
    // Rotation max values from areasDictionary
    const rwm = areasDict.match(/const\s+rotationWildMax\s*=\s*(\d+)/);
    const rdm = areasDict.match(/const\s+rotationDungeonMax\s*=\s*(\d+)/);
    const rem = areasDict.match(/const\s+rotationEventMax\s*=\s*(\d+)/);
    const rfm = areasDict.match(/const\s+rotationFrontierMax\s*=\s*(\d+)/);
    const rdim = areasDict.match(/const\s+rotationDimensionMax\s*=\s*(\d+)/);
    if (rwm) ROTATION_MAX.wild = parseInt(rwm[1]);
    if (rdm) ROTATION_MAX.dungeon = parseInt(rdm[1]);
    if (rem) ROTATION_MAX.event = parseInt(rem[1]);
    if (rfm) ROTATION_MAX.frontier = parseInt(rfm[1]);
    if (rdim) ROTATION_MAX.dimension = parseInt(rdim[1]);
    
    // Wild area levels from areasDictionary
    const wl1 = areasDict.match(/const\s+wildAreaLevel1\s*=\s*(\d+)/);
    const wl2 = areasDict.match(/const\s+wildAreaLevel2\s*=\s*(\d+)/);
    const wl3 = areasDict.match(/const\s+wildAreaLevel3\s*=\s*(\d+)/);
    const wl4 = areasDict.match(/const\s+wildAreaLevel4\s*=\s*(\d+)/);
    const wl5 = areasDict.match(/const\s+wildAreaLevel5\s*=\s*(\d+)/);
    if (wl1) GAME_CONFIG.LEVELS.wild[1] = parseInt(wl1[1]);
    if (wl2) GAME_CONFIG.LEVELS.wild[2] = parseInt(wl2[1]);
    if (wl3) GAME_CONFIG.LEVELS.wild[3] = parseInt(wl3[1]);
    if (wl4) GAME_CONFIG.LEVELS.wild[4] = parseInt(wl4[1]);
    if (wl5) GAME_CONFIG.LEVELS.wild[5] = parseInt(wl5[1]);
    
    // Dungeon levels
    const dl1 = areasDict.match(/const\s+dungeonLevel1\s*=\s*(\d+)/);
    const dl2 = areasDict.match(/const\s+dungeonLevel2\s*=\s*(\d+)/);
    const dl3 = areasDict.match(/const\s+dungeonLevel3\s*=\s*(\d+)/);
    const dl4 = areasDict.match(/const\s+dungeonLevel4\s*=\s*(\d+)/);
    if (dl1) GAME_CONFIG.LEVELS.dungeon[1] = parseInt(dl1[1]);
    if (dl2) GAME_CONFIG.LEVELS.dungeon[2] = parseInt(dl2[1]);
    if (dl3) GAME_CONFIG.LEVELS.dungeon[3] = parseInt(dl3[1]);
    if (dl4) GAME_CONFIG.LEVELS.dungeon[4] = parseInt(dl4[1]);
    
    // Difficulty tiers from areasDictionary
    const td1 = areasDict.match(/const\s+tier1difficulty\s*=\s*(\d+)/);
    const td2 = areasDict.match(/const\s+tier2difficulty\s*=\s*(\d+)/);
    const td3 = areasDict.match(/const\s+tier3difficulty\s*=\s*(\d+)/);
    const td4 = areasDict.match(/const\s+tier4difficulty\s*=\s*(\d+)/);
    if (td1) GAME_CONFIG.DIFFICULTIES[1] = parseInt(td1[1]);
    if (td2) GAME_CONFIG.DIFFICULTIES[2] = parseInt(td2[1]);
    if (td3) GAME_CONFIG.DIFFICULTIES[3] = parseInt(td3[1]);
    if (td4) GAME_CONFIG.DIFFICULTIES[4] = parseInt(td4[1]);
    
    // Event names from explore.js
    if (exploreContent) {
        const eventRx = /rotationEventCurrent\s*==\s*(\d+)\)\s*eventTitle\s*=\s*`([^`]+)`/g;
        let em; const parsedEvents = {};
        while ((em = eventRx.exec(exploreContent)) !== null) {
            parsedEvents[parseInt(em[1])] = em[2];
        }
        if (Object.keys(parsedEvents).length > 0) EVENT_NAMES = parsedEvents;
    }
    
    // Egg moves from explore.js
    if (exploreContent) {
        const eggMovesMatch = exploreContent.match(/explore\.eggMoves\s*=\s*\[([^\]]*)\]/);
        if (eggMovesMatch) {
            const eggMoveNames = eggMovesMatch[1].match(/["'](\w+)["']/g);
            if (eggMoveNames) {
                GAME_CONFIG.EGG_MOVES = eggMoveNames.map(m => m.replace(/["']/g, ''));
            }
        }
    }
    
    // Star Signs from explore.js (v4.7)
    if (exploreContent) {
        // Find the starsign object by counting braces
        const starSignStart = exploreContent.indexOf('const starsign = {');
        if (starSignStart !== -1) {
            let braceCount = 1;
            let endIdx = starSignStart + 'const starsign = {'.length;
            while (braceCount > 0 && endIdx < exploreContent.length) {
                if (exploreContent[endIdx] === '{') braceCount++;
                else if (exploreContent[endIdx] === '}') braceCount--;
                endIdx++;
            }
            const starSignContent = exploreContent.substring(starSignStart + 'const starsign = {'.length, endIdx - 1);
            const starSignEntries = {};
            const ssRx = /(\w+)\s*:\s*\{[^}]*hue:\s*(\d+)/g;
            let ssMatch;
            while ((ssMatch = ssRx.exec(starSignContent)) !== null) {
                starSignEntries[ssMatch[1]] = { hue: parseInt(ssMatch[2]) };
            }
            if (Object.keys(starSignEntries).length > 0) {
                GAME_CONFIG.STAR_SIGNS = starSignEntries;
            }
        }
    }
    
    // Mark GAME_CONFIG as having loaded constants
    GAME_CONFIG.constantsLoaded = true;
}

function cleanInfoText(text) {
    return text
        .replace(/\$\{tagBurn\}/g, 'Burn')
        .replace(/\$\{tagFreeze\}/g, 'Freeze')
        .replace(/\$\{tagParalysis\}/g, 'Paralysis')
        .replace(/\$\{tagPoisoned\}/g, 'Poison')
        .replace(/\$\{tagSleep\}/g, 'Sleep')
        .replace(/\$\{tagConfused\}/g, 'Confusion')
        .replace(/\$\{tagSunny\}/g, 'Sunny')
        .replace(/\$\{tagRainy\}/g, 'Rainy')
        .replace(/\$\{tagSandstorm\}/g, 'Sandstorm')
        .replace(/\$\{tagHail\}/g, 'Hail')
        .replace(/\$\{tagFoggy\}/g, 'Foggy')
        .replace(/\$\{tagElectricTerrain\}/g, 'Electric Terrain')
        .replace(/\$\{tagGrassyTerrain\}/g, 'Grassy Terrain')
        .replace(/\$\{tagMistyTerrain\}/g, 'Misty Terrain')
        .replace(/\$\{tagPsychicTerrain\}/g, 'Psychic Terrain')
        .replace(/\$\{tagSafeguard\}/g, 'Safeguard')
        .replace(/\$\{tagSafeguardBattle\}/g, 'Safeguard')
        .replace(/\$\{tagReflect\}/g, 'Reflect')
        .replace(/\$\{tagLightScreen\}/g, 'Light Screen')
        .replace(/\$\{tagWeirdRoom\}/g, 'Weird Room')
        .replace(/\$\{tagCrossRoom\}/g, 'Cross Room')
        .replace(/\$\{tagTrickRoom\}/g, 'Trick Room')
        .replace(/\$\{tagTailwind\}/g, 'Tailwind')
        .replace(/\s*\(\$\{[^}]+\}\)/g, '')
        .replace(/\$\{[^}]+\}/g, '');
}
function parseAbilities(c) {
    const r = {}; const rx = /ability\.(\w+)\s*=\s*\{/g; let m;
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        // Parse type - if no type, this is an HA-only ability
        const tm = b.match(/type:\s*\[([^\]]+)\]/);
        const ty = tm ? tm[1].replace(/["'`]/g, '').split(',').map(x => x.trim()).filter(x => x) : [];
        const hasType = tm !== null && ty.length > 0;
        const rm = b.match(/rarity:\s*(\d)/); const rr = rm ? parseInt(rm[1]) : 1;
        const nm = b.match(/rename:\s*[`"']([^`"']+)[`"']/); const rn = nm ? nm[1] : null;
        let i = ''; 
        // Try backticks first (can contain quotes inside)
        const imBacktick = b.match(/return\s*`([^`]+)`/);
        if (imBacktick) i = cleanInfoText(imBacktick[1]);
        else {
            // Fallback to regular quotes
            const im = b.match(/return\s*["']([^"']+)["']/);
            if (im) i = cleanInfoText(im[1]);
        }
        // Fix incomplete weather info (e.g., "Changes the weather to ${tagXXX}")
        if (i.includes('${tag') && hasWeatherChange) {
            const weatherMatch = b.match(/changeWeather\(["'](\w+)["']\)/);
            if (weatherMatch) {
                const weatherName = weatherMatch[1];
                // Capitalize first letter
                const displayWeather = weatherName.charAt(0).toUpperCase() + weatherName.slice(1);
                i = `Changes the weather to ${displayWeather}`;
            }
        }
        // Parse nerf property (for abilities with reduced effect in non-hidden slot)
        let nerf = null;
        const nerfBacktick = b.match(/nerf:\s*`([^`]+)`/);
        const nerfSingle = b.match(/nerf:\s*'([^']+)'/);
        const nerfDouble = b.match(/nerf:\s*"([^"]+)"/);
        if (nerfBacktick) nerf = cleanInfoText(nerfBacktick[1]);
        else if (nerfSingle) nerf = cleanInfoText(nerfSingle[1]);
        else if (nerfDouble) nerf = cleanInfoText(nerfDouble[1]);
        const displayName = format(n, rn);
        // Detect transferable nerf dynamically from nerf text content
        // Abilities with transferable nerfs mention "non-HA", "memory", or "transfer" in their nerf description
        const nerfTextLower = (nerf || '').toLowerCase();
        const hasTransferableNerf = nerfTextLower.includes('non-ha') || 
                                    nerfTextLower.includes('memory') ||
                                    nerfTextLower.includes('transfer') ||
                                    nerfTextLower.includes('when slotted as a non-hidden ability');
        r[n] = { name: n, displayName, types: ty, rarity: rr, rename: rn, info: i, nerf, hasType, hasTransferableNerf, searchText: searchText(n, rn) };
    }
    return r;
}

function parseMoves(c) {
    const r = {}; const rx = /move\.(\w+)\s*=\s*\{/g; let m;
    const foundTypes = new Set();
    const addableTypes = new Set();
    const defAsAtkMoves = new Set();
    
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        const tm = b.match(/type:\s*["'`](\w+)["'`]/); const ty = tm ? tm[1] : 'normal';
        
        // Collect type for dynamic TYPES array
        if (ty) foundTypes.add(ty);
        
        // Parse info text FIRST (needed for split detection and auto-categorization)
        let i = '';
        // Try template literals first (can contain ${...} expressions)
        const imBacktick = b.match(/return\s*`([\s\S]*?)`/);
        if (imBacktick) i = cleanInfoText(imBacktick[1]);
        else {
            // Fallback to regular quotes
            const im = b.match(/return\s*["']([^"']+)["']/);
            if (im) i = cleanInfoText(im[1]);
        }
        
        // Fix incomplete weather info (e.g., "Changes the weather to ${tagXXX}")
        if (i.includes('${tag')) {
            const weatherMatch = b.match(/changeWeather\(["'](\w+)["']\)/);
            if (weatherMatch) {
                const weatherName = weatherMatch[1];
                // Capitalize first letter
                const displayWeather = weatherName.charAt(0).toUpperCase() + weatherName.slice(1);
                i = `Changes the weather to ${displayWeather}`;
            }
        }
        
        // Parse split
        const sm = b.match(/split:\s*["'`](\w+)["'`]/); let sp = sm ? sm[1] : null;
        
        // Handle power expressions (direct numbers, t4Base, demeritBp, and expressions)
        let pw = 0;
        let hasExplicitPower = false;
        const pmDirect = b.match(/power:\s*(\d+)/);
        // Improved t4Base regex to handle various spacing: t4Base+60, t4Base + 60, t4Base*1.5, t4Base * 1.5
        const pmT4 = b.match(/power:\s*t4Base\s*([+\-*/])?\s*([\d.]+)?/i);
        // Handle complex expressions like (t4Base+30)/3
        const pmComplex = b.match(/power:\s*\([^)]+\)\s*([+\-*/])?\s*([\d.]+)?/);
        // demeritBp constant with optional operation: demeritBp+50
        const pmDemerit = b.match(/power:\s*demeritBp\s*([+\-*/])?\s*([\d.]+)?/i);
        if (pmDirect) { 
            pw = parseInt(pmDirect[1]); 
            // Only consider it an offensive power if power > 0
            // power: 0 means no damage (status/stats move)
            hasExplicitPower = pw > 0;
        }
        else if (pmT4) {
            pw = T4_BASE;
            hasExplicitPower = true;
            if (pmT4[1] && pmT4[2]) {
                const op = pmT4[1], val = parseFloat(pmT4[2]);
                if (op === '+') pw = T4_BASE + val;
                else if (op === '-') pw = T4_BASE - val;
                else if (op === '*') pw = Math.round(T4_BASE * val);
                else if (op === '/') pw = Math.round(T4_BASE / val);
            }
            // If only t4Base found (no operator), power stays as T4_BASE
        }
        else if (pmComplex) {
            // Complex expression like (t4Base+30)/3
            // Parse and calculate properly
            const expr = pmComplex[0];
            const innerMatch = expr.match(/\(([^)]+)\)\s*([+\-*/])?\s*([\d.]+)?/);
            if (innerMatch) {
                const inner = innerMatch[1]; // e.g., "t4Base+30"
                const outerOp = innerMatch[2]; // e.g., "/"
                const outerVal = parseFloat(innerMatch[3]) || 1; // e.g., "3"
                
                // Parse inner expression (t4Base + value)
                const innerT4Match = inner.match(/t4Base\s*([+\-])?\s*([\d.]+)?/i);
                if (innerT4Match) {
                    let baseVal = T4_BASE;
                    if (innerT4Match[1] && innerT4Match[2]) {
                        const innerOp = innerT4Match[1];
                        const innerVal = parseFloat(innerT4Match[2]);
                        if (innerOp === '+') baseVal = T4_BASE + innerVal;
                        else if (innerOp === '-') baseVal = T4_BASE - innerVal;
                    }
                    // Apply outer operation
                    if (outerOp === '/') pw = Math.round(baseVal / outerVal);
                    else if (outerOp === '*') pw = Math.round(baseVal * outerVal);
                    else pw = baseVal;
                } else {
                    pw = T4_BASE; // Fallback
                }
            } else {
                pw = T4_BASE; // Fallback
            }
            hasExplicitPower = true;
        }
        else if (pmDemerit) {
            pw = DEMERIT_BP;
            hasExplicitPower = true;
            if (pmDemerit[1] && pmDemerit[2]) {
                const op = pmDemerit[1], val = parseFloat(pmDemerit[2]);
                if (op === '+') pw = DEMERIT_BP + val;
                else if (op === '-') pw = DEMERIT_BP - val;
                else if (op === '*') pw = Math.round(DEMERIT_BP * val);
                else if (op === '/') pw = Math.round(DEMERIT_BP / val);
            }
        }
        
        // If no explicit split, determine from move info
        if (!sp && i) {
            const infoLower = i.toLowerCase();
            // Check info for clues about being special
            if (/special\s+attack|decreases\s+special\s+attack|sp\.\s*atk|special\s+damage/i.test(infoLower)) {
                sp = 'special';
            } else {
                sp = 'physical';
            }
        }
        // Default to physical if still no split
        if (!sp) sp = 'physical';
        
        const rm = b.match(/rarity:\s*(\d)/); 
        const hasRarity = rm !== null;
        const rr = rm ? parseInt(rm[1]) : 0;

        // Parse timer (attack speed modifier)
        let timer = null;
        const timerM = b.match(/timer:\s*([^,\n]+)/);
        if (timerM) {
            // Parse expressions like defaultPlayerMoveTimer/1.2 or defaultPlayerMoveTimer*1.5
            const timerExpr = timerM[1].trim();
            if (timerExpr.includes('/3')) timer = 'extremelyFast';
            else if (timerExpr.includes('/2')) timer = 'veryFast';
            else if (timerExpr.includes('/1.5')) timer = 'veryFast';
            else if (timerExpr.includes('/1.2')) timer = 'fast';
            else if (timerExpr.includes('*1.2')) timer = 'slow';
            else if (timerExpr.includes('*1.4')) timer = 'verySlow';
            else if (timerExpr.includes('*1.5')) timer = 'verySlow';
            else if (timerExpr.includes('*2')) timer = 'verySlow';
            else timer = 'normal';
        }
        
        // Parse buildup (for stacking moves like Fury Cutter)
        const buildupM = b.match(/buildup:\s*(\d+)/);
        const buildup = buildupM ? parseInt(buildupM[1]) : null;
        
        // Parse notUsableByEnemy flag
        const notUsableByEnemyM = b.match(/notUsableByEnemy:\s*(true)/);
        const notUsableByEnemy = notUsableByEnemyM ? true : false;
        
        // Parse powerMod (for moves with dynamic power like Facade, Body Press)
        const powerModM = b.match(/powerMod\s*:\s*function/);
        const hasPowerMod = powerModM ? true : false;

        const nm = b.match(/rename:\s*[`"']([^`"']+)[`"']/); const rn = nm ? nm[1] : null;
        let mh = null; const mm = b.match(/multihit:\s*\[(\d+)\s*,\s*(\d+)\]/); if (mm) mh = [parseInt(mm[1]), parseInt(mm[2])];
        // Moveset determines which types can learn this move
        // If no rarity = signature move (only learnable via signature property)
        // Check for moveset - determines which types can learn this move
        const msm = b.match(/moveset:\s*\[([^\]]+)\]/); 
        const hasMoveset = msm !== null;
        let ms = [];
        if (hasMoveset) {
            ms = msm[1].replace(/["'`]/g, '').split(',').map(x => x.trim()).filter(x => x);
        }
        // A move is signature if it has NO rarity OR NO moveset (signatures can't be learned normally)
        const isSignature = !hasRarity || !hasMoveset;
        
        // Auto-categorize 0-power moves into stats, status or weather
        // Only if they don't have explicit power defined
        if (pw === 0 && !hasExplicitPower && i) {
            const infoLower = i.toLowerCase();
            // Weather moves: change the weather
            const weatherPatterns = ['weather', 'sunny', 'rain', 'sandstorm', 'hail', 'snow'];
            // Status moves: inflict status conditions (poison, paralysis, sleep, burn, freeze, flinch, confusion, etc.)
            const statusPatterns = ['inflict', 'poison', 'paralysis', 'paralyz', 'sleep', 'burn', 'freeze', 'flinch', 'confus', 'trap', 'bind', 'wrap', 'leech'];
            // Stats moves: modify stats (attack, defense, speed, special attack, special defense, evasion, accuracy)
            const statsPatterns = ['increase', 'decrease', 'attack by', 'defense by', 'speed by', 'special attack', 'special defense', 'evasion', 'accuracy', 'boost', 'lower', 'raise', 'stat'];
            
            const isWeather = weatherPatterns.some(p => infoLower.includes(p));
            const isStatus = statusPatterns.some(p => infoLower.includes(p));
            const isStats = statsPatterns.some(p => infoLower.includes(p));
            
            if (isWeather) sp = 'weather';
            else if (isStats && !isStatus) sp = 'stats';
            else if (isStatus || pw === 0) sp = 'status'; // Default 0-power non-stats moves to status
        }
        
        const displayName = format(n, rn);
        // Parse restricted, affectedBy, unaffectedBy, buildup
        const isRestricted = /restricted:\s*true/.test(b);
        const affectedByM = b.match(/affectedBy:\s*\[([^\]]+)\]/);
        const affectedBy = affectedByM ? affectedByM[1].match(/ability\.(\w+)/g)?.map(a => a.replace('ability.', '').replace('.id', '')) || [] : [];
        const unaffectedByM = b.match(/unaffectedBy:\s*\[([^\]]+)\]/);
        const unaffectedBy = unaffectedByM ? unaffectedByM[1].match(/ability\.(\w+)/g)?.map(a => a.replace('ability.', '').replace('.id', '')) || [] : [];
        // Parse buildup multiplier from powerMod: Math.pow(X, this.buildup)
        const buildupMultM = b.match(/Math\.pow\(([\d.]+)\s*,\s*this\.buildup\)/);
        const buildupMult = buildupMultM ? parseFloat(buildupMultM[1]) : null;
        // Parse buildup max from hitEffect: this.buildup<N
        const buildupMaxM = b.match(/this\.buildup\s*<\s*(\d+)/);
        const buildupMax = buildupMaxM ? parseInt(buildupMaxM[1]) : null;
        // Parse hitEffect (secondary effect)
        const hasHitEffect = b.includes('hitEffect:');
        // Check if hitEffect changes weather (for Clima Tact)
        const hasWeatherChange = /changeWeather/.test(b);
        // Parse temporalType (moves that add a type temporarily)
        // Format: pkmn[saved.currentPkmn].temporalType = [`type`]
        // Also check hitEffect for temporalType assignment
        const temporalTypeM = b.match(/temporalType\s*=\s*\[[\s`'"]*(\w+)[\s`'"]*\]/) || b.match(/temporalType.*?=.*?\[?\s*["'](\w+)["']\s*\]?/);
        const temporalType = temporalTypeM ? temporalTypeM[1] : null;
        if (temporalType) addableTypes.add(temporalType);
        
        // Detect moves that use defense as attack (bodyPress-like logic in game code)
        // Pattern: useDefAsAtk: true or saved.currentDef/saved.currentSdef instead of currentAtk/currentSatk
        const usesDefAsAtk = /useDefAsAtk:\s*true/.test(b) || 
                            /saved\.currentDef\s*\*/.test(b) || 
                            /saved\.currentSdef\s*\*/.test(b) ||
                            /getPlayerDef/.test(b);
        if (usesDefAsAtk) defAsAtkMoves.add(n);
        
        r[n] = { name: n, displayName, type: ty, split: sp, power: pw, rarity: rr, timer, buildup, buildupMult: buildupMult, buildupMax: buildupMax, notUsableByEnemy, hasPowerMod, temporalType, rename: rn, moveset: ms, info: i, multihit: mh, affectedBy, unaffectedBy, isSignature, hasRarity, restricted: isRestricted, hasWeatherChange, hasHitEffect, searchText: searchText(n, rn) };
    }
    
    // Update GAME_CONFIG with discovered types and special moves
    if (foundTypes.size > 0) {
        GAME_CONFIG.TYPES = [...foundTypes].sort();
        TYPES = GAME_CONFIG.TYPES; // Backward compatibility
    }
    if (addableTypes.size > 0) {
        GAME_CONFIG.ADDABLE_TYPES = [...addableTypes].sort();
    }
    if (defAsAtkMoves.size > 0) {
        GAME_CONFIG.DEF_AS_ATK_MOVES = [...defAsAtkMoves];
    }
    
    // Apply auto-ability effects (same logic as in moveDictionary.js)
    for (const moveName in r) {
        const m = r[moveName];
        
        // Ensure affectedBy is an array (handle empty array case)
        if (!m.affectedBy || m.affectedBy.length === 0) {
            m.affectedBy = [];
        }
        
        // Technician: moves with power <= 60 (and > 0)
        if (m.power && m.power > 0 && m.power <= 60 && !m.affectedBy.includes('technician')) {
            m.affectedBy.push('technician');
        }
        
        // Sheer Force: moves with hitEffect, power>0, no buildup, not in unaffectedBy
        if (m.power && m.power > 0 && m.hasHitEffect && !m.buildup && 
            !(m.unaffectedBy && m.unaffectedBy.includes('sheerForce')) && 
            !m.affectedBy.includes('sheerForce')) {
            m.affectedBy.push('sheerForce');
        }
        
        // Serene Grace: moves with hitEffect that have RNG (random chance)
        // In moveDictionary.js: move[i].hitEffect?.toString().includes('rng(')
        // Only applies to damaging moves with secondary effects that have a % chance
        // EXCLUDES: stat-boosting moves (Dragon Dance, Swords Dance), guaranteed effects
        if (m.hasHitEffect && m.info && m.info.includes('%') && !m.affectedBy.includes('sereneGrace')) {
            // Check if it's a stat-boosting move (Dragon Dance, Swords Dance, etc.)
            const isStatBoostMove = m.info.match(/(Raises|Lowers|Increases|Decreases|Boosts)\s+(Attack|Defense|Sp\.\s*Atk|Sp\.\s*Def|Speed)/i);
            
            // Check if it's a guaranteed effect (100% without damage)
            const isGuaranteedEffect = m.info.includes('100%') && !m.info.match(/\d+\s+damage/i);
            
            // Check if it has an actual RNG/chance effect (not just stat boosts)
            const hasChanceEffect = m.info.match(/\d+%\s+chance/i) || m.info.match(/may|might|rng/i);
            
            // Only add Serene Grace if it has a chance effect and is not just stat boosts
            if (hasChanceEffect && !isStatBoostMove && !isGuaranteedEffect) {
                m.affectedBy.push('sereneGrace');
            }
        }
        
        // Clima Tact: moves that change weather
        if (m.hasWeatherChange && !m.affectedBy.includes('climaTact')) {
            m.affectedBy.push('climaTact');
        }
        
        // Skill Link: multihit moves with variable hits (max > min)
        if (m.multihit && m.multihit[1] > m.multihit[0] && !m.affectedBy.includes('skillLink')) {
            m.affectedBy.push('skillLink');
        }
        
        // Reckless: slow moves (timer is 'slow' or 'verySlow')
        if ((m.timer === 'slow' || m.timer === 'verySlow') && !m.affectedBy.includes('reckless')) {
            m.affectedBy.push('reckless');
        }
        
        // Libero: fast moves (timer is 'fast', 'veryFast', or 'extremelyFast') avec power > 0
        // Note: Me First (power 0) n'est PAS affecté par Libero
        if ((m.timer === 'fast' || m.timer === 'veryFast' || m.timer === 'extremelyFast') && m.power > 0 && !m.affectedBy.includes('libero')) {
            m.affectedBy.push('libero');
        }
        
        // Iaido: moves that are affected by sharpness are also affected by iaido (reduces timer)
        if (m.affectedBy.includes('sharpness') && !m.affectedBy.includes('iaido')) {
            m.affectedBy.push('iaido');
        }
    }
    
    return r;
}

function parsePokemon(c) {
    const r = {}; const rx = /pkmn\.(\w+)\s*=\s*\{/g; let m;
    const secretPokemon = new Set();
    const eventForms = new Set();
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        let ty = []; const tm = b.match(/type:\s*\[([^\]]+)\]/); if (tm) ty = tm[1].replace(/["'`]/g, '').split(',').map(x => x.trim()).filter(x => x);
        const bst = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
        const hp = b.match(/hp:\s*(\d+)/); if (hp) bst.hp = parseInt(hp[1]);
        const atk = b.match(/atk:\s*(\d+)/); if (atk) bst.atk = parseInt(atk[1]);
        const def = b.match(/def:\s*(\d+)/); if (def) bst.def = parseInt(def[1]);
        const satk = b.match(/satk:\s*(\d+)/); if (satk) bst.satk = parseInt(satk[1]);
        const sdef = b.match(/sdef:\s*(\d+)/); if (sdef) bst.sdef = parseInt(sdef[1]);
        const spe = b.match(/spe:\s*(\d+)/); if (spe) bst.spe = parseInt(spe[1]);
        let ha = ''; const hm = b.match(/hiddenAbility:\s*ability\.(\w+)/); if (hm) ha = hm[1];
        let sig = ''; const sigm = b.match(/signature\s*:\s*move\.(\w+)/); if (sigm) { sig = sigm[1]; signatureMoves.add(sig); }
        // Parse egg move (new in v3.8)
        let eggMove = ''; const eggm = b.match(/eggMove\s*:\s*move\.(\w+)/); if (eggm) eggMove = eggm[1];
        // Parse float property (for floating animation)
        const floatM = b.match(/float:\s*(true|false)/);
        const float = floatM ? floatM[1] === 'true' : false;
        // Parse rename
        const nm = b.match(/rename:\s*[`"']([^`"']+)[`"']/); const rn = nm ? nm[1] : null;
        // Parse evolution targets
        const evolves = []; const evoRx = /pkmn\.(\w+)/g; let evoM;
        const evoBlock = b.match(/evolve\s*:\s*function[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
        if (evoBlock) { while ((evoM = evoRx.exec(evoBlock[1])) !== null) evolves.push(evoM[1]); }
        // Check if hidden (secret Pokemon like MissingNo, F00, GHOST)
        const isHidden = b.includes('hidden:') && b.match(/hidden:\s*true/);
        if (isHidden) secretPokemon.add(n);
        // Check if event form (Pokemon with eventForm: true)
        const isEventForm = b.includes('eventForm:') && b.match(/eventForm:\s*true/);
        if (isEventForm) eventForms.add(n);
        // Parse lore text - handle backticks, single quotes, and double quotes
        let lore = null;
        const loreBacktick = b.match(/lore:\s*`([^`]+)`/);
        const loreSingle = b.match(/lore:\s*'([^']+)'/);
        const loreDouble = b.match(/lore:\s*"([^"]+)"/);
        if (loreBacktick) lore = loreBacktick[1];
        else if (loreSingle) lore = loreSingle[1];
        else if (loreDouble) lore = loreDouble[1];
        if (ty.length > 0) {
            const div = getDivision(bst);
            const total = bst.hp + bst.atk + bst.def + bst.satk + bst.sdef + bst.spe;
            const displayName = format(n, rn);
            r[n] = { name: n, displayName, rename: rn, types: ty, bst, hiddenAbility: ha, signature: sig, eggMove, float, division: div, totalBST: total, stars: getTotalStars(bst), evolves, hidden: isHidden, isEventForm, lore, obtainability: null, searchText: searchText(n, rn) };
        }
    }
    
    // Update GAME_CONFIG with discovered special Pokemon
    if (secretPokemon.size > 0) GAME_CONFIG.SECRET_POKEMON = [...secretPokemon];
    if (eventForms.size > 0) GAME_CONFIG.EVENT_FORMS = [...eventForms];
    
    return r;
}

function parseItems(c) {
    const r = {}; const rx = /item\.(\w+)\s*=\s*\{/g; let m;
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        // Use larger window for mega detection (template strings break brace counting)
        const largeBlock = c.substring(m.index, Math.min(m.index + 2000, c.length));
        // Parse type first
        const tm = b.match(/type:\s*["'`](\w+)["'`]/); let ty = tm ? tm[1] : '';
        // Handle decor type - decor items are handled separately but also added to items for search
        const isDecor = ty === 'decor';
        if (isDecor) {
            // For decor items, add a flag and continue parsing normally
        }
        // Parse item properties first (before evo/mega detection)
        const isGenetics = /genetics:\s*true/.test(b);
        const isVitamin = /vitamin:\s*true/.test(b);
        const isUsable = /usable:\s*true/.test(b);
        const isHiddenItem = /hidden:\s*true/.test(b);
        // Detect evolution items via evo: true - use proper block first, largeBlock only for mega stones
        const isEvo = !isGenetics && !isVitamin && /evo\s*:\s*true/.test(b);
        // Detect mega stones (reference pkmn.mega - uses largeBlock because template strings break brace counting)
        const isMega = isEvo && /pkmn\.mega/.test(largeBlock);
        // If mega stone, set type to mega
        if (isMega) ty = 'mega';
        // If item has evo: true and no type, mark it as evolution type
        else if (isEvo && ty === '') ty = 'evo';
        const nm = b.match(/rename:\s*[`"']([^`"']+)[`"']/); const rn = nm ? nm[1] : null;
        let i = ''; const im = b.match(/return\s*[`"']([^`"']+)[`"']/); if (im) i = cleanInfoText(im[1]);
        let isTM = false, moveInfo = null, tmType = null;
        if (n.endsWith('Tm')) { isTM = true; const moveName = n.slice(0, -2); if (moves[moveName]) { moveInfo = moves[moveName]; tmType = moveInfo.type; } }
        // Parse ability for Memory items
        let abilityName = null;
        let memoryImage = null;
        let memoryTypings = null;
        if (n.endsWith('Memory')) {
            const abilityMatch = b.match(/ability:\s*(\w+)/);
            if (abilityMatch) abilityName = abilityMatch[1];
            else abilityName = n.slice(0, -6);
            ty = 'memory';
            // Parse typings for memories (e.g., typings: ["fighting"])
            const typingsMatch = b.match(/typings\s*:\s*\[([^\]]+)\]/);
            if (typingsMatch) {
                memoryTypings = typingsMatch[1].match(/["'`](\w+)["'`]/g)?.map(t => t.replace(/["'`]/g, '')) || [];
            }
            // Parse explicit image property (e.g., image: 'justified')
            const imageMatch = b.match(/image:\s*[`"'](\w+)[`"']/);
            memoryImage = imageMatch ? imageMatch[1] : null;
        }
        const displayName = format(n, rn);
        // Parse remaining item properties
        const rotationM = b.match(/rotation:\s*(\d+)/);
        const itemRotation = rotationM ? parseInt(rotationM[1]) : null;
        const eventM = b.match(/event:\s*[`"'](\w+)[`"']/);
        const itemEvent = eventM ? eventM[1] : null;
        
        // Parse sort property (for held items: "gem" or "berry")
        const sortM = b.match(/sort:\s*["'](\w+)["']/);
        const sort = sortM ? sortM[1] : null;
        
        // Parse zType property (for Z-Crystals)
        const zTypeM = b.match(/zType:\s*[`"'](\w+)[`"']/);
        const zType = zTypeM ? zTypeM[1] : null;
        
        // Parse mega stone properties
        const heldBonusPowerM = b.match(/heldBonusPower:\s*function/);
        const hasHeldBonusPower = heldBonusPowerM ? true : false;
        
        const heldBonusPkmnM = b.match(/heldBonusPkmn:\s*function\(\)\s*\{\s*return\s+pkmn\.(\w+)/);
        const heldBonusPkmn = heldBonusPkmnM ? heldBonusPkmnM[1] : null;
        
        // Parse subtitle (for type-specific held items like "(Fighting)")
        const subtitleM = b.match(/subtitle:\s*[`"']\(([^)]+)\)[`"']/);
        const subtitle = subtitleM ? subtitleM[1] : null;
        
        // Parse itemToUse flag
        const itemToUseM = b.match(/itemToUse:\s*true/);
        const itemToUse = itemToUseM ? true : false;
        
        // Parse power function (for scaling held items)
        const hasPowerFunctionM = b.match(/power\s*:\s*function/);
        const hasPowerFunction = hasPowerFunctionM ? true : false;
        
        // Parse permanent flag (for shop items that are always available)
        const permanentM = b.match(/permanent:\s*(true|false)/);
        const isPermanent = permanentM ? permanentM[1] === 'true' : false;
        
        // Parse rarity (for memories: common, rare, white)
        const rarityM = b.match(/rarity:\s*["'](\w+)["']/);
        const rarity = rarityM ? rarityM[1] : null;
        
        r[n] = { name: n, displayName, type: ty, isEvo, isDecor: ty === 'decor', rename: rn, info: i, isTM, moveInfo, tmType, ability: abilityName, memoryImage, memoryTypings, isGenetics, isVitamin, isUsable, isHiddenItem, itemRotation, itemEvent, sort, zType, hasHeldBonusPower, heldBonusPkmn, subtitle, itemToUse, hasPowerFunction, isPermanent, rarity, searchText: searchText(n, rn) };
    }
    return r;
}

function parseAreas(c) {
    const r = {}; const tr = {};
    
    // Parse wildAreaLevel constants (use GAME_CONFIG defaults if available)
    const levelVars = { wildAreaLevel1: GAME_CONFIG.LEVELS.wild[1] || 10, wildAreaLevel2: GAME_CONFIG.LEVELS.wild[2] || 30, wildAreaLevel3: GAME_CONFIG.LEVELS.wild[3] || 50, wildAreaLevel4: GAME_CONFIG.LEVELS.wild[4] || 70, wildAreaLevel5: GAME_CONFIG.LEVELS.wild[5] || 90 };
    const lvRx = /const\s+(wildAreaLevel\d)\s*=\s*(\d+)/g;
    let lvm;
    while ((lvm = lvRx.exec(c)) !== null) {
        levelVars[lvm[1]] = parseInt(lvm[2]);
    }

    // Parse tierXdifficulty constants (use GAME_CONFIG defaults if available)
    const difficultyVars = { tier1difficulty: GAME_CONFIG.DIFFICULTIES[1] || 25, tier2difficulty: GAME_CONFIG.DIFFICULTIES[2] || 70, tier3difficulty: GAME_CONFIG.DIFFICULTIES[3] || 200, tier4difficulty: GAME_CONFIG.DIFFICULTIES[4] || 600 };
    const diffRx = /const\s+(tier\d+difficulty)\s*=\s*(\d+)/g;
    let dvm;
    while ((dvm = diffRx.exec(c)) !== null) {
        difficultyVars[dvm[1]] = parseInt(dvm[2]);
    }
    
    // Parse wildRareItems variables
    const wildItems = {};
    const varRx = /const\s+(wildRareItems\w+)\s*=\s*\[([^\]]+)\]/g;
    let vm;
    while ((vm = varRx.exec(c)) !== null) {
        const varName = vm[1];
        const itemsMatch = vm[2].match(/item\.(\w+)/g);
        if (itemsMatch) wildItems[varName] = itemsMatch.map(i => i.replace('item.', ''));
    }
    
    const rx = /areas\.(\w+)\s*=\s*\{/g; let m;
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        const typem = b.match(/type:\s*[`"'](\w+)[`"']/); const aType = typem ? typem[1] : '';
        
        // Parse level - handle both wildAreaLevelX and direct numbers
        let level = 0;
        const levelm = b.match(/level\s*:\s*(wildAreaLevel\d+|\d+)/);
        if (levelm) {
            if (levelVars[levelm[1]]) level = levelVars[levelm[1]];
            else level = parseInt(levelm[1]) || 0;
        }
        
        const rotm = b.match(/rotation\s*:\s*(\d+)/); const rotation = rotm ? parseInt(rotm[1]) : 0;
        const bgm = b.match(/background\s*:\s*[`"'](\w+)[`"']/); const bg = bgm ? bgm[1] : '';
        const namem = b.match(/name:\s*[`"']([^`"']+)[`"']/); const displayName = namem ? namem[1] : format(n);
        const catm = b.match(/category\s*:\s*(\d+)/); const category = catm ? parseInt(catm[1]) : 0;
        // Parse tier (for dimension zones)
        const tierm = b.match(/tier\s*:\s*(\d+)/); const tier = tierm ? parseInt(tierm[1]) : 0;
        // Parse difficulty: handles both numeric (difficulty: 5) and variable (difficulty: tier4difficulty)
        const diffm = b.match(/difficulty\s*:\s*(\w+)/);
        let difficulty = 0;
        if (diffm) {
            if (/^\d+$/.test(diffm[1])) difficulty = parseInt(diffm[1]);
            else if (difficultyVars[diffm[1]]) difficulty = difficultyVars[diffm[1]];
        }
        const uncatchable = b.includes('uncatchable: true') || b.includes('uncatchable:true');
        // Capture unlockDescription - handle HTML content with backticks
        const unlockm = b.match(/unlockDescription\s*:\s*`([^`]+)`/); 
        let unlockDescription = unlockm ? unlockm[1] : '';
        // Fix image paths to use GitHub Pages URL (not raw.githubusercontent)
        unlockDescription = unlockDescription.replace(/src="img\//g, 'src="https://play-pokechill.github.io/img/');
        
        // Spawns
        const spawns = { common: [], uncommon: [], rare: [] };
        const spawnsSection = b.match(/spawns:\s*\{([^}]+)\}/s);
        if (spawnsSection) {
            const ss = spawnsSection[1];
            const commonm = ss.match(/common\s*:\s*\[([^\]]+)\]/);
            if (commonm) { const pm = commonm[1].match(/pkmn\.(\w+)/g); if (pm) spawns.common = pm.map(p => p.replace('pkmn.', '')); }
            const uncommonm = ss.match(/uncommon\s*:\s*\[([^\]]+)\]/);
            if (uncommonm) { const pm = uncommonm[1].match(/pkmn\.(\w+)/g); if (pm) spawns.uncommon = pm.map(p => p.replace('pkmn.', '')); }
            const rarem = ss.match(/rare\s*:\s*\[([^\]]+)\]/);
            if (rarem) { const pm = rarem[1].match(/pkmn\.(\w+)/g); if (pm) spawns.rare = pm.map(p => p.replace('pkmn.', '')); }
        }
        
        // Drops
        const drops = { common: [], uncommon: [], rare: [] };
        const dropSection = b.match(/drops:\s*\{([^}]+)\}/s);
        if (dropSection) {
            const ds = dropSection[1];
            const dc = ds.match(/common\s*:\s*\[([^\]]+)\]/);
            if (dc) { const im = dc[1].match(/item\.(\w+)/g); if (im) drops.common = im.map(i => i.replace('item.', '')).filter(i => i !== 'nothing' && i !== 'mysteryEgg'); }
            const duVar = ds.match(/uncommon\s*:\s*(wildRareItems\w+)/);
            if (duVar && wildItems[duVar[1]]) { drops.uncommon = [...wildItems[duVar[1]]]; }
            else { const du = ds.match(/uncommon\s*:\s*\[([^\]]+)\]/); if (du) { const im = du[1].match(/item\.(\w+)/g); if (im) drops.uncommon = im.map(i => i.replace('item.', '')).filter(i => i !== 'nothing'); } }
            const drVar = ds.match(/rare\s*:\s*(wildRareItems\w+)/);
            if (drVar && wildItems[drVar[1]]) { drops.rare = [...wildItems[drVar[1]]]; }
            else { const dr = ds.match(/rare\s*:\s*\[([^\]]+)\]/); if (dr) { const im = dr[1].match(/item\.(\w+)/g); if (im) drops.rare = im.map(i => i.replace('item.', '')).filter(i => i !== 'nothing'); } }
        }
        
        // Event rewards (items and Pokemon)
        const rewards = { items: [], pokemon: [] };
        const rewardm = b.match(/reward\s*:\s*\[([^\]]+)\]/);
        if (rewardm) {
            const rewardContent = rewardm[1];
            const rewardItems = rewardContent.match(/item\.(\w+)/g);
            if (rewardItems) rewards.items = rewardItems.map(i => i.replace('item.', ''));
            const rewardPkmn = rewardContent.match(/pkmn\.(\w+)/g);
            if (rewardPkmn) rewards.pokemon = rewardPkmn.map(p => p.replace('pkmn.', ''));
        }
        
        // Trainer - distinguish between regular trainers (type: 'vs') and raids (trainer: true)
        const isTrainer = b.includes('trainer: true') || b.includes('trainer:true');
        const isVsType = aType === 'vs';
        if (isTrainer || isVsType) {
            const teamData = {};
            for (let slot = 1; slot <= 6; slot++) {
                const slotm = b.match(new RegExp(`slot${slot}\\s*:\\s*pkmn\\.(\\w+)`));
                if (slotm) teamData[`slot${slot}`] = slotm[1];
            }
            // Determine trainer type: 'vs' = regular trainer, 'raid' = raid
            const trainerType = isVsType ? 'vs' : 'raid';
            // Parse difficulty: handles numeric and variable names (tier1difficulty, etc.)
            const trDiffm = b.match(/difficulty\s*:\s*(\w+)/);
            let trDifficulty = 0;
            if (trDiffm) {
                if (/^\d+$/.test(trDiffm[1])) trDifficulty = parseInt(trDiffm[1]);
                else if (difficultyVars[trDiffm[1]]) trDifficulty = difficultyVars[trDiffm[1]];
            }
            // Parse boss moves for raids (slot1Moves, slot2Moves, etc.)
            const bossMoves = {};
            const movesPattern = /slot(\d+)Moves\s*:\s*\[([^\]]+)\]/g;
            let movesm;
            while ((movesm = movesPattern.exec(b)) !== null) {
                const slotNum = movesm[1];
                const moveMatches = [...movesm[2].matchAll(/move\.(\w+)\.id/g)];
                if (moveMatches.length > 0) {
                    bossMoves[`slot${slotNum}`] = moveMatches.map(m => m[1]);
                }
            }
            // Parse field effects for VS trainers
            const fieldEffectM = b.match(/fieldEffect\s*:\s*\[([^\]]+)\]/);
            const fieldEffects = fieldEffectM ? fieldEffectM[1].match(/field\.(\w+)/g)?.map(f => f.replace('field.', '')) || [] : [];
            tr[n] = { name: n, displayName, level, team: teamData, background: bg, trainerType, difficulty: trDifficulty, bossMoves, fieldEffects };
        }
        
        // Capture wild, dungeon, event, frontier, seasonal AND dimension areas
        if (aType === 'wild' || aType === 'dungeon' || aType === 'event' || aType === 'frontier' || aType === 'season' || aType === 'dimension' || aType === 'dimensionBlueprint') {
            // For frontier, parse league number as rotation
            const leaguem = b.match(/league\s*:\s*(\d+)/);
            const league = leaguem ? parseInt(leaguem[1]) : 0;
            const typingm = b.match(/typing\s*:\s*[`"'](\w+)[`"']/);
            const typing = typingm ? typingm[1] : '';
            const spritem = b.match(/sprite\s*:\s*[`"'](\w+)[`"']/);
            const trainerSprite = spritem ? spritem[1] : '';
            // Parse icon (boss/featured Pokemon)
            const iconm = b.match(/icon\s*:\s*pkmn\.(\w+)/);
            const iconPkmn = iconm ? iconm[1] : '';
            // Parse season for seasonal areas
            const seasonm = b.match(/season\s*:\s*season\.(\w+)/);
            const season = seasonm ? seasonm[1] : '';
            // Parse encounter flag for seasonal boss areas
            const encounter = b.includes('encounter:') && b.match(/encounter:\s*true/);
            // Parse field effects
            const fieldEffectM = b.match(/fieldEffect\s*:\s*\[([^\]]+)\]/);
            const fieldEffects = fieldEffectM ? fieldEffectM[1].match(/field\.(\w+)/g)?.map(f => f.replace('field.', '')) || [] : [];
            // Parse timed (seconds)
            const timedM = b.match(/timed:\s*(\d+)/);
            const timed = timedM ? parseInt(timedM[1]) : null;
            // Parse season start/end dates
            const startM = b.match(/start:\s*\{\s*month:\s*(\d+),\s*day:\s*(\d+)\s*\}/);
            const endM = b.match(/end:\s*\{\s*month:\s*(\d+),\s*day:\s*(\d+)\s*\}/);
            const seasonDates = (startM && endM) ? { start: { month: parseInt(startM[1]), day: parseInt(startM[2]) }, end: { month: parseInt(endM[1]), day: parseInt(endM[2]) } } : null;
            
            // Parse boss info (for T4 raids and seasonal bosses)
            const bossSlot1m = b.match(/slot1\s*:\s*pkmn\.(\w+)/);
            const bossPkmn = bossSlot1m ? bossSlot1m[1] : '';
            const bossMovesM = b.match(/slot1Moves\s*:\s*\[([^\]]+)\]/);
            let bossMoves = [];
            if (bossMovesM) {
                const movesContent = bossMovesM[1];
                bossMoves = [...movesContent.matchAll(/move\.(\w+)\.id/g)].map(m => m[1]);
            }
            
            // Parse unlockRequirement function (as string for display)
            const unlockReqM = b.match(/unlockRequirement\s*:\s*function\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
            const unlockRequirement = unlockReqM ? unlockReqM[1].trim() : null;
            
            // Parse encounterEffect function (as string for display)
            const encounterEffectM = b.match(/encounterEffect\s*:\s*function\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
            const encounterEffect = encounterEffectM ? encounterEffectM[1].trim() : null;
            
            // Parse skills (for dimension bosses)
            const skillsM = b.match(/skills\s*:\s*\{([^}]+)\}/);
            const skills = {};
            if (skillsM) {
                const skillsContent = skillsM[1];
                const skillMatches = [...skillsContent.matchAll(/(\d+)\s*:\s*skill\.(\w+)/g)];
                skillMatches.forEach(match => {
                    skills[match[1]] = match[2];
                });
            }
            
            r[n] = { name: n, displayName, type: aType, level, tier, rotation: aType === 'frontier' ? league : rotation, background: bg, spawns, drops, rewards, category, difficulty, uncatchable, unlockDescription, unlockRequirement, encounterEffect, league, typing, trainerSprite, iconPkmn, season, encounter, fieldEffects, timed, seasonDates, bossPkmn, bossMoves, skills, searchText: searchText(n, displayName) };
        }
    }
    
    // Parse skills definitions
    const skills = {};
    const skillRx = /skill\.(\w+)\s*=\s*\{/g; let skillm;
    while ((skillm = skillRx.exec(c)) !== null) {
        const skillName = skillm[1];
        const skillStart = skillm.index + skillm[0].length;
        let skillDepth = 1, skillEnd = skillStart;
        while (skillDepth > 0 && skillEnd < c.length) {
            if (c[skillEnd] === '{') skillDepth++;
            else if (c[skillEnd] === '}') skillDepth--;
            skillEnd++;
        }
        const skillBody = c.substring(skillStart, skillEnd - 1);
        
        // Parse skill info
        const infoM = skillBody.match(/info\s*:\s*function\(\)\s*\{\s*return\s*`([^`]+)`/);
        const info = infoM ? infoM[1] : '';
        
        skills[skillName] = { name: skillName, info, displayName: format(skillName) };
    }
    
    // Parse field effects definitions from areasDictionary.js (field.xxx = { ... })
    const fields = {};
    const fieldRx = /field\.(\w+)\s*=\s*\{/g; let fieldm;
    while ((fieldm = fieldRx.exec(c)) !== null) {
        const fieldName = fieldm[1];
        const fieldStart = fieldm.index + fieldm[0].length;
        let fieldDepth = 1, fieldEnd = fieldStart;
        while (fieldDepth > 0 && fieldEnd < c.length) {
            if (c[fieldEnd] === '{') fieldDepth++;
            else if (c[fieldEnd] === '}') fieldDepth--;
            fieldEnd++;
        }
        const fieldBody = c.substring(fieldStart, fieldEnd - 1);
        
        // Parse field info
        const infoM = fieldBody.match(/info\s*:\s*function\(\)\s*\{\s*return\s*`([^`]+)`/);
        const info = infoM ? infoM[1] : '';
        
        // Parse tier
        const tierM = fieldBody.match(/tier\s*:\s*(\d+)/);
        const tier = tierM ? parseInt(tierM[1]) : 2;
        
        fields[fieldName] = { name: fieldName, info, displayName: format(fieldName), tier };
    }
    
    return { areas: r, trainers: tr, skills, fields };
}

// Loading
function updateLoadingUI(st, pr) { document.getElementById('loading-status').textContent = st; document.getElementById('loading-progress').style.width = pr + '%'; }
function showError(msg) { document.getElementById('loading-error').textContent = msg; document.getElementById('loading-error').style.display = 'block'; document.getElementById('retry-btn').style.display = 'block'; document.querySelector('.loading-spinner').style.display = 'none'; }
async function fetchFile(f) { const r = await fetch(CONFIG.repoBase + f.path, { cache: 'no-store' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.text(); }



function allowDecorDrop(e) {
    e.preventDefault();
    const container = document.getElementById('accessory-preview-container');
    if (container) container.classList.add('drop-zone', 'drag-over');
}

function handleDragLeave(e) {
    const container = document.getElementById('accessory-preview-container');
    if (container) container.classList.remove('drop-zone', 'drag-over');
}

function handleDecorDrop(e) {
    e.preventDefault();
    const container = document.getElementById('accessory-preview-container');
    if (container) container.classList.remove('drop-zone', 'drag-over');
    
    const decorName = e.dataTransfer.getData('decor');
    if (decorName) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        equipAccessory(decorName, x, y);
        return;
    }
    
    const equippedIdx = e.dataTransfer.getData('equippedIdx');
    if (equippedIdx !== '') {
        const idx = parseInt(equippedIdx);
        if (!isNaN(idx) && equippedAccessories[idx]) {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left - 64;
            const y = e.clientY - rect.top - 64;
            equippedAccessories[idx].x = Math.max(0, Math.min(x, 280 - 128));
            equippedAccessories[idx].y = Math.max(0, Math.min(y, 280 - 128));
            renderEquippedAccessories();
            updateAccessoryURL();
        }
    }
}

function parseDecor(c) {
    const r = {}; const rx = /item\.(\w+)\s*=\s*\{/g; let m;
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        // Match type with any quote style (", ', or `)
        const typem = b.match(/type:\s*["'`](\w+)["'`]/);
        if (typem && typem[1] === 'decor') {
            // Match rarity with any quote style (", ', or `)
            const raritym = b.match(/rarity:\s*["'`](\w+)["'`]/);
            const rarity = raritym ? raritym[1] : 'common';
            const nm = b.match(/rename:\s*[`"']([^`'"]+)[`"']/); 
            const rn = nm ? nm[1] : null;
            // Default prices from game: common=10 silver, rare=50 gold, legendary=2000 gold
            let price = 10;
            let currency = 'bottleCap';
            if (rarity === 'rare') { price = 50; currency = 'goldenBottleCap'; }
            else if (rarity === 'legendary') { price = 2000; currency = 'goldenBottleCap'; }
            r[n] = { name: n, displayName: format(n, rn), rarity, price, currency, rename: rn };
        }
    }
    return r;
}

function parseShopDecor(c) {
    const r = []; const rx = /shop\.(\w+)\s*=\s*\{/g; let m;
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        // Match category with any quote style including backticks
        const catm = b.match(/category:\s*[`"'](\w+)[`"']/);
        if (catm && catm[1] === 'decor') {
            // Match icon: item.XXX.id or item.XXX
            const iconm = b.match(/icon:\s*item\.(\w+)/);
            const pricem = b.match(/price:\s*(\d+)/);
            const currm = b.match(/currency:\s*item\.(\w+)/);
            if (iconm) {
                r.push({
                    shopId: n,
                    itemName: iconm[1],
                    price: pricem ? parseInt(pricem[1]) : 100,
                    currency: currm ? currm[1] : 'bottleCap',
                    category: 'decor'
                });
            }
        }
    }
    return r;
}

function decorIcon(name) { return `${CONFIG.repoBase}img/decor/${name}.png`; }
function itemImg(name) { return `${CONFIG.repoBase}img/items/${name}.png`; }

function initAccessoryTab() {
    const select = document.getElementById('accessory-pokemon-select');
    if (!select || select.options.length > 1) return;
    const sorted = Object.values(pokemons).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    select.innerHTML = '<option value="" data-i18n="selectPokemon">-- Select Pokémon --</option>' + 
        sorted.map(p => `<option value="${p.name}">${p.displayName || format(p.name)}</option>`).join('');
}

// Note: calculateDecorRotation and renderShopDecor removed - all accessories displayed in renderAllDecor

function renderAllDecor() {
    const container = document.getElementById('all-decor-container');
    if (!container) return;
    
    const allDecor = Object.values(decorItems).sort((a, b) => {
        if (a.rarity !== b.rarity) return (a.rarity === 'rare' || a.rarity === 'legendary') ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
    });
    
    if (allDecor.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim)" data-i18n="noResults">No accessories available</div>';
        return;
    }
    
    container.innerHTML = allDecor.map(d => {
        const isRare = d.rarity === 'rare' || d.rarity === 'legendary';
        const rarityClass = isRare ? 'rare' : 'common';
        
        return `<div class="decor-item ${rarityClass}" draggable="true" data-decor="${d.name}" ondragstart="startDecorDrag(event, '${d.name}')" ontouchstart="handleTouchStart(event, '${d.name}')" ontouchmove="handleTouchMove(event)" ontouchend="handleTouchEnd(event)" onclick="equipAccessory('${d.name}')">
            <span class="decor-rarity ${rarityClass}">${isRare ? '★' : '●'}</span>
            <img src="${decorIcon(d.name)}" onerror="this.src='${itemImg('pokeball')}'">
            <div class="decor-name">${d.displayName}</div>
        </div>`;
    }).join('');
}

// Touch/Drag state for mobile support
let touchDragItem = null;
let touchDragElement = null;
let touchOffsetX = 0;
let touchOffsetY = 0;
let touchDragIndex = null; // For equipped items
let touchStartX = 0;
let touchStartY = 0;

function startDecorDrag(e, decorName) {
    // Desktop drag
    if (e.dataTransfer) {
        e.dataTransfer.setData('decor', decorName);
        e.target.classList.add('dragging');
    }
}

// Mobile touch handlers
function handleTouchStart(e, decorName) {
    const touch = e.touches[0];
    touchDragItem = decorName;
    touchDragElement = e.target.closest('.decor-item');
    
    // Calculate offset from the element's top-left
    const rect = touchDragElement.getBoundingClientRect();
    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;
    
    touchDragElement.classList.add('dragging');
    
    // Prevent scrolling while dragging
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!touchDragItem || !touchDragElement) return;
    
    const touch = e.touches[0];
    const container = document.getElementById('accessory-preview-container');
    
    // Move the element visually
    touchDragElement.style.position = 'fixed';
    touchDragElement.style.zIndex = '9999';
    touchDragElement.style.left = (touch.clientX - touchOffsetX) + 'px';
    touchDragElement.style.top = (touch.clientY - touchOffsetY) + 'px';
    touchDragElement.style.pointerEvents = 'none';
    
    // Check if over container for visual feedback
    if (container) {
        const rect = container.getBoundingClientRect();
        const isOver = touch.clientX >= rect.left && touch.clientX <= rect.right &&
                      touch.clientY >= rect.top && touch.clientY <= rect.bottom;
        if (isOver) {
            container.classList.add('drag-over');
        } else {
            container.classList.remove('drag-over');
        }
    }
    
    e.preventDefault();
}

function handleTouchEnd(e) {
    if (!touchDragItem || !touchDragElement) return;
    
    const touch = e.changedTouches[0];
    const container = document.getElementById('accessory-preview-container');
    
    // Reset element style
    touchDragElement.classList.remove('dragging');
    touchDragElement.style.position = '';
    touchDragElement.style.zIndex = '';
    touchDragElement.style.left = '';
    touchDragElement.style.top = '';
    touchDragElement.style.pointerEvents = '';
    
    if (container) {
        container.classList.remove('drag-over');
        
        // Check if dropped in container
        const rect = container.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            if (touchDragIndex !== null) {
                // Moving equipped item
                equippedAccessories[touchDragIndex].x = Math.max(0, Math.min(x - 64, 280 - 128));
                equippedAccessories[touchDragIndex].y = Math.max(0, Math.min(y - 64, 280 - 128));
                renderEquippedAccessories();
                updateAccessoryURL();
            } else {
                // New item from list
                equipAccessory(touchDragItem, x, y);
            }
        } else if (touchDragIndex !== null) {
            // Dropped outside - remove item
            removeAccessory(touchDragIndex);
        }
    }
    
    touchDragItem = null;
    touchDragElement = null;
    touchDragIndex = null;
    
    e.preventDefault();
}

// Mobile touch handlers for EQUIPPED items
function handleEquippedTouchStart(e, idx) {
    const touch = e.touches[0];
    const acc = equippedAccessories[idx];
    if (!acc) return;
    
    touchDragItem = acc.name;
    touchDragIndex = idx;
    touchDragElement = e.target;
    
    // Calculate offset from the element's center
    const rect = touchDragElement.getBoundingClientRect();
    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;
    
    touchDragElement.classList.add('dragging');
    
    e.preventDefault();
}

function updateAccessoryPreview() {
    const pkmnName = document.getElementById('accessory-pokemon-select').value;
    const isShiny = document.getElementById('accessory-shiny').checked;
    const spriteImg = document.getElementById('accessory-preview-sprite');
    const nameDiv = document.getElementById('accessory-preview-name');
    const slotsContainer = document.getElementById('accessory-slots');
    
    if (!pkmnName || !pokemons[pkmnName]) {
        spriteImg.style.display = 'none';
        nameDiv.textContent = '';
        slotsContainer.innerHTML = '';
        return;
    }
    
    const p = pokemons[pkmnName];
    spriteImg.src = isShiny ? spriteShiny(pkmnName) : sprite(pkmnName);
    spriteImg.style.display = 'block';
    spriteImg.onerror = () => { spriteImg.src = sprite(pkmnName); };
    nameDiv.textContent = p.displayName || format(pkmnName);
    
    renderEquippedAccessories();
}

function equipAccessory(decorName, dropX, dropY) {
    const pkmnName = document.getElementById('accessory-pokemon-select').value;
    if (!pkmnName) {
        alert(t('selectPokemon'));
        return;
    }
    
    // Limit to 3 accessories
    if (equippedAccessories.length >= 3) {
        alert(t('max3Accessories'));
        return;
    }
    
    // Check if already equipped
    if (equippedAccessories.find(a => a.name === decorName)) return;
    
    const decor = decorItems[decorName];
    if (!decor) return;
    
    // Use drop position if provided, otherwise default position
    let x, y;
    if (dropX !== undefined && dropY !== undefined) {
        x = Math.max(0, Math.min(dropX - 64, 280 - 128)); // Center on drop point
        y = Math.max(0, Math.min(dropY - 64, 280 - 128));
    } else {
        x = 76 + equippedAccessories.length * 20; // Default spread position
        y = 76;
    }
    
    equippedAccessories.push({
        name: decorName,
        x: x,
        y: y
    });
    
    renderEquippedAccessories();
    updateAccessoryURL();
}

function renderEquippedAccessories() {
    const slotsContainer = document.getElementById('accessory-slots');
    const equippedContainer = document.getElementById('equipped-accessories');
    
    if (!slotsContainer || !equippedContainer) return;
    
    // Render on sprite
    slotsContainer.innerHTML = equippedAccessories.map((acc, idx) => {
        const decor = decorItems[acc.name];
        if (!decor) return '';
        return `<img src="${decorIcon(acc.name)}" class="equipped-decor" 
            style="left:${acc.x}px;top:${acc.y}px" 
            draggable="true"
            ondragstart="startEquippedDecorDrag(event, ${idx})"
            ondragend="endEquippedDecorDrag(event, ${idx})"
            ontouchstart="handleEquippedTouchStart(event, ${idx})"
            ontouchmove="handleTouchMove(event)"
            ontouchend="handleTouchEnd(event)"
            title="${decor.displayName}">`;
    }).join('');
    
    // Render list
    if (equippedAccessories.length === 0) {
        equippedContainer.innerHTML = '<span style="color:var(--text-dim);font-style:italic" data-i18n="noAccessory">No accessories equipped</span>';
    } else {
        equippedContainer.innerHTML = equippedAccessories.map((acc, idx) => {
            const decor = decorItems[acc.name];
            if (!decor) return '';
            return `<div class="equipped-accessory-item">
                <img src="${decorIcon(acc.name)}" onerror="this.src='${itemImg('pokeball')}'">
                <span>${decor.displayName}</span>
                <button class="remove-btn" onclick="removeAccessory(${idx})">✕</button>
            </div>`;
        }).join('');
    }
}

function startEquippedDecorDrag(e, idx) {
    e.dataTransfer.setData('equippedIdx', idx);
    e.target.classList.add('dragging');
}

function endEquippedDecorDrag(e, idx) {
    e.target.classList.remove('dragging');
    // Update position based on drop - only if dropped inside container
    const container = document.getElementById('accessory-preview-container');
    if (container) {
        const rect = container.getBoundingClientRect();
        // Check if drop is within container bounds
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const x = e.clientX - rect.left - 64; // 64 = half of 128px
            const y = e.clientY - rect.top - 64;
            equippedAccessories[idx].x = Math.max(0, Math.min(x, 280 - 128));
            equippedAccessories[idx].y = Math.max(0, Math.min(y, 280 - 128));
            renderEquippedAccessories();
            updateAccessoryURL();
        }
    }
}

function removeAccessory(idx) {
    equippedAccessories.splice(idx, 1);
    renderEquippedAccessories();
    updateAccessoryURL();
}

function clearAccessories() {
    equippedAccessories = [];
    renderEquippedAccessories();
    updateAccessoryURL();
}

function showDecorDetails(decorName, showEquipButton = true) {
    const decor = decorItems[decorName];
    if (!decor) return;
    
    const isRare = decor.rarity === 'rare' || decor.rarity === 'legendary';
    const { price, iconImg, currencyName } = getDecorPriceInfo(decorName);
    
    let html = `<div style="text-align:center;padding:20px">
        <img src="${decorIcon(decorName)}" style="width:96px;height:96px;image-rendering:pixelated;margin-bottom:15px" onerror="this.src='${itemImg('pokeball')}'">
        <h3 style="color:${isRare ? 'var(--accent-gold)' : 'var(--accent-blue)'};margin-bottom:10px">${decor.displayName}</h3>
        <div style="margin-bottom:15px">
            <span style="padding:4px 12px;background:${isRare ? 'rgba(255,215,0,0.2)' : 'rgba(0,212,255,0.2)'};color:${isRare ? 'var(--accent-gold)' : 'var(--accent-blue)'};border-radius:12px;font-size:0.85rem">
                ${isRare ? t('decorRare') : t('decorCommon')}
            </span>
        </div>
        <div style="background:var(--bg-input);padding:15px;border-radius:8px;margin-bottom:15px">
            <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:5px" data-i18n="inShop">${t('inShop')}</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--accent-blue)"><img src="${iconImg}" style="width:20px;height:20px;vertical-align:middle"> ${price} ${currencyName}</div>
        </div>`;
    
    if (showEquipButton) {
        html += `<button class="btn" onclick="equipAccessory('${decorName}');closeModal();" style="margin-top:10px">🎀 ${t('selectDecor')}</button>`;
    }
    html += `</div>`;
    
    openModal(`🎀 ${decor.displayName}`, html);
}

// Get price info for a decor item (consistent across all functions)
function getDecorPriceInfo(decorName) {
    const decor = decorItems[decorName];
    if (!decor) return { price: 0, currency: 'bottleCap', iconImg: itemImg('bottleCap'), currencyName: t('bottleCaps') };
    
    // Find fixed shop entry (exclude rotation slots shopDecor1-6, include limited)
    const shopEntry = Object.values(shopItems).find(s => 
        s.itemName === decorName && 
        s.price > 0 && 
        !s.shopId?.match(/^shopDecor[1-6]$/)
    );
    
    // Use shop price and currency if found, otherwise use stored defaults from parseDecor
    const price = shopEntry?.price || decor.price || 10;
    const currency = shopEntry?.currency || decor.currency || 'bottleCap';
    
    // Determine icon image and currency name based on currency type
    let iconImg, currencyName;
    if (currency === 'goldenBottleCap') {
        iconImg = itemImg('goldenBottleCap');
        currencyName = t('goldCaps');
    } else if (currency === 'oldGateau') {
        iconImg = itemImg('oldGateau');
        currencyName = 'Old Gateau';
    } else if (currency === 'yellowApricorn') {
        iconImg = itemImg('yellowApricorn');
        currencyName = t('yellowApricorn') || 'Yellow Apricorn';
    } else if (currency === 'pinkApricorn') {
        iconImg = itemImg('pinkApricorn');
        currencyName = t('pinkApricorn') || 'Pink Apricorn';
    } else if (currency === 'greenApricorn') {
        iconImg = itemImg('greenApricorn');
        currencyName = t('greenApricorn') || 'Green Apricorn';
    } else if (currency === 'whiteApricorn') {
        iconImg = itemImg('whiteApricorn');
        currencyName = t('whiteApricorn') || 'White Apricorn';
    } else {
        iconImg = itemImg('bottleCap');
        currencyName = t('bottleCaps');
    }
    
    return { price, currency, iconImg, currencyName };
}

// Show decor info for Item tab (no equip button, just shop info)
function showDecorItemInfo(decorName) {
    const decor = decorItems[decorName];
    if (!decor) return;
    
    const isRare = decor.rarity === 'rare' || decor.rarity === 'legendary';
    const { price, iconImg, currencyName, currency } = getDecorPriceInfo(decorName);
    
    // Hide Old Gateau prices when not Halloween
    const isOldGateau = currency === 'oldGateau';
    const showPrice = !isOldGateau || isHalloweenActive();
    
    let html = `<div style="text-align:center;padding:20px">
        <img src="${decorIcon(decorName)}" style="width:96px;height:96px;image-rendering:pixelated;margin-bottom:15px" onerror="this.src='${itemImg('pokeball')}'">
        <h3 style="color:${isRare ? 'var(--accent-gold)' : 'var(--accent-blue)'};margin-bottom:10px">${decor.displayName}</h3>
        <div style="margin-bottom:15px">
            <span style="padding:4px 12px;background:${isRare ? 'rgba(255,215,0,0.2)' : 'rgba(0,212,255,0.2)'};color:${isRare ? 'var(--accent-gold)' : 'var(--accent-blue)'};border-radius:12px;font-size:0.85rem">
                ${isRare ? t('decorRare') : t('decorCommon')}
            </span>
        </div>
        ${showPrice ? `<div style="background:var(--bg-input);padding:15px;border-radius:8px;margin-bottom:15px">
            <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:5px" data-i18n="inShop">${t('inShop')}</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--accent-blue)"><img src="${iconImg}" style="width:20px;height:20px;vertical-align:middle"> ${price} ${currencyName}</div>
        </div>` : `<div style="background:var(--bg-input);padding:15px;border-radius:8px;margin-bottom:15px">
            <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:5px">${t('availability')}</div>
            <div style="font-size:1rem;font-weight:700;color:var(--accent-red)">❌ ${t('seasonalUnavailable') || 'Currently unavailable - returns next Halloween'}</div>
        </div>`}`
    
    html += `<div style="font-size:0.85rem;color:var(--text-dim);margin-top:15px">
        🎀 ${t('accessoryLabel')} - ${t('decorAvailable')}
    </div></div>`;
    
    openModal(`🎀 ${decor.displayName}`, html);
}

function updateAccessoryURL() {
    const pkmnName = document.getElementById('accessory-pokemon-select')?.value;
    const isShiny = document.getElementById('accessory-shiny')?.checked;
    
    if (!pkmnName) return;
    
    const params = {
        pokemon: pkmnName,
        shiny: isShiny ? '1' : '0',
        accessories: equippedAccessories.map(a => `${a.name}:${Math.round(a.x)},${Math.round(a.y)}`).join(';')
    };
    
    updateURLHash('accessory', params);
}

function shareDressedPokemon(btn) {
    const pkmnName = document.getElementById('accessory-pokemon-select')?.value;
    if (!pkmnName) {
        alert(t('selectPokemon'));
        return;
    }
    updateAccessoryURL();
    shareCurrentPage(btn);
}

function applyAccessoryURL() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('tab') !== 'accessory') return;
    
    const pkmn = params.get('pokemon');
    const shiny = params.get('shiny') === '1';
    const accessories = params.get('accessories');
    
    if (pkmn) {
        document.getElementById('accessory-pokemon-select').value = pkmn;
        document.getElementById('accessory-shiny').checked = shiny;
        
        if (accessories) {
            equippedAccessories = accessories.split(';').map(acc => {
                const [name, pos] = acc.split(':');
                const [x, y] = pos.split(',').map(Number);
                return { name, x, y };
            });
        }
        
        updateAccessoryPreview();
    }
}

function parseShop(c) {
    const r = {}; const rx = /shop\.(\w+)\s*=\s*\{/g; let m;
    const eventCurrencies = new Set();
    const currencyToEvent = {};
    
    while ((m = rx.exec(c)) !== null) {
        const n = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < c.length) { if (c[e] === '{') d++; else if (c[e] === '}') d--; e++; }
        const b = c.substring(s, e - 1);
        const iconm = b.match(/icon:\s*item\.(\w+)/); 
        const pkmnm = b.match(/pkmn:\s*pkmn\.(\w+)/);
        const pricem = b.match(/price:\s*(\d+)/);
        const currm = b.match(/currency:\s*item\.(\w+)/);  // Currency is item.XXX.id
        const catm = b.match(/category:\s*[`"'](\w+)[`"']/);
        const stockm = b.match(/stock:\s*(\d+)/);
        const conditionm = b.match(/condition:\s*function/);
        const namem = b.match(/name:\s*[`"']([^`"']+)[`"']/);  // Parse custom name (e.g., "Barbaracite x21")
        
        // Detect event currencies (condition with rotationEventCurrent)
        const eventConditionm = b.match(/rotationEventCurrent==(\d+)/);
        const currency = currm ? currm[1] : 'bottleCap';
        
        if (eventConditionm) {
            eventCurrencies.add(currency);
            currencyToEvent[currency] = parseInt(eventConditionm[1]);
        }
        
        const entry = { 
            shopId: n,
            price: pricem ? parseInt(pricem[1]) : 0,
            currency: currency,
            category: catm ? catm[1] : 'all',
            stock: stockm ? parseInt(stockm[1]) : null,
            hasCondition: !!conditionm,  // Mark if item has condition (event-only)
            eventRotation: eventConditionm ? parseInt(eventConditionm[1]) : null,
            customName: namem ? namem[1] : null,  // Custom name like "Barbaracite x21"
            iconImg: itemImg(currency === 'bottleCap' ? 'bottleCap' : 
                currency === 'goldenBottleCap' ? 'goldenBottleCap' : 
                currency === 'yellowApricorn' ? 'yellowApricorn' :
                currency === 'pinkApricorn' ? 'pinkApricorn' :
                currency === 'greenApricorn' ? 'greenApricorn' :
                currency === 'whiteApricorn' ? 'whiteApricorn' : currency)
        };
        
        if (pkmnm) {
            entry.isPokemon = true;
            entry.pokemon = pkmnm[1].replace('.id', '');
            r['pokemon_' + entry.pokemon] = entry;
        } else if (iconm) {
            entry.itemName = iconm[1].replace('.id', '');
            // Handle duplicate items (like abilityPatch which has both regular and limited versions)
            // Store as array if multiple entries for same item
            const key = entry.itemName;
            if (r[key]) {
                // Convert to array if not already
                if (!Array.isArray(r[key])) {
                    r[key] = [r[key]];
                }
                r[key].push(entry);
            } else {
                r[key] = entry;
            }
        }
    }
    
    // Parse Cooking ingredients (v4.7)
    const ingredients = {};
    // Match ingredient definitions - find each ingredient.XXX = { ... } block
    const ingRx = /ingredient\.(\w+)\s*=\s*\{/g;
    let ingMatch;
    while ((ingMatch = ingRx.exec(c)) !== null) {
        const ingName = ingMatch[1];
        const startIdx = ingMatch.index + ingMatch[0].length - 1; // Position of opening {
        // Find matching closing brace by counting
        let braceCount = 1;
        let endIdx = startIdx + 1;
        while (braceCount > 0 && endIdx < c.length) {
            if (c[endIdx] === '{') braceCount++;
            else if (c[endIdx] === '}') braceCount--;
            endIdx++;
        }
        const block = c.substring(startIdx + 1, endIdx - 1);
        // Extract ability, price and currency from the block
        const abilityMatch = block.match(/ability:\s*ability\.(\w+)\.id/);
        const priceMatch = block.match(/price:\s*(\d+)/);
        const currencyMatch = block.match(/currency:\s*item\.(\w+)\.id/);
        if (abilityMatch && priceMatch) {
            ingredients[ingName] = {
                name: ingName,
                ability: abilityMatch[1],
                price: parseInt(priceMatch[1]),
                currency: currencyMatch ? currencyMatch[1] : 'goldenBottleCap' // Default to gold caps for cooking
            };
        }
    }
    if (Object.keys(ingredients).length > 0) {
        GAME_CONFIG.INGREDIENTS = ingredients;
    }
    
    // Update GAME_CONFIG with discovered event currencies
    if (eventCurrencies.size > 0) {
        GAME_CONFIG.EVENT_CURRENCIES = [...eventCurrencies];
        GAME_CONFIG.CURRENCY_TO_EVENT = currencyToEvent;
    }
    
    return r;
}

// Post-parsing validation to check data integrity
function validateParsedData() {
    const errors = [];
    const warnings = [];
    
    // Validate Pokemon references
    for (const [name, pkmn] of Object.entries(pokemons)) {
        // Check hidden ability exists
        if (pkmn.hiddenAbility && !abilities[pkmn.hiddenAbility]) {
            warnings.push(`Pokemon "${name}" references unknown hidden ability: ${pkmn.hiddenAbility}`);
        }
        // Check signature move exists
        if (pkmn.signature && !moves[pkmn.signature]) {
            warnings.push(`Pokemon "${name}" references unknown signature move: ${pkmn.signature}`);
        }
        // Check egg move exists
        if (pkmn.eggMove && !moves[pkmn.eggMove]) {
            warnings.push(`Pokemon "${name}" references unknown egg move: ${pkmn.eggMove}`);
        }
        // Check regular abilities exist
        if (pkmn.regularAbilities) {
            for (const ability of pkmn.regularAbilities) {
                if (!abilities[ability]) {
                    warnings.push(`Pokemon "${name}" references unknown ability: ${ability}`);
                }
            }
        }
        // Check evolution targets exist
        if (pkmn.evolves) {
            for (const evo of pkmn.evolves) {
                if (!pokemons[evo]) {
                    warnings.push(`Pokemon "${name}" evolves to unknown Pokemon: ${evo}`);
                }
            }
        }
    }
    
    // Validate moves
    for (const [name, move] of Object.entries(moves)) {
        // Check affectedBy abilities exist
        if (move.affectedBy) {
            for (const ability of move.affectedBy) {
                if (!abilities[ability]) {
                    warnings.push(`Move "${name}" references unknown ability in affectedBy: ${ability}`);
                }
            }
        }
        // Check unaffectedBy abilities exist
        if (move.unaffectedBy) {
            for (const ability of move.unaffectedBy) {
                if (!abilities[ability]) {
                    warnings.push(`Move "${name}" references unknown ability in unaffectedBy: ${ability}`);
                }
            }
        }
        // Check type exists
        if (move.type && !typeColors[move.type]) {
            warnings.push(`Move "${name}" has unknown type: ${move.type}`);
        }
    }
    
    // Validate items
    for (const [name, item] of Object.entries(items)) {
        // Check TM move exists
        if (item.isTM && item.moveInfo === null) {
            warnings.push(`TM item "${name}" references unknown move`);
        }
        // Check memory ability exists
        if (name.endsWith('Memory') && item.ability && !abilities[item.ability]) {
            warnings.push(`Memory item "${name}" references unknown ability: ${item.ability}`);
        }
    }
    
    // Validate areas
    for (const [name, area] of Object.entries(areas)) {
        // Check spawn Pokemon exist
        if (area.spawns) {
            for (const tier of ['common', 'uncommon', 'rare']) {
                if (area.spawns[tier]) {
                    for (const pkmnName of area.spawns[tier]) {
                        if (!pokemons[pkmnName]) {
                            warnings.push(`Area "${name}" spawns unknown Pokemon: ${pkmnName}`);
                        }
                    }
                }
            }
        }
        // Check drop items exist
        if (area.drops) {
            for (const tier of ['common', 'uncommon', 'rare']) {
                if (area.drops[tier]) {
                    for (const itemName of area.drops[tier]) {
                        if (!items[itemName]) {
                            warnings.push(`Area "${name}" drops unknown item: ${itemName}`);
                        }
                    }
                }
            }
        }
    }
    
    // Log results
    if (errors.length > 0) {
        console.error('=== Data Validation Errors ===');
        errors.forEach(e => console.error('❌', e));
    }
    if (warnings.length > 0) {
        console.warn('=== Data Validation Warnings ===');
        warnings.forEach(w => console.warn('⚠️', w));
    }
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ Data validation passed - all references are valid');
    }
    
    return { errors, warnings };
}

// Parse wildlife pool data for park Pokemon
function parseWildlifePool(areasContent) {
    wildlifePool = { common: [], uncommon: [], rare: [] };
    
    // Parse wildlifePoolCommon
    const commonMatch = areasContent.match(/const\s+wildlifePoolCommon\s*=\s*\[([\s\S]*?)\]/);
    if (commonMatch) {
        const matches = commonMatch[1].matchAll(/pkmn\.(\w+)\.id/g);
        for (const m of matches) wildlifePool.common.push(m[1]);
    }
    
    // Parse wildlifePoolUncommon
    const uncommonMatch = areasContent.match(/const\s+wildlifePoolUncommon\s*=\s*\[([\s\S]*?)\]/);
    if (uncommonMatch) {
        const matches = uncommonMatch[1].matchAll(/pkmn\.(\w+)\.id/g);
        for (const m of matches) wildlifePool.uncommon.push(m[1]);
    }
    
    // Parse wildlifePoolRare
    const rareMatch = areasContent.match(/const\s+wildlifePoolRare\s*=\s*\[([\s\S]*?)\]/);
    if (rareMatch) {
        const matches = rareMatch[1].matchAll(/pkmn\.(\w+)\.id/g);
        for (const m of matches) wildlifePool.rare.push(m[1]);
    }
}

// Parse exclusive frontier Pokemon
function parseExclusiveFrontier(areasContent) {
    exclusiveFrontierPkmn = [];
    const match = areasContent.match(/const\s+exclusiveFrontierPkmn\s*=\s*\[([\s\S]*?)\]/);
    if (match) {
        const matches = match[1].matchAll(/pkmn\.(\w+)/g);
        for (const m of matches) exclusiveFrontierPkmn.push(m[1]);
    }
}

// Parse spiraling rewards for item obtainability
function parseSpiralingRewards(exploreContent) {
    spiralingRewardItems = {};
    // Parsing spiraling rewards...
    if (!exploreContent) return;
    
    // Find the start of spiralingRewards object
    const startMatch = exploreContent.match(/const\s+spiralingRewards\s*=\s*\{/);
    if (!startMatch) {
        // Could not find spiralingRewards
        return;
    }
    
    const startIdx = startMatch.index + startMatch[0].length;
    let depth = 1;
    let endIdx = startIdx;
    
    // Find the matching closing brace
    while (depth > 0 && endIdx < exploreContent.length) {
        if (exploreContent[endIdx] === '{') depth++;
        else if (exploreContent[endIdx] === '}') depth--;
        endIdx++;
    }
    
    const content = exploreContent.substring(startIdx, endIdx - 1);
    // Spiraling rewards content sample
    // Match all item: item.XXX.id patterns
    const itemMatches = content.matchAll(/item:\s*item\.(\w+)\.id/g);
    for (const m of itemMatches) {
        spiralingRewardItems[m[1]] = true;
    }
    // Spiraling Tower items found
}

function buildEvolutionFamilies(pkmnContent) {
    evolutionFamilies = {};
    evolutionRelations = { evolvesTo: {}, evolvesFrom: {}, evolveMethod: {} };
    const evolvesTo = evolutionRelations.evolvesTo;
    const evolvesFrom = evolutionRelations.evolvesFrom;
    const evolveMethod = evolutionRelations.evolveMethod;
    
    // Parse evolution relationships from game data
    const rx = /pkmn\.(\w+)\s*=\s*\{/g; let m;
    while ((m = rx.exec(pkmnContent)) !== null) {
        const name = m[1], s = m.index + m[0].length; let d = 1, e = s;
        while (d > 0 && e < pkmnContent.length) { if (pkmnContent[e] === '{') d++; else if (pkmnContent[e] === '}') d--; e++; }
        const body = pkmnContent.substring(s, e - 1);
        
        // Find evolve targets - only if there's an actual evolve function
        if (body.includes('evolve:')) {
            const evoMatches = body.matchAll(/pkmn:\s*pkmn\.(\w+)/g);
            for (const evo of evoMatches) {
                const evoName = evo[1];
                if (!evolvesTo[name]) evolvesTo[name] = [];
                evolvesTo[name].push(evoName);
                evolvesFrom[evoName] = name;
                
                // Parse evolution method (level or item)
                // Look for level: XXX or item: item.XXX in the same evolution block
                const evoBlockMatch = body.match(new RegExp(`pkmn:\\s*pkmn\\.${evoName}[^}]+`));
                if (evoBlockMatch) {
                    const evoBlock = evoBlockMatch[0];
                    const levelMatch = evoBlock.match(/level:\s*(evolutionLevel\d+|\d+)/);
                    const itemMatch = evoBlock.match(/item:\s*item\.(\w+)/);
                    
                    if (levelMatch) {
                        let level = levelMatch[1];
                        // Map evolutionLevel constants to actual values
                        if (level === 'evolutionLevel1') level = String(EVOLUTION_LEVELS[1]);
                        else if (level === 'evolutionLevel2') level = String(EVOLUTION_LEVELS[2]);
                        else if (level === 'evolutionLevel3') level = String(EVOLUTION_LEVELS[3]);
                        evolveMethod[evoName] = { type: 'level', value: level };
                    } else if (itemMatch) {
                        evolveMethod[evoName] = { type: 'item', value: itemMatch[1] };
                    }
                }
            }
        }
    }
    
    // Build families using connected components (DFS) - ONLY using actual evolution chains
    let familyId = 0;
    const visited = new Set();
    
    function dfs(pkmn, fid) {
        if (visited.has(pkmn)) return;
        visited.add(pkmn);
        evolutionFamilies[pkmn] = fid;
        if (evolvesTo[pkmn]) evolvesTo[pkmn].forEach(target => dfs(target, fid));
        if (evolvesFrom[pkmn]) dfs(evolvesFrom[pkmn], fid);
    }
    
    Object.keys(pokemons).forEach(name => {
        if (!visited.has(name)) dfs(name, familyId++);
    });
    
    // NOTE: We do NOT group by base name anymore!
    // Special forms like magikarpKoi, vivillonArchipelago are SEPARATE families
    // because they don't have evolution connections in the game data.
    // This matches how the game's getEvolutionFamily() function works.
}

function calculateObtainability() {
    // Build set of available mega stones from area rewards AND shop
    // Use parsed items with type='mega' (catches charizarditeX/Y, mewtwoniteX/Y etc.)
    const megaStoneNames = new Set(Object.values(items).filter(i => i.type === 'mega').map(i => i.name));
    const availableMegaStones = new Set();
    
    // Track mega stone sources separately
    window.megaStoneFromArea = new Set(); // Mega stones from area rewards
    window.megaStoneFromShop = new Set(); // Mega stones actually purchasable in shop
    
    // From area rewards
    Object.values(areas).forEach(a => {
        if (a.rewards && a.rewards.items) {
            a.rewards.items.forEach(item => {
                if (megaStoneNames.has(item)) {
                    availableMegaStones.add(item);
                    window.megaStoneFromArea.add(item);
                }
            });
        }
    });
    
    // From shop (mega stones available for purchase)
    Object.entries(shopItems).forEach(([key, shopEntry]) => {
        // Handle case where entry is an array (duplicate items like abilityPatch)
        const entries = Array.isArray(shopEntry) ? shopEntry : [shopEntry];
        entries.forEach(shopItem => {
            const itemName = shopItem.itemName || key;
            if (itemName && megaStoneNames.has(itemName)) {
                availableMegaStones.add(itemName);
                // Only mark as shop if it's NOT also from area rewards
                if (!window.megaStoneFromArea.has(itemName)) {
                    window.megaStoneFromShop.add(itemName);
                }
            }
        });
    });
    
    // Initialize all Pokemon as unknown
    Object.keys(pokemons).forEach(name => {
        pokemons[name].obtainedIn = null;
        
        // Check if this is a Mega Pokemon without available mega stone
        // Use isMegaPokemon to avoid matching "meganium" (not a Mega)
        if (isMegaPokemon(name) && !name.includes('Z')) {
            // Use evolveMethod to find exact stone name for this mega
            const method = evolutionRelations.evolveMethod[name];
            const stoneName = method?.type === 'item' ? method.value : null;
            const hasStone = stoneName ? availableMegaStones.has(stoneName) : false;
            if (!hasStone) {
                pokemons[name].obtainedIn = 'unobtainable';
                pokemons[name].noMegaStone = true;
            } else {
                // Mega stone is available - determine if from area rewards or shop
                pokemons[name].hasMegaStone = true;
                // Check if stone is from area rewards (not shop)
                if (stoneName && window.megaStoneFromArea && window.megaStoneFromArea.has(stoneName)) {
                    // Stone is from area/event rewards
                    if (window.megaStoneFromShop && window.megaStoneFromShop.has(stoneName)) {
                        // Available in both (rare case) - prefer mart
                        pokemons[name].obtainedIn = 'mart';
                    } else {
                        // Only from area rewards
                        pokemons[name].obtainedIn = 'event';
                    }
                } else {
                    // Stone is from shop
                    pokemons[name].obtainedIn = 'mart';
                }
            }
        }
    });
    
    // First pass: mark direct obtainability from areas (spawns)
    const seasonalAreas = Object.values(areas).filter(a => a.type === 'season');
    // Found seasonal areas
    Object.keys(areas).forEach(areaName => {
        const a = areas[areaName];
        const allSpawns = [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare];
        if (a.type === 'season') {
            // Seasonal area parsed
        }
        
        allSpawns.forEach(pkmnName => {
            if (!pokemons[pkmnName]) return;
            
            // Wild type = always catchable
            if (a.type === 'wild') {
                pokemons[pkmnName].obtainedIn = 'wild';
            } 
            // Event type = catchable ONLY if NOT uncatchable
            else if (a.type === 'event' && !a.uncatchable) {
                if (!pokemons[pkmnName].obtainedIn) {
                    pokemons[pkmnName].obtainedIn = 'event';
                }
            }
            // Season type (Limited areas) = catchable ONLY if NOT uncatchable (treated as event)
            else if (a.type === 'season' && !a.uncatchable) {
                if (!pokemons[pkmnName].obtainedIn) {
                    pokemons[pkmnName].obtainedIn = 'event';
                }
            }
            // Dimension Blueprint types = catchable (treated as event)
            else if (a.type === 'dimensionBlueprint' && !a.uncatchable) {
                if (!pokemons[pkmnName].obtainedIn) {
                    pokemons[pkmnName].obtainedIn = 'event';
                }
            }
            // Dungeon = NEVER catchable (skip)
        });
    });
    
    // Mark Pokemon from event rewards (this is how you get Pokemon from boss events)
    // Also mark seasonal Pokemon with their season
    Object.keys(areas).forEach(areaName => {
        const a = areas[areaName];
        if (a.rewards && a.rewards.pokemon) {
            a.rewards.pokemon.forEach(pkmnName => {
                if (pokemons[pkmnName]) {
                    // Even if already marked (e.g., secret), mark as event obtainable
                    if (!pokemons[pkmnName].obtainedIn || pokemons[pkmnName].obtainedIn === 'secret') {
                        pokemons[pkmnName].obtainedIn = 'event';
                    }
                    // Mark with season if it's a seasonal area
                    if (a.type === 'season' && a.season) {
                        pokemons[pkmnName].season = a.season;
                    }
                }
            });
        }
        // Also mark boss Pokemon from seasonal areas
        if (a.type === 'season' && a.bossPkmn && a.season) {
            const pkmnName = a.bossPkmn;
            if (pokemons[pkmnName]) {
                if (!pokemons[pkmnName].obtainedIn || pokemons[pkmnName].obtainedIn === 'secret') {
                    pokemons[pkmnName].obtainedIn = 'event';
                }
                pokemons[pkmnName].season = a.season;
            }
        }
        // Also mark boss Pokemon from dimension blueprint areas
        if (a.type === 'dimensionBlueprint' && a.bossPkmn) {
            const pkmnName = a.bossPkmn;
            if (pokemons[pkmnName]) {
                if (!pokemons[pkmnName].obtainedIn || pokemons[pkmnName].obtainedIn === 'secret') {
                    pokemons[pkmnName].obtainedIn = 'event';
                }
            }
        }
    });
    
    // Mark Wildlife Park Pokemon
    const allWildlife = [...wildlifePool.common, ...wildlifePool.uncommon, ...wildlifePool.rare];
    allWildlife.forEach(pkmnName => {
        if (pokemons[pkmnName] && !pokemons[pkmnName].obtainedIn) {
            pokemons[pkmnName].obtainedIn = 'park';
        }
    });
    
    // Mark Battle Frontier exclusive Pokemon
    exclusiveFrontierPkmn.forEach(pkmnName => {
        if (pokemons[pkmnName] && !pokemons[pkmnName].obtainedIn) {
            pokemons[pkmnName].obtainedIn = 'frontier';
        }
    });
    
    // Mark shop Pokemon
    Object.keys(shopItems).forEach(key => {
        const item = shopItems[key];
        if (item.isPokemon && item.pokemon && pokemons[item.pokemon]) {
            if (!pokemons[item.pokemon].obtainedIn) {
                pokemons[item.pokemon].obtainedIn = 'mart';
            }
        }
    });
    
    // Dynamically detect Halloween Pokemon from seasonal areas
    // Any Pokemon in a zone with season: 'halloween' should be marked as Halloween
    const HALLOWEEN_POKEMON = new Set();
    Object.values(areas).forEach(a => {
        if (a.type === 'season' && a.season === 'halloween') {
            // Add boss Pokemon
            if (a.bossPkmn) HALLOWEEN_POKEMON.add(a.bossPkmn);
            // Add reward Pokemon
            if (a.rewards && a.rewards.pokemon) {
                a.rewards.pokemon.forEach(pkmnName => HALLOWEEN_POKEMON.add(pkmnName));
            }
            // Add spawn Pokemon
            if (a.spawns) {
                [...a.spawns.common, ...a.spawns.uncommon, ...a.spawns.rare].forEach(pkmnName => {
                    HALLOWEEN_POKEMON.add(pkmnName);
                });
            }
        }
    });
    
    // Mark all Halloween Pokemon as event with halloween tag
    HALLOWEEN_POKEMON.forEach(name => {
        if (pokemons[name]) {
            pokemons[name].obtainedIn = 'event';
            pokemons[name].isSecret = false; // Not secret
            pokemons[name].hidden = false; // Not hidden
            pokemons[name].season = 'halloween';
            pokemons[name].isEventForm = true;
            // Remove (Event) suffix from display name if present
            pokemons[name].displayName = pokemons[name].displayName.replace(' (Event)', '');
            // Add (Halloween) suffix for event forms to distinguish from normal forms
            // (Marshadow doesn't need it as it has no normal form)
            if (name.endsWith('Event') && !pokemons[name].displayName.includes('(Halloween)')) {
                pokemons[name].displayName = pokemons[name].displayName + ' (Halloween)';
            }
            // Update searchText to include halloween
            pokemons[name].searchText = searchText(name, pokemons[name].rename) + ' halloween';
        }
    });
    
    // Mark secret Pokemon (dynamically detected from hidden: true or isSecret flag)
    // Exclude Halloween Pokemon from being marked as secret
    const secretPokemonList = GAME_CONFIG.SECRET_POKEMON.length > 0 ? GAME_CONFIG.SECRET_POKEMON : ['missingno', 'f00', 'ghost', 'humanoid', 'secretOnix', 'secretAerodactly', 'secretKabutops'];
    secretPokemonList.forEach(name => {
        // Skip if it's a Halloween Pokemon (already handled above)
        if (HALLOWEEN_POKEMON.has(name)) return;
        
        if (pokemons[name]) {
            pokemons[name].obtainedIn = 'secret';
            pokemons[name].isSecret = true;
            // Secret Pokemon marked
        }
    });
    
    // Also mark any pokemon with hidden: true as secret (backup for any missed)
    Object.keys(pokemons).forEach(name => {
        if (pokemons[name].hidden && !pokemons[name].obtainedIn && !HALLOWEEN_POKEMON.has(name)) {
            pokemons[name].obtainedIn = 'secret';
            pokemons[name].isSecret = true;
        }
    });
    
    // Mark event form Pokemon and add "Event" to their display name (dynamically detected)
    // Skip Halloween Pokemon (already handled above)
    const eventFormsList = GAME_CONFIG.EVENT_FORMS.length > 0 ? GAME_CONFIG.EVENT_FORMS : ['emolgaEvent', 'tangelaEvent', 'snoruntEvent'];
    eventFormsList.forEach(name => {
        // Skip if already marked as Halloween (handled above)
        if (HALLOWEEN_POKEMON.has(name)) return;
        
        if (pokemons[name]) {
            // Before marking event form
            pokemons[name].isEventForm = true;
            pokemons[name].obtainedIn = 'event';
            // Add "(Event)" to display name for easier searching
            pokemons[name].displayName = pokemons[name].displayName + ' (Event)';
            // Update searchText to include "event"
            pokemons[name].searchText = searchText(name, pokemons[name].rename) + ' event ' + pokemons[name].displayName.toLowerCase();
            // Event form marked
        } else {
            console.warn('[Explorer] Event form not found:', name);
        }
    });
    
    // Second pass: mark evolutions - find the closest obtainable pre-evolution
    Object.keys(pokemons).forEach(name => {
        if (pokemons[name].obtainedIn) return; // Already has direct obtainability
        
        const familyId = evolutionFamilies[name];
        if (familyId === undefined) return;
        
        // Find obtainable pre-evolution by walking back the chain
        let obtainablePreEvo = null;
        let current = name;
        
        // Walk back through pre-evolutions
        while (evolutionRelations.evolvesFrom[current]) {
            const preEvo = evolutionRelations.evolvesFrom[current];
            if (pokemons[preEvo]?.obtainedIn && 
                pokemons[preEvo].obtainedIn !== 'unobtainable' && 
                pokemons[preEvo].obtainedIn !== 'evolve') {
                obtainablePreEvo = preEvo;
                break;
            }
            current = preEvo;
        }
        
        // Only mark as 'evolve' if we found an actual pre-evolution (walked back the chain)
        // Do NOT check all family members - that would incorrectly mark regional forms
        // like galarianMrmime as obtainable when only their evolution (mrRime) is available
        if (obtainablePreEvo && !pokemons[name].isSecret) {
            pokemons[name].obtainedIn = 'evolve';
            pokemons[name].obtainablePreEvo = obtainablePreEvo;
        }
    });
    
    // Third pass: mark unobtainable (skip secret Pokemon)
    Object.keys(pokemons).forEach(name => {
        if (!pokemons[name].obtainedIn && !pokemons[name].isSecret) {
            pokemons[name].obtainedIn = 'unobtainable';
        }
    });
    
    // Debug: Check final status of special Pokemon (using dynamic lists)
    const debugSpecialPkmn = [...(GAME_CONFIG.SECRET_POKEMON.length > 0 ? GAME_CONFIG.SECRET_POKEMON : ['missingno', 'f00', 'ghost', 'humanoid', 'secretOnix', 'secretAerodactly', 'secretKabutops']), 
                              ...(GAME_CONFIG.EVENT_FORMS.length > 0 ? GAME_CONFIG.EVENT_FORMS : ['emolgaEvent', 'tangelaEvent', 'snoruntEvent'])];
    debugSpecialPkmn.forEach(name => {
        if (pokemons[name]) {
            // Final status
        }
    });
}

function buildDroppableItems() {
    droppableItems = {};
    rewardableItems = {}; // Items from event rewards
    
    Object.entries(areas).forEach(([areaName, a]) => {
        // Regular drops
        const addDrop = (itemName, rarity) => {
            if (!droppableItems[itemName]) droppableItems[itemName] = [];
            droppableItems[itemName].push({ area: areaName, rarity, level: a.level });
        };
        a.drops.common.forEach(i => addDrop(i, 'common'));
        a.drops.uncommon.forEach(i => addDrop(i, 'uncommon'));
        a.drops.rare.forEach(i => addDrop(i, 'rare'));
        
        // Event rewards
        if (a.rewards && a.rewards.items) {
            a.rewards.items.forEach(itemName => {
                if (!rewardableItems[itemName]) rewardableItems[itemName] = [];
                rewardableItems[itemName].push({ area: areaName, level: a.level, displayName: a.displayName });
            });
        }
    });
    
    // Apricorn drops from T3/T4 raids (v3.9) - use computed apricorn color from ticketIndex
    Object.entries(areas).forEach(([areaName, a]) => {
        if (a.type === 'event' && a.apricornColor) {
            if (!droppableItems[a.apricornColor]) droppableItems[a.apricornColor] = [];
            const rarity = a.difficulty >= 600 ? 'common' : 'uncommon';
            droppableItems[a.apricornColor].push({ area: areaName, rarity, level: a.difficulty || a.level, isRaid: true });
        }
    });
}

async function loadData(force = false) {
    // loadData called
    try {
        // Check for DB version change and force reload if needed
        const currentDBVersion = CONFIG.dbName;
        const storedDBVersion = localStorage.getItem('pokechill_db_version');
        if (storedDBVersion && storedDBVersion !== currentDBVersion) {
            console.log(`[loadData] DB version changed from ${storedDBVersion} to ${currentDBVersion}, forcing reload...`);
            localStorage.setItem('pokechill_db_version', currentDBVersion);
            window.location.reload(true);
            return;
        }
        localStorage.setItem('pokechill_db_version', currentDBVersion);
        
        const ls = document.getElementById('loading-screen'), app = document.getElementById('app');
        // Elements found
        ls.style.display = 'flex'; app.classList.remove('loaded');
        document.getElementById('loading-error').style.display = 'none';
        document.getElementById('retry-btn').style.display = 'none';
        document.querySelector('.loading-spinner').style.display = 'block';
    
        let fromCache = false;
        let pkmnContent = '';
        let areasContent = '';
        let exploreContent = '';
        if (!force) {
            updateLoadingUI(t('checkingCache'), 10);
            try {
                const cached = await getFromDB('parsedDataV19');
                if (cached?.abilities && Object.keys(cached.abilities).length > 0) {
                    updateLoadingUI(t('loadingCache'), 50);
                    abilities = cached.abilities; moves = cached.moves; pokemons = cached.pokemons; 
                    items = cached.items; areas = cached.areas || {}; trainers = cached.trainers || {};
                    shopItems = cached.shopItems || {}; decorItems = cached.decorItems || {}; 
                    shopDecorItems = cached.shopDecorItems || [];
                    skills = cached.skills || {};
                    window.fieldEffectsData = cached.fields || {};
                    signatureMoves = new Set(cached.signatureMoves || []);
                    pkmnContent = cached.pkmnContent || '';
                    areasContent = cached.areasContent || '';
                    exploreContent = cached.exploreContent || '';
                    // Restore game constants from cache
                    if (cached.gameConstants) {
                        T4_BASE = cached.gameConstants.T4_BASE || T4_BASE;
                        EVOLUTION_LEVELS = cached.gameConstants.EVOLUTION_LEVELS || EVOLUTION_LEVELS;
                        ROTATION_MAX = cached.gameConstants.ROTATION_MAX || ROTATION_MAX;
                        EVENT_NAMES = cached.gameConstants.EVENT_NAMES || EVENT_NAMES;
                    }
                    // Restore damage calc data from cache
                    if (cached.PARSED_MOVE_DAMAGE_DATA) {
                        Object.assign(PARSED_MOVE_DAMAGE_DATA, cached.PARSED_MOVE_DAMAGE_DATA);
                    }
                    if (cached.PARSED_ITEM_DAMAGE_FORMULAS) {
                        Object.assign(PARSED_ITEM_DAMAGE_FORMULAS, cached.PARSED_ITEM_DAMAGE_FORMULAS);
                    }
                    // Restore cooking ingredients from cache
                    if (cached.INGREDIENTS) {
                        GAME_CONFIG.INGREDIENTS = cached.INGREDIENTS;
                    }
                    // Restore star signs from cache
                    if (cached.STAR_SIGNS) {
                        GAME_CONFIG.STAR_SIGNS = cached.STAR_SIGNS;
                    }
                    // Restore natures from cache
                    if (cached.NATURES) {
                        GAME_CONFIG.NATURES = cached.NATURES;
                    }
                    // Restore TYPES from cache or rebuild from moves
                    if (cached.TYPES && cached.TYPES.length > 0) {
                        TYPES = cached.TYPES;
                        GAME_CONFIG.TYPES = cached.TYPES;
                    } else {
                        // Rebuild TYPES from cached moves
                        const foundTypes = new Set();
                        Object.values(moves).forEach(m => { if (m.type) foundTypes.add(m.type); });
                        TYPES = [...foundTypes].sort();
                        GAME_CONFIG.TYPES = TYPES;
                    }
                    // Restore ADDABLE_TYPES from cache
                    if (cached.ADDABLE_TYPES) {
                        GAME_CONFIG.ADDABLE_TYPES = cached.ADDABLE_TYPES;
                    }
                    fromCache = true;
                    // Migrate cached moves missing new properties (affectedBy, unaffectedBy, buildup, isEggMove, hasWeatherChange)
                    for (const mv of Object.values(moves)) {
                        if (!mv.affectedBy) mv.affectedBy = [];
                        if (!mv.unaffectedBy) mv.unaffectedBy = [];
                        if (mv.buildup === undefined) mv.buildup = null;
                        if (mv.isEggMove === undefined) mv.isEggMove = false;
                        if (mv.hasWeatherChange === undefined) mv.hasWeatherChange = false;
                        // Apply new auto-ability effects for cached moves
                        // Technician: power <= 60
                        if (mv.power && mv.power > 0 && mv.power <= 60 && !mv.affectedBy.includes('technician')) {
                            mv.affectedBy.push('technician');
                        }
                        // Serene Grace: moves with hitEffect that have RNG (random chance)
                        if (mv.hasHitEffect && mv.info && mv.info.includes('%') && !mv.affectedBy.includes('sereneGrace')) {
                            // Check if it's a stat-boosting move (Dragon Dance, Swords Dance, etc.)
                            const isStatBoostMove = mv.info.match(/(Raises|Lowers|Increases|Decreases|Boosts)\s+(Attack|Defense|Sp\.\s*Atk|Sp\.\s*Def|Speed)/i);
                            
                            // Check if it's a guaranteed effect (100% without damage)
                            const isGuaranteedEffect = mv.info.includes('100%') && !mv.info.match(/\d+\s+damage/i);
                            
                            // Check if it has an actual RNG/chance effect (not just stat boosts)
                            const hasChanceEffect = mv.info.match(/\d+%\s+chance/i) || mv.info.match(/may|might|rng/i);
                            
                            // Only add Serene Grace if it has a chance effect and is not just stat boosts
                            if (hasChanceEffect && !isStatBoostMove && !isGuaranteedEffect) {
                                mv.affectedBy.push('sereneGrace');
                            }
                        }
                        // Skill Link: multihit with variable hits
                        if (mv.multihit && mv.multihit[1] > mv.multihit[0] && !mv.affectedBy.includes('skillLink')) {
                            mv.affectedBy.push('skillLink');
                        }
                        // Clima Tact: hasWeatherChange
                        if (mv.hasWeatherChange && !mv.affectedBy.includes('climaTact')) {
                            mv.affectedBy.push('climaTact');
                        }
                    }
                    // Mark egg moves from pokemon data and build reverse mapping (for cached data)
                    window.eggMoveToPokemon = {};
                    Object.values(pokemons).forEach(p => {
                        if (p.eggMove && moves[p.eggMove]) {
                            moves[p.eggMove].isEggMove = true;
                            if (!window.eggMoveToPokemon[p.eggMove]) {
                                window.eggMoveToPokemon[p.eggMove] = [];
                            }
                            window.eggMoveToPokemon[p.eggMove].push(p.name);
                        }
                    });
                    // Build reverse mapping for signature moves (for cached data)
                    window.signatureMoveToPokemon = {};
                    Object.values(pokemons).forEach(p => {
                        // Only add if it's actually a move, not an ability (game data bug fix)
                        if (p.signature && moves[p.signature] && !abilities[p.signature]) {
                            if (!window.signatureMoveToPokemon[p.signature]) {
                                window.signatureMoveToPokemon[p.signature] = [];
                            }
                            window.signatureMoveToPokemon[p.signature].push(p.name);
                        }
                    });
                    // Migrate cached items missing new properties
                    for (const it of Object.values(items)) {
                        if (it.genetics === undefined) it.genetics = false;
                        if (it.vitamin === undefined) it.vitamin = false;
                        if (it.usable === undefined) it.usable = false;
                        if (it.rotation === undefined) it.rotation = false;
                        if (it.isEvent === undefined) it.isEvent = false;
                        if (it.type === undefined) it.type = '';
                        // Resolve memory images from cache (may have stale ability-name-based images)
                        if (it.type === 'memory' && it.ability) {
                            let img = 'dark';
                            if (it.memoryTypings && it.memoryTypings.length > 0 && it.memoryTypings[0] !== 'normal') {
                                img = it.memoryTypings[0];
                            } else if (abilities[it.ability]) {
                                const aTypes = abilities[it.ability].types || abilities[it.ability].type || [];
                                const firstType = Array.isArray(aTypes) ? aTypes[0] : aTypes;
                                if (firstType && firstType !== 'all' && firstType !== 'normal') img = firstType;
                            }
                            it.memoryImage = img;
                        }
                    }
                    // Assign apricorn currencies to cached memories
                    const apricornTypesCache = ['yellowApricorn', 'pinkApricorn', 'greenApricorn', 'whiteApricorn'];
                    let memIdxCache = 0;
                    for (const it of Object.values(items)) {
                        if (it.type === 'memory') {
                            it.apricornCurrency = apricornTypesCache[memIdxCache % 3];
                            memIdxCache++;
                        }
                    }
                    // Migrate cached areas missing new properties
                    for (const ar of Object.values(areas)) {
                        if (!ar.fieldEffects) ar.fieldEffects = [];
                        if (ar.timed === undefined) ar.timed = null;
                        if (ar.seasonDates === undefined) ar.seasonDates = null;
                    }
                    // Migrate: shop items missing iconImg
                    for (const si of Object.values(shopItems)) {
                        if (!si.iconImg) {
                            si.iconImg = itemImg(si.currency === 'bottleCap' ? 'bottleCap' : 
                    si.currency === 'goldenBottleCap' ? 'goldenBottleCap' : 
                    si.currency === 'yellowApricorn' ? 'yellowApricorn' :
                    si.currency === 'pinkApricorn' ? 'pinkApricorn' :
                    si.currency === 'greenApricorn' ? 'greenApricorn' :
                    si.currency === 'whiteApricorn' ? 'whiteApricorn' : si.currency);
                        }
                    }
                    // Migrate: decor items and shop decor items may be missing from old cache
                    if (!decorItems) decorItems = {};
                    if (!shopDecorItems) shopDecorItems = [];
                }
            } catch (cacheErr) {
                console.warn('Cache read failed:', cacheErr);
            }
        }
        if (force || !fromCache) {
            const rf = {};
            for (let i = 0; i < CONFIG.files.length; i++) {
                updateLoadingUI(`${t('downloading')} ${i+1}/${CONFIG.files.length}...`, 20 + (i/CONFIG.files.length)*50);
                rf[CONFIG.files[i].name] = await fetchFile(CONFIG.files[i]);
            }
            updateLoadingUI(t('parsing'), 80);
            signatureMoves = new Set();
            // Parse game constants dynamically from source files
            parseGameConstants(rf.moveDictionary, rf.pkmnDictionary, rf.areasDictionary, rf.explore || '');
            abilities = parseAbilities(rf.moveDictionary);
            moves = parseMoves(rf.moveDictionary);
            pokemons = parsePokemon(rf.pkmnDictionary);
            pkmnContent = rf.pkmnDictionary;
            areasContent = rf.areasDictionary;
            exploreContent = rf.explore || '';
            items = parseItems(rf.itemDictionary);
            
            // Parse damage calculation data from game files
            updateParsedDamageData(rf.itemDictionary, rf.moveDictionary);
            // Resolve memory images and assign apricorn currencies
            const apricornTypes = ['yellowApricorn', 'pinkApricorn', 'greenApricorn'];
            let memIdx = 0;
            for (const it of Object.values(items)) {
                if (it.type !== 'memory') continue;
                // Resolve image: typings[0] > ability.type[0] > "dark"
                if (!it.memoryImage) {
                    let img = 'dark';
                    if (it.memoryTypings && it.memoryTypings.length > 0 && it.memoryTypings[0] !== 'normal') {
                        img = it.memoryTypings[0];
                    } else if (it.ability && abilities[it.ability]) {
                        const aTypes = abilities[it.ability].types || abilities[it.ability].type || [];
                        const firstType = Array.isArray(aTypes) ? aTypes[0] : aTypes;
                        if (firstType && firstType !== 'all' && firstType !== 'normal') img = firstType;
                    }
                    it.memoryImage = img;
                }
                // Assign apricorn currency: distribute evenly across 3 types (matches game's 3 slots per currency)
                it.apricornCurrency = apricornTypes[memIdx % 3];
                memIdx++;
            }
            decorItems = parseDecor(rf.itemDictionary);
            shopDecorItems = parseShopDecor(rf.shop);
            const areaData = parseAreas(rf.areasDictionary);
            areas = areaData.areas; trainers = areaData.trainers; skills = areaData.skills; window.fieldEffectsData = areaData.fields || {};
            // Compute apricorn colors for raids based on ticketIndex (matching game logic explore.js:456-466)
            {
                const eventsByRotCat = {};
                Object.keys(areas).forEach(name => {
                    const a = areas[name];
                    if (a.type !== 'event') return;
                    const key = `${a.rotation}_${a.category}`;
                    if (!eventsByRotCat[key]) eventsByRotCat[key] = [];
                    eventsByRotCat[key].push(name);
                });
                Object.values(eventsByRotCat).forEach(names => {
                    let ticketIndex = 0;
                    names.forEach(name => {
                        ticketIndex++;
                        const a = areas[name];
                        if (a.difficulty >= 200 && ticketIndex >= 3 && ticketIndex <= 8) {
                            const ci = ticketIndex % 3;
                            a.apricornColor = ci === 0 ? 'yellowApricorn' : ci === 1 ? 'pinkApricorn' : 'greenApricorn';
                        }
                    });
                });
            }
            shopItems = parseShop(rf.shop);
            // Mark signature moves
            signatureMoves.forEach(moveName => { if (moves[moveName]) moves[moveName].isSignature = true; });
            // Mark egg moves from explore.js (if available)
            if (GAME_CONFIG.EGG_MOVES) {
                GAME_CONFIG.EGG_MOVES.forEach(moveName => { if (moves[moveName]) moves[moveName].isEggMove = true; });
            }
            // Also mark egg moves from pokemon data and build reverse mapping
            window.eggMoveToPokemon = {}; // moveName -> [pokemon names]
            Object.values(pokemons).forEach(p => {
                if (p.eggMove && moves[p.eggMove]) {
                    moves[p.eggMove].isEggMove = true;
                    if (!window.eggMoveToPokemon[p.eggMove]) {
                        window.eggMoveToPokemon[p.eggMove] = [];
                    }
                    window.eggMoveToPokemon[p.eggMove].push(p.name);
                }
            });
            // Build reverse mapping for signature moves (for Replicator Upgrade E)
            window.signatureMoveToPokemon = {}; // moveName -> [pokemon names]
            Object.values(pokemons).forEach(p => {
                // Only add if it's actually a move, not an ability (game data bug fix)
                if (p.signature && moves[p.signature] && !abilities[p.signature]) {
                    if (!window.signatureMoveToPokemon[p.signature]) {
                        window.signatureMoveToPokemon[p.signature] = [];
                    }
                    window.signatureMoveToPokemon[p.signature].push(p.name);
                }
            });
            updateLoadingUI(t('saving'), 95);
            await saveToDB('parsedDataV19', { abilities, moves, pokemons, items, areas, trainers, shopItems, decorItems, shopDecorItems, signatureMoves: [...signatureMoves], skills, fields: window.fieldEffectsData, pkmnContent, areasContent, exploreContent, gameConstants: { T4_BASE, EVOLUTION_LEVELS, ROTATION_MAX, EVENT_NAMES }, TYPES, ADDABLE_TYPES: GAME_CONFIG.ADDABLE_TYPES, INGREDIENTS: GAME_CONFIG.INGREDIENTS, STAR_SIGNS: GAME_CONFIG.STAR_SIGNS, NATURES: GAME_CONFIG.NATURES, PARSED_MOVE_DAMAGE_DATA, PARSED_ITEM_DAMAGE_FORMULAS, timestamp: Date.now() });
        }
        // Build droppable items map and evolution families
        updateLoadingUI(t('buildingIndexes'), 96);
        buildDroppableItems();
        if (pkmnContent) buildEvolutionFamilies(pkmnContent);
        // Parse wildlife pool and frontier data for obtainability
        if (areasContent) {
            parseWildlifePool(areasContent);
            parseExclusiveFrontier(areasContent);
        }
        // Parse spiraling rewards for item obtainability
        // exploreContent available
        if (exploreContent) {
            parseSpiralingRewards(exploreContent);
        } else {
            console.warn('[Explorer] exploreContent is empty - Spiraling Tower items will not be available');
        }
        // Calculate obtainability for all Pokemon
        updateLoadingUI(t('calculatingObt'), 98);
        calculateObtainability();
        // Run validation after all data is parsed
        validateParsedData();
        dataLoaded = true; updateLoadingUI(t('done'), 100);
        setTimeout(() => {
            ls.style.display = 'none'; app.classList.add('loaded');
            applyI18n(); initDropdowns(); initSeasonDropdowns(); initAreaItems(); initEventItemDropdown(); initGeneticsDropdowns(); initDataLists(); updateDataInfo(); updateShopCategoryIcons(); initBuildBuilder(); initTeamBuilder(); initCompare(); initAccessoryTab(); renderAllDecor(); renderExchangeSecrets(); initGuide(); updateGuideTabVisibility();
            // Apply URL hash parameters if present, default to active otherwise
            const hashApplied = applyURLHash();
            if (!hashApplied) {
                switchToTab('active');
                renderActiveZones();
            }
            // Calculate rotations for the "Actif" tab
            calculateRotations();
        }, 300);
    } catch (e) { 
        console.error('LoadData error:', e); 
        console.error('Stack:', e.stack);
        showError(`Error: ${e.message}`); 
    }
}