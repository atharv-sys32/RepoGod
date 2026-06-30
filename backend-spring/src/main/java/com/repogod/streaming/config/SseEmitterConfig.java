package com.repogod.streaming.config;

import org.springframework.context.annotation.Configuration;

/**
 * Configuration for SSE emitter timeouts.
 * The default SseEmitter timeout is 30 seconds; we extend it for long-running AI streams.
 */
@Configuration
public class SseEmitterConfig {

    /**
     * Timeout in milliseconds for SSE connections.
     * 0L means no timeout (the connection stays open until explicitly completed or errored).
     */
    public static final long SSE_TIMEOUT_MS = 0L;
}
