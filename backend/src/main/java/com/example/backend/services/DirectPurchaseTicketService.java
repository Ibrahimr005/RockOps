package com.example.backend.services;

import com.example.backend.dtos.*;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.contact.Contact;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.maintenance.DirectPurchaseStep;
import com.example.backend.models.maintenance.DirectPurchaseStepStatus;
import com.example.backend.models.maintenance.DirectPurchaseTicket;
import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.repositories.ContactRepository;
import com.example.backend.repositories.DirectPurchaseStepRepository;
import com.example.backend.repositories.DirectPurchaseTicketRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DirectPurchaseTicketService {

    private final DirectPurchaseTicketRepository ticketRepository;
    private final DirectPurchaseStepRepository stepRepository;
    private final EquipmentRepository equipmentRepository;
    private final MerchantRepository merchantRepository;
    private final ContactRepository contactRepository;
    private final com.example.backend.services.notification.NotificationService notificationService;

    // Create ticket with auto-generated steps
    public DirectPurchaseTicketDetailsDto createTicket(CreateDirectPurchaseTicketDto dto) {
        log.info("Creating direct purchase ticket for equipment: {}", dto.getEquipmentId());

        // Validate equipment exists
        Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found with id: " + dto.getEquipmentId()));

        // Validate merchant exists
        Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                .orElseThrow(() -> new MaintenanceException("Merchant not found with id: " + dto.getMerchantId()));

        // Validate responsible person exists
        Contact responsiblePerson = contactRepository.findById(dto.getResponsiblePersonId())
                .orElseThrow(() -> new MaintenanceException("Contact not found with id: " + dto.getResponsiblePersonId()));

        // Create ticket
        DirectPurchaseTicket ticket = DirectPurchaseTicket.builder()
                .equipment(equipment)
                .merchant(merchant)
                .responsiblePerson(responsiblePerson)
                .sparePart(dto.getSparePart())
                .expectedPartsCost(dto.getExpectedPartsCost())
                .expectedTransportationCost(dto.getExpectedTransportationCost())
                .description(dto.getDescription())
                .status(DirectPurchaseStatus.IN_PROGRESS)
                .build();

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);

        // Auto-create 2 steps
        createAutoSteps(savedTicket, responsiblePerson);

        log.info("Created direct purchase ticket: {} with 2 auto-generated steps", savedTicket.getId());

        // Send notification to equipment/maintenance users
        try {
            String notificationTitle = "New Direct Purchase Ticket Created";
            String notificationMessage = String.format("Direct purchase ticket created for %s - %s. Spare part: %s",
                    equipment.getName(), equipment.getModel(), dto.getSparePart());
            String actionUrl = "/maintenance/direct-purchase/" + savedTicket.getId();
            String relatedEntity = "DirectPurchaseTicket:" + savedTicket.getId();

            notificationService.sendNotificationToEquipmentUsers(
                    notificationTitle,
                    notificationMessage,
                    com.example.backend.models.notification.NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            log.info("✅ Notification sent for new direct purchase ticket: {}", savedTicket.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send notification for direct purchase ticket creation", e);
        }

        return convertToDetailsDto(savedTicket);
    }

    // Get ticket by ID
    public DirectPurchaseTicketDetailsDto getTicketById(UUID id) {
        DirectPurchaseTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Direct purchase ticket not found with id: " + id));
        return convertToDetailsDto(ticket);
    }

    // Get all tickets
    public List<DirectPurchaseTicketDto> getAllTickets() {
        return ticketRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Get tickets by equipment
    public List<DirectPurchaseTicketDto> getTicketsByEquipment(UUID equipmentId) {
        return ticketRepository.findByEquipmentIdOrderByCreatedAtDesc(equipmentId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Get tickets by merchant
    public List<DirectPurchaseTicketDto> getTicketsByMerchant(UUID merchantId) {
        return ticketRepository.findByMerchantIdOrderByCreatedAtDesc(merchantId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Get tickets by status
    public List<DirectPurchaseTicketDto> getTicketsByStatus(DirectPurchaseStatus status) {
        return ticketRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Update ticket
    public DirectPurchaseTicketDetailsDto updateTicket(UUID id, DirectPurchaseTicketDto dto) {
        DirectPurchaseTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Direct purchase ticket not found with id: " + id));

        // Update fields if provided
        if (dto.getEquipmentId() != null) {
            Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found with id: " + dto.getEquipmentId()));
            ticket.setEquipment(equipment);
        }

        if (dto.getMerchantId() != null) {
            Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                    .orElseThrow(() -> new MaintenanceException("Merchant not found with id: " + dto.getMerchantId()));
            ticket.setMerchant(merchant);
        }

        if (dto.getResponsiblePersonId() != null) {
            Contact responsiblePerson = contactRepository.findById(dto.getResponsiblePersonId())
                    .orElseThrow(() -> new MaintenanceException("Contact not found with id: " + dto.getResponsiblePersonId()));
            ticket.setResponsiblePerson(responsiblePerson);
        }

        if (dto.getSparePart() != null) {
            ticket.setSparePart(dto.getSparePart());
        }

        if (dto.getExpectedPartsCost() != null) {
            ticket.setExpectedPartsCost(dto.getExpectedPartsCost());
        }

        if (dto.getExpectedTransportationCost() != null) {
            ticket.setExpectedTransportationCost(dto.getExpectedTransportationCost());
        }

        if (dto.getDescription() != null) {
            ticket.setDescription(dto.getDescription());
        }

        if (dto.getStatus() != null) {
            ticket.setStatus(dto.getStatus());
        }

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("Updated direct purchase ticket: {}", id);

        // Send notification for ticket update
        try {
            String notificationTitle = "Direct Purchase Ticket Updated";
            String notificationMessage = String.format("Direct purchase ticket for %s has been updated",
                    savedTicket.getEquipment().getName());
            String actionUrl = "/maintenance/direct-purchase/" + savedTicket.getId();
            String relatedEntity = "DirectPurchaseTicket:" + savedTicket.getId();

            notificationService.sendNotificationToEquipmentUsers(
                    notificationTitle,
                    notificationMessage,
                    com.example.backend.models.notification.NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );
        } catch (Exception e) {
            log.error("❌ Failed to send notification for direct purchase ticket update", e);
        }

        return convertToDetailsDto(savedTicket);
    }

    // Delete ticket
    public void deleteTicket(UUID id) {
        DirectPurchaseTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Direct purchase ticket not found with id: " + id));

        ticketRepository.delete(ticket);
        log.info("Deleted direct purchase ticket: {}", id);
    }

    // Auto-check if ticket should be marked as completed
    public void checkAndCompleteTicket(UUID ticketId) {
        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Direct purchase ticket not found with id: " + ticketId));

        // Check if all steps are completed
        if (ticket.isFullyCompleted() && ticket.getStatus() != DirectPurchaseStatus.COMPLETED) {
            ticket.setStatus(DirectPurchaseStatus.COMPLETED);
            ticketRepository.save(ticket);
            log.info("Auto-completed direct purchase ticket: {}", ticketId);

            // Send completion notification
            try {
                String notificationTitle = "Direct Purchase Ticket Completed";
                String notificationMessage = String.format("Direct purchase ticket for %s has been completed. Total cost: $%.2f",
                        ticket.getEquipment().getName(), ticket.getTotalActualCost());
                String actionUrl = "/maintenance/direct-purchase/" + ticketId;
                String relatedEntity = "DirectPurchaseTicket:" + ticketId;

                notificationService.sendNotificationToEquipmentUsers(
                        notificationTitle,
                        notificationMessage,
                        com.example.backend.models.notification.NotificationType.SUCCESS,
                        actionUrl,
                        relatedEntity
                );
            } catch (Exception e) {
                log.error("❌ Failed to send notification for direct purchase ticket completion", e);
            }
        }
    }

    // Private helper methods

    private void createAutoSteps(DirectPurchaseTicket ticket, Contact responsiblePerson) {
        // Step 1: Purchasing
        DirectPurchaseStep purchasingStep = DirectPurchaseStep.builder()
                .directPurchaseTicket(ticket)
                .stepNumber(1)
                .stepName("Purchasing")
                .status(DirectPurchaseStepStatus.IN_PROGRESS)
                .responsiblePerson(responsiblePerson.getFullName())
                .phoneNumber(responsiblePerson.getPhoneNumber())
                .startDate(LocalDate.now())
                .expectedCost(ticket.getExpectedPartsCost())
                .advancedPayment(BigDecimal.ZERO)
                .description("Purchasing spare parts")
                .build();
        stepRepository.save(purchasingStep);

        // Step 2: Transporting
        DirectPurchaseStep transportingStep = DirectPurchaseStep.builder()
                .directPurchaseTicket(ticket)
                .stepNumber(2)
                .stepName("Transporting")
                .status(DirectPurchaseStepStatus.IN_PROGRESS)
                .responsiblePerson(responsiblePerson.getFullName())
                .phoneNumber(responsiblePerson.getPhoneNumber())
                .startDate(LocalDate.now())
                .expectedCost(ticket.getExpectedTransportationCost())
                .advancedPayment(BigDecimal.ZERO)
                .description("Transporting spare parts")
                .build();
        stepRepository.save(transportingStep);

        log.info("Created 2 auto-generated steps for ticket: {}", ticket.getId());
    }

    private DirectPurchaseTicketDto convertToDto(DirectPurchaseTicket ticket) {
        return DirectPurchaseTicketDto.builder()
                .id(ticket.getId())
                .equipmentId(ticket.getEquipment().getId())
                .merchantId(ticket.getMerchant().getId())
                .responsiblePersonId(ticket.getResponsiblePerson().getId())
                .sparePart(ticket.getSparePart())
                .expectedPartsCost(ticket.getExpectedPartsCost())
                .expectedTransportationCost(ticket.getExpectedTransportationCost())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .createdAt(ticket.getCreatedAt())
                .createdBy(ticket.getCreatedBy())
                .updatedAt(ticket.getUpdatedAt())
                .version(ticket.getVersion())
                .totalExpectedCost(ticket.getTotalExpectedCost())
                .totalActualCost(ticket.getTotalActualCost())
                .equipmentName(ticket.getEquipment().getName())
                .equipmentModel(ticket.getEquipment().getModel())
                .equipmentSerialNumber(ticket.getEquipment().getSerialNumber())
                .merchantName(ticket.getMerchant().getName())
                .responsiblePersonName(ticket.getResponsiblePerson().getFullName())
                .responsiblePersonPhone(ticket.getResponsiblePerson().getPhoneNumber())
                .build();
    }

    private DirectPurchaseTicketDetailsDto convertToDetailsDto(DirectPurchaseTicket ticket) {
        // Get steps
        List<DirectPurchaseStep> steps = stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(ticket.getId());
        List<DirectPurchaseStepDto> stepDtos = steps.stream()
                .map(this::convertStepToDto)
                .collect(Collectors.toList());

        long completedSteps = steps.stream()
                .filter(DirectPurchaseStep::isCompleted)
                .count();

        return DirectPurchaseTicketDetailsDto.builder()
                .id(ticket.getId())
                .equipmentId(ticket.getEquipment().getId())
                .merchantId(ticket.getMerchant().getId())
                .responsiblePersonId(ticket.getResponsiblePerson().getId())
                .sparePart(ticket.getSparePart())
                .expectedPartsCost(ticket.getExpectedPartsCost())
                .expectedTransportationCost(ticket.getExpectedTransportationCost())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .createdAt(ticket.getCreatedAt())
                .createdBy(ticket.getCreatedBy())
                .updatedAt(ticket.getUpdatedAt())
                .version(ticket.getVersion())
                .totalExpectedCost(ticket.getTotalExpectedCost())
                .totalActualCost(ticket.getTotalActualCost())
                .equipmentName(ticket.getEquipment().getName())
                .equipmentModel(ticket.getEquipment().getModel())
                .equipmentSerialNumber(ticket.getEquipment().getSerialNumber())
                .equipmentType(ticket.getEquipment().getType() != null ? ticket.getEquipment().getType().getName() : null)
                .site(ticket.getEquipment().getSite() != null ? ticket.getEquipment().getSite().getName() : "N/A")
                .merchantName(ticket.getMerchant().getName())
                .responsiblePersonName(ticket.getResponsiblePerson().getFullName())
                .responsiblePersonPhone(ticket.getResponsiblePerson().getPhoneNumber())
                .responsiblePersonEmail(ticket.getResponsiblePerson().getEmail())
                .steps(stepDtos)
                .totalSteps(steps.size())
                .completedSteps((int) completedSteps)
                .build();
    }

    private DirectPurchaseStepDto convertStepToDto(DirectPurchaseStep step) {
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
