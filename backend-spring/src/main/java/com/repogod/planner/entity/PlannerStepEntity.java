package com.repogod.planner.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "planner_steps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannerStepEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "planner_run_id", nullable = false)
    private UUID plannerRunId;

    @Column(name = "tool_name", nullable = false)
    private String toolName;

    @Builder.Default
    private String status = "PENDING";

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(name = "input_summary", columnDefinition = "text")
    private String inputSummary;

    @Column(name = "output_summary", columnDefinition = "text")
    private String outputSummary;
}
