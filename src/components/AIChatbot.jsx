import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MapPin, Phone, Shield, Heart, Mic, MicOff, Volume2, VolumeX, Send, X, MessageCircle } from "lucide-react";
import { openSafePlacesModal } from "./SafePlaces";

// Callback to open Safe Places modal
let openSafePlacesCallback = null;

export const setSafePlacesCallback = (callback) => {
  openSafePlacesCallback = callback;
};

// Set the callback to open Safe Places
openSafePlacesCallback = openSafePlacesModal;

// Emergency quick actions
const QUICK_ACTIONS = [
  { id: "unsafe", icon: Shield, label: "I feel unsafe", color: "red" },
  { id: "emergency", icon: Phone, label: "Emergency", color: "red" },
  { id: "safe-place", icon: MapPin, label: "Safe place nearby", color: "green" },
  { id: "helpline", icon: Heart, label: "Helpline numbers", color: "blue" },
];

// Smart fallback responses - works without API
const FALLBACK_RESPONSES = {
  greeting: {
    en: "Namaste! 🙏 I'm your Suraksha safety assistant. I'm here to help you stay safe. What do you need?\n\nQuick tips:\n• Tap 'I feel unsafe' for immediate help\n• Use 'Emergency' for urgent situations\n• Find safe places nearby\n• Get helpline numbers",
    hi: "नमस्ते! 🙏 मैं आपकी सुरक्षा सहायक हूँ। मैं आपकी मदद करना चाहती हूँ। आपको क्या चाहिए?\n\nत्वरित टिप्स:\n• तुरंत मदद के लिए 'I feel unsafe' टैप करें\n• आपातकालीन स्थिति के लिए 'Emergency' का उपयोग करें\n• नज़दीकी सुरक्षित स्थान खोजें\n• हेल्पलाइन नंबर प्राप्त करें"
  },
  thanks: {
    en: "You're welcome! 🙏 Stay safe and don't hesitate to reach out if you need help. Remember, your safety is the priority!",
    hi: "आपका स्वागत है! 🙏 सुरक्षित रहें और अगर मदद चाहिए तो संकोच न करें। याद रखें, आपकी सुरक्षा सबसे ज़रूरी है!"
  },
  help: {
    en: "I can help you with:\n\n🛡️ Safety guidance\n📍 Finding safe places\n📞 Emergency contacts\n💡 Safety tips\n🚨 SOS alerts\n\nJust ask or use the quick action buttons above!",
    hi: "मैं आपकी मदद कर सकती हूँ:\n\n🛡️ सुरक्षा मार्गदर्शन\n📍 सुरक्षित स्थान खोजना\n📞 इमरजेंसी संपर्क\n💡 सुरक्षा टिप्स\n🚨 SOS अलर्ट\n\nबस पूछें या ऊपर दिए गए क्विक एक्शन बटन का उपयोग करें!"
  },
  unsafe: {
    en: "I understand you're feeling unsafe. Here's what to do:\n\n1️⃣ Move to a well-lit, populated area\n2️⃣ Stay aware of your surroundings\n3️⃣ Call someone you trust\n4️⃣ Dial 112 if in immediate danger\n\nWould you like me to activate SOS alerts?",
    hi: "मैं समझती हूं कि आप असुरक्षित महसूस कर रही हैं। यहाँ क्या करें:\n\n1️⃣ अच्छी रोशनी वाली भीड़भाड़ वाली जगह पर जाएं\n2️⃣ अपने आसपास के प्रति सतर्क रहें\n3️⃣ किसी विश्वसनीय व्यक्ति को कॉल करें\n4️⃣ तत्काल खतरे में 112 डायल करें\n\nक्या आप SOS अलर्ट सक्रिय करना चाहेंगी?"
  },
  emergency: {
    en: "🚨 EMERGENCY HELP 🚨\n\nImmediate actions:\n1. Call 112 (National Emergency)\n2. Call 100 (Police)\n3. Share your location with trusted contacts\n4. Move to safety\n\nStay calm. Help is on the way!",
    hi: "🚨 इमरजेंसी मदद 🚨\n\nतुरंत करें:\n1. 112 कॉल करें (राष्ट्रीय इमरजेंसी)\n2. 100 कॉल करें (पुलिस)\n3. अपनी लोकेशन विश्वसनीय संपर्कों के साथ साझा करें\n4. सुरक्षित स्थान पर जाएं\n\nशांत रहें। मदद रास्ते में है!"
  },
  safe_place: {
    en: "📍 Safe places near you:\n\n• Police Stations\n• Hospitals (24/7)\n• Women's Help Desks\n• Metro/Train Stations\n• Shopping Malls\n• Hotels\n\nEnable location for exact directions!",
    hi: "📍 आपके पास सुरक्षित स्थान:\n\n• पुलिस स्टेशन\n• अस्पताल (24/7)\n• महिला हेल्प डेस्क\n• मेट्रो/ट्रेन स्टेशन\n• शॉपिंग मॉल\n• होटल\n\nसटीक दिशाओं के लिए लोकेशन सक्षम करें!"
  },
  helpline: {
    en: "📞 Important Helpline Numbers:\n\n🚨 112 - National Emergency (24/7)\n👮 100 - Police\n🚑 102 - Ambulance\n🔥 101 - Fire\n👩 181 - Women's Helpline\n🧒 1098 - Child Helpline\n⚡ 1091 - Women's Helpline (Delhi)\n\nSave these numbers now!",
    hi: "📞 महत्वपूर्ण हेल्पलाइन नंबर:\n\n🚨 112 - राष्ट्रीय इमरजेंसी (24/7)\n👮 100 - पुलिस\n🚑 102 - एम्बुलेंस\n🔥 101 - अग्निशामक\n👩 181 - महिला हेल्पलाइन\n🧒 1098 - चाइल्ड हेल्पलाइन\n⚡ 1091 - महिला हेल्पलाइन (दिल्ली)\n\nइन नंबरों को अभी सेव करें!"
  },
  default: {
    en: "Thank you for reaching out. I'm here to help with your safety.\n\nFor immediate assistance:\n• Use quick action buttons above\n• Call 112 for emergencies\n• Share your location for nearby help\n\nHow can I assist you?",
    hi: "संपर्क करने के लिए धन्यवाद। मैं आपकी सुरक्षा में मदद करने के लिए यहाँ हूँ।\n\nतत्काल सहायता के लिए:\n• ऊपर दिए गए क्विक एक्शन बटन का उपयोग करें\n• इमरजेंसी के लिए 112 कॉल करें\n• नज़दीकी मदद के लिए अपनी लोकेशन साझा करें\n\nमैं आपकी कैसे मदद कर सकती हूँ?"
  }
};

// Smart response selector
const getFallbackResponse = (message) => {
  const lowerMsg = message.toLowerCase();
  const lang = lowerMsg.match(/[अ-ह]/) ? "hi" : "en"; // Detect Hindi script

  // 🚨 Detect police station / safe place search - trigger Safe Places modal
  const policeSearchTerms = /(police|station|thana|cop|nearest police|nearby police|पुलिस|थाना|नज़दीकी पुलिस)/;
  const safePlaceTerms = /(safe place|shelter|hospital|help desk|women shelter|सुरक्षित जगह|शelter)/;
  
  if (lowerMsg.match(policeSearchTerms) || lowerMsg.match(safePlaceTerms)) {
    console.log("🚨 Police/Safe place search detected:", message);
    // Trigger Safe Places modal after a short delay
    setTimeout(() => {
      console.log("🛡️ Attempting to open Safe Places modal...");
      openSafePlacesModal();
    }, 500);
    
    return { 
      text: lang === "hi" 
        ? "🛡️ मैं आपके पास के पुलिस स्टेशन और सुरक्षित स्थान दिखा रही हूँ...\n\nकृपया नीचे दिए गए बटन का उपयोग करें या लोकेशन अनुमति दें।\n\n📍 तुरंत मदद के लिए:\n• 112 - राष्ट्रीय इमरजेंसी\n• 100 - पुलिस\n• 181 - महिला हेल्पलाइन"
        : "🛡️ Showing you nearby police stations and safe places...\n\nPlease use the button below or enable location.\n\n📍 For immediate help:\n• 112 - National Emergency\n• 100 - Police\n• 181 - Women's Helpline",
      lang,
      showSafePlaces: true
    };
  }

  if (lowerMsg.match(/^(hi|hello|hey|namaste|नमस्ते|हलो|नमस्कार)/)) {
    return { text: FALLBACK_RESPONSES.greeting[lang], lang };
  }
  if (lowerMsg.match(/(thank|thanks|शुक्रिया|धन्यवाद)/)) {
    return { text: FALLBACK_RESPONSES.thanks[lang], lang };
  }
  if (lowerMsg.match(/(help|मदद|सहायता)/)) {
    return { text: FALLBACK_RESPONSES.help[lang], lang };
  }
  if (lowerMsg.match(/(unsafe|scared|danger|afraid|डर|खतरा|असुरक्षित)/)) {
    return { text: FALLBACK_RESPONSES.unsafe[lang], lang };
  }
  if (lowerMsg.match(/(emergency|urgent|बचाओ|इमरजेंसी|तुरंत)/)) {
    return { text: FALLBACK_RESPONSES.emergency[lang], lang };
  }
  if (lowerMsg.match(/(helpline|number|contact|phone|नंबर|संपर्क)/)) {
    return { text: FALLBACK_RESPONSES.helpline[lang], lang };
  }

  return { text: FALLBACK_RESPONSES.default[lang], lang };
};

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en"); // 'en' or 'hi'
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [location, setLocation] = useState(null);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Mark as mounted
  useEffect(() => {
    setMounted(true);
    console.log("✅ AIChatbot mounted successfully");
    console.log("📱 Speech support available:", speechSupportAvailable);
    console.log("🔑 Has API key:", hasApiKey);
  }, []);

  // Initialize Gemini AI
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log("🔑 Gemini API Key loaded:", apiKey ? `${apiKey.substring(0, 10)}...` : "NOT FOUND");
  
  const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  const model = apiKey ? genAI.getGenerativeModel({ model: "gemini-pro" }) : null;

  // Check if API key exists
  const hasApiKey = !!apiKey;

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location permission denied")
      );
    }
  }, []);

  // Initialize Speech Recognition
  const [speechSupportAvailable, setSpeechSupportAvailable] = useState(false);

  useEffect(() => {
    // Check for Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setSpeechSupportAvailable(true);
      console.log("✅ Speech Recognition supported");
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-US";
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log("🎤 Speech recognition started");
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("🎤 Speech recognized:", transcript);
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("❌ Speech recognition error:", event.error);
        setIsListening(false);
        
        // Show user-friendly error
        if (event.error === 'not-allowed') {
          alert(language === "hi" 
            ? "माइक अनुमति नहीं दी गई। कृपया ब्राउज़र सेटिंग्स में माइक अनुमति दें।" 
            : "Microphone permission not granted. Please allow microphone in browser settings.");
        } else if (event.error === 'no-speech') {
          alert(language === "hi"
            ? "कोई आवाज़ नहीं सुनी गई। कृपया फिर से प्रयास करें।"
            : "No speech detected. Please try again.");
        }
      };

      recognitionRef.current.onend = () => {
        console.log("🎤 Speech recognition ended");
        setIsListening(false);
      };

      recognitionRef.current.onnomatch = () => {
        console.log("⚠️ No speech match");
        setIsListening(false);
      };
    } else {
      setSpeechSupportAvailable(false);
      console.warn("❌ Speech Recognition NOT supported in this browser. Use Chrome or Edge.");
    }
  }, [language]);

  // Text to Speech
  const speak = (text) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Voice Input
  const toggleListening = () => {
    console.log("🎤 Toggle listening - Speech support:", speechSupportAvailable);
    console.log("🎤 Recognition object:", recognitionRef.current);
    
    if (!speechSupportAvailable) {
      alert(language === "hi"
        ? "आपका ब्राउज़र वॉइस इनपुट का समर्थन नहीं करता। कृपया Chrome या Edge का उपयोग करें।"
        : "Your browser doesn't support voice input. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        console.log("🎤 Stopped listening");
      }
    } else {
      try {
        // Request microphone permission first
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            console.log("✅ Microphone permission granted");
            // Permission granted, start recognition
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log("🎤 Started listening");
              } catch (e) {
                console.error("❌ Error starting recognition:", e);
                setIsListening(false);
              }
            }
          })
          .catch((err) => {
            console.error("❌ Microphone permission error:", err);
            setIsListening(false);
            alert(language === "hi"
              ? "माइक अनुमति आवश्यक है। कृपया ब्राउज़र सेटिंग्स में अनुमति दें।"
              : "Microphone permission required. Please allow in browser settings.");
          });
      } catch (error) {
        console.error("❌ Error in toggleListening:", error);
        setIsListening(false);
      }
    }
  };

  // Generate AI response with context
  const generateAIResponse = async (userMessage) => {
    if (!hasApiKey || !model) {
      return language === "hi"
        ? "नमस्ते! मैं आपकी मदद करना चाहती हूँ, लेकिन API कुंजी सेट नहीं है।\n\nतुरंत मदद के लिए:\n• 112 - राष्ट्रीय इमरजेंसी\n• 100 - पुलिस\n• 181 - महिला हेल्पलाइन"
        : "Hello! I'd love to help, but the API key is not configured.\n\nFor immediate help:\n• 112 - National Emergency\n• 100 - Police\n• 181 - Women's Helpline";
    }

    const systemPrompt = `You are Suraksha Bot, a compassionate and helpful AI assistant for women's safety in India.
    You provide practical advice, emotional support, and emergency guidance.
    You speak in ${language === "hi" ? "Hindi (Devanagari script)" : "English"}.
    Keep responses concise (2-3 sentences), empathetic, and action-oriented.
    Always prioritize user safety. Include emergency numbers when relevant.

    Context: User location is ${location ? `${location.lat}, ${location.lng}` : "unknown"}.

    Respond helpfully to: ${userMessage}`;

    try {
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API Error:", error.message);
      throw error; // Let sendMessage handle the fallback
    }
  };

  const sendMessage = async (text = input) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let botResponse = "";

    try {
      // Always use smart fallback (works without API)
      const fallback = getFallbackResponse(text);
      
      // Try Gemini API if available
      if (hasApiKey && model) {
        try {
          botResponse = await generateAIResponse(text);
        } catch (apiError) {
          // API failed, use fallback
          console.log("Using fallback response");
          botResponse = fallback.text;
          // Update language if detected differently
          if (fallback.lang !== language) {
            setLanguage(fallback.lang);
          }
        }
      } else {
        // No API key, use fallback
        botResponse = fallback.text;
        if (fallback.lang !== language) {
          setLanguage(fallback.lang);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const fallback = getFallbackResponse(text);
      botResponse = fallback.text;
    }

    const botMessage = { role: "bot", content: botResponse, timestamp: new Date() };
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);

    // Auto-speak response if enabled
    if (isSpeaking) {
      speak(botResponse.replace(/[🚨📍📞👩🧒🚑🔥👮1️⃣2️⃣3️⃣4️⃣🛡️💡🙏]/g, ""));
    }
  };

  const handleQuickAction = (actionId) => {
    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    if (action) {
      // Open Safe Places modal for "safe-place" action
      if (actionId === "safe-place") {
        openSafePlacesModal();
        return;
      }
      
      // Direct response for other quick actions (instant, no API needed)
      const actionResponses = {
        unsafe: language === "hi" ? FALLBACK_RESPONSES.unsafe.hi : FALLBACK_RESPONSES.unsafe.en,
        emergency: language === "hi" ? FALLBACK_RESPONSES.emergency.hi : FALLBACK_RESPONSES.emergency.en,
        helpline: language === "hi" ? FALLBACK_RESPONSES.helpline.hi : FALLBACK_RESPONSES.helpline.en,
      };

      const userMessage = { role: "user", content: action.label, timestamp: new Date() };
      const botMessage = { role: "bot", content: actionResponses[actionId], timestamp: new Date() };
      setMessages(prev => [...prev, userMessage, botMessage]);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "hi" : "en");
  };

  return (
    <>
      {/* Floating Chat Button - Responsive sizes */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full shadow-2xl transition-all duration-300 overflow-hidden border-2 sm:border-3 md:border-4 border-white/20"
        whileHover={{ scale: 1.15, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        style={{ pointerEvents: 'auto' }}
      >
        {open ? (
          <X size={28} className="text-white sm:size-30 md:size-36 lg:size-40" />
        ) : (
          <img src="/robot.gif" alt="Chatbot" className="w-full h-full object-cover" />
        )}
      </motion.button>

      {/* Chat Window - Fully Responsive */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 sm:bottom-24 md:bottom-28 right-4 sm:right-6 z-[9998] w-[calc(100vw-2rem)] sm:w-[90vw] md:w-[450px] lg:w-[500px] max-w-[500px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header - Responsive */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                    <img src="/robot.gif" alt="AI Bot" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-bold text-base sm:text-lg truncate">Suraksha AI</h3>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <p className="text-green-100 text-xs flex items-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse flex-shrink-0"></span>
                        {language === "hi" ? "ऑनलाइन • हिंदी" : "Online • English"}
                      </p>
                      {!hasApiKey && (
                        <span className="text-yellow-200 text-xs ml-1 sm:ml-2" title="API Key not configured">⚠️</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  <motion.button
                    onClick={toggleLanguage}
                    className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full hover:bg-white/30 transition-colors whitespace-nowrap"
                    whileTap={{ scale: 0.9 }}
                  >
                    {language === "hi" ? "English" : "हिंदी"}
                  </motion.button>
                  <motion.button
                    onClick={() => setIsSpeaking(!isSpeaking)}
                    className={`p-2 rounded-full transition-colors ${isSpeaking ? "bg-white/30" : "bg-white/20"} hover:bg-white/30 flex-shrink-0`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isSpeaking ? <Volume2 size={18} className="text-white" /> : <VolumeX size={18} className="text-white" />}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Quick Actions - Responsive */}
            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2 px-1">{language === "hi" ? "त्वरित कार्यों के लिए टैप करें:" : "Tap for quick actions:"}</p>
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_ACTIONS.map((action) => (
                  <motion.button
                    key={action.id}
                    onClick={() => handleQuickAction(action.id)}
                    className={`flex items-center justify-center space-x-1 px-2 sm:px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                      action.color === "red" 
                        ? "bg-red-100 text-red-700 hover:bg-red-200" 
                        : action.color === "green"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <action.icon size={14} className="flex-shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Messages - Responsive */}
            <div className="h-[320px] sm:h-80 md:h-96 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-4">🙏</div>
                  <p className="text-gray-600 font-semibold text-base sm:text-lg md:text-lg">
                    {language === "hi" ? "नमस्ते! मैं आपकी कैसे मदद कर सकती हूँ?" : "Namaste! How can I help you today?"}
                  </p>
                  <p className="text-gray-500 text-sm sm:text-base mt-2 px-4">
                    {language === "hi" ? "मैं आपकी सुरक्षा के लिए यहाँ हूँ" : "I'm here for your safety"}
                  </p>
                </motion.div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-5 py-2 sm:py-3 rounded-2xl text-sm sm:text-base ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-br-sm"
                          : "bg-white shadow-md text-gray-800 rounded-bl-sm border border-gray-100"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === "user" ? "text-green-100" : "text-gray-400"}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white shadow-md px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Responsive */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-white">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <motion.button
                  onClick={toggleListening}
                  disabled={isLoading || !speechSupportAvailable}
                  className={`p-1 sm:p-1.5 md:p-1 lg:p-1 rounded-full transition-all flex-shrink-0 ${
                    isListening
                      ? "bg-red-100 text-red-600 animate-pulse"
                      : !speechSupportAvailable
                      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  whileTap={{ scale: 0.9 }}
                  title={!speechSupportAvailable ? (language === "hi" ? "वॉइस इनपुट समर्थित नहीं" : "Voice input not supported") : ""}
                >
                  {isListening ? <MicOff size={12} className="sm:size-14 md:size-12 lg:size-12" /> : <Mic size={12} className="sm:size-14 md:size-12 lg:size-12" />}
                </motion.button>
                {!speechSupportAvailable && (
                  <span className="text-xs text-gray-500 hidden sm:inline" title="Use Chrome or Edge for voice input">
                    {language === "hi" ? "क्रोम का उपयोग करें" : "Use Chrome"}
                  </span>
                )}

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder={language === "hi" ? "अपना संदेश टाइप करें..." : "Type your message..."}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm sm:text-base min-w-0"
                  disabled={isLoading}
                />

                <motion.button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="p-1 sm:p-1.5 md:p-1 lg:p-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-full transition-all shadow-lg flex-shrink-0"
                  whileHover={{ scale: isLoading || !input.trim() ? 1 : 1.1 }}
                  whileTap={{ scale: isLoading || !input.trim() ? 1 : 0.9 }}
                >
                  <Send size={12} className="sm:size-14 md:size-12 lg:size-12" />
                </motion.button>
              </div>
              {isListening && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-red-500 text-center mt-2 flex items-center justify-center"
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  {language === "hi" ? "सुन रहा हूँ..." : "Listening..."}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
