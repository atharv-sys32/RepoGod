package com.repogod.streaming.controller;

import com.repogod.auth.repository.UserRepository;
import com.repogod.common.dto.ApiResponse;
import com.repogod.conversation.dto.SendMessageRequest;
import com.repogod.streaming.service.ChatStreamService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatStreamService chatStreamService;
    private final UserRepository userRepository;

    public ChatController(ChatStreamService chatStreamService, UserRepository userRepository) {
        this.chatStreamService = chatStreamService;
        this.userRepository = userRepository;
    }

    /**
     * POST /api/v1/chat — synchronous chat endpoint.
     * Calls the AI service, waits for the full response, saves messages, returns JSON.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> chat(
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String response = chatStreamService.chat(
                request.getWorkspaceId(),
                request.getConversationId(),
                request.getContent()
        );
        return ResponseEntity.ok(ApiResponse.ok("Chat response", Map.of("response", response)));
    }

    /**
     * GET /api/v1/chat/stream — SSE streaming endpoint.
     * Streams AI response tokens as Server-Sent Events.
     *
     * @param workspaceId    the workspace context
     * @param conversationId optional existing conversation ID (creates new if absent)
     * @param content        the user's message content
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam UUID workspaceId,
            @RequestParam(required = false) UUID conversationId,
            @RequestParam String content,
            @AuthenticationPrincipal UserDetails userDetails) {
        return chatStreamService.streamChat(workspaceId, conversationId, content);
    }
}
