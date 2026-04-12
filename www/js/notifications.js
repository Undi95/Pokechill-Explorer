function getRotationTimeRemaining() {
    const now = new Date();
    const utcTime = now.getTime();
    
    // Wild/Dungeon: every 12 hours (at 00:00 and 12:00 UTC)
    const next12h = Math.ceil(utcTime / (1000 * 60 * 60 * 12)) * (1000 * 60 * 60 * 12);
    const wildDungeonRemaining = next12h - utcTime;
    
    // Event/Frontier/Dimension: every 3 days (based on dayNumber)
    const dayNumber = Math.floor(utcTime / (1000 * 60 * 60 * 24));
    const currentPeriod = Math.floor(dayNumber / 3);
    const nextPeriodStart = (currentPeriod + 1) * 3 * (1000 * 60 * 60 * 24);
    const eventRemaining = nextPeriodStart - utcTime;
    
    return {
        wild: wildDungeonRemaining,
        dungeon: wildDungeonRemaining,
        event: eventRemaining,
        frontier: eventRemaining,
        dimension: eventRemaining
    };
}

// Format milliseconds to XX:XX:XX format
function formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Live countdown for rotation timers
let countdownInterval = null;
function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdownDisplay, 1000);
}

function updateCountdownDisplay() {
    const timeRemaining = getRotationTimeRemaining();
    
    const timers = [
        { id: 'timer-wild', ms: timeRemaining.wild },
        { id: 'timer-dungeon', ms: timeRemaining.dungeon },
        { id: 'timer-event', ms: timeRemaining.event },
        { id: 'timer-frontier', ms: timeRemaining.frontier },
        { id: 'timer-dimension', ms: timeRemaining.dimension }
    ];
    
    timers.forEach(timer => {
        const el = document.getElementById(timer.id);
        if (el) {
            el.innerHTML = '⏳ ' + formatTimeRemaining(timer.ms);
        }
    });
}

function calculateRotations() {
    const now = new Date();
    const utcTime = now.getTime();
    const halfDayNumber = Math.floor(utcTime / (1000 * 60 * 60 * 12));
    const dayNumber = Math.floor(utcTime / (1000 * 60 * 60 * 24));
    const period = Math.floor(dayNumber / 3);
    
    // Check if Lusamine is defeated (unlocks 4th rotation)
    const lusamineDefeated = localStorage.getItem('pokechill_lusamine_defeated') === 'true';
    ROTATION_MAX.frontier = lusamineDefeated ? 4 : 3;
    
    currentRotations.wild = ((halfDayNumber - 6) % ROTATION_MAX.wild) + 1;
    currentRotations.dungeon = (halfDayNumber % ROTATION_MAX.dungeon) + 1;
    currentRotations.event = ((period - 3) % ROTATION_MAX.event) + 1;
    currentRotations.frontier = (period % ROTATION_MAX.frontier) + 1;
    currentRotations.dimension = ROTATION_MAX.dimension > 1 ? (period % ROTATION_MAX.dimension) + 1 : 1;
    
    // Ensure positive values
    if (currentRotations.wild <= 0) currentRotations.wild += ROTATION_MAX.wild;
    if (currentRotations.event <= 0) currentRotations.event += ROTATION_MAX.event;
    
    return currentRotations;
}

// ============ ROTATION NOTIFICATIONS ============
let rotationCheckInterval = null;
let lastNotifiedRotations = {};

// Request notification permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert(t('notificationsNotSupported'));
        return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        localStorage.setItem('pokechill_rotation_notifications', 'enabled');
        saveUserPreference('rotation_notifications', true);
        startRotationNotifications();
        alert(t('notificationsEnabled'));
    } else {
        localStorage.setItem('pokechill_rotation_notifications', 'disabled');
        saveUserPreference('rotation_notifications', false);
        stopRotationNotifications();
    }
    await updateNotificationButton();
}

// Toggle rotation notifications
async function toggleRotationNotifications() {
    const current = (localStorage.getItem('pokechill_rotation_notifications') === 'enabled') || await loadUserPreference('rotation_notifications', false);
    if (current) {
        localStorage.setItem('pokechill_rotation_notifications', 'disabled');
        saveUserPreference('rotation_notifications', false);
        stopRotationNotifications();
        alert(t('notificationsDisabled'));
    } else {
        await requestNotificationPermission();
    }
    await updateNotificationButton();
}

// Start checking for upcoming rotations
async function startRotationNotifications() {
    if (rotationCheckInterval) clearInterval(rotationCheckInterval);
    
    // Check every minute
    rotationCheckInterval = setInterval(() => checkUpcomingRotations(), 60000);
    await checkUpcomingRotations(); // Check immediately
}

// Stop checking
function stopRotationNotifications() {
    if (rotationCheckInterval) {
        clearInterval(rotationCheckInterval);
        rotationCheckInterval = null;
    }
}

// Check if any rotation is about to change (within 15 minutes)
async function checkUpcomingRotations() {
    const notifEnabled = (localStorage.getItem('pokechill_rotation_notifications') === 'enabled') || await loadUserPreference('rotation_notifications', false);
    if (!notifEnabled) return;
    if (Notification.permission !== 'granted') return;
    
    const timeRemaining = getRotationTimeRemaining();
    const fifteenMinutes = 15 * 60 * 1000;
    
    const rotations = [
        { name: 'Wild', key: 'wild', remaining: timeRemaining.wild },
        { name: 'Dungeon', key: 'dungeon', remaining: timeRemaining.dungeon },
        { name: 'Event', key: 'event', remaining: timeRemaining.event },
        { name: 'Frontier', key: 'frontier', remaining: timeRemaining.frontier }
    ];
    
    rotations.forEach(rot => {
        // Notify if less than 15 minutes remaining and not already notified for this rotation cycle
        if (rot.remaining <= fifteenMinutes && rot.remaining > 0) {
            const notificationKey = `notified_${rot.key}_${Math.floor(Date.now() / (rot.key === 'event' || rot.key === 'frontier' ? 259200000 : 43200000))}`;
            
            if (!localStorage.getItem(notificationKey)) {
                // Use Service Worker notification if available, otherwise fallback to regular Notification
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification('PokeChill Explorer - Rotation Alert', {
                            body: `La rotation ${rot.name} va changer dans ${formatTimeRemaining(rot.remaining)} !`,
                            icon: 'https://play-pokechill.github.io/img/ui/favicon.png',
                            badge: 'https://play-pokechill.github.io/img/ui/favicon.png',
                            tag: rot.key,
                            requireInteraction: true,
                            renotify: true,
                            actions: [
                                { action: 'open', title: 'Ouvrir le site' }
                            ]
                        });
                    });
                } else {
                    new Notification('PokeChill Explorer - Rotation Alert', {
                        body: `La rotation ${rot.name} va changer dans ${formatTimeRemaining(rot.remaining)} !`,
                        icon: 'https://play-pokechill.github.io/img/ui/favicon.png',
                        badge: 'https://play-pokechill.github.io/img/ui/favicon.png',
                        tag: rot.key,
                        requireInteraction: true
                    });
                }
                
                localStorage.setItem(notificationKey, 'true');
                // Clean up old notification keys after 1 hour
                setTimeout(() => localStorage.removeItem(notificationKey), 3600000);
            }
        }
    });
}

// Update notification button state
async function updateNotificationButton() {
    const btn = document.getElementById('rotation-notification-btn');
    if (!btn) return;
    
    const enabled = (localStorage.getItem('pokechill_rotation_notifications') === 'enabled') || await loadUserPreference('rotation_notifications', false);
    btn.innerHTML = enabled ? t('alertsOn') : t('alertsOff');
    btn.style.background = enabled ? 'rgba(0,255,136,0.2)' : 'var(--bg-input)';
}