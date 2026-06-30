package com.repogod.workspace.mapper;

import com.repogod.workspace.dto.WorkspaceDto;
import com.repogod.workspace.entity.WorkspaceEntity;

public final class WorkspaceMapper {

    private WorkspaceMapper() {
    }

    public static WorkspaceDto toDto(WorkspaceEntity entity) {
        if (entity == null) return null;
        return new WorkspaceDto(
                entity.getId(),
                entity.getTitle(),
                entity.getRepositoryId(),
                entity.getIndexingStatus(),
                entity.getLastOpened(),
                entity.getCreatedAt()
        );
    }

    public static WorkspaceEntity toEntity(WorkspaceDto dto) {
        if (dto == null) return null;
        return WorkspaceEntity.builder()
                .id(dto.getId())
                .title(dto.getTitle())
                .repositoryId(dto.getRepositoryId())
                .indexingStatus(dto.getIndexingStatus())
                .lastOpened(dto.getLastOpened())
                .createdAt(dto.getCreatedAt())
                .build();
    }
}
