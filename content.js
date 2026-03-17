// This runs in the page context but has limited access to DOM
// We'll inject a script to have full access

function injectScript(file) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(file);
    script.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(script);
}

// Inject our badge logic
injectScript('inject.js');

// Listen for settings from popup/storage
chrome.storage.sync.get(['showPrefix', 'showCustom'], (settings) => {
    window.postMessage({ 
        type: 'GLOBAL_BADGES_SETTINGS', 
        settings 
    }, '*');
});

// Optional: Relay storage updates
chrome.storage.onChanged.addListener((changes) => {
    window.postMessage({ 
        type: 'GLOBAL_BADGES_SETTINGS_UPDATE', 
        changes 
    }, '*');
});
