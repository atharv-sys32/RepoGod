-- When a repo is deleted, delete all workspaces linked to it (and their conversations/messages)
ALTER TABLE workspaces
    DROP CONSTRAINT workspaces_repository_id_fkey,
    ADD CONSTRAINT workspaces_repository_id_fkey
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE;
