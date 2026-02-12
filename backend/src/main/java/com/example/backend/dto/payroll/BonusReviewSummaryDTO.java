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
public class BonusReviewSummaryDTO {

    private String message;
    private int totalBonusCount;
    private BigDecimal totalBonusAmount;
    private int paidBonusCount;
    private BigDecimal paidBonusAmount;
    private int pendingBonusCount;
    private BigDecimal pendingBonusAmount;
    private List<BonusTypeSummary> byType;
    private List<EmployeeBonusSummary> byEmployee;
    private List<String> issues;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BonusTypeSummary {
        private String typeName;
        private String typeCode;
        private int count;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeBonusSummary {
        private UUID employeeId;
        private String employeeName;
        private int count;
        private BigDecimal amount;
    }
}
