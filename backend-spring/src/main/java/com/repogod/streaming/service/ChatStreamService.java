package com.repogod.streaming.service;

import com.repogod.conversation.entity.ConversationEntity;
import com.repogod.conversation.repository.ConversationRepository;
import com.repogod.conversation.service.ConversationService;
import com.repogod.gateway.service.AiGatewayService;
import com.repogod.planner.service.PlannerService;
import com.repogod.workspace.entity.WorkspaceEntity;
import com.repogod.workspace.repository.WorkspaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class ChatStreamService {

    private static final Logger log = LoggerFactory.getLogger(ChatStreamService.class);

    private final ConversationService conversationService;
    private final ConversationRepository conversationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final AiGatewayService aiGatewayService;
    private final PlannerService plannerService;

    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public ChatStreamService(ConversationService conversationService,
                             ConversationRepository conversationRepository,
                             WorkspaceRepository workspaceRepository,
                             AiGatewayService aiGatewayService,
                             PlannerService plannerService) {
        this.conversationService = conversationService;
        this.conversationRepository = conversationRepository;
        this.workspaceRepository = workspaceRepository;
        this.aiGatewayService = aiGatewayService;
        this.plannerService = plannerService;
    }

    /**
     * Orchestrates the full streaming chat flow:
     * 1. Resolve or create conversation
     * 2. Save user message
     * 3. Create planner run
     * 4. Stream AI response chunks via SSE
     * 5. On completion, save the full assistant message
     */
    public SseEmitter streamChat(UUID workspaceId, UUID conversationId, String userContent) {
        SseEmitter emitter = new SseEmitter(0L);

        executor.submit(() -> {
            try {
                // Resolve workspace and extract repository ID for context
                UUID repoId = workspaceRepository.findById(workspaceId)
                        .map(WorkspaceEntity::getRepositoryId)
                        .orElse(null);

                // Resolve or create conversation
                UUID resolvedConversationId = conversationId;
                if (resolvedConversationId == null) {
                    String title = userContent.length() > 60
                            ? userContent.substring(0, 60) + "..."
                            : userContent;
                    var conv = conversationService.create(workspaceId, title);
                    resolvedConversationId = conv.getId();
                }

                final UUID finalConversationId = resolvedConversationId;

                // Save user message
                conversationService.addMessage(finalConversationId, "user", userContent, null);

                // Create planner run
                var plannerRun = plannerService.createRun(finalConversationId, userContent);
                UUID plannerRunId = plannerRun.getId();

                // Emit metadata event with conversation and planner run IDs
                emitter.send(SseEmitter.event()
                        .name("metadata")
                        .data("{\"conversationId\":\"" + finalConversationId + "\","
                                + "\"plannerRunId\":\"" + plannerRunId + "\"}"));

                // Stream AI response
                StringBuilder fullResponse = new StringBuilder();
                Flux<String> chatFlux = aiGatewayService.chat(userContent, repoId, workspaceId);

                chatFlux.doOnNext(chunk -> {
                    try {
                        fullResponse.append(chunk);
                        emitter.send(SseEmitter.event().name("chunk").data(chunk));
                    } catch (IOException e) {
                        log.warn("SSE send error: {}", e.getMessage());
                    }
                }).doOnComplete(() -> {
                    try {
                        // Save complete assistant message
                        conversationService.addMessage(
                                finalConversationId, "assistant", fullResponse.toString(), plannerRunId);
                        plannerService.updateRunStatus(plannerRunId, "COMPLETED");

                        emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                        emitter.complete();
                    } catch (Exception e) {
                        log.error("Error completing SSE stream: {}", e.getMessage());
                        emitter.completeWithError(e);
                    }
                }).doOnError(error -> {
                    log.error("Chat stream error: {}", error.getMessage());
                    plannerService.updateRunStatus(plannerRunId, "FAILED");
                    emitter.completeWithError(error);
                }).subscribe();

            } catch (Exception e) {
                log.error("Error in streaming chat setup: {}", e.getMessage());
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    /**
     * Synchronous (non-streaming) chat: returns the full response as a String.
     */
    public String chat(UUID workspaceId, UUID conversationId, String userContent) {
        UUID repoId = workspaceRepository.findById(workspaceId)
                .map(WorkspaceEntity::getRepositoryId)
                .orElse(null);

        UUID resolvedConversationId = conversationId;
        if (resolvedConversationId == null) {
            String title = userContent.length() > 60
                    ? userContent.substring(0, 60) + "..."
                    : userContent;
            var conv = conversationService.create(workspaceId, title);
            resolvedConversationId = conv.getId();
        }

        final UUID finalConversationId = resolvedConversationId;
        conversationService.addMessage(finalConversationId, "user", userContent, null);

        var plannerRun = plannerService.createRun(finalConversationId, userContent);
        UUID plannerRunId = plannerRun.getId();

        StringBuilder result = new StringBuilder();
        aiGatewayService.chat(userContent, repoId, workspaceId)
                .doOnNext(result::append)
                .blockLast();

        String fullResponse = result.toString();
        conversationService.addMessage(finalConversationId, "assistant", fullResponse, plannerRunId);
        plannerService.updateRunStatus(plannerRunId, "COMPLETED");

        return fullResponse;
    }
}
