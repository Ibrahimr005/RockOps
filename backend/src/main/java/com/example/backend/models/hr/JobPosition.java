package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Entity
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employees", "vacancies"})
@ToString(exclude = {"employees", "vacancies"})
public class JobPosition {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String positionName;

    @ManyToOne
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"jobPositions"})
    private Department department;

    private String head;
    private Double baseSalary;
    private Integer probationPeriod;

    // Enhanced contract type field
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContractType contractType;

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

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL)
    @JsonBackReference("job-employee")
    private List<Employee> employees;

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL)
    @JsonBackReference("vacancy-jobposition")
    private List<Vacancy> vacancies;

    // Enum for contract types
    @Getter
    public enum ContractType {
        HOURLY("Hourly Contract"),
        DAILY("Daily Contract"),
        MONTHLY("Monthly Contract");

        private final String displayName;

        ContractType(String displayName) {
            this.displayName = displayName;
        }

    }

    // Helper methods for contract-specific calculations
    public Double calculateDailySalary() {
        switch (contractType) {
            case HOURLY:
                return (hourlyRate != null && hoursPerShift != null)
                        ? hourlyRate * hoursPerShift : 0.0;
            case DAILY:
                return dailyRate != null ? dailyRate : 0.0;
            case MONTHLY:
                return (monthlyBaseSalary != null && workingDaysPerMonth != null && workingDaysPerMonth > 0)
                        ? monthlyBaseSalary / workingDaysPerMonth : 0.0;
            default:
                return 0.0;
        }
    }

    public Double calculateMonthlySalary() {
        switch (contractType) {
            case HOURLY:
                Double dailySalary = calculateDailySalary();
                Integer workingDays = workingDaysPerWeek != null ? workingDaysPerWeek * 4 : 22;
                return dailySalary * workingDays;
            case DAILY:
                Integer monthlyDays = workingDaysPerMonth != null ? workingDaysPerMonth : 22;
                return (dailyRate != null) ? dailyRate * monthlyDays : 0.0;
            case MONTHLY:
                return monthlyBaseSalary != null ? monthlyBaseSalary : 0.0;
            default:
                return 0.0;
        }
    }

    public boolean isHourlyTracking() {
        return contractType == ContractType.HOURLY;
    }

    public boolean isDailyTracking() {
        return contractType == ContractType.DAILY;
    }

    public boolean isMonthlyTracking() {
        return contractType == ContractType.MONTHLY;
    }

    // Validation methods
    public boolean isValidConfiguration() {
        switch (contractType) {
            case HOURLY:
                return hourlyRate != null && hourlyRate > 0
                        && hoursPerShift != null && hoursPerShift > 0
                        && workingDaysPerWeek != null && workingDaysPerWeek > 0;
            case DAILY:
                return dailyRate != null && dailyRate > 0
                        && workingDaysPerMonth != null && workingDaysPerMonth > 0;
            case MONTHLY:
                return monthlyBaseSalary != null && monthlyBaseSalary > 0;
            default:
                return false;
        }
    }

    // Legacy compatibility
    public String getType() {
        return contractType != null ? contractType.name() : null;
    }

    public void setType(String type) {
        if (type != null) {
            try {
                this.contractType = ContractType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Handle legacy values or set default
                this.contractType = ContractType.MONTHLY;
            }
        }
    }

    // Override baseSalary getter to use contract-specific calculation
    public Double getBaseSalary() {
        if (baseSalary != null) {
            return baseSalary;
        }
        return calculateMonthlySalary();
    }
}