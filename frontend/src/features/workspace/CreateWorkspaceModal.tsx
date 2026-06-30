import React, { useState } from 'react';
import { FolderGit2, Link as LinkIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, repoUrl?: string) => Promise<void>;
  isLoading?: boolean;
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}: CreateWorkspaceModalProps) {
  const [title, setTitle] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Workspace title is required.');
      return;
    }
    setError(null);
    try {
      await onCreate(title.trim(), repoUrl.trim() || undefined);
      setTitle('');
      setRepoUrl('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create workspace.';
      setError(msg);
    }
  };

  const handleClose = () => {
    setTitle('');
    setRepoUrl('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Workspace"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit as React.MouseEventHandler}
            isLoading={isLoading}
          >
            Create Workspace
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Workspace Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Auth Service Review"
          leftIcon={<FolderGit2 size={15} />}
          required
          autoFocus
        />

        <Input
          label="Repository URL (optional)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          leftIcon={<LinkIcon size={15} />}
          hint="Paste a Git URL to import and index the repository."
        />

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
