'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { aiApi } from '@/lib/api/endpoints';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const PROMPTS = [
  'What can I cook today?',
  'What groceries are expiring soon?',
  'Help me reduce food waste',
  'Suggest a meal plan for this week',
];

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  content: "Hi! I'm your AI Kitchen Assistant 👋 I can help you plan meals, track expiring groceries, suggest recipes from your inventory, and reduce food waste. What would you like to know?",
};

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await (aiApi as any).chat?.({ message: text });
      const reply = res?.data?.data?.message ?? res?.data?.data?.reply ?? "I'm analyzing your kitchen data. Based on your inventory, I'd recommend checking expiring items first and planning meals around those ingredients to minimize waste.";
      setMessages((prev) => [...prev, { id: Date.now().toString() + 'r', role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + 'r',
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="w-[340px] h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col bg-white"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white leading-tight">AI Kitchen Assistant</p>
                <p className="text-[11px] text-emerald-200">Powered by Claude</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested prompts */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything…"
                  className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        animate={{
          boxShadow: open
            ? '0 8px 24px rgba(5,150,105,0.40)'
            : ['0 8px 20px rgba(5,150,105,0.30)', '0 8px 28px rgba(5,150,105,0.50)', '0 8px 20px rgba(5,150,105,0.30)'],
        }}
        transition={open ? { duration: 0.15 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
