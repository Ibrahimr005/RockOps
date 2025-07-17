package com.example.backend.dto.warehouse;

import java.time.LocalDateTime;
import java.util.UUID;

public class WarehouseAssignmentDTO {
    private UUID assignmentId;
    private UUID userId;
    private String firstName;
    private String lastName;
    private String username;
    private String role;
    private LocalDateTime assignedAt;
    private String assignedBy;

    // Default constructor
    public WarehouseAssignmentDTO() {}

    // Constructor with all fields
    public WarehouseAssignmentDTO(UUID assignmentId, UUID userId, String firstName, String lastName,
                                  String username, String role, LocalDateTime assignedAt, String assignedBy) {
        this.assignmentId = assignmentId;
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.role = role;
        this.assignedAt = assignedAt;
        this.assignedBy = assignedBy;
    }

    // Getters and Setters
    public UUID getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(UUID assignmentId) {
        this.assignmentId = assignmentId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }

    public String getAssignedBy() {
        return assignedBy;
    }

    public void setAssignedBy(String assignedBy) {
        this.assignedBy = assignedBy;
    }
}