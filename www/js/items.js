// ============ ITEMS ============
function searchItems() {
    const se = document.getElementById('item-search').value.toLowerCase();
    const ty = document.getElementById('item-type').value;
    const av = document.getElementById('item-avail').value;
    
    // Update URL hash
    updateURLHash('items', { search: se, type: ty, avail: av });
    
    // Handle ingredient filter - search in GAME_CONFIG.INGREDIENTS
    if (ty === 'ingredient') {
        const ingredients = Object.values(GAME_CONFIG.INGREDIENTS || {})
            .filter(ing => !se || ing.name.toLowerCase().includes(se) || format(ing.name).toLowerCase().includes(se))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        const c = document.getElementById('items-results');
        if (ingredients.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
        c.innerHTML = `<div class="results-info">${ingredients.length} ${t('results')}</div><div class="results-grid">${ingredients.map(ing => renderIngredientCard(ing)).join('')}</div>`;
        return;
    }
    
    // When searching with text and no type filter, also search in ingredients
    let ingredientResults = [];
    if (se && (!ty || ty === 'all')) {
        ingredientResults = Object.values(GAME_CONFIG.INGREDIENTS || {})
            .filter(ing => ing.name.toLowerCase().includes(se) || format(ing.name).toLowerCase().includes(se))
            .map(ing => ({ ...ing, isIngredientResult: true }));
    }
    
    const res = Object.values(items).filter(i => {
        // Hide hidden items (mysteryEgg, tmDummy)
        if (i.isHiddenItem) return false;
        if (se && !i.searchText.includes(se)) return false;
        // Type filtering
        if (ty === 'tm' && !i.isTM) return false;
        if (ty === 'evo' && (!i.isEvo || i.type === 'mega')) return false;
        if (ty === 'mega' && i.type !== 'mega') return false;
        if (ty === 'held' && i.type !== 'held') return false;
        if (ty === 'zCrystal' && !i.zType) return false;
        if (ty === 'genetics' && !i.isGenetics) return false;
        if (ty === 'vitamin' && !i.isVitamin) return false;
        if (ty === 'accessory' && i.type !== 'decor') return false;
        if (ty && !['tm','evo','held','mega','genetics','vitamin','accessory','zCrystal'].includes(ty) && i.type !== ty) return false;
        
        const isDroppable = !!droppableItems[i.name];
        const isInShop = !!shopItems[i.name];
        const isReward = !!rewardableItems[i.name];
        const isSpiraling = !!spiralingRewardItems[i.name];
        // Build apricorn fixed items list dynamically from items with isPermanent flag
    // These are items always available in the apricorn exchange shop
    const permanentItemsFromData = Object.values(items).filter(i => i.isPermanent).map(i => i.name);
    const apricornFixed = permanentItemsFromData.length > 0 ? permanentItemsFromData : ['autoRefightTicket', 'heartScale', 'energyRoot', 'fashionCase', 'magazineSubscription', 'battlePass', 'replicatorUpgradeS'];
        const isInApricorn = apricornFixed.includes(i.name) || i.type === 'memory';
        const isObtainable = isDroppable || isInShop || isReward || isSpiraling || isInApricorn;

        if (av === 'drop' && !isDroppable) return false;
        if (av === 'shop' && !isInShop && !isInApricorn) return false;
        if (av === 'reward' && !isReward) return false;
        if (av === 'tower' && !isSpiraling) return false;
        if (av === 'unavailable' && isObtainable) return false;
        
        return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    // Combine with ingredient results if any
    const combinedResults = [...res, ...ingredientResults];
    
    const c = document.getElementById('items-results');
    if (combinedResults.length === 0) { c.innerHTML = `<div class="no-results">${t('noResults')}</div>`; return; }
    c.innerHTML = `<div class="results-info">${combinedResults.length} ${t('results')}</div><div class="results-grid">${combinedResults.map(i => i.isIngredientResult ? renderIngredientCard(i) : renderItemCard(i)).join('')}</div>`;
}

function renderIngredientCard(ing) {
    const ability = abilities[ing.ability];
    const abilityName = ability?.displayName || format(ing.ability);
    const imgSrc = itemImg('friedFood');
    const clickAction = ability ? `onclick="showAbilityPokemon('${ing.ability}')"` : '';
    const currencyImg = itemImg(ing.currency || 'goldenBottleCap');
    const currencyName = items[ing.currency]?.displayName || format(ing.currency) || 'Gold Caps';
    
    return `<div class="card" ${clickAction}>
        <div class="card-header">
            <div class="card-title-row">
                <img class="item-sprite" src="${imgSrc}" style="image-rendering:pixelated">
                <span class="card-name">${format(ing.name)}</span>
            </div>
            <span style="font-size:0.75rem;color:var(--text-dim)">🍲 ${t('cookingShop') || 'Restaurant'}</span>
        </div>
        <p class="card-info">${t('grantsAbility') || 'Grants'}: <strong style="color:var(--accent-green)">${abilityName}</strong></p>
        <div style="margin-top:10px;padding:8px;background:rgba(0,212,255,0.1);border-radius:6px;text-align:center">
            <div style="display:flex;align-items:center;justify-content:center;gap:5px">
                <img src="${currencyImg}" style="width:24px;height:24px;image-rendering:pixelated">
                <span style="font-weight:700;color:var(--accent-blue)">${ing.price}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-dim)">${currencyName}</span>
        </div>
    </div>`;
}

function renderItemCard(i) {
    let info = i.moveInfo ? i.moveInfo.info : i.info;
    // Generate description for memory items from their linked ability
    let memoryAbilityInfo = null;
    if (i.type === 'memory' && i.ability && abilities[i.ability]) {
        const ab = abilities[i.ability];
        const abTypes = ab.types || [];
        info = (t('memoryTeaches') || 'Teaches {ability} to {types} Pokémon')
            .replace('{ability}', ab.displayName || format(i.ability))
            .replace('{types}', abTypes.length > 0 ? abTypes.join('/') : 'all');
        memoryAbilityInfo = { name: i.ability, displayName: ab.displayName || format(i.ability), info: ab.info, types: abTypes };
    }
    let imgSrc = itemImg(i.name);
    if (i.isTM && i.tmType) imgSrc = itemImg(`tm${i.tmType.charAt(0).toUpperCase() + i.tmType.slice(1)}`);
    if (i.type === 'memory' && i.memoryImage) imgSrc = itemImg(`${i.memoryImage}Memory`);
    if (i.type === 'decor') imgSrc = decorIcon(i.name);
    
    const isDroppable = !!droppableItems[i.name];
    const isReward = !!rewardableItems[i.name];
    const isSpiraling = !!spiralingRewardItems[i.name];

    // Check if item is in apricorn shop (must be before first usage)
    // Build apricorn fixed items list dynamically from items with isPermanent flag
    const permanentItemsFromData = Object.values(items).filter(i => i.isPermanent).map(i => i.name);
    const apricornFixedItems = permanentItemsFromData.length > 0 ? permanentItemsFromData : ['autoRefightTicket', 'heartScale', 'energyRoot', 'fashionCase', 'magazineSubscription', 'battlePass', 'replicatorUpgradeS', 'replicatorUpgradeE'];
    const isInApricornShop = apricornFixedItems.includes(i.name) || i.type === 'memory';

    // For decor items: all are obtainable, get price info for all (including limited like witchyHat)
    let shopInfo = null;
    let isInShop = false;
    if (i.type === 'decor') {
        isInShop = true; // All decor items are in shop (regular or limited)
        shopInfo = getDecorPriceInfo(i.name);
    } else {
        shopInfo = shopItems[i.name];
        // Handle items with multiple shop entries (array) - take the first available one
        if (Array.isArray(shopInfo)) {
            shopInfo = shopInfo.find(s => !s.eventRotation || currentRotations.event === s.eventRotation) || shopInfo[0];
        }
        isInShop = !!shopInfo;
    }
    const isObtainable = isDroppable || isInShop || isReward || isSpiraling || i.type === 'decor' || isInApricornShop;

    let clickable = 'class="no-click"';
    if (i.type === 'decor') clickable = `onclick="showDecorItemInfo('${i.name}')" style="cursor:pointer"`;
    else if (isDroppable || isReward || isInApricornShop) clickable = `onclick="showItemDrops('${i.name}')" style="cursor:pointer"`;
    
    let availBadges = '';
    if (isDroppable) availBadges += `<span style="padding:2px 6px;background:rgba(0,255,136,0.2);color:var(--accent-green);border-radius:3px;font-size:0.7rem;margin-right:4px">${t("drops")}</span>`;
    if (isReward) availBadges += `<span style="padding:2px 6px;background:rgba(255,215,0,0.2);color:var(--accent-gold);border-radius:3px;font-size:0.7rem;margin-right:4px">${t("event")}</span>`;
    if (isSpiraling) availBadges += `<span style="padding:2px 6px;background:rgba(148,0,211,0.2);color:var(--accent-purple);border-radius:3px;font-size:0.7rem;margin-right:4px">${t("tower")}</span>`;
    if (isInShop && shopInfo) {
        // Hide Old Gateau prices when not Halloween
        const isOldGateau = shopInfo.currency === 'oldGateau';
        const showPrice = !isOldGateau || isHalloweenActive();
        if (showPrice) {
            availBadges += `<span style="padding:2px 6px;background:rgba(0,212,255,0.2);color:var(--accent-blue);border-radius:3px;font-size:0.7rem;display:inline-flex;align-items:center;gap:3px"><img src="${shopInfo.iconImg}" style="width:14px;height:14px;image-rendering:pixelated"> ${t('shopFor')} (${shopInfo.price})</span>`;
        }
    }
    
    // Apricorn shop badge
    if (isInApricornShop) {
        const isFixedApricorn = apricornFixedItems.includes(i.name);
        const apricornPrice = isFixedApricorn ? (i.name === 'autoRefightTicket' ? 2 : 1) : 3;
        const apricornCurrencyMap = { 'autoRefightTicket': 'yellowApricorn', 'heartScale': 'pinkApricorn', 'energyRoot': 'greenApricorn', 'fashionCase': 'yellowApricorn' };
        const currency = isFixedApricorn ? apricornCurrencyMap[i.name] : (i.apricornCurrency || 'yellowApricorn');
        // For memory items, show cycling apricorn animation; for fixed items, show specific color
        const apricornIcon = isFixedApricorn 
            ? `<img src="${itemImg(currency)}" style="width:14px;height:14px;image-rendering:pixelated">`
            : `<span class="apricorn-cycle"><img src="${itemImg('yellowApricorn')}"><img src="${itemImg('pinkApricorn')}"><img src="${itemImg('greenApricorn')}"></span>`;
        availBadges += `<span style="padding:2px 6px;margin-left:4px;background:rgba(255,215,0,0.2);color:var(--accent-gold);border-radius:3px;font-size:0.7rem;display:inline-flex;align-items:center;gap:3px">${apricornIcon} ${t('apricornShop')} (${apricornPrice})</span>`;
    }
    
    if (!isObtainable && !isInApricornShop) availBadges += '<span style="padding:2px 6px;background:rgba(255,68,68,0.2);color:var(--accent-red);border-radius:3px;font-size:0.7rem">❌ N/A</span>';
    
    // Category badges
    let catBadges = '';
    if (i.isGenetics) catBadges += `<span style="padding:2px 6px;background:rgba(170,0,255,0.15);color:#aa55ff;border-radius:3px;font-size:0.65rem;margin-right:3px">🧬 ${t('geneticsItem')}</span>`;
    if (i.isVitamin) catBadges += `<span style="padding:2px 6px;background:rgba(0,200,100,0.15);color:#00c864;border-radius:3px;font-size:0.65rem;margin-right:3px">💊 ${t('vitaminItem')}</span>`;
    if (i.isUsable) catBadges += `<span style="padding:2px 6px;background:rgba(0,180,255,0.15);color:#00b4ff;border-radius:3px;font-size:0.65rem;margin-right:3px">✋ ${t('usableItem')}</span>`;
    if (i.itemRotation) catBadges += `<span style="padding:2px 6px;background:rgba(255,165,0,0.15);color:#ffa500;border-radius:3px;font-size:0.65rem;margin-right:3px">🔄 ${t('rotationItem')} ${i.itemRotation}</span>`;
    if (i.itemEvent) catBadges += `<span style="padding:2px 6px;background:rgba(255,100,200,0.15);color:#ff64c8;border-radius:3px;font-size:0.65rem;margin-right:3px">🎃 ${i.itemEvent}</span>`;
    if (i.type === 'decor') catBadges += `<span style="padding:2px 6px;background:rgba(255,0,170,0.15);color:#ff00aa;border-radius:3px;font-size:0.65rem;margin-right:3px">🎀 ${t('accessoryLabel')}</span>`;
    
    return `<div class="card" ${clickable}>
        <div class="card-header">
            <div class="card-title-row">
                <img class="item-sprite" src="${imgSrc}" onerror="this.style.display='none'">
                <span class="card-name">${i.displayName}</span>
            </div>
            ${i.isTM ? '<span class="rarity rarity-2">TM</span>' : i.type === 'decor' ? '<span style="font-size:0.75rem;color:var(--accent-pink)">🎀 Decor</span>' : i.isEvo && i.type === 'held' ? '<span style="font-size:0.75rem;color:var(--accent-gold)">evo+held</span>' : i.type ? `<span style="font-size:0.75rem;color:var(--text-dim)">${i.type}</span>` : ''}
        </div>
        <div style="margin-bottom:8px">${availBadges}</div>
        ${catBadges ? `<div style="margin-bottom:6px">${catBadges}</div>` : ''}
        ${i.isTM && i.moveInfo ? `<div class="type-badges">${typeBadge(i.moveInfo.type)} ${i.moveInfo.power ? `<span style="color:var(--accent-blue)">${t('power')}: ${i.moveInfo.power}</span>` : ''}</div>` : ''}
        ${memoryAbilityInfo ? `<div class="type-badges" style="margin-bottom:4px">${memoryAbilityInfo.types.map(ty => typeBadge(ty)).join(' ')}</div>` : ''}
        ${info ? `<p class="card-info">${info}</p>` : ''}
        ${memoryAbilityInfo && memoryAbilityInfo.info ? `<p class="card-info" style="font-size:0.75rem;color:var(--text-dim);margin-top:2px">${memoryAbilityInfo.info}</p>` : ''}
        ${(isDroppable || isReward || i.type === 'memory') ? `<p class="click-hint">${t('clickDetails')}</p>` : ''}
    </div>`;
}

function showItemDrops(itemName) {
    const drops = droppableItems[itemName] || [];
    const rewards = rewardableItems[itemName] || [];
    const itemData = items[itemName];
    const isMemory = itemData?.type === 'memory';
    if (drops.length === 0 && rewards.length === 0 && !isMemory) return;

    const itemDisplayName = items[itemName]?.displayName || format(itemName);
    let isInShop = shopItems[itemName];
    
    // FIX: Mega stones from area rewards should not show as "Shop" unless they're actually purchasable
    const isMegaStone = itemData?.type === 'mega' || itemName.endsWith('ite') || itemName.endsWith('iteX') || itemName.endsWith('iteY');
    if (isMegaStone && isInShop && window.megaStoneFromArea && window.megaStoneFromArea.has(itemName)) {
        // This mega stone is from area rewards, not truly from shop (unless it's barbaracite etc.)
        if (!window.megaStoneFromShop || !window.megaStoneFromShop.has(itemName)) {
            isInShop = false; // Don't show as "Shop", it will show as "Reward" instead
        }
    }
    if (Array.isArray(isInShop)) {
        isInShop = isInShop.find(s => !s.eventRotation || currentRotations.event === s.eventRotation) || isInShop[0];
    }

    // Check if item is in apricorn shop
    let isInApricornShop = null;
    const apricornFixedItems = {
        'autoRefightTicket': { price: 2, currency: 'yellowApricorn' },
        'heartScale': { price: 1, currency: 'pinkApricorn' },
        'energyRoot': { price: 1, currency: 'greenApricorn' },
        'fashionCase': { price: 1, currency: 'yellowApricorn' },
        'magazineSubscription': { price: 10, currency: 'whiteApricorn' },
        'battlePass': { price: 20, currency: 'whiteApricorn' },
        'replicatorUpgradeS': { price: 30, currency: 'whiteApricorn' },
        'replicatorUpgradeE': { price: 40, currency: 'whiteApricorn' }
    };
    if (apricornFixedItems[itemName]) {
        isInApricornShop = apricornFixedItems[itemName];
    }
    if (isMemory) {
        const memCurrency = itemData.apricornCurrency || 'yellowApricorn';
        isInApricornShop = { price: 3, currency: memCurrency };
    }

    const isOldGateau = isInShop && isInShop.currency === 'oldGateau';

    const memImgSrc = isMemory && itemData?.memoryImage ? itemImg(`${itemData.memoryImage}Memory`) : itemImg(itemName);
    let html = `<div style="display:flex;align-items:center;gap:15px;margin-bottom:20px">
        <img src="${memImgSrc}" style="width:48px;height:48px" onerror="this.style.display='none'">
        <div>`;

    // Regular shop price
    if (isInShop && (!isOldGateau || isHalloweenActive())) {
        html += `<div style="color:var(--accent-blue);font-size:0.9rem;display:inline-flex;align-items:center;gap:5px">🛒 ${t('inShop')} - <img src="${isInShop.iconImg}" style="width:18px;height:18px;image-rendering:pixelated"> ${isInShop.price} ${isInShop.currency === 'goldenBottleCap' || isInShop.currency === 'gold' ? t('goldCaps') :
                isInShop.currency === 'yellowApricorn' ? t('yellowApricorn') :
                isInShop.currency === 'pinkApricorn' ? t('pinkApricorn') :
                isInShop.currency === 'greenApricorn' ? t('greenApricorn') :
                isInShop.currency === 'whiteApricorn' ? t('whiteApricorn') : t('bottleCaps')}</div>`;
    }

    // Apricorn shop price
    if (isInApricornShop) {
        const isFixedApricorn = !!apricornFixedItems[itemName];
        const currencyName = isInApricornShop.currency === 'yellowApricorn' ? t('yellowApricorn') :
            isInApricornShop.currency === 'pinkApricorn' ? t('pinkApricorn') :
            isInApricornShop.currency === 'greenApricorn' ? t('greenApricorn') :
            isInApricornShop.currency === 'whiteApricorn' ? t('whiteApricorn') : isInApricornShop.currency;
        // For memory items, show cycling apricorn animation; for fixed items, show specific color
        const apricornIcon = isFixedApricorn
            ? `<img src="${itemImg(isInApricornShop.currency)}" style="width:16px;height:16px;image-rendering:pixelated">`
            : `<span class="apricorn-cycle apricorn-cycle-lg"><img src="${itemImg('yellowApricorn')}"><img src="${itemImg('pinkApricorn')}"><img src="${itemImg('greenApricorn')}"><img src="${itemImg('whiteApricorn')}"></span>`;
        html += `<div style="color:var(--accent-gold);font-size:0.9rem;display:inline-flex;align-items:center;gap:5px;margin-top:5px">${apricornIcon} ${t('apricornShop')} - ${isInApricornShop.price} ${currencyName}</div>`;
    }

    html += `</div></div>`;

    // Additional item properties (real ones from PokeChill)
    const hasItemDetails = itemData?.sort || itemData?.hasHeldBonusPower;
    if (hasItemDetails) {
        html += '<div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border);">';
        html += '<div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:8px;">' + t('propertiesTab') + '</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:0.9rem;">';
        
        if (itemData?.sort) {
            const sortColor = itemData.sort === 'gem' ? 'var(--accent-gold)' : 'var(--accent-green)';
            const sortText = itemData.sort === 'gem' ? t('sortGem') : t('sortBerry');
            html += '<div style="color:' + sortColor + '"><strong>' + t('sort') + ':</strong> ' + sortText + '</div>';
        }
        if (itemData?.zType) {
            html += '<div style="color:var(--accent-gold)"><strong>' + t('zMoveType') + ':</strong> ' + capitalize(itemData.zType) + '</div>';
        }
        if (itemData?.hasHeldBonusPower && itemData?.heldBonusPkmn) {
            const megaPkmn = pokemons[itemData.heldBonusPkmn];
            html += '<div style="color:var(--accent-pink)"><strong>' + t('megaStoneFor') + ':</strong> ' + (megaPkmn ? megaPkmn.displayName : format(itemData.heldBonusPkmn)) + '</div>';
        }
        
        html += '</div></div>';
    }

    // Memory ability section
    if (isMemory && itemData.ability && abilities[itemData.ability]) {
        const ab = abilities[itemData.ability];
        const abTypes = ab.types || [];
        html += `<div class="modal-section">
            <div class="modal-section-title">🧠 ${ab.displayName || format(itemData.ability)}</div>
            ${abTypes.length > 0 ? `<div style="margin-bottom:8px">${abTypes.map(ty => typeBadge(ty)).join(' ')}</div>` : ''}
            ${ab.info ? `<p style="color:var(--text-dim);margin-bottom:12px">${ab.info}</p>` : ''}
            <div style="cursor:pointer;padding:8px 12px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:6px;text-align:center;color:var(--accent-blue)" onclick="closeModal(); showAbilityPokemon('${itemData.ability}')">
                ${t('pokemonWith')} ${ab.displayName || format(itemData.ability)}
            </div>
        </div>`;
    }
    
    // Event rewards section
    if (rewards.length > 0) {
        html += `<div class="modal-section"><div class="modal-section-title" style="color:var(--accent-gold)">🏆 ${t("eventReward")} (${rewards.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${rewards.map(r => `<span style="padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;cursor:pointer" onclick="showAreaDetails('${r.area}')">${r.displayName || format(r.area)} (Lv${r.level})</span>`).join('')}</div>
        </div>`;
    }
    
    // Drop locations section
    if (drops.length > 0) {
        const byRarity = { rare: [], uncommon: [], common: [] };
        drops.forEach(d => byRarity[d.rarity].push(d));
        
        const dropLabel = d => d.isRaid ? (d.level >= 600 ? 'Tier 4' : 'Tier 3') : `Lv${d.level}`;
        html += `<div class="modal-section"><div class="modal-section-title">📦 ${t("drops")} (${drops.length})</div>`;

        if (byRarity.rare.length) {
            html += `<div style="margin-bottom:15px"><div style="color:var(--accent-gold);font-size:0.85rem;margin-bottom:8px">⭐ ${t('rareDrop')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">${byRarity.rare.map(d => `<span style="padding:6px 12px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;cursor:pointer" onclick="showAreaDetails('${d.area}')">${areas[d.area]?.displayName || format(d.area)} (${dropLabel(d)})</span>`).join('')}</div></div>`;
        }
        if (byRarity.uncommon.length) {
            html += `<div style="margin-bottom:15px"><div style="color:var(--accent-blue);font-size:0.85rem;margin-bottom:8px">💎 ${t('uncommonDrop')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">${byRarity.uncommon.map(d => `<span style="padding:6px 12px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:6px;cursor:pointer" onclick="showAreaDetails('${d.area}')">${areas[d.area]?.displayName || format(d.area)} (${dropLabel(d)})</span>`).join('')}</div></div>`;
        }
        if (byRarity.common.length) {
            html += `<div style="margin-bottom:15px"><div style="color:#aaa;font-size:0.85rem;margin-bottom:8px">📦 ${t('commonDrop')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">${byRarity.common.map(d => `<span style="padding:6px 12px;background:var(--bg-input);border-radius:6px;cursor:pointer" onclick="showAreaDetails('${d.area}')">${areas[d.area]?.displayName || format(d.area)} (${dropLabel(d)})</span>`).join('')}</div></div>`;
        }
        
        html += `</div>`;
    }
    
    openModal(`🎁 ${itemDisplayName}`, html);
}