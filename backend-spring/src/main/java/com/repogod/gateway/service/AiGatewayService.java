package com.repogod.gateway.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@Service
public class AiGatewayService {

    private static final Logger log = LoggerFactory.getLogger(AiGatewayService.class);

    private final WebClient fastApiWebClient;

    public AiGatewayService(WebClient fastApiWebClient) {
        this.fastApiWebClient = fastApiWebClient;
    }

    /**
     * Triggers asynchronous indexing of a repository via the FastAPI service.
     * Returns a Mono with the raw response body string.
     */
    public Mono<String> triggerIndexing(UUID repoId, String gitUrl) {
        Map<String, Object> payload = Map.of(
                "repo_id", repoId.toString(),
                "git_url", gitUrl
        );
        log.info("Triggering indexing for repo {} at {}", repoId, gitUrl);
        return fastApiWebClient.post()
                .uri("/api/v1/index")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> log.debug("Indexing response for {}: {}", repoId, response))
                .doOnError(error -> log.error("Indexing error for {}: {}", repoId, error.getMessage()))
                .onErrorReturn("{\"status\":\"error\"}");
    }

    /**
     * Sends a chat message to the FastAPI AI service and streams the response back as SSE chunks.
     *
     * @param prompt      the user's prompt text
     * @param repoId      the repository UUID for context
     * @param workspaceId the workspace UUID for context
     * @return Flux of String chunks from the SSE stream
     */
    public Flux<String> chat(String prompt, UUID repoId, UUID workspaceId) {
        log.debug("Sending chat request to FastAPI: prompt length={}", prompt.length());
        return fastApiWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v1/chat/stream")
                        .queryParam("prompt", prompt)
                        .queryParam("repository_id", repoId != null ? repoId.toString() : "")
                        .queryParam("workspace_id", workspaceId != null ? workspaceId.toString() : "")
                        .build())
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnError(error -> log.error("Chat stream error: {}", error.getMessage()))
                .onErrorReturn("[ERROR] Failed to connect to AI service");
    }
}
