package com.example.backend.controllers;

import com.example.backend.authentication.AuthenticationResponse;
import com.example.backend.authentication.RegisterRequest;
import com.example.backend.dto.user.UserDTO;
import com.example.backend.models.user.Role;
import com.example.backend.services.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    /**
     * Register a new user with a specific role
     */
    @PostMapping("/users")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        try {
            AuthenticationResponse response = adminService.registerUser(request);
            return ResponseEntity.ok(response);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Access Denied", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Registration Failed", e.getMessage()));
        }
    }

    /**
     * Update a user's role
     */
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable UUID userId,
            @RequestBody RoleUpdateRequest roleRequest) {

        try {
            boolean updated = adminService.updateUserRole(userId, roleRequest.getRole());
            return ResponseEntity.ok("User role updated successfully to " + roleRequest.getRole());
        } catch (AdminService.ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("User Not Found", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Access Denied", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Update Failed", e.getMessage()));
        }
    }

    /**
     * Get all users - CHANGED to return List<UserDTO>
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<UserDTO> users = adminService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Access Denied", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Retrieval Failed", e.getMessage()));
        }
    }

    /**
     * Get a specific user by ID - CHANGED to return UserDTO
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable UUID userId) {
        try {
            return adminService.getUserById(userId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (AdminService.ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("User Not Found", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Access Denied", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Retrieval Failed", e.getMessage()));
        }
    }

    /**
     * Get users by role - CHANGED to return List<UserDTO>
     */
    @GetMapping("/users/by-role")
    public ResponseEntity<?> getUsersByRole(@RequestParam Role role) {
        try {
            List<UserDTO> users = adminService.getUsersByRole(role);
            return ResponseEntity.ok(users);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Access Denied", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Retrieval Failed", e.getMessage()));
        }
    }

    /**
     * Delete user - remains the same
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID userId) {
        try {
            adminService.deleteUser(userId);
            return ResponseEntity.ok("User deleted successfully.");
        } catch (AdminService.ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("User Not Found", e.getMessage()));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Access Denied", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Deletion Failed", e.getMessage()));
        }
    }

    /**
     * Request class for role updates
     */
    public static class RoleUpdateRequest {
        private Role role;

        public Role getRole() {
            return role;
        }

        public void setRole(Role role) {
            this.role = role;
        }
    }

    /**
     * Standard error response
     */
    public static class ErrorResponse {
        private final String error;
        private final String message;

        public ErrorResponse(String error, String message) {
            this.error = error;
            this.message = message;
        }

        public String getError() {
            return error;
        }

        public String getMessage() {
            return message;
        }
    }
}