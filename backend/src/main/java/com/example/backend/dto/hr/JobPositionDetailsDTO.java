// ===============================
// 1. JobPositionDetailsDTO.java - Main DTO with all data
// ===============================

package com.example.backend.dto.hr;

import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.dto.hr.promotions.PositionPromotionsDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
public class JobPositionDetailsDTO {
    // ===============================
    // OVERVIEW DATA
    // ===============================
    private UUID id;
    private String positionName;
    private Department department;
    private String departmentName;
    private String head;
    private Double baseSalary;
    private Integer probationPeriod;
    private JobPosition.ContractType contractType;
    private String experienceLevel;
    private Boolean active;

    // Contract-specific fields
    private Integer workingDaysPerWeek;
    private Integer hoursPerShift;
    private Double hourlyRate;
    private Double overtimeMultiplier;
    private Boolean trackBreaks;
    private Integer breakDurationMinutes;
    private Double dailyRate;
    private Integer workingDaysPerMonth;
    private Boolean includesWeekends;
    private Double monthlyBaseSalary;
    private String shifts;
    private Integer workingHours;
    private String vacations;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private String workingTimeRange;

    // Calculated fields
    private Double calculatedMonthlySalary;
    private Double calculatedDailySalary;
    private Boolean isValidConfiguration;
    private Boolean isHighLevelPosition;

    // ===============================
    // EMPLOYEES DATA
    // ===============================
    private List<EmployeeSummaryDTO> employees;
    private Integer totalEmployeeCount;
    private Integer activeEmployeeCount;
    private Integer inactiveEmployeeCount;
    private List<EmployeeSummaryDTO> eligibleForPromotionEmployees;

    // ===============================
    // ANALYTICS DATA
    // ===============================
    private PositionAnalyticsDTO analytics;

    // ===============================
    // PROMOTIONS DATA
    // ===============================
    private PositionPromotionsDTO promotions;

    // ===============================
    // SUMMARY COUNTS (for quick reference)
    // ===============================
    private Integer vacancyCount;
    private Integer activeVacancyCount;
    private Integer totalPromotionsCount;
    private Integer pendingPromotionsCount;
}
