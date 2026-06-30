import React, { useRef, useState, useCallback } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onCancel,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask anything about the repository...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="border-t border-gray-800 bg-gray-950 px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 focus-within:border-indigo-600 transition-colors">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 shrink-0 mb-0.5"
          title="Attach file (coming soon)"
          disabled
        >
          <Paperclip size={16} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || isStreaming}
          className={cn(
            'flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none outline-none leading-6 min-h-[24px] max-h-[200px] overflow-y-auto',
            (disabled || isStreaming) && 'opacity-60 cursor-not-allowed',
          )}
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            title="Stop generation"
            className="shrink-0 h-8 w-8 rounded-lg bg-red-700 hover:bg-red-600 flex items-center justify-center transition-colors mb-0.5"
          >
            <Square size={14} className="text-white fill-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            title="Send message"
            className={cn(
              'shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors mb-0.5',
              canSend
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed',
            )}
          >
            <Send size={14} />
          </button>
        )}
      </div>
      <p className="text-xs text-gray-700 mt-1.5 text-center">
        Enter to send &middot; Shift+Enter for newline
      </p>
    </div>
  );
}
