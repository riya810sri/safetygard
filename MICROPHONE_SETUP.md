# 🎤 Microphone/Voice Input Troubleshooting

## Issue: Microphone not working in chatbot

### Quick Fixes

#### 1. **Use Chrome or Edge Browser**
Speech Recognition only works in:
- ✅ Google Chrome (Recommended)
- ✅ Microsoft Edge
- ❌ Firefox (limited support)
- ❌ Safari (no support)

#### 2. **Allow Microphone Permission**

**Chrome/Edge:**
1. Click the 🔒 lock icon in the address bar
2. Find "Microphone" 
3. Toggle to "Allow"
4. Refresh the page

**Windows:**
1. Go to Settings → Privacy → Microphone
2. Enable "Allow apps to access your microphone"
3. Enable for your browser

#### 3. **Check Browser Support**

Open browser console (F12) and type:
```javascript
console.log("Speech Recognition:", window.SpeechRecognition || window.webkitSpeechRecognition);
```

If it shows `undefined`, your browser doesn't support it.

#### 4. **HTTPS Required**
- Voice input works on `localhost` (development)
- In production, your site MUST use HTTPS

### Manual Test

Visit: https://mdn.github.io/dom-examples/web-speech-api/speak-easy-synthesis/

This tests if your browser supports speech recognition.

### Common Errors

| Error | Solution |
|-------|----------|
| "not-allowed" | Grant microphone permission in browser settings |
| "no-speech" | Speak louder, check microphone hardware |
| "audio-capture" | Ensure microphone is connected and working |
| "not-allowed" (HTTPS) | Make sure site uses HTTPS in production |

### Alternative: Manual Typing

If voice still doesn't work:
- Just type your message in the input box
- All features work without voice input!

### Code Check

The chatbot now includes:
- ✅ Browser support detection
- ✅ Permission request handling
- ✅ User-friendly error messages
- ✅ Visual feedback (red pulsing when listening)
- ✅ Disabled state if not supported

### Still Not Working?

1. **Restart browser** - Sometimes helps
2. **Update Chrome** - Latest version recommended
3. **Check microphone** - Test in another app first
4. **Clear site data** - Settings → Privacy → Clear browsing data

---

## Quick Test Commands

Open browser console (F12) and run:

```javascript
// Check if speech recognition is available
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
console.log("Speech Recognition Available:", !!SR);

// Check microphone permission
navigator.permissions.query({ name: 'microphone' })
  .then(result => console.log("Mic Permission:", result.state));
```

Expected output:
```
Speech Recognition Available: true
Mic Permission: granted
```
