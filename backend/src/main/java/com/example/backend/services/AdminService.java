package com.example.backend.services;

import com.example.backend.authentication.AuthenticationResponse;
import com.example.backend.authentication.AuthenticationService;
import com.example.backend.authentication.RegisterRequest;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
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
     * Get all users in the system
     */
    public List<User> getAllUsers() {
        checkAdminAccess();
        return userRepository.findAll();
    }

    /**
     * Get user by their ID
     */
    public Optional<User> getUserById(UUID userId) {
        checkAdminAccess();
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }
        return user;
    }

    /**
     * Get users by role
     */
    public List<User> getUsersByRole(Role role) {
        checkAdminAccess();
        return userRepository.findByRole(role);
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
     * @param userId The ID of the user to remove
     * @return true if the user was successfully removed
     * @throws ResourceNotFoundException if user not found
     * @throws AccessDeniedException if caller doesn't have admin rights
     */
    @Transactional
    public boolean removeUser(UUID userId) {
        checkAdminAccess();

        if (!userRepository.existsById(Long.valueOf(userId.toString()))) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }

        userRepository.deleteById(Long.valueOf(userId.toString()));
        return true;
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


    public void deleteUser(UUID userId) throws ResourceNotFoundException {
        // Implement the deletion logic here, e.g.:
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with ID " + userId + " not found"));
        userRepository.delete(user);
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