// Combined background service worker with all utilities
// This includes all utility classes inline to avoid import issues

// Storage utilities for Chrome extension
class StorageManager {
  constructor() {
    this.syncKeys = [
      'apiKey',
      'tone',
      'fallbackMessage',
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
      fallbackMessage: 'Thanks for reaching out! We are currently experiencing a high level of inbound questions so we would really appreciate it if you could check out FAQs for answers: https://jeepbeach.com/faq/\nIf you still need help, just reply here and we\'ll jump in!',
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

// JeepBeach content provider
class JeepBeachContentProvider {
  // Get JeepBeach content (static fallback)
  getJeepBeachContent() {
    return `Jeep Beach is an annual event held in Daytona Beach, Florida, featuring thousands of Jeep vehicles and enthusiasts.

EVENT INFORMATION:
- Jeep Beach is typically held in April each year
- The event takes place in Daytona Beach, Florida
- It features Jeep shows, vendors, beach driving, and social activities
- Registration is required for most activities

FREQUENTLY ASKED QUESTIONS:
- When is Jeep Beach? Usually held in April, check the official website for exact dates
- Where is Jeep Beach? Daytona Beach, Florida
- Do I need to register? Yes, registration is required for most activities
- Can I drive on the beach? Yes, with proper registration and permits
- Are there age restrictions? Some activities may have age requirements

REGISTRATION:
- Online registration is available on the official website
- Early registration often provides discounts
- Registration includes access to most activities and events
- Some activities may require additional fees

EVENTS AND ACTIVITIES:
- Jeep show competitions
- Vendor booths and merchandise
- Beach driving (with permits)
- Social gatherings and meetups
- Awards ceremonies
- Live entertainment

CONTACT INFORMATION:
- Official website: jeepbeach.com
- For questions, contact through the website or social media
- Check the FAQ section for common questions and answers`;
  }
}

// LLM integration utilities
class LLMProvider {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.baseUrl = this.getBaseUrl(provider);
  }

  getBaseUrl(provider) {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      default:
        return 'https://api.openai.com/v1';
    }
  }

  // Generate draft reply using LLM
  async generateDraft(emailContext, jeepBeachText, tone, fallbackMessage) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(emailContext, jeepBeachText, tone, fallbackMessage);

    try {
      const response = await this.callLLM(systemPrompt, userPrompt);
      return this.extractDraftFromResponse(response);
    } catch (error) {
      console.error('LLM generation error:', error);
      throw error;
    }
  }

  // Build system prompt
  buildSystemPrompt() {
    return `You are a helpful support assistant drafting replies for Jeep Beach emails.
STRICT RULES:
- Use ONLY information grounded in the provided JeepBeach snippets.
- If the answer isn't present, use the provided fallback pattern.
- Keep the reply concise (2–4 sentences), friendly, and helpful.
- Do not invent dates, prices, policies, or guarantees.
- End with one human contact path: "If you need a hand, reply here."`;
  }

  // Build user prompt
  buildUserPrompt(emailContext, jeepBeachText, tone, fallbackMessage) {
    return `Email to reply to:
---
${emailContext}
---

JeepBeach site knowledge (snippets):
---
${jeepBeachText}
---

Tone: ${tone}

Instructions:
1. Read the email carefully to understand what the person is asking
2. Look through the JeepBeach snippets for relevant information to answer their question
3. If you find relevant information, write a helpful reply using that information
4. If you cannot find any relevant information in the snippets, use this exact fallback message: "${fallbackMessage}"
5. Keep the reply concise (2-4 sentences)
6. Be friendly and helpful
7. Do NOT repeat the fallback message multiple times
8. Return only the email body, no greetings/headers unless the email clearly expects it

Write your reply:`;
  }


  // Call the LLM API
  async callLLM(systemPrompt, userPrompt) {
    const requestBody = this.buildRequestBody(systemPrompt, userPrompt);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LLM API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  // Build request body based on provider
  buildRequestBody(systemPrompt, userPrompt) {
    switch (this.provider) {
      case 'openai':
        return {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.5
        };
      case 'anthropic':
        return {
          model: 'claude-3-haiku-20240307',
          max_tokens: 250,
          temperature: 0.5,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        };
      default:
        return {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.5
        };
    }
  }

  // Extract draft from LLM response
  extractDraftFromResponse(response) {
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error('Invalid LLM response');
    }

    const choice = response.choices[0];
    const content = choice.message?.content || choice.text || '';

    if (!content.trim()) {
      throw new Error('Empty response from LLM');
    }

    return content.trim();
  }

  // Test LLM connection
  async testConnection() {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const testPrompt = 'Say "Hello, this is a test."';
      const response = await this.callLLM('You are a helpful assistant.', testPrompt);
      return this.extractDraftFromResponse(response);
    } catch (error) {
      throw new Error(`LLM test failed: ${error.message}`);
    }
  }
}

// Background service worker for JeepBeach Auto-Draft
class JeepBeachBackground {
  constructor() {
    this.storage = new StorageManager();
    this.contentProvider = new JeepBeachContentProvider();
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
      console.log('Handling draft request:', request);

      // Get settings
      const settings = await this.storage.getSyncData();
      console.log('Settings loaded:', settings);

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

      console.log('Email context:', emailContext);

      // Get JeepBeach content
      const jeepBeachContent = this.contentProvider.getJeepBeachContent();
      console.log('JeepBeach content length:', jeepBeachContent.length);
      console.log('JeepBeach content preview:', jeepBeachContent.substring(0, 500));

      // Generate draft
      console.log('Generating draft with LLM...');
      const draft = await this.llmProvider.generateDraft(
        emailContext,
        jeepBeachContent,
        settings.tone,
        settings.fallbackMessage
      );

      console.log('Generated draft:', draft);

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
      const content = this.contentProvider.getJeepBeachContent();
      await this.storage.setSiteCache(content);

      sendResponse({ success: true, message: 'Content refreshed successfully' });

    } catch (error) {
      console.error('Error refreshing content:', error);
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
