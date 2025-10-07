// Options page JavaScript
class JeepBeachOptions {
  constructor() {
    this.storage = new StorageManager();
    this.llmProvider = null;

    this.init();
  }

  async init() {
    // Load saved settings
    await this.loadSettings();

    // Set up event listeners
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const settings = await this.storage.getSyncData();

      // Populate form fields
      document.getElementById('apiKey').value = settings.apiKey || '';
      document.getElementById('provider').value = settings.provider || 'openai';
      document.getElementById('tone').value = settings.tone || '';
      document.getElementById('fallbackMessage').value = settings.fallbackMessage || '';
      document.getElementById('useGmailApi').checked = settings.useGmailApi || false;

    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Error loading settings', 'error');
    }
  }

  setupEventListeners() {
    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Test LLM
    document.getElementById('testLLM').addEventListener('click', () => {
      this.testLLM();
    });

    // Refresh cache
    document.getElementById('refreshCache').addEventListener('click', () => {
      this.refreshCache();
    });

    // Reset defaults
    document.getElementById('resetDefaults').addEventListener('click', () => {
      this.resetDefaults();
    });

    // Auto-save on input change
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.saveSettings();
      });
    });
  }

  async saveSettings() {
    try {
      const settings = {
        apiKey: document.getElementById('apiKey').value.trim(),
        provider: document.getElementById('provider').value,
        tone: document.getElementById('tone').value.trim(),
        fallbackMessage: document.getElementById('fallbackMessage').value.trim(),
        useGmailApi: document.getElementById('useGmailApi').checked
      };

      // Validate required fields
      if (!settings.apiKey) {
        this.showStatus('API key is required', 'error');
        return;
      }

      if (!settings.tone) {
        this.showStatus('Tone is required', 'error');
        return;
      }

      if (!settings.fallbackMessage) {
        this.showStatus('Fallback message is required', 'error');
        return;
      }

      // Save to storage
      await this.storage.setSyncData(settings);

      this.showStatus('Settings saved successfully!', 'success');

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings: ' + error.message, 'error');
    }
  }

  async testLLM() {
    const button = document.getElementById('testLLM');
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = 'Testing...';

      const settings = await this.storage.getSyncData();

      if (!settings.apiKey) {
        throw new Error('API key not configured');
      }

      // Initialize LLM provider
      this.llmProvider = new LLMProvider(settings.apiKey, settings.provider);

      // Test connection
      const response = await this.llmProvider.testConnection();

      this.showStatus(`LLM test successful! Response: "${response}"`, 'success');

    } catch (error) {
      console.error('LLM test error:', error);
      this.showStatus('LLM test failed: ' + error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async refreshCache() {
    const button = document.getElementById('refreshCache');
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = 'Refreshing...';

      // Send message to background script
      const response = await this.sendMessageToBackground({
        type: 'JB_REFRESH_SITE_CACHE'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.showStatus('Content refreshed successfully!', 'success');

    } catch (error) {
      console.error('Cache refresh error:', error);
      this.showStatus('Cache refresh failed: ' + error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async resetDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This will clear your current configuration.')) {
      return;
    }

    try {
      const defaults = this.storage.getDefaultSettings();

      // Update form fields
      document.getElementById('apiKey').value = defaults.apiKey;
      document.getElementById('provider').value = 'openai';
      document.getElementById('tone').value = defaults.tone;
      document.getElementById('fallbackMessage').value = defaults.fallbackMessage;
      document.getElementById('useGmailApi').checked = defaults.useGmailApi;

      // Save to storage
      await this.storage.setSyncData(defaults);

      this.showStatus('Settings reset to defaults!', 'success');

    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showStatus('Error resetting settings: ' + error.message, 'error');
    }
  }

  showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      status.style.display = 'none';
    }, 5000);
  }

  sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(response || {});
        }
      });
    });
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new JeepBeachOptions();
});
