package com.example.backend.models.finance.generalLedger;

import com.example.backend.models.user.User;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Data
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String entityType; // e.g., "JournalEntry", "AccountingPeriod"

    private UUID entityId; // ID of the affected entity

    @Enumerated(EnumType.STRING)
    private AuditAction action; // CREATE, UPDATE, DELETE

    @Column(length = 4000)
    private String changes; // JSON representation of changes

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @CreationTimestamp
    private LocalDateTime timestamp;

    private String ipAddress;

    private String userAgent;
}