package com.repogod.repository.repository;

import com.repogod.repository.entity.RepositoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RepositoryJpaRepository extends JpaRepository<RepositoryEntity, UUID> {

    List<RepositoryEntity> findByUserId(UUID userId);
}
