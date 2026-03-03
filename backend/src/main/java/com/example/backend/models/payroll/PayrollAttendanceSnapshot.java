package com.example.backend.models.payroll;

import com.example.backend.models.hr.Attendance;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "payroll_attendance_snapshots", indexes = {
    @Index(name = "idx_attendance_snap_emp_payroll", columnList = "employee_payroll_id"),
    @Index(name = "idx_attendance_snap_date", columnList = "attendance_date")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employeePayroll"})
@ToString(exclude = {"employeePayroll"})
public class PayrollAttendanceSnapshot {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_payroll_id", nullable = false, 
                foreignKey = @ForeignKey(name = "fk_attendance_snap_emp_payroll"))
    @JsonBackReference
    private EmployeePayroll employeePayroll;
    
    @Column(name = "attendance_id")
    private UUID attendanceId; // Reference to original Attendance record
    
    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;
    
    @Column(name = "is_public_holiday")
    @Builder.Default
    private Boolean isPublicHoliday = false;
    
    @Column(name = "is_weekend")
    @Builder.Default
    private Boolean isWeekend = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "day_type")
    private Attendance.DayType dayType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Attendance.AttendanceStatus status;
    
    @Column(name = "check_in")
    private LocalTime checkIn;
    
    @Column(name = "check_out")
    private LocalTime checkOut;
    
    @Column(name = "expected_arrival_time")
    private LocalTime expectedArrivalTime;
    
    @Column(name = "late_minutes")
    private Integer lateMinutes;
    
    @Column(name = "is_late_forgiven")
    @Builder.Default
    private Boolean isLateForgiven = false;
    
    @Column(name = "worked_hours", precision = 5, scale = 2)
    private BigDecimal workedHours;
    
    @Column(name = "expected_hours", precision = 5, scale = 2)
    private BigDecimal expectedHours;
    
    @Column(name = "overtime_hours", precision = 5, scale = 2)
    private BigDecimal overtimeHours;
    
    @Column(name = "leave_type", length = 50)
    private String leaveType;
    
    @Column(name = "is_excused_absence")
    @Builder.Default
    private Boolean isExcusedAbsence = false;
    
    @Column(name = "notes", length = 500)
    private String notes;

// ⭐ NEW FIELDS - Add these to track payment status of public holidays

    /**
     * Whether this public holiday is PAID or UNPAID
     * - TRUE: Employee gets paid for this day (counts as working day)
     * - FALSE: Employee doesn't get paid (counts as OFF day)
     * - NULL: Not a public holiday
     */
    @Column(name = "public_holiday_paid")
    private Boolean publicHolidayPaid;

    /**
     * Name of the public holiday (for reference and reporting)
     */
    @Column(name = "public_holiday_name", length = 200)
    private String publicHolidayName;


    public boolean isPaidPublicHoliday() {
        return Boolean.TRUE.equals(isPublicHoliday) &&
                Boolean.TRUE.equals(publicHolidayPaid);
    }

    /**
     * Check if this day is an UNPAID public holiday
     */
    public boolean isUnpaidPublicHoliday() {
        return Boolean.TRUE.equals(isPublicHoliday) &&
                !Boolean.TRUE.equals(publicHolidayPaid);
    }

    /**
     * Check if this day counts as a working day for payroll purposes
     * Working days include:
     * - PRESENT status
     * - LATE status
     * - HALF_DAY status
     * - PAID public holidays (employee gets paid even though they didn't work)
     */
    public boolean countsAsWorkingDay() {
        // If it's a PAID public holiday, it counts as working day
        if (isPaidPublicHoliday()) {
            return true;
        }

        // Otherwise, check the status
        return status == com.example.backend.models.hr.Attendance.AttendanceStatus.PRESENT ||
                status == com.example.backend.models.hr.Attendance.AttendanceStatus.LATE ||
                status == com.example.backend.models.hr.Attendance.AttendanceStatus.HALF_DAY;
    }

    /**
     * Check if this day should be counted as OFF (no payment)
     * OFF days include:
     * - Weekends
     * - UNPAID public holidays
     * - Days with OFF status
     */
    public boolean isOffDay() {
        // UNPAID public holidays are OFF days
        if (isUnpaidPublicHoliday()) {
            return true;
        }

        return status == com.example.backend.models.hr.Attendance.AttendanceStatus.OFF ||
                dayType == com.example.backend.models.hr.Attendance.DayType.WEEKEND;
    }

}