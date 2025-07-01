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
                    // Daily salary: hourly rate * hours per shift
                    this.calculatedDailySalary = (hourlyRate != null && hoursPerShift != null)
                            ? hourlyRate * hoursPerShift : 0.0;
                    // Monthly salary: hourly rate * hours per shift * working days per week * 4 weeks
                    if (hourlyRate != null && hoursPerShift != null && workingDaysPerWeek != null) {
                        this.calculatedMonthlySalary = hourlyRate * hoursPerShift * workingDaysPerWeek * 4;
                    } else {
                        this.calculatedMonthlySalary = 0.0;
                    }
                    this.isValidConfiguration = hourlyRate != null && hourlyRate > 0
                            && hoursPerShift != null && hoursPerShift > 0
                            && workingDaysPerWeek != null && workingDaysPerWeek > 0;
                    break;
                case DAILY:
                    // Daily salary: daily rate
                    this.calculatedDailySalary = dailyRate != null ? dailyRate : 0.0;
                    // Monthly salary: daily rate * working days per month
                    if (dailyRate != null && workingDaysPerMonth != null) {
                        this.calculatedMonthlySalary = dailyRate * workingDaysPerMonth;
                    } else {
                        this.calculatedMonthlySalary = 0.0;
                    }
                    this.isValidConfiguration = dailyRate != null && dailyRate > 0
                            && workingDaysPerMonth != null && workingDaysPerMonth > 0;
                    break;
                case MONTHLY:
                    // Monthly salary: monthly base salary
                    this.calculatedMonthlySalary = monthlyBaseSalary != null ? monthlyBaseSalary : 0.0;
                    // Daily salary: monthly salary / working days per month (default 22)
                    Integer workingDays = workingDaysPerMonth != null ? workingDaysPerMonth : 22;
                    this.calculatedDailySalary = (monthlyBaseSalary != null && workingDays > 0)
                            ? monthlyBaseSalary / workingDays : 0.0;
                    this.isValidConfiguration = monthlyBaseSalary != null && monthlyBaseSalary > 0
                            && workingDaysPerMonth != null && workingDaysPerMonth > 0;
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