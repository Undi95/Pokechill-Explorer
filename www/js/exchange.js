// ============================================
// SYSTÈME D'ÉCHANGE CABLE LINK
// ============================================

// État global de l'échange
let exchangeState = {
    mode: null, // 'create' ou 'join'
    roomCode: null,
    playerRole: null, // 'A' ou 'B'
    localSave: null,
    selectedPokemon: null,
    otherPlayerPokemon: null,
    pollingInterval: null,
    backendUrl: 'https://pokechill-explorer.alwaysdata.net/exchange/api.php',
    wasOtherPlayerPresent: false, // Track si l'autre joueur était déjà là
    hasConfirmed: false
};

// Structure d'un Pokémon non capturé (pour reset)
const EMPTY_POKEMON = {
    caught: 0,
    level: 1,
    exp: 0,
    moves: { slot1: null, slot2: null, slot3: null, slot4: null },
    ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 },
    movepool: [],
    ability: 'limber'
};

// Navigation entre écrans
function exchangeShowScreen(screenId) {
    document.querySelectorAll('.exchange-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('exchange-screen-' + screenId).classList.add('active');
}

// Écran 1: Créer un échange
async function exchangeCreateRoom() {
    exchangeState.mode = 'create';
    exchangeState.playerRole = 'A';
    
    const backendUrl = exchangeState.backendUrl;
    // console.log('Creating room at:', backendUrl);
    
    try {
        const response = await fetch(`${backendUrl}?action=create`);
        // console.log('Response status:', response.status);
        
        if (!response.ok) {
            const text = await response.text();
            // console.error('Server error:', text);
            throw new Error(t('serverError') + ': ' + response.status);
        }
        
        const data = await response.json();
         // console.log('Response data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        exchangeState.roomCode = data.code;
        document.getElementById('exchange-code-display').textContent = data.code;
        exchangeShowScreen('create');
        
        // Démarrer le polling
        exchangeStartPolling();
        
    } catch (err) {
         // console.error('Error creating room:', err);
        alert(t('exchangeCreateError') + ' ' + err.message);
    }
}

// Écran 1 bis: Rejoindre un échange
function exchangeJoinRoom() {
    exchangeState.mode = 'join';
    exchangeState.playerRole = 'B';
    exchangeShowScreen('join');
}

// Soumettre le code
async function exchangeSubmitCode() {
    const code = document.getElementById('exchange-code-input').value.trim().toUpperCase();
    
    if (code.length !== 6) {
        alert(t('code6Chars'));
        return;
    }
    
    const backendUrl = exchangeState.backendUrl;
    
    try {
        const response = await fetch(`${backendUrl}?action=join&code=${code}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                alert(t('invalidCode'));
                return;
            }
            throw new Error(t('serverError'));
        }
        
        exchangeState.roomCode = code;
        exchangeShowScreen('import');
        
    } catch (err) {
        alert(t('connectionError') + ' ' + err.message);
    }
}

// Copier le code
function exchangeCopyCode() {
    const code = exchangeState.roomCode;
    navigator.clipboard.writeText(code).then(() => {
        alert(t('codeCopied') + ' ' + code);
    });
}

// Polling pour vérifier l'état
function exchangeStartPolling() {
     // console.log('Starting polling for player:', exchangeState.playerRole);
    if (exchangeState.pollingInterval) clearInterval(exchangeState.pollingInterval);
    
    exchangeState.pollingInterval = setInterval(async () => {
        if (!exchangeState.roomCode) {
             // console.log('No room code, stopping polling');
            return;
        }
        
        try {
             // console.log('Polling status...');
            const response = await fetch(`${exchangeState.backendUrl}?action=status&code=${exchangeState.roomCode}&player=${exchangeState.playerRole}`);
            
            // Si la room n'existe plus (404 ou autre erreur) = l'autre a annulé
            if (!response.ok) {
                 // console.log('Room not found - other player cancelled');
                clearInterval(exchangeState.pollingInterval);
                alert(t('exchangeCancelled') || 'The other trainer cancelled the exchange or the session expired.');
                exchangeReset();
                return;
            }
            
            const data = await response.json();
             // console.log('Polling:', data);
            
            // Mettre à jour le flag si l'autre joueur est présent
            if (data.bothPresent) {
                exchangeState.wasOtherPlayerPresent = true;
            }
            
            // Vérifier si l'autre joueur a quitté (annulation ou déconnexion)
            if (!data.bothPresent && exchangeState.wasOtherPlayerPresent) {
                clearInterval(exchangeState.pollingInterval);
                alert(t('exchangeOtherDisconnected') || 'The other trainer disconnected or cancelled. The exchange is cancelled.');
                exchangeReset();
                return;
            }
            
            // Si les deux ont confirmé -> animation puis finaliser
            if (data.bothConfirmed) {
                 // console.log('Both confirmed detected! Showing animation...');
                 // console.log('Player role:', exchangeState.playerRole);
                clearInterval(exchangeState.pollingInterval);
                if (data.otherPokemon) {
                    exchangeState.otherPlayerPokemon = data.otherPokemon;
                }
                showCableLinkAnimation();
                return;
            }
            
            // Si les deux ont sélectionné -> montrer confirmation (seulement si on n'a pas déjà confirmé)
            if (data.bothSelected && !data.bothConfirmed && !exchangeState.hasConfirmed) {
                clearInterval(exchangeState.pollingInterval);
                exchangeState.otherPlayerPokemon = data.otherPokemon;
                exchangeShowConfirmation();
                return;
            }
            
            // Si les deux sont présents et qu'on est le créateur (A) et qu'on est sur l'écran d'attente
            if (data.bothPresent && exchangeState.playerRole === 'A') {
                const currentScreen = document.querySelector('.exchange-screen.active');
                if (currentScreen && currentScreen.id === 'exchange-screen-create') {
                    exchangeShowScreen('import');
                    clearInterval(exchangeState.pollingInterval);
                    return;
                }
            }
            
        } catch (err) {
             // console.error('Polling error:', err);
        }
    }, 2000);
}

// Import de la sauvegarde
function exchangeOnSaveSelected(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const saveData = JSON.parse(e.target.result);
            
            // Validation
            if (!saveData.saved || !saveData.saved.version) {
                throw new Error('Sauvegarde invalide');
            }
            
            // Vérifier la version
            if (saveData.saved.version < 3.0) {
                throw new Error('Version de sauvegarde incompatible');
            }
            
            // Vérifier que Lusamine est battue
            if (!saveData.vsUltraEntityLusamine || !saveData.vsUltraEntityLusamine.defeated) {
                throw new Error(t('exchangeLusamineRequired') || 'Vous devez battre Ultra Entité Lusamine en mode VS pour débloquer les échanges. Cette condition évite aux nouveaux joueurs de recevoir des Pokémon trop puissants.');
            }
            
            exchangeState.localSave = saveData;
            exchangePopulatePokemonGrid();
            exchangeShowScreen('select');
            
        } catch (err) {
            document.getElementById('exchange-save-error').style.display = 'block';
            document.getElementById('exchange-save-error').textContent = t('error') + ': ' + err.message;
        }
    };
    reader.readAsText(file);
}

// Remplir la grille des Pokémon
function exchangePopulatePokemonGrid() {
    const grid = document.getElementById('exchange-pokemon-grid');
    grid.innerHTML = '';
    
    const save = exchangeState.localSave;
    const caughtPokemon = [];
    
    // Parcourir toutes les propriétés pour trouver les Pokémon capturés
    for (const key in save) {
        if (save[key] && typeof save[key] === 'object' && save[key].caught > 0) {
            // Vérifier que c'est bien un Pokémon (a les propriétés attendues)
            if (save[key].level !== undefined && save[key].ability !== undefined) {
                caughtPokemon.push({
                    name: key,
                    data: save[key]
                });
            }
        }
    }
    
    // Trier par nom
    caughtPokemon.sort((a, b) => format(a.name).localeCompare(format(b.name)));
    
    // Stocker pour la recherche
    exchangeState.caughtPokemonList = caughtPokemon;
    
    // Utiliser un fragment pour éviter les reflows
    const fragment = document.createDocumentFragment();
    
    caughtPokemon.forEach(p => {
        const div = document.createElement('div');
        const legality = checkPokemonLegality(p.name, p.data);
        
        // Gérer les différentes catégories
        if (legality.category === 'cheat') {
            // Pokémon cheaté: grisé avec 🚫
            div.className = 'exchange-pokemon-item exchange-pokemon-illegal';
            const reasonText = legality.reasons.length > 0 ? legality.reasons.join('; ') : 'Problème détecté';
            div.dataset.illegalReasons = reasonText;
            div.title = (t('illegalPokemonTooltip') || 'Pokémon illégal') + ': ' + reasonText;
            
            const shinyBadge = p.data.shiny ? '<span class="shiny-badge">✨</span>' : '';
            const folder = p.data.shiny ? 'shiny' : 'sprite';
            const spriteUrl = `https://play-pokechill.github.io/img/pkmn/${folder}/${p.name}.png`;
            
            div.innerHTML = `
                ${shinyBadge}
                <img src="${spriteUrl}" alt="${format(p.name)}">
                <div class="name">${format(p.name)}</div>
                <div class="exchange-illegal-overlay">🚫</div>
            `;
        } else if (legality.category === 'restricted') {
            // Pokémon restrict (Ditto, saisonnier): grisé avec 🔒
            div.className = 'exchange-pokemon-item exchange-pokemon-restricted';
            const reasonText = legality.reasons.length > 0 ? legality.reasons.join('; ') : 'Non échangeable';
            div.dataset.restrictedReasons = reasonText;
            div.title = reasonText;
            
            const shinyBadge = p.data.shiny ? '<span class="shiny-badge">✨</span>' : '';
            const folder = p.data.shiny ? 'shiny' : 'sprite';
            const spriteUrl = `https://play-pokechill.github.io/img/pkmn/${folder}/${p.name}.png`;
            
            div.innerHTML = `
                ${shinyBadge}
                <img src="${spriteUrl}" alt="${format(p.name)}">
                <div class="name">${format(p.name)}</div>
                <div class="exchange-restricted-overlay">🔒</div>
            `;
        } else {
            // Pokémon normal: cliquable
            div.className = 'exchange-pokemon-item';
            div.onclick = () => exchangeSelectPokemon(p.name, p.data);
            
            const shinyBadge = p.data.shiny ? '<span class="shiny-badge">✨</span>' : '';
            const folder = p.data.shiny ? 'shiny' : 'sprite';
            const spriteUrl = `https://play-pokechill.github.io/img/pkmn/${folder}/${p.name}.png`;
            
            div.innerHTML = `
                ${shinyBadge}
                <img src="${spriteUrl}" alt="${format(p.name)}">
                <div class="name">${format(p.name)}</div>
            `;
        }
        
        div.dataset.pokemon = p.name;
        div.dataset.searchName = format(p.name).toLowerCase();
        
        fragment.appendChild(div);
    });
    
    grid.appendChild(fragment);
}

// Filtrer la grille des Pokémon
function exchangeFilterPokemonGrid(searchTerm) {
    const grid = document.getElementById('exchange-pokemon-grid');
    const items = grid.querySelectorAll('.exchange-pokemon-item');
    const term = searchTerm.toLowerCase().trim();
    
    items.forEach(item => {
        const name = item.dataset.searchName;
        if (!term || name.includes(term)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Sélectionner un Pokémon
function exchangeSelectPokemon(name, data) {
    // Vérifier si le Pokémon peut être échangé
    const legality = checkPokemonLegality(name, data);
    if (!legality.isExchangeable) {
        if (legality.category === 'restricted') {
            alert(legality.reasons.join('\n'));
        } else {
            alert(t('cheatSelectedIllegal') + '\n\n' + legality.reasons.join('\n'));
        }
        return;
    }
    
    // Mettre à jour la sélection visuelle
    document.querySelectorAll('.exchange-pokemon-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.pokemon === name);
    });
    
    exchangeState.selectedPokemon = { name, data: JSON.parse(JSON.stringify(data)) };
    
    // Afficher la preview détaillée
    const preview = document.getElementById('exchange-pokemon-preview');
    preview.style.display = 'block';
    
    // Construire les détails
    const pkmnData = pokemons[name];
    const hiddenAbility = pkmnData?.hiddenAbility || '';
    const hasHAUnlocked = data.hiddenAbilityUnlocked || false;
    const isHA = data.ability === hiddenAbility && hasHAUnlocked;
    
    // Sprite URL
    const folder = data.shiny ? 'shiny' : 'sprite';
    const spriteUrl = `https://play-pokechill.github.io/img/pkmn/${folder}/${name}.png`;
    
    // Moves équipés
    const equippedMoves = [];
    for (let i = 1; i <= 4; i++) {
        if (data.moves && data.moves[`slot${i}`]) {
            equippedMoves.push(format(data.moves[`slot${i}`]));
        }
    }
    
    // Movepool complet (attaques apprises)
    const movepoolMoves = data.movepool ? data.movepool.map(m => format(m)) : [];
    
    // Génétiques (movepoolMemory)
    const geneticsMoves = data.movepoolMemory ? data.movepoolMemory.map(m => format(m)) : [];
    const geneticsCount = geneticsMoves.length;
    
    // IVs
    const ivs = data.ivs || { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
    const ivsTotal = ivs.hp + ivs.atk + ivs.def + ivs.satk + ivs.sdef + ivs.spe;
    const ivsColor = ivsTotal >= 30 ? 'var(--accent-green)' : ivsTotal >= 20 ? 'var(--accent-gold)' : 'var(--text-dim)';
    
    preview.innerHTML = `
        <div style="background:linear-gradient(135deg,var(--bg-input),var(--bg-card));border-radius:16px;padding:25px;border:2px solid var(--border)">
            <div style="display:grid;grid-template-columns:120px 1fr;gap:25px;align-items:start">
                <!-- Colonne gauche: Sprite -->
                <div style="text-align:center">
                    <div style="background:var(--bg-dark);border-radius:12px;padding:10px;margin-bottom:10px">
                        <img src="${spriteUrl}" style="width:96px;height:96px;image-rendering:pixelated;object-fit:contain" 
                             onerror="this.style.display='none'">
                    </div>
                    <div style="font-size:1.3rem;font-weight:700;color:var(--text-main)">${format(name)}</div>
                    ${data.shiny ? '<div style="color:var(--accent-gold);font-size:0.9rem;margin-top:5px">✨ Shiny</div>' : ''}
                    ${geneticsCount > 0 ? `<div style="color:var(--accent-purple);font-size:0.8rem;margin-top:5px">🧬 ${geneticsCount} génétiques</div>` : ''}
                </div>
                
                <!-- Colonne droite: Détails -->
                <div>
                    <!-- Stats principales -->
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid var(--border)">
                        <div style="text-align:center;background:var(--bg-dark);padding:8px 4px;border-radius:8px">
                            <div style="font-size:0.7rem;color:var(--text-dim)">Niveau</div>
                            <div style="font-size:1.1rem;font-weight:700;color:var(--accent-blue)">${data.level}</div>
                        </div>
                        <div style="text-align:center;background:var(--bg-dark);padding:8px 4px;border-radius:8px;overflow:hidden">
                            <div style="font-size:0.7rem;color:var(--text-dim)">Talent 1</div>
                            <div style="font-size:0.85rem;font-weight:600;color:${isHA ? 'var(--accent-gold)' : 'var(--text-main)'};${isHA ? 'text-shadow:0 0 5px rgba(255,215,0,0.3)' : ''};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${format(data.ability)}</div>
                        </div>
                        <div style="text-align:center;background:var(--bg-dark);padding:8px 4px;border-radius:8px;overflow:hidden">
                            <div style="font-size:0.7rem;color:var(--text-dim)">Talent 2</div>
                            <div style="font-size:0.85rem;font-weight:600;color:${hasHAUnlocked ? 'var(--accent-gold)' : 'var(--text-dim)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${hiddenAbility ? format(hiddenAbility) : '?'}</div>
                            <div style="font-size:0.65rem;color:${hasHAUnlocked ? 'var(--accent-gold)' : 'var(--text-dim)'}">${hasHAUnlocked ? '✓ Unlock' : '🔒 Lock'}</div>
                        </div>
                        <div style="text-align:center;background:var(--bg-dark);padding:8px 4px;border-radius:8px">
                            <div style="font-size:0.7rem;color:var(--text-dim)">IVs Total</div>
                            <div style="font-size:1.1rem;font-weight:700;color:${ivsColor}">${ivsTotal}/36</div>
                        </div>
                    </div>
                    
                    <!-- IVs détaillés -->
                    <div style="margin-bottom:15px">
                        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px">IVs détaillés:</div>
                        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;font-size:0.75rem">
                            <div style="text-align:center;padding:5px;background:var(--bg-dark);border-radius:4px"><span style="color:var(--accent-green)">PV</span><br><strong>${ivs.hp}</strong></div>
                            <div style="text-align:center;padding:5px;background:var(--bg-dark);border-radius:4px"><span style="color:var(--accent-blue)">Atk</span><br><strong>${ivs.atk}</strong></div>
                            <div style="text-align:center;padding:5px;background:var(--bg-dark);border-radius:4px"><span style="color:var(--accent-blue)">Def</span><br><strong>${ivs.def}</strong></div>
                            <div style="text-align:center;padding:5px;background:var(--bg-dark);border-radius:4px"><span style="color:var(--accent-pink)">SpA</span><br><strong>${ivs.satk}</strong></div>
                            <div style="text-align:center;padding:5px;background:var(--bg-dark);border-radius:4px"><span style="color:var(--accent-pink)">SpD</span><br><strong>${ivs.sdef}</strong></div>
                            <div style="text-align:center;padding:5px;background:var(--bg-dark);border-radius:4px"><span style="color:var(--accent-purple)">Vit</span><br><strong>${ivs.spe}</strong></div>
                        </div>
                    </div>
                    
                    <!-- Attaques équipées -->
                    ${equippedMoves.length > 0 ? `
                    <div style="margin-bottom:15px">
                        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px">Attaques équipées:</div>
                        <div style="display:flex;flex-wrap:wrap;gap:5px">
                            ${equippedMoves.map(m => `<span style="background:var(--accent-blue);color:var(--bg-dark);padding:4px 10px;border-radius:4px;font-size:0.8rem;font-weight:600">${m}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Movepool (attaques apprises) -->
                    ${movepoolMoves.length > 0 ? `
                    <div style="margin-bottom:15px">
                        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px">Attaques apprises (${movepoolMoves.length}):</div>
                        <div style="max-height:80px;overflow-y:auto;background:var(--bg-dark);padding:10px;border-radius:8px;font-size:0.75rem;color:var(--text-dim)">
                            ${movepoolMoves.join(', ')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Génétiques -->
                    ${geneticsMoves.length > 0 ? `
                    <div>
                        <div style="font-size:0.8rem;color:var(--accent-purple);margin-bottom:8px">🧬 Attaques génétiques:</div>
                        <div style="display:flex;flex-wrap:wrap;gap:5px">
                            ${geneticsMoves.map(m => `<span style="background:var(--accent-purple);color:white;padding:4px 10px;border-radius:4px;font-size:0.8rem">${m}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.ribbons && data.ribbons.length > 0 ? `
                    <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border)">
                        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:5px">Rubans:</div>
                        <div style="font-size:0.85rem;color:var(--accent-gold)">${data.ribbons.map(r => '🏅 ' + r).join(' ')}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('exchange-confirm-pokemon-btn').disabled = false;
}

// Confirmer la sélection du Pokémon
async function exchangeConfirmPokemon() {
    if (!exchangeState.selectedPokemon || !exchangeState.roomCode) return;
    
    // Vérifier si le Pokémon peut être échangé avant confirmation
    const legality = checkPokemonLegality(exchangeState.selectedPokemon.name, exchangeState.selectedPokemon.data);
    if (!legality.isExchangeable) {
        if (legality.category === 'restricted') {
            alert(legality.reasons.join('\n'));
        } else {
            alert(t('cheatAlertTitle') + '\n\n' + legality.reasons.join('\n'));
        }
        return;
    }
    
    // Nettoyer les données - retirer les items (gérés séparément dans les teams)
    const cleanData = JSON.parse(JSON.stringify(exchangeState.selectedPokemon.data));
    delete cleanData.item;
    delete cleanData.heldItem;
    
    const pokemonData = {
        name: exchangeState.selectedPokemon.name,
        data: cleanData
    };
    
    try {
         // console.log('Sending offer:', pokemonData);
        const response = await fetch(`${exchangeState.backendUrl}?action=offer&code=${exchangeState.roomCode}&player=${exchangeState.playerRole}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pokemon: pokemonData })
        });
        
        if (!response.ok) {
            const text = await response.text();
             // console.error('Offer error:', text);
            throw new Error(t('sendError') + ': ' + response.status);
        }
        
        const result = await response.json();
         // console.log('Offer result:', result);
        
        exchangeShowScreen('waiting');
        exchangeStartPolling();
        
    } catch (err) {
         // console.error('Error:', err);
        alert(t('sendError') + ': ' + err.message);
    }
}

// Helper: Générer carte détaillée pour échange (version compacte)
function exchangeGenerateDetailCard(pokemon, isMine) {
    const data = pokemon.data;
    const name = pokemon.name;
    const folder = data.shiny ? 'shiny' : 'sprite';
    const spriteUrl = `https://play-pokechill.github.io/img/pkmn/${folder}/${escapeHtml(name)}.png`;
    
    // IVs - sanitize all numeric values
    const ivs = data.ivs || { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
    const ivsTotal = ivs.hp + ivs.atk + ivs.def + ivs.satk + ivs.sdef + ivs.spe;
    const ivsColor = ivsTotal >= 30 ? 'var(--accent-green)' : ivsTotal >= 20 ? 'var(--accent-gold)' : 'var(--text-dim)';
    
    // Moves équipés - sanitize all move names
    const equippedMoves = [];
    for (let i = 1; i <= 4; i++) {
        if (data.moves && data.moves[`slot${i}`]) {
            equippedMoves.push(escapeHtml(format(data.moves[`slot${i}`])));
        }
    }
    
    // Movepool - sanitize all move names
    const movepoolMoves = data.movepool ? data.movepool.map(m => escapeHtml(format(m))) : [];
    const geneticsMoves = data.movepoolMemory ? data.movepoolMemory.map(m => escapeHtml(format(m))) : [];
    
    // Ability check
    const pkmnData = pokemons[name];
    const hiddenAbility = pkmnData?.hiddenAbility || '';
    const isHA = data.ability === hiddenAbility && data.hiddenAbilityUnlocked;
    
    return `
        <div style="background:linear-gradient(135deg,var(--bg-input),var(--bg-card));border-radius:12px;padding:15px;border:2px solid ${isMine ? 'var(--accent-blue)' : 'var(--accent-pink)'};width:100%;max-width:350px;box-sizing:border-box;">
            <!-- Header avec sprite et infos principales -->
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div style="text-align:center;flex-shrink:0;">
                    <div style="background:var(--bg-dark);border-radius:10px;padding:6px;width:70px;height:70px;display:flex;align-items:center;justify-content:center;">
                        <img src="${spriteUrl}" style="width:60px;height:60px;image-rendering:pixelated;" onerror="this.style.display='none'">
                    </div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:1rem;font-weight:700;color:var(--text-main);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(format(name))}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                        ${data.shiny ? '<span style="color:var(--accent-gold);font-size:0.75rem;">✨ Shiny</span>' : ''}
                        ${data.starSign ? `<span style="color:var(--accent-gold);font-size:0.75rem;text-shadow:0 0 8px rgba(255,215,0,0.5);">✨ ${format(data.starSign)}</span>` : ''}
                        ${geneticsMoves.length > 0 ? `<span style="color:var(--accent-purple);font-size:0.75rem;">🧬 ${geneticsMoves.length}</span>` : ''}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
                        <div style="text-align:center;background:var(--bg-dark);padding:4px 2px;border-radius:6px;">
                            <div style="font-size:0.6rem;color:var(--text-dim);">Niv</div>
                            <div style="font-size:0.9rem;font-weight:700;color:var(--accent-blue);">${escapeHtml(data.level)}</div>
                        </div>
                        <div style="text-align:center;background:var(--bg-dark);padding:4px 2px;border-radius:6px;overflow:hidden;">
                            <div style="font-size:0.6rem;color:var(--text-dim);">Talent 1</div>
                            <div style="font-size:0.7rem;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(format(data.ability))}</div>
                        </div>
                        <div style="text-align:center;background:var(--bg-dark);padding:4px 2px;border-radius:6px;overflow:hidden;">
                            <div style="font-size:0.6rem;color:var(--text-dim);">Talent 2</div>
                            <div style="font-size:0.7rem;font-weight:600;color:${data.hiddenAbilityUnlocked ? 'var(--accent-gold)' : 'var(--text-dim)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${hiddenAbility ? escapeHtml(format(hiddenAbility)) : '?'}
                                ${data.hiddenAbilityUnlocked ? '✓' : '🔒'}
                            </div>
                        </div>
                        <div style="text-align:center;background:var(--bg-dark);padding:4px 2px;border-radius:6px;">
                            <div style="font-size:0.6rem;color:var(--text-dim);">IVs</div>
                            <div style="font-size:0.9rem;font-weight:700;color:${ivsColor};">${escapeHtml(ivsTotal)}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- IVs détaillés -->
            <div style="margin-bottom:10px;padding:6px;background:var(--bg-dark);border-radius:8px;">
                <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:2px;font-size:0.65rem;text-align:center;">
                    <div><span style="color:var(--accent-green)">PV</span><br><strong>${escapeHtml(ivs.hp)}</strong></div>
                    <div><span style="color:var(--accent-blue)">Atk</span><br><strong>${escapeHtml(ivs.atk)}</strong></div>
                    <div><span style="color:var(--accent-blue)">Def</span><br><strong>${escapeHtml(ivs.def)}</strong></div>
                    <div><span style="color:var(--accent-pink)">SpA</span><br><strong>${escapeHtml(ivs.satk)}</strong></div>
                    <div><span style="color:var(--accent-pink)">SpD</span><br><strong>${escapeHtml(ivs.sdef)}</strong></div>
                    <div><span style="color:var(--accent-purple)">Vit</span><br><strong>${escapeHtml(ivs.spe)}</strong></div>
                </div>
            </div>
            
            <!-- Attaques équipées -->
            ${equippedMoves.length > 0 ? `
            <div style="margin-bottom:8px;">
                <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">Attaques:</div>
                <div style="display:flex;flex-wrap:wrap;gap:3px;">
                    ${equippedMoves.map(m => `<span style="background:var(--accent-blue);color:var(--bg-dark);padding:2px 6px;border-radius:3px;font-size:0.7rem;font-weight:600;white-space:nowrap;">${m}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- Movepool (collapsible) -->
            ${movepoolMoves.length > 0 ? `
            <div style="margin-bottom:8px;">
                <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:3px;">Movepool: <span style="color:var(--text-main)">${movepoolMoves.length} moves</span></div>
                <div style="max-height:50px;overflow-y:auto;background:var(--bg-dark);padding:6px;border-radius:6px;font-size:0.65rem;color:var(--text-dim);line-height:1.4;">
                    ${movepoolMoves.join(', ')}
                </div>
            </div>
            ` : ''}
            
            <!-- Génétiques -->
            ${geneticsMoves.length > 0 ? `
            <div>
                <div style="font-size:0.7rem;color:var(--accent-purple);margin-bottom:3px;">🧬 Génétiques:</div>
                <div style="display:flex;flex-wrap:wrap;gap:3px;">
                    ${geneticsMoves.map(m => `<span style="background:var(--accent-purple);color:white;padding:2px 6px;border-radius:3px;font-size:0.7rem;white-space:nowrap;">${m}</span>`).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// Afficher l'écran de confirmation finale
function exchangeShowConfirmation() {
    if (!exchangeState.selectedPokemon || !exchangeState.otherPlayerPokemon) return;
    
    const mine = exchangeState.selectedPokemon;
    const theirs = exchangeState.otherPlayerPokemon;
    
    // Vérifier si les Pokémon peuvent être échangés
    const myLegality = checkPokemonLegality(mine.name, mine.data);
    const theirLegality = checkPokemonLegality(theirs.name, theirs.data);
    
    // Si mon Pokémon ne peut pas être échangé, bloquer
    if (!myLegality.isExchangeable) {
        const message = myLegality.category === 'restricted' 
            ? myLegality.reasons.join('\n')
            : (t('cheatAlertTitle') + '\n\n' + (t('cheatAlertMessage') || 'Votre Pokémon contient des modifications illégales.') + '\n\n' + myLegality.reasons.join('\n'));
        alert(message);
        exchangeReset();
        return;
    }
    
    // Générer les cartes détaillées
    document.getElementById('exchange-preview-mine').innerHTML = exchangeGenerateDetailCard(mine, true);
    document.getElementById('exchange-preview-theirs').innerHTML = exchangeGenerateDetailCard(theirs, false);
    
    // Afficher un avertissement si le Pokémon reçu ne peut pas être échangé
    if (!theirLegality.isExchangeable) {
        const isRestricted = theirLegality.category === 'restricted';
        // Sanitize all reasons to prevent XSS
        const sanitizedReasons = theirLegality.reasons.map(r => escapeHtml(r));
        const warningHtml = `
            <div style="margin-top:15px;padding:15px;background:${isRestricted ? 'rgba(255,193,7,0.15)' : 'rgba(255,0,0,0.15)'};border:2px solid ${isRestricted ? 'rgba(255,193,7,0.5)' : 'rgba(255,0,0,0.5)'};border-radius:10px;color:${isRestricted ? '#ffc107' : '#ff6b6b'}">
                <strong>⚠️ ${isRestricted ? (t('restrictedTitle') || 'Pokémon non échangeable') : (t('cheatAlertTitle') || 'Pokémon illégal détecté')}</strong><br>
                <span style="font-size:0.9rem">${isRestricted ? sanitizedReasons.join('; ') : (t('cheatAlertMessage') || 'Le Pokémon proposé contient des modifications illégales.')}</span><br>
                ${!isRestricted ? `<ul style="margin:10px 0 0 20px;font-size:0.85rem">${sanitizedReasons.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
            </div>
        `;
        document.getElementById('exchange-preview-theirs').insertAdjacentHTML('beforeend', warningHtml);
    }
    
    // Reset le statut de confirmation
    exchangeState.hasConfirmed = false;
    exchangeState.otherConfirmed = false;
    
    // IMPORTANT: Réinitialiser l'écran de confirmation (supprimer l'ancien message d'attente si présent)
    const confirmDiv = document.querySelector('.exchange-confirmation');
    if (confirmDiv) {
        // Supprimer l'ancien message d'attente s'il existe
        const oldWaiting = document.getElementById('exchange-waiting-confirm');
        if (oldWaiting) oldWaiting.remove();
        
        // Réafficher le bouton de confirmation
        const confirmBtn = confirmDiv.querySelector('button');
        if (confirmBtn) confirmBtn.style.display = 'inline-block';
        
        // Ajouter le nouveau message d'attente (caché par défaut)
        confirmDiv.insertAdjacentHTML('beforeend', `
            <div id="exchange-waiting-confirm" style="margin-top:20px;padding:15px;background:var(--bg-card);border-radius:10px;display:none">
                <div style="display:flex;align-items:center;justify-content:center;gap:10px">
                    <div class="exchange-loading" style="width:30px;height:30px;border-width:3px"></div>
                    <span>En attente de l'autre dresseur...</span>
                </div>
            </div>
        `);
    }
    
    exchangeShowScreen('confirm');
}

// Confirmer l'échange (attendre l'autre)
async function exchangeFinalize() {
    if (!exchangeState.roomCode || exchangeState.hasConfirmed) return;
    
    // Masquer le bouton et montrer l'attente
    const confirmBtn = document.querySelector('.exchange-confirmation button');
    if (confirmBtn) confirmBtn.style.display = 'none';
    
    const waitingDiv = document.getElementById('exchange-waiting-confirm');
    if (waitingDiv) waitingDiv.style.display = 'block';
    
    exchangeState.hasConfirmed = true;
    
    try {
        // Confirmer au serveur
         // console.log('Confirming exchange...');
        const response = await fetch(`${exchangeState.backendUrl}?action=confirm&code=${exchangeState.roomCode}&player=${exchangeState.playerRole}`);
        const result = await response.json();
         // console.log('Confirm result:', result);
        
        if (result.exchangeComplete) {
            // Les deux ont confirmé !
             // console.log('Exchange complete immediately!');
            showCableLinkAnimation();
        } else {
            // Attendre que l'autre confirme
             // console.log('Waiting for other player...');
            exchangeStartPolling();
        }
        
    } catch (err) {
         // console.error('Confirm error:', err);
        alert(t('confirmError') + ' ' + err.message);
        if (confirmBtn) confirmBtn.style.display = 'inline-block';
        if (waitingDiv) waitingDiv.style.display = 'none';
        exchangeState.hasConfirmed = false;
    }
}

// Animation Cable Link GBA
function showCableLinkAnimation() {
     // console.log('Showing Cable Link animation...');
    
    const mine = exchangeState.selectedPokemon;
    const theirs = exchangeState.otherPlayerPokemon;
    
    if (!mine || !theirs) {
         // console.error('Missing pokemon data:', { mine, theirs });
        alert('Erreur: données manquantes pour l\'animation');
        return;
    }
    
    // Créer l'overlay d'animation
    const overlay = document.createElement('div');
    overlay.id = 'cable-link-animation';
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.9);z-index:9999;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
    `;
    
    const myFolder = mine.data.shiny ? 'shiny' : 'sprite';
    const theirFolder = theirs.data.shiny ? 'shiny' : 'sprite';
    const mySprite = `https://play-pokechill.github.io/img/pkmn/${myFolder}/${mine.name}.png`;
    const theirSprite = `https://play-pokechill.github.io/img/pkmn/${theirFolder}/${theirs.name}.png`;
    
    overlay.innerHTML = `
        <div style="font-family:'Orbitron',sans-serif;font-size:2rem;color:var(--accent-blue);margin-bottom:30px;text-shadow:0 0 20px var(--accent-blue)">
            🔌 CABLE LINK CONNECTÉ
        </div>
        
        <div style="display:flex;align-items:center;gap:50px;margin-bottom:30px">
            <div style="text-align:center;animation:exchangePulseLeft 1s ease-in-out infinite">
                <img src="${mySprite}" style="width:100px;height:100px;image-rendering:pixelated">
                <div style="color:white;margin-top:10px">${format(mine.name)}</div>
            </div>
            
            <div style="position:relative;width:150px;height:10px;background:linear-gradient(90deg,var(--accent-blue),var(--accent-pink));border-radius:5px;overflow:hidden">
                <div style="position:absolute;width:20px;height:20px;background:var(--accent-gold);border-radius:50%;top:-5px;animation:exchangeTransfer 1s linear infinite"></div>
            </div>
            
            <div style="text-align:center;animation:exchangePulseRight 1s ease-in-out infinite">
                <img src="${theirSprite}" style="width:100px;height:100px;image-rendering:pixelated">
                <div style="color:white;margin-top:10px">${format(theirs.name)}</div>
            </div>
        </div>
        
        <div id="exchange-status-text" style="color:var(--accent-gold);font-size:1.2rem">Échange en cours...</div>
    `;
    
    // Ajouter les animations CSS si pas déjà présentes
    if (!document.getElementById('exchange-animations')) {
        const style = document.createElement('style');
        style.id = 'exchange-animations';
        style.textContent = `
            @keyframes exchangeTransfer {
                0% { left: 0; }
                50% { left: 130px; }
                100% { left: 0; }
            }
            @keyframes exchangePulseLeft {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(0.95); opacity: 0.8; }
            }
            @keyframes exchangePulseRight {
                0%, 100% { transform: scale(0.95); opacity: 0.8; }
                50% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
    
    // Simuler l'échange puis finir
    setTimeout(() => {
        document.getElementById('exchange-status-text').textContent = '✅ Échange réussi !';
    }, 2000);
    
    setTimeout(() => {
        overlay.remove();
        finishExchange();
    }, 3500);
}

// Terminer l'échange
function finishExchange() {
    // Générer la nouvelle sauvegarde
    const newSave = exchangeGenerateNewSave();
    
    // Afficher succès
    const summary = document.getElementById('exchange-result-summary');
    summary.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:10px;background:var(--bg-card);border-radius:8px">
            <span style="color:var(--accent-red)">🔴 Vous avez donné:</span>
            <strong>${format(exchangeState.selectedPokemon.name)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-card);border-radius:8px">
            <span style="color:var(--accent-green)">🟢 Vous avez reçu:</span>
            <strong>${format(exchangeState.otherPlayerPokemon.name)}</strong>
        </div>
    `;
    
    // Stocker pour le download
    exchangeState.generatedSave = newSave;
    exchangeShowScreen('success');
}

// Générer la nouvelle sauvegarde
function exchangeGenerateNewSave() {
    const save = JSON.parse(JSON.stringify(exchangeState.localSave));
    const givenName = exchangeState.selectedPokemon.name;
    const received = exchangeState.otherPlayerPokemon;
    
    // 1. Retirer le Pokémon donné (reset à vide)
    save[givenName] = JSON.parse(JSON.stringify(EMPTY_POKEMON));
    
    // 2. Retirer des équipes (previewTeams)
    if (save.saved && save.saved.previewTeams) {
        for (const teamKey in save.saved.previewTeams) {
            const team = save.saved.previewTeams[teamKey];
            for (let i = 1; i <= 6; i++) {
                const slot = team[`slot${i}`];
                if (slot && slot.pkmn === givenName) {
                    // Remplacer par null pour garder le slot disponible
                    team[`slot${i}`] = null;
                }
            }
        }
    }
    
    // 3. Retirer du système de génétique et training
    // Trouver un Pokémon de remplacement (premier capturé disponible, sauf celui qu'on donne et celui qu'on reçoit)
    let replacementPokemon = null;
    for (const key in save) {
        if (key !== givenName && key !== received.name && save[key] && typeof save[key] === 'object' && save[key].caught > 0) {
            if (save[key].level !== undefined && save[key].ability !== undefined) {
                replacementPokemon = key;
                break;
            }
        }
    }
    
    if (save.saved) {
        // Génétique - remplacer par un autre Pokémon ou null si aucun disponible
        if (save.saved.geneticHost === givenName) {
            save.saved.geneticHost = replacementPokemon || null;
        }
        if (save.saved.geneticSample === givenName) {
            save.saved.geneticSample = replacementPokemon || null;
        }
        // Retirer de l'entraînement
        if (save.saved.trainingPokemon === givenName) {
            save.saved.trainingPokemon = replacementPokemon || null;
        }
        // Retirer du currentPkmn
        if (save.saved.currentPkmn === givenName) {
            save.saved.currentPkmn = replacementPokemon || null;
        }
    }
    
    // 4. Gérer les Star Signs - transfert family-wide
    // Si le Pokémon donné a un Star Sign, retirer ce Star Sign de toute la famille du donneur
    const givenFamilyId = evolutionFamilies[givenName];
    const givenStarSign = exchangeState.selectedPokemon.data?.starSign;
    
    if (givenStarSign && givenFamilyId !== undefined) {
        // Trouver tous les Pokémon du save qui appartiennent à la même famille
        for (const key in save) {
            const saveEntry = save[key];
            if (saveEntry && typeof saveEntry === 'object' && saveEntry.caught > 0) {
                // Vérifier si ce Pokémon fait partie de la même famille
                if (evolutionFamilies[key] === givenFamilyId && saveEntry.starSign === givenStarSign) {
                    delete saveEntry.starSign;
                }
            }
        }
    }
    
    // 5. Intégrer le Pokémon reçu
    const existingReceived = save[received.name];
    if (existingReceived && existingReceived.caught > 0) {
        // Déjà capturé -> écraser, caught +1
        save[received.name] = JSON.parse(JSON.stringify(received.data));
        save[received.name].caught = existingReceived.caught + 1;
    } else {
        // Nouveau -> caught = 1
        save[received.name] = JSON.parse(JSON.stringify(received.data));
        save[received.name].caught = 1;
    }
    
    // 6. Propager le Star Sign du Pokémon reçu à toute la famille du receveur
    const receivedFamilyId = evolutionFamilies[received.name];
    const receivedStarSign = received.data?.starSign;
    
    if (receivedStarSign && receivedFamilyId !== undefined) {
        // Ajouter le Star Sign à tous les Pokémon du save qui appartiennent à la même famille
        for (const key in save) {
            const saveEntry = save[key];
            if (saveEntry && typeof saveEntry === 'object' && saveEntry.caught > 0) {
                // Vérifier si ce Pokémon fait partie de la même famille
                if (evolutionFamilies[key] === receivedFamilyId) {
                    saveEntry.starSign = receivedStarSign;
                }
            }
        }
    }
    
    return save;
}

// Télécharger la sauvegarde
function exchangeDownloadSave() {
    if (!exchangeState.generatedSave) return;
    
    const receivedName = exchangeState.otherPlayerPokemon.name;
    const blob = new Blob([JSON.stringify(exchangeState.generatedSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Save_echange_${receivedName}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Réinitialiser
function exchangeReset() {
    // Arrêter le polling
    if (exchangeState.pollingInterval) {
        clearInterval(exchangeState.pollingInterval);
    }
    
    // Reset state
    exchangeState = {
        mode: null,
        roomCode: null,
        playerRole: null,
        localSave: null,
        selectedPokemon: null,
        otherPlayerPokemon: null,
        pollingInterval: null,
        backendUrl: exchangeState.backendUrl,
        wasOtherPlayerPresent: false,
        hasConfirmed: false
    };
    
    // Reset UI
    document.getElementById('exchange-code-input').value = '';
    document.getElementById('exchange-save-input').value = '';
    document.getElementById('exchange-save-error').style.display = 'none';
    document.getElementById('exchange-pokemon-preview').style.display = 'none';
    document.getElementById('exchange-confirm-pokemon-btn').disabled = true;
    
    exchangeShowScreen('home');
}

// Render exchange secrets list dynamically - use pokemons with isSecret flag
function renderExchangeSecrets() {
    const container = document.getElementById('exchange-secrets-list');
    if (!container) return;
    
    // Get all pokemon marked as secret from the pokemons object
    const secretList = Object.keys(pokemons).filter(name => pokemons[name].isSecret);
    
    container.innerHTML = secretList.map(name => {
        const p = pokemons[name];
        const displayName = p?.displayName || format(name);
        // Use rename as sprite fallback (e.g., tangelaEvent -> tangela.png)
        const spriteName = p?.rename || name;
        return `
            <div class="exchange-secret-item" 
                 title="${displayName} - Pokémon Secret" 
                 onclick="showPokemonDetails('${name}')"
                 style="cursor:pointer;transition:transform 0.2s"
                 onmouseover="this.style.transform='scale(1.1)'"
                 onmouseout="this.style.transform='scale(1)'">
                <img src="https://play-pokechill.github.io/img/pkmn/sprite/${name}.png" 
                     alt="${displayName}" 
                     style="width:48px;height:48px;image-rendering:pixelated;"
                     onerror="if(this.getAttribute('data-tried')){this.src='https://play-pokechill.github.io/img/pkmn/sprite/substitute.png';}else{this.setAttribute('data-tried','1');this.src='https://play-pokechill.github.io/img/pkmn/sprite/${spriteName}.png';}">
                <div style="font-size:0.7rem;color:#b19cd9;text-align:center;line-height:1.2;max-width:80px;word-wrap:break-word">${displayName}</div>
            </div>
        `;
    }).join('');
}

// Mettre à jour les listes d'impact selon la langue
function exchangeUpdateImpactLists() {
    const giveList = document.querySelector('.exchange-impact-list-give');
    const receiveList = document.querySelector('.exchange-impact-list-receive');
    if (!giveList || !receiveList) return;
    
    giveList.innerHTML = `
        <li data-i18n="captureCounterReset">${t('captureCounterReset')}</li>
        <li data-i18n="removedFromTeams">${t('removedFromTeams')}</li>
        <li data-i18n="removedFromGenetics">${t('removedFromGenetics')}</li>
        <li data-i18n="removedFromTraining">${t('removedFromTraining')}</li>
        <li data-i18n="allDataErased">${t('allDataErased')}</li>
    `;
    receiveList.innerHTML = `
        <li data-i18n="alreadyCapturedInfo">${t('alreadyCapturedInfo')}</li>
        <li data-i18n="newCaptureInfo">${t('newCaptureInfo')}</li>
        <li data-i18n="allDataKept">${t('allDataKept')}</li>
        <li data-i18n="shinyKept">${t('shinyKept')}</li>
        <li data-i18n="replacesOld">${t('replacesOld')}</li>
    `;
}

// Annuler
async function exchangeCancel() {
    // Notifier le backend qu'on annule (si on est dans une room)
    if (exchangeState.roomCode) {
        try {
            await fetch(`${exchangeState.backendUrl}?action=cancel&code=${exchangeState.roomCode}&player=${exchangeState.playerRole}`);
        } catch (e) {
            // Ignorer les erreurs, le backend va nettoyer la room automatiquement
        }
    }
    exchangeReset();
}



// Helper: URL du sprite - utilise le même CDN que le reste du site

// Ajouter les traductions d'échange à I18N
(function() {
    if (typeof I18N === 'undefined') return;
    
    // FR
    I18N.fr.tabExchange = "Échange";
    I18N.fr.exchangeSubtitle = "Échangez vos Pokémon en direct avec un autre dresseur";
    I18N.fr.exchangeCreate = "Créer un échange";
    I18N.fr.exchangeCreateDesc = "Générer un code pour démarrer";
    I18N.fr.exchangeJoin = "Rejoindre un échange";
    I18N.fr.exchangeJoinDesc = "Entrer le code d'un ami";
    I18N.fr.exchangeShareCode = "Partagez ce code avec votre ami :";
    I18N.fr.exchangeEnterCode = "Entrez le code de l'échange :";
    I18N.fr.exchangeJoinBtn = "Rejoindre";
    I18N.fr.exchangeWaitingPlayer = "En attente du joueur B...";
    I18N.fr.exchangeImportSave = "Importez votre sauvegarde";
    I18N.fr.exchangeDropSave = "Déposez votre sauvegarde pour vérification ou cliquez pour sélectionner";
    I18N.fr.exchangeSelectPokemon = "Choisissez le Pokémon à échanger :";
    I18N.fr.exchangeConfirmSelection = "Confirmer la sélection";
    I18N.fr.exchangeWaitingOther = "En attente de l'autre dresseur...";
    I18N.fr.exchangeReview = "Vérifiez l'échange avant de confirmer :";
    I18N.fr.exchangeYouGive = "VOUS DONNEZ";
    I18N.fr.exchangeYouReceive = "VOUS RECEVEZ";
    I18N.fr.exchangeReady = "⚡ Prêt à échanger ?";
    I18N.fr.exchangeFinalWarning = "Cette action est définitive. Vos sauvegardes seront modifiées.";
    I18N.fr.exchangeConfirmBtn = "✅ CONFIRMER L'ÉCHANGE";
    I18N.fr.exchangeFairPlayTitle = "⚠️ Restez fair-play !";
    I18N.fr.exchangeFairPlayDesc = "Ce système est conçu pour les dresseurs très avancés souhaitant échanger des Pokémon uniques, ou pour aider les nouveaux joueurs à compléter leur Pokédex. Comme dans le jeu original, la sauvegarde peut être manipulée — faisons tous confiance à la communauté.";
    I18N.fr.exchangeImpactGiveTitle = "🔴 Impact sur votre Pokémon donné:";
    I18N.fr.exchangeImpactReceiveTitle = "🟢 Impact sur le Pokémon reçu:";
    I18N.fr.exchangeSuccess = "Échange terminé !";
    I18N.fr.exchangeSuccessDesc = "Votre nouvelle sauvegarde a été générée";
    I18N.fr.exchangeDownloadSave = "Télécharger ma sauvegarde";
    I18N.fr.exchangeExpertTitle = "Zone Interdite — Dresseurs Confirmés Uniquement";
    I18N.fr.exchangeExpertDesc = "L'accès au Cable Link est réservé aux dresseurs ayant prouvé leur valeur. Vous devez avoir terrassé Ultra Entité Lusamine en mode VS pour franchir cette porte. Pas de raccourci, pas de pitié — seuls les meilleurs échangent entre eux. Restez fair-play : ce système est conçu pour échanger des Pokémon uniques entre experts, pas pour ruiner l'expérience des débutants.";
    I18N.fr.exchangeExpertNote = "Et oui, on sait que les sauvegardes peuvent être modifiées. On fait confiance... mais on vérifie quand même.";
    I18N.fr.exchangeStarSignTitle = "Signes Stellaires - Transfert Family-Wide";
    I18N.fr.exchangeStarSignDesc = "Les Pokémon Star Sign transfèrent leur brillance à toute la famille évolutive lors des échanges. Le donneur perd les HUE, le receveur les gagne sur toute la famille.";
    I18N.fr.exchangeLusamineTitle = "Vérification d'accès";
    I18N.fr.exchangeLusamineDesc = "Scan de votre sauvegarde en cours... Accès refusé. Vous devez d'abord terrasser Ultra Entité Lusamine en mode VS. Revenez quand vous serez digne de ce statut.";
    I18N.fr.exchangeLusamineRequired = "ACCES REFUSE. Preuve requise: Victoire contre Ultra Entité Lusamine (mode VS). Farmez, progressez, puis revenez.";
    I18N.fr.exchangeNewTrade = "Nouvel échange";
    I18N.fr.selectFile = "Sélectionner un fichier";
    I18N.fr.cancel = "Annuler";
    I18N.fr.copy = "Copier";
    
    // Anti-cheat messages
    I18N.fr.illegalPokemonTooltip = "Pokémon illégal détecté";
    I18N.fr.cheatLevel = "Niveau illégal (max: 100)";
    I18N.fr.cheatUnobtainable = "Pokémon non disponible dans le jeu";
    I18N.fr.cheatAbility = "Talent illégal";
    I18N.fr.cheatMove = "Attaque illégale";
    I18N.fr.cheatAlertTitle = "⚠️ Pokémon illégal détecté";
    I18N.fr.cheatAlertMessage = "Votre sauvegarde contient des Pokémon modifiés illégalement. Ces Pokémon ne peuvent pas être échangés.";
    I18N.fr.cheatSelectedIllegal = "Vous ne pouvez pas sélectionner ce Pokémon car il contient des modifications illégales.";
    
    // Restricted messages (not cheats, just excluded from exchange)
    I18N.fr.restrictedDitto = "Ditto ne peut pas être échangé (Pokémon spécial)";
    I18N.fr.restrictedSeasonal = "Pokémon événementiel exclusif - non échangeable";
    I18N.fr.restrictedTitle = "Pokémon non échangeable";
    I18N.fr.exchangeRestrictedTitle = "Pokémon exclus de l'échange";
    I18N.fr.exchangeRestrictedDesc = "Les Pokémon suivants ne peuvent pas être échangés car ils sont exclusifs à des événements ou spéciaux (cliquez pour voir les détails) :";
    I18N.fr.exchangeRestrictedNote = "Les Pokémon avec des modifications illégales (niveau >100, attaques impossibles...) sont également bloqués.";
    I18N.fr.restrictedSecret = "Pokémon secret - à découvrir en jeu";
    I18N.fr.restrictedStarSign = "Pokémon Star Sign - transfère les HUE à toute la famille";
    I18N.fr.exchangeSecretsTitle = "Pokémon Secrets";
    I18N.fr.exchangeSecretsDesc = "Les Pokémon secrets découverts en jeu ne peuvent pas être échangés. Cliquez pour voir leurs détails !";
    I18N.fr.exchangeSecretsHint = "À vous de les découvrir...";
    I18N.fr.secretClickHint = "💡 Cliquez sur un Pokémon pour voir ses détails";
    
    // Anti-cheat messages - EN
    I18N.en.illegalPokemonTooltip = "Illegal Pokémon detected";
    I18N.en.cheatLevel = "Illegal level (max: 100)";
    I18N.en.cheatUnobtainable = "Pokémon not available in the game";
    I18N.en.cheatAbility = "Illegal ability";
    I18N.en.cheatMove = "Illegal move";
    I18N.en.cheatMoves = "Illegal moves";
    I18N.en.cheatAlertTitle = "⚠️ Illegal Pokémon detected";
    I18N.en.cheatAlertMessage = "Your save file contains illegally modified Pokémon. These Pokémon cannot be traded.";
    I18N.en.cheatSelectedIllegal = "You cannot select this Pokémon because it contains illegal modifications.";
    
    // Restricted messages EN
    I18N.en.restrictedDitto = "Ditto cannot be traded (special Pokémon)";
    I18N.en.restrictedSeasonal = "Event-exclusive Pokémon - not tradeable";
    I18N.fr.tabGuide = "Guide";
    I18N.fr.guideTitle = "Guide du Débutant";
    I18N.fr.guideSearchPlaceholder = "Rechercher dans le guide...";
    I18N.fr.guideDesc = "Tout ce que vous devez savoir pour bien débuter sur PokeChill !";
    I18N.fr.expandAll = "📂 Tout déplier";
    I18N.fr.collapseAll = "📁 Tout replier";
    
    // EN
    I18N.en.tabGuide = "Guide";
    I18N.en.guideTitle = "Beginner's Guide";
    I18N.en.guideSearchPlaceholder = "Search in guide...";
    I18N.en.guideDesc = "Everything you need to know to get started with PokeChill!";
    I18N.en.expandAll = "📂 Expand All";
    I18N.en.collapseAll = "📁 Collapse All";
    I18N.en.tabExchange = "Trade";
    I18N.en.exchangeSubtitle = "Trade your Pokémon live with another trainer";
    I18N.en.exchangeCreate = "Create Trade";
    I18N.en.exchangeCreateDesc = "Generate a code to start";
    I18N.en.exchangeJoin = "Join Trade";
    I18N.en.exchangeJoinDesc = "Enter a friend's code";
    I18N.en.exchangeShareCode = "Share this code with your friend:";
    I18N.en.exchangeEnterCode = "Enter the trade code:";
    I18N.en.exchangeJoinBtn = "Join";
    I18N.en.exchangeWaitingPlayer = "Waiting for player B...";
    I18N.en.exchangeImportSave = "Import your save file";
    I18N.en.exchangeDropSave = "Drop your save file for verification or click to select";
    I18N.en.exchangeSelectPokemon = "Choose the Pokémon to trade:";
    I18N.en.exchangeConfirmSelection = "Confirm selection";
    I18N.en.exchangeWaitingOther = "Waiting for the other trainer...";
    I18N.en.exchangeReview = "Review the trade before confirming:";
    I18N.en.exchangeYouGive = "YOU GIVE";
    I18N.en.exchangeYouReceive = "YOU RECEIVE";
    I18N.en.exchangeReady = "⚡ Ready to trade?";
    I18N.en.exchangeFinalWarning = "This action is final. Your saves will be modified.";
    I18N.en.exchangeConfirmBtn = "✅ CONFIRM TRADE";
    I18N.en.exchangeFairPlayTitle = "⚠️ Please play fair!";
    I18N.en.exchangeFairPlayDesc = "This system is designed for advanced trainers looking to trade unique Pokémon, or to help new players complete their Pokédex. Like the original game, save files can be manipulated — let's all trust the community.";
    I18N.en.exchangeImpactGiveTitle = "🔴 Impact on your given Pokémon:";
    I18N.en.exchangeImpactReceiveTitle = "🟢 Impact on received Pokémon:";
    I18N.en.exchangeSuccess = "Trade complete!";
    I18N.en.exchangeSuccessDesc = "Your new save file has been generated";
    I18N.en.exchangeDownloadSave = "Download my save";
    I18N.en.exchangeExpertTitle = "Restricted Area — Expert Trainers Only";
    I18N.en.exchangeExpertDesc = "Cable Link access is reserved for trainers who have proven their worth. You must have crushed Ultra Entity Lusamine in VS mode to pass through this gate. No shortcuts, no mercy — only the best trade with each other. Play fair: this system is designed for trading unique Pokémon among experts, not for ruining beginners' experience.";
    I18N.en.exchangeExpertNote = "And yes, we know save files can be edited. We trust... but we verify anyway.";
    I18N.en.exchangeStarSignTitle = "Star Signs - Family-Wide Transfer";
    I18N.en.exchangeStarSignDesc = "Star Sign Pokémon transfer their stellar glow to the entire evolution family during trades. The giver loses HUE unlocks, the receiver gains them for the whole family.";
    I18N.en.exchangeLusamineTitle = "Access Verification";
    I18N.en.exchangeLusamineDesc = "Scanning your save file... Access denied. You must first crush Ultra Entity Lusamine in VS mode. Come back when you're worthy of this status.";
    I18N.en.exchangeLusamineRequired = "ACCESS DENIED. Proof required: Victory against Ultra Entity Lusamine (VS mode). Grind, progress, then come back.";
    I18N.en.exchangeNewTrade = "New trade";
    I18N.en.selectFile = "Select file";
    I18N.en.cancel = "Cancel";
    I18N.en.copy = "Copy";
    
    // Restricted/Secrets section translations
    I18N.en.exchangeRestrictedTitle = "Pokémon excluded from trading";
    I18N.en.exchangeRestrictedDesc = "The following Pokémon cannot be traded as they are event-exclusive or special (click to see details):";
    I18N.en.exchangeRestrictedNote = "Pokémon with illegal modifications (level >100, impossible moves...) are also blocked.";
    I18N.en.restrictedSecret = "Secret Pokémon - to be discovered in-game";
    I18N.en.restrictedStarSign = "Star Sign Pokémon - transfers family-wide HUE unlocks";
    I18N.en.exchangeSecretsTitle = "Secret Pokémon";
    I18N.en.exchangeSecretsDesc = "Secret Pokémon discovered in-game cannot be traded. Click to see their details!";
    I18N.en.exchangeSecretsHint = "Go find them...";
    I18N.en.secretClickHint = "💡 Click on a Pokémon to see its details";
    
    // Mettre à jour la page avec les nouvelles traductions
    if (typeof I18N.updatePage === 'function') {
        I18N.updatePage();
    }
    
    // Mettre à jour les listes d'impact (nécessite innerHTML)
    exchangeUpdateImpactLists();

})();