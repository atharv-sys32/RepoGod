import React from 'react';
import { Cpu } from 'lucide-react';
import type { PlannerStepData } from '@/services/chat.service';
import { PlannerStep } from './PlannerStep';
import { Spinner } from '@/components/ui/Spinner';

interface PlannerTimelineProps {
  events: PlannerStepData[];
  isStreaming: boolean;
}

export function PlannerTimeline({ events, isStreaming }: PlannerTimelineProps) {
  const isEmpty = events.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center">
        <div className="h-10 w-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Cpu size={18} className="text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">AI Planner</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Steps will appear here as the AI works.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Plan steps
        </p>
        {isStreaming && <Spinner size="xs" />}
      </div>

      <div className="space-y-0">
        {events.map((event, idx) => (
          <PlannerStep
            key={event.stepId}
            step={event}
            isFirst={idx === 0}
            isLast={idx === events.length - 1}
          />
        ))}
      </div>

      {/* Summary */}
      {!isStreaming && events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{events.length} steps</span>
            <span>
              {events.filter((e) => e.status === 'complete').length} completed
            </span>
            {events.filter((e) => e.status === 'error').length > 0 && (
              <span className="text-red-500">
                {events.filter((e) => e.status === 'error').length} error
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
