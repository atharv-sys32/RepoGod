package com.repogod.repository.controller;

import com.repogod.auth.repository.UserRepository;
import com.repogod.common.dto.ApiResponse;
import com.repogod.repository.dto.FileNodeDto;
import com.repogod.repository.dto.ImportRepositoryRequest;
import com.repogod.repository.dto.RepositoryDto;
import com.repogod.repository.entity.RepositoryFileEntity;
import com.repogod.repository.repository.RepositoryFileJpaRepository;
import com.repogod.repository.service.RepositoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/repositories")
public class RepositoryController {

    private final RepositoryService repositoryService;
    private final UserRepository userRepository;
    private final RepositoryFileJpaRepository repositoryFileJpaRepository;

    public RepositoryController(RepositoryService repositoryService,
                                UserRepository userRepository,
                                RepositoryFileJpaRepository repositoryFileJpaRepository) {
        this.repositoryService = repositoryService;
        this.userRepository = userRepository;
        this.repositoryFileJpaRepository = repositoryFileJpaRepository;
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

    @GetMapping("/{id}/tree")
    public ResponseEntity<ApiResponse<List<FileNodeDto>>> getFileTree(
            @PathVariable UUID id) {
        List<RepositoryFileEntity> files =
                repositoryFileJpaRepository.findByRepositoryIdOrderByFilePath(id);
        List<FileNodeDto> tree = buildFileTree(files);
        return ResponseEntity.ok(ApiResponse.ok("File tree", tree));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<ApiResponse<Map<String, String>>> getFileContent(
            @PathVariable UUID id,
            @RequestParam String path) {
        // This would need to read from the cloned repo on disk
        // For now, return an error message
        return ResponseEntity.ok(ApiResponse.ok(Map.of("content", "")));
    }

    private static List<FileNodeDto> buildFileTree(List<RepositoryFileEntity> files) {
        FileNodeDto root = new FileNodeDto("root", "", "directory", null, new java.util.ArrayList<>());

        for (RepositoryFileEntity file : files) {
            String[] parts = file.getFilePath().split("/");
            FileNodeDto currentNode = root;

            for (int i = 0; i < parts.length; i++) {
                String part = parts[i];
                boolean isFile = (i == parts.length - 1);

                if (isFile) {
                    // Add file node
                    String currentPath = buildPath(parts, i);
                    currentNode.getChildren().add(new FileNodeDto(
                            part, currentPath, "file", file.getLanguage(), null));
                } else {
                    // Find or create directory
                    String currentPath = buildPath(parts, i);
                    FileNodeDto dirNode = findChildDirectory(currentNode, part);
                    if (dirNode == null) {
                        dirNode = new FileNodeDto(part, currentPath, "directory", null, new java.util.ArrayList<>());
                        currentNode.getChildren().add(dirNode);
                    }
                    currentNode = dirNode;
                }
            }
        }

        // Sort children: directories first, then files, alphabetically
        sortTree(root);
        return root.getChildren();
    }

    private static String buildPath(String[] parts, int index) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i <= index; i++) {
            if (i > 0) sb.append("/");
            sb.append(parts[i]);
        }
        return sb.toString();
    }

    private static FileNodeDto findChildDirectory(FileNodeDto parent, String name) {
        if (parent.getChildren() != null) {
            for (FileNodeDto child : parent.getChildren()) {
                if ("directory".equals(child.getType()) && name.equals(child.getName())) {
                    return child;
                }
            }
        }
        return null;
    }

    private static void sortTree(FileNodeDto node) {
        if (node.getChildren() == null || node.getChildren().isEmpty()) return;

        node.getChildren().sort((a, b) -> {
            if (!a.getType().equals(b.getType())) {
                return "directory".equals(a.getType()) ? -1 : 1;
            }
            return a.getName().compareToIgnoreCase(b.getName());
        });

        for (FileNodeDto child : node.getChildren()) {
            sortTree(child);
        }
    }
}
