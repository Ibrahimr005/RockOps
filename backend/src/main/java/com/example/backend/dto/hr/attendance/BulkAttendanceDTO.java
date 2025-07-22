package com.example.backend.dto.hr.attendance;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
// DTO for bulk attendance operations
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAttendanceDTO {
    private LocalDate date;
    private UUID siteId;
    private List<AttendanceRequestDTO> attendanceRecords;
}