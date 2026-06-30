package com.repogod.planner.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class PlannerRunDto {

    private UUID id;
    private UUID conversationId;
    private String userPrompt;
    private String executionPlan;
    private String status;
    private OffsetDateTime startedAt;
    private OffsetDateTime finishedAt;
    private List<PlannerStepDto> steps;

    public PlannerRunDto() {
    }

    public PlannerRunDto(UUID id, UUID conversationId, String userPrompt, String executionPlan,
                         String status, OffsetDateTime startedAt, OffsetDateTime finishedAt,
                         List<PlannerStepDto> steps) {
        this.id = id;
        this.conversationId = conversationId;
        this.userPrompt = userPrompt;
        this.executionPlan = executionPlan;
        this.status = status;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.steps = steps;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }

    public String getUserPrompt() { return userPrompt; }
    public void setUserPrompt(String userPrompt) { this.userPrompt = userPrompt; }

    public String getExecutionPlan() { return executionPlan; }
    public void setExecutionPlan(String executionPlan) { this.executionPlan = executionPlan; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }

    public OffsetDateTime getFinishedAt() { return finishedAt; }
    public void setFinishedAt(OffsetDateTime finishedAt) { this.finishedAt = finishedAt; }

    public List<PlannerStepDto> getSteps() { return steps; }
    public void setSteps(List<PlannerStepDto> steps) { this.steps = steps; }
}
