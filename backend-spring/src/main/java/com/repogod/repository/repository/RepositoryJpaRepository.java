package com.repogod.repository.repository;

import com.repogod.repository.entity.RepositoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RepositoryJpaRepository extends JpaRepository<RepositoryEntity, UUID> {

    List<RepositoryEntity> findByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM RepositoryEntity r WHERE NOT EXISTS " +
           "(SELECT 1 FROM com.repogod.workspace.entity.WorkspaceEntity w WHERE w.repositoryId = r.id)")
    int deleteOrphans();
}
