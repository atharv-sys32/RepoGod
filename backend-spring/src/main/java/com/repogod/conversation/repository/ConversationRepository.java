package com.repogod.conversation.repository;

import com.repogod.conversation.entity.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {

    List<ConversationEntity> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
