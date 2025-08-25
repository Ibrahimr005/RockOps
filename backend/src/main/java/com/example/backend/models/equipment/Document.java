package com.example.backend.models.equipment;

import com.example.backend.models.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Entity type (Equipment, Site, Warehouse, etc.)
    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    private EntityType entityType;

    // Reference to the entity (UUID of equipment, site, warehouse, etc.)
    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    @Column(name = "upload_date", nullable = false)
    private LocalDate uploadDate;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_url", length = 1000)
    private String fileUrl;

    @ManyToOne
    @JoinColumn(name = "uploaded_by_user_id", referencedColumnName = "id")
    private User uploadedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Sarky-specific fields for monthly document filtering
    @Column(name = "sarky_month")
    private Integer sarkyMonth;

    @Column(name = "sarky_year")
    private Integer sarkyYear;

    @Column(name = "is_sarky_document", nullable = false)
    private Boolean isSarkyDocument = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (uploadDate == null) {
            uploadDate = LocalDate.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Enum to represent different entity types
    public enum EntityType {
        EQUIPMENT,
        SITE,
        WAREHOUSE,
        EMPLOYEE,
        VEHICLE,
        PROJECT
        // Add more entity types as needed
    }
}