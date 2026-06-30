import React, { useState } from 'react';
import { GitBranch, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import repositoryService from '@/services/repository.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface RepositoryImportFormProps {
  onImported?: (repositoryId: string) => void;
}

type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

export function RepositoryImportForm({ onImported }: RepositoryImportFormProps) {
  const [gitUrl, setGitUrl] = useState('');
  const [repoName, setRepoName] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl.trim()) return;

    setStatus('importing');
    setError(null);
    setStatusMessage('Cloning and indexing repository...');

    try {
      const repo = await repositoryService.importRepository(
        gitUrl.trim(),
        repoName.trim() || undefined,
      );
      setStatus('success');
      setStatusMessage(`Successfully imported "${repo.name}"`);
      onImported?.(repo.id);
    } catch (err: unknown) {
      setStatus('error');
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? 'Failed to import repository.';
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleImport} className="space-y-3">
      <Input
        label="Git Repository URL"
        value={gitUrl}
        onChange={(e) => setGitUrl(e.target.value)}
        placeholder="https://github.com/owner/repo.git"
        leftIcon={<GitBranch size={15} />}
        required
        disabled={status === 'importing'}
      />
      <Input
        label="Repository Name (optional)"
        value={repoName}
        onChange={(e) => setRepoName(e.target.value)}
        placeholder="my-repository"
        disabled={status === 'importing'}
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {status === 'success' && statusMessage && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
          <CheckCircle2 size={15} className="shrink-0" />
          {statusMessage}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isLoading={status === 'importing'}
        disabled={!gitUrl.trim() || status === 'importing'}
        leftIcon={status !== 'importing' ? <Download size={15} /> : undefined}
      >
        {status === 'importing' ? 'Importing...' : 'Import Repository'}
      </Button>
    </form>
  );
}
