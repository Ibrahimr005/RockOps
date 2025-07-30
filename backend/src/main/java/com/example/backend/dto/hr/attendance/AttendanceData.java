package com.example.backend.dto.hr.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * AttendanceData class to hold attendance information for payroll calculation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceData {
    private int daysWorked;
    private int daysAbsent;
    private int totalWorkingDays;
    private BigDecimal overtimeHours;
    private BigDecimal totalHours;
    private int lateDays;
}