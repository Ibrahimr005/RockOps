package com.example.backend.models.equipment;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.example.backend.models.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sarky Log Range model for tracking equipment work over date ranges.
 * 
 * @deprecated This model is deprecated in favor of using multiple individual SarkyLog entries.
 * The new approach allows for better flexibility and simpler data modeling.
 * Use multiple SarkyLog entries for the same date instead of SarkyLogRange with WorkEntry.
 * 
 * This model is kept for backward compatibility with existing data.
 */
@Entity
@Table(name = "sarky_log_ranges")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SarkyLogRange {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @OneToMany(mappedBy = "sarkyLogRange", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkEntry> workEntries = new ArrayList<>();

    @Column(name = "file_url", length = 1000)
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

    // Helper method to add work entry
    public void addWorkEntry(WorkEntry workEntry) {
        workEntries.add(workEntry);
        workEntry.setSarkyLogRange(this);
    }

    // Helper method to remove work entry
    public void removeWorkEntry(WorkEntry workEntry) {
        workEntries.remove(workEntry);
        workEntry.setSarkyLogRange(null);
    }

}