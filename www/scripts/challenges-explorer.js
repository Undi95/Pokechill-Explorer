// ============================================
// POKECHILL EXPLORER - CHALLENGES SYSTEM
// Système de défis basé sur les sauvegardes
// ============================================

const CHALLENGE_CATEGORIES = {
    POKEMON: 'pokemon',
    SHINY: 'shiny',
    ITEMS: 'items',
    TRAINERS: 'trainers',
    SECRET: 'secret',
    MISC: 'misc'
};

const TIERS = [
    { label: 'I', color: '#CD7F32', name: 'Bronze' },
    { label: 'II', color: '#C0C0C0', name: 'Silver' },
    { label: 'III', color: '#FFD700', name: 'Gold' },
    { label: 'IV', color: '#E5E4E2', name: 'Platinum' },
    { label: 'V', color: '#B9F2FF', name: 'Diamond' },
    { label: 'VI', color: '#FF4444', name: 'Master' }
];

// Helper function for challenge icon fallback (items -> pokemon sprites -> pokeball)
window.challengeIconFallback = function(img, iconName) {
    // First fallback: try pokemon sprite
    img.onerror = function() {
        // Second fallback: default pokeball
        img.onerror = function() {
            img.src = 'https://play-pokechill.github.io/img/items/pokeball.png';
        };
        img.src = 'https://play-pokechill.github.io/img/pkmn/sprite/' + iconName + '.png';
    };
    img.src = 'https://play-pokechill.github.io/img/pkmn/sprite/' + iconName + '.png';
}

const POKEMON_BY_TYPE = {
    fire: ['charmander', 'charmeleon', 'charizard', 'megaCharizardX', 'megaCharizardY', 'vulpix', 'ninetales', 'growlithe', 'arcanine', 'ponyta', 'rapidash', 'magmar', 'magmortar', 'flareon', 'moltres', 'cyndaquil', 'quilava', 'typhlosion', 'slugma', 'magcargo', 'houndour', 'houndoom', 'megaHoundoom', 'entei', 'torchic', 'combusken', 'blaziken', 'megaBlaziken', 'numel', 'camerupt', 'megaCamerupt', 'torkoal', 'castformSunny', 'chimchar', 'monferno', 'infernape', 'heatran', 'victini', 'tepig', 'pignite', 'emboar', 'pansear', 'simisear', 'darumaka', 'darmanitan', 'litwick', 'lampent', 'chandelure', 'heatmor', 'larvesta', 'volcarona', 'reshiram', 'fennekin', 'braixen', 'delphox', 'megaDelphox', 'litleo', 'pyroar', 'fletchinder', 'talonflame'],
    water: ['squirtle', 'wartortle', 'blastoise', 'megaBlastoise', 'psyduck', 'golduck', 'poliwag', 'poliwhirl', 'poliwrath', 'tentacool', 'tentacruel', 'slowpoke', 'slowbro', 'megaSlowbro', 'slowking', 'seel', 'dewgong', 'shellder', 'cloyster', 'krabby', 'kingler', 'horsea', 'seadra', 'kingdra', 'goldeen', 'seaking', 'magikarp', 'gyarados', 'megaGyarados', 'lapras', 'vaporeon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'totodile', 'croconaw', 'feraligatr', 'chinchou', 'lanturn', 'marill', 'azumarill', 'politoed', 'wooper', 'quagsire', 'qwilfish', 'corsola', 'remoraid', 'octillery', 'mantine', 'suicune', 'mudkip', 'marshtomp', 'swampert', 'megaSwampert', 'lotad', 'lombre', 'ludicolo', 'wingull', 'pelipper', 'surskit', 'masquerain', 'carvanha', 'sharpedo', 'wailmer', 'wailord', 'barboach', 'whiscash', 'corphish', 'crawdaunt', 'feebas', 'milotic', 'spheal', 'sealeo', 'walrein', 'clamperl', 'huntail', 'gorebyss', 'relicanth', 'luvdisc', 'kyogre', 'piplup', 'prinplup', 'empoleon', 'buizel', 'floatzel', 'shellos', 'gastrodon', 'finneon', 'lumineon', 'mantyke', 'palkia', 'phione', 'manaphy', 'oshawott', 'dewott', 'samurott', 'panpour', 'simipour', 'tympole', 'palpitoad', 'seismitoad', 'tirtouga', 'carracosta', 'frillish', 'jellicent', 'alomomola', 'keldeo', 'froakie', 'frogadier', 'greninja', 'skrelp', 'dragalge', 'clauncher', 'clawitzer', 'popplio', 'brionne', 'primarina', 'wimpod', 'golisopod', 'pyukumuku', 'wishiwashi', 'bruxish', 'chewtle', 'drednaw', 'arrokuda', 'barraskewda'],
    grass: ['bulbasaur', 'ivysaur', 'venusaur', 'megaVenusaur', 'oddish', 'gloom', 'vileplume', 'bellossom', 'paras', 'parasect', 'bellsprout', 'weepinbell', 'victreebel', 'megaVictreebel', 'exeggcute', 'exeggutor', 'tangela', 'tangrowth', 'chikorita', 'bayleef', 'meganium', 'hoppip', 'skiploom', 'jumpluff', 'sunkern', 'sunflora', 'treecko', 'grovyle', 'sceptile', 'megaSceptile', 'lotad', 'lombre', 'ludicolo', 'seedot', 'nuzleaf', 'shiftry', 'shroomish', 'breloom', 'cacnea', 'cacturne', 'lileep', 'cradily', 'tropius', 'turtwig', 'grotle', 'torterra', 'budew', 'roselia', 'roserade', 'wormadam', 'snivy', 'servine', 'serperior', 'pansage', 'simisage', 'sewaddle', 'swadloon', 'leavanny', 'cottonee', 'whimsicott', 'petilil', 'lilligant', 'maractus', 'deerling', 'sawsbuck', 'foongus', 'amoonguss', 'ferroseed', 'ferrothorn', 'virizion', 'chespin', 'quilladin', 'chesnaught', 'skiddo', 'gogoat', 'rowlet', 'dartrix', 'decidueye', 'fomantis', 'lurantis', 'morelull', 'shiinotic', 'tapuBulu', 'grookey', 'thwackey', 'rillaboom', 'gossifleur', 'eldegoss', 'applin', 'flapple', 'appletun', 'sprigatito', 'floragato', 'meowscarada', 'smoliv', 'dolliv', 'arboliva', 'capsakid', 'scovillain', 'bramblin', 'brambleghast', 'toedscool', 'toedscruel'],
    electric: ['pikachu', 'raichu', 'magnemite', 'magneton', 'magnezone', 'voltorb', 'electrode', 'electabuzz', 'electivire', 'jolteon', 'zapdos', 'chinchou', 'lanturn', 'pichu', 'mareep', 'flaaffy', 'ampharos', 'elekid', 'raikou', 'electrike', 'manectric', 'plusle', 'minun', 'shinx', 'luxio', 'luxray', 'rotom', 'blitzle', 'zebstrika', 'tynamo', 'eelektrik', 'eelektross', 'zekrom', 'joltik', 'galvantula', 'thundurus', 'helioptile', 'heliolisk', 'dedenne', 'charjabug', 'vikavolt', 'togedemaru', 'tapuKoko', 'xurkitree', 'zeraora', 'yamper', 'boltund', 'toxel', 'toxtricity', 'pincurchin', 'morpeko', 'regieleki', 'pawmi', 'pawmo', 'pawmot', 'tadbulb', 'bellibolt', 'kilowattrel'],
    psychic: ['abra', 'kadabra', 'alakazam', 'slowpoke', 'slowbro', 'slowking', 'drowzee', 'hypno', 'exeggcute', 'exeggutor', 'starmie', 'mrMime', 'jynx', 'mewtwo', 'mew', 'espeon', 'misdreavus', 'mismagius', 'unownA', 'unownB', 'unownC', 'unownD', 'unownE', 'unownF', 'unownG', 'unownH', 'unownI', 'unownJ', 'unownK', 'unownL', 'unownM', 'unownN', 'unownO', 'unownP', 'unownQ', 'unownR', 'unownS', 'unownT', 'unownU', 'unownV', 'unownW', 'unownX', 'unownY', 'unownZ', 'wobbuffet', 'girafarig', 'farigiraf', 'ralts', 'kirlia', 'gardevoir', 'meditite', 'medicham', 'spoink', 'grumpig', 'lunatone', 'solrock', 'baltoy', 'claydol', 'chimecho', 'wynaut', 'beldum', 'metang', 'metagross', 'latias', 'latios', 'jirachi', 'deoxys', 'bronzor', 'bronzong', 'mimeJr', 'gallade', 'uxie', 'mesprit', 'azelf', 'cresselia', 'munna', 'musharna', 'woobat', 'swoobat', 'sigilyph', 'gothita', 'gothorita', 'gothitelle', 'solosis', 'duosion', 'reuniclus', 'elgyem', 'beheeyem', 'meloetta', 'espurr', 'meowstic', 'inkay', 'malamar', 'hoopa', 'oranguru', 'bruxish', 'tapuLele', 'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'necrozma', 'hatenna', 'hattrem', 'hatterene', 'indeedee', 'calyrex', 'espathra', 'armarouge', 'rabsca', 'flutterMane']
};

// Build challenges array
const CHALLENGES_DB = [];

// Helper to add challenges
function addChallenge(challenge) {
    CHALLENGES_DB.push(challenge);
}

// === STARTER CHALLENGES ===
addChallenge({
    id: 'first_capture',
    title: { fr: 'Première Capture', en: 'First Catch' },
    description: { fr: 'Pokémon capturés', en: 'Caught Pokémon' },
    icon: 'pokeball',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 10, 100, 250, 500, 1000],
    isNumeric: true,
    check: (data) => countUniquePokemon(data)
});

addChallenge({
    id: 'first_shiny',
    title: { fr: 'Chasseur Débutant', en: 'Novice Hunter' },
    description: { fr: 'Pokémon Shiny capturés', en: 'Shiny Pokémon caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 3, 5, 10, 20, 50],
    isNumeric: true,
    check: (data) => countShinies(data)
});

addChallenge({
    id: 'more_shiny',
    title: { fr: 'Chasseur Veteran', en: 'Veteran Hunter' },
    description: { fr: 'Pokémon Shiny capturés', en: 'Shiny Pokémon caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [100, 200, 350, 600, 800, 1000],
    isNumeric: true,
    priorityTop: true,
    check: (data) => countShinies(data)
});

addChallenge({
    id: 'first_trainer',
    title: { fr: 'Premier Combat', en: 'First Battle' },
    description: { fr: 'Dresseurs vaincus', en: 'Trainers defeated' },
    icon: 'vsGymLeaderBrock',
    category: CHALLENGE_CATEGORIES.TRAINERS,
    tiers: [1, 5, 15, 25, 36],
    isNumeric: true,
    check: (data) => countAnyDefeated(data)
});

addChallenge({
    id: 'first_item',
    title: { fr: 'Premier Objet', en: 'First Item' },
    description: { fr: 'Objets collectés', en: 'Items collected' },
    icon: 'bag',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [1, 10, 25, 50, 100, 200],
    isNumeric: true,
    check: (data) => countUniqueItems(data)
});

addChallenge({
    id: 'first_gem',
    title: { fr: 'Première Gemme', en: 'First Gem' },
    description: { fr: 'Gemmes collectées à x20', en: 'Gems collected at x20' },
    icon: 'normalGem',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [1, 3, 6, 9, 12, 18],
    isNumeric: true,
    check: (data) => countGemsAt20(data)
});

addChallenge({
    id: 'first_level100',
    title: { fr: 'Niveau Maximum', en: 'Level Cap' },
    description: { fr: 'Pokémon niveau 100', en: 'Level 100 Pokémon' },
    icon: 'rareCandy',
    category: CHALLENGE_CATEGORIES.MISC,
    tiers: [1, 5, 10, 20, 50, 100],
    isNumeric: true,
    check: (data) => countLevel100(data)
});

addChallenge({
    id: 'first_perfect_iv',
    title: { fr: 'Première Étoile', en: 'First Star' },
    description: { fr: 'Pokémon avec au moins une IV à 6 étoiles', en: 'Pokémon with at least one IV at 6 stars' },
    icon: 'powerBracer',
    category: CHALLENGE_CATEGORIES.MISC,
    tiers: [1, 5, 10, 25, 50, 100],
    isNumeric: true,
    check: (data) => countPokemonWithPerfectIV(data)
});

// === POKÉMON - Formes spéciales ===
addChallenge({
    id: 'pikachu_fan',
    title: { fr: 'Fan de Pikachu', en: 'Pikachu Fan' },
    description: { fr: 'Pikachu Cosplay capturés', en: 'Cosplay Pikachu caught' },
    icon: 'pikachu',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecific(data, ['pikachuBelle', 'pikachuLibre', 'pikachuPhd', 'pikachuPopstar', 'pikachuRockstar'])
});

addChallenge({
    id: 'magikarp_varieties',
    title: { fr: 'Collection Magicarpe', en: 'Magikarp Collector' },
    description: { fr: 'Formes de Magicarpe capturées', en: 'Magikarp forms caught' },
    icon: 'magikarp',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 5, 7],
    isNumeric: true,
    check: (data) => countSpecific(data, ['magikarp', 'magikarpKoi', 'magikarpRegal', 'magikarpSakura', 'magikarpSkelly', 'magikarpSoar', 'magikarpTiger'])
});

addChallenge({
    id: 'unown_collector',
    title: { fr: 'Collection Zarbi', en: 'Unown Collector' },
    description: { fr: 'Zarbi différents capturés', en: 'Different Unown caught' },
    icon: 'unownA',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 10, 15, 20, 25, 28],
    isNumeric: true,
    check: (data) => countUnown(data)
});

addChallenge({
    id: 'floette_collector',
    title: { fr: 'Collection Floette', en: 'Floette Collector' },
    description: { fr: 'Couleurs de Floette capturées', en: 'Floette colors caught' },
    icon: 'floette',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecific(data, ['floette', 'floetteBlue', 'floetteOrange', 'floetteWhite', 'floetteYellow'])
});

addChallenge({
    id: 'flabebe_collector',
    title: { fr: 'Collection Flabébé', en: 'Flabébé Collector' },
    description: { fr: 'Couleurs de Flabébé capturées', en: 'Flabébé colors caught' },
    icon: 'flabebe',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecific(data, ['flabebe', 'flabebeBlue', 'flabebeOrange', 'flabebeWhite', 'flabebeYellow'])
});

addChallenge({
    id: 'florges_collector',
    title: { fr: 'Collection Florges', en: 'Florges Collector' },
    description: { fr: 'Couleurs de Florges capturées', en: 'Florges colors caught' },
    icon: 'florges',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecific(data, ['florges', 'florgesBlue', 'florgesOrange', 'florgesWhite', 'florgesYellow'])
});

addChallenge({
    id: 'vivillon_collector',
    title: { fr: 'Collection Prismillon', en: 'Vivillon Collector' },
    description: { fr: 'Prismillon différents capturés', en: 'Different Vivillon caught' },
    icon: 'vivillon',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [3, 6, 10, 14, 17, 20],
    isNumeric: true,
    check: (data) => countVivillon(data)
});

addChallenge({
    id: 'oricorio_collector',
    title: { fr: 'Collection Plumeline', en: 'Oricorio Collector' },
    description: { fr: 'Styles de Plumeline capturés', en: 'Oricorio styles caught' },
    icon: 'oricorio',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countSpecific(data, ['oricorioBaile', 'oricorioPomPom', 'oricorioPau', 'oricorioSensu'])
});

addChallenge({
    id: 'clone_starter_collector',
    title: { fr: 'Clones Évolués', en: 'Evolved Clones' },
    description: { fr: 'Starters 1G clones évolués capturés', en: 'Evolved Gen 1 starter clones caught' },
    icon: 'charizardClone',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3],
    isNumeric: true,
    check: (data) => countSpecific(data, ['charizardClone', 'blastoiseClone', 'venusaurClone'])
});

addChallenge({
    id: 'minior_collector',
    title: { fr: 'Collection Météno', en: 'Minior Collector' },
    description: { fr: 'Couleurs de Météno capturées', en: 'Minior colors caught' },
    icon: 'minior',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [2, 4, 6, 7],
    isNumeric: true,
    check: (data) => countSpecific(data, ['minior', 'miniorBlue', 'miniorGreen', 'miniorIndigo', 'miniorOrange', 'miniorRed', 'miniorViolet', 'miniorYellow'])
});

// === SHINY - Formes spéciales ===
addChallenge({
    id: 'pikachu_fan_shiny',
    title: { fr: 'Fan de Pikachu Shiny', en: 'Shiny Pikachu Fan' },
    description: { fr: 'Pikachu Cosplay Shiny capturés', en: 'Shiny Cosplay Pikachu caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['pikachuBelle', 'pikachuLibre', 'pikachuPhd', 'pikachuPopstar', 'pikachuRockstar'])
});

addChallenge({
    id: 'magikarp_varieties_shiny',
    title: { fr: 'Magicarpes Shiny', en: 'Shiny Magikarps' },
    description: { fr: 'Formes de Magicarpe Shiny capturées', en: 'Shiny Magikarp forms caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 5, 7],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['magikarp', 'magikarpKoi', 'magikarpRegal', 'magikarpSakura', 'magikarpSkelly', 'magikarpSoar', 'magikarpTiger'])
});

addChallenge({
    id: 'unown_collector_shiny',
    title: { fr: 'Zarbi Shiny', en: 'Shiny Unown' },
    description: { fr: 'Zarbi Shiny différents capturés', en: 'Different Shiny Unown caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [5, 10, 15, 20, 25, 28],
    isNumeric: true,
    check: (data) => countUnownShiny(data)
});

addChallenge({
    id: 'floette_collector_shiny',
    title: { fr: 'Floettes Shiny', en: 'Shiny Floettes' },
    description: { fr: 'Couleurs de Floette Shiny capturées', en: 'Shiny Floette colors caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['floette', 'floetteBlue', 'floetteOrange', 'floetteWhite', 'floetteYellow'])
});

addChallenge({
    id: 'flabebe_collector_shiny',
    title: { fr: 'Flabébé Shiny', en: 'Shiny Flabébé' },
    description: { fr: 'Couleurs de Flabébé Shiny capturées', en: 'Shiny Flabébé colors caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 4, 5],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['flabebe', 'flabebeBlue', 'flabebeOrange', 'flabebeWhite', 'flabebeYellow'])
});

addChallenge({
    id: 'vivillon_collector_shiny',
    title: { fr: 'Prismillons Shiny', en: 'Shiny Vivillons' },
    description: { fr: 'Prismillon Shiny différents capturés', en: 'Different Shiny Vivillon caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [3, 6, 10, 14, 17, 20],
    isNumeric: true,
    check: (data) => countVivillonShiny(data)
});

addChallenge({
    id: 'oricorio_collector_shiny',
    title: { fr: 'Plumelines Shiny', en: 'Shiny Oricorios' },
    description: { fr: 'Styles de Plumeline Shiny capturés', en: 'Shiny Oricorio styles caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['oricorioBaile', 'oricorioPomPom', 'oricorioPau', 'oricorioSensu'])
});

addChallenge({
    id: 'clone_starter_collector_shiny',
    title: { fr: 'Clones Évolués Shiny', en: 'Shiny Evolved Clones' },
    description: { fr: 'Starters 1G clones évolués Shiny capturés', en: 'Shiny evolved Gen 1 starter clones caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['charizardClone', 'blastoiseClone', 'venusaurClone'])
});

addChallenge({
    id: 'minior_collector_shiny',
    title: { fr: 'Météno Shiny', en: 'Shiny Minior' },
    description: { fr: 'Couleurs de Météno Shiny capturées', en: 'Shiny Minior colors caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [2, 4, 6, 7],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['minior', 'miniorBlue', 'miniorGreen', 'miniorIndigo', 'miniorOrange', 'miniorRed', 'miniorViolet', 'miniorYellow'])
});

// === Ultra-Chimères ===
addChallenge({
    id: 'ultra_beast_collector',
    title: { fr: 'Ultra-Chimères', en: 'Ultra Beasts' },
    description: { fr: 'Ultra-Chimères capturées', en: 'Ultra Beasts caught' },
    icon: 'beastball',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 5, 7, 9, 11],
    isNumeric: true,
    check: (data) => countSpecific(data, ['nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon'])
});

addChallenge({
    id: 'ultra_beast_collector_shiny',
    title: { fr: 'Ultra-Chimères Shiny', en: 'Shiny Ultra Beasts' },
    description: { fr: 'Ultra-Chimères Shiny capturées', en: 'Shiny Ultra Beasts caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 5, 7, 9, 11],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon'])
});

// === Rotom / Motisma ===
addChallenge({
    id: 'rotom_collector',
    title: { fr: 'Collection Motisma', en: 'Rotom Collector' },
    description: { fr: 'Formes de Motisma capturées', en: 'Rotom forms caught' },
    icon: 'rotom',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 5, 6],
    isNumeric: true,
    check: (data) => countSpecific(data, ['rotom', 'rotomHeat', 'rotomWash', 'rotomFrost', 'rotomFan', 'rotomMow'])
});

addChallenge({
    id: 'rotom_collector_shiny',
    title: { fr: 'Motisma Shiny', en: 'Shiny Rotom' },
    description: { fr: 'Formes de Motisma Shiny capturées', en: 'Shiny Rotom forms caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 4, 5, 6],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['rotom', 'rotomHeat', 'rotomWash', 'rotomFrost', 'rotomFan', 'rotomMow'])
});

// === Deerling / Vivaldaim ===
addChallenge({
    id: 'deerling_collector',
    title: { fr: 'Collection Vivaldaim', en: 'Deerling Collector' },
    description: { fr: 'Saisons de Vivaldaim capturées', en: 'Deerling seasons caught' },
    icon: 'deerling',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countSpecific(data, ['deerlingSpring', 'deerling', 'deerlingAutumn', 'deerlingWinter'])
});

addChallenge({
    id: 'deerling_collector_shiny',
    title: { fr: 'Vivaldaim Shiny', en: 'Shiny Deerling' },
    description: { fr: 'Saisons de Vivaldaim Shiny capturées', en: 'Shiny Deerling seasons caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['deerlingSpring', 'deerling', 'deerlingAutumn', 'deerlingWinter'])
});

// === Furfrou / Couafarel ===
addChallenge({
    id: 'furfrou_collector',
    title: { fr: 'Collection Couafarel', en: 'Furfrou Collector' },
    description: { fr: 'Coupe de Couafarel capturées', en: 'Furfrou trims caught' },
    icon: 'furfrou',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [2, 4, 6, 8, 10],
    isNumeric: true,
    check: (data) => countSpecific(data, ['furfrou', 'furfrouHeart', 'furfrouStar', 'furfrouDiamond', 'furfrouDebutante', 'furfrouMatron', 'furfrouDandy', 'furfrouReine', 'furfrouKabuki', 'furfrouPharaoh'])
});

addChallenge({
    id: 'furfrou_collector_shiny',
    title: { fr: 'Couafarel Shiny', en: 'Shiny Furfrou' },
    description: { fr: 'Coupe de Couafarel Shiny capturées', en: 'Shiny Furfrou trims caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [2, 4, 6, 8, 10],
    isNumeric: true,
    check: (data) => countSpecificShiny(data, ['furfrou', 'furfrouHeart', 'furfrouStar', 'furfrouDiamond', 'furfrouDebutante', 'furfrouMatron', 'furfrouDandy', 'furfrouReine', 'furfrouKabuki', 'furfrouPharaoh'])
});

// === SHINY - Références à l'anime ===
addChallenge({
    id: 'shiny_noctowl',
    title: { fr: 'Noarfang Shiny', en: 'Shiny Noctowl' },
    description: { fr: 'Premier Shiny de l\'anime (EP154)', en: 'First Shiny in the anime (EP154)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.noctowl?.caught > 0 && data?.noctowl?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_shuckle',
    title: { fr: 'Caratroc Indigo', en: 'Indigo Shuckle' },
    description: { fr: 'Le Caratroc médicinal (EP170)', en: 'The medicinal Shuckle (EP170)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.shuckle?.caught > 0 && data?.shuckle?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_gyarados_lake',
    title: { fr: 'Léviator du Lac', en: 'Lake Gyarados' },
    description: { fr: 'Le Léviator Rouge du lac Colère (EP235-236)', en: 'The Red Gyarados of Lake Rage (EP235-236)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.gyarados?.caught > 0 && data?.gyarados?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_magneton',
    title: { fr: 'Magnéton Shiny', en: 'Shiny Magneton' },
    description: { fr: 'Le Magnéton de Vincent (EP268)', en: 'Vincent\'s Magneton (EP268)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.magneton?.caught > 0 && data?.magneton?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_swellow',
    title: { fr: 'Hélédelle Shiny', en: 'Shiny Swellow' },
    description: { fr: 'L\'Hélédelle d\'Alizée (AG085)', en: 'Winona\'s Swellow (AG085)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.swellow?.caught > 0 && data?.swellow?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_magikarp_meme',
    title: { fr: 'Magicarpe Légendaire', en: 'Legendary Magikarp' },
    description: { fr: 'Le meme Magicarpe vs Reptincel (AG092)', en: 'The Magikarp vs Charmeleon meme (AG092)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.magikarp?.caught > 0 && data?.magikarp?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_donphan',
    title: { fr: 'Donphan Shiny', en: 'Shiny Donphan' },
    description: { fr: 'La femelle Donphan (AG114)', en: 'The female Donphan (AG114)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.donphan?.caught > 0 && data?.donphan?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_dustox',
    title: { fr: 'Papinox Shiny', en: 'Shiny Dustox' },
    description: { fr: 'L\'amoureux de celui de Jessie (DP073)', en: 'The lover of Jessie\'s (DP073)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.dustox?.caught > 0 && data?.dustox?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_metang',
    title: { fr: 'Métalosse Sauvage', en: 'Wild Metagross' },
    description: { fr: 'Le Métalosse de la montagne (DP117)', en: 'The mountain Metagross (DP117)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.metang?.caught > 0 && data?.metang?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_pichu',
    title: { fr: 'Pikachu Pichu', en: 'Pikachu-colored Pichu' },
    description: { fr: 'Pichu aux couleurs de Pikachu (Ending)', en: 'Pikachu-colored Pichu (Ending)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.pichu?.caught > 0 && data?.pichu?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_ditto',
    title: { fr: 'Métamorph Bleu', en: 'Blue Ditto' },
    description: { fr: 'Le Métamorph de Nastasia (DP173)', en: 'Narissa\'s Ditto (DP173)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.ditto?.caught > 0 && data?.ditto?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_ariados',
    title: { fr: 'Migalos Shiny', en: 'Shiny Ariados' },
    description: { fr: 'L\'Ariados de l\'épisode spécial Aurore', en: 'Dawn\'s special episode Ariados' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.ariados?.caught > 0 && data?.ariados?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_onix',
    title: { fr: 'Onix Chromatique', en: 'Chromatic Onix' },
    description: { fr: 'L\'Onix ému par Meloetta (BW087)', en: 'The Onix moved by Meloetta (BW087)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.onix?.caught > 0 && data?.onix?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_haxorus',
    title: { fr: 'Drakkarmin Shiny', en: 'Shiny Haxorus' },
    description: { fr: 'Le Drakkarmin de Sandra (BW136)', en: 'Iris\' Haxorus (BW136)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.haxorus?.caught > 0 && data?.haxorus?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_metagross_pierre',
    title: { fr: 'Métalosse de Pierre', en: 'Steven\'s Metagross' },
    description: { fr: 'Le Méga-Métalosse de Pierre (XY133-135)', en: 'Steven\'s Mega Metagross (XY133-135)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.megaMetagross?.caught > 0 && data?.megaMetagross?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_hawlucha',
    title: { fr: 'Brutalibré Sombre', en: 'Dark Hawlucha' },
    description: { fr: 'Le Brutalibré de Carl (XY051)', en: 'Carl\'s Hawlucha (XY051)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.hawlucha?.caught > 0 && data?.hawlucha?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_dragonair',
    title: { fr: 'Draco Shiny', en: 'Shiny Dragonair' },
    description: { fr: 'Le Draco d\'Amélia (XY109)', en: 'Amelia\'s Dragonair (XY109)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.dragonair?.caught > 0 && data?.dragonair?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_phantump',
    title: { fr: 'Brocélôme Shiny', en: 'Shiny Phantump' },
    description: { fr: 'Le Brocélôme ami du groupe (XY117)', en: 'The friend of the group (XY117)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.phantump?.caught > 0 && data?.phantump?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_gyarados_lysandre',
    title: { fr: 'Léviator de Lysandre', en: 'Lysandre\'s Gyarados' },
    description: { fr: 'Le Méga-Léviator de Lysandre (XY133-135)', en: 'Lysandre\'s Mega Gyarados (XY133-135)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.gyarados?.caught > 0 && data?.gyarados?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_charjabug',
    title: { fr: 'Chrysapile Écarlate', en: 'Scarlet Charjabug' },
    description: { fr: 'Le Chrysapile des Comètes Rouges (SM041)', en: 'The Red Comet\'s Charjabug (SM041)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.charjabug?.caught > 0 && data?.charjabug?.shiny) ? 1 : 0
});

addChallenge({
    id: 'shiny_butterfree_pink',
    title: { fr: 'Papilusion Rose', en: 'Pink Butterfree' },
    description: { fr: 'L\'amoureuse de celui de Sacha (Spurt)', en: 'The lover of Ash\'s (Spurt)' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [1],
    check: (data) => (data?.butterfree?.caught > 0 && data?.butterfree?.shiny) ? 1 : 0
});

// === POKÉMON - Progressifs ===
addChallenge({
    id: 'total_captures',
    title: { fr: 'Collectionneur', en: 'Collector' },
    description: { fr: 'Pokémon capturés (total)', en: 'Pokémon caught (total)' },
    icon: 'pokeball',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [10, 50, 100, 200, 500, 1000],
    priorityTop: true,
    check: (data) => countAllCaptures(data)
});

addChallenge({
    id: 'unique_pokemon',
    title: { fr: 'Pokédex', en: 'Pokédex' },
    description: { fr: 'Pokémon différents capturés', en: 'Different Pokémon caught' },
    icon: 'dex',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [10, 50, 100, 200, 500, 1000],
    isNumeric: true,
    check: (data) => countUniquePokemon(data)
});

addChallenge({
    id: 'shinies',
    title: { fr: 'Chasseur Shiny', en: 'Shiny Hunter' },
    description: { fr: 'Pokémon Shiny capturés', en: 'Shiny Pokémon caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [5, 15, 30, 50, 100, 200],
    isNumeric: true,
    check: (data) => countShinies(data)
});

addChallenge({
    id: 'level_100',
    title: { fr: 'Niveau Max', en: 'Max Level' },
    description: { fr: 'Pokémon niveau 100', en: 'Level 100 Pokémon' },
    icon: 'rareCandy',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 100, 200],
    isNumeric: true,
    check: (data) => countLevel100(data)
});

// Type challenges
addChallenge({
    id: 'type_fire',
    title: { fr: 'Type Feu', en: 'Fire Type' },
    description: { fr: 'Pokémon Feu capturés', en: 'Fire Pokémon caught' },
    icon: 'fireGem',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 80, 120],
    isNumeric: true,
    check: (data) => countPokemonInList(data, POKEMON_BY_TYPE.fire)
});

addChallenge({
    id: 'type_water',
    title: { fr: 'Type Eau', en: 'Water Type' },
    description: { fr: 'Pokémon Eau capturés', en: 'Water Pokémon caught' },
    icon: 'waterGem',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 80, 120],
    isNumeric: true,
    check: (data) => countPokemonInList(data, POKEMON_BY_TYPE.water)
});

addChallenge({
    id: 'type_grass',
    title: { fr: 'Type Plante', en: 'Grass Type' },
    description: { fr: 'Pokémon Plante capturés', en: 'Grass Pokémon caught' },
    icon: 'grassGem',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 80, 120],
    isNumeric: true,
    check: (data) => countPokemonInList(data, POKEMON_BY_TYPE.grass)
});

addChallenge({
    id: 'type_electric',
    title: { fr: 'Type Électrik', en: 'Electric Type' },
    description: { fr: 'Pokémon Électrik capturés', en: 'Electric Pokémon caught' },
    icon: 'electricGem',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 80, 120],
    isNumeric: true,
    check: (data) => countPokemonInList(data, POKEMON_BY_TYPE.electric)
});

addChallenge({
    id: 'type_psychic',
    title: { fr: 'Type Psy', en: 'Psychic Type' },
    description: { fr: 'Pokémon Psy capturés', en: 'Psychic Pokémon caught' },
    icon: 'psychicGem',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 80, 120],
    isNumeric: true,
    check: (data) => countPokemonInList(data, POKEMON_BY_TYPE.psychic)
});

// Formes spéciales
addChallenge({
    id: 'mega_evos',
    title: { fr: 'Méga-Évolutions', en: 'Mega Evolutions' },
    description: { fr: 'Méga-Évolutions capturées', en: 'Mega Evolutions caught' },
    icon: 'pokeball',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 15, 30, 50, 75, 100],
    isNumeric: true,
    check: (data) => countByPrefix(data, 'mega')
});

addChallenge({
    id: 'mega_evos_shiny',
    title: { fr: 'Méga-Évolutions Shiny', en: 'Shiny Mega Evolutions' },
    description: { fr: 'Méga-Évolutions Shiny capturées', en: 'Shiny Mega Evolutions caught' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SHINY,
    tiers: [3, 6, 10, 15, 20, 30],
    isNumeric: true,
    check: (data) => {
        if (!data) return 0;
        let count = 0;
        for (let key in data) {
            if (key.startsWith('mega') && data[key]?.caught > 0 && data[key]?.shiny) count++;
        }
        return count;
    }
});

addChallenge({
    id: 'alolan_forms',
    title: { fr: 'Formes Alola', en: 'Alolan Forms' },
    description: { fr: 'Formes d\'Alola capturées', en: 'Alolan forms caught' },
    icon: 'alolanRaichu',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 10, 15, 20, 25, 30],
    isNumeric: true,
    check: (data) => countByPrefix(data, 'alolan')
});

addChallenge({
    id: 'galarian_forms',
    title: { fr: 'Formes Galar', en: 'Galarian Forms' },
    description: { fr: 'Formes de Galar capturées', en: 'Galarian forms caught' },
    icon: 'galarianZapdos',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [5, 10, 15, 20, 25, 30],
    isNumeric: true,
    check: (data) => countByPrefix(data, 'galarian')
});

addChallenge({
    id: 'gmax_forms',
    title: { fr: 'Gigamax', en: 'Gigantamax' },
    description: { fr: 'Formes Gigamax capturées', en: 'Gigantamax forms caught' },
    icon: 'pikachuGmax',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [3, 6, 10, 15, 20, 30],
    isNumeric: true,
    check: (data) => countBySuffix(data, 'Gmax')
});

// Légendaires
addChallenge({
    id: 'legendary_birds',
    title: { fr: 'Oiseaux Légendaires', en: 'Legendary Birds' },
    description: { fr: 'Artikodin, Électhor, Sulfura (+formes Galar)', en: 'Articuno, Zapdos, Moltres (+Galar forms)' },
    icon: 'articuno',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 5, 6],
    isNumeric: true,
    check: (data) => countSpecific(data, ['articuno', 'zapdos', 'moltres', 'galarianArticuno', 'galarianZapdos', 'galarianMoltres'])
});

addChallenge({
    id: 'weather_trio',
    title: { fr: 'Trio Météo', en: 'Weather Trio' },
    description: { fr: 'Kyogre, Groudon, Rayquaza', en: 'Kyogre, Groudon, Rayquaza' },
    icon: 'rayquaza',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 6, 9],
    isNumeric: true,
    check: (data) => countSpecific(data, ['kyogre', 'groudon', 'rayquaza', 'kyogrePrimal', 'groudonPrimal', 'megaRayquaza'])
});

addChallenge({
    id: 'creation_trio',
    title: { fr: 'Trio Création', en: 'Creation Trio' },
    description: { fr: 'Dialga, Palkia, Giratina', en: 'Dialga, Palkia, Giratina' },
    icon: 'giratina',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4, 6, 9],
    isNumeric: true,
    check: (data) => countSpecific(data, ['dialga', 'dialgaOrigin', 'palkia', 'palkiaOrigin', 'giratina', 'giratinaOrigin'])
});

addChallenge({
    id: 'lake_guardians',
    title: { fr: 'Gardiens des Lacs', en: 'Lake Guardians' },
    description: { fr: 'Créhelf, Créfollet, Créfadet', en: 'Uxie, Mesprit, Azelf' },
    icon: 'uxie',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3],
    isNumeric: true,
    check: (data) => countSpecific(data, ['uxie', 'mesprit', 'azelf'])
});

addChallenge({
    id: 'swords_of_justice',
    title: { fr: 'Épées de la Justice', en: 'Swords of Justice' },
    description: { fr: 'Cobaltium, Terrakium, Viridium, Keldeo', en: 'Cobalion, Terrakion, Virizion, Keldeo' },
    icon: 'cobalion',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countSpecific(data, ['cobalion', 'terrakion', 'virizion', 'keldeo', 'keldeoResolute'])
});

addChallenge({
    id: 'tapu_guardians',
    title: { fr: 'Gardiens Tapu', en: 'Tapu Guardians' },
    description: { fr: 'Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini', en: 'Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini' },
    icon: 'tapuKoko',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countSpecific(data, ['tapuKoko', 'tapuLele', 'tapuBulu', 'tapuFini'])
});

addChallenge({
    id: 'forces_of_nature',
    title: { fr: 'Forces de la Nature', en: 'Forces of Nature' },
    description: { fr: 'Tornadus, Thundurus, Landorus, Enamorus', en: 'Tornadus, Thundurus, Landorus, Enamorus' },
    icon: 'tornadus',
    category: CHALLENGE_CATEGORIES.POKEMON,
    tiers: [1, 2, 4, 8],
    isNumeric: true,
    check: (data) => countSpecific(data, ['tornadus', 'tornadusTherian', 'thundurus', 'thundurusTherian', 'landorus', 'landorusTherian', 'enamorus', 'enamorusTherian'])
});

// ITEMS
addChallenge({
    id: 'gems_x20',
    title: { fr: 'Collection de Gemmes', en: 'Gem Collection' },
    description: { fr: 'Gemmes différentes à x20', en: 'Different gems at x20' },
    icon: 'normalGem',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [3, 6, 9, 12, 15, 18],
    isNumeric: true,
    check: (data) => countGemsAt20(data)
});

addChallenge({
    id: 'held_items',
    title: { fr: 'Objets Tenus', en: 'Held Items' },
    description: { fr: 'Objets tenus différents x20', en: 'Different held items at x20' },
    icon: 'leftovers',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [5, 10, 20, 30, 40, 60],
    priorityTop: true,
    check: (data) => countHeldItemsAt20(data)
});

addChallenge({
    id: 'mega_stones',
    title: { fr: 'Méga-Gemmes', en: 'Mega Stones' },
    description: { fr: 'Méga-Gemmes collectées', en: 'Mega Stones collected' },
    icon: 'charizarditeX',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [5, 15, 30, 50, 70, 90],
    isNumeric: true,
    check: (data) => countMegaStones(data)
});

// Baies
addChallenge({
    id: 'berries_collector',
    title: { fr: 'Cueilleur de Baies', en: 'Berry Picker' },
    description: { fr: 'Baies différentes collectées', en: 'Different berries collected' },
    icon: 'berryOran',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [3, 6, 10, 14, 17],
    isNumeric: true,
    check: (data) => countBerries(data)
});

addChallenge({
    id: 'berries_master',
    title: { fr: 'Maître des Baies', en: 'Berry Master' },
    description: { fr: 'Baies différentes collectées', en: 'Different berries collected' },
    icon: 'babiriBerry',
    category: CHALLENGE_CATEGORIES.ITEMS,
    tiers: [5, 10, 14, 17],
    isNumeric: true,
    check: (data) => countBerries(data)
});

// DRESSEURS
addChallenge({
    id: 'gym_leaders',
    title: { fr: 'Champions', en: 'Gym Leaders' },
    description: { fr: 'Champions d\'arène vaincus', en: 'Gym leaders defeated' },
    icon: 'vsGymLeaderBrock',
    category: CHALLENGE_CATEGORIES.TRAINERS,
    tiers: [1, 2, 3],
    isNumeric: true,
    check: (data) => countDefeated(data, ['vsGymLeaderBrock', 'vsGymLeaderMisty', 'vsGymLeaderPhoebe'])
});

addChallenge({
    id: 'elite_four',
    title: { fr: 'Conseil 4', en: 'Elite Four' },
    description: { fr: 'Membres du Conseil 4 vaincus', en: 'Elite Four members defeated' },
    icon: 'vsEliteFourLance',
    category: CHALLENGE_CATEGORIES.TRAINERS,
    tiers: [1, 2, 3, 4],
    isNumeric: true,
    check: (data) => countDefeated(data, ['vsEliteFourLorelei', 'vsEliteFourFlint', 'vsEliteFourPoppy', 'vsEliteFourLance'])
});

addChallenge({
    id: 'team_leaders',
    title: { fr: 'Chefs de Team', en: 'Team Leaders' },
    description: { fr: 'Chefs de Team vaincus', en: 'Team leaders defeated' },
    icon: 'vsTeamLeaderGiovanni',
    category: CHALLENGE_CATEGORIES.TRAINERS,
    tiers: [1, 2, 3, 4, 5, 6],
    isNumeric: true,
    check: (data) => countDefeated(data, ['vsTeamLeaderGiovanni', 'vsTeamLeaderArchie', 'vsTeamLeaderMaxie', 'vsTeamLeaderCyrus', 'vsTeamLeaderGhetsis', 'vsTeamLeaderColress'])
});

addChallenge({
    id: 'cynthia',
    title: { fr: 'Dresseuse Élite', en: 'Elite Trainer' },
    description: { fr: 'Cynthia vaincue', en: 'Cynthia defeated' },
    icon: 'vsEliteTrainerCynthia',
    category: CHALLENGE_CATEGORIES.TRAINERS,
    tiers: [1],
    priorityTop: true,
    check: (data) => data?.vsEliteTrainerCynthia?.defeated ? 1 : 0
});

// MISC
addChallenge({
    id: 'gholdengo_goal',
    title: { fr: 'Objectif Gholdengo', en: 'Gholdengo Goal' },
    description: { fr: 'Capturer Gholdengo', en: 'Catch Gholdengo' },
    icon: 'gholdengo',
    category: CHALLENGE_CATEGORIES.MISC,
    tiers: [1],
    check: (data) => data?.gholdengo?.caught > 0 ? 1 : 0
});

addChallenge({
    id: 'perfect_ivs',
    title: { fr: 'Collection d\'Étoiles', en: 'Star Collection' },
    description: { fr: 'Pokémon avec toutes les IV à 6 étoiles', en: 'Pokémon with all IVs at 6 stars' },
    icon: 'machoBrace',
    category: CHALLENGE_CATEGORIES.MISC,
    tiers: [1, 10, 100, 200, 500],
    isNumeric: true,
    check: (data) => countPokemonWithAllPerfectIVs(data)
});

addChallenge({
    id: 'ribbons_collector',
    title: { fr: 'Collection de Rubans', en: 'Ribbon Collection' },
    description: { fr: 'Rubans collectés', en: 'Ribbons collected' },
    icon: 'ribbons/souvenir',
    category: CHALLENGE_CATEGORIES.MISC,
    tiers: [10, 25, 50, 100, 200, 500],
    isNumeric: true,
    check: (data) => countRibbons(data)
});

// SECRETS
addChallenge({
    id: 'secret_missingno',
    title: { fr: 'MissingNo', en: 'MissingNo' },
    description: { fr: 'Capturer le Pokémon glitch MissingNo', en: 'Catch the glitch Pokémon MissingNo' },
    icon: 'missingno',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => data?.missingno?.caught > 0 ? 1 : 0
});

addChallenge({
    id: 'secret_f00',
    title: { fr: 'F-00', en: 'F-00' },
    description: { fr: 'Capturer le Pokémon secret F-00', en: 'Catch the secret Pokémon F-00' },
    icon: 'f00',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => data?.f00?.caught > 0 ? 1 : 0
});

addChallenge({
    id: 'secret_ghost',
    title: { fr: 'Ghost', en: 'Ghost' },
    description: { fr: 'Capturer le Pokémon Fantôme secret', en: 'Catch the secret Ghost Pokémon' },
    icon: 'ghost',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => data?.ghost?.caught > 0 ? 1 : 0
});

addChallenge({
    id: 'secret_humanoid',
    title: { fr: 'Humanoid', en: 'Humanoid' },
    description: { fr: 'Capturer le Pokémon Humanoïde secret', en: 'Catch the secret Humanoid Pokémon' },
    icon: 'humanoid',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => data?.humanoid?.caught > 0 ? 1 : 0
});

addChallenge({
    id: 'secret_onix',
    title: { fr: 'Crystal Onix', en: 'Crystal Onix' },
    description: { fr: 'Capturer l\'Onix Cristal secret', en: 'Catch the secret Crystal Onix' },
    icon: 'crystalOnix',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.secretOnix?.caught > 0 || data?.crystalOnix?.caught > 0 || data?.onixCrystal?.caught > 0) ? 1 : 0
});

addChallenge({
    id: 'secret_aerodactyl',
    title: { fr: 'Aerodactyl-B', en: 'Aerodactyl-B' },
    description: { fr: 'Capturer l\'Aerodactyl secret', en: 'Catch the secret Aerodactyl' },
    icon: 'aerodactylB',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.secretAerodactly?.caught > 0 || data?.aerodactlyB?.caught > 0 || data?.betaAerodactly?.caught > 0) ? 1 : 0
});

addChallenge({
    id: 'secret_kabutops',
    title: { fr: 'Kabutops-B', en: 'Kabutops-B' },
    description: { fr: 'Capturer le Kabutops secret', en: 'Catch the secret Kabutops' },
    icon: 'kabutopsB',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.secretKabutops?.caught > 0 || data?.kabutopsB?.caught > 0 || data?.betaKabutops?.caught > 0) ? 1 : 0
});

addChallenge({
    id: 'secret_missingno_shiny',
    title: { fr: 'MissingNo Shiny', en: 'Shiny MissingNo' },
    description: { fr: 'Capturer MissingNo en version Shiny', en: 'Catch MissingNo in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.missingno?.caught > 0 && data?.missingno?.shiny) ? 1 : 0
});

addChallenge({
    id: 'secret_f00_shiny',
    title: { fr: 'F-00 Shiny', en: 'Shiny F-00' },
    description: { fr: 'Capturer F-00 en version Shiny', en: 'Catch F-00 in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.f00?.caught > 0 && data?.f00?.shiny) ? 1 : 0
});

addChallenge({
    id: 'secret_ghost_shiny',
    title: { fr: 'Ghost Shiny', en: 'Shiny Ghost' },
    description: { fr: 'Capturer le Fantôme secret en version Shiny', en: 'Catch the secret Ghost in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.ghost?.caught > 0 && data?.ghost?.shiny) ? 1 : 0
});

addChallenge({
    id: 'secret_humanoid_shiny',
    title: { fr: 'Humanoid Shiny', en: 'Shiny Humanoid' },
    description: { fr: 'Capturer l\'Humanoïde secret en version Shiny', en: 'Catch the secret Humanoid in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => (data?.humanoid?.caught > 0 && data?.humanoid?.shiny) ? 1 : 0
});

addChallenge({
    id: 'secret_onix_shiny',
    title: { fr: 'Crystal Onix Shiny', en: 'Shiny Crystal Onix' },
    description: { fr: 'Capturer l\'Onix Cristal en version Shiny', en: 'Catch Crystal Onix in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => ((data?.secretOnix?.caught > 0 && data?.secretOnix?.shiny) || (data?.crystalOnix?.caught > 0 && data?.crystalOnix?.shiny)) ? 1 : 0
});

addChallenge({
    id: 'secret_aerodactyl_shiny',
    title: { fr: 'Aerodactyl-B Shiny', en: 'Shiny Aerodactyl-B' },
    description: { fr: 'Capturer l\'Aerodactyl secret en version Shiny', en: 'Catch the secret Aerodactyl in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => ((data?.secretAerodactly?.caught > 0 && data?.secretAerodactly?.shiny) || (data?.aerodactlyB?.caught > 0 && data?.aerodactlyB?.shiny)) ? 1 : 0
});

addChallenge({
    id: 'secret_kabutops_shiny',
    title: { fr: 'Kabutops-B Shiny', en: 'Shiny Kabutops-B' },
    description: { fr: 'Capturer le Kabutops secret en version Shiny', en: 'Catch the secret Kabutops in Shiny version' },
    icon: 'shinyCharm',
    category: CHALLENGE_CATEGORIES.SECRET,
    tiers: [1],
    check: (data) => ((data?.secretKabutops?.caught > 0 && data?.secretKabutops?.shiny) || (data?.kabutopsB?.caught > 0 && data?.kabutopsB?.shiny)) ? 1 : 0
});

// Tour de Combat - Rubans
addChallenge({
    id: 'tower_ribbons',
    title: { fr: 'Maître de la Tour', en: 'Tower Master' },
    description: { fr: 'Niveau max du ruban Tour de Combat', en: 'Max Battle Tower ribbon level' },
    icon: 'ribbons/tower1',
    category: CHALLENGE_CATEGORIES.MISC,
    isNumeric: true,
    priorityTop: true,
    tiers: [30, 50, 75, 100, 120, 150],
    isNumeric: true,
    priorityTop: true,
    check: (data) => getMaxTowerRibbonLevel(data)
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function countAllCaptures(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.caught > 0) count += data[key].caught;
    }
    return count;
}

function countUniquePokemon(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.caught > 0) count++;
    }
    return count;
}

function countShinies(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.shiny && data[key]?.caught > 0) count++;
    }
    return count;
}

function countLevel100(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.level >= 100 && data[key]?.caught > 0) count++;
    }
    return count;
}

function countPokemonInList(data, pokemonList) {
    if (!data) return 0;
    let count = 0;
    for (let name of pokemonList) {
        if (data[name]?.caught > 0) count += data[name].caught;
    }
    return count;
}

function countByPrefix(data, prefix) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (key.startsWith(prefix) && data[key]?.caught > 0) count++;
    }
    return count;
}

function countBySuffix(data, suffix) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (key.endsWith(suffix) && data[key]?.caught > 0) count++;
    }
    return count;
}

function countSpecific(data, list) {
    if (!data) return 0;
    let count = 0;
    for (let name of list) {
        if (data[name]?.caught > 0) count++;
    }
    return count;
}

function countSpecificShiny(data, list) {
    if (!data) return 0;
    let count = 0;
    for (let name of list) {
        if (data[name]?.caught > 0 && data[name]?.shiny) count++;
    }
    return count;
}

function countGemsAt20(data) {
    if (!data) return 0;
    const gems = ['bugGem', 'darkGem', 'dragonGem', 'electricGem', 'fairyGem', 'fightingGem', 'fireGem', 'flyingGem', 'ghostGem', 'grassGem', 'groundGem', 'iceGem', 'normalGem', 'poisonGem', 'psychicGem', 'rockGem', 'steelGem', 'waterGem'];
    let count = 0;
    for (let gem of gems) {
        if (data[gem]?.got >= 20) count++;
    }
    return count;
}

function countHeldItemsAt20(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (key.endsWith('ite')) continue;
        if (key.endsWith('Gem')) continue;
        if (key.endsWith('Memory')) continue;
        if (data[key]?.got >= 20 && !key.startsWith('shop') && !key.startsWith('event') && !key.startsWith('vs')) {
            count++;
        }
    }
    return count;
}

function countMegaStones(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (key.endsWith('ite') && data[key]?.got > 0) count++;
    }
    return count;
}

function countDefeated(data, list) {
    if (!data) return 0;
    let count = 0;
    for (let name of list) {
        if (data[name]?.defeated) count++;
    }
    return count;
}

function countAnyDefeated(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (key.startsWith('vs') && data[key]?.defeated) count++;
    }
    return count;
}

function countPokemonByType(data, type) {
    if (!data || !POKEMON_BY_TYPE[type]) return 0;
    let count = 0;
    for (let name of POKEMON_BY_TYPE[type]) {
        if (data[name]?.caught > 0) count++;
    }
    return count;
}

function countUniqueItems(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.got > 0) count++;
    }
    return count;
}

function countPokemonWithPerfectIV(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.caught > 0 && data[key]?.ivs) {
            const ivs = data[key].ivs;
            if (ivs.hp >= 6 || ivs.atk >= 6 || ivs.def >= 6 || ivs.satk >= 6 || ivs.sdef >= 6 || ivs.spe >= 6) count++;
        }
    }
    return count;
}

function countPokemonWithAllPerfectIVs(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.caught > 0 && data[key]?.ivs) {
            const ivs = data[key].ivs;
            if (ivs.hp >= 6 && ivs.atk >= 6 && ivs.def >= 6 && ivs.satk >= 6 && ivs.sdef >= 6 && ivs.spe >= 6) count++;
        }
    }
    return count;
}

function countRibbons(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
        if (data[key]?.caught > 0 && data[key]?.ribbons) count += data[key].ribbons.length;
    }
    return count;
}

function countBerries(data) {
    if (!data) return 0;
    const berryList = ['oranBerry', 'sitrusBerry', 'cheriBerry', 'chestoBerry', 'pechaBerry', 'rawstBerry', 'aspearBerry', 'leppaBerry', 'persimBerry', 'lumBerry', 'figyBerry', 'wikiBerry', 'magoBerry', 'aguavBerry', 'iapapaBerry', 'razzBerry', 'blukBerry', 'nanabBerry', 'wepearBerry', 'pinapBerry', 'occaBerry', 'passhoBerry', 'wacanBerry', 'rindoBerry', 'yacheBerry', 'chopleBerry', 'kebiaBerry', 'shucaBerry', 'cobaBerry', 'payapaBerry', 'tangaBerry', 'chartiBerry', 'kasibBerry', 'habanBerry', 'colburBerry', 'babiriBerry', 'roseliBerry'];
    let count = 0;
    for (let berry of berryList) {
        if (data[berry]?.got > 0) count++;
    }
    return count;
}

function countUnown(data) {
    if (!data) return 0;
    const unownForms = ['unownA', 'unownB', 'unownC', 'unownD', 'unownE', 'unownF', 'unownG', 'unownH', 'unownI', 'unownJ', 'unownK', 'unownL', 'unownM', 'unownN', 'unownO', 'unownP', 'unownQ', 'unownR', 'unownS', 'unownT', 'unownU', 'unownV', 'unownW', 'unownX', 'unownY', 'unownZ', 'unownExclamation', 'unownQuestion'];
    let count = 0;
    for (let name of unownForms) {
        if (data[name]?.caught > 0) count++;
    }
    return count;
}

function countUnownShiny(data) {
    const unownForms = ['unownA', 'unownB', 'unownC', 'unownD', 'unownE', 'unownF', 'unownG', 'unownH', 'unownI', 'unownJ', 'unownK', 'unownL', 'unownM', 'unownN', 'unownO', 'unownP', 'unownQ', 'unownR', 'unownS', 'unownT', 'unownU', 'unownV', 'unownW', 'unownX', 'unownY', 'unownZ', 'unownExclamation', 'unownQuestion'];
    return countSpecificShiny(data, unownForms);
}

function countVivillon(data) {
    if (!data) return 0;
    const vivillonForms = ['vivillon', 'vivillonArchipelago', 'vivillonContinental', 'vivillonElegant', 'vivillonFancy', 'vivillonGarden', 'vivillonHighPlains', 'vivillonIcySnow', 'vivillonJungle', 'vivillonMarine', 'vivillonModern', 'vivillonMonsoon', 'vivillonOcean', 'vivillonPokeball', 'vivillonPolar', 'vivillonRiver', 'vivillonSandstorm', 'vivillonSavanna', 'vivillonSun', 'vivillonTundra'];
    let count = 0;
    for (let name of vivillonForms) {
        if (data[name]?.caught > 0) count++;
    }
    return count;
}

function countVivillonShiny(data) {
    if (!data) return 0;
    const vivillonForms = ['vivillon', 'vivillonArchipelago', 'vivillonContinental', 'vivillonElegant', 'vivillonFancy', 'vivillonGarden', 'vivillonHighPlains', 'vivillonIcySnow', 'vivillonJungle', 'vivillonMarine', 'vivillonModern', 'vivillonMonsoon', 'vivillonOcean', 'vivillonPokeball', 'vivillonPolar', 'vivillonRiver', 'vivillonSandstorm', 'vivillonSavanna', 'vivillonSun', 'vivillonTundra'];
    let count = 0;
    for (let name of vivillonForms) {
        if (data[name]?.caught > 0 && data[name]?.shiny) count++;
    }
    return count;
}

function getMaxTowerRibbonLevel(data) {
    if (!data) return 0;
    let maxLevel = 0;
    
    // Fonction helper pour scanner un objet Pokémon
    function scanPokemon(pokemon) {
        if (!pokemon || !pokemon.ribbons || !Array.isArray(pokemon.ribbons)) return;
        
        let hasTowerRibbon = false;
        
        for (let ribbon of pokemon.ribbons) {
            // Les rubans sont des strings: "tower1", "tower30", etc.
            if (typeof ribbon !== 'string') continue;
            
            // Extraire le nombre après "tower"
            const match = ribbon.match(/^tower(\d+)$/i);
            if (match) {
                hasTowerRibbon = true;
                const level = parseInt(match[1]);
                if (level > maxLevel) {
                    maxLevel = level;
                }
            }
        }
        
        // Si le Pokémon a un ruban tower, vérifier aussi recordSpiraling
        // qui contient le vrai record de l'étage atteint
        if (hasTowerRibbon && typeof pokemon.recordSpiraling === 'number') {
            if (pokemon.recordSpiraling > maxLevel) {
                maxLevel = pokemon.recordSpiraling;
            }
        }
    }
    
    // 1. Scanner tous les objets de data (profondeur limitée)
    function scanObject(obj, depth = 0) {
        if (!obj || typeof obj !== 'object' || depth > 5) return;
        
        // Si c'est un array, scanner chaque élément
        if (Array.isArray(obj)) {
            for (let item of obj) {
                scanPokemon(item);
                scanObject(item, depth + 1);
            }
        } else {
            // Si c'est un objet, vérifier s'il a des rubans (c'est un Pokémon)
            scanPokemon(obj);
            
            // Continuer à scanner récursivement
            for (let key in obj) {
                const val = obj[key];
                if (val && typeof val === 'object') {
                    scanPokemon(val);
                    scanObject(val, depth + 1);
                }
            }
        }
    }
    
    // Lancer le scan depuis la racine
    scanObject(data);
    
    // Retourner le niveau max trouvé (30, 50, etc.)
    return maxLevel;
}

// ============================================
// INDEXEDDB CACHE
// ============================================
const CHALLENGES_DB_NAME = 'PokeChillChallengesDB';
const CHALLENGES_STORE_NAME = 'challengesCache';
const CHALLENGES_DB_VERSION = 1;

function openChallengesDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CHALLENGES_DB_NAME, CHALLENGES_DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(CHALLENGES_STORE_NAME)) {
                e.target.result.createObjectStore(CHALLENGES_STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

async function getFromChallengesDB(key) {
    try {
        const db = await openChallengesDB();
        return new Promise((resolve) => {
            const request = db.transaction(CHALLENGES_STORE_NAME, 'readonly')
                .objectStore(CHALLENGES_STORE_NAME).get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function saveToChallengesDB(key, value) {
    try {
        const db = await openChallengesDB();
        return new Promise((resolve) => {
            const tx = db.transaction(CHALLENGES_STORE_NAME, 'readwrite');
            tx.objectStore(CHALLENGES_STORE_NAME).put({ key, value });
            tx.oncomplete = () => resolve();
        });
    } catch {}
}

async function clearChallengesDB() {
    try {
        const db = await openChallengesDB();
        return new Promise((resolve) => {
            const tx = db.transaction(CHALLENGES_STORE_NAME, 'readwrite');
            tx.objectStore(CHALLENGES_STORE_NAME).clear();
            tx.oncomplete = () => resolve();
        });
    } catch {}
}

// ============================================
// USER PREFERENCES (Persistent alerts/settings)
// ============================================
async function saveUserPreference(key, value) {
    try {
        await saveToChallengesDB('pref_' + key, value);
        // Also save to localStorage as backup
        localStorage.setItem('pokechill_pref_' + key, JSON.stringify(value));
    } catch {}
}

async function loadUserPreference(key, defaultValue = null) {
    try {
        // Try IndexedDB first
        const value = await getFromChallengesDB('pref_' + key);
        if (value !== null) return value;
        
        // Fallback to localStorage
        const ls = localStorage.getItem('pokechill_pref_' + key);
        if (ls) return JSON.parse(ls);
    } catch {}
    return defaultValue;
}

// ============================================
// CHALLENGES MANAGER
// ============================================
const ChallengesExplorer = {
    cachedProgress: null,
    
    init: async function() {
        // Charger depuis IndexedDB au démarrage
        const cached = await getFromChallengesDB('lastProgress');
        if (cached) {
            this.cachedProgress = cached;
            window.loadedChallengesData = cached.rawData;
        }
    },
    
    getSaveData: function() {
        if (window.loadedChallengesData) return window.loadedChallengesData;
        const gameData = localStorage.getItem('gameData');
        if (gameData) {
            try { return JSON.parse(gameData); } catch (e) { return null; }
        }
        if (typeof window.loadedSaveData !== 'undefined' && window.loadedSaveData) {
            return window.loadedSaveData;
        }
        return null;
    },
    
    getProgress: function() {
        const data = this.getSaveData();
        if (!data) return this.cachedProgress;
        
        const lang = this.getLanguage();
        const progress = {};
        
        CHALLENGES_DB.forEach(challenge => {
            const currentValue = challenge.check(data);
            const maxTier = challenge.tiers.length;
            
            // Détecter si c'est un challenge avec seuils numériques (ex: 30, 50, 75...)
            // Un challenge 'isNumeric' a des paliers comme valeurs à atteindre (ex: niveau 30, 50...)
            // Un challenge standard a des paliers comme compteur (ex: 1 shiny, 5 shinies...)
            const isNumericThresholds = challenge.isNumeric === true;
            
            let currentTier, nextTierThreshold, prevTierThreshold, progressPercent, stepsToNext, isMaxed;
            
            if (isNumericThresholds) {
                // Calcul basé sur les seuils (ex: tower ribbons)
                currentTier = 0;
                for (let i = 0; i < challenge.tiers.length; i++) {
                    if (currentValue >= challenge.tiers[i]) {
                        currentTier++;
                    } else {
                        break;
                    }
                }
                nextTierThreshold = currentTier < maxTier ? challenge.tiers[currentTier] : null;
                prevTierThreshold = currentTier > 0 ? challenge.tiers[currentTier - 1] : 0;
                isMaxed = currentTier >= maxTier;
                progressPercent = maxTier > 1 ? Math.min(100, (currentTier / maxTier) * 100) : (currentTier >= 1 ? 100 : 0);
                stepsToNext = nextTierThreshold !== null ? nextTierThreshold - currentValue : 0;
            } else {
                // Calcul standard (compteur de paliers)
                currentTier = Math.min(currentValue, maxTier);
                nextTierThreshold = currentTier < maxTier ? challenge.tiers[currentTier] : null;
                prevTierThreshold = currentTier > 0 ? challenge.tiers[currentTier - 1] : 0;
                isMaxed = currentValue >= maxTier;
                progressPercent = maxTier > 1 ? Math.min(100, (currentValue / maxTier) * 100) : (currentValue >= 1 ? 100 : 0);
                stepsToNext = nextTierThreshold !== null ? nextTierThreshold - currentValue : 0;
            }
            
            progress[challenge.id] = {
                id: challenge.id,
                title: typeof challenge.title === 'object' ? challenge.title[lang] || challenge.title.fr : challenge.title,
                description: typeof challenge.description === 'object' ? challenge.description[lang] || challenge.description.fr : challenge.description,
                icon: challenge.icon,
                category: challenge.category,
                tiers: challenge.tiers,
                currentValue: currentValue,
                completedTiers: currentTier,
                maxTiers: maxTier,
                isMaxed: isMaxed,
                nextGoal: nextTierThreshold,
                prevGoal: prevTierThreshold,
                progressPercent: progressPercent,
                stepsToNext: stepsToNext,
                isNumericProgress: isNumericThresholds,
                priorityTop: challenge.priorityTop === true
            };
        });
        
        // Sauvegarder dans le cache
        this.cachedProgress = progress;
        saveToChallengesDB('lastProgress', { rawData: data, progress: progress, timestamp: Date.now() });
        
        return progress;
    },
    
    getCompletedCount: function() {
        const progress = this.getProgress();
        if (!progress) return { completed: 0, total: CHALLENGES_DB.length };
        const completed = Object.values(progress).filter(p => p.completedTiers > 0).length;
        return { completed, total: CHALLENGES_DB.length };
    },
    
    getLanguage: function() {
        // Utiliser le système de langue du site (pokechill-lang)
        if (typeof currentLang !== 'undefined') return currentLang;
        const savedLang = localStorage.getItem('pokechill-lang');
        if (savedLang) return savedLang;
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang && browserLang.startsWith('fr') ? 'fr' : 'en';
    },
    
    getTotalCompleted: function() {
        const progress = this.getProgress();
        if (!progress) return 0;
        return Object.values(progress).reduce((sum, p) => sum + p.completedTiers, 0);
    },
    
    getTotalTiers: function() {
        return CHALLENGES_DB.reduce((sum, c) => sum + c.tiers.length, 0);
    },
    
    getCompletionPercent: function() {
        return Math.floor((this.getTotalCompleted() / this.getTotalTiers()) * 100);
    }
};

// ============================================
// UI FUNCTIONS
// ============================================
function openChallengesModal() {
    const progress = ChallengesExplorer.getProgress();
    
    let modal = document.getElementById('challenges-modal');
    if (!modal) {
        modal = createChallengesModal();
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    renderChallenges(progress);
    updateChallengesSummary();
    updateImportButtonVisibility();
}

function closeChallengesModal() {
    const modal = document.getElementById('challenges-modal');
    if (modal) modal.style.display = 'none';
}

function createChallengesModal() {
    const lang = ChallengesExplorer.getLanguage();
    const isFr = lang === 'fr';
    
    const texts = {
        title: isFr ? '🏆 SUCCES' : '🏆 ACHIEVEMENTS',
        noSave: isFr ? 'Chargez votre sauvegarde pour voir vos progrès' : 'Load your save to see progress',
        importBtn: isFr ? '📂 Importer' : '📂 Import',
        reloadBtn: isFr ? '🔄 Recharger' : '🔄 Reload',
        filter: isFr ? 'Filtrer:' : 'Filter:',
        all: isFr ? '🌟 Tous' : '🌟 All',
        pokemon: isFr ? '📦 Pokémon' : '📦 Pokémon',
        shiny: isFr ? '✨ Shiny' : '✨ Shiny',
        items: isFr ? '🎒 Items' : '🎒 Items',
        trainers: isFr ? '⚔️ Dresseurs' : '⚔️ Trainers',
        secret: isFr ? '👻 Secrets' : '👻 Secrets',
        misc: isFr ? '🎯 Divers' : '🎯 Misc',
        noSaveDetected: isFr ? 'Aucune sauvegarde détectée' : 'No save detected',
        nextTier: isFr ? 'Prochain palier' : 'Next tier'
    };
    
    const modal = document.createElement('div');
    modal.id = 'challenges-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 9999; display: none;
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    modal.innerHTML = `
        <style>
            #challenges-filter {
                appearance: none;
                -webkit-appearance: none;
                background: linear-gradient(135deg, rgba(138,43,226,0.2), rgba(75,0,130,0.2)) !important;
                border: 2px solid #4a4a8a !important;
                border-radius: 10px !important;
                padding: 10px 40px 10px 15px !important;
                color: #fff !important;
                font-size: 0.9rem !important;
                cursor: pointer !important;
                min-width: 160px !important;
                font-weight: 500 !important;
                transition: all 0.2s ease !important;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 8L1 3h10z'/%3E%3C/svg%3E") !important;
                background-repeat: no-repeat !important;
                background-position: right 15px center !important;
            }
            #challenges-filter:hover {
                border-color: #00d4ff !important;
                box-shadow: 0 0 10px rgba(0,212,255,0.3) !important;
            }
            #challenges-filter option {
                background: #1a1a2e !important;
                color: #fff !important;
                padding: 10px !important;
            }
            #challenges-import-btn, #challenges-reload-btn {
                transition: transform 0.2s, box-shadow 0.2s !important;
            }
            #challenges-import-btn:hover, #challenges-reload-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 15px rgba(0,212,255,0.4) !important;
            }
        </style>
        <div style="
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 2px solid #4a4a8a; border-radius: 16px;
            width: 100%; max-width: 900px; max-height: 85vh;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 0 40px rgba(0,0,0,0.8);
        ">
            <div style="
                background: linear-gradient(135deg, rgba(138,43,226,0.3), rgba(75,0,130,0.3));
                padding: 20px; border-bottom: 2px solid #4a4a8a;
                display: flex; justify-content: space-between; align-items: center;
            ">
                <div>
                    <h2 style="margin:0;color:#fff;font-size:1.5rem">${texts.title}</h2>
                    <div id="challenges-summary" style="margin-top:8px;font-size:0.9rem;color:#b19cd9">
                        ${texts.noSave}
                    </div>
                </div>
                <div style="display:flex;gap:10px;align-items:center">
                    <button id="challenges-import-btn" onclick="document.getElementById('challenges-file-input').click()" style="
                        background: linear-gradient(135deg, #00d4ff, #0099cc); border: none;
                        border-radius: 8px; padding: 10px 18px; color: white;
                        font-weight: 600; cursor: pointer; font-size: 0.9rem;
                    ">${texts.importBtn}</button>
                    <button id="challenges-reload-btn" onclick="reloadChallengesSave()" style="
                        background: linear-gradient(135deg, #ff8800, #ff5500); border: none;
                        border-radius: 8px; padding: 10px 18px; color: white;
                        font-weight: 600; cursor: pointer; font-size: 0.9rem; display: none;
                    ">${texts.reloadBtn}</button>
                    <input type="file" id="challenges-file-input" accept=".json" style="display:none" onchange="onChallengesFileImport(event)">
                    <button onclick="closeChallengesModal()" style="
                        background: rgba(255,255,255,0.1); border: none;
                        border-radius: 8px; padding: 10px 14px; color: white;
                        cursor: pointer; font-size: 1.2rem;
                    ">✕</button>
                </div>
            </div>
            
            <div id="challenges-import-status" style="display:none;padding:10px 20px;text-align:center;font-size:0.85rem;"></div>
            
            <div style="padding:15px 20px;border-bottom:1px solid #2a2a4a;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <span style="color:#888;font-size:0.85rem;font-weight:500;">${texts.filter}</span>
                <select id="challenges-filter" onchange="renderChallenges()">
                    <option value="all">${texts.all}</option>
                    <option value="pokemon">${texts.pokemon}</option>
                    <option value="shiny">${texts.shiny}</option>
                    <option value="items">${texts.items}</option>
                    <option value="trainers">${texts.trainers}</option>
                    <option value="secret">${texts.secret}</option>
                    <option value="misc">${texts.misc}</option>
                </select>
            </div>
            
            <div id="challenges-list" style="
                flex: 1; overflow-y: auto; padding: 12px;
                display: flex; flex-direction: column; gap: 8px; min-height: 200px;
            ">
                <div style="text-align: center; padding: 40px; opacity: 0.6;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">📂</div>
                    <div>${texts.noSaveDetected}</div>
                </div>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeChallengesModal();
    });
    
    return modal;
}

function renderChallenges(progress) {
    // BUG FIX: Si progress n'est pas fourni, le recalculer
    if (!progress) {
        progress = ChallengesExplorer.getProgress();
    }
    
    const list = document.getElementById('challenges-list');
    const filter = document.getElementById('challenges-filter')?.value || 'all';
    const lang = ChallengesExplorer.getLanguage();
    const isFr = lang === 'fr';
    
    if (!list) return;
    
    if (!progress) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; opacity: 0.6;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📂</div>
                <div>${isFr ? 'Aucune sauvegarde détectée' : 'No save detected'}</div>
            </div>
        `;
        return;
    }
    
    let challenges = Object.values(progress);
    if (filter !== 'all') challenges = challenges.filter(c => c.category === filter);
    
    challenges.sort((a, b) => {
        // Challenges prioritaires en premier (sauf si terminés)
        if (!a.isMaxed && !b.isMaxed) {
            if (a.priorityTop && !b.priorityTop) return -1;
            if (!a.priorityTop && b.priorityTop) return 1;
        }
        
        if (a.isMaxed && !b.isMaxed) return 1;
        if (!a.isMaxed && b.isMaxed) return -1;
        return b.progressPercent - a.progressPercent;
    });
    
    list.innerHTML = challenges.map(c => {
        const tier = TIERS[Math.min(c.completedTiers, TIERS.length - 1)];
        
        // Info sur les étapes restantes
        let stepsInfo = '';
        if (!c.isMaxed && c.nextGoal !== null) {
            if (c.isNumericProgress) {
                // Pour les numériques: afficher la valeur actuelle et la cible
                const currentDisplay = c.currentValue;
                const nextDisplay = c.nextGoal;
                stepsInfo = `<span style="color:#ff8844;font-size:0.7rem;">${isFr ? 'Obtenu' : 'Got'}: ${currentDisplay} → ${isFr ? 'But' : 'Goal'}: ${nextDisplay}</span>`;
                // Ajouter Next Tier pour les numériques aussi (sauf si c'est un challenge prioritaire sans Next Tier)
                if (!c.priorityTop) {
                    stepsInfo += ` <span style="color:#888;font-size:0.65rem;">(${isFr ? 'Palier' : 'Tier'} ${c.completedTiers + 1})</span>`;
                }
            } else {
                stepsInfo = `<span style="color:#ffaa44;font-size:0.7rem;">${isFr ? 'Prochain palier' : 'Next tier'}: ${c.nextGoal}</span>`;
            }
        }
        
        // Affichage des valeurs pour les paliers
        let progressText;
        if (c.isMaxed) {
            progressText = 'MAX';
        } else if (c.maxTiers === 1) {
            progressText = `${c.currentValue}/1`;
        } else {
            // Pour les numériques, afficher les paliers complétés, pas la valeur brute
            progressText = `${c.completedTiers}/${c.maxTiers}`;
        }
        
        // Couleur de la barre: orange/rouge pour prioritaires, bleu/magenta pour standards
        const barGradient = c.isMaxed 
            ? 'linear-gradient(90deg,#ffd700,#ffaa00)' 
            : c.priorityTop 
                ? 'linear-gradient(90deg,#ff8800,#ff4444)'  // Orange/rouge pour prioritaires
                : 'linear-gradient(90deg,#00d4ff,#ff00aa)'; // Bleu/magenta pour standards
        
        return `
            <div style="
                background: ${c.isMaxed ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'};
                border: 2px solid ${c.isMaxed ? '#ffd700' : c.priorityTop ? '#ff6600' : '#2a2a4a'};
                border-radius: 10px; padding: 12px; display: flex; align-items: center; gap: 12px;
            " onmouseover="this.style.transform='translateX(5px)'; this.style.borderColor='${c.isMaxed ? '#ffd700' : c.priorityTop ? '#ff8800' : '#00d4ff'}'" 
               onmouseout="this.style.transform=''; this.style.borderColor='${c.isMaxed ? '#ffd700' : c.priorityTop ? '#ff6600' : '#2a2a4a'}'">
                <div style="
                    width: 48px; height: 48px; background: ${c.isMaxed ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'};
                    border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative;
                ">
                    <img src="https://play-pokechill.github.io/img/${c.icon.includes('/') ? c.icon : 'items/' + c.icon}.png" 
                         onerror="challengeIconFallback(this, '${c.icon}')"
                         style="width: 32px; height: 32px; object-fit: contain;" data-icon="${c.icon}">
                    ${c.completedTiers > 0 ? `<div style="position:absolute;bottom:-4px;right:-4px;background:${tier.color};color:#000;font-size:0.65rem;font-weight:bold;padding:2px 5px;border-radius:4px;">${tier.label}</div>` : ''}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                        <span style="font-weight:600;color:${c.isMaxed ? '#ffd700' : '#fff'};font-size:0.95rem;">${c.title}</span>
                        ${c.isMaxed ? '<span style="font-size:1rem;">🏆</span>' : ''}
                    </div>
                    <div style="color:#888;font-size:0.8rem;margin-bottom:6px;">${c.description}</div>
                    ${stepsInfo ? `<div style="margin-bottom:6px;">${stepsInfo}</div>` : ''}
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                            <div style="width:${c.progressPercent}%;height:100%;background:${barGradient};border-radius:3px;"></div>
                        </div>
                        <span style="font-size:0.75rem;color:#888;white-space:nowrap;">${progressText}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateChallengesSummary() {
    const summary = document.getElementById('challenges-summary');
    if (!summary) return;
    
    const lang = ChallengesExplorer.getLanguage();
    const isFr = lang === 'fr';
    
    const data = ChallengesExplorer.getSaveData();
    if (!data) {
        summary.innerHTML = isFr ? 'Chargez votre sauvegarde pour voir vos progrès' : 'Load your save to see progress';
        return;
    }
    
    const completed = ChallengesExplorer.getTotalCompleted();
    const total = ChallengesExplorer.getTotalTiers();
    const percent = ChallengesExplorer.getCompletionPercent();
    
    if (isFr) {
        summary.innerHTML = `<span style="color:#ffd700;">⭐ ${completed}/${total}</span> paliers complétés <span style="color:#00d4ff;">(${percent}%)</span>`;
    } else {
        summary.innerHTML = `<span style="color:#ffd700;">⭐ ${completed}/${total}</span> tiers completed <span style="color:#00d4ff;">(${percent}%)</span>`;
    }
}

function updateChallengesButton() {
    const badge = document.getElementById('challenges-nav-badge');
    if (!badge) return;
    
    const data = ChallengesExplorer.getSaveData();
    if (!data) {
        badge.style.display = 'none';
        return;
    }
    
    const percent = ChallengesExplorer.getCompletionPercent();
    badge.textContent = percent;
    badge.style.display = 'flex';
}

function updateImportButtonVisibility() {
    const importBtn = document.getElementById('challenges-import-btn');
    const reloadBtn = document.getElementById('challenges-reload-btn');
    const data = ChallengesExplorer.getSaveData();
    if (importBtn && reloadBtn) {
        if (data) {
            importBtn.style.display = 'none';
            reloadBtn.style.display = 'block';
        } else {
            importBtn.style.display = 'block';
            reloadBtn.style.display = 'none';
        }
    }
}

function reloadChallengesSave() {
    document.getElementById('challenges-file-input').click();
}

function updateChallengesButtonCompleted() {
    const badge = document.getElementById('challenges-nav-badge');
    if (!badge) return;
    
    const data = ChallengesExplorer.getSaveData();
    if (!data) {
        badge.style.display = 'none';
        return;
    }
    
    const { completed, total } = ChallengesExplorer.getCompletedCount();
    badge.textContent = `${completed}/${total}`;
    badge.style.display = 'flex';
}

function onChallengesFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const lang = ChallengesExplorer.getLanguage();
    const isFr = lang === 'fr';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.saved || !data.saved.version) {
                showImportStatus(isFr ? '❌ Fichier invalide' : '❌ Invalid file', 'error');
                return;
            }
            
            window.loadedChallengesData = data;
            showImportStatus(isFr ? '✅ Sauvegarde chargée !' : '✅ Save loaded!', 'success');
            updateImportButtonVisibility();
            
            const progress = ChallengesExplorer.getProgress();
            renderChallenges(progress);
            updateChallengesSummary();
            updateChallengesButtonCompleted();
        } catch (err) {
            showImportStatus(isFr ? '❌ Erreur lors de l\'import' : '❌ Import error', 'error');
        }
    };
    reader.readAsText(file);
}

function showImportStatus(message, type) {
    const statusEl = document.getElementById('challenges-import-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = 'block';
        statusEl.style.color = type === 'error' ? '#ff4444' : '#00ff88';
        if (type === 'success') setTimeout(() => statusEl.style.display = 'none', 3000);
    }
}

// Export
window.openChallengesModal = openChallengesModal;
window.closeChallengesModal = closeChallengesModal;
window.renderChallenges = renderChallenges;
window.onChallengesFileImport = onChallengesFileImport;
window.reloadChallengesSave = reloadChallengesSave;
window.updateChallengesButtonCompleted = updateChallengesButtonCompleted;
window.ChallengesExplorer = ChallengesExplorer;

// Initialisation au chargement
async function initChallengesExplorer() {
    await ChallengesExplorer.init();
    // Mettre à jour le bouton après chargement du cache
    if (typeof updateChallengesButtonCompleted === 'function') {
        updateChallengesButtonCompleted();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChallengesExplorer);
} else {
    initChallengesExplorer();
}

// Hook pour le changement de langue du site
window.refreshChallengesLang = function() {
    const modal = document.getElementById('challenges-modal');
    if (!modal || modal.style.display !== 'flex') return;
    
    const lang = ChallengesExplorer.getLanguage();
    const isFr = lang === 'fr';
    
    // Mettre à jour les textes statiques
    const title = modal.querySelector('h2');
    if (title) title.textContent = isFr ? '🏆 SUCCES' : '🏆 ACHIEVEMENTS';
    
    const importBtn = document.getElementById('challenges-import-btn');
    if (importBtn) importBtn.textContent = isFr ? '📂 Importer' : '📂 Import';
    
    const reloadBtn = document.getElementById('challenges-reload-btn');
    if (reloadBtn) reloadBtn.textContent = isFr ? '🔄 Recharger' : '🔄 Reload';
    
    const filterLabel = modal.querySelector('span[style*="#888"]');
    if (filterLabel) filterLabel.textContent = isFr ? 'Filtrer:' : 'Filter:';
    
    // Mettre à jour les options du select
    const select = document.getElementById('challenges-filter');
    if (select) {
        select.options[0].text = isFr ? '🌟 Tous' : '🌟 All';
        select.options[1].text = isFr ? '📦 Pokémon' : '📦 Pokémon';
        select.options[2].text = isFr ? '✨ Shiny' : '✨ Shiny';
        select.options[3].text = isFr ? '🎒 Items' : '🎒 Items';
        select.options[4].text = isFr ? '⚔️ Dresseurs' : '⚔️ Trainers';
        select.options[5].text = isFr ? '👻 Secrets' : '👻 Secrets';
        select.options[6].text = isFr ? '🎯 Divers' : '🎯 Misc';
    }
    
    // Rafraîchir la liste et le résumé
    const progress = ChallengesExplorer.getProgress();
    renderChallenges(progress);
    updateChallengesSummary();
};

// Export
window.openChallengesModal = openChallengesModal;
window.closeChallengesModal = closeChallengesModal;
window.renderChallenges = renderChallenges;
window.onChallengesFileImport = onChallengesFileImport;
window.reloadChallengesSave = reloadChallengesSave;
window.updateChallengesButtonCompleted = updateChallengesButtonCompleted;
window.ChallengesExplorer = ChallengesExplorer;
