package com.example.backend.services.finance.generalLedger;

import com.example.backend.dto.finance.generalLedger.AuditLogResponseDTO;
import com.example.backend.models.finance.generalLedger.AuditAction;
import com.example.backend.models.finance.generalLedger.AuditLog;
import com.example.backend.models.user.User;
import com.example.backend.repositories.finance.generalLedger.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void logEvent(String entityType, UUID entityId, AuditAction action,
                         Map<String, Object> changes, User user) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setEntityType(entityType);
            auditLog.setEntityId(entityId);
            auditLog.setAction(action);
            auditLog.setUser(user);

            // Convert changes to JSON string
            if (changes != null) {
                auditLog.setChanges(objectMapper.writeValueAsString(changes));
            }

            // Get HTTP request details if available
            try {
                ServletRequestAttributes attributes =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    auditLog.setIpAddress(request.getRemoteAddr());
                    auditLog.setUserAgent(request.getHeader("User-Agent"));
                }
            } catch (Exception e) {
                // Ignore if request context is not available
            }

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // Log the error but don't fail the operation
            System.err.println("Failed to log audit event: " + e.getMessage());
        }
    }

    /**
     * Retrieves all audit logs without pagination
     */
    public List<AuditLogResponseDTO> getAllAuditLogs() {
        List<AuditLog> logs = auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
        return logs.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves paginated audit logs
     *
     * @param page Page number (0-based)
     * @param size Page size
     * @return Page of audit logs
     */
    public Page<AuditLogResponseDTO> getAllAuditLogsPaginated(int page, int size) {
        // Create Pageable object for pagination
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());

        // Fetch paginated audit logs
        Page<AuditLog> auditLogPage = auditLogRepository.findAll(pageable);

        // Convert to DTO page
        return auditLogPage.map(this::mapToDTO);
    }

    public List<AuditLogResponseDTO> getAuditLogsByEntity(String entityType, UUID entityId) {
        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId);
        return logs.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<AuditLogResponseDTO> getAuditLogsByUser(UUID userId) {
        List<AuditLog> logs = auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
        return logs.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<AuditLogResponseDTO> getAuditLogsByDateRange(
            LocalDateTime startDate, LocalDateTime endDate) {
        List<AuditLog> logs = auditLogRepository.findByTimestampBetweenOrderByTimestampDesc(
                startDate, endDate);
        return logs.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<AuditLogResponseDTO> getAuditLogsByEntityType(String entityType) {
        List<AuditLog> logs = auditLogRepository.findByEntityTypeOrderByTimestampDesc(entityType);
        return logs.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private AuditLogResponseDTO mapToDTO(AuditLog auditLog) {
        AuditLogResponseDTO dto = new AuditLogResponseDTO();
        dto.setId(auditLog.getId());
        dto.setEntityType(auditLog.getEntityType());
        dto.setEntityId(auditLog.getEntityId());
        dto.setAction(auditLog.getAction().toString());
        dto.setChanges(auditLog.getChanges());

        if (auditLog.getUser() != null) {
            dto.setUsername(auditLog.getUser().getUsername());
        }

        dto.setTimestamp(auditLog.getTimestamp());
        dto.setIpAddress(auditLog.getIpAddress());
        dto.setUserAgent(auditLog.getUserAgent());

        return dto;
    }
}