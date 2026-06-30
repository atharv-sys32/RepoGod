package com.repogod.persistence.repository;

import com.repogod.persistence.entity.ArtifactEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ArtifactRepository extends JpaRepository<ArtifactEntity, UUID> {

    List<ArtifactEntity> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    List<ArtifactEntity> findByPlannerRunIdOrderByCreatedAtDesc(UUID plannerRunId);
}
