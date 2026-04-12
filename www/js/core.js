// Core functions - loaded first
function calculateRotations() {
    const now = new Date();
    const utcTime = now.getTime();
    const dayNumber = Math.floor(utcTime / (1000 * 60 * 60 * 24));
    
    const wildRotation = dayNumber % 12;
    const dungeonRotation = (dayNumber + 4) % 12;
    const eventRotation = dayNumber % 6;
    const frontierRotation = (dayNumber + 2) % 4;
    const dimensionRotation = dayNumber % 5;
    
    return {
        wild: wildRotation,
        dungeon: dungeonRotation,
        event: eventRotation,
        frontier: frontierRotation,
        dimension: dimensionRotation
    };
}

async function loadUserPreference(key, defaultValue = false) {
    try {
        const stored = localStorage.getItem('pokechill_pref_' + key);
        return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

async function saveUserPreference(key, value) {
    try {
        localStorage.setItem('pokechill_pref_' + key, JSON.stringify(value));
    } catch (e) {
        console.error('Failed to save preference:', e);
    }
}