import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode2,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import repositoryService, { type FileNode } from '@/services/repository.service';
import { cn } from '@/utils/cn';

interface RepositoryTreeProps {
  repositoryId: string;
  onFileSelect?: (path: string) => void;
  selectedFile?: string | null;
}

interface TreeNodeProps {
  node: FileNode;
  depth?: number;
  onFileSelect?: (path: string) => void;
  selectedFile?: string | null;
}

const languageIcons: Record<string, React.ReactNode> = {
  ts: <FileCode2 size={13} className="text-blue-400" />,
  tsx: <FileCode2 size={13} className="text-blue-400" />,
  js: <FileCode2 size={13} className="text-yellow-400" />,
  jsx: <FileCode2 size={13} className="text-yellow-400" />,
  py: <FileCode2 size={13} className="text-emerald-400" />,
  java: <FileCode2 size={13} className="text-orange-400" />,
  go: <FileCode2 size={13} className="text-cyan-400" />,
  rs: <FileCode2 size={13} className="text-orange-300" />,
  md: <FileText size={13} className="text-gray-400" />,
  json: <FileText size={13} className="text-amber-400" />,
  yaml: <FileText size={13} className="text-purple-400" />,
  yml: <FileText size={13} className="text-purple-400" />,
};

function getFileIcon(name: string): React.ReactNode {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return languageIcons[ext] ?? <File size={13} className="text-gray-500" />;
}

function TreeNode({
  node,
  depth = 0,
  onFileSelect,
  selectedFile,
}: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isDir = node.type === 'directory';
  const isSelected = !isDir && selectedFile === node.path;

  const handleClick = () => {
    if (isDir) {
      setIsOpen((v) => !v);
    } else {
      onFileSelect?.(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer text-xs transition-colors select-none',
          isSelected
            ? 'bg-indigo-600/20 text-indigo-300'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {isDir ? (
          <>
            <span className="text-gray-500 shrink-0">
              {isOpen ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </span>
            <span className="shrink-0">
              {isOpen ? (
                <FolderOpen size={13} className="text-amber-400" />
              ) : (
                <Folder size={13} className="text-amber-400" />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <span className="shrink-0">{getFileIcon(node.name)}</span>
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RepositoryTree({
  repositoryId,
  onFileSelect,
  selectedFile,
}: RepositoryTreeProps) {
  const { data: tree, isLoading, error } = useQuery({
    queryKey: ['repo-tree', repositoryId],
    queryFn: () => repositoryService.getFileTree(repositoryId),
    enabled: !!repositoryId,
    staleTime: 60_000,
  });

  if (!repositoryId) {
    return (
      <div className="p-3 text-xs text-gray-600 text-center py-8">
        No repository linked.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-gray-500">
        <Loader2 size={12} className="animate-spin" />
        Loading files...
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="p-3 text-xs text-red-400 text-center py-8">
        Failed to load file tree.
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-3 text-xs text-gray-600 text-center py-8">
        No files found.
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
}
