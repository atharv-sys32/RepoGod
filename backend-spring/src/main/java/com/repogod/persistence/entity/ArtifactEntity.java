package com.repogod.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "artifacts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtifactEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "conversation_id")
    private UUID conversationId;

    @Column(name = "planner_run_id")
    private UUID plannerRunId;

    @Column(name = "artifact_type", nullable = false)
    private String artifactType;

    private String title;

    @Column(columnDefinition = "text")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
