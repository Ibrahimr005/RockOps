package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Candidate {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String email;

    private String phoneNumber;

    private String country;

    @Column(length = 1024)
    private String resumeUrl;

    // Current job title
    private String currentPosition;

    // Current company
    private String currentCompany;

    // Application date
    private LocalDate applicationDate;

    // Notes about candidate
    @Column(length = 1000)
    private String notes;

    // New fields for candidate status management
    @Enumerated(EnumType.STRING)
    @Column(name = "candidate_status")
    @Builder.Default
    private CandidateStatus candidateStatus = CandidateStatus.APPLIED;

    @Column(name = "hired_date")
    private LocalDate hiredDate;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    // The vacancy this candidate applied for
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vacancy_id")
    @JsonBackReference("vacancy-candidates")
    private Vacancy vacancy;

    // Enum for candidate status
    public enum CandidateStatus {
        APPLIED,        // Initial application
        UNDER_REVIEW,   // Being reviewed by HR
        INTERVIEWED,    // Completed interview
        HIRED,          // Successfully hired
        REJECTED,       // Application rejected
        POTENTIAL,      // Moved to potential list (vacancy full)
        WITHDRAWN,
        PENDING_HIRE// Candidate withdrew application
    }

    // Helper methods
    public String getFullName() {
        return firstName + " " + lastName;
    }

    public boolean isHired() {
        return CandidateStatus.HIRED.equals(candidateStatus);
    }

    public boolean isPotential() {
        return CandidateStatus.POTENTIAL.equals(candidateStatus);
    }

    public boolean isActive() {
        return candidateStatus != null &&
                !CandidateStatus.HIRED.equals(candidateStatus) &&
                !CandidateStatus.REJECTED.equals(candidateStatus) &&
                !CandidateStatus.WITHDRAWN.equals(candidateStatus);
    }
}