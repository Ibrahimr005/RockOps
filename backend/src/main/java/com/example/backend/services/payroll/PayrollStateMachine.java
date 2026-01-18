package com.example.backend.services.payroll;

import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * State machine for managing payroll lifecycle transitions
 * Enforces sequential state progression through the 6-phase workflow
 */
@Service
@Slf4j
public class PayrollStateMachine {
    
    /**
     * Validate if transition is allowed
     */
    public void validateTransition(PayrollStatus currentStatus, PayrollStatus targetStatus) {
        if (currentStatus == targetStatus) {
            throw new IllegalStateTransitionException(
                "Payroll is already in status: " + currentStatus.getDisplayName()
            );
        }
        
        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new IllegalStateTransitionException(
                String.format("Cannot transition from %s to %s. Expected next status: %s",
                    currentStatus.getDisplayName(),
                    targetStatus.getDisplayName(),
                    currentStatus.next().getDisplayName())
            );
        }
    }
    
    /**
     * Check if payroll can transition to target status
     */
    public boolean canTransition(Payroll payroll, PayrollStatus targetStatus) {
        try {
            validateTransition(payroll.getStatus(), targetStatus);
            return true;
        } catch (IllegalStateTransitionException e) {
            return false;
        }
    }
    
    /**
     * Transition payroll to next status
     */
    public void transitionToNext(Payroll payroll, String username) {
        PayrollStatus currentStatus = payroll.getStatus();
        PayrollStatus nextStatus = currentStatus.next();
        
        log.info("Transitioning payroll {} from {} to {} by user {}",
                 payroll.getId(), currentStatus, nextStatus, username);
        
        // Validate transition
        validateTransition(currentStatus, nextStatus);
        
        // Update status
        payroll.setStatus(nextStatus);
        
        // Update audit fields based on status
        updateAuditFields(payroll, nextStatus, username);
        
        log.info("Payroll {} successfully transitioned to {}", payroll.getId(), nextStatus);
    }
    
    /**
     * Transition payroll to specific status (with validation)
     */
    public void transitionTo(Payroll payroll, PayrollStatus targetStatus, String username) {
        PayrollStatus currentStatus = payroll.getStatus();
        
        log.info("Attempting to transition payroll {} from {} to {} by user {}",
                 payroll.getId(), currentStatus, targetStatus, username);
        
        // Validate transition
        validateTransition(currentStatus, targetStatus);
        
        // Update status
        payroll.setStatus(targetStatus);
        
        // Update audit fields based on status
        updateAuditFields(payroll, targetStatus, username);
        
        log.info("Payroll {} successfully transitioned to {}", payroll.getId(), targetStatus);
    }
    
    /**
     * Update audit fields based on status
     */
    private void updateAuditFields(Payroll payroll, PayrollStatus newStatus, String username) {
        LocalDateTime now = LocalDateTime.now();
        
        switch (newStatus) {
            case CONFIRMED_AND_LOCKED:
                // Lock the payroll
                payroll.setLockedAt(now);
                payroll.setLockedBy(username);
                log.info("Payroll {} locked by {} at {}", payroll.getId(), username, now);
                break;
                
            case PAID:
                // Mark as paid
                payroll.setPaidAt(now);
                payroll.setPaidBy(username);
                log.info("Payroll {} marked as paid by {} at {}", payroll.getId(), username, now);
                break;
                
            default:
                // No special audit fields for other statuses
                break;
        }
    }
    
    /**
     * Check if payroll is locked (cannot be modified)
     */
    public void validateNotLocked(Payroll payroll) {
        if (payroll.isLocked()) {
            throw new PayrollLockedException(
                String.format("Payroll for period %s to %s is locked and cannot be modified. " +
                              "Locked by %s at %s",
                    payroll.getStartDate(),
                    payroll.getEndDate(),
                    payroll.getLockedBy(),
                    payroll.getLockedAt())
            );
        }
    }
    
    /**
     * Check if payroll is paid (cannot be deleted)
     */
    public void validateNotPaid(Payroll payroll) {
        if (payroll.isPaid()) {
            throw new PayrollLockedException(
                String.format("Payroll for period %s to %s has been paid and cannot be deleted. " +
                              "Paid by %s at %s",
                    payroll.getStartDate(),
                    payroll.getEndDate(),
                    payroll.getPaidBy(),
                    payroll.getPaidAt())
            );
        }
    }
    
    /**
     * Validate payroll is in expected status
     */
    public void validateStatus(Payroll payroll, PayrollStatus expectedStatus) {
        if (payroll.getStatus() != expectedStatus) {
            throw new InvalidPayrollStatusException(
                String.format("Expected payroll status %s but found %s",
                    expectedStatus.getDisplayName(),
                    payroll.getStatus().getDisplayName())
            );
        }
    }
    
    /**
     * Validate payroll is in one of the expected statuses
     */
    public void validateStatusIn(Payroll payroll, PayrollStatus... expectedStatuses) {
        for (PayrollStatus status : expectedStatuses) {
            if (payroll.getStatus() == status) {
                return;
            }
        }
        
        throw new InvalidPayrollStatusException(
            String.format("Payroll status %s is not valid for this operation",
                payroll.getStatus().getDisplayName())
        );
    }
    
    /**
     * Get next allowed status
     */
    public PayrollStatus getNextStatus(Payroll payroll) {
        return payroll.getStatus().next();
    }
    
    /**
     * Check if payroll is in final status (PAID)
     */
    public boolean isFinalStatus(Payroll payroll) {
        return payroll.getStatus() == PayrollStatus.PAID;
    }
    
    // Custom Exceptions
    
    public static class IllegalStateTransitionException extends RuntimeException {
        public IllegalStateTransitionException(String message) {
            super(message);
        }
    }
    
    public static class PayrollLockedException extends RuntimeException {
        public PayrollLockedException(String message) {
            super(message);
        }
    }
    
    public static class InvalidPayrollStatusException extends RuntimeException {
        public InvalidPayrollStatusException(String message) {
            super(message);
        }
    }
}