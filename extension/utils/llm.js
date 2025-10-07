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

Write a short reply grounded ONLY in the snippets above. If nothing relevant, use the fallback pattern:
"${fallbackMessage}"
Return only the email body, no greetings/headers unless the email clearly expects it.`;
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

  // Get available models (for future use)
  async getAvailableModels() {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Models API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMProvider;
} else {
  window.LLMProvider = LLMProvider;
}