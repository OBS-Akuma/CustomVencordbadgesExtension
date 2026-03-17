document.addEventListener('DOMContentLoaded', () => {
    // Load settings
    chrome.storage.sync.get(['showPrefix', 'showCustom'], (settings) => {
        document.getElementById('showPrefix').checked = settings.showPrefix !== false;
        document.getElementById('showCustom').checked = settings.showCustom !== false;
    });
    
    // Save on change
    document.getElementById('showPrefix').addEventListener('change', (e) => {
        chrome.storage.sync.set({ showPrefix: e.target.checked });
    });
    
    document.getElementById('showCustom').addEventListener('change', (e) => {
        chrome.storage.sync.set({ showCustom: e.target.checked });
    });
});
