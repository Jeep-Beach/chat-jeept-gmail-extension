// Gmail DOM utilities for content script
class GmailDOM {
  constructor() {
    this.composeSelectors = [
      'div[aria-label="Message Body"]',
      'div[role="textbox"][g_editable="true"]',
      'div[contenteditable="true"][aria-label*="Message"]'
    ];

    this.messageSelectors = [
      'div[role="listitem"] div[dir="ltr"]',
      '.adn .a3s',
      'div[data-message-id] div[dir="ltr"]'
    ];
  }

  // Detect if compose box is present
  isComposeBoxPresent() {
    for (const selector of this.composeSelectors) {
      const element = document.querySelector(selector);
      if (element && this.isVisible(element)) {
        return element;
      }
    }
    return null;
  }

  // Check if element is visible
  isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
  }

  // Get the active compose box
  getActiveComposeBox() {
    return this.isComposeBoxPresent();
  }

  // Get last inbound message text from DOM
  getLastInboundMessage() {
    for (const selector of this.messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Get the last element (most recent message)
        const lastElement = elements[elements.length - 1];
        const text = this.extractTextContent(lastElement);
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    }
    return null;
  }

  // Extract text content from element
  extractTextContent(element) {
    if (!element) return '';

    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Remove script and style elements
    const scripts = clone.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());

    // Get text content and clean it up
    let text = clone.textContent || clone.innerText || '';

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  // Insert text at cursor position in compose box
  insertTextAtCursor(composeBox, text) {
    if (!composeBox || !text) return false;

    try {
      // Focus the compose box
      composeBox.focus();

      // Try modern approach first
      if (document.execCommand) {
        const success = document.execCommand('insertText', false, text);
        if (success) return true;
      }

      // Fallback to Selection API
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }

      // Last resort: append to end
      composeBox.textContent += text;
      return true;

    } catch (error) {
      console.error('Error inserting text:', error);
      return false;
    }
  }

  // Get thread ID from URL
  getThreadIdFromUrl() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    return params.get('th') || null;
  }

  // Show toast notification
  showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existingToast = document.getElementById('jeepbeach-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.id = 'jeepbeach-toast';
    toast.className = `jeepbeach-toast jeepbeach-toast-${type}`;
    toast.textContent = message;

    // Add to page
    document.body.appendChild(toast);

    // Show with animation
    setTimeout(() => {
      toast.classList.add('jeepbeach-toast-show');
    }, 10);

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('jeepbeach-toast-show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // Create floating button
  createFloatingButton() {
    const button = document.createElement('button');
    button.id = 'jeepbeach-draft-button';
    button.className = 'jeepbeach-draft-button';
    button.textContent = 'ChatJeePT';
    button.title = 'Generate AI-powered reply for Jeep Beach inquiries';

    return button;
  }

  // Position floating button
  positionFloatingButton(button) {
    if (!button) return;

    // Position in bottom-right with offset from Gmail's send button
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';

    // Check if viewport is small and adjust position
    if (window.innerWidth < 768) {
      button.style.bottom = '10px';
      button.style.right = '10px';
    }
  }

  // Show/hide button based on compose box presence
  toggleButtonVisibility(button, isVisible) {
    if (!button) return;

    if (isVisible) {
      button.style.display = 'block';
      this.positionFloatingButton(button);
    } else {
      button.style.display = 'none';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GmailDOM;
} else {
  window.GmailDOM = GmailDOM;
}
