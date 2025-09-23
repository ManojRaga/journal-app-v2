import React from 'react';
import { format } from 'date-fns';
import { Bot, User, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../lib/store';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'flex items-start space-x-3',
        message.isUser ? 'flex-row-reverse space-x-reverse' : ''
      )}
    >
      {/* Avatar */}
      <div className={clsx(
        'p-2 rounded-full flex-shrink-0',
        message.isUser
          ? 'bg-gray-200 dark:bg-gray-600'
          : 'bg-primary-100 dark:bg-primary-900/30'
      )}>
        {message.isUser ? (
          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
        )}
      </div>

      {/* Message Content */}
      <div className={clsx(
        'max-w-md',
        message.isUser ? 'ml-auto' : 'mr-auto'
      )}>
        <div className={clsx(
          'rounded-lg px-4 py-3',
          message.isUser
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Sources */}
        {!message.isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Sources from your journal:
            </p>
            {message.sources.slice(0, 3).map((source, index) => (
              <div
                key={index}
                className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
              >
                <div className="flex items-start space-x-2">
                  <ExternalLink className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                    {source.length > 100 ? `${source.substring(0, 100)}...` : source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={clsx(
          'text-xs mt-1',
          message.isUser ? 'text-right text-gray-400' : 'text-gray-500 dark:text-gray-400'
        )}>
          {format(new Date(message.timestamp), 'h:mm a')}
        </p>
      </div>
    </motion.div>
  );
}