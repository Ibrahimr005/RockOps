package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.AttendanceDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.AttendanceStatus;
import com.example.backend.services.hr.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    /**
     * Record attendance for any contract type
     */
    @PostMapping("/record")
    public ResponseEntity<AttendanceDTO> recordAttendance(@RequestBody AttendanceDTO attendanceDTO) {
        try {
            AttendanceDTO result = attendanceService.recordAttendance(attendanceDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check in for hourly employees
     */
    @PostMapping("/check-in")
    public ResponseEntity<AttendanceDTO> checkIn(
            @RequestParam UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime checkInTime,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {
        try {
            AttendanceDTO result = attendanceService.checkIn(employeeId, checkInTime, location, latitude, longitude);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    AttendanceDTO.builder()
                            .validationMessage(e.getMessage())
                            .isValidRecord(false)
                            .build()
            );
        }
    }

    /**
     * Check out for hourly employees
     */
    @PostMapping("/check-out")
    public ResponseEntity<AttendanceDTO> checkOut(
            @RequestParam UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime checkOutTime) {
        try {
            AttendanceDTO result = attendanceService.checkOut(employeeId, checkOutTime);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    AttendanceDTO.builder()
                            .validationMessage(e.getMessage())
                            .isValidRecord(false)
                            .build()
            );
        }
    }

    /**
     * Mark daily attendance for daily contract employees
     */
    @PostMapping("/daily")
    public ResponseEntity<AttendanceDTO> markDailyAttendance(
            @RequestParam UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Attendance.DailyAttendanceStatus status,
            @RequestParam(required = false) String notes) {
        try {
            AttendanceDTO result = attendanceService.markDailyAttendance(employeeId, date, status, notes);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    AttendanceDTO.builder()
                            .validationMessage(e.getMessage())
                            .isValidRecord(false)
                            .build()
            );
        }
    }

    /**
     * Generate monthly attendance for monthly contract employees
     */
    @PostMapping("/generate-monthly")
    public ResponseEntity<List<AttendanceDTO>> generateMonthlyAttendance(
            @RequestParam UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            List<AttendanceDTO> result = attendanceService.generateMonthlyAttendance(employeeId, year, month);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get attendance by employee and date range
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AttendanceDTO>> getEmployeeAttendance(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<AttendanceDTO> result = attendanceService.getAttendanceByEmployeeAndDateRange(
                    employeeId, startDate, endDate);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get monthly attendance summary for an employee
     */
    @GetMapping("/employee/{employeeId}/monthly-summary")
    public ResponseEntity<Map<String, Object>> getMonthlyAttendanceSummary(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            Map<String, Object> result = attendanceService.getMonthlyAttendanceSummary(employeeId, year, month);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get daily attendance summary for all employees
     */
    @GetMapping("/daily-summary")
    public ResponseEntity<Map<String, Object>> getDailyAttendanceSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            Map<String, Object> result = attendanceService.getDailyAttendanceSummary(date);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update attendance status (for monthly employees)
     */
    @PutMapping("/{attendanceId}/status")
    public ResponseEntity<AttendanceDTO> updateAttendanceStatus(
            @PathVariable UUID attendanceId,
            @RequestParam AttendanceStatus status) {
        try {
            AttendanceDTO result = attendanceService.updateAttendanceStatus(attendanceId, status);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get attendance statistics for an employee
     */
    @GetMapping("/employee/{employeeId}/statistics")
    public ResponseEntity<Map<String, Object>> getAttendanceStatistics(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            Map<String, Object> result = attendanceService.getAttendanceStatistics(employeeId, startDate, endDate);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Legacy endpoints for backward compatibility
     */
    @GetMapping("/employee/{employeeId}/monthly")
    public ResponseEntity<List<AttendanceDTO>> getMonthlyAttendance(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            LocalDate startDate = LocalDate.of(year, month, 1);
            LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

            List<AttendanceDTO> result = attendanceService.getAttendanceByEmployeeAndDateRange(
                    employeeId, startDate, endDate);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/hourly")
    public ResponseEntity<AttendanceDTO> recordHourlyAttendance(
            @RequestBody Map<String, Object> requestBody) {
        try {
            UUID employeeId = UUID.fromString((String) requestBody.get("employeeId"));
            LocalDate date = LocalDate.parse((String) requestBody.get("date"));
            LocalTime startTime = LocalTime.parse((String) requestBody.get("startTime"));
            LocalTime endTime = LocalTime.parse((String) requestBody.get("endTime"));

            AttendanceDTO attendanceDTO = AttendanceDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .checkInTime(startTime)
                    .checkOutTime(endTime)
                    .contractType(Attendance.ContractType.HOURLY)
                    .build();

            AttendanceDTO result = attendanceService.recordAttendance(attendanceDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/mark-present")
    public ResponseEntity<AttendanceDTO> markPresent(
            @RequestBody Map<String, Object> requestBody) {
        try {
            UUID employeeId = UUID.fromString((String) requestBody.get("employeeId"));
            LocalDate date = LocalDate.parse((String) requestBody.get("date"));

            AttendanceDTO attendanceDTO = AttendanceDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status(AttendanceStatus.PRESENT)
                    .contractType(Attendance.ContractType.MONTHLY)
                    .build();

            AttendanceDTO result = attendanceService.recordAttendance(attendanceDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}