package com.repogod.persistence.controller;

import com.repogod.common.dto.ApiResponse;
import com.repogod.common.exception.ResourceNotFoundException;
import com.repogod.persistence.dto.ArtifactDto;
import com.repogod.persistence.entity.ArtifactEntity;
import com.repogod.persistence.repository.ArtifactRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/artifacts")
public class ArtifactController {

    private final ArtifactRepository artifactRepository;

    public ArtifactController(ArtifactRepository artifactRepository) {
        this.artifactRepository = artifactRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtifactDto>> getById(@PathVariable UUID id) {
        ArtifactEntity entity = artifactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Artifact", id));
        return ResponseEntity.ok(ApiResponse.ok(toDto(entity)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ArtifactDto>>> listByConversation(
            @RequestParam(required = false) UUID conversationId,
            @RequestParam(required = false) UUID plannerRunId) {
        List<ArtifactDto> results;
        if (conversationId != null) {
            results = artifactRepository.findByConversationIdOrderByCreatedAtDesc(conversationId)
                    .stream().map(this::toDto).collect(Collectors.toList());
        } else if (plannerRunId != null) {
            results = artifactRepository.findByPlannerRunIdOrderByCreatedAtDesc(plannerRunId)
                    .stream().map(this::toDto).collect(Collectors.toList());
        } else {
            results = artifactRepository.findAll()
                    .stream().map(this::toDto).collect(Collectors.toList());
        }
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    private ArtifactDto toDto(ArtifactEntity entity) {
        return new ArtifactDto(
                entity.getId(),
                entity.getConversationId(),
                entity.getPlannerRunId(),
                entity.getArtifactType(),
                entity.getTitle(),
                entity.getContent(),
                entity.getCreatedAt()
        );
    }
}
