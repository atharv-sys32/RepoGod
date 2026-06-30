package com.repogod.workspace.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class CreateWorkspaceRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private UUID repositoryId;

    public CreateWorkspaceRequest() {
    }

    public CreateWorkspaceRequest(String title, UUID repositoryId) {
        this.title = title;
        this.repositoryId = repositoryId;
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
}
