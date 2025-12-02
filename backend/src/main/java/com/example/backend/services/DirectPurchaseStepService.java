package com.example.backend.services;

import com.example.backend.dtos.CompleteDirectPurchaseStepDto;
import com.example.backend.dtos.DirectPurchaseStepDto;
import com.example.backend.dtos.UpdateDirectPurchaseStepDto;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.maintenance.DirectPurchaseStep;
import com.example.backend.models.maintenance.DirectPurchaseStepStatus;
import com.example.backend.models.maintenance.DirectPurchaseTicket;
import com.example.backend.repositories.DirectPurchaseStepRepository;
import com.example.backend.repositories.DirectPurchaseTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DirectPurchaseStepService {

    private final DirectPurchaseStepRepository stepRepository;
    private final DirectPurchaseTicketRepository ticketRepository;
    private final DirectPurchaseTicketService ticketService;
    private final com.example.backend.services.notification.NotificationService notificationService;

    // Get step by ID
    public DirectPurchaseStepDto getStepById(UUID stepId) {
        DirectPurchaseStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Direct purchase step not found with id: " + stepId));
        return convertToDto(step);
    }

    // Get steps by ticket
    public List<DirectPurchaseStepDto> getStepsByTicket(UUID ticketId) {
        return stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(ticketId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Update step
    public DirectPurchaseStepDto updateStep(UUID ticketId, UUID stepId, UpdateDirectPurchaseStepDto dto) {
        DirectPurchaseStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Direct purchase step not found with id: " + stepId));

        // Verify step belongs to ticket
        if (!step.getDirectPurchaseTicket().getId().equals(ticketId)) {
            throw new MaintenanceException("Step does not belong to the specified ticket");
        }

        // Update fields if provided
        if (dto.getStatus() != null) {
            step.setStatus(dto.getStatus());
        }

        if (dto.getResponsiblePerson() != null) {
            step.setResponsiblePerson(dto.getResponsiblePerson());
        }

        if (dto.getPhoneNumber() != null) {
            step.setPhoneNumber(dto.getPhoneNumber());
        }

        if (dto.getStartDate() != null) {
            step.setStartDate(dto.getStartDate());
        }

        if (dto.getExpectedEndDate() != null) {
            step.setExpectedEndDate(dto.getExpectedEndDate());
        }

        if (dto.getActualEndDate() != null) {
            step.setActualEndDate(dto.getActualEndDate());
        }

        if (dto.getExpectedCost() != null) {
            step.setExpectedCost(dto.getExpectedCost());
        }

        if (dto.getAdvancedPayment() != null) {
            // Validate advanced payment <= actual cost if actual cost is set
            if (step.getActualCost() != null && dto.getAdvancedPayment().compareTo(step.getActualCost()) > 0) {
                throw new MaintenanceException("Advanced payment cannot exceed actual cost");
            }
            step.setAdvancedPayment(dto.getAdvancedPayment());
        }

        if (dto.getActualCost() != null) {
            // Validate actual cost >= advanced payment if advanced payment is set
            BigDecimal advancedPayment = dto.getAdvancedPayment() != null ? dto.getAdvancedPayment() : step.getAdvancedPayment();
            if (advancedPayment != null && dto.getActualCost().compareTo(advancedPayment) < 0) {
                throw new MaintenanceException("Actual cost cannot be less than advanced payment");
            }
            step.setActualCost(dto.getActualCost());
        }

        if (dto.getDescription() != null) {
            step.setDescription(dto.getDescription());
        }

        if (dto.getLastChecked() != null) {
            step.setLastChecked(dto.getLastChecked());
        }

        DirectPurchaseStep savedStep = stepRepository.save(step);
        log.info("Updated direct purchase step: {}", stepId);

        // Send notification for step update
        try {
            String notificationTitle = "Direct Purchase Step Updated";
            String notificationMessage = String.format("Step '%s' has been updated for direct purchase ticket",
                    savedStep.getStepName());
            String actionUrl = "/maintenance/direct-purchase/" + ticketId;
            String relatedEntity = "DirectPurchaseStep:" + stepId;

            notificationService.sendNotificationToEquipmentUsers(
                    notificationTitle,
                    notificationMessage,
                    com.example.backend.models.notification.NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );
        } catch (Exception e) {
            log.error("❌ Failed to send notification for step update", e);
        }

        // Check if ticket should be auto-completed
        ticketService.checkAndCompleteTicket(ticketId);

        return convertToDto(savedStep);
    }

    // Complete step
    public DirectPurchaseStepDto completeStep(UUID ticketId, UUID stepId, CompleteDirectPurchaseStepDto dto) {
        DirectPurchaseStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Direct purchase step not found with id: " + stepId));

        // Verify step belongs to ticket
        if (!step.getDirectPurchaseTicket().getId().equals(ticketId)) {
            throw new MaintenanceException("Step does not belong to the specified ticket");
        }

        // Validate actual cost > 0
        if (dto.getActualCost() == null || dto.getActualCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new MaintenanceException("Actual cost must be greater than 0");
        }

        // Validate advanced payment <= actual cost
        BigDecimal advancedPayment = dto.getAdvancedPayment() != null ? dto.getAdvancedPayment() : BigDecimal.ZERO;
        if (advancedPayment.compareTo(dto.getActualCost()) > 0) {
            throw new MaintenanceException("Advanced payment cannot exceed actual cost");
        }

        // Update step
        step.setStatus(DirectPurchaseStepStatus.COMPLETED);
        step.setActualEndDate(dto.getActualEndDate());
        step.setActualCost(dto.getActualCost());
        step.setAdvancedPayment(advancedPayment);
        step.setLastChecked(LocalDateTime.now());

        DirectPurchaseStep savedStep = stepRepository.save(step);
        log.info("Completed direct purchase step: {}", stepId);

        // Send notification for step completion
        try {
            String notificationTitle = "Direct Purchase Step Completed";
            String notificationMessage = String.format("Step '%s' has been completed. Actual cost: $%.2f",
                    savedStep.getStepName(), savedStep.getActualCost());
            String actionUrl = "/maintenance/direct-purchase/" + ticketId;
            String relatedEntity = "DirectPurchaseStep:" + stepId;

            notificationService.sendNotificationToEquipmentUsers(
                    notificationTitle,
                    notificationMessage,
                    com.example.backend.models.notification.NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );
        } catch (Exception e) {
            log.error("❌ Failed to send notification for step completion", e);
        }

        // Check if ticket should be auto-completed
        ticketService.checkAndCompleteTicket(ticketId);

        return convertToDto(savedStep);
    }

    // Delete step (only if no steps have been completed yet)
    public void deleteStep(UUID ticketId, UUID stepId) {
        DirectPurchaseStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Direct purchase step not found with id: " + stepId));

        // Verify step belongs to ticket
        if (!step.getDirectPurchaseTicket().getId().equals(ticketId)) {
            throw new MaintenanceException("Step does not belong to the specified ticket");
        }

        // Prevent deletion if step is completed
        if (step.getStatus() == DirectPurchaseStepStatus.COMPLETED) {
            throw new MaintenanceException("Cannot delete completed step");
        }

        String stepName = step.getStepName(); // Store for notification before deletion

        stepRepository.delete(step);
        log.info("Deleted direct purchase step: {}", stepId);

        // Send notification for step deletion
        try {
            DirectPurchaseTicket ticket = step.getDirectPurchaseTicket();
            String notificationTitle = "Direct Purchase Step Deleted";
            String notificationMessage = String.format("Step '%s' has been deleted from direct purchase ticket for %s",
                    stepName, ticket.getEquipment().getName());
            String actionUrl = "/maintenance/direct-purchase/" + ticketId;
            String relatedEntity = "DirectPurchaseTicket:" + ticketId;

            notificationService.sendNotificationToEquipmentUsers(
                    notificationTitle,
                    notificationMessage,
                    com.example.backend.models.notification.NotificationType.WARNING,
                    actionUrl,
                    relatedEntity
            );
            log.info("✅ Notification sent for deleted step: {}", stepId);
        } catch (Exception e) {
            log.error("❌ Failed to send notification for step deletion", e);
        }
    }

    // Private helper method
    private DirectPurchaseStepDto convertToDto(DirectPurchaseStep step) {
        return DirectPurchaseStepDto.builder()
                .id(step.getId())
                .directPurchaseTicketId(step.getDirectPurchaseTicket().getId())
                .stepNumber(step.getStepNumber())
                .stepName(step.getStepName())
                .status(step.getStatus())
                .responsiblePerson(step.getResponsiblePerson())
                .phoneNumber(step.getPhoneNumber())
                .startDate(step.getStartDate())
                .expectedEndDate(step.getExpectedEndDate())
                .actualEndDate(step.getActualEndDate())
                .expectedCost(step.getExpectedCost())
                .advancedPayment(step.getAdvancedPayment())
                .actualCost(step.getActualCost())
                .description(step.getDescription())
                .lastChecked(step.getLastChecked())
                .createdAt(step.getCreatedAt())
                .updatedAt(step.getUpdatedAt())
                .version(step.getVersion())
                .remainingCost(step.getRemainingCost())
                .isCompleted(step.isCompleted())
                .isOverdue(step.isOverdue())
                .build();
    }
}
