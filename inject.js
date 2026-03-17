// This runs directly in the page context, can access React, DOM, etc.

const API_URL = "https://raw.githubusercontent.com/ScribblrBot/DiscordStuffs/refs/heads/main";

// Settings with defaults
let settings = {
    showPrefix: true,
    showCustom: true
};

// Cache system
const cache = new Map();
const EXPIRES = 1000 * 60 * 15; // 15 minutes

// Listen for settings from extension
window.addEventListener('message', (event) => {
    if (event.data.type === 'GLOBAL_BADGES_SETTINGS') {
        settings = { ...settings, ...event.data.settings };
    } else if (event.data.type === 'GLOBAL_BADGES_SETTINGS_UPDATE') {
        Object.keys(event.data.changes).forEach(key => {
            settings[key] = event.data.changes[key].newValue;
        });
    }
});

// Your fetch function (converted)
async function fetchBadges(userId) {
    const cachedValue = cache.get(userId);
    if (!cache.has(userId) || (cachedValue && cachedValue.expires < Date.now())) {
        try {
            const resp = await fetch(`${API_URL}/Badges/${userId}.json`);
            const body = await resp.json();
            cache.set(userId, { 
                badges: body, 
                expires: Date.now() + EXPIRES 
            });
            return body;
        } catch (e) {
            console.log("No badges for user:", userId);
            return null;
        }
    } else if (cachedValue) {
        return cachedValue.badges;
    }
}

// Create badge element (React-independent version)
function createBadgeElement(name, imgUrl) {
    const container = document.createElement('div');
    container.className = 'global-badge-container';
    
    // Create tooltip wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'global-badge-tooltip';
    wrapper.setAttribute('data-tooltip', name);
    
    // Create badge image
    const img = document.createElement('img');
    img.src = imgUrl;
    img.className = 'global-badge';
    img.alt = name;
    img.style.cssText = `
        width: 15px;
        height: 15px;
        margin-left: 4px;
        cursor: pointer;
    `;
    
    // Special scaling for Replugged badges
    if (name.includes('Replugged')) {
        img.style.transform = 'scale(0.9)';
    }
    
    wrapper.appendChild(img);
    container.appendChild(wrapper);
    return container;
}

// Process badges for a user
async function processUserBadges(userId, container) {
    const badges = await fetchBadges(userId);
    if (!badges || !Object.keys(badges).length) return;
    
    Object.keys(badges).forEach(mod => {
        if (mod.toLowerCase() === 'vencord') return; // Skip self
        
        badges[mod].forEach(badge => {
            let badgeData = badge;
            
            // Handle string badges (like "hunter", "early")
            if (typeof badge === 'string') {
                const fullNames = { 
                    'hunter': 'Bug Hunter', 
                    'early': 'Early User' 
                };
                
                const badgeName = fullNames[badge] || badge;
                const imgUrl = `${API_URL}/badges/${mod}/${badge.replace(mod, '').trim().split(' ')[0]}`;
                
                badgeData = {
                    name: badgeName,
                    badge: imgUrl,
                    custom: false
                };
            } else if (typeof badge === 'object') {
                badgeData.custom = true;
            }
            
            // Check custom badge setting
            if (!settings.showCustom && badgeData.custom) return;
            
            // Format name with prefix
            let displayName = badgeData.name;
            if (!badgeData.custom) {
                const cleanName = badgeData.name.replace(mod, '').trim();
                const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                displayName = settings.showPrefix ? `${mod} ${formattedName}` : formattedName;
            }
            
            // Create and append badge
            const badgeElement = createBadgeElement(displayName, badgeData.badge);
            
            // Find where to insert (looking for existing badge container)
            const existingBadgeContainer = container.querySelector('[class*="profileBadges"]') || 
                                          container.querySelector('[class*="userProfile"]');
            
            if (existingBadgeContainer) {
                existingBadgeContainer.appendChild(badgeElement);
            } else {
                // Create new container if needed
                let badgeRow = container.querySelector('.custom-badge-row');
                if (!badgeRow) {
                    badgeRow = document.createElement('div');
                    badgeRow.className = 'custom-badge-row';
                    badgeRow.style.cssText = 'display: flex; align-items: center; margin-top: 4px;';
                    
                    // Try to insert after username
                    const usernameEl = container.querySelector('[class*="username"]');
                    if (usernameEl && usernameEl.parentNode) {
                        usernameEl.parentNode.insertBefore(badgeRow, usernameEl.nextSibling);
                    } else {
                        container.appendChild(badgeRow);
                    }
                }
                badgeRow.appendChild(badgeElement);
            }
        });
    });
}

// Find user containers and process them
function findAndProcessUsers() {
    // Look for user IDs in the DOM
    const possibleUserContainers = document.querySelectorAll([
        '[class*="userProfile"]',
        '[class*="message"] [class*="header"]',
        '[class*="member"]',
        '[data-user-id]'
    ].join(','));
    
    possibleUserContainers.forEach(container => {
        // Extract user ID
        const userId = container.getAttribute('data-user-id') || 
                      container.querySelector('[data-user-id]')?.getAttribute('data-user-id');
        
        if (userId && !container.hasAttribute('data-badges-processed')) {
            container.setAttribute('data-badges-processed', 'true');
            processUserBadges(userId, container);
        }
    });
}

// Watch for DOM changes
const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
            shouldProcess = true;
        }
    });
    
    if (shouldProcess) {
        setTimeout(findAndProcessUsers, 500); // Debounce
    }
});

// Start observing once Discord loads
function init() {
    findAndProcessUsers();
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
