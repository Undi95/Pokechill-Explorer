// ============ EXPORT TEAM AS IMAGE ============
// Helper: Get team data for export
function getTeamDataForExport() {
    return dreamTeam.map((slot, index) => {
        if (!slot.pokemon) return null;
        const pkmnData = pokemons[slot.pokemon];
        
        // Parse IVs: 
        // - From slot.ivs if exists (save import, user edited)
        // - From game data (pkmn) if in-game
        // - Fallback 6 for old JSON teams without IV data (perfect IVs)
        let ivs = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
        let hasIVSource = false;
        
        // 1. Try slot.ivs (from save import or user edit)
        if (slot.hasOwnProperty('ivs') && slot.ivs) {
            hasIVSource = true;
            ivs = {
                hp: parseInt(slot.ivs.hp ?? slot.ivs.HP ?? 0),
                atk: parseInt(slot.ivs.atk ?? slot.ivs.Attack ?? 0),
                def: parseInt(slot.ivs.def ?? slot.ivs.Defense ?? 0),
                satk: parseInt(slot.ivs.satk ?? slot.ivs.spa ?? slot.ivs.SpAtk ?? 0),
                sdef: parseInt(slot.ivs.sdef ?? slot.ivs.spd ?? slot.ivs.SpDef ?? 0),
                spe: parseInt(slot.ivs.spe ?? slot.ivs.Speed ?? 0)
            };
        }
        // 2. Try game data (pkmn global variable) - for current in-game team
        else if (typeof pkmn !== 'undefined' && pkmn && slot.pkmnId && pkmn[slot.pkmnId]?.ivs) {
            hasIVSource = true;
            ivs = { ...pkmn[slot.pkmnId].ivs };
        }
        // 3. Old JSON teams without IV data → perfect IVs (6)
        else if (!hasIVSource) {
            ivs = { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 };
        }
        
        // Ensure all values are numbers 0-6
        Object.keys(ivs).forEach(k => ivs[k] = Math.min(6, Math.max(0, isNaN(ivs[k]) ? 0 : ivs[k])));
        
        const ivTotal = ivs.hp + ivs.atk + ivs.def + ivs.satk + ivs.sdef + ivs.spe;
        const bst = pkmnData?.bst || { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
        
        // Get nature adjustments
        const natureName = slot.nature || null;
        const nature = natureName ? GAME_CONFIG.NATURES?.[natureName] : null;
        const natureAdjustments = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
        if (nature) {
            Object.entries(nature).forEach(([stat, mod]) => {
                if (stat === 'name') return;
                if (mod > 0) natureAdjustments[stat] = 1;
                if (mod < 0) natureAdjustments[stat] = -1;
            });
        }
        
        // Calculate real stats (formula from game: stars * 30 * (1.1 ^ IV))
        // where stars = stat rating (1-6) based on BST, adjusted by nature (+1 or -1)
        const realStats = {
            hp: Math.round((statToRating(bst.hp || 0) + natureAdjustments.hp) * 30 * Math.pow(1.1, ivs.hp)),
            atk: Math.round((statToRating(bst.atk || 0) + natureAdjustments.atk) * 30 * Math.pow(1.1, ivs.atk)),
            def: Math.round((statToRating(bst.def || 0) + natureAdjustments.def) * 30 * Math.pow(1.1, ivs.def)),
            satk: Math.round((statToRating(bst.satk || 0) + natureAdjustments.satk) * 30 * Math.pow(1.1, ivs.satk)),
            sdef: Math.round((statToRating(bst.sdef || 0) + natureAdjustments.sdef) * 30 * Math.pow(1.1, ivs.sdef)),
            spe: Math.round((statToRating(bst.spe || 0) + natureAdjustments.spe) * 30 * Math.pow(1.1, ivs.spe))
        };
        
        // Store nature info for display
        const natureDisplayName = natureName ? (GAME_CONFIG.NATURES[natureName]?.name?.[currentLang] || format(natureName)) : null;
        
        // Get ribbons from save data if available
        let ribbons = null;
        if (loadedSaveData && loadedSaveData[slot.pokemon] && loadedSaveData[slot.pokemon].ribbons) {
            ribbons = loadedSaveData[slot.pokemon].ribbons;
        }
        
        return {
            slot: index + 1,
            pokemon: slot.pokemon,
            displayName: pkmnData?.displayName || format(slot.pokemon),
            types: pkmnData?.types || [],
            sprite: slot.shiny ? spriteShiny(slot.pokemon) : sprite(slot.pokemon),
            shiny: slot.shiny,
            starSign: slot.starSign || null,
            nature: slot.nature || null,
            natureDisplayName: natureDisplayName,
            natureAdjustments: natureAdjustments,
            moves: slot.moves.map((m, i) => {
                if (!m) return null;
                const moveData = moves[m];
                return {
                    name: moveData?.displayName || format(m),
                    type: moveData?.type || 'normal'
                };
            }).filter(Boolean),
            ability: slot.ability ? (abilities[slot.ability]?.displayName || format(slot.ability)) : null,
            hiddenAbility: pkmnData?.hiddenAbility ? (abilities[pkmnData.hiddenAbility]?.displayName || format(pkmnData.hiddenAbility)) : null,
            item: slot.item ? (items[slot.item]?.displayName || format(slot.item)) : null,
            itemKey: slot.item || null, // Pour l'image
            ivs: ivs,
            ivTotal: ivTotal,
            bst: bst,
            realStats: realStats,
            ribbons: ribbons
        };
    }).filter(Boolean);
}

// Helper: Draw rounded rect
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Helper: Load image with CORS
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Main export function
function toggleExportDropdown() {
    const dropdown = document.getElementById('export-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Ferme le dropdown quand on clique ailleurs
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('export-dropdown');
    const btn = e.target.closest('.dropdown');
    if (!btn && dropdown) dropdown.style.display = 'none';
});

async function exportTeamAsImage(type) {
    const teamData = getTeamDataForExport();
    
    if (teamData.length === 0) {
        alert(t('gifEmptyTeam') || 'Votre équipe est vide ! Ajoutez des Pokémon d\'abord.');
        return;
    }
    
    // Ferme le dropdown
    document.getElementById('export-dropdown').style.display = 'none';
    
    if (type === 'mini') {
        await renderTeamGIFMiniature(teamData);
    } else {
        const customTitle = prompt(t('gifTitlePrompt') || 'Titre de l\'image:', t('gifDefaultTitle') || 'MON ÉQUIPE');
        if (customTitle === null) return;
        await renderTeamGIF(teamData, customTitle || (t('gifDefaultTitle') || 'MON ÉQUIPE'));
    }
}

// Core render function - design ultra stylé façon PC Box
async function renderTeamGIF(teamData, title) {
    const typeColors = {
        fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
        ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068',
        flying: '#A890F0', psychic: '#F85888', bug: '#A8B820', rock: '#B8A038',
        ghost: '#705898', dragon: '#7038F8', dark: '#705848', steel: '#B8B8D0',
        fairy: '#EE99AC', normal: '#A8A878'
    };
    
    const width = 1920;  // Full HD width
    const height = 1080; // Full HD height
    const cardsPerRow = 3;
    const cardWidth = 600;  
    const cardHeight = 450; // Plus haut pour stats avec labels
    const startX = 40;  
    const startY = 90;
    const gapX = 30;
    const gapY = 20;
    
    // Preload images (sprites + items + decors)
    const loadedImages = {};
    const loadedItems = {};
    const loadedRibbons = {};

    for (const slot of teamData) {
        if (slot.sprite) {
            try { loadedImages[slot.pokemon] = await loadImage(slot.sprite); } catch (e) {}
        }
        if (slot.itemKey) {
            const itemUrl = itemImg(slot.itemKey);
            try { loadedItems[slot.itemKey] = await loadImage(itemUrl); } catch (e) {}
        }
        // Charge les ribbons
        if (slot.ribbons && slot.ribbons.length > 0) {
            for (const ribbon of slot.ribbons) {
                if (!loadedRibbons[ribbon]) {
                    const ribbonUrl = `${CONFIG.repoBase}img/ribbons/${ribbon}.png`;
                    try { loadedRibbons[ribbon] = await loadImage(ribbonUrl); } catch (e) {}
                }
            }
        }
    }
    
    function renderFrame(bounceOffset, frameIndex) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { 
            alpha: false,  // Pas de canal alpha pour meilleure performance
            desynchronized: false // Synchronisé pour qualité maximale
        });
        
        // Antialiasing de qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Background gradient sombre
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#0c0c18');
        bgGrad.addColorStop(0.5, '#12121f');
        bgGrad.addColorStop(1, '#0a0a14');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        
        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px "Rajdhani", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,212,255,0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText(title.toUpperCase(), width / 2, 55);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText(`${teamData.length} POKÉMON • ${new Date().toLocaleDateString('fr-FR')}`, width / 2, 80);
        
        // Cards
        for (let i = 0; i < teamData.length; i++) {
            const col = i % cardsPerRow;
            const row = Math.floor(i / cardsPerRow);
            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);
            const slot = teamData[i];
            const primaryType = slot.types[0] || 'normal';
            const accentColor = typeColors[primaryType] || '#00d4ff';
            
            // Ombre portée
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;
            
            // Fond carte avec dégradé subtil
            const cardBg = ctx.createLinearGradient(x, y, x, y + cardHeight);
            cardBg.addColorStop(0, '#1e1e2e');
            cardBg.addColorStop(1, '#151520');
            ctx.fillStyle = cardBg;
            roundRect(ctx, x, y, cardWidth, cardHeight, 10);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // ─── Numéro de slot style tech ───
            const numX = x + 15;
            const numY = y + 22;
            // Fond numéro
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            roundRect(ctx, numX - 5, numY - 14, 32, 24, 4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            roundRect(ctx, numX - 5, numY - 14, 32, 24, 4);
            ctx.stroke();
            // Texte numéro
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Rajdhani", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${i + 1}`, numX + 11, numY);
            
            // ─── Division badge style tech ───
            const pkmnDiv = pokemons[slot.pokemon]?.division;
            if (pkmnDiv) {
                const divColors = {
                    'SSS': '#ff66ff', 'SS': '#ff8888', 'S': '#ffcc00', 
                    'A': '#aaff00', 'B': '#00ffaa', 'C': '#66ccff', 'D': '#aaaaaa'
                };
                const divColor = divColors[pkmnDiv] || '#ffffff';
                const divX = x + cardWidth - 40;
                const divY = y + 22;
                
                // Fond badge
                ctx.fillStyle = divColor + '20';
                roundRect(ctx, divX, divY - 14, 35, 24, 4);
                ctx.fill();
                ctx.strokeStyle = divColor + '60';
                ctx.lineWidth = 1.5;
                roundRect(ctx, divX, divY - 14, 35, 24, 4);
                ctx.stroke();
                
                // Glow
                ctx.shadowColor = divColor;
                ctx.shadowBlur = 10;
                ctx.fillStyle = divColor;
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(pkmnDiv, divX + 17, divY);
                ctx.shadowBlur = 0;
            }
            
            // ═══════════════════════════════════════════════════════════
            // BOX POKÉMON - DESIGN REMPLI & SOBRE
            // ═══════════════════════════════════════════════════════════
            
            const img = loadedImages[slot.pokemon];
            
            const pad = 18;
            const boxX = x + pad;
            const boxY = y + 48; // Descendu pour éviter le chevauchement avec #1
            const boxW = cardWidth - pad * 2;
            
            // ─── ZONE SPRITE (gauche-haut) ───
            const spriteBoxSize = 115;
            const spriteX = boxX;
            const spriteY = boxY;
            
            // Fond sprite avec scanlines tech
            const spriteGrad = ctx.createLinearGradient(spriteX, spriteY, spriteX, spriteY + spriteBoxSize);
            spriteGrad.addColorStop(0, '#0c0c14');
            spriteGrad.addColorStop(1, '#0a0a10');
            ctx.fillStyle = spriteGrad;
            roundRect(ctx, spriteX, spriteY, spriteBoxSize, spriteBoxSize, 8);
            ctx.fill();
            
            // Grid tech visible
            ctx.strokeStyle = 'rgba(0,212,255,0.15)';
            ctx.lineWidth = 1.5;
            for (let gx = spriteX + 15; gx < spriteX + spriteBoxSize; gx += 23) {
                ctx.beginPath(); ctx.moveTo(gx, spriteY); ctx.lineTo(gx, spriteY + spriteBoxSize); ctx.stroke();
            }
            for (let gy = spriteY + 15; gy < spriteY + spriteBoxSize; gy += 23) {
                ctx.beginPath(); ctx.moveTo(spriteX, gy); ctx.lineTo(spriteX + spriteBoxSize, gy); ctx.stroke();
            }
            
            // Scanlines horizontales
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            for (let i = 0; i < spriteBoxSize; i += 3) {
                ctx.fillRect(spriteX, spriteY + i, spriteBoxSize, 1);
            }
            
            // Cadre tech autour du sprite
            ctx.strokeStyle = accentColor + '50';
            ctx.lineWidth = 3;
            roundRect(ctx, spriteX - 3, spriteY - 3, spriteBoxSize + 6, spriteBoxSize + 6, 10);
            ctx.stroke();
            
            // Coins tech (style circuit)
            const cornerL = 12;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 2;
            // Haut-gauche
            ctx.beginPath();
            ctx.moveTo(spriteX - 3, spriteY - 3 + cornerL);
            ctx.lineTo(spriteX - 3, spriteY - 3);
            ctx.lineTo(spriteX - 3 + cornerL, spriteY - 3);
            ctx.stroke();
            // Haut-droite
            ctx.beginPath();
            ctx.moveTo(spriteX + spriteBoxSize + 3 - cornerL, spriteY - 3);
            ctx.lineTo(spriteX + spriteBoxSize + 3, spriteY - 3);
            ctx.lineTo(spriteX + spriteBoxSize + 3, spriteY - 3 + cornerL);
            ctx.stroke();
            // Bas-gauche
            ctx.beginPath();
            ctx.moveTo(spriteX - 3, spriteY + spriteBoxSize + 3 - cornerL);
            ctx.lineTo(spriteX - 3, spriteY + spriteBoxSize + 3);
            ctx.lineTo(spriteX - 3 + cornerL, spriteY + spriteBoxSize + 3);
            ctx.stroke();
            // Bas-droite
            ctx.beginPath();
            ctx.moveTo(spriteX + spriteBoxSize + 3 - cornerL, spriteY + spriteBoxSize + 3);
            ctx.lineTo(spriteX + spriteBoxSize + 3, spriteY + spriteBoxSize + 3);
            ctx.lineTo(spriteX + spriteBoxSize + 3, spriteY + spriteBoxSize + 3 - cornerL);
            ctx.stroke();
            
            // Sprite avec bounce + Star Sign hue rotate
            if (img) {
                ctx.imageSmoothingEnabled = false;
                const sSize = 95;
                
                // Apply Star Sign hue rotate if starSign
                if (slot.starSign && GAME_CONFIG.STAR_SIGNS[slot.starSign]) {
                    const hue = GAME_CONFIG.STAR_SIGNS[slot.starSign].hue;
                    ctx.save();
                    ctx.filter = `hue-rotate(${hue}deg)`;
                    ctx.drawImage(img, spriteX + 10, spriteY + 10 + bounceOffset, sSize, sSize);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, spriteX + 10, spriteY + 10 + bounceOffset, sSize, sSize);
                }
            }
            
            // Étoile shiny
            if (slot.shiny) {
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 12;
                ctx.font = 'bold 20px Arial';
                ctx.fillText('★', spriteX + spriteBoxSize - 24, spriteY + 24);
                ctx.shadowBlur = 0;
            }
            
            // ─── MÉDAILLES (ribbons) ───
            if (slot.ribbons && slot.ribbons.length > 0) {
                const ribbonSize = 32; // x2 taille
                let ribbonX = spriteX;
                let ribbonY = spriteY + spriteBoxSize + 8;
                
                // Affiche les ribbons en ligne sous la box
                for (let i = 0; i < slot.ribbons.length; i++) {
                    const ribbonName = slot.ribbons[i];
                    if (loadedRibbons[ribbonName]) {
                        ctx.drawImage(loadedRibbons[ribbonName], ribbonX + i * (ribbonSize + 4), ribbonY, ribbonSize, ribbonSize);
                    }
                }
            }
            
            // ─── COLONNE INFOS (milieu-haut) ───
            let infoX = spriteX + spriteBoxSize + 15;
            let infoY = boxY + 5;
            
            // Nom
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 26px "Rajdhani", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(slot.displayName, infoX, infoY);
            
            // Types
            infoY += 22;
            slot.types.forEach((type, tIdx) => {
                const tColor = typeColors[type] || '#666';
                const tX = infoX + tIdx * 68;
                ctx.fillStyle = tColor;
                roundRect(ctx, tX, infoY, 64, 22, 3);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(type.toUpperCase(), tX + 32, infoY + 15);
            });
            
            // ─── Indicateurs de type animés (2 frames) ───
            const indY = infoY + 8;
            const indX = infoX + 170;
            const indSize = 5;
            
            if (slot.types.length === 1) {
                // Monotype : 2 LEDs de la même couleur (fixe)
                const tColor = typeColors[slot.types[0]];
                ctx.fillStyle = tColor;
                ctx.shadowColor = tColor;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(indX, indY, indSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(indX + 12, indY, indSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                // Double type : alterne entre les 2 couleurs sur chaque frame
                const tColor1 = typeColors[slot.types[0]];
                const tColor2 = typeColors[slot.types[1]];
                
                // Frame 0 : LED1=Type1, LED2=Type2 | Frame 1 : LED1=Type2, LED2=Type1
                const color1 = frameIndex === 0 ? tColor1 : tColor2;
                const color2 = frameIndex === 0 ? tColor2 : tColor1;
                
                ctx.fillStyle = color1;
                ctx.shadowColor = color1;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(indX, indY, indSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                ctx.fillStyle = color2;
                ctx.shadowColor = color2;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(indX + 12, indY, indSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            // Barre IV Total ROUGE
            infoY += 32;
            const barW = 145;
            const barH = 22;
            const ivPercent = slot.ivTotal / 36;
            
            // Fond avec bordure
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            roundRect(ctx, infoX, infoY, barW, barH, 11);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,100,100,0.3)';
            ctx.lineWidth = 1;
            roundRect(ctx, infoX, infoY, barW, barH, 11);
            ctx.stroke();
            
            // Remplissage gradient ROUGE
            if (ivPercent > 0) {
                const barGrad = ctx.createLinearGradient(infoX, infoY, infoX + barW * ivPercent, infoY);
                barGrad.addColorStop(0, '#cc0000');
                barGrad.addColorStop(0.5, '#ff4444');
                barGrad.addColorStop(1, '#ff8888');
                ctx.fillStyle = barGrad;
                roundRect(ctx, infoX + 2, infoY + 2, (barW - 4) * ivPercent, barH - 4, 9);
                ctx.fill();
            }
            
            // Étoiles centrées
            ctx.fillStyle = ivPercent > 0.3 ? '#ffffff' : '#ffaaaa';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText('★'.repeat(Math.ceil(slot.ivTotal / 6)) + '☆'.repeat(6 - Math.ceil(slot.ivTotal / 6)), infoX + barW/2, infoY + 15);
            ctx.shadowBlur = 0;
            
            // Total /36
            ctx.fillStyle = '#ff8888';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${slot.ivTotal}/36`, infoX + barW + 10, infoY + 16);
            
            // ─── TALENT, TC, OBJET (cadres noir translucide + bordure colorée) ───
            infoY += 28;
            const lineH = 26;
            const boxInnerW = 200;
            
            // TALENT (cyan border)
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            roundRect(ctx, infoX, infoY, boxInnerW, lineH, 5);
            ctx.fill();
            ctx.strokeStyle = '#00b4d8';
            ctx.lineWidth = 1.5;
            roundRect(ctx, infoX, infoY, boxInnerW, lineH, 5);
            ctx.stroke();
            ctx.fillStyle = '#00b4d8';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(t('gifLabelTalent') || 'TALENT', infoX + 10, infoY + 17);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(slot.ability?.substring(0, 16) || '-', infoX + 55, infoY + 17);
            
            // TC (vert border)
            if (slot.hiddenAbility && slot.hiddenAbility !== slot.ability) {
                infoY += 30;
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                roundRect(ctx, infoX, infoY, boxInnerW, lineH, 5);
                ctx.fill();
                ctx.strokeStyle = '#00cc66';
                ctx.lineWidth = 1.5;
                roundRect(ctx, infoX, infoY, boxInnerW, lineH, 5);
                ctx.stroke();
                ctx.fillStyle = '#00cc66';
                ctx.font = 'bold 10px Arial';
                ctx.fillText(t('haShort') || 'HA', infoX + 10, infoY + 17);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(slot.hiddenAbility.substring(0, 18), infoX + 35, infoY + 17);
            }
            
            // OBJET (or border)
            infoY += 30;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            roundRect(ctx, infoX, infoY, boxInnerW, lineH, 5);
            ctx.fill();
            ctx.strokeStyle = '#ddbb00';
            ctx.lineWidth = 1.5;
            roundRect(ctx, infoX, infoY, boxInnerW, lineH, 5);
            ctx.stroke();
            ctx.fillStyle = '#ddbb00';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(t('gifLabelItem') || 'OBJET', infoX + 10, infoY + 17);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(slot.item ? slot.item.substring(0, 14) : (t('gifLabelNone') || 'Aucun'), infoX + 55, infoY + 17);
            
            // Icône de l'objet
            if (slot.itemKey && loadedItems[slot.itemKey]) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(loadedItems[slot.itemKey], infoX + 172, infoY + 3, 20, 20);
            }
            
            // ─── Ligne tech décorative ───
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(infoX + 20, infoY + 35);
            ctx.lineTo(infoX + boxInnerW - 20, infoY + 35);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // ─── BADGE NATURE (sous l'objet) ───
            if (slot.natureDisplayName) {
                const natureText = slot.natureDisplayName;
                const badgePadding = 8;
                const badgeH = 20;
                const badgeMarginTop = 8; // Espace entre objet et nature
                const badgeX = infoX; // Aligné avec les cadres du dessus
                const badgeY = infoY + 35 + badgeMarginTop;
                const badgeW = boxInnerW; // Même largeur que les cadres du dessus
                
                // Fond du badge avec gradient subtil
                const natureGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
                natureGrad.addColorStop(0, 'rgba(130, 219, 164, 0.25)');
                natureGrad.addColorStop(1, 'rgba(130, 219, 164, 0.15)');
                ctx.fillStyle = natureGrad;
                roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
                ctx.fill();
                
                // Bordure brillante
                ctx.strokeStyle = '#82dba4';
                ctx.lineWidth = 1.5;
                roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
                ctx.stroke();
                
                // Icône feuille/nature centrée verticalement
                ctx.fillStyle = '#82dba4';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('◆', badgeX + 10, badgeY + 14);
                
                // Texte de la nature (centré verticalement)
                ctx.fillStyle = '#82dba4';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(natureText, badgeX + 25, badgeY + 14);
            }
            
            // ─── CADRE ATTAQUES STYLÉ ───
            const movesBoxX = x + cardWidth - 170;
            const movesBoxY = boxY + 5;
            const movesBoxW = 155;
            const movesBoxH = 175;
            
            // Ombre portée
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            
            // Fond principal avec effet tech
            const movesGrad = ctx.createLinearGradient(movesBoxX, movesBoxY, movesBoxX, movesBoxY + movesBoxH);
            movesGrad.addColorStop(0, 'rgba(25,25,35,0.7)');
            movesGrad.addColorStop(1, 'rgba(15,15,25,0.5)');
            ctx.fillStyle = movesGrad;
            roundRect(ctx, movesBoxX, movesBoxY, movesBoxW, movesBoxH, 12);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // Lignes tech décoratives
            ctx.strokeStyle = 'rgba(0,212,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(movesBoxX + 12, movesBoxY + 28);
            ctx.lineTo(movesBoxX + movesBoxW - 12, movesBoxY + 28);
            ctx.stroke();
            
            // Header "ATTAQUES" stylé
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 12px "Rajdhani", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t('gifLabelMoves') || 'ATTAQUES', movesBoxX + movesBoxW/2, movesBoxY + 22);
            
            // 4 lignes d'attaques
            let movesY = movesBoxY + 35;
            slot.moves.forEach((move, mIdx) => {
                if (mIdx >= 4) return;
                const mColor = typeColors[move.type] || '#666';
                
                // Fond carte attaque
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                roundRect(ctx, movesBoxX + 8, movesY, movesBoxW - 16, 32, 6);
                ctx.fill();
                
                // Bordure colorée
                ctx.strokeStyle = mColor + '60';
                ctx.lineWidth = 1;
                roundRect(ctx, movesBoxX + 8, movesY, movesBoxW - 16, 32, 6);
                ctx.stroke();
                
                // Barre colorée gauche
                ctx.fillStyle = mColor;
                ctx.fillRect(movesBoxX + 8, movesY, 4, 32);
                
                // Pastille type avec glow
                ctx.fillStyle = mColor;
                ctx.shadowColor = mColor;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(movesBoxX + 24, movesY + 16, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Nom attaque
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(move.name.substring(0, 14), movesBoxX + 38, movesY + 20);
                
                movesY += 34;
            });

            
            // ─── STATS TABLEAU - LABELS EN HAUT BIEN VISIBLES ───
            const statsY = y + cardHeight - 145;
            const rowH = 34;
            const leftMargin = 45;
            
            const statLabels = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
            const statKeys = ['hp', 'atk', 'def', 'satk', 'sdef', 'spe'];
            const statSpacing = (boxW - leftMargin) / 6;
            
            // HEADER: Labels des stats en haut bien visibles
            const headerY = statsY - 5;
            statLabels.forEach((label, idx) => {
                const sX = boxX + leftMargin + idx * statSpacing + statSpacing/2;
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(label, sX, headerY);
            });
            
            // LIGNE 1: STATS RÉELLES avec fond tech
            const actGrad = ctx.createLinearGradient(boxX, statsY, boxX + boxW, statsY);
            actGrad.addColorStop(0, 'rgba(102,204,255,0.12)');
            actGrad.addColorStop(0.5, 'rgba(102,204,255,0.18)');
            actGrad.addColorStop(1, 'rgba(102,204,255,0.12)');
            ctx.fillStyle = actGrad;
            roundRect(ctx, boxX, statsY, boxW, rowH, 8);
            ctx.fill();
            
            // Scanlines subtile sur les stats
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            for (let i = 0; i < rowH; i += 3) {
                ctx.fillRect(boxX, statsY + i, boxW, 1);
            }
            
            // Label "ACT" vertical
            ctx.fillStyle = '#66ddff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(t('gifLabelAct') || 'ACT', boxX + 10, statsY + 22);
            
            statLabels.forEach((label, idx) => {
                const sX = boxX + leftMargin + idx * statSpacing + statSpacing/2;
                const realVal = slot.realStats[statKeys[idx]] || 0;
                const statKey = statKeys[idx];
                const adjustment = slot.natureAdjustments?.[statKey] || 0;
                
                // Colorer selon l'ajustement de nature
                if (adjustment > 0) {
                    ctx.fillStyle = '#00ff88'; // Vert pour boosté
                } else if (adjustment < 0) {
                    ctx.fillStyle = '#ff6666'; // Rouge pour réduit
                } else {
                    ctx.fillStyle = '#66ddff'; // Bleu par défaut
                }
                
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(realVal.toString(), sX, statsY + 24);
            });
            
            // LIGNE 2: BST + étoiles colorées selon la nature
            const row2Y = statsY + rowH + 3;
            
            ctx.fillStyle = '#88aabb';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(t('gifLabelBst') || 'BST', boxX + 10, row2Y + 18);
            
            // Get nature-colored stars
            const bstStars = getNatureColoredStars(slot.bst, slot.nature);
            
            statLabels.forEach((label, idx) => {
                const sX = boxX + leftMargin + idx * statSpacing + statSpacing/2;
                const bstVal = slot.bst[statKeys[idx]] || 0;
                
                // Valeur BST
                ctx.fillStyle = '#88aabb';
                ctx.font = 'bold 15px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(bstVal.toString(), sX, row2Y + 20);
                
                // Étoiles colorées selon la nature (comme dans le jeu)
                const statKey = statKeys[idx];
                const starData = bstStars[statKey];
                
                // Draw each star individually with its color
                const starSize = 10;
                const starY = row2Y + 32;
                let starX = sX - (starData.final * starSize) / 2 + starSize/2;
                
                for (let i = 0; i < starData.final; i++) {
                    const isLast = i === starData.final - 1;
                    const isRed = starData.adjusted < 0 && isLast;
                    const isGreen = starData.adjusted > 0 && isLast;
                    
                    if (isGreen) {
                        ctx.fillStyle = '#00ff88'; // Vert pour boosté
                    } else if (isRed) {
                        ctx.fillStyle = '#ff4444'; // Rouge pour réduit
                    } else {
                        ctx.fillStyle = '#4488ff'; // Bleu pour neutre
                    }
                    
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('★', starX, starY);
                    starX += starSize;
                }
            });
            
            // LIGNE 3: IVs avec fond tech
            const row3Y = statsY + (rowH + 3) * 2;
            const ivGrad = ctx.createLinearGradient(boxX, row3Y, boxX + boxW, row3Y);
            ivGrad.addColorStop(0, 'rgba(255,85,85,0.1)');
            ivGrad.addColorStop(0.5, 'rgba(255,85,85,0.15)');
            ivGrad.addColorStop(1, 'rgba(255,85,85,0.1)');
            ctx.fillStyle = ivGrad;
            roundRect(ctx, boxX, row3Y, boxW, rowH, 8);
            ctx.fill();
            
            // Scanlines sur IVs
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            for (let i = 0; i < rowH; i += 3) {
                ctx.fillRect(boxX, row3Y + i, boxW, 1);
            }
            
            ctx.fillStyle = '#ff8888';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(t('gifLabelIv') || 'IV', boxX + 10, row3Y + 22);
            
            statLabels.forEach((label, idx) => {
                const sX = boxX + leftMargin + idx * statSpacing + statSpacing/2;
                const ivVal = slot.ivs[statKeys[idx]] || 0;
                ctx.fillStyle = '#ff6666';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('★'.repeat(ivVal) + '☆'.repeat(6 - ivVal), sX, row3Y + 24);
            });
            

        }
        
        // Footer
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(200, height - 40);
        ctx.lineTo(width - 200, height - 40);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PokeChill Explorer • pokechill-explorer.alwaysdata.net', width / 2, height - 18);
        
        return canvas;
    }
    
    // Générer les 2 frames
    const frame1 = renderFrame(0, 0);
    const frame2 = renderFrame(-4, 1);
    
    // Créer le GIF
    const gif = new GIF({
        workers: 2,
        quality: 1,           // 1 = meilleure qualité (pas de compression)
        width: width,
        height: height,
        workerScript: 'scripts/gif.worker.js',
        dither: false,        // Pas de dithering pour éviter changements de couleurs
        background: '#0a0a14', // Fond de couleur fixe
        transparent: null     // Pas de transparence (meilleure qualité couleurs)
    });
    
    gif.addFrame(frame1, { delay: 400 });
    gif.addFrame(frame2, { delay: 400 });
    
    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pokechill-team-${new Date().toISOString().split('T')[0]}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });
    
    gif.render();
}

// Miniature version - VRAI style HD condensé
async function renderTeamGIFMiniature(teamData) {
    // ═══ ULTRA COMPACT - 3 cartes/ligne, sans titre ═══
    const cardWidth = 480;
    const cardHeight = 222;
    const cardsPerRow = 3;
    const gapX = 22;
    const gapY = 22;
    const padding = 28;
    
    const width = (cardWidth * cardsPerRow) + (gapX * (cardsPerRow - 1)) + (padding * 2);
    const height = Math.ceil(teamData.length / cardsPerRow) * (cardHeight + gapY) + padding * 2 - 20;
    
    const typeColors = {
        fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
        ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068',
        flying: '#A890F0', psychic: '#F85888', bug: '#A8B820', rock: '#B8A038',
        ghost: '#705898', dragon: '#7038F8', dark: '#705848', steel: '#B8B8D0',
        fairy: '#EE99AC', normal: '#A8A878'
    };
    
    const loadedImages = {};
    const loadedItems = {};
    const loadedRibbons = {};
    
    for (const slot of teamData) {
        if (slot.sprite) {
            try { loadedImages[slot.pokemon] = await loadImage(slot.sprite); } catch (e) {}
        }
        if (slot.itemKey) {
            try { loadedItems[slot.itemKey] = await loadImage(itemImg(slot.itemKey)); } catch (e) {}
        }
        if (slot.ribbons) {
            for (const r of slot.ribbons) {
                if (!loadedRibbons[r]) {
                    try { loadedRibbons[r] = await loadImage(`${CONFIG.repoBase}img/ribbons/${r}.png`); } catch (e) {}
                }
            }
        }
    }
    
    function renderFrame(bounceOffset, frameIndex) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Fond
        ctx.fillStyle = '#0c0c18';
        ctx.fillRect(0, 0, width, height);
        
        // Cartes (pas de titre pour gagner de la place)
        for (let i = 0; i < teamData.length; i++) {
            const col = i % cardsPerRow;
            const row = Math.floor(i / cardsPerRow);
            const x = padding + col * (cardWidth + gapX);
            const y = 15 + row * (cardHeight + gapY);
            const slot = teamData[i];
            const primaryType = slot.types[0] || 'normal';
            const accentColor = typeColors[primaryType] || '#00d4ff';
            const pkmnData = pokemons[slot.pokemon];
            const bst = pkmnData?.bst || { hp: 3, atk: 3, def: 3, satk: 3, sdef: 3, spe: 3 };
            
            // Fond carte
            ctx.fillStyle = '#1e1e2e';
            roundRect(ctx, x, y, cardWidth, cardHeight, 12);
            ctx.fill();
            
            // Bordure accent
            ctx.strokeStyle = accentColor + '50';
            ctx.lineWidth = 2;
            roundRect(ctx, x, y, cardWidth, cardHeight, 12);
            ctx.stroke();
            
            // ═══ HEADER ═══
            // #1 en haut gauche
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            roundRect(ctx, x + 10, y + 10, 28, 18, 3);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            roundRect(ctx, x + 10, y + 10, 28, 18, 3);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`#${i + 1}`, x + 24, y + 23);
            
            // Division en haut droite
            if (pkmnData?.division) {
                const divColors = { 'SSS': '#ff66ff', 'SS': '#ff8888', 'S': '#ffcc00', 'A': '#aaff00', 'B': '#00ffaa', 'C': '#66ccff', 'D': '#aaaaaa' };
                const divColor = divColors[pkmnData.division] || '#fff';
                ctx.fillStyle = divColor + '20';
                roundRect(ctx, x + cardWidth - 40, y + 10, 30, 18, 3);
                ctx.fill();
                ctx.strokeStyle = divColor;
                ctx.lineWidth = 1;
                roundRect(ctx, x + cardWidth - 40, y + 10, 30, 18, 3);
                ctx.stroke();
                ctx.fillStyle = divColor;
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(pkmnData.division, x + cardWidth - 25, y + 22);
            }
            
            // ═══ NOM + NATURE + MÉDAILLES (collées au nom) ═══
            const nameX = x + 48;
            const nameY = y + 24;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "Rajdhani", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(slot.displayName.substr(0, 16), nameX, nameY);
            
            // Nom de la nature à côté du nom (si présente)
            let nameEndX = nameX + ctx.measureText(slot.displayName.substr(0, 16)).width + 8;
            if (slot.natureDisplayName) {
                ctx.fillStyle = '#82dba4';
                ctx.font = 'bold 11px "Rajdhani", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`[${slot.natureDisplayName}]`, nameEndX, nameY);
                nameEndX += ctx.measureText(`[${slot.natureDisplayName}]`).width + 8;
            }
            
            // Médailles à côté du nom/nature (plus grandes, bien calées)
            let ribbonX = nameEndX;
            if (slot.ribbons && slot.ribbons.length > 0) {
                for (const r of slot.ribbons) {
                    if (loadedRibbons[r]) {
                        ctx.drawImage(loadedRibbons[r], ribbonX, nameY - 14, 18, 18);
                        ribbonX += 20;
                    }
                }
            }
            
            // ═══ SPRITE (gauche) ═══
            const spriteBox = 100;
            const spriteX = x + 15;
            const spriteY = y + 40;
            
            // Fond sprite
            const spriteGrad = ctx.createLinearGradient(spriteX, spriteY, spriteX, spriteY + spriteBox);
            spriteGrad.addColorStop(0, '#0c0c14');
            spriteGrad.addColorStop(1, '#0a0a10');
            ctx.fillStyle = spriteGrad;
            roundRect(ctx, spriteX, spriteY, spriteBox, spriteBox, 6);
            ctx.fill();
            
            // Grid lines (plus visibles)
            ctx.strokeStyle = 'rgba(0,212,255,0.15)';
            ctx.lineWidth = 1;
            for (let gx = spriteX + 11; gx < spriteX + spriteBox; gx += 18) {
                ctx.beginPath(); ctx.moveTo(gx, spriteY); ctx.lineTo(gx, spriteY + spriteBox); ctx.stroke();
            }
            for (let gy = spriteY + 11; gy < spriteY + spriteBox; gy += 18) {
                ctx.beginPath(); ctx.moveTo(spriteX, gy); ctx.lineTo(spriteX + spriteBox, gy); ctx.stroke();
            }
            
            // CADRE tech autour du sprite (style miniature sobre)
            ctx.strokeStyle = accentColor + '60';
            ctx.lineWidth = 2;
            roundRect(ctx, spriteX - 1, spriteY - 1, spriteBox + 2, spriteBox + 2, 8);
            ctx.stroke();
            
            // Coins tech du sprite box
            const cornerSize = 8;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 2;
            // Haut gauche
            ctx.beginPath(); ctx.moveTo(spriteX - 1, spriteY - 1 + cornerSize); ctx.lineTo(spriteX - 1, spriteY - 1); ctx.lineTo(spriteX - 1 + cornerSize, spriteY - 1); ctx.stroke();
            // Haut droit
            ctx.beginPath(); ctx.moveTo(spriteX + spriteBox + 1 - cornerSize, spriteY - 1); ctx.lineTo(spriteX + spriteBox + 1, spriteY - 1); ctx.lineTo(spriteX + spriteBox + 1, spriteY - 1 + cornerSize); ctx.stroke();
            // Bas gauche
            ctx.beginPath(); ctx.moveTo(spriteX - 1, spriteY + spriteBox + 1 - cornerSize); ctx.lineTo(spriteX - 1, spriteY + spriteBox + 1); ctx.lineTo(spriteX - 1 + cornerSize, spriteY + spriteBox + 1); ctx.stroke();
            // Bas droit
            ctx.beginPath(); ctx.moveTo(spriteX + spriteBox + 1 - cornerSize, spriteY + spriteBox + 1); ctx.lineTo(spriteX + spriteBox + 1, spriteY + spriteBox + 1); ctx.lineTo(spriteX + spriteBox + 1, spriteY + spriteBox + 1 - cornerSize); ctx.stroke();
            
            // Sprite avec hue-rotate pour Star Sign
            const img = loadedImages[slot.pokemon];
            if (img) {
                ctx.imageSmoothingEnabled = false;
                const sSize = 82;
                
                // Apply hue-rotate for Star Sign
                if (slot.starSign && GAME_CONFIG.STAR_SIGNS[slot.starSign]) {
                    const hue = GAME_CONFIG.STAR_SIGNS[slot.starSign].hue;
                    ctx.save();
                    ctx.filter = `hue-rotate(${hue}deg)`;
                    ctx.drawImage(img, spriteX + 9, spriteY + 9 + bounceOffset, sSize, sSize);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, spriteX + 9, spriteY + 9 + bounceOffset, sSize, sSize);
                }
            }
            
            // Shiny star
            if (slot.shiny) {
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 8;
                ctx.font = 'bold 16px Arial';
                ctx.fillText('★', spriteX + spriteBox - 18, spriteY + 20);
                ctx.shadowBlur = 0;
            }
            
            // ═══ COLONNE CENTRE (Infos) ═══
            const centerX = spriteX + spriteBox + 18;
            let centerY = y + 42;
            
            // Types (lisibles)
            if (slot.types.length >= 1) {
                ctx.fillStyle = typeColors[slot.types[0]];
                roundRect(ctx, centerX, centerY, 75, 20, 4);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(slot.types[0].toUpperCase().substr(0, 8), centerX + 37, centerY + 13);
                
                if (slot.types.length >= 2) {
                    ctx.fillStyle = typeColors[slot.types[1]];
                    roundRect(ctx, centerX + 80, centerY, 75, 20, 4);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.fillText(slot.types[1].toUpperCase().substr(0, 8), centerX + 117, centerY + 13);
                }
            }
            centerY += 26;
            
            // Talent
            if (slot.ability) {
                ctx.fillStyle = '#2a2a3e';
                roundRect(ctx, centerX, centerY, 160, 22, 4);
                ctx.fill();
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
                roundRect(ctx, centerX, centerY, 160, 22, 4);
                ctx.stroke();
                ctx.fillStyle = '#888';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'left';
                ctx.fillText((t('gifLabelTalent') || 'Talent') + ':', centerX + 6, centerY + 15);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText(slot.ability.substr(0, 16), centerX + 55, centerY + 15);
                centerY += 26;
            }
            
            // TC
            const isHAUnlocked = pkmnData?.hiddenAbility;
            const haName = isHAUnlocked ? (abilities[pkmnData.hiddenAbility]?.displayName || format(pkmnData.hiddenAbility)) : null;
            if (isHAUnlocked) {
                ctx.fillStyle = '#00ff8820';
                roundRect(ctx, centerX, centerY, 160, 22, 4);
                ctx.fill();
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 1;
                roundRect(ctx, centerX, centerY, 160, 22, 4);
                ctx.stroke();
                ctx.fillStyle = '#00ff88';
                ctx.font = 'bold 11px Arial';
                ctx.fillText('HA:', centerX + 6, centerY + 15);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText(haName.substr(0, 16), centerX + 32, centerY + 15);
                centerY += 26;
            }
            
            // Objet - TEXTE D'ABORD, ICÔNE À LA FIN
            if (slot.item) {
                ctx.fillStyle = '#ffd70020';
                roundRect(ctx, centerX, centerY, 160, 23, 4);
                ctx.fill();
                ctx.strokeStyle = '#ffd70060';
                ctx.lineWidth = 1;
                roundRect(ctx, centerX, centerY, 160, 23, 4);
                ctx.stroke();
                
                // Texte d'abord (à gauche)
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'left';
                ctx.fillText((t('gifLabelItem') || 'Objet') + ':', centerX + 6, centerY + 16);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText(slot.item.substr(0, 14), centerX + 52, centerY + 16);
                
                // Item image À LA FIN (droite)
                if (slot.itemKey && loadedItems[slot.itemKey]) {
                    ctx.drawImage(loadedItems[slot.itemKey], centerX + 136, centerY + 3, 18, 18);
                }
            }
            
            // ═══ COLONNE DROITE : ATTAQUES ═══
            const rightX = x + cardWidth - 165;
            let rightY = y + 42;
            
            // 4 moves (noms rallongés)
            if (slot.moves && slot.moves.length > 0) {
                slot.moves.slice(0, 4).forEach((move, idx) => {
                    const moveType = move.type || 'normal';
                    const moveColor = typeColors[moveType] || '#888';
                    
                    // Fond foncé
                    ctx.fillStyle = '#151520';
                    roundRect(ctx, rightX, rightY, 145, 23, 4);
                    ctx.fill();
                    
                    // Barre colorée diagonale à gauche
                    ctx.fillStyle = moveColor;
                    ctx.beginPath();
                    ctx.moveTo(rightX, rightY + 23);
                    ctx.lineTo(rightX + 3, rightY + 23);
                    ctx.lineTo(rightX + 6, rightY);
                    ctx.lineTo(rightX + 3, rightY);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Nom move (plus long)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'left';
                    const moveName = move.name.length > 16 ? move.name.substr(0, 16) + '..' : move.name;
                    ctx.fillText(moveName, rightX + 10, rightY + 15);
                    
                    rightY += 25;
                });
            }
            
            // ═══ BAS : STATS CENTRÉES ═══
            const colWidth = 65;
            const statsWidth = colWidth * 6;
            const statsX = x + (cardWidth - statsWidth) / 2 + colWidth / 2;
            const statsYBase = y + cardHeight - 18;
            
            const statLabels = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
            const statKeys = ['hp', 'atk', 'def', 'satk', 'sdef', 'spe'];
            
            // Helper pour convertir BST en étoiles
            const statToStars = (val) => {
                if (val >= 140) return 6;
                if (val >= 120) return 5;
                if (val >= 100) return 4;
                if (val >= 80) return 3;
                if (val >= 60) return 2;
                return 1;
            };
            
            // ═══ LIGNE DE LABELS (centrés) ═══
            let lx = statsX;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            statLabels.forEach(label => {
                ctx.fillText(label, lx, statsYBase - 32);
                lx += colWidth;
            });
            
            // ═══ LIGNE BST (label à gauche, étoiles colorées selon nature) ═══
            ctx.fillStyle = '#6699ff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(t('gifLabelBst') || 'BST', x + 18, statsYBase - 16);
            
            // Get nature-colored stars
            const bstStars = getNatureColoredStars(slot.bst, slot.nature);
            
            lx = statsX;
            statKeys.forEach(key => {
                const starData = bstStars[key];
                
                // Draw each star individually with its color
                const starSize = 8;
                const starY = statsYBase - 16;
                let starX = lx - (starData.final * starSize) / 2 + starSize/2;
                
                for (let i = 0; i < starData.final; i++) {
                    const isLast = i === starData.final - 1;
                    const isRed = starData.adjusted < 0 && isLast;
                    const isGreen = starData.adjusted > 0 && isLast;
                    
                    if (isGreen) {
                        ctx.fillStyle = '#00ff88'; // Vert pour boosté
                    } else if (isRed) {
                        ctx.fillStyle = '#ff4444'; // Rouge pour réduit
                    } else {
                        ctx.fillStyle = '#4488ff'; // Bleu pour neutre
                    }
                    
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('★', starX, starY);
                    starX += starSize;
                }
                lx += colWidth;
            });
            
            // ═══ LIGNE IV (label à gauche, étoiles centrées) ═══
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(t('gifLabelIv') || 'IV', x + 22, statsYBase);
            
            lx = statsX;
            statKeys.forEach(key => {
                const ivVal = slot.ivs?.[key] || 0;
                const stars = '★'.repeat(ivVal) + '☆'.repeat(6 - ivVal);
                ctx.fillStyle = '#ff4444';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(stars, lx, statsYBase);
                lx += colWidth;
            });
        }
        
        // Footer (comme la HD)
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PokeChill Explorer • pokechill-explorer.alwaysdata.net', width / 2, height - 18);
        
        return canvas;
    }
    
    const frame1 = renderFrame(0, 0);
    const frame2 = renderFrame(-4, 1);
    
    const gif = new GIF({
        workers: 2,
        quality: 1,
        width: width,
        height: height,
        workerScript: 'scripts/gif.worker.js',
        dither: false,
        background: '#0c0c18',
        transparent: null
    });
    
    gif.addFrame(frame1, { delay: 500 });
    gif.addFrame(frame2, { delay: 500 });
    
    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'team-miniature.gif';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });
    
    gif.render();
}