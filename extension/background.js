// Background service worker for JeepBeach Auto-Draft
class JeepBeachBackground {
  constructor() {
    this.storage = new StorageManager();
    this.siteScraper = new SiteScraper();
    this.llmProvider = null;

    this.setupMessageListener();
    this.initializeSettings();
  }

  async initializeSettings() {
    try {
      await this.storage.initializeSettings();
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'JB_DRAFT_REQUEST':
          await this.handleDraftRequest(request, sender, sendResponse);
          break;
        case 'JB_FETCH_CONTEXT':
          await this.handleFetchContext(request, sender, sendResponse);
          break;
        case 'JB_REFRESH_SITE_CACHE':
          await this.handleRefreshSiteCache(request, sender, sendResponse);
          break;
        case 'JB_TEST_LLM':
          await this.handleTestLLM(request, sender, sendResponse);
          break;
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleDraftRequest(request, sender, sendResponse) {
    try {
      // Get settings
      const settings = await this.storage.getSyncData();

      // Initialize LLM provider
      this.llmProvider = new LLMProvider(settings.apiKey);

      // Get email context (use Gmail API if enabled, otherwise use provided context)
      let emailContext = request.emailContext;
      if (settings.useGmailApi && request.threadId) {
        try {
          emailContext = await this.fetchGmailContext(request.threadId);
        } catch (error) {
          console.warn('Gmail API failed, falling back to DOM context:', error);
          // Continue with DOM context
        }
      }

      // Only fetch JeepBeach content if we're generating a new draft (not rewriting)
      let jeepBeachContent = '';
      if (!request.isRewriteMode) {
        jeepBeachContent = await this.siteScraper.getJeepBeachContent(settings.jeepBeachUrls);
      }

      // Generate draft
      const draft = await this.llmProvider.generateDraft(
        emailContext,
        jeepBeachContent,
        settings.tone,
        settings.fallbackMessage,
        request.existingDraft || null
      );

      // Send response back to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'JB_DRAFT_RESPONSE',
        draft: draft
      });

    } catch (error) {
      console.error('Error generating draft:', error);
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'JB_DRAFT_ERROR',
        error: error.message
      });
    }
  }

  async handleFetchContext(request, sender, sendResponse) {
    try {
      if (!request.threadId) {
        throw new Error('Thread ID required for Gmail API');
      }

      const context = await this.fetchGmailContext(request.threadId);
      sendResponse({ context: context });

    } catch (error) {
      console.error('Error fetching Gmail context:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleRefreshSiteCache(request, sender, sendResponse) {
    try {
      const settings = await this.storage.getSyncData();
      const content = await this.siteScraper.fetchJeepBeachContent(settings.jeepBeachUrls);
      await this.storage.setSiteCache(content);

      sendResponse({ success: true, message: 'Site cache refreshed successfully' });

    } catch (error) {
      console.error('Error refreshing site cache:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleTestLLM(request, sender, sendResponse) {
    try {
      const settings = await this.storage.getSyncData();

      if (!settings.apiKey) {
        throw new Error('API key not configured');
      }

      this.llmProvider = new LLMProvider(settings.apiKey);
      const testResponse = await this.llmProvider.testConnection();

      sendResponse({ success: true, response: testResponse });

    } catch (error) {
      console.error('Error testing LLM:', error);
      sendResponse({ error: error.message });
    }
  }

  async fetchGmailContext(threadId) {
    try {
      // Get OAuth token
      const token = await this.getGmailToken();

      // Fetch thread details
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const thread = await response.json();

      // Get the most recent inbound message
      const messages = thread.messages || [];
      if (messages.length === 0) {
        throw new Error('No messages found in thread');
      }

      // Find the most recent inbound message (not sent by us)
      let inboundMessage = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.labelIds && !message.labelIds.includes('SENT')) {
          inboundMessage = message;
          break;
        }
      }

      if (!inboundMessage) {
        throw new Error('No inbound messages found');
      }

      // Get message details
      const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${inboundMessage.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!messageResponse.ok) {
        throw new Error(`Gmail API error: ${messageResponse.status}`);
      }

      const messageData = await messageResponse.json();

      // Extract text content from message body
      const body = this.extractMessageBody(messageData);

      return body;

    } catch (error) {
      console.error('Error fetching Gmail context:', error);
      throw error;
    }
  }

  extractMessageBody(messageData) {
    try {
      const parts = messageData.payload?.parts || [];

      // Look for text/plain or text/html parts
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBase64Url(part.body.data);
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = this.decodeBase64Url(part.body.data);
          return this.stripHtml(html);
        }
      }

      // Check if there's a direct body
      if (messageData.payload?.body?.data) {
        const text = this.decodeBase64Url(messageData.payload.body.data);
        return this.stripHtml(text);
      }

      return 'No message body found';

    } catch (error) {
      console.error('Error extracting message body:', error);
      return 'Error extracting message body';
    }
  }

  decodeBase64Url(str) {
    try {
      // Convert base64url to base64
      str = str.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if needed
      while (str.length % 4) {
        str += '=';
      }

      return decodeURIComponent(escape(atob(str)));
    } catch (error) {
      console.error('Error decoding base64:', error);
      return str;
    }
  }

  stripHtml(html) {
    try {
      // Create a temporary DOM element
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());

      // Get text content
      let text = doc.body ? doc.body.textContent : '';

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();

      return text;
    } catch (error) {
      console.error('Error stripping HTML:', error);
      return html;
    }
  }

  async getGmailToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });
  }
}

// Initialize the background script
const jeepBeachBackground = new JeepBeachBackground();
