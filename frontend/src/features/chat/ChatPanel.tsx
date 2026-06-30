import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatStream';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onCancel: () => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  error,
  onSend,
  onCancel,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-indigo-900/40 border border-indigo-800/50 flex items-center justify-center">
              <MessageSquare size={28} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">
                Start a conversation
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                Ask questions about the codebase, request code reviews, or
                generate tests.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Explain the authentication flow',
                'Find potential security issues',
                'Generate unit tests for the API',
                'Summarize recent changes',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSend(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-indigo-300 hover:bg-indigo-900/20 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isLastAssistant =
              msg.role === 'assistant' && idx === messages.length - 1;
            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLastAssistant={isLastAssistant && isStreaming}
              />
            );
          })
        )}

        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">
            Error: {error}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onCancel={onCancel}
        isStreaming={isStreaming}
      />
    </div>
  );
}
