package com.example.backend.controllers.finance.generalLedger;

import com.example.backend.dto.finance.generalLedger.AuditLogResponseDTO;
import com.example.backend.services.finance.generalLedger.AuditService;
import com.example.backend.utils.ExportUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditController {

    private final AuditService auditService;
    private final ExportUtil exportUtil;

    @Autowired
    public AuditController(AuditService auditService, ExportUtil exportUtil) {
        this.auditService = auditService;
        this.exportUtil = exportUtil;
    }

    // Add this new endpoint to get all audit logs
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        // Get paginated audit logs
        Page<AuditLogResponseDTO> pageResult = auditService.getAllAuditLogsPaginated(page, size);

        // Prepare the response with pagination metadata
        Map<String, Object> response = new HashMap<>();
        response.put("content", pageResult.getContent());
        response.put("currentPage", pageResult.getNumber());
        response.put("totalItems", pageResult.getTotalElements());
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        List<AuditLogResponseDTO> logs = auditService.getAuditLogsByEntity(entityType, entityId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByUser(
            @PathVariable UUID userId) {
        List<AuditLogResponseDTO> logs = auditService.getAuditLogsByUser(userId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<AuditLogResponseDTO> logs = auditService.getAuditLogsByDateRange(startDate, endDate);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/entity-type/{entityType}")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByEntityType(
            @PathVariable String entityType) {
        List<AuditLogResponseDTO> logs = auditService.getAuditLogsByEntityType(entityType);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        try {
            List<AuditLogResponseDTO> logs;

            if (entityType != null && entityId != null) {
                logs = auditService.getAuditLogsByEntity(entityType, entityId);
            } else if (userId != null) {
                logs = auditService.getAuditLogsByUser(userId);
            } else if (startDate != null && endDate != null) {
                logs = auditService.getAuditLogsByDateRange(startDate, endDate);
            } else if (entityType != null) {
                logs = auditService.getAuditLogsByEntityType(entityType);
            } else {
                // Changed to get all logs instead of just 30 days
                logs = auditService.getAllAuditLogs();
            }

            // Use the Excel export method
            byte[] excelData = exportUtil.exportAuditLogsToExcel(logs);

            // Return with Excel content type and .xlsx extension
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"audit_logs.xlsx\"")
                    // Use modern Excel content type (Office 2007+)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelData.length)
                    .body(excelData);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}