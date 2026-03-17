import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newChat = [...chat, { user: message }];
    setChat(newChat);
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/chat", {
        message,
      });
      setChat([...newChat, { bot: res.data.reply }]);
    } catch (error) {
      setChat([...newChat, { bot: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <span className="text-2xl">💬</span>
      </motion.button>

      {/* Chatbot Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-green-600 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Chatbot Assistant</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {chat.length === 0 ? (
                <p className="text-gray-500 text-center text-sm mt-8">
                  👋 Hi! How can I help you today?
                </p>
              ) : (
                chat.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {msg.user && (
                      <div className="flex justify-end">
                        <div className="bg-green-600 text-white px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                          {msg.user}
                        </div>
                      </div>
                    )}
                    {msg.bot && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 px-3 py-2 rounded-2xl rounded-tl-sm max-w-[80%] text-sm">
                          {msg.bot}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-3 py-2 rounded-2xl rounded-tl-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-3 bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  disabled={loading}
                />
                <motion.button
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-full transition-colors"
                  whileHover={{ scale: loading || !message.trim() ? 1 : 1.05 }}
                  whileTap={{ scale: loading || !message.trim() ? 1 : 0.95 }}
                >
                  📤
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}