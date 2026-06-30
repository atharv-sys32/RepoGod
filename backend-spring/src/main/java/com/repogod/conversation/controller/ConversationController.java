package com.repogod.conversation.controller;

import com.repogod.common.dto.ApiResponse;
import com.repogod.conversation.dto.ConversationDto;
import com.repogod.conversation.dto.MessageDto;
import com.repogod.conversation.service.ConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConversationDto>> create(
            @RequestBody Map<String, String> body) {
        UUID workspaceId = UUID.fromString(body.get("workspaceId"));
        String title = body.getOrDefault("title", "New Conversation");
        ConversationDto dto = conversationService.create(workspaceId, title);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Conversation created", dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConversationDto>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(conversationService.findById(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConversationDto>>> listByWorkspace(
            @RequestParam UUID workspaceId) {
        return ResponseEntity.ok(ApiResponse.ok(conversationService.getConversations(workspaceId)));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<MessageDto>>> getMessages(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(conversationService.getHistory(id)));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<MessageDto>> addMessage(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String role = body.get("role");
        String content = body.get("content");
        String plannerRunIdStr = body.get("plannerRunId");
        UUID plannerRunId = plannerRunIdStr != null ? UUID.fromString(plannerRunIdStr) : null;
        MessageDto dto = conversationService.addMessage(id, role, content, plannerRunId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Message added", dto));
    }
}
