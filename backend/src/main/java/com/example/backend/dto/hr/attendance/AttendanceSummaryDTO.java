package com.example.backend.dto.hr.attendance;
import com.example.backend.dto.hr.ContractTypeSummary;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

// DTO for attendance summary
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSummaryDTO {
    private LocalDate date;
    private UUID siteId;
    private String siteName;
    private Integer totalEmployees;
    private Integer presentCount;
    private Integer absentCount;
    private Integer lateCount;
    private Integer onLeaveCount;
    private Double totalHoursWorked;
    private Map<String, ContractTypeSummary> summaryByContractType;
}
