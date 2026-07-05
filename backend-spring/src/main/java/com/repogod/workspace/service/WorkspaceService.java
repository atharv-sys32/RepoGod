package com.repogod.workspace.service;

import com.repogod.common.exception.ResourceNotFoundException;
import com.repogod.workspace.dto.CreateWorkspaceRequest;
import com.repogod.workspace.dto.WorkspaceDto;
import com.repogod.workspace.entity.WorkspaceEntity;
import com.repogod.workspace.mapper.WorkspaceMapper;
import com.repogod.workspace.repository.WorkspaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkspaceService {

    private static final Logger log = LoggerFactory.getLogger(WorkspaceService.class);

    private final WorkspaceRepository workspaceRepository;

    public WorkspaceService(WorkspaceRepository workspaceRepository) {
        this.workspaceRepository = workspaceRepository;
    }

    @Transactional
    public WorkspaceDto create(CreateWorkspaceRequest request, UUID userId) {
        WorkspaceEntity entity = WorkspaceEntity.builder()
                .userId(userId)
                .title(request.getTitle())
                .repositoryId(request.getRepositoryId())
                .lastOpened(OffsetDateTime.now())
                .indexingStatus("NOT_STARTED")
                .build();
        WorkspaceEntity saved = workspaceRepository.save(entity);
        log.info("Created workspace {} for user {}", saved.getId(), userId);
        return WorkspaceMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public WorkspaceDto findById(UUID id, UUID userId) {
        WorkspaceEntity entity = workspaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Workspace", id);
        }
        return WorkspaceMapper.toDto(entity);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceDto> findByUserId(UUID userId) {
        return workspaceRepository.findByUserIdOrderByLastOpenedDesc(userId).stream()
                .map(WorkspaceMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        WorkspaceEntity entity = workspaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Workspace", id);
        }
        workspaceRepository.delete(entity);
        log.info("Deleted workspace {} for user {}", id, userId);
    }

    @Transactional
    public WorkspaceDto updateLastOpened(UUID id, UUID userId) {
        WorkspaceEntity entity = workspaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Workspace", id);
        }
        entity.setLastOpened(OffsetDateTime.now());
        return WorkspaceMapper.toDto(workspaceRepository.save(entity));
    }

    @Transactional
    public WorkspaceDto update(UUID id, UUID userId, Map<String, Object> body) {
        WorkspaceEntity entity = workspaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", id));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Workspace", id);
        }
        if (body.containsKey("repositoryId")) {
            String repoIdStr = body.get("repositoryId").toString();
            entity.setRepositoryId(UUID.fromString(repoIdStr));
            entity.setIndexingStatus("NOT_STARTED");
        }
        return WorkspaceMapper.toDto(workspaceRepository.save(entity));
    }
}
