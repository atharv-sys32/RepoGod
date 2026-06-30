package com.repogod.conversation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class SendMessageRequest {

    @NotNull(message = "Workspace ID is required")
    private UUID workspaceId;

    private UUID conversationId;

    @NotBlank(message = "Content is required")
    private String content;

    public SendMessageRequest() {
    }

    public SendMessageRequest(UUID workspaceId, UUID conversationId, String content) {
        this.workspaceId = workspaceId;
        this.conversationId = conversationId;
        this.content = content;
    }

    public UUID getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(UUID workspaceId) { this.workspaceId = workspaceId; }

    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
