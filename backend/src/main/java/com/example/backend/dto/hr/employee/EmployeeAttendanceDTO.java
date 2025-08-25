package com.example.backend.dto.hr.employee;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.UUID;
// DTO for employee attendance status on a specific date
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAttendanceDTO {
    private UUID employeeId;
    private String employeeName;
    private String employeePhoto;
    private String jobPosition;
    private String department;
    private String contractType;
    private UUID siteId;
    private String siteName;
    
    // Attendance data
    private UUID attendanceId;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private Double hoursWorked;
    private Double overtimeHours;
    private Boolean isPresent;
    private String status;
    private String notes;
    private boolean hasAttendance;
}
