package com.example.backend.dto.hr;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
// DTO for employee monthly attendance
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeMonthlyAttendanceDTO {
    private UUID employeeId;
    private String employeeName;
    private String employeePhoto;
    private String jobPosition;
    private String department;
    private String contractType;
    private Integer year;
    private Integer month;
    private List<DailyAttendanceDTO> dailyAttendance;
    
    // Summary statistics
    private Integer totalDays;
    private Integer presentDays;
    private Integer absentDays;
    private Integer leaveDays;
    private Integer offDays;
    private Double totalHours;
    private Double overtimeHours;
    private Double attendancePercentage;
}
