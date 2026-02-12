package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateBonusDTO {
    private List<UUID> employeeIds;
    private UUID bonusTypeId;
    private BigDecimal amount;
    private Integer effectiveMonth;
    private Integer effectiveYear;
    private String reason;
}
