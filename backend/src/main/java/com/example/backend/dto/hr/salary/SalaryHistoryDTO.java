package com.example.backend.dto.hr.salary;

import com.example.backend.models.hr.SalaryHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryHistoryDTO {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;
    private BigDecimal previousSalary;
    private BigDecimal newSalary;
    private String changeType;
    private String changeReason;
    private UUID referenceId;
    private String referenceType;
    private LocalDate effectiveDate;
    private String changedBy;
    private LocalDateTime createdAt;

    public static SalaryHistoryDTO fromEntity(SalaryHistory entity) {
        if (entity == null) return null;

        SalaryHistoryDTOBuilder builder = SalaryHistoryDTO.builder()
                .id(entity.getId())
                .previousSalary(entity.getPreviousSalary())
                .newSalary(entity.getNewSalary())
                .changeType(entity.getChangeType())
                .changeReason(entity.getChangeReason())
                .referenceId(entity.getReferenceId())
                .referenceType(entity.getReferenceType())
                .effectiveDate(entity.getEffectiveDate())
                .changedBy(entity.getChangedBy())
                .createdAt(entity.getCreatedAt());

        if (entity.getEmployee() != null) {
            builder.employeeId(entity.getEmployee().getId())
                    .employeeName(entity.getEmployee().getFullName())
                    .employeeNumber(entity.getEmployee().getEmployeeNumber());
        }

        return builder.build();
    }
}
