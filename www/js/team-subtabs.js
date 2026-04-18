// ============ TEAM SUBTABS & SAVED TEAMS ============
let currentTeamSubtab = 'builder';

// ----- Storage helpers (teamsDB in localStorage) -----
// Avoids repeating JSON.parse/stringify boilerplate in 12+ call sites.
const TEAMS_DB_KEY = 'teamsDB';
function getSavedTeams() {
    try { return JSON.parse(localStorage.getItem(TEAMS_DB_KEY) || '[]'); }
    catch (e) { return []; }
}
function setSavedTeams(teams) {
    localStorage.setItem(TEAMS_DB_KEY, JSON.stringify(teams));
}
function findSavedTeam(id, teams) {
    return (teams || getSavedTeams()).find(team => team.id === id);
}

// ----- Edit / sort / filter state -----
// Active editing session: when set, "Save changes" updates this team in place.
let currentEditingLocalTeamId = null;
// Persisted sort mode for the saved teams list.
let savedTeamsSortMode = localStorage.getItem('savedTeamsSortMode') || 'date_desc';
// In-memory text filter (not persisted)
let savedTeamsFilter = '';

const SAVED_TEAMS_SORTS = {
    manual:      () => 0,  // keep storage order (user-defined via ▲▼ buttons)
    date_desc:   (a, b) => new Date(b.created || 0) - new Date(a.created || 0),
    date_asc:    (a, b) => new Date(a.created || 0) - new Date(b.created || 0),
    name_asc:    (a, b) => (a.name || '').localeCompare(b.name || ''),
    name_desc:   (a, b) => (b.name || '').localeCompare(a.name || ''),
    author_asc:  (a, b) => (a.author || '').localeCompare(b.author || '') || (a.name || '').localeCompare(b.name || ''),
    pkmn_desc:   (a, b) => (b.slots || []).filter(s => s && s.pokemon).length - (a.slots || []).filter(s => s && s.pokemon).length,
};

function setSavedTeamsSort(mode) {
    if (!SAVED_TEAMS_SORTS[mode]) return;
    savedTeamsSortMode = mode;
    localStorage.setItem('savedTeamsSortMode', mode);
    loadSavedTeams();
}

function setSavedTeamsFilter(value) {
    savedTeamsFilter = (value || '').toLowerCase().trim();
    loadSavedTeams();
}

// Helper: does a team pass the current text filter?
function passesSavedTeamsFilter(team) {
    if (!savedTeamsFilter) return true;
    const f = savedTeamsFilter;
    return (team.name || '').toLowerCase().includes(f)
        || (team.author || '').toLowerCase().includes(f)
        || (team.description || '').toLowerCase().includes(f);
}

// Move a saved team up or down. Auto-switches to "manual" sort the first time
// (snapshots the current display as the new manual baseline so the change is intuitive).
// Filter is respected: ▲▼ moves the team relative to the *visible* list.
function moveSavedTeam(teamId, direction) {
    let savedTeams = getSavedTeams();
    if (savedTeams.length < 2) return;

    // First reorder: snapshot current sorted order as the new storage baseline
    if (savedTeamsSortMode !== 'manual') {
        const sortFn = SAVED_TEAMS_SORTS[savedTeamsSortMode] || SAVED_TEAMS_SORTS.date_desc;
        savedTeams.sort(sortFn);
        savedTeamsSortMode = 'manual';
        localStorage.setItem('savedTeamsSortMode', 'manual');
    }

    // Compute visible IDs (filter respects the current text filter)
    const visibleIds = savedTeams.filter(passesSavedTeamsFilter).map(t => t.id);
    const visIdx = visibleIds.indexOf(teamId);
    if (visIdx === -1) return;
    const targetVisIdx = direction === 'up' ? visIdx - 1 : visIdx + 1;
    if (targetVisIdx < 0 || targetVisIdx >= visibleIds.length) return;

    // Swap the two corresponding storage entries
    const storeIdxA = savedTeams.findIndex(t => t.id === teamId);
    const storeIdxB = savedTeams.findIndex(t => t.id === visibleIds[targetVisIdx]);
    [savedTeams[storeIdxA], savedTeams[storeIdxB]] = [savedTeams[storeIdxB], savedTeams[storeIdxA]];

    setSavedTeams(savedTeams);
    loadSavedTeams();
}

// Render the editing banner at the top of the Builder when a team is being edited
function renderEditingBanner() {
    const banner = document.getElementById('team-editing-banner');
    if (!banner) return;
    if (!currentEditingLocalTeamId) {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }
    const savedTeams = getSavedTeams();
    const team = savedTeams.find(t => t.id === currentEditingLocalTeamId);
    if (!team) {
        currentEditingLocalTeamId = null;
        banner.style.display = 'none';
        return;
    }
    banner.style.display = 'flex';
    banner.innerHTML = `
        <span style="color:var(--accent-gold);font-weight:600">✏️ ${t('editingTeam') || 'Editing'}: <span style="color:var(--text-main)">${escapeHtml(team.name)}</span></span>
        <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">
            <button class="btn btn-small" onclick="updateEditedTeam()" style="background:linear-gradient(135deg,rgba(0,255,136,0.25),rgba(0,200,83,0.25));border-color:var(--accent-green)">💾 ${t('saveChanges') || 'Save changes'}</button>
            <button class="btn btn-small" onclick="cancelEditing()" style="background:var(--bg-input)">✖ ${t('cancelEdit') || 'Cancel'}</button>
        </div>
    `;
}

// Cancel the active editing session (the builder content is left as-is)
function cancelEditing() {
    currentEditingLocalTeamId = null;
    renderEditingBanner();
}

// Save changes back to the team currently being edited (in-place update)
function updateEditedTeam() {
    if (!currentEditingLocalTeamId) {
        alert(t('noTeamBeingEdited') || 'No team being edited');
        return;
    }
    const hasPokemon = dreamTeam.some(slot => slot.pokemon);
    if (!hasPokemon) {
        alert(t('emptyTeamError') || 'Empty team! Add Pokémon before saving.');
        return;
    }
    const savedTeams = getSavedTeams();
    const idx = savedTeams.findIndex(team => team.id === currentEditingLocalTeamId);
    if (idx === -1) {
        alert(t('teamNotFound') || 'Team not found');
        currentEditingLocalTeamId = null;
        renderEditingBanner();
        return;
    }
    // Update slots, keep name/author/description/created/id intact
    savedTeams[idx].slots = dreamTeam.map(slot => ({
        pokemon: slot.pokemon,
        moves: [...slot.moves],
        ability: slot.ability,
        item: slot.item,
        shiny: slot.shiny,
        starSign: slot.starSign || null,
        nature: slot.nature || null,
        ivs: slot.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
    }));
    savedTeams[idx].updated = new Date().toISOString();
    setSavedTeams(savedTeams);
    renderEditingBanner();
    alert(t('teamUpdatedSuccess') || 'Team updated!');
}

// Quick edit: update name/author/description without touching slots
function editTeamMetadata(teamId) {
    const savedTeams = getSavedTeams();
    const team = savedTeams.find(team => team.id === teamId);
    if (!team) return;
    const newName = prompt(t('teamNamePrompt') || 'Team name:', team.name);
    if (newName === null) return;
    const newAuthor = prompt(t('teamAuthorPrompt') || 'Author:', team.author);
    if (newAuthor === null) return;
    const newDesc = prompt(t('teamDescPrompt') || 'Description (optional):', team.description || '');
    if (newDesc === null) return;
    team.name = newName.trim() || team.name;
    team.author = newAuthor.trim() || team.author;
    team.description = newDesc.trim();
    team.updated = new Date().toISOString();
    setSavedTeams(savedTeams);
    loadSavedTeams();
    if (currentEditingLocalTeamId === teamId) renderEditingBanner();
}

function switchTeamSubtab(subtab) {
    currentTeamSubtab = subtab;

    // Update buttons
    document.querySelectorAll('.team-subtab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`team-subtab-${subtab}`).classList.add('active');

    // Hide all content
    document.getElementById('team-builder-content').style.display = 'none';
    document.getElementById('team-saved-content').style.display = 'none';

    // Show selected content
    document.getElementById(`team-${subtab}-content`).style.display = 'block';

    // Update URL hash for shareability
    updateTeamURL();

    // Load data if needed
    if (subtab === 'saved') loadSavedTeams();

}

function saveCurrentTeam() {
    // Check if team has Pokemon
    const hasPokemon = dreamTeam.some(slot => slot.pokemon);
    if (!hasPokemon) {
        alert(t('emptyTeamError') || 'Empty team! Add Pokémon before saving.');
        return;
    }
    
    // Prompt for team info
    const name = prompt(t('teamNamePrompt') || 'Team name:', t('defaultTeamName') || 'My Team');
    if (!name) return;

    const author = prompt(t('teamAuthorPrompt') || 'Author:', t('defaultTeamAuthor') || 'Me');
    if (!author) return;

    const description = prompt(t('teamDescPrompt') || 'Description (optional):', '');
    
    // Create team object
    const teamData = {
        id: 'team_' + Date.now(),
        name: name,
        author: author,
        description: description || '',
        created: new Date().toISOString(),
        slots: dreamTeam.map(slot => ({
            pokemon: slot.pokemon,
            moves: [...slot.moves],
            ability: slot.ability,
            item: slot.item,
            shiny: slot.shiny,
            starSign: slot.starSign || null,
            nature: slot.nature || null,
            ivs: slot.ivs || { hp: 3, atk: 3, def: 3, satk: 3, sdef: 3, spe: 3 }
        }))
    };
    
    // Save to localStorage (teamsDB key - separate from cache)
    const savedTeams = getSavedTeams();
    savedTeams.push(teamData);
    setSavedTeams(savedTeams);

    // "Save" creates a NEW team → if we were editing, that edit session ends
    if (currentEditingLocalTeamId) {
        currentEditingLocalTeamId = null;
        renderEditingBanner();
    }
    alert(t('teamSavedSuccess') || 'Team saved successfully!');
}

function loadSavedTeams() {
    const container = document.getElementById('saved-teams-list');
    const sortBar = document.getElementById('saved-teams-sortbar');
    const savedTeams = getSavedTeams();

    // Preserve focus & caret of the search box across re-renders
    const focused = document.activeElement;
    const focusedId = focused?.id;
    const caretPos = (focused?.tagName === 'INPUT') ? focused.selectionStart : null;

    // ----- Sort + filter bar -----
    if (sortBar) {
        if (savedTeams.length === 0) {
            sortBar.style.display = 'none';
        } else {
            sortBar.style.display = 'flex';
            const opt = (val, label) => `<option value="${val}"${savedTeamsSortMode === val ? ' selected' : ''}>${label}</option>`;
            sortBar.innerHTML = `
                <label style="font-size:0.8rem;color:var(--text-dim)">${t('sortBy') || 'Sort by'}:</label>
                <select onchange="setSavedTeamsSort(this.value)" class="dmg-select" style="min-width:180px">
                    ${opt('manual',    `✋ ${t('sortManual') || 'Manual'}`)}
                    ${opt('date_desc', `📅 ${t('sortDateNewest') || 'Date (newest)'}`)}
                    ${opt('date_asc',  `📅 ${t('sortDateOldest') || 'Date (oldest)'}`)}
                    ${opt('name_asc',  `🔤 ${t('sortNameAZ') || 'Name (A→Z)'}`)}
                    ${opt('name_desc', `🔤 ${t('sortNameZA') || 'Name (Z→A)'}`)}
                    ${opt('author_asc',`👤 ${t('sortAuthor') || 'Author (A→Z)'}`)}
                    ${opt('pkmn_desc', `⭐ ${t('sortMostPkmn') || 'Most Pokémon'}`)}
                </select>
                <input type="text" id="saved-teams-search" oninput="setSavedTeamsFilter(this.value)" value="${escapeAttr(savedTeamsFilter)}" placeholder="🔍 ${t('searchTeam') || 'Search by name / author / description'}" class="dmg-input" style="flex:1;min-width:140px">
                <span style="font-size:0.8rem;color:var(--text-dim);white-space:nowrap">${savedTeams.length} ${t('teams') || 'teams'}</span>
            `;
        }
    }

    if (savedTeams.length === 0) {
        container.innerHTML = `
            <div style="padding:30px;text-align:center;color:var(--text-dim);background:var(--bg-card);border-radius:12px;border:2px dashed var(--border);grid-column:1/-1">
                <div style="font-size:2rem;margin-bottom:10px">📭</div>
                <div data-i18n="noSavedTeams">No saved teams</div>
                <div style="font-size:0.85rem;margin-top:10px;opacity:0.7" data-i18n="createTeamHint">Create a team in the Builder and click "Save"</div>
            </div>`;
        return;
    }

    // Sort + filter
    const sortFn = SAVED_TEAMS_SORTS[savedTeamsSortMode] || SAVED_TEAMS_SORTS.date_desc;
    const visible = [...savedTeams].sort(sortFn).filter(passesSavedTeamsFilter);

    if (visible.length === 0) {
        container.innerHTML = `
            <div style="padding:30px;text-align:center;color:var(--text-dim);background:var(--bg-card);border-radius:12px;border:2px dashed var(--border);grid-column:1/-1">
                <div style="font-size:2rem;margin-bottom:10px">🔍</div>
                <div>${t('noMatchingTeams') || 'No team matches your search'}</div>
            </div>`;
    } else {
        container.innerHTML = visible.map((team, i) => {
            const isEditing = currentEditingLocalTeamId === team.id;
            const editingHighlight = isEditing
                ? 'border-color:var(--accent-gold);box-shadow:0 0 12px rgba(255,215,0,0.3)'
                : '';
            const editingBadge = isEditing
                ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;font-size:0.7rem;background:rgba(255,215,0,0.2);color:var(--accent-gold)">✏️ ${t('editing') || 'editing'}</span>`
                : '';
            const updatedAt = team.updated ? ` · ${t('updated') || 'updated'} ${new Date(team.updated).toLocaleDateString()}` : '';
            const upDisabled = i === 0 ? 'opacity:0.3;pointer-events:none' : '';
            const downDisabled = i === visible.length - 1 ? 'opacity:0.3;pointer-events:none' : '';
            return `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:15px;position:relative;${editingHighlight}">
                <div style="position:absolute;top:10px;right:10px;display:flex;gap:4px;align-items:center">
                    <button onclick="moveSavedTeam('${team.id}','up')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;padding:2px 4px;${upDisabled}" title="${t('moveUp') || 'Move up'}">▲</button>
                    <button onclick="moveSavedTeam('${team.id}','down')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;padding:2px 4px;${downDisabled}" title="${t('moveDown') || 'Move down'}">▼</button>
                    <button onclick="editTeamMetadata('${team.id}')" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:1.1rem;padding:2px 4px" title="${t('editMetadata') || 'Edit name/author/description'}">✏️</button>
                    <button onclick="deleteSavedTeam('${team.id}')" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:1.2rem;padding:2px 4px" title="${t('delete') || 'Delete'}">🗑️</button>
                </div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--accent-blue);margin-bottom:5px;padding-right:130px">${escapeHtml(team.name)}${editingBadge}</div>
                <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:5px">👤 ${escapeHtml(team.author)} • ${new Date(team.created).toLocaleDateString()}${updatedAt}</div>
                ${team.description ? `<div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;font-style:italic">${escapeHtml(team.description)}</div>` : ''}
                <div style="display:flex;gap:5px;margin:10px 0;flex-wrap:wrap">
                    ${team.slots.map(slot => slot.pokemon ? `
                        <img src="${slot.shiny ? spriteShiny(slot.pokemon) : sprite(slot.pokemon)}" style="width:40px;height:40px;image-rendering:pixelated;${slot.starSign ? getStellarStyle(slot.starSign) : ''}" title="${pokemons[slot.pokemon]?.displayName || slot.pokemon}">
                    ` : '').join('')}
                </div>
                <div style="display:flex;gap:8px;margin-top:10px">
                    <button class="btn btn-small" onclick="loadTeamIntoBuilder('${team.id}')" style="flex:1;background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,200,83,0.2));border-color:var(--success)">📝 ${t('load') || 'Load'}</button>
                    <button class="btn btn-small" onclick="shareTeamCompact('${team.id}')" style="background:var(--bg-input)">🔗</button>
                    <button class="btn btn-small" onclick="exportTeamToJSON('${team.id}')" style="background:var(--bg-input)" title="Export JSON">📤</button>
                </div>
            </div>
        `;
        }).join('');
    }

    // Restore focus on the search box (lost during innerHTML rebuild)
    if (focusedId) {
        const el = document.getElementById(focusedId);
        if (el) {
            el.focus();
            if (caretPos != null && el.setSelectionRange) {
                try { el.setSelectionRange(caretPos, caretPos); } catch (e) {}
            }
        }
    }
}

function deleteSavedTeam(teamId) {
    if (!confirm(t('confirmDeleteTeam') || 'Delete this team?')) return;
    
    const savedTeams = getSavedTeams();
    const filtered = savedTeams.filter(t => t.id !== teamId);
    setSavedTeams(filtered);
    loadSavedTeams();
}

function loadTeamIntoBuilder(teamId) {
    const savedTeams = getSavedTeams();
    const team = savedTeams.find(t => t.id === teamId);
    
    if (!team) return;
    
    // Load into dreamTeam
    dreamTeam = team.slots.map(slot => ({
        pokemon: slot.pokemon,
        moves: [...slot.moves],
        ability: slot.ability,
        item: slot.item,
        shiny: slot.shiny,
        starSign: slot.starSign || null,
        nature: slot.nature || null,
        ivs: slot.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
    }));
    
    // Fill empty slots
    while (dreamTeam.length < 6) {
        dreamTeam.push({ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } });
    }
    
    renderDreamTeam();
    // Enter edit mode for this team — banner in builder lets the user "Save changes" or cancel
    currentEditingLocalTeamId = teamId;
    renderEditingBanner();
    switchTeamSubtab('builder');
    alert(t('teamLoaded') || 'Team loaded into Builder!');
}

function exportAllTeams() {
    const savedTeams = getSavedTeams();
    if (savedTeams.length === 0) {
        alert(t('noTeamsToExport') || 'No teams to export');
        return;
    }
    
    const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        teams: savedTeams
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokechill-teams-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importTeamsFromFile() {
    document.getElementById('teams-import-file').click();
}

function onTeamsFileImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.teams || !Array.isArray(data.teams)) {
                alert(t('invalidTeamFile') || 'Invalid file');
                return;
            }
            
            const savedTeams = getSavedTeams();
            let imported = 0;
            
            data.teams.forEach(team => {
                // Generate new ID to avoid conflicts
                team.id = 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                team.imported = true;
                team.importDate = new Date().toISOString();
                savedTeams.push(team);
                imported++;
            });
            
            setSavedTeams(savedTeams);
            loadSavedTeams();
            alert(`${t('teamsImported') || 'Teams imported'}: ${imported}`);
            
        } catch (err) {
            alert(t('importFailed') || 'Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function exportTeamToJSON(teamId) {
    const savedTeams = getSavedTeams();
    const team = savedTeams.find(t => t.id === teamId);
    
    if (!team) return;
    
    const exportData = {
        version: 1,
        teams: [team]
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-${team.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ NEW JSON-BASED TEAM SHARING ============
// Future-proof system: teams are shared as JSON encoded in base64 URL-safe
// No dependency on lookup tables - works even if game data changes

const SHARE_VERSION = 'J'; // J = JSON-based sharing

function encodeTeamCompact(teamData) {
    // teamData = { name, author, description, slots: [{pokemon, shiny, ability, item, moves}] }
    // Returns: compact string like "J{base64}"
    
    // Minify: only keep essential data
    const minified = {
        n: teamData.name,
        a: teamData.author,
        d: teamData.description,
        s: teamData.slots.map(slot => ({
            p: slot.pokemon,
            s: slot.shiny || false,
            x: slot.starSign || null, // x = star sign (v4.7)
            t: slot.nature || null, // t = nature (v4.8)
            b: slot.ability,
            i: slot.item,
            m: slot.moves || [null, null, null, null],
            v: slot.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        }))
    };
    
    // Compress to JSON string
    const jsonStr = JSON.stringify(minified);
    
    // Encode to base64 URL-safe (no +, /, =)
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    
    return SHARE_VERSION + base64;
}

function decodeTeamCompact(encoded) {
    // Returns: { name, author, description, slots } or null if invalid
    
    if (!encoded || encoded.length < 2) return null;
    
    // Check version
    const version = encoded[0];
    if (version !== SHARE_VERSION) {
        // Try legacy decode if needed
        return null;
    }
    
    const base64 = encoded.slice(1)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    try {
        const jsonStr = decodeURIComponent(escape(atob(base64)));
        const minified = JSON.parse(jsonStr);
        
        // Expand minified format
        return {
            name: minified.n || 'Unnamed Team',
            author: minified.a || 'Unknown',
            description: minified.d || '',
            slots: (minified.s || []).map(slot => ({
                pokemon: slot.p,
                shiny: slot.s || false,
                starSign: slot.x || null, // x = star sign (v4.7)
                nature: slot.t || null, // t = nature (v4.8)
                ability: slot.b || null,
                item: slot.i || null,
                moves: slot.m || [null, null, null, null],
                ivs: slot.v || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
            }))
        };
    } catch (e) {
        console.error('Failed to decode team:', e);
        return null;
    }
}

function shareTeamCompact(teamId) {
    // Share a saved team from localStorage
    const savedTeams = getSavedTeams();
    const team = savedTeams.find(t => t.id === teamId);
    
    if (!team) {
        alert(t('teamNotFound'));
        return;
    }
    
    const encoded = encodeTeamCompact(team);
    const url = `${window.location.origin}${window.location.pathname}#tab=team&team=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert(t('linkCopied') || 'Link copied to clipboard!');
    });
}

function shareCurrentTeamCompact() {
    // Share the current dreamTeam from builder
    if (!dreamTeam.some(s => s.pokemon)) {
        alert(t('noTeamToShare') || 'No team to share');
        return;
    }
    
    // Prompt for team metadata
    const name = prompt(t('teamNamePrompt') || 'Team name:', 'My Team');
    if (name === null) return; // Cancelled
    
    const author = prompt(t('teamAuthorPrompt') || 'Author:', 'Me');
    if (author === null) return; // Cancelled
    
    const description = prompt(t('teamDescPrompt') || 'Description (optional):', '');
    if (description === null) return; // Cancelled
    
    const teamData = {
        name: name || 'My Team',
        author: author || 'Me',
        description: description || '',
        slots: dreamTeam.map(slot => ({
            pokemon: slot.pokemon,
            shiny: slot.shiny,
            starSign: slot.starSign || null,
            nature: slot.nature || null, // nature (v4.8)
            ability: slot.ability,
            item: slot.item,
            moves: slot.moves,
            ivs: slot.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        }))
    };
    
    const encoded = encodeTeamCompact(teamData);
    const url = `${window.location.origin}${window.location.pathname}#tab=team&team=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert(t('linkCopied') || 'Link copied to clipboard!');
    });
}

function shareCurrentBuildCompact() {
    // Share the current build from build slot
    const build = buildSlot[0];
    if (!build || !build.pokemon) {
        alert(t('noBuildToShare') || 'No build to share');
        return;
    }
    
    // Prompt for build metadata
    const p = pokemons[build.pokemon];
    const defaultName = p ? `${p.displayName || format(build.pokemon)} Build` : 'My Build';
    
    const name = prompt(t('buildNamePrompt') || 'Build name:', defaultName);
    if (name === null) return; // Cancelled
    
    const author = prompt(t('teamAuthorPrompt') || 'Author:', 'Me');
    if (author === null) return; // Cancelled
    
    const description = prompt(t('teamDescPrompt') || 'Description (optional):', '');
    if (description === null) return; // Cancelled
    
    // Build data uses same format as team but with single slot
    const buildData = {
        name: name || defaultName,
        author: author || 'Me',
        description: description || '',
        slots: [{
            pokemon: build.pokemon,
            shiny: build.shiny,
            starSign: build.starSign || null,
            nature: build.nature || null, // nature (v4.8)
            ability: build.ability,
            item: build.item,
            moves: build.moves,
            ivs: build.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        }]
    };
    
    const encoded = encodeTeamCompact(buildData);
    const url = `${window.location.origin}${window.location.pathname}#tab=build&team=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert(t('linkCopied') || 'Link copied to clipboard!');
    });
}

function shareCurrentTeamDiscord() {
    // Share the current dreamTeam to Discord (markdown format)
    if (!dreamTeam.some(s => s.pokemon)) {
        alert(t('noTeamToShare') || 'No team to share');
        return;
    }
    
    // Prompt for team metadata
    const name = prompt(t('teamNamePrompt') || 'Team name:', 'My Team');
    if (name === null) return;
    
    const author = prompt(t('teamAuthorPrompt') || 'Author:', 'Me');
    if (author === null) return;
    
    // Prompt for custom Discord text format
    const defaultText = `${name} by ${author}`;
    const customText = prompt(t('discordTextPrompt') || 'Discord link text:', defaultText);
    if (customText === null) return;
    
    const teamData = {
        name: name || 'My Team',
        author: author || 'Me',
        description: '',
        slots: dreamTeam.map(slot => ({
            pokemon: slot.pokemon,
            shiny: slot.shiny,
            starSign: slot.starSign || null,
            nature: slot.nature || null, // nature (v4.8)
            ability: slot.ability,
            item: slot.item,
            moves: slot.moves,
            ivs: slot.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        }))
    };
    
    const encoded = encodeTeamCompact(teamData);
    const url = `${window.location.origin}${window.location.pathname}#tab=team&team=${encoded}`;
    
    // Format as Discord markdown: [text](url)
    const discordText = `[${customText || defaultText}](${url})`;
    
    navigator.clipboard.writeText(discordText).then(() => {
        alert(t('discordLinkCopied') || 'Discord link copied! Paste in Discord.');
    });
}

function shareCurrentBuildDiscord() {
    // Share the current build to Discord (markdown format)
    const build = buildSlot[0];
    if (!build || !build.pokemon) {
        alert(t('noBuildToShare') || 'No build to share');
        return;
    }
    
    const p = pokemons[build.pokemon];
    const defaultName = p ? `${p.displayName || format(build.pokemon)} Build` : 'My Build';
    
    const name = prompt(t('buildNamePrompt') || 'Build name:', defaultName);
    if (name === null) return;
    
    const author = prompt(t('teamAuthorPrompt') || 'Author:', 'Me');
    if (author === null) return;
    
    // Prompt for custom Discord text format
    const defaultText = `${name} by ${author}`;
    const customText = prompt(t('discordTextPrompt') || 'Discord link text:', defaultText);
    if (customText === null) return;
    
    const buildData = {
        name: name || defaultName,
        author: author || 'Me',
        description: '',
        slots: [{
            pokemon: build.pokemon,
            shiny: build.shiny,
            starSign: build.starSign || null,
            nature: build.nature || null, // nature (v4.8)
            ability: build.ability,
            item: build.item,
            moves: build.moves,
            ivs: build.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        }]
    };
    
    const encoded = encodeTeamCompact(buildData);
    const url = `${window.location.origin}${window.location.pathname}#tab=build&team=${encoded}`;
    
    // Format as Discord markdown: [text](url)
    const discordText = `[${customText || defaultText}](${url})`;
    
    navigator.clipboard.writeText(discordText).then(() => {
        alert(t('discordLinkCopied') || 'Discord link copied! Paste in Discord.');
    });
}

function importTeamCompact(encoded) {
    // Import a team from compact format into builder
    const teamData = decodeTeamCompact(encoded);
    
    if (!teamData) {
        alert(t('invalidTeamCode') || 'Invalid team code');
        return false;
    }
    
    // Load into dreamTeam
    dreamTeam = teamData.slots.map(slot => ({
        pokemon: slot.pokemon || null,
        shiny: slot.shiny || false,
        starSign: slot.starSign || null,
        nature: slot.nature || null, // nature (v4.8)
        ability: slot.ability || null,
        item: slot.item || null,
        moves: slot.moves || [null, null, null, null],
        ivs: slot.ivs || { hp: 3, atk: 3, def: 3, satk: 3, sdef: 3, spe: 3 }
    }));
    
    // Fill empty slots
    while (dreamTeam.length < 6) {
        dreamTeam.push({ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } });
    }
    
    renderDreamTeam();
    showSharedTeamInfo(teamData.name, teamData.author, teamData.description);
    switchTeamSubtab('builder');
    return true;
}

// ============ TEAM CODE MIGRATION (LEGACY - kept for backward compatibility) ============

function migrateLegacyTeamCode(legacyCode) {
    // Convert legacy team code (version A, no prefix) to new format (version B with prefix)
    // Returns { success: boolean, newCode: string|null, error: string|null }
    try {
        // Check if already migrated (has version prefix)
        if (legacyCode.length > 0 && !B64_CHARS.includes(legacyCode[0]) && legacyCode[0] >= 'A' && legacyCode[0] <= 'Z') {
            return { success: true, newCode: legacyCode, error: null }; // Already has prefix
        }
        
        const legacyTables = buildLegacyTables();
        const stableTables = buildStableTables();
        
        // Decode legacy format (no prefix)
        const legacyData = [];
        for (let i = 0; i + 13 < legacyCode.length && legacyData.length < 6; i += 14) {
            const pkmnShiny = decode2(legacyCode, i);
            const pkmnIdx = Math.floor(pkmnShiny / 2);
            const shiny = pkmnShiny % 2;
            legacyData.push([
                pkmnIdx, shiny,
                decode2(legacyCode, i + 2),
                decode2(legacyCode, i + 4),
                decode2(legacyCode, i + 6),
                decode2(legacyCode, i + 8),
                decode2(legacyCode, i + 10),
                decode2(legacyCode, i + 12)
            ]);
        }
        
        // Convert to stable indices
        const stableData = legacyData.map(slot => {
            if (!slot || slot[0] === 0) return [0, 0, 0, 0, 0, 0, 0, 0];
            
            const pkmnName = legacyTables._reverse.pokemon[slot[0]];
            if (!pkmnName || !stableTables.pokemon.hasOwnProperty(pkmnName)) {
                throw new Error(`Pokemon index ${slot[0]} -> "${pkmnName}" not found in stable tables`);
            }
            
            const abilityName = legacyTables._reverse.ability[slot[2]];
            const itemName = legacyTables._reverse.item[slot[3]];
            const moveNames = [
                legacyTables._reverse.move[slot[4]],
                legacyTables._reverse.move[slot[5]],
                legacyTables._reverse.move[slot[6]],
                legacyTables._reverse.move[slot[7]]
            ];
            
            return [
                stableTables.pokemon[pkmnName] || 0,
                slot[1],
                abilityName ? (stableTables.ability[abilityName] || 0) : 0,
                itemName ? (stableTables.item[itemName] || 0) : 0,
                moveNames[0] ? (stableTables.move[moveNames[0]] || 0) : 0,
                moveNames[1] ? (stableTables.move[moveNames[1]] || 0) : 0,
                moveNames[2] ? (stableTables.move[moveNames[2]] || 0) : 0,
                moveNames[3] ? (stableTables.move[moveNames[3]] || 0) : 0
            ];
        });
        
        const newCode = packTeam(stableData);
        return { success: true, newCode, error: null };
    } catch (err) {
        console.error('Migration failed for code:', legacyCode, err);
        return { success: false, newCode: null, error: err.message };
    }
}

// Console helper to migrate featured-teams.txt content
// Usage: copy-paste the content of featured-teams.txt, then run:
// migrateFeaturedTeamsContent(`paste content here`)
window.migrateFeaturedTeamsContent = function(content) {
    const lines = content.trim().split('\n');
    const results = [];
    const errors = [];
    
    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            results.push(line); // Keep comments and empty lines
            return;
        }
        
        // Extract team code from URL
        const match = trimmed.match(/team=([^;&]+)/);
        if (!match) {
            results.push(line); // Keep lines without team code
            return;
        }
        
        const oldCode = match[1];
        const migration = migrateLegacyTeamCode(oldCode);
        
        if (migration.success && migration.newCode !== oldCode) {
            const newLine = line.replace(oldCode, migration.newCode);
            results.push(newLine);
             // console.log(`✓ Line ${idx + 1}: Migrated successfully`);
        } else if (migration.success) {
            results.push(line); // Already migrated
             // console.log(`○ Line ${idx + 1}: Already has version prefix`);
        } else {
            results.push(line); // Keep original on error
            errors.push(`Line ${idx + 1}: ${migration.error}`);
             // console.error(`✗ Line ${idx + 1}: ${migration.error}`);
        }
    });
    
     // console.log('\n=== MIGRATION RESULTS ===');
     // console.log(`Total: ${lines.length}, Errors: ${errors.length}`);
    if (errors.length > 0) {
         // console.log('\nErrors:', errors);
    }
     // console.log('\n=== NEW CONTENT (copy this): ===\n');
     // console.log(results.join('\n'));
    
    return { results, errors, output: results.join('\n') };
};

// ============ FEATURED TEAMS ============
let featuredTeamsData = [];

function decodeTeamVisual(code) {
    // Decode team code and return visual info (pokemon names, shinies)
    try {
        // Check if this is a legacy code that needs migration
        const isLegacy = code.length > 0 && B64_CHARS.includes(code[0]);
        let actualCode = code;
        
        if (isLegacy) {
            // Try to migrate legacy code to new format
            const migration = migrateLegacyTeamCode(code);
            if (migration.success && migration.newCode !== code) {
                actualCode = migration.newCode;
            }
        }
        
        const teamData = unpackTeam(actualCode);
        if (!teamData || teamData.length === 0) return null;
        
        // Determine version from team code to use correct tables
        const version = (actualCode.length > 0 && !B64_CHARS.includes(actualCode[0]) && actualCode[0] >= 'A' && actualCode[0] <= 'Z') 
            ? actualCode[0] 
            : 'A';
        const tables = (version === TEAM_CODE_VERSION) ? buildStableTables() : buildLegacyTables();
        
        return teamData.map(slot => {
            if (!slot || slot[0] === 0) return null;
            
            const pkmnIdx = slot[0];
            const pkmnName = tables._reverse.pokemon[pkmnIdx];
            
            if (!pkmnName || !pokemons[pkmnName]) return null;
            
            return {
                name: pkmnName,
                displayName: pokemons[pkmnName].displayName || format(pkmnName),
                shiny: slot[1] === 1
            };
        });
    } catch (e) {
        console.error('Failed to decode team visual:', e);
        return null;
    }
}

// ============ TEAM SUBMISSION & RATINGS ============

// Clean up old stored password (security fix)
localStorage.removeItem('lastTeamPassword');

// Show modal to submit a team
function showSubmitTeamModal() {
    // Check if there's a team to submit
    const hasPokemon = dreamTeam.some(slot => slot.pokemon !== null);
    if (!hasPokemon) {
        alert(t('submitTeamErrorEmpty'));
        return;
    }
    
    // Get stored author for auto-fill (NEVER auto-fill password for security)
    const storedAuthor = localStorage.getItem('lastTeamAuthor') || '';
    
    const html = `
        <div style="max-width:500px">
            <h3 style="margin:0 0 15px 0;color:var(--accent-gold)">${t('submitTeamTitle')}</h3>
            <p style="color:var(--text-dim);margin-bottom:15px;font-size:0.9rem">${t('submitTeamDesc')}</p>
            
            <div style="margin-bottom:15px">
                <label style="display:block;margin-bottom:5px;color:var(--text-dim)">${t('teamNameLabel')}</label>
                <input type="text" id="submit-team-name" style="width:100%;padding:10px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;color:var(--text)" placeholder="${t('teamNamePlaceholder')}">
            </div>
            
            <div style="margin-bottom:15px">
                <label style="display:block;margin-bottom:5px;color:var(--text-dim)">${t('authorLabel')}</label>
                <input type="text" id="submit-team-author" style="width:100%;padding:10px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;color:var(--text)" placeholder="${t('authorPlaceholder')}" value="${storedAuthor}" oninput="checkReservedNickname(this.value)" onfocus="checkReservedNickname(this.value)">
                <div id="nickname-status" style="font-size:0.8rem;margin-top:5px"></div>
            </div>
            
            <div id="password-section" style="margin-bottom:15px;display:block;border:1px solid var(--border);padding:10px;border-radius:8px">
                <label style="display:block;margin-bottom:5px;color:var(--text-dim)">${t('passwordLabel')}</label>
                <input type="password" id="submit-team-password" style="width:100%;padding:10px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;color:var(--text)" placeholder="${t('passwordPlaceholder')}">
            </div>
            
            <div style="margin-bottom:20px">
                <label style="display:block;margin-bottom:5px;color:var(--text-dim)">${t('descriptionLabel')}</label>
                <textarea id="submit-team-desc" style="width:100%;padding:10px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;color:var(--text);min-height:80px;resize:vertical" placeholder="${t('descriptionPlaceholder')}"></textarea>
            </div>
            
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button class="btn" onclick="closeModal()" style="background:var(--bg-input)">❌ ${t('cancel')}</button>
                <button id="submit-team-btn" class="btn" onclick="submitTeam()" style="background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,200,83,0.2));border-color:var(--success)">✅ ${t('submit')}</button>
            </div>
        </div>
    `;
    
    openModal(t('submitTeamTitle'), html);
    
    // Setup author input listener and check current nickname
    setTimeout(() => {
        const authorInput = document.getElementById('submit-team-author');
        const passwordInput = document.getElementById('submit-team-password');
        const passwordSection = document.getElementById('password-section');
        
        // Vérifier immédiatement si le pseudo pré-rempli est réservé
        if (authorInput && authorInput.value) {
             // console.log('[SubmitModal] Checking reserved nickname:', authorInput.value);
            checkReservedNickname(authorInput.value);
        }
        
        // Listener sur le changement de pseudo
        if (authorInput) {
            let debounceTimer;
            authorInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    checkReservedNickname(this.value.trim());
                }, 300);
            });
        }
    }, 100);
}

// Check if nickname is reserved
window.checkReservedNickname = async function(author) {
    if (!author || author.length < 2) return;
    
    const storedAuthor = localStorage.getItem('lastTeamAuthor') || '';
    const isOwnNickname = (author.toLowerCase() === storedAuthor.toLowerCase());
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/check_nickname.php?author=' + encodeURIComponent(author));
        const result = await response.json();
        
        const statusEl = document.getElementById('nickname-status');
        const passwordSection = document.getElementById('password-section');
        const passwordInput = document.getElementById('submit-team-password');
        
        if (!statusEl) return;
        
        if (result.reserved) {
            if (isOwnNickname) {
                // C'est mon pseudo - je peux utiliser avec MDP
                if (passwordSection) {
                    passwordSection.style.display = 'block';
                    passwordSection.style.border = '2px solid var(--accent-gold)';
                    passwordSection.style.padding = '10px';
                    passwordSection.style.borderRadius = '8px';
                }
                if (passwordInput) {
                    passwordInput.dataset.required = 'true';
                    passwordInput.dataset.reserved = 'true';
                    passwordInput.placeholder = t('passwordPlaceholderRequired');
                }
                statusEl.innerHTML = '<div style="background:var(--accent-gold);color:white;padding:8px 12px;border-radius:6px;margin-bottom:10px"><strong>' + t('nicknameProtected') + '</strong><br>' + t('nicknameProtectedDesc') + '<br><small>' + t('nicknameProtectedChange') + '</small></div>';
                
            } else {
                // Pseudo d'un autre - mais je peux me connecter si c'est moi
                if (passwordSection) {
                    passwordSection.style.display = 'block';
                    passwordSection.style.border = '2px solid var(--error)';
                    passwordSection.style.padding = '10px';
                    passwordSection.style.borderRadius = '8px';
                }
                if (passwordInput) {
                    passwordInput.dataset.reserved = 'true'; // Permet de se connecter
                    passwordInput.placeholder = t('passwordPlaceholderFor').replace('{author}', escapeHtml(author));
                }
                statusEl.innerHTML = '<div style="background:var(--error);color:white;padding:8px 12px;border-radius:6px;margin-bottom:10px"><strong>' + t('nicknameUnavailable') + '</strong><br>' + t('nicknameUnavailableDesc').replace('{author}', escapeHtml(author)).replace('{owner}', escapeHtml(result.author)) + '<br><small>' + t('nicknameUnavailableLogin') + '</small></div>';
                
            }
        } else {
            // Pseudo libre - champ MDP visible mais optionnel
            if (passwordSection) {
                passwordSection.style.display = 'block';
                passwordSection.style.border = '1px solid var(--border)';
                passwordSection.style.padding = '8px';
                passwordSection.style.borderRadius = '8px';
            }
            if (passwordInput) {
                passwordInput.dataset.required = 'false';
                passwordInput.dataset.reserved = 'false';
                passwordInput.placeholder = t('passwordPlaceholder');
                passwordInput.value = '';
            }
            statusEl.innerHTML = '<span style="color:var(--success);font-size:0.8rem">' + t('nicknameAvailable') + '</span>';
            
        }
    } catch (e) {
        // Silent fail
    }
}

// Submit team to backend
window.submitTeam = async function() {
    const name = document.getElementById('submit-team-name').value.trim();
    const author = document.getElementById('submit-team-author').value.trim();
    const description = document.getElementById('submit-team-desc').value.trim();
    const passwordInput = document.getElementById('submit-team-password');
    
    // Validate ALL fields
    if (!name) {
        alert(t('submitTeamErrorName'));
        return;
    }
    if (!author) {
        alert(t('submitTeamErrorAuthor'));
        return;
    }
    if (!description) {
        alert(t('submitTeamErrorDescription'));
        return;
    }
    
    const password = passwordInput?.value?.trim() ?? '';
    const isReservedForced = passwordInput?.dataset.reserved === 'true';
    
    // Un mot de passe non vide = tentative de réservation OU connexion
    const reserveNickname = password.length >= 6 && !isReservedForced;
    
    // BLOCAGE si pseudo réservé par QUELQU'UN D'AUTRE
    const storedAuthor = localStorage.getItem('lastTeamAuthor') || '';
    const isOwnNickname = (author.toLowerCase() === storedAuthor.toLowerCase());
    
    if (isReservedForced && !isOwnNickname) {
        // C'est le pseudo de quelqu'un d'autre mais peut-être que c'est moi qui tente de me connecter
        // Laisser passer - le backend vérifiera le mot de passe
        if (password.length < 1) {
            alert(t('nicknameProtectedPrompt').replace('{author}', author));
            passwordInput?.focus();
            return;
        }
    }
    
    // BLOCAGE si mon pseudo mais pas de MDP
    if (isReservedForced && isOwnNickname && password.length < 1) {
        alert(t('nicknameProtectedPromptOwn').replace('{author}', author));
        passwordInput?.focus();
        return;
    }
    
    // Prepare team data
    const teamData = {
        name: name,
        author: author,
        description: description,
        reserveNickname: reserveNickname,
        password: password,
        slots: dreamTeam.map(slot => ({
            pokemon: slot.pokemon,
            shiny: slot.shiny || false,
            starSign: slot.starSign || null,
            nature: slot.nature || null,
            ability: slot.ability,
            item: slot.item,
            moves: slot.moves || [null, null, null, null],
            ivs: slot.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        })).filter(slot => slot.pokemon !== null)
    };
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/submit.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teamData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            if (result.requirePassword) {
                // Show password field and mark as retry
                const passwordInput = document.getElementById('submit-team-password');
                const passwordSection = document.getElementById('password-section');
                if (passwordSection) passwordSection.style.display = 'block';
                if (passwordInput) {
                    passwordInput.dataset.retry = 'true';
                }
                alert(result.error);
            } else {
                alert(t('error') + ': ' + result.error);
            }
            return;
        }
        
        // Store only author (NEVER store password in localStorage for security)
        localStorage.setItem('lastTeamAuthor', author);
        
        // Success - show beautiful modal
        closeModal();
        
        // Mark author to open after loading
        window.openAuthorAfterLoad = author;
        
        // Show beautiful success modal
        // Only show "protected" message if we just created a new reservation (not when logging in)
        const isNewReservation = reserveNickname && result.reserved && !isReservedForced;
        const reservedMsg = isNewReservation ? '<p style="color:var(--accent-gold);font-size:0.9rem">' + t('nicknameNowProtected') + '</p>' : '';
        const successHtml = `
            <div style="text-align:center;padding:20px">
                <div style="font-size:4rem;margin-bottom:15px">✅</div>
                <h2 style="margin:0 0 10px 0;color:var(--success)">${t('teamSubmitSuccess')}</h2>
                <p style="color:var(--text-dim);margin-bottom:20px">${t('teamSubmitSuccessDesc').replace('{name}', '<b>' + escapeHtml(name) + '</b>')}</p>
                ${reservedMsg}
                <button class="btn" onclick="closeModal();switchToTab('member-teams');" style="background:linear-gradient(135deg,rgba(0,255,136,0.3),rgba(0,200,83,0.3));border-color:var(--success);padding:12px 30px;font-size:1.1rem">
                    ${t('viewMyTeam')}
                </button>
            </div>
        `;
        openModal(t('success'), successHtml);
        
    } catch (err) {
        console.error('Submit error:', err);
        alert(t('serverError'));
    }
};

// Simple like/unlike toggle - stores user likes in localStorage
window.likeTeam = async function(teamName, teamAuthor) {
    const teamKey = (teamAuthor + '|' + teamName).split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0).toString(16).substring(0, 16);
    
    // Check if already liked
    const userLikes = JSON.parse(localStorage.getItem('userTeamLikes') || '{}');
    const isLiked = userLikes[teamKey];
    
    // Toggle: like if not liked, unlike if already liked
    const action = isLiked ? 'unlike' : 'like';
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/rate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: teamName,
                author: teamAuthor,
                teamKey: teamKey,
                action: action
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update localStorage
            if (isLiked) {
                delete userLikes[teamKey];
            } else {
                userLikes[teamKey] = true;
            }
            localStorage.setItem('userTeamLikes', JSON.stringify(userLikes));
            
            // Update UI
            const likesEl = document.getElementById(`likes-${teamKey}`);
            const likeBtn = document.getElementById(`like-btn-${teamKey}`);
            
            if (likesEl) likesEl.textContent = result.likes;
            if (likeBtn) {
                likeBtn.style.background = isLiked ? 'var(--bg-input)' : 'rgba(255,105,180,0.3)';
                likeBtn.innerHTML = isLiked ? `❤️ Like <span id="likes-${teamKey}">${result.likes}</span>` : `❤️ Liked <span id="likes-${teamKey}">${result.likes}</span>`;
            }
        }
    } catch (err) {
        console.error('Like error:', err);
    }
};

// Delete own team
window.deleteOwnTeam = async function(teamName, teamAuthor) {
    // Get stored author
    const requestingAuthor = localStorage.getItem('lastTeamAuthor') || '';
    
    // Check if admin
    const isAdmin = (requestingAuthor === 'Undi' || requestingAuthor === 'undi');
    
    if (!isAdmin && requestingAuthor !== teamAuthor) {
        alert(
            (t('deleteOwnTeamOnly') || 'You can only delete your own teams!')
            + '\n\n'
            + (t('yourNickname') || 'Your nickname') + ': ' + (requestingAuthor || (t('notSet') || '(not set)'))
            + '\n'
            + (t('teamAuthorLabel') || 'Team author') + ': ' + teamAuthor
        );
        return;
    }
    
    // Ask for password if not admin (admin bypass)
    let password = '';
    if (!isAdmin) {
        password = prompt(t('deleteTeamPrompt'));
        if (!password) return;
    }
    
    if (!confirm(t('deleteTeamConfirm').replace('{name}', teamName))) {
        return;
    }
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: teamName,
                author: teamAuthor,
                password: password,
                requestingAuthor: requestingAuthor
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadFeaturedTeams();
            alert(t('teamDeleted'));
        } else if (result.requirePassword) {
            // Need password - ask user
            const newPassword = prompt(t('deleteTeamPromptRetry').replace('{author}', teamAuthor));
            if (newPassword) {
                deleteOwnTeam(teamName, teamAuthor); // Retry
            }
        } else {
            alert(t('error') + ': ' + result.error);
        }
    } catch (err) {
        console.error('Delete error:', err);
        alert(t('deleteError'));
    }
};

// Store currently editing team data
let currentEditingTeam = null;
let currentEditingTeamId = null;

// Edit own team (full editor with Pokémon)
window.editOwnTeam = function(teamId) {
    const team = window.featuredTeamsCache?.[teamId];
    if (!team) return;
    
    const currentAuthor = localStorage.getItem('lastTeamAuthor') || '';
    if (currentAuthor !== team.author) {
        alert(t('editOwnTeamOnly') || 'Vous ne pouvez modifier que vos propres teams !');
        return;
    }
    
    currentEditingTeam = JSON.parse(JSON.stringify(team)); // Deep copy
    currentEditingTeamId = teamId;
    
    renderTeamEditor();
};

// Render the team editor modal
function renderTeamEditor() {
    const team = currentEditingTeam;
    const teamData = team.team || [];
    
    // Ensure 6 slots
    while (teamData.length < 6) {
        teamData.push(null);
    }
    
    const slotsHtml = teamData.map((p, idx) => {
        if (!p || !p.pokemon) {
            return `
            <div class="team-edit-slot" data-slot="${idx}" style="background:var(--bg-input);border:2px dashed var(--border);border-radius:12px;padding:15px;text-align:center;cursor:pointer;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px" onclick="showSlotEditor(${idx})">
                <div style="font-size:2rem;opacity:0.5">➕</div>
                <div style="font-size:0.85rem;color:var(--text-dim)">${t('addPokemon')}</div>
            </div>
            `;
        }
        
        const pData = pokemons[p.pokemon];
        const displayName = pData?.displayName || format(p.pokemon);
        const spriteUrl = p.shiny ? spriteShiny(p.pokemon) : sprite(p.pokemon);
        const typeColor = pData?.types?.[0] ? `var(--type-${pData.types[0]})` : 'var(--border)';
        
        // Build extra info
        let extraInfo = [];
        if (p.nature) extraInfo.push(`<span style="color:var(--accent-blue)">${GAME_CONFIG.NATURES?.[p.nature]?.name?.[currentLang] || format(p.nature)}</span>`);
        if (p.starsign) extraInfo.push(`<span style="color:var(--accent-gold)">⭐ ${format(p.starsign)}</span>`);
        if (p.level && p.level !== 100) extraInfo.push(`<span style="color:var(--text-dim)">Lv.${p.level}</span>`);
        
        // Ability with HA lock status
        const pAbilities = pData?.abilities || [];
        const pHA = pData?.hiddenAbility;
        let abilityDisplay = '';
        if (p.ability) {
            abilityDisplay = `<span style="color:#82dba4">${abilities[p.ability]?.displayName || format(p.ability)}</span>`;
        } else if (pAbilities.length > 0) {
            abilityDisplay = `<span style="color:#82dba4;opacity:0.7">${abilities[pAbilities[0]]?.displayName || format(pAbilities[0])}</span>`;
        }
        if (pHA) {
            const haName = abilities[pHA]?.displayName || format(pHA);
            const haLocked = !p.hiddenAbilityUnlocked;
            abilityDisplay += ` <span style="color:var(--accent-pink);${haLocked ? 'opacity:0.5' : ''}">${haLocked ? '🔒' : '🔓'} ${haName}</span>`;
        }
        
        // Calculate IV display
        let ivDisplay = '';
        if (p.ivs) {
            const ivSum = Object.values(p.ivs).reduce((a, b) => a + b, 0);
            const ivMax = Object.values(p.ivs).every(v => v === 6);
            if (!ivMax) {
                ivDisplay = `<span style="color:var(--text-dim)">IV:${ivSum}</span>`;
            }
        } else if (p.ivTotal && p.ivTotal !== 36) {
            ivDisplay = `<span style="color:var(--text-dim)">IV:${p.ivTotal}</span>`;
        }
        
        // Count moves (handle both array and object formats)
        let moveCount = 0;
        let moveDisplay = '';
        if (p.moves) {
            const movesList = Array.isArray(p.moves) 
                ? p.moves.filter(m => m)
                : Object.values(p.moves).filter(m => m);
            moveCount = movesList.length;
            if (moveCount > 0) {
                moveDisplay = `<div style="font-size:0.7rem;color:var(--text-dim);margin-top:2px">⚔️ ${movesList.slice(0, 2).map(m => moves[m]?.displayName || format(m)).join(', ')}${moveCount > 2 ? '...' : ''}</div>`;
            }
        }
        
        return `
        <div class="team-edit-slot" data-slot="${idx}" style="background:var(--bg-card);border:2px solid ${typeColor};border-radius:12px;padding:12px;position:relative;cursor:pointer" onclick="showSlotEditor(${idx})">
            <div style="display:flex;align-items:center;gap:10px">
                <div style="position:relative">
                    <img src="${spriteUrl}" style="width:56px;height:56px;image-rendering:pixelated;${p.starSign ? getStellarStyle(p.starSign) : ''}">
                    ${p.shiny ? '<span style="position:absolute;top:-5px;right:-5px;font-size:1rem">✨</span>' : ''}
                </div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(displayName)}</div>
                    <div style="font-size:0.75rem;color:var(--text-dim);display:flex;gap:5px;margin-top:3px;flex-wrap:wrap">
                        ${pData?.types?.map(t => `<span class="type-badge type-${t}" style="font-size:0.6rem;padding:1px 4px">${t}</span>`).join('') || ''}
                        ${extraInfo.join(' · ')}
                        ${ivDisplay}
                    </div>
                    ${abilityDisplay ? `<div style="font-size:0.75rem;margin-top:4px">⚡ ${abilityDisplay}</div>` : ''}
                    ${p.item ? `<div style="font-size:0.75rem;color:var(--accent-gold);margin-top:4px">🎒 ${escapeHtml(items[p.item]?.displayName || format(p.item))}</div>` : ''}
                    ${moveDisplay}
                </div>
            </div>
            <button class="btn btn-small" onclick="event.stopPropagation();removeSlotPokemon(${idx})" style="position:absolute;top:5px;right:5px;background:rgba(255,68,68,0.2);border-color:var(--danger);padding:2px 6px;font-size:0.6rem;padding:1px 4px" title="${t('remove')}">✕</button>
        </div>
        `;
    }).join('');
    
    const html = `
        <div style="display:flex;flex-direction:column;gap:15px;max-height:80vh;overflow-y:auto">
            <div>
                <label style="display:block;margin-bottom:5px;font-size:0.85rem;color:var(--text-dim)">${t('teamNameLabel')}</label>
                <input type="text" id="edit-team-name" value="${escapeAttr(team.name)}" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text)">
            </div>
            <div>
                <label style="display:block;margin-bottom:5px;font-size:0.85rem;color:var(--text-dim)">${t('description')}</label>
                <textarea id="edit-team-desc" rows="2" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);resize:vertical">${escapeAttr(team.description || '')}</textarea>
            </div>
            <div>
                <label style="display:block;margin-bottom:10px;font-size:0.85rem;color:var(--text-dim)">${t('pokemonCount', {count: teamData.filter(p => p?.pokemon).length})}</label>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px">
                    ${slotsHtml}
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:10px;position:sticky;bottom:0;background:var(--bg-card);padding-top:10px;border-top:1px solid var(--border)">
                <button class="btn" onclick="saveTeamEditFull()" style="flex:1;background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,200,83,0.2));border-color:var(--success)">💾 ${t('save')}</button>
                <button class="btn btn-outline" onclick="closeTeamEditor()">${t('cancel')}</button>
            </div>
        </div>
    `;
    
    openModal(t('editTeam'), html);
}

// Show slot editor - Copy of Team tab system (dream slot style)
window.showSlotEditor = function(slotIdx) {
    window.currentEditingSlot = slotIdx;
    const slot = currentEditingTeam.team?.[slotIdx] || {};
    const pokemonName = slot.pokemon || '';
    
    if (!pokemonName || !pokemons[pokemonName]) {
        // Show Pokemon selector first
        showPokemonSelector(slotIdx);
        return;
    }
    
    const p = pokemons[pokemonName];
    
    // Check if HA is unlocked from save data (like in Team tab)
    let haUnlocked = slot.hiddenAbilityUnlocked || false;
    if (!haUnlocked && typeof loadedSaveData !== 'undefined' && loadedSaveData && loadedSaveData[pokemonName]) {
        const saveData = loadedSaveData[pokemonName];
        if (saveData && saveData.hiddenAbility === true) {
            haUnlocked = true;
        }
    }
    
    // Get ribbons from save data
    let ribbonsHtml = '';
    if (typeof loadedSaveData !== 'undefined' && loadedSaveData && loadedSaveData[pokemonName]) {
        const pkmnData = loadedSaveData[pokemonName];
        if (pkmnData && pkmnData.ribbons && pkmnData.ribbons.length > 0 && typeof getRibbonsHtml === 'function') {
            ribbonsHtml = `<div class="dream-ribbons" style="margin-left:8px;display:flex;flex-direction:column;gap:4px;">${getRibbonsHtml(pkmnData.ribbons)}</div>`;
        }
    }
    
    // Get learnable moves (same as Team tab)
    const learnableMoves = getLearnableMoves ? getLearnableMoves(pokemonName) : [];
    
    // Get possible abilities (same as Team tab)
    const possibleAbilities = getPossibleAbilities ? getPossibleAbilities(pokemonName) : (p.abilities || []);
    
    // Memory abilities (same as Team tab)
    const memoryAbilities = [];
    Object.values(items).forEach(item => {
        if (item.type === 'memory' && item.ability && abilities[item.ability]) {
            if (item.ability !== p.hiddenAbility) {
                memoryAbilities.push(item.ability);
            }
        }
    });
    const allAbilities = [...new Set([...possibleAbilities, ...memoryAbilities])].sort((a, b) => {
        const aa = abilities[a], ab = abilities[b];
        return (aa?.displayName || a).localeCompare(ab?.displayName || b);
    });
    
    // Parse IVs
    let ivs = { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 };
    if (slot.ivs) {
        ivs.hp = parseInt(slot.ivs.hp ?? slot.ivs.HP ?? 6);
        ivs.atk = parseInt(slot.ivs.atk ?? 6);
        ivs.def = parseInt(slot.ivs.def ?? 6);
        ivs.satk = parseInt(slot.ivs.satk ?? slot.ivs.spa ?? 6);
        ivs.sdef = parseInt(slot.ivs.sdef ?? slot.ivs.spd ?? 6);
        ivs.spe = parseInt(slot.ivs.spe ?? 6);
    }
    Object.keys(ivs).forEach(k => ivs[k] = Math.min(6, Math.max(0, isNaN(ivs[k]) ? 6 : ivs[k])));
    const ivTotal = ivs.hp + ivs.atk + ivs.def + ivs.satk + ivs.sdef + ivs.spe;
    
    // Helper for memory image
    const getMemoryImg = (abilityName) => {
        const memoryItem = Object.values(items).find(item => 
            item.type === 'memory' && item.ability === abilityName
        );
        if (!memoryItem) return null;
        const ab = abilities[abilityName];
        const memoryType = memoryItem.memoryTypings?.[0] || ab?.types?.[0] || 'normal';
        return `${CONFIG.repoBase}img/items/${memoryType}Memory.png`;
    };
    
    const html = `
        <div class="dream-slot-editor" style="max-height:75vh;overflow-y:auto;padding-right:10px">
            <!-- Header with sprite and basic info -->
            <div class="dream-slot-header" style="margin-bottom:15px">
                <div style="display:flex;align-items:flex-start;gap:15px">
                    <div style="display:flex;align-items:flex-start;">
                        <div class="dream-slot-sprite-container" style="position:relative">
                            <img id="editor-sprite" src="${slot.shiny ? spriteShiny(pokemonName) : sprite(pokemonName)}" 
                                 style="width:64px;height:64px;image-rendering:pixelated;${slot.starSign ? getStellarStyle(slot.starSign) : ''}">
                            ${slot.shiny ? '<span style="position:absolute;top:-5px;right:-5px;font-size:1.2rem">✨</span>' : ''}
                        </div>
                        ${ribbonsHtml}
                    </div>
                    <div style="flex:1">
                        <div style="font-weight:600;font-size:1.1rem">${p.displayName || format(pokemonName)} ${divBadge(p.division)}</div>
                        <div class="type-badges" style="margin-top:5px">${p.types.map(t => typeBadge(t)).join('')}</div>
                        <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
                            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
                                <input type="checkbox" id="edit-shiny" ${slot.shiny ? 'checked' : ''} onchange="updateEditorSprite('${pokemonName}')">
                                <span>✨ ${t('shiny')}</span>
                            </label>
                            ${GAME_CONFIG.STAR_SIGNS ? `
                            <select id="edit-starsign" onchange="updateEditorSprite('${pokemonName}')" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.8rem;color:var(--accent-gold)">
                                <option value="">${t('normal')}</option>
                                ${Object.keys(GAME_CONFIG.STAR_SIGNS).map(ss => `<option value="${ss}" ${slot.starSign === ss ? 'selected' : ''}>${format(ss)}</option>`).join('')}
                            </select>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-small" onclick="changeSlotPokemon(${slotIdx})" style="background:rgba(255,255,255,0.1)">${t('change')}</button>
                </div>
            </div>
            
            <!-- Nature -->
            ${GAME_CONFIG.NATURES ? `
            <div class="dream-slot-section" style="margin-bottom:15px;padding:10px;background:var(--bg-input);border-radius:8px">
                <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:5px;text-transform:uppercase">${t('nature')}</div>
                <select id="edit-nature" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:#82dba4">
                    <option value="">${t('neutral') || 'Neutre'}</option>
                    ${Object.keys(GAME_CONFIG.NATURES).filter(n => !isNatureAvailable || isNatureAvailable(p, n)).map(n => 
                        `<option value="${n}" ${slot.nature === n ? 'selected' : ''}>${GAME_CONFIG.NATURES[n].name?.[currentLang] || format(n)}</option>`
                    ).join('')}
                </select>
            </div>` : ''}
            
            <!-- Moves -->
            <div class="dream-slot-section" style="margin-bottom:15px">
                <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase">${t('moves')}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                    ${[0,1,2,3].map(m => {
                        const currentMove = Array.isArray(slot.moves) ? slot.moves[m] : (slot.moves?.[`slot${m+1}`] || '');
                        return `<select id="edit-move-${m}" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:0.85rem">
                            <option value="">-- ${t('selectMove')} --</option>
                            ${learnableMoves.map(mv => {
                                const moveData = moves[mv];
                                const isEggMove = moveData?.isEggMove;
                                const isNativeSignature = p?.signature === mv;
                                const isReplicatorSignature = moveData?.isSignature && !isNativeSignature;
                                let suffix = '';
                                if (isEggMove) suffix += ' 🥚';
                                if (isReplicatorSignature) suffix += ' 🔬';
                                if (isNativeSignature) suffix += ' ⭐';
                                return `<option value="${mv}" ${currentMove === mv ? 'selected' : ''}>${moveData?.displayName || format(mv)}${suffix}</option>`;
                            }).join('')}
                        </select>`;
                    }).join('')}
                </div>
            </div>
            
            <!-- Abilities -->
            <div class="dream-slot-section" style="margin-bottom:15px">
                <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase">${t('abilities')}</div>
                <div style="display:flex;flex-direction:column;gap:8px">
                    <!-- Normal abilities dropdown -->
                    <div class="ability-dropdown" id="editor-ability-dropdown" style="position:relative">
                        <div class="ability-dropdown-trigger" onclick="toggleEditorAbilityDropdown()" style="padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px">
                            ${(() => {
                                const selectedAbility = slot.ability || '';
                                const memoryImg = getMemoryImg(selectedAbility);
                                return `${memoryImg ? `<img src="${memoryImg}" style="width:16px;height:16px;image-rendering:pixelated">` : '<span style="width:16px"></span>'}
                                        <span id="editor-ability-name">${selectedAbility ? (abilities[selectedAbility]?.displayName || format(selectedAbility)) : t('selectAbilityPrompt')}</span>
                                        <span style="margin-left:auto">▶</span>`;
                            })()}
                        </div>
                        <div class="ability-dropdown-menu" id="editor-ability-menu" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;max-height:200px;overflow-y:auto;margin-top:4px">
                            <div class="ability-dropdown-item" onclick="selectEditorAbility('')" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:8px">
                                <span style="width:16px"></span><span>-- ${t('selectAbility')} --</span>
                            </div>
                            ${allAbilities.filter(a => a !== p.hiddenAbility).map(a => {
                                const memoryImg = getMemoryImg(a);
                                return `<div class="ability-dropdown-item" onclick="selectEditorAbility('${a}')" style="padding:10px;cursor:pointer;display:flex;align-items:center;gap:8px">
                                    ${memoryImg ? `<img src="${memoryImg}" style="width:16px;height:16px;image-rendering:pixelated">` : '<span style="width:16px"></span>'}
                                    <span>${abilities[a]?.displayName || format(a)}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    <!-- Hidden Ability (always unlocked in Teams) -->
                    ${p.hiddenAbility ? `
                    <div style="padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--accent-pink);display:flex;align-items:center;gap:8px">
                        <span>🔒</span>
                        <span>${t('haPrefix')} ${abilities[p.hiddenAbility]?.displayName || format(p.hiddenAbility)}</span>
                    </div>` : ''}
                </div>
            </div>
            
            <!-- IVs -->
            <div class="dream-slot-section iv-section" style="margin-bottom:15px;padding:12px;background:rgba(255,68,68,0.05);border:1px solid rgba(255,68,68,0.3);border-radius:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                    <span style="font-size:0.8rem;color:#ff6666;font-weight:700;text-transform:uppercase">${t('ivs')}</span>
                    <span style="font-size:0.9rem;color:var(--accent-gold);font-weight:700">${ivTotal}/36</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;text-align:center">
                    ${['hp','atk','def','satk','sdef','spe'].map((stat, idx) => {
                        const val = ivs[stat];
                        const stars = '★'.repeat(val) + '☆'.repeat(6-val);
                        return `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                            <span style="font-size:0.6rem;color:var(--text-dim);opacity:0.7">${[t('hpShort'),t('atkShort'),t('defShort'),t('spaShort'),t('spdShort'),t('speShort')][idx]}</span>
                            <span onclick="cycleEditorIV('${stat}')" title="${t('clickToChange')}" style="font-size:0.85rem;color:#ff4444;cursor:pointer;user-select:none;letter-spacing:-1px">${stars}</span>
                            <input type="hidden" id="edit-iv-${stat}" value="${val}">
                        </div>`;
                    }).join('')}
                </div>
            </div>
            
            <!-- Item -->
            <div class="dream-slot-section" style="margin-bottom:15px">
                <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase">${t('item')}</div>
                <div style="display:flex;align-items:center;gap:10px">
                    <select id="edit-item" style="flex:1;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text)" onchange="updateEditorItemIcon()">
                        <option value="">-- ${t('selectItem')} --</option>
                        ${Object.values(items).filter(it => it.type === 'held' || it.type === 'evolution' || it.type === 'mega').sort((a, b) => a.displayName.localeCompare(b.displayName)).map(it => 
                            `<option value="${it.name}" ${slot.item === it.name ? 'selected' : ''}>${it.displayName}</option>`
                        ).join('')}
                    </select>
                    <img id="editor-item-icon" src="${slot.item ? itemImg(slot.item) : ''}" style="width:24px;height:24px;image-rendering:pixelated;display:${slot.item ? 'block' : 'none'}">
                </div>
            </div>
            
            <!-- Level -->
            <div class="dream-slot-section" style="margin-bottom:15px">
                <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase">${t('level')}</div>
                <input type="number" id="edit-level" value="${slot.level || 100}" min="1" max="100" style="width:100px;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);text-align:center">
            </div>
            
            <!-- Buttons -->
            <div style="display:flex;gap:10px;margin-top:20px;padding-top:15px;border-top:1px solid var(--border)">
                <button class="btn" onclick="saveSlotEdit(${slotIdx})" style="flex:1;background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,200,83,0.2));border-color:var(--success);padding:12px">✅ ${t('confirm')}</button>
                <button class="btn btn-outline" onclick="renderTeamEditor()" style="padding:12px 20px">${t('back')}</button>
            </div>
        </div>
    `;
    
    openModal(t('editSlot'), html);
    
    // Store current ability for the dropdown
    window.editorCurrentAbility = slot.ability || '';
};

// Show Pokemon selector (when slot is empty or changing Pokemon)
window.showPokemonSelector = function(slotIdx) {
    const allPokemon = Object.entries(pokemons)
        .filter(([key, p]) => p.displayName)
        .sort((a, b) => a[1].displayName.localeCompare(b[1].displayName));
    
    const html = `
        <div style="max-height:60vh;overflow-y:auto">
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:8px">
                ${allPokemon.map(([key, p]) => `
                    <div onclick="selectPokemonForSlot(${slotIdx}, '${key}')" 
                         style="padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:center;transition:all 0.2s"
                         onmouseover="this.style.borderColor='var(--accent-blue)'" 
                         onmouseout="this.style.borderColor='var(--border)'">
                        <img src="${sprite(key)}" style="width:48px;height:48px;image-rendering:pixelated">
                        <div style="font-size:0.75rem;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.displayName)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    openModal(t('selectPokemonTitle'), html);
};

window.selectPokemonForSlot = function(slotIdx, pokemonName) {
    if (!currentEditingTeam.team) currentEditingTeam.team = [];
    currentEditingTeam.team[slotIdx] = {
        pokemon: pokemonName,
        shiny: false,
        hiddenAbilityUnlocked: false,
        ivs: { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 },
        moves: [null, null, null, null],
        ability: null,
        item: null,
        level: 100
    };
    showSlotEditor(slotIdx);
};

window.changeSlotPokemon = function(slotIdx) {
    showPokemonSelector(slotIdx);
};

window.updateEditorSprite = function(pokemonName) {
    const shinyCheckbox = document.getElementById('edit-shiny');
    const starSignSelect = document.getElementById('edit-starsign');
    const spriteImg = document.getElementById('editor-sprite');
    
    if (!spriteImg || !pokemonName) return;
    
    const isShiny = shinyCheckbox?.checked || false;
    const starSign = starSignSelect?.value || '';
    
    // Get current URL to check if we need to change
    const currentSrc = spriteImg.src || '';
    const newSrc = isShiny ? spriteShiny(pokemonName) : sprite(pokemonName);
    
    // Force image reload by appending timestamp if shiny state changed
    const finalSrc = currentSrc.includes('/shiny/') !== isShiny ? newSrc : currentSrc;
    
    // Create new image to preload
    const tempImg = new Image();
    tempImg.onload = function() {
        spriteImg.src = finalSrc;
        // Update star sign style
        if (starSign && typeof getStellarStyle === 'function') {
            spriteImg.style.cssText = `width:64px;height:64px;image-rendering:pixelated;${getStellarStyle(starSign)}`;
        } else {
            spriteImg.style.cssText = 'width:64px;height:64px;image-rendering:pixelated;';
        }
    };
    tempImg.src = finalSrc;
};

window.toggleEditorAbilityDropdown = function() {
    const menu = document.getElementById('editor-ability-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

window.selectEditorAbility = function(ability) {
    window.editorCurrentAbility = ability;
    const nameEl = document.getElementById('editor-ability-name');
    if (nameEl) nameEl.textContent = ability ? (abilities[ability]?.displayName || format(ability)) : t('selectAbilityPrompt');
    const menu = document.getElementById('editor-ability-menu');
    if (menu) menu.style.display = 'none';
};

window.toggleEditorHA = function(checkbox) {
    const haSelect = document.getElementById('edit-ha');
    if (haSelect) haSelect.style.opacity = checkbox.checked ? 1 : 0.5;
};

window.cycleEditorIV = function(stat) {
    const input = document.getElementById(`edit-iv-${stat}`);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val = (val + 1) % 7;
    input.value = val;
    
    // Update stars display
    const stars = '★'.repeat(val) + '☆'.repeat(6-val);
    const span = input.previousElementSibling;
    if (span) span.textContent = stars;
    
    // Update total
    const total = ['hp','atk','def','satk','sdef','spe'].reduce((sum, s) => {
        return sum + (parseInt(document.getElementById(`edit-iv-${s}`)?.value) || 0);
    }, 0);
    const totalEl = document.querySelector('.iv-section span:last-child');
    if (totalEl) totalEl.textContent = `${total}/36`;
};

window.updateEditorItemIcon = function() {
    const item = document.getElementById('edit-item')?.value;
    const icon = document.getElementById('editor-item-icon');
    if (icon) {
        if (item) {
            icon.src = itemImg(item);
            icon.style.display = 'block';
        } else {
            icon.style.display = 'none';
        }
    }
};

// Save slot edit (new version matching Team tab)
window.saveSlotEdit = function(slotIdx) {
    const slot = currentEditingTeam.team?.[slotIdx];
    if (!slot || !slot.pokemon) {
        renderTeamEditor();
        return;
    }
    
    // Get all values from new editor
    const shiny = document.getElementById('edit-shiny')?.checked || false;
    // HA is always unlocked in Teams
    const hiddenAbilityUnlocked = true;
    const nature = document.getElementById('edit-nature')?.value || null;
    const starSign = document.getElementById('edit-starsign')?.value || null;
    const item = document.getElementById('edit-item')?.value || null;
    const level = parseInt(document.getElementById('edit-level')?.value) || 100;
    const ability = window.editorCurrentAbility || null;
    
    // Get IVs from hidden inputs
    const ivs = {
        hp: parseInt(document.getElementById('edit-iv-hp')?.value) || 0,
        atk: parseInt(document.getElementById('edit-iv-atk')?.value) || 0,
        def: parseInt(document.getElementById('edit-iv-def')?.value) || 0,
        satk: parseInt(document.getElementById('edit-iv-satk')?.value) || 0,
        sdef: parseInt(document.getElementById('edit-iv-sdef')?.value) || 0,
        spe: parseInt(document.getElementById('edit-iv-spe')?.value) || 0
    };
    
    // Get moves
    const movesArray = [];
    [0, 1, 2, 3].forEach(i => {
        const move = document.getElementById(`edit-move-${i}`)?.value;
        movesArray.push(move || null);
    });
    
    // Update slot
    currentEditingTeam.team[slotIdx] = {
        pokemon: slot.pokemon,
        shiny: shiny,
        hiddenAbilityUnlocked: hiddenAbilityUnlocked,
        nature: nature,
        starSign: starSign,
        item: item,
        level: level,
        ivs: ivs,
        ivTotal: Object.values(ivs).reduce((a, b) => a + b, 0),
        ability: ability,
        moves: movesArray
    };
    
    renderTeamEditor();
};

// Remove Pokémon from slot
window.removeSlotPokemon = function(slotIdx) {
    if (currentEditingTeam.team) {
        currentEditingTeam.team[slotIdx] = null;
    }
    renderTeamEditor();
};

// Close team editor
window.closeTeamEditor = function() {
    currentEditingTeam = null;
    currentEditingTeamId = null;
    closeModal();
};

// Save full team edit
window.saveTeamEditFull = async function() {
    const newName = document.getElementById('edit-team-name')?.value.trim();
    const newDesc = document.getElementById('edit-team-desc')?.value.trim();
    
    if (!newName) {
        alert(t('teamNameRequired'));
        return;
    }
    
    // Filter out null slots and compact array
    const compactTeam = (currentEditingTeam.team || []).filter(p => p?.pokemon);
    
    const currentAuthor = localStorage.getItem('lastTeamAuthor') || '';
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/exchange/api.php?action=team_edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                oldName: currentEditingTeam.name,
                author: currentEditingTeam.author,
                newName: newName,
                description: newDesc,
                team: compactTeam,
                requestingAuthor: currentAuthor
            })
        });
        
        // Log raw response for debugging
        const responseText = await response.text();
        console.log('[saveTeamEditFull] Raw response:', responseText);
        
        let result;
        try {
            // Try to extract JSON from response (in case there's PHP warning before)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                result = JSON.parse(responseText);
            }
        } catch (parseErr) {
            console.error('[saveTeamEditFull] JSON parse error. Response was:', responseText);
            alert(t('serverError') + ': ' + responseText.substring(0, 200));
            return;
        }
        
        if (result.success) {
            closeTeamEditor();
            loadFeaturedTeams();
            alert(t('teamUpdated'));
        } else {
            alert(t('error') + ': ' + result.error);
        }
    } catch (err) {
        console.error('Edit error:', err);
        alert(t('editError'));
    }
};

// Move team up in order
window.moveTeamUp = function(author, teamName) {
    const orderKey = `team_order_${author}`;
    const order = JSON.parse(localStorage.getItem(orderKey) || '[]');
    
    const idx = order.indexOf(teamName);
    if (idx > 0) {
        [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
        localStorage.setItem(orderKey, JSON.stringify(order));
        loadFeaturedTeams();
    }
};

// Move team down in order
window.moveTeamDown = function(author, teamName) {
    const orderKey = `team_order_${author}`;
    const order = JSON.parse(localStorage.getItem(orderKey) || '[]');
    
    const idx = order.indexOf(teamName);
    if (idx >= 0 && idx < order.length - 1) {
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        localStorage.setItem(orderKey, JSON.stringify(order));
        loadFeaturedTeams();
    }
};

// Apply custom order to teams array
function applyTeamOrder(teams, author) {
    const orderKey = `team_order_${author}`;
    const order = JSON.parse(localStorage.getItem(orderKey) || '[]');
    
    if (order.length === 0) {
        // Initialize order with current teams
        const newOrder = teams.map(t => t.name);
        localStorage.setItem(orderKey, JSON.stringify(newOrder));
        return teams;
    }
    
    // Sort teams based on saved order
    const sorted = [...teams].sort((a, b) => {
        const idxA = order.indexOf(a.name);
        const idxB = order.indexOf(b.name);
        if (idxA === -1) return 1; // New teams go to end
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
    
    // Add any new teams not in order
    const orderedNames = new Set(order);
    const newTeams = teams.filter(t => !orderedNames.has(t.name));
    
    // Update stored order with new teams
    if (newTeams.length > 0) {
        const updatedOrder = [...order, ...newTeams.map(t => t.name)];
        localStorage.setItem(orderKey, JSON.stringify(updatedOrder));
    }
    
    return sorted;
}

// Load manifest file(s) for the Featured folder structure
// Returns array of { manifest, url, isArchive } or empty array
async function loadFeaturedTeamsManifests() {
    const manifestsToLoad = [
        { url: 'Featured/manifest.json', isArchive: false },
        { url: 'Featured/Archives/manifest.json', isArchive: true }
    ];
    
    const results = [];
    
    for (const { url, isArchive } of manifestsToLoad) {
        try {
            const response = await fetch(url + '?t=' + Date.now());
            if (response.ok) {
                const manifest = await response.json();
                results.push({ manifest, url, isArchive });
            }
        } catch (e) {
            console.warn(`Failed to load manifest: ${url}`, e);
        }
    }
    
    return results;
}

async function loadFeaturedTeams() {
    const container = document.getElementById('featured-teams-list');
    
    // Initialize/reset the teams cache
    window.featuredTeamsCache = {};
    
    container.innerHTML = `
        <div style="padding:30px;text-align:center;color:var(--text-dim);background:var(--bg-card);border-radius:12px;border:2px dashed var(--border);grid-column:1/-1">
            <div style="font-size:2rem;margin-bottom:10px">⏳</div>
            <div data-i18n="loadingTeams">Loading teams...</div>
        </div>`;
    
    let jsonData = [];
    
    // Load ratings
    let ratings = {};
    try {
        const ratingsResponse = await fetch('https://pokechill-explorer.alwaysdata.net/teams/get_ratings.php');
        if (ratingsResponse.ok) {
            const ratingsData = await ratingsResponse.json();
            if (ratingsData.success) {
                ratings = ratingsData.ratings || {};
            }
        }
    } catch (e) {
        console.warn('Failed to load ratings:', e);
    }
    
    try {
        // Load both manifests (Featured and Archives)
        const manifests = await loadFeaturedTeamsManifests();
        
        if (manifests.length === 0) {
            throw new Error('No manifest found');
        }
        
        // Load teams from all manifests
        const allLoadPromises = [];
        
        for (const { manifest, isArchive, url } of manifests) {
            if (!manifest.teams || manifest.teams.length === 0) continue;
            
            // Get base path for archives manifest (e.g., "Featured/Archives/")
            const isArchivesManifest = url.includes('Archives');
            
            const loadPromises = manifest.teams.map(async (teamInfo) => {
                try {
                    // Fix path for archives - prepend "Archives/" if needed
                    let filePath = teamInfo.file;
                    if (isArchivesManifest && !filePath.includes('Archives')) {
                        filePath = filePath.replace('Featured/', 'Featured/Archives/');
                    }
                    
                    // Use cache-busting and silent fail for 404s
                    const fullUrl = filePath;
                    const response = await fetch(fullUrl + "?t=" + Date.now()).catch(() => ({ok: false, status: 0}));
                    if (response.ok) {
                        const json = await response.json();
                        // Handle export format { version, teams: [...] } or direct format { name, slots }
                        let teamData;
                        if (json.version && json.teams && Array.isArray(json.teams)) {
                            // Export format - take first team
                            teamData = json.teams[0];
                        } else {
                            // Direct format
                            teamData = json;
                        }
                        // Mark as archive and preserve file path
                        teamData._isArchive = isArchive;
                        teamData.file = teamInfo.file;
                        return teamData;
                    }
                    // Silently ignore 404s - file was removed but still in manifest
                } catch (e) {
                    console.warn(`Failed to load team: ${teamInfo.file}`, e);
                }
                return null;
            });
            
            allLoadPromises.push(...loadPromises);
        }
        
        const loadedTeams = await Promise.all(allLoadPromises);
        jsonData = loadedTeams.filter(t => t !== null);
        
        // If no teams loaded from folder structure, fallback to old JSON file
        if (jsonData.length === 0) {
            throw new Error('No teams loaded from folder structure, using fallback');
        }
    } catch (folderError) {
        console.log('Loading from folder structure failed, using fallback:', folderError);
        try {
            // Fallback: Load from legacy JSON file
            const response = await fetch('featured-teams.json');
            if (response.ok) {
                jsonData = await response.json();
            }
        } catch (fallbackError) {
            console.error('Failed to load featured teams:', fallbackError);
        }
    }
    
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        container.innerHTML = `
            <div style="padding:30px;text-align:center;color:var(--text-dim);background:var(--bg-card);border-radius:12px;border:2px dashed var(--border);grid-column:1/-1">
                <div style="font-size:2rem;margin-bottom:10px">📭</div>
                <div data-i18n="noFeaturedTeams">No featured teams available</div>
            </div>`;
        return;
    }
    
    // Store teams data - deduplicate by author+name
    const seenTeams = new Set();
    featuredTeamsData = jsonData.filter(team => {
        const key = `${team.author || 'Unknown'}|${team.name || 'Unnamed'}`;
        if (seenTeams.has(key)) return false;
        seenTeams.add(key);
        return true;
    }).map(team => ({
        name: team.name || (t('unnamedTeam') || 'Unnamed team'),
        author: team.author || (t('unknown') || 'Unknown'),
        description: team.description || '',
        team: team.slots || team.team || [],  // Support new format (slots) and old format (team)
        _isArchive: team._isArchive || false
    }));
    
    // Separate regular teams from Archives
    const regularTeams = [];
    const archiveTeams = [];
    const regularTeamKeys = new Set();
    
    // First pass: collect regular teams
    featuredTeamsData.forEach(team => {
        const isArchive = team.folder === 'Archives' || 
                         team.category === 'Archives' || 
                         team.author === 'Archives' ||
                         team._isArchive === true;
        
        if (!isArchive) {
            regularTeams.push(team);
            regularTeamKeys.add(`${team.author}|${team.name}`);
        }
    });
    
    // Second pass: only add to archives if not already in regular
    featuredTeamsData.forEach(team => {
        const isArchive = team.folder === 'Archives' || 
                         team.category === 'Archives' || 
                         team.author === 'Archives' ||
                         team._isArchive === true;
        
        if (isArchive) {
            const key = `${team.author}|${team.name}`;
            // Skip if this team is already in regular teams
            if (!regularTeamKeys.has(key)) {
                archiveTeams.push(team);
            }
        }
    });
    
    // Group regular teams by author
    const byAuthor = {};
    regularTeams.forEach(team => {
        if (!byAuthor[team.author]) byAuthor[team.author] = [];
        byAuthor[team.author].push(team);
    });
    
    // Apply custom ordering for each author's teams
    for (const author in byAuthor) {
        byAuthor[author] = applyTeamOrder(byAuthor[author], author);
    }
    
    // Render regular teams
    const authorEntries = Object.entries(byAuthor);
    const toggleAllHtml = authorEntries.length > 1 ? `
        <div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-small" onclick="toggleAllAuthorFolders(true)" style="background:var(--bg-input)">${t('expandAll') || 'Expand all'}</button>
            <button class="btn btn-small" onclick="toggleAllAuthorFolders(false)" style="background:var(--bg-input)">${t('collapseAll') || 'Collapse all'}</button>
        </div>` : '';
    
    // Helper to render a team card
    const renderTeamCard = (team) => {
        const teamData = team.team || [];
        const pokemonHtml = teamData.map(p => {
            if (!p || !p.pokemon) return `<div style="width:48px;height:48px;background:var(--bg-input);border-radius:4px;opacity:0.3"></div>`;
            const displayName = pokemons[p.pokemon]?.displayName || format(p.pokemon);
            return `
            <div style="position:relative;display:inline-block" title="${escapeHtml(displayName)}">
                <img src="${p.shiny ? spriteShiny(p.pokemon) : sprite(p.pokemon)}" style="width:48px;height:48px;image-rendering:pixelated;${p.starSign ? getStellarStyle(p.starSign) : ''}" onerror="this.style.display='none'">
                ${p.shiny ? '<span style="position:absolute;top:0;right:0;font-size:0.7rem">✨</span>' : ''}
            </div>
        `}).join('');
        
        const globalIndex = featuredTeamsData.findIndex(t => t === team);
        const teamId = `team-${globalIndex}`;
        window.featuredTeamsCache = window.featuredTeamsCache || {};
        window.featuredTeamsCache[teamId] = team;
        
        // Get ratings - use simple hash for UTF-8 support
        const teamKey = (team.author + '|' + team.name).split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0).toString(16).substring(0, 16);
        const rating = ratings[teamKey] || { likes: 0, dislikes: 0 };
        
        // Get user's likes from localStorage
        const userLikes = JSON.parse(localStorage.getItem('userTeamLikes') || '{}');
        const isLiked = userLikes[teamKey];
        
        // Button style based on liked status
        const likeBtnStyle = isLiked 
            ? 'background:rgba(255,105,180,0.3);border-color:var(--accent-pink)' 
            : 'background:var(--bg-input);border-color:var(--accent-pink)';
        const likeBtnText = isLiked ? 'Liked' : 'Like';
        
        // Check if current user can delete
        const currentAuthor = localStorage.getItem('lastTeamAuthor') || '';
        const isAdmin = (currentAuthor === 'Undi' || currentAuthor === 'undi');
        const isOwner = currentAuthor === team.author;
        const canDelete = isOwner || isAdmin;
        // Member team = has flag OR file contains 'member_' OR _isMemberSubmitted in manifest
        const isMemberTeam = team._isMemberSubmitted || (team.file && team.file.includes('member_')) || isOwner;
        
        const deleteBtn = (canDelete && (isMemberTeam || isAdmin)) ? `
            <button class="btn btn-small" onclick="deleteOwnTeam('${escapeAttr(team.name)}', '${escapeAttr(team.author)}')" style="background:rgba(255,68,68,0.2);border-color:var(--danger);margin-left:auto" title="${isAdmin ? t('adminDelete') : t('deleteMyTeam')}">🗑️</button>
        ` : '';
        
        // Edit and reorder buttons for owner
        const editBtn = isOwner ? `
            <button class="btn btn-small" onclick="editOwnTeam('${escapeAttr(teamId)}')" style="background:rgba(102,126,234,0.2);border-color:var(--accent-blue)" title="${t('editTeam') || 'Modifier'}">✏️</button>
        ` : '';
        const reorderBtns = isOwner ? `
            <button class="btn btn-small" onclick="moveTeamUp('${escapeAttr(team.author)}', '${escapeAttr(team.name)}')" style="background:var(--bg-input);padding:4px 8px" title="${t('moveUp') || 'Monter'}">⬆️</button>
            <button class="btn btn-small" onclick="moveTeamDown('${escapeAttr(team.author)}', '${escapeAttr(team.name)}')" style="background:var(--bg-input);padding:4px 8px" title="${t('moveDown') || 'Descendre'}">⬇️</button>
        ` : '';
        
        return `
        <div class="team-card" data-team-name="${escapeAttr(team.name)}" style="padding:15px;border-bottom:1px solid var(--border);last:border-bottom:none">
            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
                ${pokemonHtml || '<div style="color:var(--text-dim);font-size:0.8rem">⚠️ Unable to preview</div>'}
            </div>
            <div class="team-card-name" style="font-weight:600;color:var(--text-main);margin-bottom:3px">${escapeHtml(team.name)}</div>
            ${team.description ? `<div class="team-card-desc" style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;font-style:italic">${escapeHtml(team.description)}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                <button class="btn btn-small" onclick="importFeaturedTeamById('${teamId}')" style="flex:1;background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,200,83,0.2));border-color:var(--success)">📥 ${t('useTeam') || 'Use'}</button>
                <button class="btn btn-small" onclick="shareFeaturedTeamById('${teamId}')" style="background:var(--bg-input)">🔗</button>
                <button class="btn btn-small" onclick="shareFeaturedTeamDiscordById('${teamId}')" style="background:#5865F2;color:#fff;display:flex;align-items:center;justify-content:center;gap:4px;padding:4px 10px" title="Share on Discord">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    Discord
                </button>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
                <button class="btn btn-small" id="like-btn-${teamKey}" onclick="likeTeam('${escapeAttr(team.name)}', '${escapeAttr(team.author)}')" style="${likeBtnStyle}">❤️ ${likeBtnText} <span id="likes-${teamKey}">${rating.likes || 0}</span></button>
                ${editBtn}
                ${reorderBtns}
                ${deleteBtn}
            </div>
        </div>
    `;
    };
    
    let html = toggleAllHtml + authorEntries.map(([author, teams]) => `
        <div class="featured-author-folder" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
            <div style="padding:12px 15px;background:linear-gradient(135deg,rgba(255,215,0,0.1),transparent);border-bottom:1px solid var(--border);cursor:pointer" onclick="toggleAuthorFolder('${escapeAttr(author)}')">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:700;color:var(--accent-gold)">👤 ${escapeHtml(author)}</div>
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:0.8rem;color:var(--text-dim)">${teams.length} team${teams.length > 1 ? 's' : ''}</span>
                        <span class="folder-icon" data-author="${escapeAttr(author)}" style="font-size:1.2rem">📁</span>
                    </div>
                </div>
            </div>
            <div class="folder-content" data-author="${escapeAttr(author)}" style="display:none">
                ${teams.map(renderTeamCard).join('')}
            </div>
        </div>
    `).join('');
    
    // Group archive teams by author
    const archivesByAuthor = {};
    archiveTeams.forEach(team => {
        if (!archivesByAuthor[team.author]) archivesByAuthor[team.author] = [];
        archivesByAuthor[team.author].push(team);
    });
    
    // Add Archives section if there are archive teams
    if (archiveTeams.length > 0) {
        const archiveAuthorEntries = Object.entries(archivesByAuthor);
        html += `
        <div style="grid-column:1/-1;margin-top:20px">
            <div class="archives-section featured-archives-folder" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;opacity:0.7">
                <div style="padding:10px 15px;background:linear-gradient(135deg,rgba(100,100,100,0.1),transparent);border-bottom:1px solid var(--border);cursor:pointer" onclick="toggleArchivesFolder()">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div style="font-weight:600;color:var(--text-dim);display:flex;align-items:center;gap:8px">
                            📦 ${t('archives') || 'Archives'}
                            <span style="font-size:0.75rem;color:var(--text-dim);opacity:0.7">(${t('oldVersions') || 'old versions'})</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:0.8rem;color:var(--text-dim)">${archiveTeams.length} team${archiveTeams.length > 1 ? 's' : ''} • ${archiveAuthorEntries.length} author${archiveAuthorEntries.length > 1 ? 's' : ''}</span>
                            <span id="archives-folder-icon" style="font-size:1.2rem">📁</span>
                        </div>
                    </div>
                </div>
                <div id="archives-folder-content" style="display:none;padding:10px">
                    ${archiveAuthorEntries.map(([author, teams]) => `
                        <div class="featured-author-folder" style="margin-bottom:10px;background:var(--bg-input);border-radius:8px;overflow:hidden">
                            <div style="padding:8px 12px;background:rgba(100,100,100,0.1);border-bottom:1px solid var(--border);cursor:pointer" onclick="toggleArchiveAuthorFolder('${escapeAttr(author)}')">
                                <div style="display:flex;justify-content:space-between;align-items:center">
                                    <div style="font-weight:600;color:var(--text-dim);font-size:0.9rem">👤 ${escapeHtml(author)}</div>
                                    <div style="display:flex;align-items:center;gap:8px">
                                        <span style="font-size:0.75rem;color:var(--text-dim)">${teams.length} team${teams.length > 1 ? 's' : ''}</span>
                                        <span class="archive-author-icon" data-author="${escapeAttr(author)}" style="font-size:1rem">📁</span>
                                    </div>
                                </div>
                            </div>
                            <div class="archive-author-content" data-author="${escapeAttr(author)}" style="display:none">
                                ${teams.map(renderTeamCard).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    }
    
    container.innerHTML = html;
    
    // Open author's folder if just submitted
    if (window.openAuthorAfterLoad) {
        const authorToOpen = window.openAuthorAfterLoad;
        window.openAuthorAfterLoad = null;
        setTimeout(() => {
            openAuthorFolder(authorToOpen);
            // Scroll to the author's folder
            const folder = document.querySelector(`.folder-content[data-author="${CSS.escape(authorToOpen)}"]`)?.closest('.featured-author-folder');
            if (folder) {
                folder.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }
}

function openAuthorFolder(author) {
    const content = document.querySelector(`.folder-content[data-author="${CSS.escape(author)}"]`);
    const icon = document.querySelector(`.folder-icon[data-author="${CSS.escape(author)}"]`);
    if (!content || !icon) return;
    content.style.display = 'block';
    icon.textContent = '📂';
}

function toggleAuthorFolder(author) {
    const content = document.querySelector(`.folder-content[data-author="${CSS.escape(author)}"]`);
    const icon = document.querySelector(`.folder-icon[data-author="${CSS.escape(author)}"]`);
    if (!content || !icon) return;
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '📂';
    } else {
        content.style.display = 'none';
        icon.textContent = '📁';
    }
}

function toggleArchivesFolder() {
    const content = document.getElementById('archives-folder-content');
    const icon = document.getElementById('archives-folder-icon');
    if (!content || !icon) return;
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '📂';
    } else {
        content.style.display = 'none';
        icon.textContent = '📁';
    }
}

function toggleArchiveAuthorFolder(author) {
    const content = document.querySelector(`.archive-author-content[data-author="${CSS.escape(author)}"]`);
    const icon = document.querySelector(`.archive-author-icon[data-author="${CSS.escape(author)}"]`);
    if (!content || !icon) return;
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '📂';
    } else {
        content.style.display = 'none';
        icon.textContent = '📁';
    }
}

// Filter featured teams by search term - filters individual teams, not entire folders
window.filterFeaturedTeams = function(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const folders = document.querySelectorAll('.featured-author-folder');
    const archiveSection = document.querySelector('.archives-section');
    
    if (!term) {
        // Show all folders and all teams inside
        folders.forEach(folder => {
            folder.style.display = '';
            // Hide individual team cards (restore default view)
            const teamCards = folder.querySelectorAll('.team-card');
            teamCards.forEach(card => card.style.display = '');
            // Collapse folders back to default
            const content = folder.querySelector('.folder-content');
            const icon = folder.querySelector('.folder-icon');
            if (content) content.style.display = 'none';
            if (icon) icon.textContent = '📁';
        });
        if (archiveSection) archiveSection.style.display = '';
        return;
    }
    
    folders.forEach(folder => {
        const authorName = folder.querySelector('[style*="font-weight:700"]')?.textContent?.toLowerCase() || '';
        const matchAuthor = authorName.includes(term);
        
        // Get all team cards in this folder
        const teamCards = folder.querySelectorAll('.team-card');
        let hasVisibleTeam = false;
        
        teamCards.forEach(card => {
            const teamName = card.querySelector('.team-card-name')?.textContent?.toLowerCase() || '';
            const teamDesc = card.querySelector('.team-card-desc')?.textContent?.toLowerCase() || '';
            const pokemonNames = Array.from(card.querySelectorAll('img')).map(img => {
                const title = img.closest('[title]')?.getAttribute('title')?.toLowerCase() || '';
                return title;
            });
            
            const matchTeam = teamName.includes(term);
            const matchDesc = teamDesc.includes(term);
            const matchPokemon = pokemonNames.some(name => name.includes(term));
            
            // Show/hide individual team card
            const shouldShow = matchAuthor || matchTeam || matchDesc || matchPokemon;
            card.style.display = shouldShow ? '' : 'none';
            if (shouldShow) hasVisibleTeam = true;
        });
        
        // Show folder only if it has visible teams
        folder.style.display = hasVisibleTeam ? '' : 'none';
        
        // Auto-expand folder if it has matches and we're searching
        if (hasVisibleTeam) {
            const content = folder.querySelector('.folder-content');
            const icon = folder.querySelector('.folder-icon');
            if (content) content.style.display = 'block';
            if (icon) icon.textContent = '📂';
        }
    });
    
    // Also filter archives if present
    if (archiveSection) {
        const archiveFolders = archiveSection.querySelectorAll('.featured-author-folder');
        let hasVisibleArchive = false;
        archiveFolders.forEach(folder => {
            const authorName = folder.querySelector('[style*="font-weight:700"]')?.textContent?.toLowerCase() || '';
            const matchAuthor = authorName.includes(term);
            
            const teamCards = folder.querySelectorAll('.team-card');
            let hasVisibleTeam = false;
            
            teamCards.forEach(card => {
                const teamName = card.querySelector('.team-card-name')?.textContent?.toLowerCase() || '';
                const teamDesc = card.querySelector('.team-card-desc')?.textContent?.toLowerCase() || '';
                
                const matchTeam = teamName.includes(term);
                const matchDesc = teamDesc.includes(term);
                const shouldShow = matchAuthor || matchTeam || matchDesc;
                
                card.style.display = shouldShow ? '' : 'none';
                if (shouldShow) hasVisibleTeam = true;
            });
            
            folder.style.display = hasVisibleTeam ? '' : 'none';
            if (hasVisibleTeam) {
                hasVisibleArchive = true;
                const content = folder.querySelector('.folder-content');
                const icon = folder.querySelector('.folder-icon');
                if (content) content.style.display = 'block';
                if (icon) icon.textContent = '📂';
            }
        });
        archiveSection.style.display = hasVisibleArchive ? '' : 'none';
    }
};

function toggleAllAuthorFolders(expand) {
    document.querySelectorAll('.folder-content').forEach(el => {
        el.style.display = expand ? 'block' : 'none';
    });
    document.querySelectorAll('.folder-icon').forEach(el => {
        el.textContent = expand ? '📂' : '📁';
    });
}

// Import team from JSON data (new system)
function importFeaturedTeamJSON(teamData, name, author, description) {
    try {
        if (!teamData || teamData.length === 0) throw new Error('Invalid team data');
        
        // Load into dreamTeam directly from JSON
        dreamTeam = teamData.map(p => {
            if (!p || !p.pokemon) {
                return { pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } };
            }
            return {
                pokemon: p.pokemon,
                shiny: p.shiny || false,
                starSign: p.starSign || null,
                nature: p.nature || null,
                ability: p.ability || null,
                item: p.item || null,
                moves: p.moves || [null, null, null, null],
                ivs: p.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
            };
        });
        
        // Fill empty slots
        while (dreamTeam.length < 6) {
            dreamTeam.push({ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } });
        }
        
        renderDreamTeam();
        showSharedTeamInfo(name, author, description);
        switchTab('team');
        switchTeamSubtab('builder');
        alert(t('featuredTeamLoaded') || 'Featured team loaded!');
        
    } catch (err) {
        console.error('Featured team import error:', err);
        alert(t('teamLoadError') || 'Loading error: ' + err.message);
    }
}

// Import team by ID from cache (used by the UI)
function importFeaturedTeamById(teamId) {
    const team = window.featuredTeamsCache?.[teamId];
    if (!team) {
        console.error('Team not found in cache:', teamId);
        alert(t('teamLoadError') || 'Loading error: Team not found');
        return;
    }
    importFeaturedTeamJSON(team.team, team.name, team.author, team.description);
}

// Share team by ID from cache - generates shareable link
function shareFeaturedTeamById(teamId) {
    const team = window.featuredTeamsCache?.[teamId];
    if (!team) {
        console.error('Team not found in cache:', teamId);
        return;
    }
    
    // Use new JSON-based compact sharing
    const teamData = {
        name: team.name,
        author: team.author,
        description: team.description,
        slots: team.team.map(p => ({
            pokemon: p?.pokemon || null,
            shiny: p?.shiny || false,
            ability: p?.ability || null,
            item: p?.item || null,
            moves: p?.moves || [null, null, null, null]
        }))
    };
    
    const encoded = encodeTeamCompact(teamData);
    const url = `${window.location.origin}${window.location.pathname}#tab=team&team=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert(t('linkCopied') || 'Lien copié !');
    });
}

function shareFeaturedTeamDiscordById(teamId) {
    const team = window.featuredTeamsCache?.[teamId];
    if (!team) {
        console.error('Team not found in cache:', teamId);
        return;
    }
    
    // Use new JSON-based compact sharing
    const teamData = {
        name: team.name,
        author: team.author,
        description: team.description,
        slots: team.team.map(p => ({
            pokemon: p?.pokemon || null,
            shiny: p?.shiny || false,
            starSign: p?.starSign || null,
            nature: p?.nature || null, // nature (v4.8)
            ability: p?.ability || null,
            item: p?.item || null,
            moves: p?.moves || [null, null, null, null],
            ivs: p?.ivs || { hp: 6, atk: 6, def: 6, satk: 6, sdef: 6, spe: 6 }
        }))
    };
    
    const encoded = encodeTeamCompact(teamData);
    const url = `${window.location.origin}${window.location.pathname}#tab=team&team=${encoded}`;
    
    // Discord markdown format: [Team Name by Author](url)
    const discordMessage = `[${team.name} by ${team.author}](${url})`; 
    
    navigator.clipboard.writeText(discordMessage).then(() => {
        alert(t('discordCopied'));
    });
}

// Legacy: Import team from code (for backward compatibility with old URLs)
function importFeaturedTeam(teamCode) {
    // Decode team code and load into builder
    try {
        // Check if this is a legacy code that needs migration
        const isLegacy = teamCode.length > 0 && B64_CHARS.includes(teamCode[0]);
        let actualTeamCode = teamCode;
        
        if (isLegacy) {
            // Try to migrate legacy code to new format
            const migration = migrateLegacyTeamCode(teamCode);
            if (migration.success && migration.newCode !== teamCode) {
                actualTeamCode = migration.newCode;
                console.log('Team code migrated from legacy to version B');
            }
        }
        
        // Use team code directly - it's already properly decoded by JavaScript when passed from HTML
        const teamData = unpackTeam(actualTeamCode);
        if (!teamData || teamData.length === 0) throw new Error('Invalid team code');
        
        // Determine version from team code to use correct tables
        const version = (actualTeamCode.length > 0 && !B64_CHARS.includes(actualTeamCode[0]) && actualTeamCode[0] >= 'A' && actualTeamCode[0] <= 'Z') 
            ? actualTeamCode[0] 
            : 'A';
        
        // Convert indices to names using the appropriate lookup tables for this version
        const tables = (version === TEAM_CODE_VERSION) ? buildStableTables() : buildLegacyTables();
        
        // Load into dreamTeam
        dreamTeam = teamData.map((slot, idx) => {
            if (!slot || slot[0] === 0) return { pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null };
            
            const pkmnIdx = slot[0];
            const pkmnName = tables._reverse.pokemon[pkmnIdx] || null;
            
            if (!pkmnName || !pokemons[pkmnName]) {
                return { pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null };
            }
            
            const abilityIdx = slot[2];
            const itemIdx = slot[3];
            const moveIndices = [slot[4], slot[5], slot[6], slot[7]];
            
            const abilityName = tables._reverse.ability[abilityIdx] || null;
            const itemName = tables._reverse.item[itemIdx] || null;
            const moveNames = moveIndices.map(mIdx => tables._reverse.move[mIdx] || null);
            
            return {
                pokemon: pkmnName,
                shiny: slot[1] === 1,
                ability: abilityName,
                item: itemName,
                moves: moveNames
            };
        });
        
        // Fill empty slots
        while (dreamTeam.length < 6) {
            dreamTeam.push({ pokemon: null, moves: [null, null, null, null], ability: null, item: null, shiny: false, starSign: null, nature: null, ivs: { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 } });
        }
        
        renderDreamTeam();
        // Show team info in builder
        const teamInfo = featuredTeamsData.find(ft => ft.code === teamCode);
        if (teamInfo) showSharedTeamInfo(teamInfo.name, teamInfo.author, teamInfo.description);
        switchTeamSubtab('builder');
        alert(t('featuredTeamLoaded') || 'Featured team loaded!');

    } catch (err) {
        console.error('Featured team import error:', err);
        alert(t('teamLoadError') || 'Loading error: ' + err.message);
    }
}

function encodeTeamInfo(name, author, description) {
    const str = [name || '', author || '', description || ''].join('\n');
    const bytes = new TextEncoder().encode(str);
    let b = '';
    bytes.forEach(v => b += String.fromCharCode(v));
    return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeTeamInfo(encoded) {
    try {
        const b = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
        return new TextDecoder().decode(bytes).split('\n');
    } catch (e) { return []; }
}

function showSharedTeamInfo(name, author, description) {
    const infoDiv = document.getElementById('shared-team-info');
    if (!name && !author && !description) { infoDiv.style.display = 'none'; return; }
    infoDiv.innerHTML = `
        <button onclick="this.parentElement.style.display='none'" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1.2rem">✖️</button>
        <div style="font-weight:700;font-size:1.1rem;color:var(--accent-gold);margin-bottom:4px">⭐ ${escapeHtml(name)}</div>
        ${author ? `<div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:6px">👤 ${escapeHtml(author)}</div>` : ''}
        ${description ? `<div style="font-size:0.9rem;color:var(--text-main);font-style:italic">${escapeHtml(description)}</div>` : ''}
    `;
    infoDiv.style.display = 'block';
}

function shareFeaturedTeam(code, name, author, description) {
    let url = `${window.location.origin}${window.location.pathname}#tab=team&team=${code}`;
    if (name || author || description) url += `&ti=${encodeTeamInfo(name, author, description)}`;
    navigator.clipboard.writeText(url).then(() => {
        alert(t('linkCopied') || 'Lien copié !');
    });
}


// Switch to a specific tab by name
function switchTab(tabName) {
    const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (tab) {
        tab.click();
    }
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-panel').classList.add('active');
        
        // Reset zones subtabs when leaving zones tab
        if (tab.dataset.tab !== 'zones') {
            resetZonesSubtabs();
        }
        
        // Update URL hash
        const filters = getTabFilterValues(tab.dataset.tab);
        updateURLHash(tab.dataset.tab, filters);
        
        // Render active zones when switching to that tab
        if (tab.dataset.tab === 'active' && dataLoaded) {
            renderActiveZones();
        }
        // Load dimension zones when switching to that tab
        if (tab.dataset.tab === 'dimension' && dataLoaded) {
            searchDimensionZones();
        }
        // Load seasonal zones when switching to that tab
        if (tab.dataset.tab === 'seasonal' && dataLoaded) {
            searchSeasonalZones();
        }
        // Check for limited shop items when switching to shop tab
        if (tab.dataset.tab === 'shop' && dataLoaded) {
            updateLimitedShopButton();

        }
        // Initialize damage calculator when switching to that tab
        if (tab.dataset.tab === 'damage' && dataLoaded) {
            initDamageCalc();
        }
        // Initialize savezone when switching to that tab
        if (tab.dataset.tab === 'savezone') {
            initSavezone();
        }
        // Load member teams when switching to that tab
        if (tab.dataset.tab === 'member-teams') {
            loadFeaturedTeams();
        }
        // Initialize accessory tab when switching to it
        if (tab.dataset.tab === 'accessory' && dataLoaded) {
            initAccessoryTab();
        }
        // Populate frontier pokemon list when switching to that tab
        if (tab.dataset.tab === 'frontier' && dataLoaded) {
            populateFrontierPokemon();
        }
        // Render build slot when switching to build tab
        if (tab.dataset.tab === 'build' && dataLoaded) {
            renderBuildSlot();
        }
        // Populate frontier content when switching to that subtab
        if (tab.dataset.tab === 'frontier' && dataLoaded) {
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

// Modal
function openModal(title, content) { document.getElementById('modal-title').innerHTML = title; document.getElementById('modal-body').innerHTML = content; document.getElementById('modal').classList.add('show'); }
function closeModal(e) { if (!e || e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('show'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Helpers
function sprite(name, shiny = false) { 
    const folder = shiny ? 'shiny' : 'sprite';
    return `${CONFIG.repoBase}img/pkmn/${folder}/${name}.png`; 
}
function formatDifficultyBadge(difficulty, small = false, block = false) {
    if (!difficulty || difficulty <= 0) return '';
    let tierNum = 0, tierColor = '';
    if (difficulty >= 600) { tierNum = 4; tierColor = '#ff4444'; }
    else if (difficulty >= 200) { tierNum = 3; tierColor = '#ff8800'; }
    else if (difficulty >= 70) { tierNum = 2; tierColor = '#ffd700'; }
    else if (difficulty >= 25) { tierNum = 1; tierColor = '#00ff88'; }
    const stars = '★'.repeat(tierNum);
    const fontSize = small ? '0.7rem' : '0.75rem';
    const padding = small ? '2px 6px' : '3px 8px';
    const badge = `<span style="padding:${padding};background:${tierColor}20;border:1px solid ${tierColor}60;border-radius:3px;font-size:${fontSize};color:${tierColor};font-weight:700">${stars}</span>`;
    return block ? `<div style="margin-top:4px">${badge}</div>` : badge;
}
function spriteShiny(name) { return `${CONFIG.repoBase}img/pkmn/shiny/${name}.png`; }

// Generate nature-colored stars for BST display (like in-game)
// Boosted: base stars + 1 green | Reduced: base-1 stars, last one is red
function getNatureColoredStars(bst, natureName) {
    const nature = natureName ? GAME_CONFIG.NATURES?.[natureName] : null;
    const baseStars = {
        hp: statToStars(bst.hp),
        atk: statToStars(bst.atk),
        def: statToStars(bst.def),
        satk: statToStars(bst.satk),
        sdef: statToStars(bst.sdef),
        spe: statToStars(bst.spe)
    };
    
    const adjustments = { hp: 0, atk: 0, def: 0, satk: 0, sdef: 0, spe: 0 };
    
    if (nature) {
        Object.entries(nature).forEach(([stat, mod]) => {
            if (stat === 'name') return;
            if (mod > 0) adjustments[stat] = 1;
            if (mod < 0) adjustments[stat] = -1;
        });
    }
    
    // Build colored stars for each stat
    const buildStars = (stat) => {
        const base = baseStars[stat];
        const adj = adjustments[stat];
        const final = Math.min(6, Math.max(0, base + adj));
        
        let starsHtml = '';
        
        if (adj > 0) {
            // Boosted: all base stars in blue, then 1 green
            for (let i = 0; i < base; i++) {
                starsHtml += `<span style="color:#00d4ff">★</span>`;
            }
            starsHtml += `<span style="color:#00ff88">★</span>`;
        } else if (adj < 0) {
            // Reduced: base-1 blue stars, then 1 red (total = base-1 stars)
            const blueCount = Math.max(0, final - 1); // All except last
            const hasRed = final > 0; // Last one is red
            
            for (let i = 0; i < blueCount; i++) {
                starsHtml += `<span style="color:#00d4ff">★</span>`;
            }
            if (hasRed) {
                starsHtml += `<span style="color:#ff4444">★</span>`;
            }
        } else {
            // Neutral: all stars in blue
            for (let i = 0; i < base; i++) {
                starsHtml += `<span style="color:#00d4ff">★</span>`;
            }
        }
        
        return { html: starsHtml, adjusted: adj, final };
    };
    
    const result = {
        hp: buildStars('hp'),
        atk: buildStars('atk'),
        def: buildStars('def'),
        satk: buildStars('satk'),
        sdef: buildStars('sdef'),
        spe: buildStars('spe')
    };
    
    result.total = result.hp.final + result.atk.final + result.def.final + result.satk.final + result.sdef.final + result.spe.final;
    
    return result;
}

// v4.8: Check if a nature is available for a Pokemon based on its stats
// Rules: Adamant requires ATK <= SATK, Modest requires ATK >= SATK
function isNatureAvailable(pokemon, natureName) {
    if (!natureName || !pokemon || !pokemon.bst) return true;
    
    const bst = pokemon.bst;
    const atkStars = statToRating(bst.atk || 0);
    const satkStars = statToRating(bst.satk || 0);
    
    // Adamant: +ATK / -SATK - only available if ATK <= SATK
    if (natureName === 'adamant') {
        return atkStars <= satkStars;
    }
    
    // Modest: +SATK / -ATK - only available if ATK >= SATK
    if (natureName === 'modest') {
        return atkStars >= satkStars;
    }
    
    // All other natures are always available
    return true;
}

// v4.7: Star Sign (Stellar) sprites with hue rotation
function spriteStellar(name, starSignType) {
    const hue = GAME_CONFIG.STAR_SIGNS?.[starSignType]?.hue || 0;
    return `${CONFIG.repoBase}img/pkmn/shiny/${name}.png`;
}

function getStellarStyle(starSignType) {
    const hue = GAME_CONFIG.STAR_SIGNS?.[starSignType]?.hue || 0;
    return `filter: hue-rotate(${hue}deg);`;
}

// Modal Shiny/Star Sign Toggle Functions (v4.8)
function toggleModalShiny(name) {
    const checkbox = document.getElementById('modal-shiny-toggle');
    const starSignContainer = document.getElementById('modal-starsign-container');
    if (!checkbox || !starSignContainer) return;
    
    // Star Sign can be selected even without shiny
    starSignContainer.style.display = 'inline-block';
    updateModalSprite(name);
}

function updateModalSprite(name) {
    const spriteImg = document.getElementById('modal-sprite');
    const shinyCheckbox = document.getElementById('modal-shiny-toggle');
    const starSignSelect = document.getElementById('modal-starsign-select');
    if (!spriteImg || !shinyCheckbox) return;
    
    const isShiny = shinyCheckbox.checked;
    const starSign = starSignSelect?.value || '';
    
    if (isShiny) {
        spriteImg.src = spriteShiny(name);
    } else {
        spriteImg.src = sprite(name);
    }
    // Apply Star Sign hue-rotate even without shiny
    if (starSign && GAME_CONFIG.STAR_SIGNS?.[starSign]) {
        spriteImg.style.filter = `hue-rotate(${GAME_CONFIG.STAR_SIGNS[starSign].hue}deg)`;
    } else {
        spriteImg.style.filter = '';
    }
}

function getObtainIcon(obt) {
    const icons = { wild: '🌿', event: '⭐', mart: '🛒', park: '🏞️', frontier: '🏆', evolve: '🔄', unobtainable: '❌', secret: '❓' };
    return icons[obt] || '?';
}
function getObtainLabel(obt) {
    const labels = { wild: 'obtWild', event: 'obtEvent', mart: 'obtMart', park: 'obtPark', frontier: 'obtFrontier', evolve: 'obtEvolve', unobtainable: 'obtUnavailable', secret: 'obtSecret' };
    return t(labels[obt] || 'obtUnavailable') || obt || '?';
}


// Update check
let lastDataTimestamp = null;
async function checkForUpdates() {
    try {
        const response = await fetch(`${CONFIG.repoBase}scripts/pkmnDictionary.js`, { cache: 'no-store' });
        if (!response.ok) return;
        const content = await response.text();
        const currentHash = content.length + content.slice(0, 100);
        if (lastDataTimestamp === null) {
            lastDataTimestamp = currentHash;
        } else if (lastDataTimestamp !== currentHash) {
            document.getElementById('update-banner').classList.add('show');
        }
    } catch (e) {}
}
// Check for updates every 5 minutes
setInterval(checkForUpdates, 5 * 60 * 1000);
function itemImg(name) { return `${CONFIG.repoBase}img/items/${name}.png`; }
function typeBadge(ty) { return `<span class="type-badge type-${ty}">${ty}</span>`; }
function divBadge(div) { return `<span class="division-badge div-${div.toLowerCase()}">${div}</span>`; }
function splitBadge(sp) { return `<span class="split-badge split-${sp}">${sp}</span>`; }

function obtainBadge(obt) {
    const badges = {
        wild: { icon: '🌿', color: '#78C850', label: t('obtWild') },
        event: { icon: '⭐', color: '#F8D030', label: t('obtEvent') },
        mart: { icon: '🛒', color: '#6890F0', label: t('obtMart') },
        park: { icon: '🏞️', color: '#A890F0', label: t('obtPark') },
        frontier: { icon: '🏆', color: '#F85888', label: t('obtFrontier') },
        evolve: { icon: '🔄', color: '#A8A878', label: t('obtEvolve') },
        secret: { icon: '🔒', color: '#9400D3', label: t('obtSecret') || 'Secret' },
        unobtainable: { icon: '❌', color: '#705848', label: t('obtUnavailable') }
    };
    const b = badges[obt] || badges.unobtainable;
    // Add onclick for secret badge
    const onclick = obt === 'secret' ? `onclick="event.stopPropagation();showSecretInfo()" style="cursor:pointer;"` : '';
    return `<span class="obtain-badge" style="background:${b.color}20;color:${b.color};border:1px solid ${b.color}40;padding:2px 6px;border-radius:4px;font-size:0.7rem" title="${b.label}" ${onclick}>${b.icon}</span>`;
}
function rarityBadge(r, isSig = false, isEgg = false) { 
    let badges = '';
    if (isEgg) badges += '<span class="rarity rarity-egg">Egg Move</span>';
    if (isSig) badges += '<span class="rarity rarity-sig">Signature</span>';
    if (!isEgg && !isSig) {
        const names = { 1: t('common'), 2: t('uncommon'), 3: t('rare') }; 
        badges = `<span class="rarity rarity-${r}">${names[r] || r}</span>`; 
    }
    return badges;
}

// Expose functions globally
window.loadFeaturedTeams = loadFeaturedTeams;
window.filterFeaturedTeams = filterFeaturedTeams;
