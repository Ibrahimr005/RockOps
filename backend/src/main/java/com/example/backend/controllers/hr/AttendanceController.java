package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.*;
import com.example.backend.dto.hr.attendance.AttendanceRequestDTO;
import com.example.backend.dto.hr.attendance.AttendanceResponseDTO;
import com.example.backend.dto.hr.attendance.BulkAttendanceDTO;
import com.example.backend.services.hr.AttendanceService;
import com.example.backend.models.hr.Attendance;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class AttendanceController {

    private final AttendanceService attendanceService;

    /**
     * Get attendance by date and site
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SITE_ADMIN')")
    public ResponseEntity<List<EmployeeMonthlyAttendanceDTO>> getAttendance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam UUID siteId) {

        log.info("Fetching attendance for site: {} on date: {}", siteId, date);
        // For daily view, we can use the monthly endpoint with the same month
        List<EmployeeMonthlyAttendanceDTO> attendance = attendanceService.getMonthlyAttendance(
                siteId, date.getYear(), date.getMonthValue()
        );
        return ResponseEntity.ok(attendance);
    }

    /**
     * Get monthly attendance sheet
     */
    @GetMapping("/monthly")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SITE_ADMIN')")
    public ResponseEntity<List<EmployeeMonthlyAttendanceDTO>> getMonthlyAttendance(
            @RequestParam UUID siteId,
            @RequestParam int year,
            @RequestParam int month) {

        log.info("Fetching monthly attendance for site: {} for {}/{}", siteId, month, year);
        List<EmployeeMonthlyAttendanceDTO> monthlyAttendance = attendanceService.getMonthlyAttendance(siteId, year, month);
        return ResponseEntity.ok(monthlyAttendance);
    }

    /**
     * Update single attendance record
     */
    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SITE_ADMIN')")
    public ResponseEntity<?> updateAttendance(@RequestBody AttendanceRequestDTO requestDTO) {
        try {
            log.info("Updating attendance for employee: {} on date: {}", requestDTO.getEmployeeId(), requestDTO.getDate());
            AttendanceResponseDTO response = attendanceService.updateAttendance(requestDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating attendance: ", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Bulk save attendance
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SITE_ADMIN')")
    public ResponseEntity<?> bulkSaveAttendance(@RequestBody BulkAttendanceDTO bulkDTO) {
        try {
            log.info("Bulk saving attendance for {} employees", bulkDTO.getAttendanceRecords().size());
            List<AttendanceResponseDTO> responses = attendanceService.bulkUpdateAttendance(bulkDTO);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "processed", responses.size(),
                    "records", responses
            ));
        } catch (Exception e) {
            log.error("Error in bulk save: ", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get attendance summary
     */
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'SITE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAttendanceSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam UUID siteId) {

        log.info("Fetching attendance summary for site: {} on date: {}", siteId, date);
        // For now, return a simple summary based on monthly data
        List<EmployeeMonthlyAttendanceDTO> monthlyData = attendanceService.getMonthlyAttendance(
                siteId, date.getYear(), date.getMonthValue()
        );

        // Calculate summary
        int totalEmployees = monthlyData.size();
        int totalPresent = monthlyData.stream()
                .mapToInt(EmployeeMonthlyAttendanceDTO::getPresentDays)
                .sum();
        int totalAbsent = monthlyData.stream()
                .mapToInt(EmployeeMonthlyAttendanceDTO::getAbsentDays)
                .sum();
        double totalHours = monthlyData.stream()
                .mapToDouble(EmployeeMonthlyAttendanceDTO::getTotalHours)
                .sum();

        Map<String, Object> summary = Map.of(
                "totalEmployees", totalEmployees,
                "totalPresent", totalPresent,
                "totalAbsent", totalAbsent,
                "totalHours", totalHours,
                "date", date,
                "siteId", siteId
        );

        return ResponseEntity.ok(summary);
    }

    /**
     * Get employee attendance history
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<List<Attendance>> getEmployeeAttendance(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.info("Fetching attendance for employee: {} from {} to {}", employeeId, startDate, endDate);
        List<Attendance> attendance = attendanceService.getEmployeeAttendanceHistory(employeeId, startDate, endDate);
        return ResponseEntity.ok(attendance);
    }

    /**
     * Get employee monthly attendance
     */
    @GetMapping("/employee/{employeeId}/monthly")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<List<AttendanceResponseDTO>> getEmployeeMonthlyAttendance(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {

        log.info("Fetching monthly attendance for employee: {} for {}/{}", employeeId, month, year);
        List<AttendanceResponseDTO> attendance = attendanceService.getEmployeeMonthlyAttendance(employeeId, year, month);
        return ResponseEntity.ok(attendance);
    }

    /**
     * Delete attendance record
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> deleteAttendance(@PathVariable UUID id) {
        try {
            log.info("Deleting attendance record: {}", id);
            attendanceService.deleteAttendance(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Attendance record deleted"));
        } catch (Exception e) {
            log.error("Error deleting attendance: ", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Check if API is working
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "service", "Attendance API",
                "timestamp", LocalDate.now().toString()
        ));
    }
}