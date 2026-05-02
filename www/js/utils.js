function format(input, rename) {
    let str = String(rename || input);
    str = str.replace(/hisuian/gi, 'Hsn. ');
    str = str.replace(/alolan/gi, 'Aln. ');
    str = str.replace(/galarian/gi, 'Gal. ');
    str = str.replace(/paldean/gi, 'Pld. ');
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/Mega /gi, 'M. ')
        .replace(/Gmax/gi, 'Gmax');
}

function isMegaPokemon(name) {
    return typeof name === 'string' && /^mega[A-Z]/.test(name);
}

// True only if the shiny color should actually be rendered.
// If shinyDisabled is set, the player has turned the shiny color off
// (typically to expose the underlying star sign hue).
function showsShinyColor(saveEntry) {
    if (!saveEntry) return false;
    return !!saveEntry.shiny && !saveEntry.shinyDisabled;
}

// Search helper - creates searchable text from name
function searchText(name, rename) {
    const display = format(name, rename);
    return `${name.toLowerCase()} ${display.toLowerCase()}`;
}

function statToRating(baseStat) {
    const r = 1 + (baseStat - 20) * (5 / 180);
    return Math.min(6, Math.max(1, Math.round(r)));
}
function statToStars(val) { return statToRating(val); }
function getDivision(bst) {
    const stars = statToRating(bst.hp) + statToRating(bst.atk) + statToRating(bst.def) + 
                  statToRating(bst.satk) + statToRating(bst.sdef) + statToRating(bst.spe);
    if (stars < 10) return 'D';
    if (stars < 14) return 'C';
    if (stars < 16) return 'B';
    if (stars < 19) return 'A';
    if (stars < 21) return 'S';
    if (stars < 24) return 'SS';
    return 'SSS';
}
function getTotalStars(bst) { return statToStars(bst.hp) + statToStars(bst.atk) + statToStars(bst.def) + statToStars(bst.satk) + statToStars(bst.sdef) + statToStars(bst.spe); }

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}


// Capitalize first letter
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}