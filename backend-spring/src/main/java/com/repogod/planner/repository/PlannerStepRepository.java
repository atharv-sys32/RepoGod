package com.repogod.planner.repository;

import com.repogod.planner.entity.PlannerStepEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlannerStepRepository extends JpaRepository<PlannerStepEntity, UUID> {

    List<PlannerStepEntity> findByPlannerRunIdOrderByIdAsc(UUID plannerRunId);
}
