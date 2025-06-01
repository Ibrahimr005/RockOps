package com.example.backend.models.hr;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.util.UUID;

@Entity
@Table(name = "attendances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate date;

    // Contract type for this attendance record
    @Enumerated(EnumType.STRING)
    private ContractType contractType;

    // HOURLY contract fields
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private Integer breakDurationMinutes;
    private Double hoursWorked;
    private Double overtimeHours;
    private Double regularHours;

    // DAILY contract fields
    @Enumerated(EnumType.STRING)
    private DailyAttendanceStatus dailyStatus;

    // MONTHLY contract fields (existing)
    @Enumerated(EnumType.STRING)
    private AttendanceStatus status;

    // Common fields
    private String notes;
    private Boolean isHoliday;
    private Boolean isLeave;
    private String location;
    private Double latitude;
    private Double longitude;

    // Calculated fields
    private Double dailyEarnings;
    private Boolean isLate;
    private Integer lateMinutes;

    public enum ContractType {
        HOURLY, DAILY, MONTHLY
    }

    public enum DailyAttendanceStatus {
        PRESENT, ABSENT, HOLIDAY, LEAVE
    }

    // Helper methods for HOURLY contract
    public void calculateHoursWorked() {
        if (checkInTime != null && checkOutTime != null) {
            Duration duration = Duration.between(checkInTime, checkOutTime);

            // Subtract break time if applicable
            long totalMinutes = duration.toMinutes();
            if (breakDurationMinutes != null) {
                totalMinutes -= breakDurationMinutes;
            }

            // Convert to hours with 2 decimal precision
            this.hoursWorked = Math.round((totalMinutes / 60.0) * 100.0) / 100.0;

            // Calculate regular and overtime hours
            calculateRegularAndOvertimeHours();
        }
    }

    private void calculateRegularAndOvertimeHours() {
        if (hoursWorked != null && employee != null && employee.getJobPosition() != null) {
            JobPosition jobPosition = employee.getJobPosition();
            Integer standardHours = jobPosition.getHoursPerShift();

            if (standardHours != null) {
                if (hoursWorked <= standardHours) {
                    this.regularHours = hoursWorked;
                    this.overtimeHours = 0.0;
                } else {
                    this.regularHours = standardHours.doubleValue();
                    this.overtimeHours = hoursWorked - standardHours;
                }
            } else {
                // Default to 8 hours if not specified
                if (hoursWorked <= 8) {
                    this.regularHours = hoursWorked;
                    this.overtimeHours = 0.0;
                } else {
                    this.regularHours = 8.0;
                    this.overtimeHours = hoursWorked - 8;
                }
            }
        }
    }

    // Calculate daily earnings based on contract type
    public void calculateDailyEarnings() {
        if (employee == null || employee.getJobPosition() == null) {
            this.dailyEarnings = 0.0;
            return;
        }

        JobPosition jobPosition = employee.getJobPosition();

        switch (contractType) {
            case HOURLY:
                calculateHourlyEarnings(jobPosition);
                break;
            case DAILY:
                calculateDailyEarnings(jobPosition);
                break;
            case MONTHLY:
                this.dailyEarnings = jobPosition.calculateDailySalary();
                break;
            default:
                this.dailyEarnings = 0.0;
        }
    }

    private void calculateHourlyEarnings(JobPosition jobPosition) {
        Double hourlyRate = jobPosition.getHourlyRate();
        Double overtimeMultiplier = jobPosition.getOvertimeMultiplier();

        if (hourlyRate == null) {
            this.dailyEarnings = 0.0;
            return;
        }

        double earnings = 0.0;

        // Regular hours earnings
        if (regularHours != null) {
            earnings += regularHours * hourlyRate;
        }

        // Overtime earnings
        if (overtimeHours != null && overtimeHours > 0) {
            double overtimeRate = hourlyRate * (overtimeMultiplier != null ? overtimeMultiplier : 1.5);
            earnings += overtimeHours * overtimeRate;
        }

        this.dailyEarnings = Math.round(earnings * 100.0) / 100.0;
    }

    private void calculateDailyEarnings(JobPosition jobPosition) {
        if (dailyStatus == DailyAttendanceStatus.PRESENT) {
            this.dailyEarnings = jobPosition.getDailyRate();
        } else {
            this.dailyEarnings = 0.0;
        }
    }

    // Check if employee is late (for HOURLY contracts)
    public void checkLateness() {
        if (contractType == ContractType.HOURLY && checkInTime != null
                && employee != null && employee.getJobPosition() != null) {

            // Assume standard start time is 9:00 AM (can be configurable)
            LocalTime standardStartTime = LocalTime.of(9, 0);

            if (checkInTime.isAfter(standardStartTime)) {
                this.isLate = true;
                Duration lateDuration = Duration.between(standardStartTime, checkInTime);
                this.lateMinutes = (int) lateDuration.toMinutes();
            } else {
                this.isLate = false;
                this.lateMinutes = 0;
            }
        }
    }

    // Auto-calculate fields before saving
    @PrePersist
    @PreUpdate
    public void autoCalculate() {
        if (contractType == ContractType.HOURLY) {
            calculateHoursWorked();
            checkLateness();
        }
        calculateDailyEarnings();
    }

    // Get display status based on contract type
    public String getDisplayStatus() {
        switch (contractType) {
            case HOURLY:
                if (checkInTime != null && checkOutTime == null) {
                    return "CHECKED_IN";
                } else if (checkInTime != null && checkOutTime != null) {
                    return isLate != null && isLate ? "PRESENT_LATE" : "PRESENT";
                } else {
                    return "ABSENT";
                }
            case DAILY:
                return dailyStatus != null ? dailyStatus.name() : "ABSENT";
            case MONTHLY:
                return status != null ? status.name() : "ABSENT";
            default:
                return "UNKNOWN";
        }
    }

    // Validation methods
    public boolean isValidHourlyRecord() {
        return contractType == ContractType.HOURLY
                && checkInTime != null;
    }

    public boolean isValidDailyRecord() {
        return contractType == ContractType.DAILY
                && dailyStatus != null;
    }

    public boolean isValidMonthlyRecord() {
        return contractType == ContractType.MONTHLY
                && status != null;
    }
}