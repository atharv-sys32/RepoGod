import React from 'react';
import { Bot, User } from 'lucide-react';
import { renderMarkdown } from '@/utils/markdown';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatStream';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant?: boolean;
}

export function ChatMessage({ message, isLastAssistant }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content.trim();

  return (
    <div
      className={cn(
        'flex gap-3 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-800 text-gray-400 border border-gray-700',
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700',
        )}
      >
        {isEmpty && isLastAssistant ? (
          /* Typing indicator */
          <div className="flex items-center gap-1 py-0.5">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        ) : isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div
            className="markdown-content text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}

        <p
          className={cn(
            'text-xs mt-1.5',
            isUser ? 'text-indigo-200/70 text-right' : 'text-gray-500',
          )}
        >
          {formatDate(message.timestamp, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
