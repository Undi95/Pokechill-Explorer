// ============ SHOP ============
let currentShopCategory = '';  // No default category - show all items

function filterShopCategory(cat) {
    currentShopCategory = cat;
    // Update button styles
    document.querySelectorAll('.shop-cat-btn').forEach(btn => {
        const isActive = btn.dataset.cat === cat || (cat === '' && btn.dataset.cat === '');
        btn.style.borderColor = isActive ? 'var(--accent-blue)' : 'var(--border)';
        btn.style.background = isActive ? 'rgba(0,212,255,0.1)' : 'var(--bg-card)';
    });
    updateShopDatalist(cat);
    searchShop();
}

function updateShopDatalist(cat) {
    const shopDatalist = document.getElementById('shop-datalist');
    if (!shopDatalist) return;
    
    let names = [];
    
    if (cat === 'decor') {
        names = Object.values(decorItems).map(d => d.name).filter(Boolean);
    } else if (cat === 'apricorn') {
        names = ['autoRefightTicket', 'heartScale', 'energyRoot', 'fashionCase', 'magazineSubscription', 'battlePass', 'replicatorUpgradeS', 'festivalTicket'];
        names = names.concat(Object.values(items).filter(i => i.type === 'memory' && i.rarity).map(i => i.name));
    } else if (cat === 'cooking') {
        names = Object.values(GAME_CONFIG.INGREDIENTS || {}).map(ing => format(ing.name));
    } else if (cat && cat !== 'all') {
        // Filter by category
        names = Object.values(shopItems).flatMap(item => Array.isArray(item) ? item : [item])
            .filter(i => i.category === cat)
            .map(i => i.itemName || i.pokemon)
            .filter(Boolean);
    } else {
        // All items except limited and decor
        names = Object.values(shopItems).flatMap(item => Array.isArray(item) ? item : [item])
            .filter(i => i.category !== 'limited' && i.category !== 'decor')
            .map(i => i.itemName || i.pokemon)
            .filter(Boolean);
    }
    
    shopDatalist.innerHTML = [...new Set(names)].sort().map(n => `<option value="${n}">`).join('');
}

function updateLimitedShopButton() {
    // Check if there are active limited items (event items with conditions met)
    const hasLimitedItems = Object.values(shopItems).some(item => {
        if (item.category !== 'limited') return false;
        // For limited items, check if condition might be met
        if (item.hasCondition) {
            // Check if it's a Halloween item (uses oldGateau currency)
            if (item.currency === 'oldGateau') return isHalloweenActive();
            // Check for other event currencies (dynamically detected from shop)
            const eventCurrencies = GAME_CONFIG.EVENT_CURRENCIES.length > 0 ? GAME_CONFIG.EVENT_CURRENCIES : ['pokeflute', 'primalEarth', 'steelKeystone', 'wormholeResidue', 'futureContraption', 'redChain'];
            if (eventCurrencies.includes(item.currency)) {
                const currencyToEvent = GAME_CONFIG.CURRENCY_TO_EVENT && Object.keys(GAME_CONFIG.CURRENCY_TO_EVENT).length > 0 
                    ? GAME_CONFIG.CURRENCY_TO_EVENT 
                    : { 'pokeflute': 1, 'primalEarth': 2, 'steelKeystone': 3, 'wormholeResidue': 4, 'futureContraption': 5, 'redChain': 6 };
                return currentRotations.event === currencyToEvent[item.currency];
            }
        }
        return true;
    });
    
    // Show/hide limited button
    const limitedBtn = document.getElementById('shop-limited-btn');
    if (limitedBtn) {
        limitedBtn.style.display = hasLimitedItems ? 'block' : 'none';
    }
}

function searchShop() {
    const se = document.getElementById('shop-search').value.toLowerCase();
    const cat = currentShopCategory;
    const cur = document.getElementById('shop-currency').value;
    
    // Update URL hash
    updateURLHash('shop', { search: se, category: cat, currency: cur });
    
    // Update limited button visibility
    updateLimitedShopButton();
    
    // For decor category, build entries from ALL decor items except limited ones
    // Use real shop prices when available (like wealthyCoins), otherwise use default prices
    let shopItemsToUse;
    if (cat === 'decor') {
        // Get limited decor names (these appear in Limited category, not here)
        const limitedDecorNames = new Set(
            Object.values(shopItems)
                .filter(s => s.category === 'limited' && s.itemName && decorItems[s.itemName])
                .map(s => s.itemName)
        );
        
        // Build shop entries for all non-limited decor items
        shopItemsToUse = Object.values(decorItems)
            .filter(d => !limitedDecorNames.has(d.name))
            .map(d => {
                const { price, currency } = getDecorPriceInfo(d.name);
                return {
                    itemName: d.name,
                    price: price,
                    currency: currency,
                    category: 'decor'
                };
            });
    } else if (cat === 'apricorn') {
        // Build apricorn shop entries dynamically
        // Fixed items (always available)
        const fixedItems = [
            { itemName: 'autoRefightTicket', price: 2, stock: 3, currency: 'yellowApricorn' },
            { itemName: 'heartScale', price: 1, stock: 5, currency: 'pinkApricorn' },
            { itemName: 'energyRoot', price: 1, stock: 10, currency: 'greenApricorn' },
            { itemName: 'fashionCase', price: 1, stock: 5, currency: 'yellowApricorn' },
            { itemName: 'magazineSubscription', price: 10, stock: 1, currency: 'whiteApricorn' },
            { itemName: 'battlePass', price: 20, stock: 1, currency: 'whiteApricorn' },
            { itemName: 'replicatorUpgradeS', price: 30, stock: 1, currency: 'whiteApricorn' },
            { itemName: 'replicatorUpgradeE', price: 40, stock: 1, currency: 'whiteApricorn' },
            { itemName: 'festivalTicket', price: 150, stock: null, currency: 'whiteApricorn' }
        ];
        
        // Memory items - use pre-assigned apricorn currencies from item data
        // Only include memories with rarity (common/rare/white) - exclude fixed shop memories
        // Fixed memories sold for bottle caps (hydratationMemory, etc.) don't have rarity property
        const allMemories = Object.values(items).filter(i => i.type === 'memory' && i.rarity);
        const memoryItems = allMemories.map(mem => ({
            itemName: mem.name,
            price: 3,
            stock: 3,
            currency: mem.apricornCurrency || 'yellowApricorn',
            isMemory: true,
            memoryImage: mem.memoryImage || mem.ability || mem.name.replace(/Memory$/, '')
        }));
        
        shopItemsToUse = [
            ...fixedItems.map(i => ({ ...i, category: 'apricorn' })),
            ...memoryItems.map(i => ({ ...i, category: 'apricorn' }))
        ];
    } else if (cat === 'cooking') {
        // Build cooking/ingredient entries from parsed data
        shopItemsToUse = Object.values(GAME_CONFIG.INGREDIENTS || {}).map(ing => ({
            shopId: 'ingredient_' + ing.name,
            itemName: ing.name,
            isIngredient: true,
            ingredientAbility: ing.ability,
            price: ing.price,
            currency: ing.currency || 'goldenBottleCap',
            category: 'cooking'
        }));
    } else {
        // Flatten shopItems to handle duplicates (items with multiple shop entries)
        shopItemsToUse = Object.values(shopItems).flatMap(item => 
            Array.isArray(item) ? item : [item]
        );
    }
    
    const res = shopItemsToUse.filter(item => {
        const name = item.itemName || item.pokemon || '';
        const isDecor = item.category === 'decor' || cat === 'decor';
        const displayName = item.isPokemon ? (pokemons[item.pokemon]?.displayName || format(item.pokemon)) : 
            isDecor ? (decorItems[item.itemName]?.displayName || format(name)) :
            (items[item.itemName]?.displayName || format(name));
        if (se && !name.toLowerCase().includes(se) && !displayName.toLowerCase().includes(se)) return false;
        // Filter by category - if cat is empty or 'all', show all except limited/decor (which have their own tabs)
        if (cat && cat !== 'all') {
            if (item.category !== cat) return false;
        } else if (!cat || cat === 'all') {
            // When showing 'all', exclude limited and decor items (they have their own tabs)
            if (item.category === 'limited' || item.category === 'decor') return false;
        }
        if (cur && item.currency !== cur) return false;
        
        // Filter out event items with unmet conditions
        if (item.hasCondition) {
            // Event consumables - check based on currency and current rotation (dynamically detected)
            const eventCurrencies = GAME_CONFIG.EVENT_CURRENCIES.length > 0 ? [...GAME_CONFIG.EVENT_CURRENCIES, 'oldGateau'] : ['pokeflute', 'primalEarth', 'steelKeystone', 'wormholeResidue', 'futureContraption', 'redChain', 'oldGateau'];
            if (eventCurrencies.includes(item.currency)) {
                const currencyToEvent = GAME_CONFIG.CURRENCY_TO_EVENT && Object.keys(GAME_CONFIG.CURRENCY_TO_EVENT).length > 0 
                    ? GAME_CONFIG.CURRENCY_TO_EVENT 
                    : { 'pokeflute': 1, 'primalEarth': 2, 'steelKeystone': 3, 'wormholeResidue': 4, 'futureContraption': 5, 'redChain': 6 };
                // oldGateau is Halloween currency, only show if Halloween is active
                if (item.currency === 'oldGateau') {
                    return isHalloweenActive();
                }
                if (item.currency !== 'oldGateau') {
                    return currencyToEvent[item.currency] !== undefined && currentRotations.event === currencyToEvent[item.currency];
                }
            }
        }
        
        return true;
    }).sort((a, b) => {
        // Sort by category then price
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.price - b.price;
    });
    
    const c = document.getElementById('shop-results');
    if (res.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    
    // Group by category
    const byCategory = {};
    res.forEach(item => {
        const cat = item.category || 'other';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(item);
    });
    
    const categoryNames = {
        'goods': t('goods'), 'held': t('held'), 'evolution': t('evolution'),
        'genetics': t('genetics'), 'tm': t('tm'), 'pokemon': t('pokemon'), 
        'limited': t('limited') || 'Limited', 'decor': t('decorCategory') || 'Decor', 
        'apricorn': t('apricornShop') || 'Apricorn', 'all': t('all') || 'All'
    };
    
    let html = `<div class="results-info">${res.length} ${t('results')}</div>`;
    
    // Add rotation info message for decor category
    if (cat === 'decor') {
        html += `<div style="margin:15px 0;padding:12px 15px;background:rgba(0,212,255,0.1);border-left:3px solid var(--accent-blue);border-radius:6px;font-size:0.9rem;color:var(--text-dim)">
            <strong style="color:var(--accent-blue)">ℹ️ ${t('decorRotationInfo') || 'Rotation aléatoire'}</strong><br>
            ${t('decorRotationDesc') || '6 accessoires sont disponibles aléatoirement dans la boutique en jeu (5 communs + 1 rare). La rotation change tous les 3 jours et est identique pour tous les joueurs.'}
        </div>`;
    }
    
    // Add rotation info and split fixed/rotating items for apricorn category
    if (cat === 'apricorn') {
        html += `<div style="margin:15px 0;padding:12px 15px;background:rgba(255,215,0,0.1);border-left:3px solid var(--accent-gold);border-radius:6px;font-size:0.9rem;color:var(--text-dim)">
            <strong style="color:var(--accent-gold)">ℹ️ ${t('apricornRotationInfo') || 'Rotation des Mémoires'}</strong><br>
            ${t('apricornRotationDesc') || 'Les Mémoires disponibles changent chaque jour (rotation aléatoire). Les items fixes restent toujours disponibles.'}
        </div>`;
        
        // Split items into fixed and rotating (memories)
        const fixedItems = res.filter(item => !item.isMemory);
        const rotatingItems = res.filter(item => item.isMemory);
        
        // Show fixed items first
        if (fixedItems.length > 0) {
            html += `<div style="margin-top:20px">
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:10px;color:var(--accent-green)">📦 ${t('apricornFixed') || 'Items Fixes'}</div>
                <div class="results-grid">${fixedItems.map(item => renderShopItem(item)).join('')}</div>
            </div>`;
        }
        
        // Show rotating items (memories)
        if (rotatingItems.length > 0) {
            html += `<div style="margin-top:20px">
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:10px;color:var(--accent-gold)">🔄 ${t('apricornRotating') || 'Mémoires (Rotation)'}</div>
                <div class="results-grid">${rotatingItems.map(item => renderShopItem(item)).join('')}</div>
            </div>`;
        }
    } else if (cat === 'cooking') {
        // Cooking/Restaurant header with pot image
        html += `<div style="margin:15px 0;padding:25px;background:linear-gradient(135deg,rgba(0,255,136,0.1),rgba(255,153,0,0.1));border:2px solid var(--accent-green);border-radius:12px;text-align:center">
            <div style="margin-bottom:15px">
                <img src="${CONFIG.repoBase}img/icons/curry.png" style="width:100px;height:100px;image-rendering:pixelated;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5))">
            </div>
            <h3 style="margin:0 0 15px 0;color:var(--accent-green);font-size:1.3rem">${t('cookingTitle') || 'Restaurant - Cooking'}</h3>
            <p style="color:var(--text-dim);margin:0;font-size:0.95rem;max-width:550px;margin-left:auto;margin-right:auto;line-height:1.5">${t('cookingFullDesc') || t('cookingDesc') || 'Cook with 3 ingredients to temporarily replace your team abilities with the ones granted by the ingredients. Effects will last during the whole Raid.'}</p>
        </div>`;
        
        // Show all ingredients
        html += `<div class="results-grid" style="margin-top:20px">${res.map(item => renderShopItem(item)).join('')}</div>`;
    } else {
        // Default grouping for other categories
        Object.entries(byCategory).forEach(([category, items]) => {
            html += `<div style="margin-top:20px">
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:10px;color:var(--accent-blue)">${categoryNames[category] || category}</div>
                <div class="results-grid">${items.map(item => renderShopItem(item)).join('')}</div>
            </div>`;
        });
    }
    
    c.innerHTML = html;
}

function renderShopItem(item) {
    // Handle cooking ingredients
    if (item.isIngredient) {
        const ability = abilities[item.ingredientAbility];
        const abilityName = ability?.displayName || format(item.ingredientAbility);
        const imgSrc = itemImg('friedFood');
        const clickAction = ability ? `onclick="showAbilityPokemon('${item.ingredientAbility}')"` : '';
        const currencyImg = itemImg(item.currency || 'bottleCap');
        const currencyName = items[item.currency]?.displayName || format(item.currency) || t('bottleCaps') || 'Bottle Caps';
        
        return `<div class="card" ${clickAction}>
            <div class="card-header">
                <div class="card-title-row">
                    <img class="item-sprite" src="${imgSrc}" style="image-rendering:pixelated">
                    <span class="card-name">${format(item.itemName)}</span>
                </div>
                <span style="font-size:0.75rem;color:var(--text-dim)">🍲 ${t('cookingShop') || 'Restaurant'}</span>
            </div>
            <p class="card-info">${t('grantsAbility') || 'Grants'}: <strong style="color:var(--accent-green)">${abilityName}</strong></p>
            <div style="margin-top:10px;padding:8px;background:rgba(0,212,255,0.1);border-radius:6px;text-align:center">
                <div style="display:flex;align-items:center;justify-content:center;gap:5px">
                    <img src="${currencyImg}" style="width:24px;height:24px;image-rendering:pixelated">
                    <span style="font-weight:700;color:var(--accent-blue)">${item.price}</span>
                </div>
                <span style="font-size:0.8rem;color:var(--text-dim)">${currencyName}</span>
            </div>
        </div>`;
    }
    
    // Determine currency display
    let currencyName, currencyImg;
    // For memory items in apricorn shop, use generic "Apricorn" text since color varies
    if (item.isMemory) {
        currencyName = t('apricornShop') || 'Noigrume';
        currencyImg = itemImg('yellowApricorn'); // fallback, will be replaced by animation
    } else if (item.currency === 'bottleCap') {
        currencyName = t('bottleCaps') || 'Bottle Caps';
        currencyImg = itemImg('bottleCap');
    } else if (item.currency === 'goldenBottleCap') {
        currencyName = t('goldCaps') || 'Gold Caps';
        currencyImg = itemImg('goldenBottleCap');
    } else if (item.currency === 'yellowApricorn') {
        currencyName = t('yellowApricorn') || 'Yellow Apricorn';
        currencyImg = itemImg('yellowApricorn');
    } else if (item.currency === 'pinkApricorn') {
        currencyName = t('pinkApricorn') || 'Pink Apricorn';
        currencyImg = itemImg('pinkApricorn');
    } else if (item.currency === 'greenApricorn') {
        currencyName = t('greenApricorn') || 'Green Apricorn';
        currencyImg = itemImg('greenApricorn');
    } else if (item.currency === 'whiteApricorn') {
        currencyName = t('whiteApricorn') || 'White Apricorn';
        currencyImg = itemImg('whiteApricorn');
    } else {
        // Event currency (item)
        currencyName = items[item.currency]?.displayName || format(item.currency);
        currencyImg = itemImg(item.currency);
    }
    
    // Limited stock badge
    const stockBadge = item.stock ? `<span style="padding:2px 6px;background:rgba(255,0,170,0.2);color:var(--accent-pink);border-radius:4px;font-size:0.7rem">${t("limited")}: ${item.stock}</span>` : '';
    
    if (item.isPokemon) {
        const pkmn = pokemons[item.pokemon];
        const displayName = pkmn?.displayName || format(item.pokemon);
        return `<div class="card" ${pkmn ? `onclick="showPokemonDetails('${item.pokemon}')"` : ''}>
            <div class="card-header">
                <div class="card-title-row">
                    <img class="pkmn-sprite" src="${sprite(item.pokemon)}" onerror="this.style.display='none'">
                    <span class="card-name">${displayName}</span>
                </div>
                <span class="rarity rarity-3">Pokémon</span>
            </div>
            ${pkmn ? `<div class="type-badges">${pkmn.types.map(t => typeBadge(t)).join('')}</div>` : ''}
            <div style="margin-top:10px;padding:8px;background:rgba(0,212,255,0.1);border-radius:6px;text-align:center">
                <div style="display:flex;align-items:center;justify-content:center;gap:5px">
                    <img src="${currencyImg}" style="width:24px;height:24px;image-rendering:pixelated" onerror="this.style.display='none'">
                    <span style="font-weight:700;color:var(--accent-blue)">${item.price}</span>
                </div>
                <span style="font-size:0.8rem;color:var(--text-dim)">${currencyName}</span>
                ${stockBadge}
            </div>
        </div>`;
    }
    
    const itemData = items[item.itemName];
    const decorData = decorItems[item.itemName];
    // Use custom name from shop if available (e.g., "Barbaracite x21"), otherwise fallback to item display name
    const displayName = item.customName || itemData?.displayName || decorData?.displayName || format(item.itemName);
    let imgSrc = itemImg(item.itemName);
    if (itemData?.isTM && itemData?.tmType) imgSrc = itemImg(`tm${itemData.tmType.charAt(0).toUpperCase() + itemData.tmType.slice(1)}`);
    if (item.category === 'decor' || (decorData && !itemData) || (decorData && item.category === 'limited')) imgSrc = decorIcon(item.itemName);
    // Handle memory items - use memoryImage for the icon
    if (itemData?.type === 'memory' && itemData?.memoryImage) {
        imgSrc = itemImg(`${itemData.memoryImage}Memory`);
    }
    // Handle memory items from apricorn shop (item has memoryImage directly)
    if (item.isMemory && item.memoryImage) {
        imgSrc = itemImg(`${item.memoryImage}Memory`);
    }
    
    // Handle memory items info
    let infoText = itemData?.info;
    if (infoText && typeof infoText === 'function') {
        try {
            infoText = infoText();
            // Strip HTML tags for cleaner display
            infoText = infoText.replace(/<[^>]*>/g, '');
        } catch(e) {
            console.warn('[Explorer] Error calling info function:', e);
            infoText = null;
        }
    }
    // Generate memory item description if not present or failed
    if (!infoText && itemData?.type === 'memory') {
        const abilityName = itemData.ability || item.itemName.replace(/Memory$/, '');
        if (abilityName && abilities[abilityName]) {
            const abilityData = abilities[abilityName];
            const abilityTypes = abilityData.types || abilityData.type || ['all'];
            infoText = (t('memoryTeaches') || 'Teaches {ability} to {types} Pokémon')
                .replace('{ability}', abilityData.displayName || format(abilityName))
                .replace('{types}', Array.isArray(abilityTypes) ? abilityTypes.join('/') : abilityTypes);
        } else {
            infoText = t('memoryItem');
        }
    }
    
    // Handle click action based on item type
    let clickAction = '';
    if (item.category === 'decor' || decorData) {
        // Don't show equip button in shop (pass false)
        clickAction = `onclick="showDecorDetails('${item.itemName}', false)"`;
    } else if (itemData) {
        clickAction = `onclick="showItemDrops('${item.itemName}')"`;
    }
    
    // For memory items in apricorn shop, use cycling apricorn animation
    // For fixed items, show larger apricorn icon
    const isMemoryInShop = item.isMemory;
    const isApricornCategory = item.category === 'apricorn';
    const apricornCategoryIcon = isMemoryInShop
        ? '<span class="apricorn-cycle"><img src="' + itemImg('yellowApricorn') + '"><img src="' + itemImg('pinkApricorn') + '"><img src="' + itemImg('greenApricorn') + '"><img src="' + itemImg('whiteApricorn') + '"></span>'
        : '<img src="' + itemImg(item.currency || 'yellowApricorn') + '" style="width:16px;height:16px;vertical-align:middle">';
    const apricornPriceIcon = isMemoryInShop
        ? '<span class="apricorn-cycle apricorn-cycle-lg"><img src="' + itemImg('yellowApricorn') + '"><img src="' + itemImg('pinkApricorn') + '"><img src="' + itemImg('greenApricorn') + '"><img src="' + itemImg('whiteApricorn') + '"></span>'
        : '<img src="' + currencyImg + '" style="width:24px;height:24px;image-rendering:pixelated" onerror="this.style.display=\'none\'">';
    
    return `<div class="card" ${clickAction}>
        <div class="card-header">
            <div class="card-title-row">
                <img class="item-sprite" src="${imgSrc}" onerror="this.style.display='none'">
                <span class="card-name">${displayName}</span>
            </div>
            <span style="font-size:0.75rem;color:var(--text-dim)">${item.category === 'decor' ? '🎀 ' + t('decorCategory') : item.category === 'apricorn' ? apricornCategoryIcon + ' ' + t('apricornShop') : item.category}</span>
        </div>
        ${infoText ? `<p class="card-info">${infoText}</p>` : ''}
        <div style="margin-top:10px;padding:8px;background:rgba(0,212,255,0.1);border-radius:6px;text-align:center">
            <div style="display:flex;align-items:center;justify-content:center;gap:5px">
                ${apricornPriceIcon}
                <span style="font-weight:700;color:var(--accent-blue)">${item.price}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-dim)">${currencyName}</span>
            ${stockBadge}
        </div>
    </div>`;
}

// Render Cooking ingredients (v4.7)
function renderCookingIngredients() {
    const container = document.getElementById('cooking-ingredients');
    if (!container) return;
    if (!GAME_CONFIG.INGREDIENTS) {
        container.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px">Loading...</div>';
        return;
    }
    
    const ingredients = Object.values(GAME_CONFIG.INGREDIENTS);
    if (ingredients.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);text-align:center;padding:20px">${t('noIngredients') || 'No ingredients found'}</div>`;
        return;
    }
    
    container.innerHTML = ingredients.map(ing => {
        const ability = abilities[ing.ability];
        const abilityName = ability?.displayName || format(ing.ability);
        const itemImg = `${CONFIG.repoBase}img/items/friedFood.png`; // Default cooking icon
        
        return `<div style="padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='var(--accent-green)'" onmouseout="this.style.borderColor='var(--border)'" onclick="showAbilityPokemon('${ing.ability}')">
            <img src="${itemImg}" style="width:32px;height:32px;image-rendering:pixelated">
            <div style="flex:1">
                <div style="font-weight:600;font-size:0.9rem">${format(ing.name)}</div>
                <div style="font-size:0.8rem;color:var(--text-dim)">→ ${abilityName}</div>
            </div>
            <div style="text-align:right">
                <div style="color:var(--accent-gold);font-weight:700">${ing.price} 🪙</div>
            </div>
        </div>`;
    }).join('');
}

// Enter key search
document.addEventListener('keyup', e => {
    if (e.key === 'Enter' && e.target.matches('input[type="text"]')) {
        const panel = e.target.closest('.panel')?.id.replace('-panel', '');
        if (panel === 'pokemon') searchPokemon();
        else if (panel === 'division') searchByDivision();
        else if (panel === 'abilities') searchAbilities();
        else if (panel === 'moves') searchMoves();
        else if (panel === 'items') searchItems();
        else if (panel === 'areas') searchAreas();
        else if (panel === 'dungeon') searchDungeons();
        else if (panel === 'event') searchEventZones();
        else if (panel === 'dimension') searchDimensionZones();
        else if (panel === 'seasonal') searchSeasonalZones();
        else if (panel === 'trainers') searchTrainers();
        else if (panel === 'team') searchTeamPokemon();
        else if (panel === 'compare') searchComparePokemon();
        else if (panel === 'shop') searchShop();
        else if (panel === 'accessory') updateAccessoryPreview();
    }
});