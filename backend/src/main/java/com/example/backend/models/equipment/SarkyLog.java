package com.example.backend.models.equipment;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.example.backend.models.user.User;
import com.example.backend.models.hr.Employee;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sarky_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SarkyLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "equipment_id")
    @JsonManagedReference("equipment-sarkylog")
    private Equipment equipment;

    @ManyToOne
    @JoinColumn(name = "work_type_id", nullable = false)
    private WorkType workType;

    @ManyToOne
    @JoinColumn(name = "driver_id", nullable = false)
    private Employee driver;

    @Column(name = "worked_hours", nullable = false)
    private Double workedHours;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "file_url", length = 1000)  // Increased length to 1000 characters
    private String fileUrl;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Set the document path (maps to fileUrl field for backward compatibility)
     * @param documentPath The document path to set
     */
    public void setDocumentPath(String documentPath) {
        this.fileUrl = documentPath;
    }

    /**
     * Get the document path (maps to fileUrl field for backward compatibility)
     * @return The document path
     */
    public String getDocumentPath() {
        return this.fileUrl;
    }
}