import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { chatApi } from '../lib/api';
import { ChatBubble } from '../components/ChatBubble';
import { motion } from 'framer-motion';

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
      const response = await chatApi.sendMessage({
        message: userMessage.content,
        userId: 'default',
      });

      const aiMessage = {
        id: `ai-${Date.now()}`,
        content: response.answer,
        isUser: false,
        timestamp: new Date().toISOString(),
        sources: response.sources?.map(source => source.content) || [],
      };

      addChatMessage(aiMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an error. Please try again.',
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
            <Bot className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask me anything about your journal entries
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {chatMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                I can help you reflect on your journal entries and discover insights about your thoughts and patterns.
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Try asking:
                </p>
                {suggestedQuestions.map((question, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="block w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200"
                  >
                    "{question}"
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {chatMessages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isChatLoading && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                    <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 max-w-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your journal entries..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 resize-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isChatLoading}
              className="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}