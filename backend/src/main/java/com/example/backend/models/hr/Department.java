package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "departments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"jobPositions"}) // Exclude to prevent circular references
@ToString(exclude = {"jobPositions"}) // Exclude to prevent circular references
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "department_number", unique = true, length = 20)
    private String departmentNumber;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference // Prevents infinite recursion in JSON serialization
    @Builder.Default
    private List<JobPosition> jobPositions = new ArrayList<>();



    public void removeJobPosition(JobPosition jobPosition) {
        if (jobPositions != null) {
            jobPositions.remove(jobPosition);
            jobPosition.setDepartment(null);
        }
    }

    public int getJobPositionCount() {
        return jobPositions != null ? jobPositions.size() : 0;
    }

    // Pre-persist method to ensure data integrity
    @PrePersist
    @PreUpdate
    private void validateData() {
        if (name != null) {
            name = name.trim();
        }
        if (description != null) {
            description = description.trim();
            if (description.isEmpty()) {
                description = null;
            }
        }
    }
}