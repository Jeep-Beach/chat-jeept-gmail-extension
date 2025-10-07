// Site scraping utilities for JeepBeach content
class SiteScraper {
  constructor() {
    this.maxTextLength = 6000; // Token limit safety
  }

  // Fetch and parse a single URL
  async fetchAndParseUrl(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseHtml(html);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return '';
    }
  }

  // Parse HTML and extract text content
  parseHtml(html) {
    // Create a temporary DOM element
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style, nav, header, footer');
    scripts.forEach(el => el.remove());
    
    // Get text content
    let text = doc.body ? doc.body.textContent : '';
    
    // Clean up the text
    text = this.cleanText(text);
    
    return text;
  }

  // Clean and normalize text
  cleanText(text) {
    if (!text) return '';
    
    // Replace multiple whitespace with single space
    text = text.replace(/\s+/g, ' ');
    
    // Remove extra newlines
    text = text.replace(/\n\s*\n/g, '\n');
    
    // Trim whitespace
    text = text.trim();
    
    return text;
  }

  // Fetch all JeepBeach URLs and combine content
  async fetchJeepBeachContent(urls) {
    const urlArray = Array.isArray(urls) ? urls : urls.split('\n').filter(url => url.trim());
    const results = [];
    
    // Fetch all URLs in parallel
    const promises = urlArray.map(url => this.fetchAndParseUrl(url.trim()));
    const contents = await Promise.all(promises);
    
    // Combine all content
    let combinedText = '';
    for (let i = 0; i < contents.length; i++) {
      if (contents[i]) {
        combinedText += `\n\n--- Content from ${urlArray[i]} ---\n\n`;
        combinedText += contents[i];
      }
    }
    
    // Truncate if too long
    if (combinedText.length > this.maxTextLength) {
      combinedText = combinedText.substring(0, this.maxTextLength) + '...';
    }
    
    return combinedText.trim();
  }

  // Get cached content or fetch fresh
  async getJeepBeachContent(urls, forceRefresh = false) {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const storage = new StorageManager();
      const cache = await storage.getSiteCache();
      
      if (cache && !storage.isCacheExpired(cache)) {
        return cache.text;
      }
    }
    
    // Fetch fresh content
    const content = await this.fetchJeepBeachContent(urls);
    
    // Cache the result
    const storage = new StorageManager();
    await storage.setSiteCache(content);
    
    return content;
  }

  // Test if URLs are accessible
  async testUrls(urls) {
    const urlArray = Array.isArray(urls) ? urls : urls.split('\n').filter(url => url.trim());
    const results = [];
    
    for (const url of urlArray) {
      try {
        const response = await fetch(url.trim(), { method: 'HEAD' });
        results.push({
          url: url.trim(),
          accessible: response.ok,
          status: response.status
        });
      } catch (error) {
        results.push({
          url: url.trim(),
          accessible: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SiteScraper;
} else {
  window.SiteScraper = SiteScraper;
}