package com.repogod.repository.controller;

import com.repogod.auth.repository.UserRepository;
import com.repogod.common.dto.ApiResponse;
import com.repogod.repository.dto.ImportRepositoryRequest;
import com.repogod.repository.dto.RepositoryDto;
import com.repogod.repository.service.RepositoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/repositories")
public class RepositoryController {

    private final RepositoryService repositoryService;
    private final UserRepository userRepository;

    public RepositoryController(RepositoryService repositoryService, UserRepository userRepository) {
        this.repositoryService = repositoryService;
        this.userRepository = userRepository;
    }

    private UUID resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"))
                .getId();
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<RepositoryDto>> importRepository(
            @Valid @RequestBody ImportRepositoryRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        RepositoryDto dto = repositoryService.importRepository(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Repository import initiated", dto));
    }

    @PostMapping("/{id}/index")
    public ResponseEntity<ApiResponse<RepositoryDto>> triggerIndexing(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        RepositoryDto dto = repositoryService.triggerIndexing(id, userId);
        return ResponseEntity.ok(ApiResponse.ok("Indexing triggered", dto));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Map<String, String>>> getStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        String status = repositoryService.getStatus(id, userId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", status)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepositoryDto>>> list(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.ok(repositoryService.findByUserId(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepositoryDto>> get(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.ok(repositoryService.findById(id, userId)));
    }
}
