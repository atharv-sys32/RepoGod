package com.repogod.repository.mapper;

import com.repogod.repository.dto.RepositoryDto;
import com.repogod.repository.entity.RepositoryEntity;

public final class RepositoryMapper {

    private RepositoryMapper() {
    }

    public static RepositoryDto toDto(RepositoryEntity entity) {
        if (entity == null) return null;
        return new RepositoryDto(
                entity.getId(),
                entity.getUserId(),
                entity.getName(),
                entity.getGitUrl(),
                entity.getDefaultBranch(),
                entity.getCurrentCommit(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static RepositoryEntity toEntity(RepositoryDto dto) {
        if (dto == null) return null;
        return RepositoryEntity.builder()
                .id(dto.getId())
                .userId(dto.getUserId())
                .name(dto.getName())
                .gitUrl(dto.getGitUrl())
                .defaultBranch(dto.getDefaultBranch())
                .currentCommit(dto.getCurrentCommit())
                .status(dto.getStatus())
                .build();
    }
}
