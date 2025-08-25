package com.example.backend.dto.hr;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
// DTO for daily attendance in monthly view
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyAttendanceDTO {
    private UUID attendanceId;
    private LocalDate date;
    private String dayOfWeek;
    private String dayType;
    private String status;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private Double hoursWorked;
    private Double expectedHours;
    private Double overtimeHours;
    private String leaveType;
    private String notes;
    private boolean isEditable;
}