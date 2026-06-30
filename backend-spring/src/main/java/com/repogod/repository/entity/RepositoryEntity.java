package com.repogod.repository.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "repositories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "git_url", nullable = false)
    private String gitUrl;

    @Column(name = "default_branch")
    @Builder.Default
    private String defaultBranch = "main";

    @Column(name = "current_commit")
    private String currentCommit;

    @Builder.Default
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
