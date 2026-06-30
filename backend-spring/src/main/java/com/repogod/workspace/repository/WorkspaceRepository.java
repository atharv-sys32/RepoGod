package com.repogod.workspace.repository;

import com.repogod.workspace.entity.WorkspaceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkspaceRepository extends JpaRepository<WorkspaceEntity, UUID> {

    List<WorkspaceEntity> findByUserIdOrderByLastOpenedDesc(UUID userId);
}
