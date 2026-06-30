package com.repogod.conversation.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ConversationDto {

    private UUID id;
    private UUID workspaceId;
    private String title;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public ConversationDto() {
    }

    public ConversationDto(UUID id, UUID workspaceId, String title,
                            OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(UUID workspaceId) { this.workspaceId = workspaceId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
