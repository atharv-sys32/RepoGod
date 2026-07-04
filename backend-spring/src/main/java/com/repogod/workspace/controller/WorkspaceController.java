package com.repogod.workspace.controller;

import com.repogod.auth.repository.UserRepository;
import com.repogod.common.dto.ApiResponse;
import com.repogod.conversation.dto.ConversationDto;
import com.repogod.conversation.dto.MessageDto;
import com.repogod.conversation.service.ConversationService;
import com.repogod.streaming.service.ChatStreamService;
import com.repogod.workspace.dto.CreateWorkspaceRequest;
import com.repogod.workspace.dto.WorkspaceDto;
import com.repogod.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;
    private final ConversationService conversationService;

    public WorkspaceController(WorkspaceService workspaceService,
                               UserRepository userRepository,
                               ConversationService conversationService) {
        this.workspaceService = workspaceService;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
    }

    private UUID resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"))
                .getId();
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WorkspaceDto>> create(
            @Valid @RequestBody CreateWorkspaceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        WorkspaceDto dto = workspaceService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Workspace created", dto));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WorkspaceDto>>> list(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.ok(workspaceService.findByUserId(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkspaceDto>> get(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.ok(workspaceService.findById(id, userId)));
    }

    @PostMapping("/{id}/open")
    public ResponseEntity<ApiResponse<WorkspaceDto>> open(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.ok(workspaceService.updateLastOpened(id, userId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        workspaceService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/conversations")
    public ResponseEntity<ApiResponse<List<ConversationDto>>> getConversations(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(conversationService.getConversations(id)));
    }
}
