package com.example.backend.models.hr;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonBackReference;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "attendance",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"employee_id", "date"})
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonBackReference("employee-attendance")
    private Employee employee;

    @Column(nullable = false)
    private LocalDate date;

    // For MONTHLY (Full-time) employees - time tracking
    @Column(name = "check_in")
    private LocalTime checkIn;

    @Column(name = "check_out")
    private LocalTime checkOut;

    // For HOURLY employees
    @Column(name = "hours_worked")
    private Double hoursWorked;

    @Column(name = "expected_hours")
    private Double expectedHours; // Based on JobPosition.hoursPerShift

    @Column(name = "overtime_hours")
    private Double overtimeHours;

    // For all employees
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private AttendanceStatus status = AttendanceStatus.ABSENT;

    // Day type for better tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "day_type")
    @Builder.Default
    private DayType dayType = DayType.WORKING_DAY;

    // Leave information
    @Column(name = "leave_type")
    private String leaveType; // SICK, VACATION, PERSONAL, etc.

    @Column(name = "leave_approved")
    private Boolean leaveApproved;

    // Optional fields
    @Column(length = 500)
    private String notes;

    // Location tracking (optional)
    @Column(name = "check_in_location")
    private String checkInLocation;

    @Column(name = "check_out_location")
    private String checkOutLocation;

    // Audit fields
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Enum for attendance status
    public enum AttendanceStatus {
        PRESENT,      // Employee was present
        ABSENT,       // Employee was absent without leave
        OFF,          // Scheduled off day (weekend/holiday)
        ON_LEAVE,     // Employee on approved leave
        HALF_DAY,     // Half day attendance
        LATE,         // Present but late
        EARLY_OUT     // Left early
    }

    // Enum for day type
    public enum DayType {
        WORKING_DAY,
        WEEKEND,
        PUBLIC_HOLIDAY,
        COMPANY_HOLIDAY
    }

    // Helper methods
    public Double calculateTotalHours() {
        if (checkIn != null && checkOut != null) {
            long minutes = java.time.Duration.between(checkIn, checkOut).toMinutes();
            return minutes / 60.0;
        } else if (hoursWorked != null) {
            return hoursWorked;
        }
        return 0.0;
    }

    public Double calculateOvertimeHours() {
        if (expectedHours != null && hoursWorked != null) {
            double overtime = hoursWorked - expectedHours;
            return overtime > 0 ? overtime : 0.0;
        }
        return 0.0;
    }

    public boolean isWorkingDay() {
        return dayType == DayType.WORKING_DAY;
    }

    public boolean isPresent() {
        return status == AttendanceStatus.PRESENT ||
                status == AttendanceStatus.LATE ||
                status == AttendanceStatus.HALF_DAY ||
                status == AttendanceStatus.EARLY_OUT;
    }
}