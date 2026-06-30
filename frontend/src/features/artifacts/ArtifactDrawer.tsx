import React, { useState } from 'react';
import {
  X,
  Download,
  ChevronRight,
  FileText,
  GitBranch,
  TestTube2,
  BarChart2,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatRelativeTime, formatBytes } from '@/utils/format';
import { MermaidViewer } from './MermaidViewer';

export interface Artifact {
  id: string;
  name: string;
  type: 'review' | 'test' | 'diagram' | 'analysis' | 'other';
  content?: string;
  downloadUrl?: string;
  sizeBytes?: number;
  createdAt: string;
}

interface ArtifactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: Artifact[];
  isLoading?: boolean;
}

const typeIcons: Record<Artifact['type'], React.ReactNode> = {
  review: <FileText size={15} className="text-blue-400" />,
  test: <TestTube2 size={15} className="text-emerald-400" />,
  diagram: <BarChart2 size={15} className="text-purple-400" />,
  analysis: <GitBranch size={15} className="text-amber-400" />,
  other: <FileText size={15} className="text-gray-400" />,
};

const typeLabels: Record<Artifact['type'], string> = {
  review: 'Code Review',
  test: 'Tests',
  diagram: 'Diagram',
  analysis: 'Analysis',
  other: 'Artifact',
};

export function ArtifactDrawer({
  isOpen,
  onClose,
  artifacts,
  isLoading = false,
}: ArtifactDrawerProps) {
  const [selected, setSelected] = useState<Artifact | null>(null);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl transition-transform duration-250 ease-out',
          'w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-gray-300 p-0.5"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-200">
              {selected ? selected.name : 'Artifacts'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading artifacts...</span>
            </div>
          ) : selected ? (
            /* Detail view */
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                {typeIcons[selected.type]}
                <span className="text-xs text-gray-500">
                  {typeLabels[selected.type]}
                </span>
                <span className="text-xs text-gray-600 ml-auto">
                  {formatRelativeTime(selected.createdAt)}
                </span>
              </div>

              {selected.type === 'diagram' && selected.content ? (
                <MermaidViewer diagram={selected.content} />
              ) : (
                <pre className="text-xs text-gray-300 bg-gray-950 border border-gray-800 rounded-xl p-4 overflow-auto whitespace-pre-wrap leading-relaxed">
                  {selected.content ?? 'No content available.'}
                </pre>
              )}

              {selected.downloadUrl && (
                <a
                  href={selected.downloadUrl}
                  download={selected.name}
                  className="mt-4 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Download size={15} />
                  Download
                  {selected.sizeBytes && (
                    <span className="text-gray-600">
                      ({formatBytes(selected.sizeBytes)})
                    </span>
                  )}
                </a>
              )}
            </div>
          ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                <FileText size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">
                  No artifacts yet
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  AI-generated reviews, tests, and diagrams will appear here.
                </p>
              </div>
            </div>
          ) : (
            /* List view */
            <div className="divide-y divide-gray-800">
              {artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => setSelected(artifact)}
                  className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-gray-800/50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {typeIcons[artifact.type]}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-300 truncate group-hover:text-gray-100">
                        {artifact.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {typeLabels[artifact.type]} &middot;{' '}
                        {formatRelativeTime(artifact.createdAt)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
