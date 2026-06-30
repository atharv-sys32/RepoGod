package com.repogod.workspace.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "workspaces")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "repository_id")
    private UUID repositoryId;

    @Column(nullable = false)
    private String title;

    @Column(name = "last_opened")
    private OffsetDateTime lastOpened;

    @Column(name = "indexing_status")
    @Builder.Default
    private String indexingStatus = "NOT_STARTED";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
