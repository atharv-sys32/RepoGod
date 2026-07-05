import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/useWorkspaces';
import { useChatStream } from '@/hooks/useChatStream';
import { RepositoryTree } from '@/features/repository/RepositoryTree';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { PlannerTimeline } from '@/features/planner/PlannerTimeline';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import { PanelLeftOpen, PanelRightOpen, GitBranch, ArrowLeft, MessageSquare, Plus, Trash2 } from 'lucide-react';
import conversationService from '@/services/conversation.service';
import repositoryService from '@/services/repository.service';
import workspaceService from '@/services/workspace.service';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const conversationId = searchParams.get('conversation') ?? undefined;
  const from = searchParams.get('from') ?? undefined;

  const queryClient = useQueryClient();
  const { data: workspace, isLoading } = useWorkspace(id ?? '');
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; messageCount: number }>>([]);
  const [showAttachRepo, setShowAttachRepo] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [attaching, setAttaching] = useState(false);

  const [showRepoPanel, setShowRepoPanel] = useState(true);
  const [showPlannerPanel, setShowPlannerPanel] = useState(true);
  const [showConvPanel, setShowConvPanel] = useState(false);
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
    switchConversation,
  } = useChatStream({
    workspaceId: id ?? '',
    repositoryId: workspace?.repositoryId,
    conversationId,
    onConversationCreated,
  });

  // Load conversation list
  useEffect(() => {
    if (id) {
      conversationService.getConversations(id).then((convs) => {
        setConversations(convs.map((c) => ({ id: c.id, title: c.title ?? 'Untitled', messageCount: c.messageCount })));
      }).catch(() => {});
    }
  }, [id, messages.length]);

  const handleSelectConversation = (convId: string) => {
    setSearchParams({ conversation: convId, ...(from ? { from } : {}) });
    setShowConvPanel(false);
    setShowNewChat(false);
  };

  const [showNewChat, setShowNewChat] = useState(false);

  const handleNewConversation = () => {
    setSearchParams({});
    setShowNewChat(true);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await conversationService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (conversationId === convId) setSearchParams({});
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleAttachRepo = async () => {
    if (!repoUrl.trim() || !id || !workspace) return;
    setAttaching(true);
    try {
      const repo = await repositoryService.importRepository(repoUrl.trim());
      await workspaceService.updateWorkspace(id, { repositoryId: repo.id });
      await queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      setShowAttachRepo(false);
      setRepoUrl('');
    } catch (err) {
      console.error('Failed to attach repo:', err);
    } finally {
      setAttaching(false);
    }
  };

  // When a new conversation is created via sendMessage, clear the "new chat" mode
  const handleSend = (prompt: string) => {
    setShowNewChat(false);
    sendMessage(prompt);
  };

  const handleBack = () => {
    if (conversationId) {
      // In a conversation → go back to conversation list
      // Preserve all params (repoUrl, status, from) but remove conversation
      const params: Record<string, string> = {};
      for (const [key, value] of searchParams.entries()) {
        if (key !== 'conversation') params[key] = value;
      }
      setSearchParams(params);
    } else if (showNewChat) {
      // In new chat → go back to conversation list
      setShowNewChat(false);
    } else if (from) {
      // In conversation list with referrer → go back to repo list
      // repoUrl might be in from value or at top level
      let repoUrl = searchParams.get('repoUrl');
      let status = searchParams.get('status');
      if (!repoUrl || !status) {
        // Try parsing inside from value
        try {
          const url = new URL(from, window.location.origin);
          repoUrl = repoUrl || url.searchParams.get('repoUrl');
          status = status || url.searchParams.get('status');
        } catch {}
      }
      if (repoUrl && status) {
        navigate(`/dashboard?repoUrl=${encodeURIComponent(repoUrl)}&status=${status}`);
      } else {
        navigate('/dashboard');
      }
    } else {
      // No referrer → go to dashboard
      navigate('/dashboard');
    }
  };

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

      {/* Conversation Sidebar — only when in a conversation */}
      {conversationId && showConvPanel && (
        <div className="w-56 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden bg-gray-900/50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400">Conversations</span>
            <div className="flex items-center gap-2">
              <button onClick={handleNewConversation} className="text-xs text-indigo-400 hover:text-indigo-300">+ New</button>
              <button onClick={() => setShowConvPanel(false)} className="text-gray-600 hover:text-gray-400 text-xs">Close</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-600 p-3">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors group',
                    conv.id === conversationId ? 'bg-indigo-900/30 text-indigo-300' : 'text-gray-400',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare size={12} className="shrink-0" />
                    <span className="truncate flex-1">{conv.title}</span>
                    <span
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 z-10 relative"
                      title="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </span>
                  </div>
                  {conv.messageCount > 0 && (
                    <span className="text-xs text-gray-600 ml-6">{conv.messageCount} messages</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Center Panel — Chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-950">
          <button onClick={handleBack} className="text-gray-500 hover:text-gray-300 transition-colors" title="Go back">
            <ArrowLeft size={16} />
          </button>
          {!showRepoPanel && (
            <button onClick={() => setShowRepoPanel(true)} title="Show file tree" className="text-gray-500 hover:text-gray-300 transition-colors">
              <PanelLeftOpen size={16} />
            </button>
          )}
          {(conversationId || showNewChat) && (
            <button onClick={() => setShowConvPanel(v => !v)} className="text-gray-500 hover:text-gray-300 transition-colors" title="Conversations">
              <MessageSquare size={16} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-gray-200 truncate">
              {workspace.title}
            </h1>
          </div>
          {conversationId && (
            <button
              onClick={(e) => handleDeleteConversation(conversationId, e)}
              className="text-gray-600 hover:text-red-400 transition-colors"
              title="Delete this conversation"
            >
              <Trash2 size={15} />
            </button>
          )}
          {!workspace.repositoryId && !showAttachRepo && (
            <button
              onClick={() => setShowAttachRepo(true)}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
              title="Attach a repository"
            >
              <Plus size={12} /> Attach Repo
            </button>
          )}
          {!showPlannerPanel && (
            <button onClick={() => setShowPlannerPanel(true)} title="Show planner" className="text-gray-500 hover:text-gray-300 transition-colors">
              <PanelRightOpen size={16} />
            </button>
          )}
        </div>

        {showAttachRepo && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/50">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-600"
            />
            <button
              onClick={handleAttachRepo}
              disabled={attaching || !repoUrl.trim()}
              className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
            >
              {attaching ? 'Importing...' : 'Attach'}
            </button>
            <button
              onClick={() => { setShowAttachRepo(false); setRepoUrl(''); }}
              className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}

        {!conversationId && !isStreaming && !showNewChat ? (
          /* No conversation selected — show conversation list */
          <div className="flex-1 overflow-auto p-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-200">Conversations</h2>
              <button
                onClick={handleNewConversation}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                + New
              </button>
            </div>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                <MessageSquare size={28} className="text-indigo-400" />
                <h3 className="text-base font-semibold text-gray-200">Start a conversation</h3>
                <p className="text-sm text-gray-500 max-w-xs">Click "New" above or type a message to start.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div key={conv.id} className="relative group">
                  <button
                    onClick={() => handleSelectConversation(conv.id)}
                    className="w-full text-left rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-indigo-600/50 transition-colors pr-10"
                  >
                    <p className="text-sm font-medium text-gray-200">{conv.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{conv.messageCount} messages</p>
                  </button>
                  <span
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            onSend={handleSend}
            onCancel={cancelStream}
          />
        )}
      </div>

      {/* Right Panel — Planner Timeline */}
      {showPlannerPanel && (
        <div className={cn('w-72 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden')}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400">AI Planner</span>
            <button onClick={() => setShowPlannerPanel(false)} title="Hide planner" className="text-gray-600 hover:text-gray-400 transition-colors p-0.5">
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
