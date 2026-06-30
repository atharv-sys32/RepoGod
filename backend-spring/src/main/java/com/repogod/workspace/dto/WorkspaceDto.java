package com.repogod.workspace.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class WorkspaceDto {

    private UUID id;
    private String title;
    private UUID repositoryId;
    private String indexingStatus;
    private OffsetDateTime lastOpened;
    private OffsetDateTime createdAt;

    public WorkspaceDto() {
    }

    public WorkspaceDto(UUID id, String title, UUID repositoryId, String indexingStatus,
                        OffsetDateTime lastOpened, OffsetDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.repositoryId = repositoryId;
        this.indexingStatus = indexingStatus;
        this.lastOpened = lastOpened;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public UUID getRepositoryId() {
        return repositoryId;
    }

    public void setRepositoryId(UUID repositoryId) {
        this.repositoryId = repositoryId;
    }

    public String getIndexingStatus() {
        return indexingStatus;
    }

    public void setIndexingStatus(String indexingStatus) {
        this.indexingStatus = indexingStatus;
    }

    public OffsetDateTime getLastOpened() {
        return lastOpened;
    }

    public void setLastOpened(OffsetDateTime lastOpened) {
        this.lastOpened = lastOpened;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
