package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"jobPosition", "candidates"})
public class Vacancy {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    private String description;

    private String requirements;

    private String responsibilities;

    private LocalDate postingDate;

    private LocalDate closingDate;

    private String status; // OPEN, CLOSED, FILLED

    private Integer numberOfPositions;

    private String priority; // HIGH, MEDIUM, LOW

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "job_position_id")
    @JsonBackReference("jobposition-vacancies") // This prevents circular reference
    private JobPosition jobPosition;

    @OneToMany(mappedBy = "vacancy", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore // Exclude from JSON to prevent circular references
    @Builder.Default
    private List<Candidate> candidates = new ArrayList<>();

    // New field to track hired candidates count
    @Column(name = "hired_count", nullable = true)
    @Builder.Default
    private Integer hiredCount = 0;

    // Helper methods for position management
    public int getCandidateCount() {
        return candidates != null ? candidates.size() : 0;
    }

    public int getRemainingPositions() {
        int totalPositions = numberOfPositions != null ? numberOfPositions : 1;
        int hired = hiredCount != null ? hiredCount : 0;
        return Math.max(0, totalPositions - hired);
    }

    public boolean isFull() {
        return getRemainingPositions() == 0;
    }

    public boolean hasAvailablePositions() {
        return getRemainingPositions() > 0;
    }

    public void incrementHiredCount() {
        this.hiredCount = (this.hiredCount != null ? this.hiredCount : 0) + 1;

        // Auto-update status if all positions are filled
        if (isFull()) {
            this.status = "FILLED";
        }
    }

    public void decrementHiredCount() {
        this.hiredCount = Math.max(0, (this.hiredCount != null ? this.hiredCount : 0) - 1);

        // Auto-update status if positions become available again
        if (hasAvailablePositions() && "FILLED".equals(this.status)) {
            this.status = "OPEN";
        }
    }

    // Get percentage filled
    public double getFilledPercentage() {
        int totalPositions = numberOfPositions != null ? numberOfPositions : 1;
        int hired = hiredCount != null ? hiredCount : 0;
        return totalPositions > 0 ? (double) hired / totalPositions * 100 : 0;
    }

    // Add getter for hiredCount with null safety
    public Integer getHiredCount() {
        return hiredCount != null ? hiredCount : 0;
    }

    // Helper method to get job position details without circular reference
    @JsonIgnore
    public String getJobPositionName() {
        return jobPosition != null ? jobPosition.getPositionName() : null;
    }

    @JsonIgnore
    public String getDepartmentName() {
        return jobPosition != null && jobPosition.getDepartment() != null
                ? jobPosition.getDepartment().getName() : null;
    }

    @JsonIgnore
    public Double getJobPositionBaseSalary() {
        return jobPosition != null ? jobPosition.getBaseSalary() : null;
    }
}