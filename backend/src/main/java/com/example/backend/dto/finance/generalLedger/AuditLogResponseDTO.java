package com.example.backend.dto.finance.generalLedger;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AuditLogResponseDTO {
    private UUID id;
    private String entityType;
    private UUID entityId;
    private String action;
    private String changes;
    private String username;
    private LocalDateTime timestamp;
    private String ipAddress;
    private String userAgent;
}