package com.repogod.persistence.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ArtifactDto {

    private UUID id;
    private UUID conversationId;
    private UUID plannerRunId;
    private String artifactType;
    private String title;
    private String content;
    private OffsetDateTime createdAt;

    public ArtifactDto() {
    }

    public ArtifactDto(UUID id, UUID conversationId, UUID plannerRunId, String artifactType,
                       String title, String content, OffsetDateTime createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.plannerRunId = plannerRunId;
        this.artifactType = artifactType;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }

    public UUID getPlannerRunId() { return plannerRunId; }
    public void setPlannerRunId(UUID plannerRunId) { this.plannerRunId = plannerRunId; }

    public String getArtifactType() { return artifactType; }
    public void setArtifactType(String artifactType) { this.artifactType = artifactType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
