import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Terminal,
  Search,
  FileText,
  Code2,
  GitBranch,
  Zap,
} from 'lucide-react';
import type { PlannerStepData } from '@/services/chat.service';
import { formatDuration } from '@/utils/format';
import { cn } from '@/utils/cn';

interface PlannerStepProps {
  step: PlannerStepData;
  isFirst?: boolean;
  isLast?: boolean;
}

const toolIcons: Record<string, React.ReactNode> = {
  search: <Search size={13} />,
  read_file: <FileText size={13} />,
  code_analysis: <Code2 size={13} />,
  git_log: <GitBranch size={13} />,
  run_command: <Terminal size={13} />,
  generate: <Zap size={13} />,
};

const statusConfig = {
  pending: {
    icon: <Clock size={13} />,
    class: 'text-gray-500',
    bg: 'bg-gray-800 border-gray-700',
    label: 'Pending',
  },
  running: {
    icon: <Loader2 size={13} className="animate-spin" />,
    class: 'text-indigo-400',
    bg: 'bg-indigo-900/40 border-indigo-700',
    label: 'Running',
  },
  complete: {
    icon: <CheckCircle2 size={13} />,
    class: 'text-emerald-400',
    bg: 'bg-emerald-900/30 border-emerald-800',
    label: 'Done',
  },
  error: {
    icon: <XCircle size={13} />,
    class: 'text-red-400',
    bg: 'bg-red-900/30 border-red-800',
    label: 'Error',
  },
};

export function PlannerStep({ step, isFirst = false, isLast = false }: PlannerStepProps) {
  const config = statusConfig[step.status];
  const toolIcon = toolIcons[step.toolName] ?? <Terminal size={13} />;

  return (
    <div className="flex gap-3 animate-fade-in">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center border shrink-0',
            config.bg,
            config.class,
          )}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 mt-1',
              step.status === 'complete' ? 'bg-emerald-800' : 'bg-gray-800',
            )}
            style={{ minHeight: 12 }}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn('pb-3 min-w-0 flex-1', isLast && 'pb-0')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-gray-500 shrink-0">{toolIcon}</span>
            <span className="text-xs font-medium text-gray-300 truncate">
              {step.toolName.replace(/_/g, ' ')}
            </span>
          </div>
          {step.durationMs != null && (
            <span className="text-xs text-gray-600 shrink-0">
              {formatDuration(step.durationMs)}
            </span>
          )}
        </div>

        {step.output && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {step.output}
          </p>
        )}

        {step.status === 'error' && step.output && (
          <p className="text-xs text-red-400 mt-1 line-clamp-2">{step.output}</p>
        )}
      </div>
    </div>
  );
}
