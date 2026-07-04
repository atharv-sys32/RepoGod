package com.repogod.repository.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "repository_files")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    private String language;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "line_count")
    private Integer lineCount;

    private String checksum;
}
