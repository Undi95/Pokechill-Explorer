// ============ SIMPLE USER BUTTON SYSTEM ============
// Uses same reserved.json as team submission

const USER_KEY = 'lastTeamAuthor';

// Update user button display
function updateUserButton() {
    const author = localStorage.getItem(USER_KEY) || '';
    const btnIcon = document.getElementById('user-btn-icon');
    const btnName = document.getElementById('user-btn-name');
    const btn = document.getElementById('user-btn');
    
    if (!btn || !btnIcon || !btnName) return;
    
    if (author) {
        btnIcon.style.display = 'none';
        btnName.style.display = 'inline';
        btnName.textContent = author;
        btnName.style.color = 'var(--text-main)';
        btn.style.background = 'linear-gradient(135deg,rgba(0,212,255,0.2),rgba(138,43,226,0.2))';
        btn.style.borderColor = 'var(--accent-blue)';
        btn.style.boxShadow = '0 0 10px rgba(0,212,255,0.5), inset 0 0 5px rgba(0,212,255,0.1)';
        btn.style.animation = 'pulse-glow 2s infinite';
        // Show savezone tab and floating button
        showSavezoneUI(true);
    } else {
        btnIcon.style.display = 'inline';
        btnName.style.display = 'none';
        btnName.textContent = '';
        btn.style.background = 'linear-gradient(135deg,rgba(100,100,100,0.3),rgba(80,80,80,0.3))';
        btn.style.borderColor = 'var(--border)';
        btn.style.boxShadow = 'none';
        btn.style.animation = 'none';
        // Hide savezone tab and floating button
        showSavezoneUI(false);
    }
}

// Toggle dropdown
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (!dropdown) return;
    
    const author = localStorage.getItem(USER_KEY) || '';
    const loggedOutDiv = document.getElementById('user-dropdown-logged-out');
    const loggedInDiv = document.getElementById('user-dropdown-logged-in');
    const nameDiv = document.getElementById('user-dropdown-name');
    
    if (author) {
        loggedOutDiv.style.display = 'none';
        loggedInDiv.style.display = 'block';
        nameDiv.textContent = '👤 ' + author;
    } else {
        loggedOutDiv.style.display = 'block';
        loggedInDiv.style.display = 'none';
    }
    
    // Toggle display
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
    }
}

// Global click handler for dropdown
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('user-dropdown');
    const btn = document.getElementById('user-btn');
    if (dropdown && dropdown.style.display === 'block') {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
});

function closeUserDropdown(e) {
    // Deprecated - handled by global listener above
}

// ============ LOGIN MODAL ============
function showLoginModal() {
    document.getElementById('user-dropdown').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
    
    // Add ENTER key support
    setTimeout(() => {
        document.getElementById('login-password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleLogin();
        });
        document.getElementById('login-username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') document.getElementById('login-password').focus();
        });
    }, 100);
}

function closeLoginModal(e) {
    if (e && e.target !== document.getElementById('login-modal')) return;
    document.getElementById('login-modal').style.display = 'none';
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    if (!username) {
        errorEl.textContent = t('fillAllFields') || 'Veuillez remplir tous les champs';
        errorEl.style.display = 'block';
        return;
    }
    
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/check_nickname.php?author=' + encodeURIComponent(username));
        const result = await response.json();
        
        // Si le pseudo n'est pas réservé, on connecte en mode libre (sans vérification MDP)
        if (!result.reserved) {
            if (!password) {
                localStorage.setItem(USER_KEY, username);
                updateUserButton();
                closeLoginModal();
                showNotification(t('loginSuccess') || 'Connecté avec succès !', 'success');
                return;
            }
            // Si mot de passe fourni mais pseudo pas réservé → erreur (pas de compte)
            errorEl.textContent = t('userNotFound') || 'Ce pseudo n\'existe pas';
            errorEl.style.display = 'block';
            return;
        }
        
        // Le pseudo existe → il faut un mot de passe
        if (!password) {
            errorEl.textContent = t('nicknameProtectedLogin') || 'Ce pseudo est protégé. Entrez le mot de passe.';
            errorEl.style.display = 'block';
            return;
        }
        
        // Vérifie le mot de passe
        // Note: On ne peut pas vérifier le hash côté client, donc on utilise une vérification simple
        // ou on fait confiance à l'API. Pour l'instant, on vérifie avec une requête POST
        const verifyResponse = await fetch('https://pokechill-explorer.alwaysdata.net/teams/auth_simple.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username, password })
        });
        
        const verifyResult = await verifyResponse.json();
        
        if (verifyResult.success) {
            localStorage.setItem(USER_KEY, username);
            updateUserButton();
            closeLoginModal();
            showNotification(t('loginSuccess') || 'Connecté avec succès !', 'success');
            // Reload featured teams to show delete buttons
            const memberTeamsPanel = document.getElementById('member-teams-panel');
            if (memberTeamsPanel && memberTeamsPanel.classList.contains('active')) {
                loadFeaturedTeams();
            }
        } else {
            errorEl.textContent = t('invalidPassword') || 'Mot de passe incorrect';
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = t('serverError') || 'Erreur serveur';
        errorEl.style.display = 'block';
    }
}

// ============ REGISTER MODAL ============
function showRegisterModal() {
    document.getElementById('user-dropdown').style.display = 'none';
    document.getElementById('register-modal').style.display = 'flex';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-password-confirm').value = '';
    document.getElementById('register-error').style.display = 'none';
    document.getElementById('register-nickname-status').innerHTML = '';
    
    // Add ENTER key support
    setTimeout(() => {
        document.getElementById('register-password-confirm').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleRegister();
        });
        document.getElementById('register-password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') document.getElementById('register-password-confirm').focus();
        });
        document.getElementById('register-username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') document.getElementById('register-password').focus();
        });
    }, 100);
}

function closeRegisterModal(e) {
    if (e && e.target !== document.getElementById('register-modal')) return;
    document.getElementById('register-modal').style.display = 'none';
}

async function checkRegisterNickname(author) {
    if (!author || author.length < 2) return;
    
    const statusEl = document.getElementById('register-nickname-status');
    
    try {
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/check_nickname.php?author=' + encodeURIComponent(author));
        const result = await response.json();
        
        if (result.reserved) {
            statusEl.innerHTML = '<span style="color:var(--error)">❌ ' + (t('nicknameTaken') || 'Pseudo déjà pris') + '</span>';
        } else {
            statusEl.innerHTML = '<span style="color:var(--success)">' + (t('nicknameAvailableShort') || '✅ Pseudo disponible') + '</span>';
        }
    } catch (e) {
        statusEl.innerHTML = '';
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const errorEl = document.getElementById('register-error');
    
    // Validation
    if (!username || !password || !passwordConfirm) {
        errorEl.textContent = t('fillAllFields') || 'Veuillez remplir tous les champs';
        errorEl.style.display = 'block';
        return;
    }
    
    if (username.length < 2 || username.length > 20) {
        errorEl.textContent = t('usernameLength') || 'Le pseudo doit faire 2-20 caractères';
        errorEl.style.display = 'block';
        return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errorEl.textContent = t('usernameInvalid') || 'Caractères invalides';
        errorEl.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = t('passwordTooShort') || 'Le mot de passe doit faire au moins 6 caractères';
        errorEl.style.display = 'block';
        return;
    }
    
    if (password !== passwordConfirm) {
        errorEl.textContent = t('passwordMismatch') || 'Les mots de passe ne correspondent pas';
        errorEl.style.display = 'block';
        return;
    }
    
    // Vérifie si le pseudo est disponible
    try {
        const checkResponse = await fetch('https://pokechill-explorer.alwaysdata.net/teams/check_nickname.php?author=' + encodeURIComponent(username));
        const checkResult = await checkResponse.json();
        
        if (checkResult.reserved) {
            errorEl.textContent = t('nicknameTaken') || 'Ce pseudo est déjà pris';
            errorEl.style.display = 'block';
            return;
        }
        
        // Crée le compte
        const response = await fetch('https://pokechill-explorer.alwaysdata.net/teams/auth_simple.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'register', username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem(USER_KEY, username);
            updateUserButton();
            closeRegisterModal();
            showNotification(t('registerSuccess') || 'Compte créé avec succès !', 'success');
            // Reload featured teams if on member-teams page
            const memberTeamsPanel = document.getElementById('member-teams-panel');
            if (memberTeamsPanel && memberTeamsPanel.classList.contains('active')) {
                loadFeaturedTeams();
            }
        } else {
            errorEl.textContent = result.error || (t('registerError') || 'Erreur lors de l\'inscription');
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = t('serverError') || 'Erreur serveur';
        errorEl.style.display = 'block';
    }
}

// Logout user
function logoutUser() {
    localStorage.removeItem(USER_KEY);
    updateUserButton();
    document.getElementById('user-dropdown').style.display = 'none';
    showNotification(t('logoutSuccess') || 'Déconnecté !', 'info');
}

// Simple notification
function showNotification(message, type) {
    const toast = document.createElement('div');
    const colors = {
        success: 'rgba(0,255,136,0.9)',
        error: 'rgba(255,68,68,0.9)',
        info: 'rgba(0,212,255,0.9)'
    };
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animations
const notifStyle = document.createElement('style');
notifStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 10px rgba(0,212,255,0.5), inset 0 0 5px rgba(0,212,255,0.1); }
        50% { box-shadow: 0 0 20px rgba(0,212,255,0.8), inset 0 0 10px rgba(0,212,255,0.2); }
    }
`;
document.head.appendChild(notifStyle);

// Navigate to My Teams (local)
function goToMyTeams() {
    // First switch to team tab
    switchTab('team');
    // Then switch to 'saved' subtab (Mes équipes sauvegardées)
    setTimeout(() => {
        const savedBtn = document.getElementById('team-subtab-saved');
        if (savedBtn) {
            savedBtn.click();
        } else {
            // Fallback: manually switch
            switchTeamSubtab('saved');
        }
    }, 100);
}

// Init on page load
document.addEventListener('DOMContentLoaded', updateUserButton);