package com.repogod.planner.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "planner_runs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannerRunEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "user_prompt", nullable = false, columnDefinition = "text")
    private String userPrompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "execution_plan", columnDefinition = "jsonb")
    private String executionPlan;

    @Builder.Default
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "started_at", updatable = false)
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;
}
