# 🤖 AI-Powered Smart Chatbot - Suraksha

## Features ✨

### 1. **Google Gemini AI Integration**
- Context-aware conversations
- Empathetic and action-oriented responses
- Prioritizes user safety
- Includes emergency numbers when relevant

### 2. **Bilingual Support** 🌐
- **English** and **Hindi (हिंदी)** support
- One-click language toggle
- Native script support for Hindi

### 3. **Voice Interface** 🎤
- **Voice Input**: Speech-to-text using Web Speech API
- **Voice Output**: Text-to-speech for bot responses
- Supports both English and Hindi voice recognition

### 4. **Emergency Quick Actions** 🚨
Pre-configured buttons for instant help:
- 🛡️ **I feel unsafe** - Safety guidance
- 📞 **Emergency** - Emergency mode activation
- 📍 **Safe place nearby** - Find safe locations
- ❤️ **Helpline numbers** - Important contacts

### 5. **Smart Context Detection**
- Automatically detects emergency keywords
- Provides location-based suggestions
- Remembers conversation context

### 6. **Modern UI/UX**
- Smooth animations with Framer Motion
- Responsive design (mobile + desktop)
- Beautiful gradient theme
- Loading states and typing indicators

---

## Setup Instructions

### 1. Get Gemini API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Get API Key"
3. Create a new project or use existing
4. Copy your API key

### 2. Add API Key to `.env.local`
```bash
# Google Gemini API Key
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Restart Development Server
```bash
npm run dev
```

---

## Usage

### Quick Actions
Click on any quick action button for instant responses:
- **"I feel unsafe"** → Gets safety steps and SOS option
- **"Emergency"** → Activates emergency mode
- **"Safe place nearby"** → Shows nearby safe locations
- **"Helpline numbers"** → Displays important contacts

### Voice Input
1. Click the 🎤 microphone button
2. Speak your message
3. Click again to stop

### Voice Output
1. Click the 🔊 speaker icon in header
2. Bot will read responses aloud
3. Click again to mute

### Language Toggle
- Click **"हिंदी"** or **"English"** button in header
- Instantly switches interface language
- Voice recognition adapts to selected language

---

## Emergency Keywords

The chatbot automatically detects these keywords and provides emergency responses:

| Keyword | Response |
|---------|----------|
| "unsafe", "scared", "danger" | Safety guidance + SOS option |
| "emergency", "help", "save me" | Emergency mode + 112 |
| "safe place", "shelter", "hospital" | Nearby safe locations |
| "helpline", "police", "number" | Emergency contacts |

---

## Technical Details

### Technologies Used
- **Google Gemini Pro** - AI language model
- **Web Speech API** - Voice input/output
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **React Hooks** - State management

### API Configuration
```javascript
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
```

### Voice Support
```javascript
// Speech Recognition
const recognition = new SpeechRecognition();
recognition.lang = "hi-IN"; // or "en-US"

// Speech Synthesis
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = "hi-IN"; // or "en-US"
```

---

## Customization

### Change Quick Actions
Edit the `QUICK_ACTIONS` array in `AIChatbot.jsx`:
```javascript
const QUICK_ACTIONS = [
  { id: "custom", icon: YourIcon, label: "Your Label", color: "purple" },
];
```

### Modify Emergency Responses
Edit the `EMERGENCY_KEYWORDS` object:
```javascript
emergency: {
  en: "Your custom English response",
  hi: "आपका कस्टम हिंदी जवाब"
}
```

### Adjust AI Personality
Modify the `systemPrompt` in `generateAIResponse()`:
```javascript
const systemPrompt = `You are Suraksha Bot, ... 
Your custom instructions here...`;
```

---

## Troubleshooting

### Voice Input Not Working
- Ensure browser supports Web Speech API (Chrome/Edge recommended)
- Grant microphone permissions
- Check if HTTPS is enabled (required for production)

### Gemini API Errors
- Verify API key is correct in `.env.local`
- Check API quota at https://aistudio.google.com
- Ensure internet connection is stable

### Hindi Voice Not Recognized
- Use Chrome browser (best Hindi support)
- Speak clearly in Hindi
- Check microphone quality

---

## Future Enhancements 🚀

- [ ] Location-based safe place mapping
- [ ] Integration with local police databases
- [ ] Offline mode with cached responses
- [ ] WhatsApp/Telegram bot integration
- [ ] Multi-language expansion (Tamil, Telugu, Bengali)
- [ ] Emergency contact auto-dial
- [ ] Live location sharing in chat
- [ ] Conversation history sync with Firebase

---

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` to Git
- Keep Gemini API key secret
- Rate limit API calls in production
- Implement user authentication for chat history
- Add content moderation for user inputs

---

## Credits

Developed for **Suraksha** - Women's Safety Platform
- AI: Google Gemini
- Voice: Web Speech API
- UI: React + Tailwind + Framer Motion
