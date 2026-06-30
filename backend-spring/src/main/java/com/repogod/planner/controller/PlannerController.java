package com.repogod.planner.controller;

import com.repogod.common.dto.ApiResponse;
import com.repogod.planner.dto.PlannerRunDto;
import com.repogod.planner.service.PlannerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/planner-runs")
public class PlannerController {

    private final PlannerService plannerService;

    public PlannerController(PlannerService plannerService) {
        this.plannerService = plannerService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PlannerRunDto>> getRunWithSteps(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(plannerService.getRunWithSteps(id)));
    }
}
