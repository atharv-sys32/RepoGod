package com.repogod.repository.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class RepositoryDto {

    private UUID id;
    private UUID userId;
    private String name;
    private String gitUrl;
    private String defaultBranch;
    private String currentCommit;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public RepositoryDto() {
    }

    public RepositoryDto(UUID id, UUID userId, String name, String gitUrl, String defaultBranch,
                         String currentCommit, String status, OffsetDateTime createdAt,
                         OffsetDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.gitUrl = gitUrl;
        this.defaultBranch = defaultBranch;
        this.currentCommit = currentCommit;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGitUrl() { return gitUrl; }
    public void setGitUrl(String gitUrl) { this.gitUrl = gitUrl; }

    public String getDefaultBranch() { return defaultBranch; }
    public void setDefaultBranch(String defaultBranch) { this.defaultBranch = defaultBranch; }

    public String getCurrentCommit() { return currentCommit; }
    public void setCurrentCommit(String currentCommit) { this.currentCommit = currentCommit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
