package com.repogod.planner.service;

import com.repogod.common.exception.ResourceNotFoundException;
import com.repogod.planner.dto.PlannerRunDto;
import com.repogod.planner.dto.PlannerStepDto;
import com.repogod.planner.entity.PlannerRunEntity;
import com.repogod.planner.entity.PlannerStepEntity;
import com.repogod.planner.repository.PlannerRunRepository;
import com.repogod.planner.repository.PlannerStepRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PlannerService {

    private static final Logger log = LoggerFactory.getLogger(PlannerService.class);

    private final PlannerRunRepository plannerRunRepository;
    private final PlannerStepRepository plannerStepRepository;

    public PlannerService(PlannerRunRepository plannerRunRepository,
                          PlannerStepRepository plannerStepRepository) {
        this.plannerRunRepository = plannerRunRepository;
        this.plannerStepRepository = plannerStepRepository;
    }

    @Transactional
    public PlannerRunDto createRun(UUID conversationId, String userPrompt) {
        PlannerRunEntity entity = PlannerRunEntity.builder()
                .conversationId(conversationId)
                .userPrompt(userPrompt)
                .status("RUNNING")
                .build();
        PlannerRunEntity saved = plannerRunRepository.save(entity);
        log.info("Created planner run {} for conversation {}", saved.getId(), conversationId);
        return toRunDto(saved, List.of());
    }

    @Transactional
    public PlannerStepDto addStep(UUID plannerRunId, String toolName, String inputSummary) {
        PlannerStepEntity step = PlannerStepEntity.builder()
                .plannerRunId(plannerRunId)
                .toolName(toolName)
                .inputSummary(inputSummary)
                .status("RUNNING")
                .build();
        PlannerStepEntity saved = plannerStepRepository.save(step);
        return toStepDto(saved);
    }

    @Transactional
    public PlannerStepDto updateStepStatus(UUID stepId, String status, String outputSummary, Integer latencyMs) {
        PlannerStepEntity step = plannerStepRepository.findById(stepId)
                .orElseThrow(() -> new ResourceNotFoundException("PlannerStep", stepId));
        step.setStatus(status);
        step.setOutputSummary(outputSummary);
        step.setLatencyMs(latencyMs);
        return toStepDto(plannerStepRepository.save(step));
    }

    @Transactional
    public PlannerRunDto updateRunStatus(UUID runId, String status) {
        PlannerRunEntity run = plannerRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PlannerRun", runId));
        run.setStatus(status);
        if ("COMPLETED".equals(status) || "FAILED".equals(status)) {
            run.setFinishedAt(OffsetDateTime.now());
        }
        plannerRunRepository.save(run);
        List<PlannerStepDto> steps = plannerStepRepository
                .findByPlannerRunIdOrderByIdAsc(runId).stream()
                .map(this::toStepDto)
                .collect(Collectors.toList());
        return toRunDto(run, steps);
    }

    @Transactional(readOnly = true)
    public PlannerRunDto getRunWithSteps(UUID runId) {
        PlannerRunEntity run = plannerRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PlannerRun", runId));
        List<PlannerStepDto> steps = plannerStepRepository
                .findByPlannerRunIdOrderByIdAsc(runId).stream()
                .map(this::toStepDto)
                .collect(Collectors.toList());
        return toRunDto(run, steps);
    }

    private PlannerRunDto toRunDto(PlannerRunEntity entity, List<PlannerStepDto> steps) {
        return new PlannerRunDto(
                entity.getId(),
                entity.getConversationId(),
                entity.getUserPrompt(),
                entity.getExecutionPlan(),
                entity.getStatus(),
                entity.getStartedAt(),
                entity.getFinishedAt(),
                steps
        );
    }

    private PlannerStepDto toStepDto(PlannerStepEntity entity) {
        return new PlannerStepDto(
                entity.getId(),
                entity.getPlannerRunId(),
                entity.getToolName(),
                entity.getStatus(),
                entity.getLatencyMs(),
                entity.getInputSummary(),
                entity.getOutputSummary()
        );
    }
}
