package com.example.backend.dto.hr;

import com.example.backend.models.hr.JobPosition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPositionDTO {

    private UUID id;
    private String positionName;
    private String department;
    private String head;
    private Double baseSalary;
    private Integer probationPeriod;
    private JobPosition.ContractType contractType;
    private String experienceLevel;
    private Boolean active;

    // HOURLY contract specific fields
    private Integer workingDaysPerWeek;
    private Integer hoursPerShift;
    private Double hourlyRate;
    private Double overtimeMultiplier;
    private Boolean trackBreaks;
    private Integer breakDurationMinutes;

    // DAILY contract specific fields
    private Double dailyRate;
    private Integer workingDaysPerMonth;
    private Boolean includesWeekends;

    // MONTHLY contract specific fields
    private Double monthlyBaseSalary;
    private String shifts;
    private Integer workingHours;
    private String vacations;

    // Calculated fields (read-only)
    private Double calculatedDailySalary;
    private Double calculatedMonthlySalary;
    private Boolean isValidConfiguration;

    // Helper method to populate calculated fields
    public void calculateFields() {
        if (contractType != null) {
            switch (contractType) {
                case HOURLY:
                    this.calculatedDailySalary = (hourlyRate != null && hoursPerShift != null)
                            ? hourlyRate * hoursPerShift : 0.0;
                    Integer workingDays = workingDaysPerWeek != null ? workingDaysPerWeek * 4 : 22;
                    this.calculatedMonthlySalary = calculatedDailySalary * workingDays;
                    this.isValidConfiguration = hourlyRate != null && hourlyRate > 0
                            && hoursPerShift != null && hoursPerShift > 0
                            && workingDaysPerWeek != null && workingDaysPerWeek > 0;
                    break;
                case DAILY:
                    this.calculatedDailySalary = dailyRate != null ? dailyRate : 0.0;
                    Integer monthlyDays = workingDaysPerMonth != null ? workingDaysPerMonth : 22;
                    this.calculatedMonthlySalary = calculatedDailySalary * monthlyDays;
                    this.isValidConfiguration = dailyRate != null && dailyRate > 0
                            && workingDaysPerMonth != null && workingDaysPerMonth > 0;
                    break;
                case MONTHLY:
                    this.calculatedMonthlySalary = monthlyBaseSalary != null ? monthlyBaseSalary : 0.0;
                    this.calculatedDailySalary = (monthlyBaseSalary != null && workingHours != null)
                            ? monthlyBaseSalary / 22 : 0.0; // Assuming 22 working days per month
                    this.isValidConfiguration = monthlyBaseSalary != null && monthlyBaseSalary > 0;
                    break;
                default:
                    this.calculatedDailySalary = 0.0;
                    this.calculatedMonthlySalary = 0.0;
                    this.isValidConfiguration = false;
            }
        }
    }

    // Legacy compatibility
    public String getType() {
        return contractType != null ? contractType.name() : null;
    }

    public void setType(String type) {
        if (type != null) {
            try {
                this.contractType = JobPosition.ContractType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                this.contractType = JobPosition.ContractType.MONTHLY;
            }
        }
    }
}