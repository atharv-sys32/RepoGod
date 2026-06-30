import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#f9fafb',
    primaryBorderColor: '#4f46e5',
    lineColor: '#6b7280',
    sectionBkgColor: '#1f2937',
    altSectionBkgColor: '#111827',
    gridColor: '#374151',
    fontSize: '14px',
  },
});

interface MermaidViewerProps {
  diagram: string;
  className?: string;
}

export function MermaidViewer({ diagram, className }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!containerRef.current || !diagram.trim()) return;

    setStatus('loading');
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    mermaid
      .render(id, diagram)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setStatus('success');
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to render diagram.';
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [diagram]);

  return (
    <div
      className={cn(
        'flex items-center justify-center p-4 bg-gray-900 rounded-xl border border-gray-800 min-h-[200px]',
        className,
      )}
    >
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Rendering diagram...
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 text-sm text-red-400">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Diagram render error</p>
            <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(
          'w-full flex justify-center',
          status !== 'success' && 'hidden',
        )}
      />
    </div>
  );
}
