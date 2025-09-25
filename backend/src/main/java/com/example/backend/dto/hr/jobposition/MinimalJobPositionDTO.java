package com.example.backend.dto.hr.jobposition;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MinimalJobPositionDTO {
    private UUID id;
    private String positionName;
    private String experienceLevel;
    private String contractType;
    private boolean active;
    private String departmentName;
}
