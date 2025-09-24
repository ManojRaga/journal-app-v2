import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { chatApi } from '../lib/api';
import { ChatBubble } from '../components/ChatBubble';
import { motion, AnimatePresence } from 'framer-motion';

export function Chat() {
  const { chatMessages, addChatMessage, isChatLoading, setIsChatLoading } = useAppStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isChatLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      content: message.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    addChatMessage(userMessage);
    setMessage('');
    setIsChatLoading(true);

    try {
      const response = await chatApi.sendMessage(userMessage.content);

      const aiMessage = {
        id: `ai-${Date.now()}`,
        content: response.answer,
        isUser: false,
        timestamp: new Date().toISOString(),
        sources: response.sources?.map((source) => {
          if (typeof source === 'string') {
            return source;
          }
          if (source.content) {
            return source.content;
          }
          const parts = [source.title, source.mood, source.tags]
            .filter(Boolean)
            .map((value) => String(value));
          return parts.join(' • ');
        }) || [],
      };

      addChatMessage(aiMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(errorMessage);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What patterns do you notice in my recent entries?",
    "How has my mood been lately?",
    "What topics do I write about most?",
    "Can you help me reflect on my goals?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
  };

  const emptyStateVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.08 + 0.2,
        duration: 0.5,
        ease: [0.21, 1, 0.21, 1],
      },
    }),
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-primary-50/20 to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-black" />
      <div className="absolute inset-0 opacity-40 dark:opacity-30">
        <div className="absolute -top-32 -left-24 w-64 h-64 bg-primary-200/60 dark:bg-primary-900/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 bg-amber-200/50 dark:bg-amber-500/20 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/60 dark:border-white/10 backdrop-blur-lg">
          <div className="flex items-center space-x-3">
            <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500/90 to-primary-700 shadow-lg shadow-primary-500/30 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                AI Reflection Companion
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Explore your entries and uncover gentle insights
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.21, 1, 0.21, 1] }}
                  className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 via-purple-500 to-amber-500 blur-2xl opacity-60" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-xl shadow-primary-500/20">
                    <Sparkles className="h-7 w-7 text-primary-600 dark:text-primary-300" />
                  </div>
                </motion.div>
                <motion.h3
                  variants={emptyStateVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  className="text-2xl font-medium text-gray-900 dark:text-white"
                >
                  Start a conversation
                </motion.h3>
                <motion.p
                  variants={emptyStateVariants}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  className="mt-3 text-base text-gray-500 dark:text-gray-400"
                >
                  I can help you surface patterns, reflect on emotions, and celebrate progress across your journal.
                </motion.p>

                <motion.div
                  variants={emptyStateVariants}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                  className="mt-8 space-y-2"
                >
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Try asking:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                    {suggestedQuestions.map((question, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-lg transition-all duration-300"
                      >
                        “{question}”
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: [0.21, 1, 0.21, 1] }}
                  >
                    <ChatBubble message={msg} />
                  </motion.div>
                ))}
                {isChatLoading && (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start space-x-3"
                  >
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                      <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg px-4 py-3 max-w-md">
                      <div className="flex space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/60 dark:border-white/10 px-8 py-6 backdrop-blur-lg">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end space-x-3">
              <motion.div layout className="flex-1">
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about patterns, moods, goals, or anything you’re curious about…"
                    className="w-full rounded-2xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 px-5 py-4 text-sm text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-400/70 resize-none"
                    rows={1}
                    style={{ minHeight: '56px', maxHeight: '140px' }}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-xs text-gray-400">
                    Shift + Enter for newline
                  </div>
                </div>
              </motion.div>
              <motion.button
                onClick={handleSendMessage}
                disabled={!message.trim() || isChatLoading}
                whileHover={{ scale: message.trim() && !isChatLoading ? 1.05 : 1 }}
                whileTap={{ scale: message.trim() && !isChatLoading ? 0.97 : 1 }}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/40 transition-all duration-300 disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}