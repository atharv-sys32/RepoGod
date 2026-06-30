import React, { useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspaces';
import { useChatStream } from '@/hooks/useChatStream';
import { RepositoryTree } from '@/features/repository/RepositoryTree';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { PlannerTimeline } from '@/features/planner/PlannerTimeline';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import { PanelLeftOpen, PanelRightOpen, GitBranch } from 'lucide-react';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation') ?? undefined;

  const { data: workspace, isLoading } = useWorkspace(id ?? '');

  const [showRepoPanel, setShowRepoPanel] = useState(true);
  const [showPlannerPanel, setShowPlannerPanel] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const onConversationCreated = useCallback(
    (newId: string) => {
      setSearchParams({ conversation: newId });
    },
    [setSearchParams],
  );

  const {
    messages,
    plannerEvents,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
  } = useChatStream({
    workspaceId: id ?? '',
    repositoryId: workspace?.repositoryId,
    conversationId,
    onConversationCreated,
  });

  if (isLoading) {
    return <FullPageSpinner label="Loading workspace..." />;
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-950">
      {/* Left Panel — Repository Tree */}
      {showRepoPanel && (
        <div className="w-60 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch size={14} className="text-gray-500 shrink-0" />
              <span className="text-xs font-medium text-gray-400 truncate">
                {workspace.repositoryName ?? 'No repository'}
              </span>
            </div>
            <button
              onClick={() => setShowRepoPanel(false)}
              title="Hide file tree"
              className="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
            >
              <PanelLeftOpen size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <RepositoryTree
              repositoryId={workspace.repositoryId ?? ''}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          </div>
        </div>
      )}

      {/* Center Panel — Chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-950">
          {!showRepoPanel && (
            <button
              onClick={() => setShowRepoPanel(true)}
              title="Show file tree"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-gray-200 truncate">
              {workspace.title}
            </h1>
          </div>
          {!showPlannerPanel && (
            <button
              onClick={() => setShowPlannerPanel(true)}
              title="Show planner"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <PanelRightOpen size={16} />
            </button>
          )}
        </div>

        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          onSend={sendMessage}
          onCancel={cancelStream}
        />
      </div>

      {/* Right Panel — Planner Timeline */}
      {showPlannerPanel && (
        <div
          className={cn(
            'w-72 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden',
          )}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400">
              AI Planner
            </span>
            <button
              onClick={() => setShowPlannerPanel(false)}
              title="Hide planner"
              className="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
            >
              <PanelRightOpen size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <PlannerTimeline events={plannerEvents} isStreaming={isStreaming} />
          </div>
        </div>
      )}
    </div>
  );
}
