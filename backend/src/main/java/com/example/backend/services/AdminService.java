package com.example.backend.services;

import com.example.backend.authentication.AuthenticationResponse;
import com.example.backend.authentication.AuthenticationService;
import com.example.backend.authentication.RegisterRequest;
import com.example.backend.dto.user.UserDTO;
import com.example.backend.dto.warehouse.WarehouseDTO;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;

    /**
     * Register a new user with a specific role
     */
    public AuthenticationResponse registerUser(RegisterRequest request) {
        checkAdminAccess();
        return authenticationService.register(request);
    }

    /**
     * Update a user's role
     */
    @Transactional
    public boolean updateUserRole(UUID userId, Role newRole) {
        checkAdminAccess();

        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }

        User user = userOptional.get();
        user.setRole(newRole);
        userRepository.save(user);

        return true;
    }

    /**
     * Get all users in the system - returns DTOs to avoid circular references
     */
    public List<UserDTO> getAllUsers() {
        checkAdminAccess();
        List<User> users = userRepository.findAll();
        return users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get user by their ID - returns DTO
     */
    public Optional<UserDTO> getUserById(UUID userId) {
        checkAdminAccess();
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }
        return user.map(this::convertToDTO);
    }

    /**
     * Get users by role - returns DTOs
     */
    public List<UserDTO> getUsersByRole(Role role) {
        checkAdminAccess();
        List<User> users = userRepository.findByRole(role);
        return users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Check if a username already exists
     */
    public boolean usernameExists(String username) {
        checkAdminAccess();
        return userRepository.findByUsername(username).isPresent();
    }

    /**
     * Remove a user from the system
     */
    @Transactional
    public boolean removeUser(UUID userId) {
        checkAdminAccess();

        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }

        userRepository.deleteById(userId);
        return true;
    }

    /**
     * Delete user method
     */
    public void deleteUser(UUID userId) throws ResourceNotFoundException {
        checkAdminAccess();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with ID " + userId + " not found"));
        userRepository.delete(user);
    }

    /**
     * Convert User entity to UserDTO
     */
    private UserDTO convertToDTO(User user) {
        List<WarehouseDTO> warehouseDTOs = user.getAssignedWarehouses().stream()
                .map(this::convertWarehouseToDTO)
                .collect(Collectors.toList());

        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .enabled(user.isEnabled())
                .assignedWarehouses(warehouseDTOs)
                .build();
    }

    /**
     * Convert Warehouse entity to WarehouseDTO
     */
    private WarehouseDTO convertWarehouseToDTO(Warehouse warehouse) {
        return WarehouseDTO.builder()
                .id(warehouse.getId())
                .name(warehouse.getName())
                .photoUrl(warehouse.getPhotoUrl())
                .site(warehouse.getSite())
                .build();
    }

    /**
     * Helper method to verify admin access
     */
    private void checkAdminAccess() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(Role.ADMIN.name()))) {
            throw new AccessDeniedException("Access denied. Admin role required.");
        }
    }

    /**
     * Custom exception for resource not found
     */
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String message) {
            super(message);
        }
    }
}