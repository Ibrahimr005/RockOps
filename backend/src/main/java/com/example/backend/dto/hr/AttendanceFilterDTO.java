package com.example.backend.dto.hr;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;
// Filter DTO for querying attendance
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceFilterDTO {
    private UUID siteId;
    private UUID departmentId;
    private LocalDate startDate;
    private LocalDate endDate;
    private String contractType;
    private String status;
    private UUID employeeId;
}