package com.repogod.repository.dto;

import jakarta.validation.constraints.NotBlank;

public class ImportRepositoryRequest {

    @NotBlank(message = "Git URL is required")
    private String gitUrl;

    private String name;

    private String defaultBranch;

    public ImportRepositoryRequest() {
    }

    public ImportRepositoryRequest(String gitUrl, String name, String defaultBranch) {
        this.gitUrl = gitUrl;
        this.name = name;
        this.defaultBranch = defaultBranch;
    }

    public String getGitUrl() {
        return gitUrl;
    }

    public void setGitUrl(String gitUrl) {
        this.gitUrl = gitUrl;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDefaultBranch() {
        return defaultBranch;
    }

    public void setDefaultBranch(String defaultBranch) {
        this.defaultBranch = defaultBranch;
    }
}
