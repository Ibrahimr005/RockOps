package com.example.backend.dtos;

import com.example.backend.models.maintenance.MaintenanceRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceTimelineEventDto {
    private LocalDateTime timestamp;
    private String title;
    private String description;
    private String type; // e.g., "CREATED", "APPROVED", "REJECTED", "INFO", "COMPLETED"
    private String actorName; // Name of person who performed action
}
