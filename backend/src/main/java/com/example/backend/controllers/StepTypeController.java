package com.example.backend.controllers;

import com.example.backend.dtos.StepTypeDto;
import com.example.backend.services.StepTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/steptypes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StepTypeController {

    private final StepTypeService stepTypeService;

    @GetMapping
    public ResponseEntity<List<StepTypeDto>> getAllStepTypes() {
        return ResponseEntity.ok(stepTypeService.getAllStepTypes());
    }

    @GetMapping("/management")
    public ResponseEntity<List<StepTypeDto>> getAllStepTypesForManagement() {
        return ResponseEntity.ok(stepTypeService.getAllStepTypesForManagement());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StepTypeDto> getStepTypeById(@PathVariable UUID id) {
        return ResponseEntity.ok(stepTypeService.getStepTypeById(id));
    }

    @PostMapping
    public ResponseEntity<StepTypeDto> createStepType(@RequestBody StepTypeDto stepTypeDto) {
        return new ResponseEntity<>(stepTypeService.createStepType(stepTypeDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StepTypeDto> updateStepType(@PathVariable UUID id, @RequestBody StepTypeDto stepTypeDto) {
        return ResponseEntity.ok(stepTypeService.updateStepType(id, stepTypeDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStepType(@PathVariable UUID id) {
        stepTypeService.deleteStepType(id);
        return ResponseEntity.noContent().build();
    }
}





