package com.repogod.conversation.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class MessageDto {

    private UUID id;
    private UUID conversationId;
    private String role;
    private String content;
    private UUID plannerRunId;
    private OffsetDateTime createdAt;

    public MessageDto() {
    }

    public MessageDto(UUID id, UUID conversationId, String role, String content,
                      UUID plannerRunId, OffsetDateTime createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.role = role;
        this.content = content;
        this.plannerRunId = plannerRunId;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public UUID getPlannerRunId() { return plannerRunId; }
    public void setPlannerRunId(UUID plannerRunId) { this.plannerRunId = plannerRunId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
