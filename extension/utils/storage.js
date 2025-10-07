// Storage utilities for Chrome extension
class StorageManager {
  constructor() {
    this.syncKeys = [
      'apiKey',
      'tone',
      'fallbackMessage',
      'jeepBeachUrls',
      'useGmailApi'
    ];
  }

  // Get sync storage data
  async getSyncData() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.syncKeys, (result) => {
        resolve(result);
      });
    });
  }

  // Set sync storage data
  async setSyncData(data) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, () => {
        resolve();
      });
    });
  }

  // Get local storage data
  async getLocalData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  // Set local storage data
  async setLocalData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }

  // Get default settings
  getDefaultSettings() {
    return {
      apiKey: '',
      tone: 'friendly, concise, cheerful + helpful',
      fallbackMessage: 'Thanks for reaching out! The fastest path is our FAQs: https://jeepbeach.com/faq/\nIf you still need help, just reply here and we\'ll jump in.',
      jeepBeachUrls: [
        'https://jeepbeach.com/',
        'https://jeepbeach.com/faq/',
        'https://jeepbeach.com/events/',
        'https://jeepbeach.com/registration/'
      ].join('\n'),
      useGmailApi: false
    };
  }

  // Initialize settings with defaults
  async initializeSettings() {
    const current = await this.getSyncData();
    const defaults = this.getDefaultSettings();
    
    const needsUpdate = this.syncKeys.some(key => current[key] === undefined);
    
    if (needsUpdate) {
      const updated = { ...defaults, ...current };
      await this.setSyncData(updated);
      return updated;
    }
    
    return current;
  }

  // Get cached site data
  async getSiteCache() {
    const result = await this.getLocalData(['jeepBeachCache']);
    return result.jeepBeachCache || null;
  }

  // Set cached site data
  async setSiteCache(text) {
    const cache = {
      text: text,
      updatedAt: Date.now()
    };
    await this.setLocalData({ jeepBeachCache: cache });
  }

  // Check if cache is expired (4 hours)
  isCacheExpired(cache) {
    if (!cache || !cache.updatedAt) return true;
    const fourHours = 4 * 60 * 60 * 1000;
    return Date.now() - cache.updatedAt > fourHours;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
}