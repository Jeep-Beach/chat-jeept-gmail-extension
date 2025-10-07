// Content script for Gmail integration
class JeepBeachContentScript {
  constructor() {
    this.gmailDOM = null;
    this.floatingButton = null;
    this.observer = null;
    this.isProcessing = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Initialize GmailDOM utility
    this.gmailDOM = new GmailDOM();
    
    // Create floating button
    this.createFloatingButton();
    
    // Set up mutation observer to watch for compose box changes
    this.setupMutationObserver();
    
    // Initial check for compose box
    this.checkComposeBox();
    
    // Listen for messages from background script
    this.setupMessageListener();
  }

  createFloatingButton() {
    // Remove existing button if any
    const existingButton = document.getElementById('jeepbeach-draft-button');
    if (existingButton) {
      existingButton.remove();
    }

    // Create new button
    this.floatingButton = this.gmailDOM.createFloatingButton();
    
    // Add click handler
    this.floatingButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleDraftRequest();
    });
    
    // Add to page
    document.body.appendChild(this.floatingButton);
    
    // Initially hide
    this.gmailDOM.toggleButtonVisibility(this.floatingButton, false);
  }

  setupMutationObserver() {
    // Watch for changes in the compose area
    const targetNode = document.body;
    const config = {
      childList: true,
      subtree: true,
      attributes: false
    };

    this.observer = new MutationObserver((mutations) => {
      // Debounce the check
      clearTimeout(this.checkTimeout);
      this.checkTimeout = setTimeout(() => {
        this.checkComposeBox();
      }, 100);
    });

    this.observer.observe(targetNode, config);
  }

  checkComposeBox() {
    const composeBox = this.gmailDOM.getActiveComposeBox();
    const shouldShow = composeBox !== null;
    
    if (this.floatingButton) {
      this.gmailDOM.toggleButtonVisibility(this.floatingButton, shouldShow);
    }
  }

  setupMessageListener() {
    // Check if Chrome runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('Chrome runtime not available');
      return;
    }

    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          switch (request.type) {
            case 'JB_DRAFT_RESPONSE':
              this.handleDraftResponse(request);
              break;
            case 'JB_DRAFT_ERROR':
              this.handleDraftError(request);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  }

  async handleDraftRequest() {
    if (this.isProcessing) {
      this.gmailDOM.showToast('Already processing a request...', 'warning');
      return;
    }

    this.isProcessing = true;
    this.floatingButton.disabled = true;
    this.floatingButton.textContent = 'Generating...';

    try {
      // Get compose box
      const composeBox = this.gmailDOM.getActiveComposeBox();
      if (!composeBox) {
        throw new Error('No compose box found');
      }

      // Get email context (DOM mode for now)
      const emailContext = this.gmailDOM.getLastInboundMessage();
      if (!emailContext) {
        throw new Error('No email context found');
      }

      console.log('Email context found:', emailContext);

      // Get settings
      const settings = await this.getSettings();
      if (!settings.apiKey) {
        throw new Error('API key not configured. Please set it in the extension options.');
      }

      console.log('Settings loaded:', { 
        hasApiKey: !!settings.apiKey, 
        tone: settings.tone,
        urls: settings.jeepBeachUrls 
      });

      // Send request to background script
      try {
        chrome.runtime.sendMessage({
          type: 'JB_DRAFT_REQUEST',
          emailContext: emailContext,
          tone: settings.tone,
          fallbackMessage: settings.fallbackMessage,
          jeepBeachUrls: settings.jeepBeachUrls,
          useGmailApi: settings.useGmailApi,
          threadId: this.gmailDOM.getThreadIdFromUrl()
        });
      } catch (error) {
        console.error('Error sending message to background:', error);
        this.handleDraftError({ error: 'Extension context invalidated. Please reload the extension.' });
      }

    } catch (error) {
      console.error('Error in handleDraftRequest:', error);
      this.handleDraftError({ error: error.message });
    }
  }

  handleDraftResponse(request) {
    this.isProcessing = false;
    this.floatingButton.disabled = false;
    this.floatingButton.textContent = 'ChatJeePeeTee';

    console.log('Received draft response:', request);

    if (request.draft) {
      // Insert draft into compose box
      const composeBox = this.gmailDOM.getActiveComposeBox();
      if (composeBox) {
        // Clear any existing content first
        composeBox.textContent = '';
        
        const success = this.gmailDOM.insertTextAtCursor(composeBox, request.draft);
        if (success) {
          this.gmailDOM.showToast('Draft inserted successfully!', 'success');
        } else {
          this.gmailDOM.showToast('Failed to insert draft', 'error');
        }
      } else {
        this.gmailDOM.showToast('Compose box not found', 'error');
      }
    } else {
      this.gmailDOM.showToast('No draft generated', 'warning');
    }
  }

  handleDraftError(request) {
    this.isProcessing = false;
    this.floatingButton.disabled = false;
    this.floatingButton.textContent = 'ChatJeePeeTee';

    const errorMessage = request.error || 'Unknown error occurred';
    this.gmailDOM.showToast(`Error: ${errorMessage}`, 'error');
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'apiKey',
        'tone',
        'fallbackMessage',
        'jeepBeachUrls',
        'useGmailApi'
      ], (result) => {
        resolve(result);
      });
    });
  }

  // Cleanup method
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.floatingButton) {
      this.floatingButton.remove();
    }
    
    clearTimeout(this.checkTimeout);
  }
}

// Initialize the content script
let jeepBeachScript = null;

// Initialize when page loads
function initializeScript() {
  if (jeepBeachScript) {
    jeepBeachScript.destroy();
  }
  jeepBeachScript = new JeepBeachContentScript();
}

// Initialize immediately
initializeScript();

// Re-initialize on navigation (Gmail is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initializeScript, 1000);
  }
}).observe(document, { subtree: true, childList: true });