package com.repogod.repository.service;

import com.repogod.common.exception.ResourceNotFoundException;
import com.repogod.gateway.service.AiGatewayService;
import com.repogod.repository.dto.ImportRepositoryRequest;
import com.repogod.repository.dto.RepositoryDto;
import com.repogod.repository.entity.RepositoryEntity;
import com.repogod.repository.mapper.RepositoryMapper;
import com.repogod.repository.repository.RepositoryJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RepositoryService {

    private static final Logger log = LoggerFactory.getLogger(RepositoryService.class);

    private final RepositoryJpaRepository repositoryJpaRepository;
    private final AiGatewayService aiGatewayService;

    public RepositoryService(RepositoryJpaRepository repositoryJpaRepository,
                              AiGatewayService aiGatewayService) {
        this.repositoryJpaRepository = repositoryJpaRepository;
        this.aiGatewayService = aiGatewayService;
    }

    @Scheduled(fixedRate = 6 * 60 * 60 * 1000) // every 6 hours
    @Transactional
    public void cleanupOrphanedRepos() {
        try {
            int count = repositoryJpaRepository.deleteOrphans();
            if (count > 0) log.info("Cleaned up {} orphaned repository entries", count);
        } catch (Exception e) {
            log.warn("Orphan cleanup skipped: {}", e.getMessage());
        }
    }

    @Transactional
    public RepositoryDto importRepository(ImportRepositoryRequest request, UUID userId) {
        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName()
                : deriveNameFromUrl(request.getGitUrl());

        String defaultBranch = request.getDefaultBranch() != null && !request.getDefaultBranch().isBlank()
                ? request.getDefaultBranch()
                : "main";

        RepositoryEntity entity = RepositoryEntity.builder()
                .userId(userId)
                .name(name)
                .gitUrl(request.getGitUrl())
                .defaultBranch(defaultBranch)
                .status("PENDING")
                .build();

        RepositoryEntity saved = repositoryJpaRepository.save(entity);
        log.info("Imported repository {} for user {}", saved.getId(), userId);

        // Trigger async indexing
        aiGatewayService.triggerIndexing(saved.getId(), saved.getGitUrl())
                .subscribe(
                        result -> log.debug("Indexing triggered for {}: {}", saved.getId(), result),
                        error -> log.error("Failed to trigger indexing for {}: {}", saved.getId(), error.getMessage())
                );

        return RepositoryMapper.toDto(saved);
    }

    @Transactional
    public RepositoryDto triggerIndexing(UUID id, UUID userId) {
        RepositoryEntity entity = repositoryJpaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Repository", id);
        }
        entity.setStatus("INDEXING");
        repositoryJpaRepository.save(entity);

        aiGatewayService.triggerIndexing(entity.getId(), entity.getGitUrl())
                .subscribe(
                        result -> log.debug("Indexing triggered for {}: {}", id, result),
                        error -> log.error("Failed to trigger indexing for {}: {}", id, error.getMessage())
                );

        return RepositoryMapper.toDto(entity);
    }

    @Transactional(readOnly = true)
    public RepositoryDto findById(UUID id, UUID userId) {
        RepositoryEntity entity = repositoryJpaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Repository", id);
        }
        return RepositoryMapper.toDto(entity);
    }

    @Transactional(readOnly = true)
    public List<RepositoryDto> findByUserId(UUID userId) {
        return repositoryJpaRepository.findByUserId(userId).stream()
                .map(RepositoryMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public String getStatus(UUID id, UUID userId) {
        RepositoryEntity entity = repositoryJpaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Repository", id);
        }
        return entity.getStatus();
    }

    private String deriveNameFromUrl(String gitUrl) {
        if (gitUrl == null || gitUrl.isBlank()) return "unnamed";
        String[] parts = gitUrl.split("/");
        String last = parts[parts.length - 1];
        return last.endsWith(".git") ? last.substring(0, last.length() - 4) : last;
    }
}
