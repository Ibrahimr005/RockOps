package com.example.backend.services;

import com.example.backend.dtos.*;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.contact.Contact;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.maintenance.DirectPurchaseItem;
import com.example.backend.models.maintenance.DirectPurchaseStep;
import com.example.backend.models.maintenance.DirectPurchaseStepStatus;
import com.example.backend.models.maintenance.DirectPurchaseTicket;
import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.example.backend.models.maintenance.DirectPurchaseWorkflowStep;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.repositories.ContactRepository;
import com.example.backend.repositories.DirectPurchaseItemRepository;
import com.example.backend.repositories.DirectPurchaseStepRepository;
import com.example.backend.repositories.DirectPurchaseTicketRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final DirectPurchaseItemRepository itemRepository;
    private final EquipmentRepository equipmentRepository;
    private final MerchantRepository merchantRepository;
    private final ContactRepository contactRepository;
    private final SiteRepository siteRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
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

        // Set responsible user (defaults to current authenticated user if not provided)
        final UUID responsibleUserId;
        if (dto.getResponsibleUserId() == null) {
            // Default to current authenticated user
            User currentUser = getCurrentAuthenticatedUser();
            if (currentUser != null) {
                responsibleUserId = currentUser.getId();
                log.info("Defaulting responsible user to current authenticated user: {} {}",
                        currentUser.getFirstName(), currentUser.getLastName());
            } else {
                throw new MaintenanceException("Responsible user is required");
            }
        } else {
            responsibleUserId = dto.getResponsibleUserId();
        }

        // Validate responsible user exists
        User responsibleUser = userRepository.findById(responsibleUserId)
                .orElseThrow(() -> new MaintenanceException("User not found with id: " + responsibleUserId));

        // Validate user has appropriate role
        List<Role> allowedRoles = Arrays.asList(Role.ADMIN, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);
        if (!allowedRoles.contains(responsibleUser.getRole())) {
            throw new MaintenanceException("User must have Admin, Maintenance Manager, or Maintenance Employee role");
        }

        // Create ticket
        DirectPurchaseTicket ticket = DirectPurchaseTicket.builder()
                .equipment(equipment)
                .merchant(merchant)
                .responsibleUser(responsibleUser)
                .sparePart(dto.getSparePart())
                .expectedPartsCost(dto.getExpectedPartsCost())
                .expectedTransportationCost(dto.getExpectedTransportationCost())
                .description(dto.getDescription())
                .status(DirectPurchaseStatus.IN_PROGRESS)
                .build();

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);

        // Auto-create 2 steps
        createAutoSteps(savedTicket, responsibleUser);

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

        if (dto.getResponsibleUserId() != null) {
            User responsibleUser = userRepository.findById(dto.getResponsibleUserId())
                    .orElseThrow(() -> new MaintenanceException("User not found with id: " + dto.getResponsibleUserId()));

            // Validate user has appropriate role
            List<Role> allowedRoles = Arrays.asList(Role.ADMIN, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);
            if (!allowedRoles.contains(responsibleUser.getRole())) {
                throw new MaintenanceException("User must have Admin, Maintenance Manager, or Maintenance Employee role");
            }

            ticket.setResponsibleUser(responsibleUser);
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

        // Load steps separately to avoid lazy loading issues
        List<DirectPurchaseStep> steps = stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(ticketId);

        // Check if all steps are completed
        boolean isFullyCompleted = !steps.isEmpty() &&
                steps.stream().allMatch(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED);

        if (isFullyCompleted && ticket.getStatus() != DirectPurchaseStatus.COMPLETED) {
            ticket.setStatus(DirectPurchaseStatus.COMPLETED);
            ticketRepository.save(ticket);
            log.info("Auto-completed direct purchase ticket: {}", ticketId);

            // Calculate total actual cost from loaded steps
            BigDecimal totalActualCost = steps.stream()
                    .filter(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED)
                    .map(DirectPurchaseStep::getActualCost)
                    .filter(cost -> cost != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Send completion notification
            try {
                String notificationTitle = "Direct Purchase Ticket Completed";
                String notificationMessage = String.format("Direct purchase ticket for %s has been completed. Total cost: $%.2f",
                        ticket.getEquipment().getName(), totalActualCost);
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

    private void createAutoSteps(DirectPurchaseTicket ticket, User responsibleUser) {
        String responsiblePersonName = responsibleUser.getFirstName() + " " + responsibleUser.getLastName();

        // Step 1: Purchasing
        DirectPurchaseStep purchasingStep = DirectPurchaseStep.builder()
                .directPurchaseTicket(ticket)
                .stepNumber(1)
                .stepName("Purchasing")
                .status(DirectPurchaseStepStatus.IN_PROGRESS)
                .responsiblePerson(responsiblePersonName)
                .phoneNumber(null) // User doesn't have phone
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
                .responsiblePerson(responsiblePersonName)
                .phoneNumber(null) // User doesn't have phone
                .startDate(LocalDate.now())
                .expectedCost(ticket.getExpectedTransportationCost())
                .advancedPayment(BigDecimal.ZERO)
                .description("Transporting spare parts")
                .build();
        stepRepository.save(transportingStep);

        log.info("Created 2 auto-generated steps for ticket: {}", ticket.getId());
    }

    private DirectPurchaseTicketDto convertToDto(DirectPurchaseTicket ticket) {
        // Calculate total actual cost by loading steps separately to avoid lazy loading issues
        List<DirectPurchaseStep> steps = stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(ticket.getId());
        BigDecimal totalActualCost = steps.stream()
                .filter(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED)
                .map(DirectPurchaseStep::getActualCost)
                .filter(cost -> cost != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return DirectPurchaseTicketDto.builder()
                .id(ticket.getId())
                .equipmentId(ticket.getEquipment() != null ? ticket.getEquipment().getId() : null)
                .merchantId(ticket.getMerchant() != null ? ticket.getMerchant().getId() : null)
                .responsibleUserId(ticket.getResponsibleUser() != null ? ticket.getResponsibleUser().getId() : null)
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
                .totalActualCost(totalActualCost)
                .equipmentName(ticket.getEquipment() != null ? ticket.getEquipment().getName() : "Unknown Equipment")
                .equipmentModel(ticket.getEquipment() != null ? ticket.getEquipment().getModel() : "N/A")
                .equipmentSerialNumber(ticket.getEquipment() != null ? ticket.getEquipment().getSerialNumber() : "N/A")
                .merchantName(ticket.getMerchant() != null ? ticket.getMerchant().getName() : null)
                .responsiblePersonName(ticket.getResponsiblePersonName())
                .responsiblePersonPhone(ticket.getResponsiblePersonPhone())
                .build();
    }

    private DirectPurchaseTicketDetailsDto convertToDetailsDto(DirectPurchaseTicket ticket) {
        // Get legacy steps (for legacy tickets)
        List<DirectPurchaseStep> steps = stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(ticket.getId());
        List<DirectPurchaseStepDto> stepDtos = steps.stream()
                .map(this::convertStepToDto)
                .collect(Collectors.toList());

        long completedLegacySteps = steps.stream()
                .filter(DirectPurchaseStep::isCompleted)
                .count();

        // Get items (for new workflow)
        List<DirectPurchaseItem> items = itemRepository.findByDirectPurchaseTicketId(ticket.getId());
        List<DirectPurchaseItemDto> itemDtos = items.stream()
                .map(this::convertItemToDto)
                .collect(Collectors.toList());

        // Calculate total actual cost (depends on workflow type)
        BigDecimal totalActualCost;
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            // Legacy: calculate from steps
            totalActualCost = steps.stream()
                    .filter(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED)
                    .map(DirectPurchaseStep::getActualCost)
                    .filter(cost -> cost != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            // New workflow: use ticket's calculated method
            totalActualCost = ticket.getTotalActualCost();
        }

        // Build DTO with ALL fields (legacy + new workflow)
        DirectPurchaseTicketDetailsDto.DirectPurchaseTicketDetailsDtoBuilder builder = DirectPurchaseTicketDetailsDto.builder()
                .id(ticket.getId())
                .equipmentId(ticket.getEquipment() != null ? ticket.getEquipment().getId() : null)
                .merchantId(ticket.getMerchant() != null ? ticket.getMerchant().getId() : null)
                .responsibleUserId(ticket.getResponsibleUser() != null ? ticket.getResponsibleUser().getId() : null)
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .createdAt(ticket.getCreatedAt())
                .createdBy(ticket.getCreatedBy())
                .updatedAt(ticket.getUpdatedAt())
                .version(ticket.getVersion())
                .totalExpectedCost(ticket.getTotalExpectedCost())
                .totalActualCost(totalActualCost)
                .equipmentName(ticket.getEquipment() != null ? ticket.getEquipment().getName() : "Unknown Equipment")
                .equipmentModel(ticket.getEquipment() != null ? ticket.getEquipment().getModel() : "N/A")
                .equipmentSerialNumber(ticket.getEquipment() != null ? ticket.getEquipment().getSerialNumber() : "N/A")
                .equipmentType(ticket.getEquipment() != null && ticket.getEquipment().getType() != null ? ticket.getEquipment().getType().getName() : null)
                .site(ticket.getEquipment() != null && ticket.getEquipment().getSite() != null ? ticket.getEquipment().getSite().getName() : "N/A")
                .responsiblePersonName(ticket.getResponsiblePersonName())
                .responsiblePersonPhone(ticket.getResponsiblePersonPhone())
                .responsiblePersonEmail(ticket.getResponsiblePersonEmail());

        // Add legacy fields if legacy ticket
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            builder.sparePart(ticket.getSparePart())
                    .expectedPartsCost(ticket.getExpectedPartsCost())
                    .expectedTransportationCost(ticket.getExpectedTransportationCost())
                    .merchantName(ticket.getMerchant() != null ? ticket.getMerchant().getName() : null)
                    .steps(stepDtos)
                    .totalSteps(steps.size())
                    .completedSteps((int) completedLegacySteps);
        }

        // Add new workflow fields if new workflow ticket
        if (ticket.getIsLegacyTicket() == null || !ticket.getIsLegacyTicket()) {
            builder.title(ticket.getTitle())
                    .isLegacyTicket(false)
                    .currentStep(ticket.getCurrentStep())
                    .currentStepDisplay(ticket.getCurrentStepDisplay())
                    .progressPercentage(ticket.getProgressPercentage())
                    // Step 1 fields
                    .step1StartedAt(ticket.getStep1StartedAt())
                    .step1CompletedAt(ticket.getStep1CompletedAt())
                    .step1Completed(ticket.getStep1Completed())
                    .expectedCost(ticket.getExpectedCost())
                    .expectedEndDate(ticket.getExpectedEndDate())
                    // Step 2 fields
                    .merchantName(ticket.getMerchant() != null ? ticket.getMerchant().getName() : null)
                    .downPayment(ticket.getDownPayment())
                    .step2StartedAt(ticket.getStep2StartedAt())
                    .step2CompletedAt(ticket.getStep2CompletedAt())
                    .step2Completed(ticket.getStep2Completed())
                    // Step 3 fields
                    .actualTotalPurchasingCost(ticket.getActualTotalPurchasingCost())
                    .remainingPayment(ticket.getRemainingPayment())
                    .step3StartedAt(ticket.getStep3StartedAt())
                    .step3CompletedAt(ticket.getStep3CompletedAt())
                    .step3Completed(ticket.getStep3Completed())
                    // Step 4 fields
                    .transportFromLocation(ticket.getTransportFromLocation())
                    .transportToSiteId(ticket.getTransportToSite() != null ? ticket.getTransportToSite().getId() : null)
                    .transportToSiteName(ticket.getTransportToSite() != null ? ticket.getTransportToSite().getName() : null)
                    .actualTransportationCost(ticket.getActualTransportationCost())
                    .transportResponsibleContactId(ticket.getTransportResponsibleContact() != null ? ticket.getTransportResponsibleContact().getId() : null)
                    .transportResponsibleEmployeeId(ticket.getTransportResponsibleEmployee() != null ? ticket.getTransportResponsibleEmployee().getId() : null)
                    .transportResponsiblePersonName(ticket.getTransportResponsiblePersonName())
                    .transportResponsiblePersonPhone(ticket.getTransportResponsiblePersonPhone())
                    .transportResponsiblePersonEmail(ticket.getTransportResponsiblePersonEmail())
                    .transportResponsiblePersonType(ticket.getTransportResponsiblePersonType())
                    .step4StartedAt(ticket.getStep4StartedAt())
                    .step4CompletedAt(ticket.getStep4CompletedAt())
                    .step4Completed(ticket.getStep4Completed())
                    .completedAt(ticket.getCompletedAt())
                    // Items and progress
                    .items(itemDtos)
                    .totalSteps(4)
                    .completedSteps(ticket.getCompletedStepsCount());
        }

        return builder.build();
    }

    /**
     * Convert DirectPurchaseItem to DTO
     */
    private DirectPurchaseItemDto convertItemToDto(DirectPurchaseItem item) {
        return DirectPurchaseItemDto.builder()
                .id(item.getId())
                .directPurchaseTicketId(item.getDirectPurchaseTicket().getId())
                .itemName(item.getItemName())
                .quantity(item.getQuantity())
                .expectedCostPerUnit(item.getExpectedCostPerUnit())
                .actualCostPerUnit(item.getActualCostPerUnit())
                .totalExpectedCost(item.getTotalExpectedCost())
                .totalActualCost(item.getTotalActualCost())
                .costDifference(item.getCostDifference())
                .isOverBudget(item.isOverBudget())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .version(item.getVersion())
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

    /**
     * Get the currently authenticated user
     * @return The current authenticated user, or null if not authenticated
     */
    private User getCurrentAuthenticatedUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return null;
            }

            String username = authentication.getName();
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            log.warn("Could not get current authenticated user: {}", e.getMessage());
            return null;
        }
    }

    // ========================================
    // NEW 4-STEP WORKFLOW METHODS
    // ========================================

    /**
     * STEP 1: Create new ticket with basic information
     * Creates a ticket with title, description, equipment, and initial items (name + quantity only)
     * @param dto Step 1 creation data
     * @return Created ticket details
     */
    public DirectPurchaseTicketDetailsDto createTicketStep1(CreateDirectPurchaseStep1Dto dto) {
        log.info("Creating NEW workflow direct purchase ticket - Step 1 for equipment: {}", dto.getEquipmentId());

        // Validate equipment exists
        Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found with id: " + dto.getEquipmentId()));

        // Set responsible user (defaults to current authenticated user if not provided)
        final UUID responsibleUserId;
        if (dto.getResponsibleUserId() == null) {
            User currentUser = getCurrentAuthenticatedUser();
            if (currentUser != null) {
                responsibleUserId = currentUser.getId();
                log.info("Defaulting responsible user to current authenticated user: {} {}",
                        currentUser.getFirstName(), currentUser.getLastName());
            } else {
                throw new MaintenanceException("Responsible user is required");
            }
        } else {
            responsibleUserId = dto.getResponsibleUserId();
        }

        // Validate responsible user exists
        User responsibleUser = userRepository.findById(responsibleUserId)
                .orElseThrow(() -> new MaintenanceException("User not found with id: " + responsibleUserId));

        // Validate user has appropriate role
        List<Role> allowedRoles = Arrays.asList(Role.ADMIN, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);
        if (!allowedRoles.contains(responsibleUser.getRole())) {
            throw new MaintenanceException("User must have Admin, Maintenance Manager, or Maintenance Employee role");
        }

        // Validate at least one item
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new MaintenanceException("At least one item is required");
        }

        // Create ticket with new workflow fields
        DirectPurchaseTicket ticket = DirectPurchaseTicket.builder()
                .equipment(equipment)
                .responsibleUser(responsibleUser)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .expectedCost(dto.getExpectedCost())
                .expectedEndDate(dto.getExpectedEndDate())
                .isLegacyTicket(false)  // Mark as NEW workflow
                .currentStep(DirectPurchaseWorkflowStep.CREATION)
                .step1StartedAt(LocalDateTime.now())
                .step1Completed(false)
                .status(DirectPurchaseStatus.IN_PROGRESS)
                .build();

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);

        // Add items (name + quantity only at this stage)
        for (DirectPurchaseItemDto itemDto : dto.getItems()) {
            DirectPurchaseItem item = DirectPurchaseItem.builder()
                    .itemName(itemDto.getItemName())
                    .quantity(itemDto.getQuantity())
                    .build();
            item.setDirectPurchaseTicket(savedTicket);
            itemRepository.save(item);
        }

        log.info("Created NEW workflow direct purchase ticket: {} - Step 1 (Creation)", savedTicket.getId());

        // Send notification
        try {
            String notificationTitle = "New Direct Purchase Ticket Created";
            String notificationMessage = String.format("Direct purchase ticket '%s' created for %s - %s",
                    dto.getTitle(), equipment.getName(), equipment.getModel());
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

    /**
     * STEP 1: Complete Step 1 and progress to Step 2
     * @param ticketId Ticket ID
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto completeStep1(UUID ticketId) {
        log.info("Completing Step 1 for ticket: {}", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Validate current step
        if (ticket.getCurrentStep() != DirectPurchaseWorkflowStep.CREATION) {
            throw new MaintenanceException("Ticket is not in CREATION step. Current step: " + ticket.getCurrentStep());
        }

        // Validate required fields
        if (ticket.getTitle() == null || ticket.getTitle().trim().isEmpty()) {
            throw new MaintenanceException("Title is required");
        }
        if (ticket.getDescription() == null || ticket.getDescription().trim().isEmpty()) {
            throw new MaintenanceException("Description is required");
        }
        if (ticket.getEquipment() == null) {
            throw new MaintenanceException("Equipment is required");
        }

        // Validate at least one item
        List<DirectPurchaseItem> items = itemRepository.findByDirectPurchaseTicketId(ticketId);
        ticket.setItems(items);
        if (items.isEmpty()) {
            throw new MaintenanceException("At least one item is required");
        }

        // Complete Step 1 and progress to Step 2
        ticket.setStep1Completed(true);
        ticket.setStep1CompletedAt(LocalDateTime.now());
        ticket.progressToNextStep();  // This sets currentStep to PURCHASING and step2StartedAt

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("✅ Step 1 completed for ticket: {}. Now on Step 2: PURCHASING", ticketId);

        return convertToDetailsDto(savedTicket);
    }

    /**
     * STEP 2: Update purchasing information
     * Set merchant, add expected costs to items, set down payment
     * @param ticketId Ticket ID
     * @param dto Step 2 update data
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto updateStep2(UUID ticketId, UpdateDirectPurchaseStep2Dto dto) {
        log.info("Updating Step 2 for ticket: {}", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Allow updating if we're on Step 2 OR beyond (for edits)
        if (ticket.getCurrentStep() == DirectPurchaseWorkflowStep.CREATION) {
            throw new MaintenanceException("Must complete Step 1 before updating Step 2");
        }

        // Update merchant if provided
        if (dto.getMerchantId() != null) {
            Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                    .orElseThrow(() -> new MaintenanceException("Merchant not found with id: " + dto.getMerchantId()));
            ticket.setMerchant(merchant);
        }

        // Update down payment if provided
        if (dto.getDownPayment() != null) {
            if (dto.getDownPayment().compareTo(BigDecimal.ZERO) < 0) {
                throw new MaintenanceException("Down payment cannot be negative");
            }
            ticket.setDownPayment(dto.getDownPayment());
        }

        // Update item costs if provided
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (DirectPurchaseItemDto itemDto : dto.getItems()) {
                if (itemDto.getId() != null) {
                    // Update existing item
                    DirectPurchaseItem item = itemRepository.findById(itemDto.getId())
                            .orElseThrow(() -> new MaintenanceException("Item not found with id: " + itemDto.getId()));
                    if (itemDto.getExpectedCostPerUnit() != null) {
                        item.setExpectedCostPerUnit(itemDto.getExpectedCostPerUnit());
                    }
                    item.setDirectPurchaseTicket(ticket);
                    itemRepository.save(item);
                } else {
                    // Add new item (with name, quantity, and expected cost)
                    DirectPurchaseItem newItem = DirectPurchaseItem.builder()
                            .itemName(itemDto.getItemName())
                            .quantity(itemDto.getQuantity())
                            .expectedCostPerUnit(itemDto.getExpectedCostPerUnit())
                            .build();
                    newItem.setDirectPurchaseTicket(ticket);
                    itemRepository.save(newItem);
                }
            }
        }

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("✅ Step 2 updated for ticket: {}", ticketId);

        return convertToDetailsDto(savedTicket);
    }

    /**
     * STEP 2: Complete Step 2 and progress to Step 3
     * @param ticketId Ticket ID
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto completeStep2(UUID ticketId) {
        log.info("Completing Step 2 for ticket: {}", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Validate current step
        if (ticket.getCurrentStep() != DirectPurchaseWorkflowStep.PURCHASING) {
            throw new MaintenanceException("Ticket is not in PURCHASING step. Current step: " + ticket.getCurrentStep());
        }

        // Validate merchant is set
        if (ticket.getMerchant() == null) {
            throw new MaintenanceException("Merchant is required before completing Step 2");
        }

        // Load items and validate all items have expected costs
        List<DirectPurchaseItem> items = itemRepository.findByDirectPurchaseTicketId(ticketId);
        ticket.setItems(items);
        if (!ticket.allItemsHaveExpectedCosts()) {
            throw new MaintenanceException("All items must have expected costs before completing Step 2");
        }

        // Complete Step 2 and progress to Step 3
        ticket.setStep2Completed(true);
        ticket.setStep2CompletedAt(LocalDateTime.now());
        ticket.progressToNextStep();  // Sets currentStep to FINALIZE_PURCHASING and step3StartedAt

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("✅ Step 2 completed for ticket: {}. Now on Step 3: FINALIZE_PURCHASING", ticketId);

        return convertToDetailsDto(savedTicket);
    }

    /**
     * STEP 3: Update finalize purchasing information
     * Set actual costs for items
     * @param ticketId Ticket ID
     * @param dto Step 3 update data
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto updateStep3(UUID ticketId, UpdateDirectPurchaseStep3Dto dto) {
        log.info("Updating Step 3 for ticket: {}", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Allow updating if we're on Step 3 OR beyond (for edits)
        if (ticket.getCurrentStep() == DirectPurchaseWorkflowStep.CREATION ||
                ticket.getCurrentStep() == DirectPurchaseWorkflowStep.PURCHASING) {
            throw new MaintenanceException("Must complete Steps 1 and 2 before updating Step 3");
        }

        // Update item actual costs
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (DirectPurchaseItemDto itemDto : dto.getItems()) {
                if (itemDto.getId() == null) {
                    throw new MaintenanceException("Item ID is required for updating actual costs");
                }

                DirectPurchaseItem item = itemRepository.findById(itemDto.getId())
                        .orElseThrow(() -> new MaintenanceException("Item not found with id: " + itemDto.getId()));

                if (itemDto.getActualCostPerUnit() != null) {
                    item.setActualCostPerUnit(itemDto.getActualCostPerUnit());
                }
                item.setDirectPurchaseTicket(ticket);
                itemRepository.save(item);
            }
        }

        // Calculate and update actual total purchasing cost
        BigDecimal actualTotalCost = ticket.getTotalActualPurchasingCostFromItems();
        ticket.setActualTotalPurchasingCost(actualTotalCost);

        // Calculate remaining payment
        BigDecimal remainingPayment = ticket.calculateRemainingPayment();
        ticket.setRemainingPayment(remainingPayment);

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("✅ Step 3 updated for ticket: {}. Actual total cost: {}, Remaining payment: {}",
                ticketId, actualTotalCost, remainingPayment);

        return convertToDetailsDto(savedTicket);
    }

    /**
     * STEP 3: Complete Step 3 and progress to Step 4
     * @param ticketId Ticket ID
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto completeStep3(UUID ticketId) {
        log.info("Completing Step 3 for ticket: {}", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Validate current step
        if (ticket.getCurrentStep() != DirectPurchaseWorkflowStep.FINALIZE_PURCHASING) {
            throw new MaintenanceException("Ticket is not in FINALIZE_PURCHASING step. Current step: " + ticket.getCurrentStep());
        }

        // Load items and validate all items have actual costs
        List<DirectPurchaseItem> items = itemRepository.findByDirectPurchaseTicketId(ticketId);
        ticket.setItems(items);
        if (!ticket.allItemsHaveActualCosts()) {
            throw new MaintenanceException("All items must have actual costs before completing Step 3");
        }

        // Complete Step 3 and progress to Step 4
        ticket.setStep3Completed(true);
        ticket.setStep3CompletedAt(LocalDateTime.now());
        ticket.progressToNextStep();  // Sets currentStep to TRANSPORTING and step4StartedAt

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("✅ Step 3 completed for ticket: {}. Now on Step 4: TRANSPORTING", ticketId);

        return convertToDetailsDto(savedTicket);
    }

    /**
     * STEP 4: Update transporting information
     * Set transport from/to, cost, and responsible person
     * @param ticketId Ticket ID
     * @param dto Step 4 update data
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto updateStep4(UUID ticketId, UpdateDirectPurchaseStep4Dto dto) {
        log.info("Updating Step 4 for ticket: {}", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Allow updating if we're on Step 4 OR beyond (for edits)
        if (ticket.getCurrentStep() != DirectPurchaseWorkflowStep.TRANSPORTING &&
                ticket.getCurrentStep() != DirectPurchaseWorkflowStep.COMPLETED) {
            throw new MaintenanceException("Must complete Steps 1, 2, and 3 before updating Step 4");
        }

        // Update transport from location
        if (dto.getTransportFromLocation() != null) {
            ticket.setTransportFromLocation(dto.getTransportFromLocation());
        }

        // Update transport to site
        if (dto.getTransportToSiteId() != null) {
            Site site = siteRepository.findById(dto.getTransportToSiteId())
                    .orElseThrow(() -> new MaintenanceException("Site not found with id: " + dto.getTransportToSiteId()));
            ticket.setTransportToSite(site);
        } else if (ticket.getTransportToSite() == null) {
            // Default to equipment's site if not set
            if (ticket.getEquipment().getSite() != null) {
                ticket.setTransportToSite(ticket.getEquipment().getSite());
            }
        }

        // Update transportation cost
        if (dto.getActualTransportationCost() != null) {
            if (dto.getActualTransportationCost().compareTo(BigDecimal.ZERO) < 0) {
                throw new MaintenanceException("Transportation cost cannot be negative");
            }
            ticket.setActualTransportationCost(dto.getActualTransportationCost());
        }

        // Update responsible person (either contact OR employee)
        if (dto.getTransportResponsibleContactId() != null && dto.getTransportResponsibleEmployeeId() != null) {
            throw new MaintenanceException("Cannot set both contact and employee as transport responsible person. Choose one.");
        }

        if (dto.getTransportResponsibleContactId() != null) {
            Contact contact = contactRepository.findById(dto.getTransportResponsibleContactId())
                    .orElseThrow(() -> new MaintenanceException("Contact not found with id: " + dto.getTransportResponsibleContactId()));
            ticket.setTransportResponsibleContact(contact);
            ticket.setTransportResponsibleEmployee(null);  // Clear employee if contact is set
        }

        if (dto.getTransportResponsibleEmployeeId() != null) {
            Employee employee = employeeRepository.findById(dto.getTransportResponsibleEmployeeId())
                    .orElseThrow(() -> new MaintenanceException("Employee not found with id: " + dto.getTransportResponsibleEmployeeId()));
            ticket.setTransportResponsibleEmployee(employee);
            ticket.setTransportResponsibleContact(null);  // Clear contact if employee is set
        }

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("✅ Step 4 updated for ticket: {}", ticketId);

        return convertToDetailsDto(savedTicket);
    }

    /**
     * STEP 4: Complete Step 4 and mark ticket as COMPLETED
     * @param ticketId Ticket ID
     * @return Updated ticket details
     */
    public DirectPurchaseTicketDetailsDto completeStep4(UUID ticketId) {
        log.info("Completing Step 4 for ticket: {} - This will complete the entire ticket!", ticketId);

        DirectPurchaseTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new MaintenanceException("Ticket not found with id: " + ticketId));

        // Validate ticket is not legacy
        if (ticket.getIsLegacyTicket() != null && ticket.getIsLegacyTicket()) {
            throw new MaintenanceException("Cannot use new workflow methods on legacy tickets");
        }

        // Validate current step
        if (ticket.getCurrentStep() != DirectPurchaseWorkflowStep.TRANSPORTING) {
            throw new MaintenanceException("Ticket is not in TRANSPORTING step. Current step: " + ticket.getCurrentStep());
        }

        // Validate required fields
        if (ticket.getTransportFromLocation() == null || ticket.getTransportFromLocation().trim().isEmpty()) {
            throw new MaintenanceException("Transport from location is required");
        }
        if (ticket.getTransportToSite() == null) {
            throw new MaintenanceException("Transport to site is required");
        }
        if (ticket.getActualTransportationCost() == null) {
            throw new MaintenanceException("Transportation cost is required");
        }
        if (!ticket.hasTransportResponsiblePerson()) {
            throw new MaintenanceException("Transport responsible person (contact or employee) is required");
        }

        // Complete Step 4 and mark ticket as COMPLETED
        ticket.setStep4Completed(true);
        ticket.setStep4CompletedAt(LocalDateTime.now());
        ticket.progressToNextStep();  // Sets currentStep to COMPLETED, completedAt, and status to COMPLETED

        DirectPurchaseTicket savedTicket = ticketRepository.save(ticket);
        log.info("🎉 Step 4 completed! Ticket {} is now COMPLETED!", ticketId);

        // Send completion notification
        try {
            String notificationTitle = "Direct Purchase Ticket Completed";
            String notificationMessage = String.format("Direct purchase ticket '%s' for %s has been completed. Total cost: $%.2f",
                    ticket.getTitle(), ticket.getEquipment().getName(), ticket.getTotalActualCost());
            String actionUrl = "/maintenance/direct-purchase/" + ticketId;
            String relatedEntity = "DirectPurchaseTicket:" + ticketId;

            notificationService.sendNotificationToEquipmentUsers(
                    notificationTitle,
                    notificationMessage,
                    com.example.backend.models.notification.NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );
            log.info("✅ Completion notification sent for ticket: {}", ticketId);
        } catch (Exception e) {
            log.error("❌ Failed to send completion notification for ticket: {}", ticketId, e);
        }

        return convertToDetailsDto(savedTicket);
    }
}
