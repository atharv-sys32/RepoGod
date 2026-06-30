package com.repogod.common.dto;

import java.time.Instant;

public record ApiError(
        String errorCode,
        String message,
        Instant timestamp,
        String traceId
) {
}
