package com.repogod.conversation.service;

import com.repogod.common.exception.ResourceNotFoundException;
import com.repogod.conversation.dto.ConversationDto;
import com.repogod.conversation.dto.MessageDto;
import com.repogod.conversation.entity.ConversationEntity;
import com.repogod.conversation.entity.MessageEntity;
import com.repogod.conversation.repository.ConversationRepository;
import com.repogod.conversation.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private static final Logger log = LoggerFactory.getLogger(ConversationService.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public ConversationService(ConversationRepository conversationRepository,
                                MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional
    public ConversationDto create(UUID workspaceId, String title) {
        ConversationEntity entity = ConversationEntity.builder()
                .workspaceId(workspaceId)
                .title(title)
                .build();
        ConversationEntity saved = conversationRepository.save(entity);
        log.info("Created conversation {} in workspace {}", saved.getId(), workspaceId);
        return toDto(saved);
    }

    @Transactional
    public MessageDto addMessage(UUID conversationId, String role, String content, UUID plannerRunId) {
        if (!conversationRepository.existsById(conversationId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }
        MessageEntity message = MessageEntity.builder()
                .conversationId(conversationId)
                .role(role)
                .content(content)
                .plannerRunId(plannerRunId)
                .build();
        MessageEntity saved = messageRepository.save(message);
        return toMessageDto(saved);
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getHistory(UUID conversationId) {
        if (!conversationRepository.existsById(conversationId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(UUID workspaceId) {
        return conversationRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConversationDto findById(UUID id) {
        return conversationRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", id));
    }

    private ConversationDto toDto(ConversationEntity entity) {
        return new ConversationDto(
                entity.getId(),
                entity.getWorkspaceId(),
                entity.getTitle(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private MessageDto toMessageDto(MessageEntity entity) {
        return new MessageDto(
                entity.getId(),
                entity.getConversationId(),
                entity.getRole(),
                entity.getContent(),
                entity.getPlannerRunId(),
                entity.getCreatedAt()
        );
    }
}
