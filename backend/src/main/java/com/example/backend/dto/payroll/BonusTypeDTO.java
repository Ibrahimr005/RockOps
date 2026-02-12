package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BonusTypeDTO {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private Boolean isActive;
}
