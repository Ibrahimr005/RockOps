package com.example.backend.dto.hr;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
// Response DTO for attendance records
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceResponseDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeePhoto;
    private String jobPosition;
    private String department;
    private String contractType;
    private LocalDate date;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private Double hoursWorked;
    private Double overtimeHours;
    private Boolean isPresent;
    private String status;
    private String notes;
    private String checkInLocation;
    private String checkOutLocation;
    private Double totalHours;
}