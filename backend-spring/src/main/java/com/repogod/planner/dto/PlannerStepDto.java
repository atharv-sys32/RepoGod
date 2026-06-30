package com.repogod.planner.dto;

import java.util.UUID;

public class PlannerStepDto {

    private UUID id;
    private UUID plannerRunId;
    private String toolName;
    private String status;
    private Integer latencyMs;
    private String inputSummary;
    private String outputSummary;

    public PlannerStepDto() {
    }

    public PlannerStepDto(UUID id, UUID plannerRunId, String toolName, String status,
                          Integer latencyMs, String inputSummary, String outputSummary) {
        this.id = id;
        this.plannerRunId = plannerRunId;
        this.toolName = toolName;
        this.status = status;
        this.latencyMs = latencyMs;
        this.inputSummary = inputSummary;
        this.outputSummary = outputSummary;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getPlannerRunId() { return plannerRunId; }
    public void setPlannerRunId(UUID plannerRunId) { this.plannerRunId = plannerRunId; }

    public String getToolName() { return toolName; }
    public void setToolName(String toolName) { this.toolName = toolName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Integer latencyMs) { this.latencyMs = latencyMs; }

    public String getInputSummary() { return inputSummary; }
    public void setInputSummary(String inputSummary) { this.inputSummary = inputSummary; }

    public String getOutputSummary() { return outputSummary; }
    public void setOutputSummary(String outputSummary) { this.outputSummary = outputSummary; }
}
