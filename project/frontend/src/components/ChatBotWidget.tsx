import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageCircle, X, Send, Bot, User, Sparkles, Activity, ShieldAlert } from 'lucide-react';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      text: "Hello! I am your LungCare AI Health Assistant. How can I assist you with respiratory health questions or platform guidance today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { text: input, isUser: true, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    const prompt = `You are LungCare AI Assistant, an empathetic and knowledgeable healthcare AI specializing in lung health, pulmonology, asthma, COPD, pneumonia, and chest radiograph education. Provide clear, accurate, and concise medical information. Always remind users that your guidance is educational and they should consult a licensed doctor for an official diagnosis. User question: ${currentInput}`;

    try {
      if (!apiKey) {
        throw new Error('Gemini API Key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
      }
      const result = await model.generateContent(prompt);
      const botResponse = result.response.text();
      setMessages((prev) => [
        ...prev,
        { text: botResponse, isUser: false, timestamp: new Date() },
      ]);
    } catch (err: any) {
      console.error('Chatbot Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          text: err.message?.includes('API Key')
            ? 'LungCare AI Assistant requires a configured Gemini API key in the environment to process medical queries.'
            : 'Sorry, I encountered an issue processing your query. Please try again shortly or consult a licensed physician.',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  return (
    <div className="fixed bottom-5 right-5 z-50 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2.5 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-blue-600 via-royal-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full shadow-glow-cyan border border-cyan-400/30 transition-all duration-300 group active:scale-95"
          aria-label="Open LungCare AI Assistant"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-200 group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-wide pr-1">Ask AI Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Modern Dark Navy Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-2.5rem)] sm:w-96 h-[520px] max-h-[85vh] glass-panel rounded-3xl shadow-2xl border border-cyan-500/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 bg-navy-950/95 backdrop-blur-2xl">
          {/* Header */}
          <div className="bg-navy-900 border-b border-cyan-500/20 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl p-0.5 shadow-glow-cyan flex-shrink-0">
                <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>LungCare AI Assistant</span>
                  <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-1 rounded border border-cyan-500/30">AI</span>
                </h3>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Online • Respiratory Guidance
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-850 rounded-xl transition"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Safety Notice Banner */}
          <div className="px-3 py-1.5 bg-cyan-950/60 border-b border-cyan-500/15 flex items-center space-x-2 text-[10px] text-cyan-300">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Informational decision support • Not emergency care</span>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-navy-950/60"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                    msg.isUser
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm shadow-glow-cyan'
                      : 'glass-panel text-slate-200 rounded-tl-sm border border-cyan-500/20 bg-navy-900/90'
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-cyan-300 text-xs p-3 glass-panel rounded-2xl w-fit border border-cyan-500/20">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-cyan-400 border-t-transparent" />
                <span>Formulating clinical response...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-navy-900 border-t border-cyan-500/20 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about lung health or symptoms..."
              className="flex-1 px-3.5 py-2.5 bg-navy-950/90 border border-cyan-500/25 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-500 hover:to-cyan-400 transition shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
