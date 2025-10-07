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
  async generateDraft(emailContext, jeepBeachText, tone, fallbackMessage, existingDraft = null) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const systemPrompt = this.buildSystemPrompt(!!existingDraft);
    const userPrompt = this.buildUserPrompt(emailContext, jeepBeachText, tone, fallbackMessage, existingDraft);

    try {
      const response = await this.callLLM(systemPrompt, userPrompt);
      return this.extractDraftFromResponse(response);
    } catch (error) {
      console.error('LLM generation error:', error);
      throw error;
    }
  }

  // Build system prompt
  buildSystemPrompt(isRewriteMode = false) {
    if (isRewriteMode) {
      return `You are a helpful support assistant rewriting email replies to be more user-friendly and professional.
STRICT RULES:
- Preserve the core message and intent of the original text.
- Make it sound warm, friendly, and thoughtful - like a real human wrote it.
- Keep the same factual content but improve tone, clarity, and friendliness.
- Maintain brevity (2–4 sentences) unless more detail is warranted.
- Remove any harsh, terse, or cold language.
- Add appropriate empathy and understanding where it fits naturally.
- Don't add information that wasn't in the original message.`;
    }

    return `You are a helpful support assistant drafting replies for Jeep Beach emails.
STRICT RULES:
- Use ONLY information grounded in the provided JeepBeach snippets.
- If the answer isn't present, use the provided fallback pattern.
- Keep the reply concise (2–4 sentences), friendly, and helpful.
- Do not invent dates, prices, policies, or guarantees.
- End with one human contact path: "If you need a hand, reply here."`;
  }

  // Build user prompt
  buildUserPrompt(emailContext, jeepBeachText, tone, fallbackMessage, existingDraft = null) {
    if (existingDraft) {
      return `Email they sent:
---
${emailContext}
---

Draft response to rewrite:
---
${existingDraft}
---

Desired tone: ${tone}

Rewrite the draft response to be more ${tone}, friendly, and professional. Use the email context ONLY to understand what's being discussed so you can make the grammar and phrasing natural (e.g., "No we don't have those events" vs generic "I must decline").

Rules:
- Keep the SAME meaning and answer from the draft
- Make it sound warm and human
- Don't change what the draft is saying - just improve how it's said
- Don't add new information that wasn't in the original draft
- Use the context to make phrasing specific and natural, not generic

Return only the rewritten text.`;
    }

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
