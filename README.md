# ChatJeePT - AI Email Assistant for Gmail

Never type the same email response twice! ChatJeePT helps you quickly draft Gmail replies using information from JeepBeach.com. Just click a button, and get an intelligent draft reply ready to review and send.

## What Does It Do?

ChatJeePT adds a button to your Gmail compose window. When you click it:
1. It reads the email you're replying to
2. It finds relevant information from JeepBeach.com
3. It writes a helpful draft reply for you
4. You review, edit if needed, and send

**Important:** This extension never sends emails automatically. You always have full control.

## Quick Start Guide

### Step 1: Download the Extension

1. Click the green **"Code"** button
2. Click **"Download ZIP"**
3. Find the downloaded file (usually in your Downloads folder)
4. Double-click to unzip it - you'll see a folder called `chat-jeept-main`

### Step 2: Install in Chrome

1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. Look for a switch in the top-right that says **"Developer mode"** - turn it ON
4. Click the **"Load unpacked"** button (top-left)
5. Navigate to your Downloads folder → `chat-jeept-main` → `extension`
6. Click **"Select"** (or **"Open"**)
7. You should now see "ChatJeePT" in your extensions list!

### Step 3: Get Your OpenAI API Key

This extension uses OpenAI (the company behind ChatGPT) to generate drafts. You'll need a free account:

1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click **"Create new secret key"**
4. Give it a name like "ChatJeePT"
5. Copy the key (it looks like: `sk-...`)
6. **Important:** Save this somewhere safe - you can't see it again!

**Note:** OpenAI charges a small amount per use (typically a few cents per month for light use).

### Step 4: Configure the Extension

1. Click the puzzle piece icon in Chrome's toolbar (top-right)
2. Find "ChatJeePT" and click it
3. Paste your OpenAI API key in the first box
4. Click **"Save Settings"**
5. That's it!

## How to Use

1. Go to Gmail and open any email
2. Click **"Reply"** (or start a new email)
3. Look for the **"ChatJeePT"** button in the bottom-right corner of the compose window
4. Click it
5. Wait a few seconds while it generates your draft
6. Review the draft, make any changes you want
7. Click **"Send"** when ready

**Tip:** If you've already started writing a response, clicking the ChatJeePT button will replace what you've written with a new AI-generated draft. Use it before you start typing, or be ready to lose your draft!

## Settings You Can Change

Click the extension icon to access these options:

- **Response Tone**: How formal or casual your replies should be (default: "friendly and professional")
- **Fallback Message**: What to say when the extension can't find relevant information
- **Content Sources**: The JeepBeach.com information used to write replies

## Common Questions

**Q: How much does this cost?**
A: The extension is free, but OpenAI charges for API usage. Typical cost is $0.01-0.05 per month for casual use.

**Q: Will it send emails without asking me?**
A: No! It only creates drafts. You always review and click send yourself.

**Q: What if I don't like the draft it created?**
A: Just edit it like any other email, or delete it and write your own.

**Q: Can I use this with other email services?**
A: Currently it only works with Gmail (mail.google.com).

**Q: Is my email data safe?**
A: Your emails are only sent to OpenAI to generate the draft. Nothing is stored permanently. Your API key stays on your computer.

## Troubleshooting

### The ChatJeePT button isn't showing up

1. Make sure you've clicked "Reply" or "Compose" in Gmail
2. Refresh your Gmail page (press F5 or Cmd+R)
3. Check that the extension is enabled:
   - Go to `chrome://extensions/`
   - Make sure ChatJeePT has the toggle turned ON

### I'm getting an error about my API key

1. Double-check you copied the entire key (starts with `sk-`)
2. Make sure you have credits in your OpenAI account:
   - Go to [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
   - Add a payment method if needed
3. Try creating a new API key and using that instead

### The draft it created doesn't make sense

- Click "Refresh Content" in the extension settings to update the JeepBeach.com information
- Make sure the email you're replying to is visible on screen
- The extension works best when replying to clear questions

### It's taking a long time to generate a draft

- This is normal - it usually takes 3-10 seconds
- If it takes longer than 30 seconds, refresh Gmail and try again

### I want to uninstall the extension

1. Go to `chrome://extensions/`
2. Find "ChatJeePT"
3. Click **"Remove"**
4. Your API key will be deleted automatically

## Need More Help?

If you're still having issues, you can:
1. Check the [Issues page on GitHub](https://github.com/yourusername/chat-jeept/issues)
2. Create a new issue describing your problem

---

## For Developers

<details>
<summary>Technical Documentation (click to expand)</summary>

### File Structure

```
extension/
├── manifest.json           # Extension manifest
├── background.js           # Service worker for LLM calls
├── content.js             # Gmail integration script
├── options.html           # Settings page
├── options.js             # Settings page logic
├── styles.css             # Extension styles
├── icons/                 # Extension icons
└── utils/                 # Utility modules
    ├── storage.js         # Chrome storage management
    ├── gmailDom.js        # Gmail DOM utilities
    ├── siteScrape.js      # Website content scraping
    └── llm.js             # LLM integration
```

### API Details

**OpenAI API:**
- Model: GPT-4o-mini
- Max Tokens: 250
- Temperature: 0.5

### Development Setup

1. Clone the repository
2. Make changes to the code
3. Go to `chrome://extensions/`
4. Click the refresh icon on the extension
5. Test your changes in Gmail

### Privacy & Security

- API keys stored locally in Chrome's sync storage
- No email content permanently stored
- All requests made directly from browser
- Only sends data to OpenAI for draft generation

</details>
