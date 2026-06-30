import React from 'react';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import repositoryService from '@/services/repository.service';

interface FileViewerProps {
  repositoryId: string;
  filePath: string;
}

export function FileViewer({ repositoryId, filePath }: FileViewerProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['file-content', repositoryId, filePath],
    queryFn: () => repositoryService.getFileContent(repositoryId, filePath),
    enabled: !!(repositoryId && filePath),
    staleTime: 120_000,
  });

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        Select a file to view its contents.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading file...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-red-400">
        <AlertCircle size={16} />
        <span className="text-sm">Failed to load file.</span>
      </div>
    );
  }

  const lines = data.content.split('\n');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* File header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-950 shrink-0">
        <FileText size={14} className="text-gray-500" />
        <span className="text-xs text-gray-400 truncate">{filePath}</span>
        {data.language && (
          <span className="ml-auto text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
            {data.language}
          </span>
        )}
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <pre className="text-xs text-gray-300 leading-6 m-0">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-800/40 transition-colors"
                >
                  <td className="select-none text-right text-gray-600 px-4 py-0 border-r border-gray-800 w-12 font-mono">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-0 font-mono whitespace-pre">
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </pre>
      </div>
    </div>
  );
}
