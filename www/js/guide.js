function initGuide() {
    const firstSection = document.querySelector('.guide-section');
    if (firstSection && !firstSection.classList.contains('open')) {
        firstSection.classList.add('open');
    }
}
function toggleGuideSection(header) {
    const section = header.parentElement;
    section.classList.toggle('open');
    
    // Update URL hash for sharing if opening a section
    if (section.classList.contains('open')) {
        const title = header.querySelector('.guide-title')?.textContent.trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
            .replace(/\s+/g, '-'); // Replace spaces with dashes
        if (title) {
            window.location.hash = `tab=guide&section=${encodeURIComponent(title)}`;
        }
    }
}
function expandAllGuide() {
    document.querySelectorAll('.guide-section').forEach(s => s.classList.add('open'));
}
function collapseAllGuide() {
    document.querySelectorAll('.guide-section').forEach(s => s.classList.remove('open'));
}
function searchGuide() {
    const query = document.getElementById('guide-search')?.value.toLowerCase() || '';
    const sections = document.querySelectorAll('.guide-section');
    const noResults = document.getElementById('guide-no-results');
    let hasResults = false;
    sections.forEach(section => {
        const keywords = section.dataset.keywords || '';
        const title = section.querySelector('.guide-title')?.textContent.toLowerCase() || '';
        const content = section.querySelector('.guide-content')?.textContent.toLowerCase() || '';
        if (!query || keywords.includes(query) || title.includes(query) || content.includes(query)) {
            section.style.display = '';
            if (query) {
                section.classList.add('highlighted');
                setTimeout(() => section.classList.remove('highlighted'), 2000);
            }
            hasResults = true;
        } else {
            section.style.display = 'none';
        }
    });
    if (noResults) noResults.style.display = hasResults ? 'none' : 'block';
}
function setTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('halloween-theme', 'mega-dimension-theme', 'game-theme');
    
    // Add selected theme class
    if (theme !== 'default') {
        document.body.classList.add(theme + '-theme');
    }
    
    // Save preference
    localStorage.setItem('pokechill-theme', theme);
    
    // Update select element
    const select = document.getElementById('theme-select');
    if (select) select.value = theme;
}

// Legacy function for backwards compatibility
function toggleHalloweenTheme() { 
    const currentTheme = localStorage.getItem('pokechill-theme') || 'mega-dimension';
    const newTheme = currentTheme === 'halloween' ? 'mega-dimension' : 'halloween';
    setTheme(newTheme);
}
// Helper function to check if a season is currently active based on seasonDates
function isSeasonActive(seasonDates) {
    if (!seasonDates || !seasonDates.start || !seasonDates.end) return false;
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const s = seasonDates.start, e = seasonDates.end;
    if (s.month <= e.month) {
        return (month > s.month || (month === s.month && day >= s.day)) && 
               (month < e.month || (month === e.month && day <= e.day));
    } else {
        return (month > s.month || (month === s.month && day >= s.day)) || 
               (month < e.month || (month === e.month && day <= e.day));
    }
}

function isHalloweenActive() {
    const now = new Date();
    return now.getMonth() + 1 === 10;
}

// Load theme from storage (default to mega-dimension for new users)
const savedTheme = localStorage.getItem('pokechill-theme') || 'mega-dimension';

// Apply theme after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (savedTheme !== 'default') {
        document.body.classList.add(savedTheme + '-theme');
    }
    // Legacy: also check old halloween key
    if (localStorage.getItem('pokechill-halloween') === '1' && savedTheme === 'mega-dimension') {
        document.body.classList.add('halloween-theme');
        localStorage.setItem('pokechill-theme', 'halloween');
    }
    // Set select value
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
});
function applyI18n() { 
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        const key = el.dataset.i18n;
        if (key) el.textContent = t(key); 
    }); 
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { 
        const key = el.dataset.i18nPlaceholder;
        if (key) el.placeholder = t(key); 
    });
    // Update theme select options
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        const options = themeSelect.querySelectorAll('option[data-i18n]');
        options.forEach(opt => {
            const key = opt.dataset.i18n;
            if (key) opt.textContent = t(key);
        });
    }
    const lb = document.getElementById('lang-btn'); 
    if (lb) lb.textContent = currentLang === 'fr' ? '🔁 English' : '🔁 Français'; 
    // Update swipe hint text for mobile tabs
    const tabsContainer = document.querySelector('.tabs-container');
    if (tabsContainer) tabsContainer.dataset.swipeText = t('swipeTabs');
    updateDamageCalcCredits(); 
    if (typeof exchangeUpdateImpactLists === 'function') exchangeUpdateImpactLists(); 
    // Re-render build slot to update dropdown options
    if (typeof renderBuildSlot === 'function' && buildSlot && buildSlot[0]?.pokemon) { renderBuildSlot(); }
    // Update dream team slots if visible
    if (typeof renderDreamTeam === 'function' && document.getElementById('dream-team')?.offsetParent) { renderDreamTeam(); }
    // Update challenges modal if visible
    if (typeof refreshChallengesLang === 'function') { refreshChallengesLang(); }
}

function updateDamageCalcCredits() {
    const el = document.getElementById('dmg-credits');
    if (!el) return;
    el.innerHTML = t('damageCalcCredit');
}