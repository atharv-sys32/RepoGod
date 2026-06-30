package com.repogod.planner.repository;

import com.repogod.planner.entity.PlannerRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlannerRunRepository extends JpaRepository<PlannerRunEntity, UUID> {

    List<PlannerRunEntity> findByConversationIdOrderByStartedAtDesc(UUID conversationId);
}
