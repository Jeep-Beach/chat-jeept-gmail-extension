# ChatJeePT Chrome Extension

A Chrome extension that helps draft Gmail replies using content from JeepBeach.com. The extension reads the last inbound message, fetches relevant information from JeepBeach.com, and generates a contextual draft reply using an LLM.

## Features

- **Smart Draft Generation**: Uses LLM to generate contextual replies based on JeepBeach.com content
- **Two Context Modes**:
  - Simple DOM mode (default): Reads visible email content from Gmail's DOM
  - Gmail API mode (optional): Fetches the latest inbound message via Gmail API
- **Content Caching**: Caches JeepBeach.com content for 4 hours to reduce network calls
- **Configurable Settings**: Customizable tone, fallback messages, and content sources
- **Safety Features**: Grounded responses only using provided content, no automatic sending

## Installation

### 1. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder
4. The extension should now appear in your extensions list

### 2. Basic Setup

1. Click the extension icon in the toolbar to open settings
2. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
3. Paste your API key in the "OpenAI API Key" field
4. Click "Save Settings"
5. Go to Gmail and start composing a reply
6. Look for the "ChatJeePT" floating button

### 3. Optional Gmail API Setup

For more reliable context fetching:

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials (Web application type)
5. Add your extension ID to authorized origins
6. Update the `client_id` in `manifest.json`
7. Enable "Use Gmail API for context" in the extension settings

## Usage

### Generating Drafts

1. Open Gmail and start composing a reply to an email
2. The "ChatJeePT" button will appear in the bottom-right corner
3. Click the button to generate a draft reply
4. The draft will be inserted into your compose box
5. Review, edit, and send as normal

### Configuration

Access settings by clicking the extension icon in Chrome's toolbar:

- **API Key**: Your OpenAI API key
- **Response Tone**: Describes the tone for generated replies
- **Fallback Message**: Message used when no relevant content is found
- **Content Sources**: Static Jeep Beach information used for context
- **Use Gmail API**: Toggle between DOM and API context modes

## File Structure

```
extension/
├── manifest.json           # Extension manifest
├── background.js           # Service worker for LLM calls
├── content.js             # Gmail integration script
├── options.html           # Settings page
├── options.js             # Settings page logic
├── styles.css             # Extension styles
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── utils/                 # Utility modules
    ├── storage.js         # Chrome storage management
    ├── gmailDom.js        # Gmail DOM utilities
    ├── siteScrape.js      # Website content scraping
    └── llm.js             # LLM integration
```

## API Requirements

### OpenAI API
- **Model**: GPT-4o-mini (default)
- **Max Tokens**: 250
- **Temperature**: 0.5
- **Required Scope**: `https://api.openai.com/*`

### Gmail API (Optional)
- **Scope**: `https://www.googleapis.com/auth/gmail.readonly`
- **Required for**: Gmail API context mode

## Safety Features

- **Grounded Responses**: Only uses information from provided JeepBeach.com content
- **No Auto-Sending**: Only inserts drafts, never sends automatically
- **Fallback Handling**: Uses fallback message when no relevant content is found
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Content Validation**: Truncates content to prevent token limit issues

## Troubleshooting

### Common Issues

1. **Button Not Appearing**
   - Ensure you're in Gmail's compose/reply mode
   - Check that the extension is enabled
   - Refresh the Gmail page

2. **API Key Errors**
   - Verify your OpenAI API key is correct
   - Check that you have sufficient API credits
   - Test the API key using the "Test LLM" button

3. **No Draft Generated**
   - Use "Refresh Content" to update content
   - Verify the email context is readable

4. **Gmail API Issues**
   - Ensure OAuth is properly configured
   - Check that the Gmail API is enabled
   - Verify the client ID in manifest.json

### Debug Mode

Enable Chrome's developer tools to see console logs:
1. Right-click the extension icon → "Inspect popup"
2. Check the Console tab for error messages
3. Use the Network tab to debug API calls

## Development

### Prerequisites
- Chrome browser
- OpenAI API key
- Basic knowledge of Chrome extension development

### Local Development
1. Clone or download the extension files
2. Make changes to the code
3. Go to `chrome://extensions/`
4. Click the refresh icon on the extension
5. Test your changes

### Testing
1. Test with various email types
2. Verify both DOM and API context modes
3. Check error handling with invalid API keys
4. Test content caching behavior

## Limitations

- Only works with Gmail (mail.google.com)
- Requires internet connection for LLM calls
- Uses static content for context
- Button only appears when composing/replying
- Limited to the provided JeepBeach.com content

## Privacy & Security

- API keys are stored locally in Chrome's sync storage
- No email content is permanently stored
- All network requests are made directly from your browser
- No data is sent to third parties except OpenAI

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all requirements are met
4. Test with the provided test functions

## License

This extension is provided as-is for educational and personal use. Please ensure compliance with OpenAI's terms of service and Gmail's API usage policies.
