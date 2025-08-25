package com.example.backend.dto.hr.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

// Updated request DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRequestDTO {
    private UUID employeeId;
    private LocalDate date;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private Double hoursWorked;
    private String status;
    private String notes;
    private Double overtimeHours;
    private String leaveType;
    private Boolean leaveApproved;
}