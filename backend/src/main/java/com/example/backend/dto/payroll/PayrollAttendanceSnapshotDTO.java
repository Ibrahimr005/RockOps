package com.example.backend.dto.payroll;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class PayrollAttendanceSnapshotDTO {
    private String id;
    private LocalDate attendanceDate;
    private Boolean isPublicHoliday;
    private Boolean isWeekend;
    private String status;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private BigDecimal workedHours;
    private BigDecimal overtimeHours;
    private Integer lateMinutes;
    private String notes;
}