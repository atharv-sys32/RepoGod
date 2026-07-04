package com.repogod.repository.repository;

import com.repogod.repository.entity.RepositoryFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RepositoryFileJpaRepository extends JpaRepository<RepositoryFileEntity, UUID> {

    List<RepositoryFileEntity> findByRepositoryIdOrderByFilePath(UUID repositoryId);
}
