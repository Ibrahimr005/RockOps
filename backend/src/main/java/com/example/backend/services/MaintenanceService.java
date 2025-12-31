package com.example.backend.services;

import com.example.backend.dtos.*;
import com.example.backend.models.*;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.equipment.MaintenanceStatus;

import com.example.backend.models.contact.Contact;
import com.example.backend.models.contact.ContactLog;
import com.example.backend.models.contact.ContactType;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.maintenance.MaintenanceStep;
import com.example.backend.models.maintenance.MaintenanceStepMerchantItem;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.repositories.*;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.models.maintenance.StepType;
import com.example.backend.repositories.StepTypeRepository;
import com.example.backend.services.notification.NotificationService;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MaintenanceService {

    private final MaintenanceRecordRepository maintenanceRecordRepository;
    private final MaintenanceStepRepository maintenanceStepRepository;
    private final ContactLogRepository contactLogRepository;
    private final EquipmentRepository equipmentRepository;
    private final ContactService contactService;
    private final StepTypeRepository stepTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final ContactRepository contactRepository;
    private final ContactTypeRepository contactTypeRepository;
    private final MerchantRepository merchantRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository offerFinancialReviewRepository;

    // Maintenance Record Operations

    public MaintenanceRecordDto createMaintenanceRecord(MaintenanceRecordDto dto) {
        log.info("Creating new maintenance record for equipment: {}", dto.getEquipmentId());

        // Validate equipment exists
        Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found with id: " + dto.getEquipmentId()));

        // Validate issue date is provided
        if (dto.getIssueDate() == null) {
            throw new MaintenanceException("Issue date is required");
        }

        // Validate spare part name is provided
        if (dto.getSparePartName() == null || dto.getSparePartName().trim().isEmpty()) {
            throw new MaintenanceException("Spare part name / item to maintain is required");
        }

        // Validate expected completion date >= issue date
        if (dto.getExpectedCompletionDate() != null && dto.getIssueDate() != null) {
            if (dto.getExpectedCompletionDate().isBefore(dto.getIssueDate())) {
                throw new MaintenanceException("Expected completion date must be on or after the issue date");
            }
        }

        // Allow creating maintenance records even if equipment is already in
        // maintenance

        MaintenanceRecord record = MaintenanceRecord.builder()
                .equipmentId(dto.getEquipmentId())
                .equipmentInfo(dto.getEquipmentInfo() != null ? dto.getEquipmentInfo()
                        : equipment.getType().getName() + " - " + equipment.getFullModelName())
                .initialIssueDescription(dto.getInitialIssueDescription())
                .issueDate(dto.getIssueDate())
                .sparePartName(dto.getSparePartName().trim())
                .expectedCompletionDate(dto.getExpectedCompletionDate())
                .expectedCompletionDate(dto.getExpectedCompletionDate())
                .status(MaintenanceStatus.DRAFT)
                // ADD THIS LINE - Set initial cost from DTO
                .totalCost(dto.getTotalCost() != null ? dto.getTotalCost()
                        : (dto.getEstimatedCost() != null ? dto.getEstimatedCost() : BigDecimal.ZERO))
                .build();

        // Determine initial status based on user role (will be set properly after user
        // check)
        MaintenanceStatus initialStatus = MaintenanceStatus.PENDING_MANAGER_APPROVAL;

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
                responsibleUserId = null;
            }
        } else {
            responsibleUserId = dto.getResponsibleUserId();
        }

        if (responsibleUserId != null) {
            User responsibleUser = userRepository.findById(responsibleUserId)
                    .orElseThrow(() -> new MaintenanceException("User not found with ID: " + responsibleUserId));

            // Validate user has appropriate role
            List<Role> allowedRoles = Arrays.asList(Role.ADMIN, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);
            if (!allowedRoles.contains(responsibleUser.getRole())) {
                throw new MaintenanceException(
                        "User must have Admin, Maintenance Manager, or Maintenance Employee role");
            }

            // Set initial status based on role
            if (responsibleUser.getRole() == Role.MAINTENANCE_MANAGER || responsibleUser.getRole() == Role.ADMIN) {
                initialStatus = MaintenanceStatus.PENDING_FINANCE_APPROVAL;
            }

            record.setResponsibleUser(responsibleUser);
            log.info("Assigned responsible user: {} {} ({})",
                    responsibleUser.getFirstName(), responsibleUser.getLastName(), responsibleUser.getRole());
        }

        // Set current responsible contact if provided, otherwise use equipment's main
        // driver
        if (dto.getCurrentResponsibleContactId() != null) {
            try {
                Contact contact = contactRepository.findById(dto.getCurrentResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException(
                                "Contact not found with ID: " + dto.getCurrentResponsibleContactId()));
                record.setCurrentResponsibleContact(contact);
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to record: {}", dto.getCurrentResponsibleContactId(),
                        e.getMessage());
            }
        } else if (equipment.getMainDriver() != null) {
            // Automatically assign equipment's main driver as responsible person
            try {
                Employee mainDriver = equipment.getMainDriver();
                Contact driverContact = findOrCreateContactForEmployee(mainDriver);
                record.setCurrentResponsibleContact(driverContact);
                log.info("Automatically assigned main driver {} {} as responsible person for maintenance record",
                        mainDriver.getFirstName(), mainDriver.getLastName());
            } catch (Exception e) {
                log.warn("Could not assign main driver as responsible contact: {}", e.getMessage());
            }
        }

        record.setStatus(initialStatus);
        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);

        // If status is PENDING_FINANCE_APPROVAL, create the OfferFinancialReview entity
        if (savedRecord.getStatus() == MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
            createPendingFinancialReview(savedRecord);
        }

        // Update equipment status to IN_MAINTENANCE if not already in maintenance
        if (equipment.getStatus() != EquipmentStatus.IN_MAINTENANCE) {
            equipment.setStatus(EquipmentStatus.IN_MAINTENANCE);
            equipmentRepository.save(equipment);
        }

        // Note: Steps are NOT auto-created - user adds them manually

        // Send notifications to MAINTENANCE_MANAGER, EQUIPMENT_MANAGER, and ADMIN
        try {
            String notificationTitle = "New Maintenance Record Created";
            String notificationMessage = String.format("Maintenance record created for equipment '%s' (%s). Issue: %s",
                    equipment.getName(),
                    equipment.getFullModelName(),
                    dto.getInitialIssueDescription() != null && dto.getInitialIssueDescription().length() > 100
                            ? dto.getInitialIssueDescription().substring(0, 100) + "..."
                            : dto.getInitialIssueDescription());
            String actionUrl = "/maintenance/records/" + savedRecord.getId();
            String relatedEntity = savedRecord.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity);

            log.info("Maintenance record creation notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send maintenance record creation notifications: {}", e.getMessage());
        }

        log.info("Created maintenance record: {} for equipment: {}", savedRecord.getId(), dto.getEquipmentId());
        return convertToDto(savedRecord);
    }

    private void createPendingFinancialReview(MaintenanceRecord record) {
        try {
            // Check if there is already a PENDING review
            List<OfferFinancialReview> reviews = offerFinancialReviewRepository
                    .findByMaintenanceRecordId(record.getId());
            boolean hasPendingReview = reviews.stream()
                    .anyMatch(r -> r
                            .getStatus() == com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.PENDING);

            if (hasPendingReview) {
                return;
            }

            com.example.backend.models.finance.accountsPayable.OfferFinancialReview review = com.example.backend.models.finance.accountsPayable.OfferFinancialReview
                    .builder()
                    .maintenanceRecord(record)
                    .totalAmount(record.getTotalCost() != null ? record.getTotalCost() : BigDecimal.ZERO)
                    .currency("EGP")
                    .department("Maintenance")
                    .status(com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build();

            offerFinancialReviewRepository.save(review);
            log.info("Created PENDING OfferFinancialReview for maintenance record: {}", record.getId());
        } catch (Exception e) {
            log.error("Failed to create OfferFinancialReview for maintenance record: {}", e.getMessage());
            // Don't block creation, but log error
        }
    }

    public MaintenanceRecordDto getMaintenanceRecord(UUID id) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        return convertToDto(record);
    }

    public List<MaintenanceRecordDto> getAllMaintenanceRecords() {
        return maintenanceRecordRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<MaintenanceRecordDto> getMaintenanceRecordsByEquipment(UUID equipmentId) {
        return maintenanceRecordRepository.findByEquipmentIdOrderByCreationDateDesc(equipmentId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<MaintenanceRecordDto> getActiveMaintenanceRecords() {
        return maintenanceRecordRepository.findByStatus(MaintenanceStatus.ACTIVE).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<MaintenanceRecordDto> getOverdueMaintenanceRecords() {
        return maintenanceRecordRepository.findOverdueRecords(LocalDateTime.now()).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public MaintenanceRecordDto completeMaintenanceRecord(UUID id) {
        // Legacy support or direct completion if needed, otherwise this might be
        // deprecated or restricted
        // For now, let's redirect to submitForApproval if status is DRAFT
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        if (record.getStatus() == MaintenanceStatus.DRAFT) {
            return submitForApproval(id);
        }

        // Only allow explicit completion if not in approval flow or if approved
        if (record.getStatus() == MaintenanceStatus.ACTIVE) {
            completeMaintenanceRecordIfFinalStepCompleted(record);
            return convertToDto(record);
        }

        throw new MaintenanceException("Cannot complete record. Current status: " + record.getStatus());
    }

    // ==================================================================================
    // APPROVAL WORKFLOW
    // ==================================================================================

    public MaintenanceRecordDto submitForApproval(UUID id) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        if (record.getStatus() != MaintenanceStatus.DRAFT && record.getStatus() != MaintenanceStatus.REJECTED) {
            throw new MaintenanceException("Only DRAFT or REJECTED records can be submitted for approval.");
        }

        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser == null) {
            throw new MaintenanceException("User must be authenticated to submit for approval.");
        }

        // Workflow Logic:
        // MAINTENANCE_EMPLOYEE -> PENDING_MANAGER_APPROVAL
        // MAINTENANCE_MANAGER / ADMIN -> PENDING_FINANCE_APPROVAL (Skip 1st step)

        if (currentUser.getRole() == Role.MAINTENANCE_MANAGER || currentUser.getRole() == Role.ADMIN) {
            record.setStatus(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
            record.setManagerApprovalDate(LocalDateTime.now());
            log.info("Record {} submitted by Manager/Admin. Skipping Manager approval. now PENDING_FINANCE_APPROVAL",
                    id);
            // Create PENDING OfferFinancialReview
            createPendingFinancialReview(record);
        } else {
            record.setStatus(MaintenanceStatus.PENDING_MANAGER_APPROVAL);
            log.info("Record {} submitted by Employee. now PENDING_MANAGER_APPROVAL", id);
            // Notify Managers
        }

        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);
        return convertToDto(savedRecord);
    }

    public MaintenanceRecordDto approveByManager(UUID id) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        if (record.getStatus() != MaintenanceStatus.PENDING_MANAGER_APPROVAL) {
            throw new MaintenanceException("Record is not pending manager approval.");
        }

        // Role check (Enforced by SecurityConfig usually, but good to have safety net)
        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser.getRole() != Role.MAINTENANCE_MANAGER && currentUser.getRole() != Role.ADMIN) {
            throw new MaintenanceException("Only Managers or Admins can approve.");
        }

        record.setStatus(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        record.setManagerApprovalDate(LocalDateTime.now());
        log.info("Record {} approved by Manager {}. now PENDING_FINANCE_APPROVAL", id, currentUser.getId());

        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);

        // Create the OfferFinancialReview entity
        createPendingFinancialReview(savedRecord);

        return convertToDto(savedRecord);
    }

    public MaintenanceRecordDto approveByFinance(UUID id) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        if (record.getStatus() != MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
            // Idempotency: if already active, just return
            if (record.getStatus() == MaintenanceStatus.ACTIVE)
                return convertToDto(record);
            throw new MaintenanceException("Record is not pending finance approval.");
        }

        record.setStatus(MaintenanceStatus.APPROVED_BY_FINANCE);
        log.info("Record {} approved by Finance. now APPROVED_BY_FINANCE", id);

        // Logic to update Equipment status to IN_MAINTENANCE if not already
        Equipment equipment = equipmentRepository.findById(record.getEquipmentId()).orElse(null);
        if (equipment != null && equipment.getStatus() != EquipmentStatus.IN_MAINTENANCE) {
            equipment.setStatus(EquipmentStatus.IN_MAINTENANCE);
            equipmentRepository.save(equipment);
        }

        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);
        return convertToDto(savedRecord);
    }

    public MaintenanceRecordDto rejectMaintenanceRecord(UUID id, String rejectionReason) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        // Can reject from PENDING_MANAGER or PENDING_FINANCE
        if (record.getStatus() != MaintenanceStatus.PENDING_MANAGER_APPROVAL &&
                record.getStatus() != MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
            throw new MaintenanceException("Cannot reject record. Current status: " + record.getStatus());
        }

        record.setStatus(MaintenanceStatus.REJECTED);
        // We might want to store the reason on the record?
        // For now, logging it. Ideally MaintenanceRecord should have 'rejectionReason'
        // field.
        // Assuming we rely on the FinancialReview for the finance rejection reason.

        log.info("Record {} rejected. Reason: {}", id, rejectionReason);

        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);
        return convertToDto(savedRecord);
    }

    public MaintenanceRecordDto updateMaintenanceRecord(UUID id, MaintenanceRecordDto dto) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        // Handle equipment change
        if (dto.getEquipmentId() != null && !dto.getEquipmentId().equals(record.getEquipmentId())) {
            // Get old equipment to potentially update its status
            Equipment oldEquipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Old equipment not found"));

            // Verify new equipment exists
            Equipment newEquipment = equipmentRepository.findById(dto.getEquipmentId())
                    .orElseThrow(
                            () -> new MaintenanceException("New equipment not found with id: " + dto.getEquipmentId()));

            // Update equipment ID
            record.setEquipmentId(dto.getEquipmentId());

            // Check if old equipment has any other active maintenance records
            List<MaintenanceRecord> oldEquipmentActiveRecords = maintenanceRecordRepository
                    .findByEquipmentIdOrderByCreationDateDesc(oldEquipment.getId())
                    .stream()
                    .filter(r -> r.getStatus() == MaintenanceStatus.ACTIVE
                            && !r.getId().equals(record.getId()))
                    .collect(Collectors.toList());

            // If no other active records, set old equipment to AVAILABLE
            if (oldEquipmentActiveRecords.isEmpty() && oldEquipment.getStatus() == EquipmentStatus.IN_MAINTENANCE) {
                oldEquipment.setStatus(EquipmentStatus.AVAILABLE);
                equipmentRepository.save(oldEquipment);
            }

            // If current record is active, set new equipment to IN_MAINTENANCE
            if (record.getStatus() == MaintenanceStatus.ACTIVE) {
                newEquipment.setStatus(EquipmentStatus.IN_MAINTENANCE);
                equipmentRepository.save(newEquipment);
            }
        }

        if (dto.getInitialIssueDescription() != null) {
            record.setInitialIssueDescription(dto.getInitialIssueDescription());
        }
        if (dto.getFinalDescription() != null) {
            record.setFinalDescription(dto.getFinalDescription());
        }
        if (dto.getIssueDate() != null) {
            record.setIssueDate(dto.getIssueDate());
        }
        if (dto.getSparePartName() != null) {
            record.setSparePartName(dto.getSparePartName().trim());
        }
        if (dto.getExpectedCompletionDate() != null) {
            // Validate expected completion date >= issue date
            LocalDateTime issueDate = dto.getIssueDate() != null ? dto.getIssueDate() : record.getIssueDate();
            if (issueDate != null && dto.getExpectedCompletionDate().isBefore(issueDate)) {
                throw new MaintenanceException("Expected completion date must be on or after the issue date");
            }
            record.setExpectedCompletionDate(dto.getExpectedCompletionDate());
        }

        if (dto.getTotalCost() != null) {
            record.setTotalCost(dto.getTotalCost());
        } else if (dto.getEstimatedCost() != null) {
            record.setTotalCost(dto.getEstimatedCost());
        }

        if (dto.getStatus() != null) {
            record.setStatus(dto.getStatus());

            // If completing maintenance, check if there are other active records
            if (dto.getStatus() == MaintenanceStatus.COMPLETED) {
                Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                        .orElseThrow(() -> new MaintenanceException("Equipment not found"));

                // Check if there are other active maintenance records for this equipment
                List<MaintenanceRecord> activeRecords = maintenanceRecordRepository
                        .findByEquipmentIdOrderByCreationDateDesc(equipment.getId())
                        .stream()
                        .filter(r -> r.getStatus() == MaintenanceStatus.ACTIVE
                                && !r.getId().equals(record.getId()))
                        .collect(Collectors.toList());

                // Only change equipment status to AVAILABLE if no other active maintenance
                // records exist
                if (activeRecords.isEmpty()) {
                    equipment.setStatus(EquipmentStatus.AVAILABLE);
                    equipmentRepository.save(equipment);
                }
                // If there are still active records, keep equipment status as IN_MAINTENANCE

                record.setActualCompletionDate(LocalDateTime.now());
            }
        }

        // Update responsible user if provided
        if (dto.getResponsibleUserId() != null) {
            User responsibleUser = userRepository.findById(dto.getResponsibleUserId())
                    .orElseThrow(
                            () -> new MaintenanceException("User not found with ID: " + dto.getResponsibleUserId()));

            // Validate user has appropriate role
            List<Role> allowedRoles = Arrays.asList(Role.ADMIN, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);
            if (!allowedRoles.contains(responsibleUser.getRole())) {
                throw new MaintenanceException(
                        "User must have Admin, Maintenance Manager, or Maintenance Employee role");
            }

            record.setResponsibleUser(responsibleUser);
            log.info("Updated responsible user to: {} {} ({})",
                    responsibleUser.getFirstName(), responsibleUser.getLastName(), responsibleUser.getRole());
        }

        // Update current responsible contact if provided
        if (dto.getCurrentResponsibleContactId() != null) {
            try {
                Contact contact = contactRepository.findById(dto.getCurrentResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException(
                                "Contact not found with ID: " + dto.getCurrentResponsibleContactId()));
                record.setCurrentResponsibleContact(contact);
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to record: {}", dto.getCurrentResponsibleContactId(),
                        e.getMessage());
            }
        }

        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);
        return convertToDto(savedRecord);
    }

    public void deleteMaintenanceRecord(UUID id) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));

        // Get equipment before deleting the record
        Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found"));

        // Delete potential OfferFinancialReview associated with this record
        // Delete potential OfferFinancialReviews associated with this record
        List<OfferFinancialReview> reviews = offerFinancialReviewRepository.findByMaintenanceRecordId(record.getId());
        if (!reviews.isEmpty()) {
            offerFinancialReviewRepository.deleteAll(reviews);
            log.info("Deleted associated OfferFinancialReviews for maintenance record: {}", record.getId());
        }

        // Delete the maintenance record
        maintenanceRecordRepository.delete(record);

        // Check if there are any remaining active maintenance records for this
        // equipment
        List<MaintenanceRecord> remainingActiveRecords = maintenanceRecordRepository
                .findByEquipmentIdOrderByCreationDateDesc(equipment.getId())
                .stream()
                .filter(r -> r.getStatus() == MaintenanceStatus.ACTIVE)
                .collect(Collectors.toList());

        // If no active maintenance records remain, change equipment status to AVAILABLE
        if (remainingActiveRecords.isEmpty()) {
            equipment.setStatus(EquipmentStatus.AVAILABLE);
            equipmentRepository.save(equipment);
        }
        // If there are still active records, keep equipment status as IN_MAINTENANCE
    }

    public List<User> getMaintenanceTeamUsers() {
        List<Role> maintenanceRoles = Arrays.asList(
                Role.ADMIN,
                Role.MAINTENANCE_MANAGER,
                Role.MAINTENANCE_EMPLOYEE);
        return userRepository.findByRoleIn(maintenanceRoles);
    }

    // Maintenance Step Operations

    public MaintenanceStepDto createMaintenanceStep(UUID maintenanceRecordId, MaintenanceStepDto dto) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(maintenanceRecordId)
                .orElseThrow(
                        () -> new MaintenanceException("Maintenance record not found with id: " + maintenanceRecordId));

        if (record.getStatus() == MaintenanceStatus.PENDING_MANAGER_APPROVAL ||
                record.getStatus() == MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
            throw new MaintenanceException("Cannot add steps while record is pending approval.");
        }
        if (record.getStatus() == MaintenanceStatus.COMPLETED) {
            throw new MaintenanceException("Cannot add steps to a completed record.");
        }

        // Get all existing steps ordered by start date
        List<MaintenanceStep> existingSteps = maintenanceStepRepository
                .findByMaintenanceRecordIdOrderByStartDateAsc(maintenanceRecordId);

        // VALIDATION 1: All previous steps must be completed before adding a new step
        List<MaintenanceStep> incompleteSteps = existingSteps.stream()
                .filter(step -> step.getActualEndDate() == null)
                .collect(Collectors.toList());

        if (!incompleteSteps.isEmpty()) {
            String incompleteStepDescriptions = incompleteSteps.stream()
                    .map(step -> step.getDescription())
                    .collect(Collectors.joining(", "));
            throw new MaintenanceException(
                    "Cannot add new step. Please complete all previous steps first. Incomplete steps: "
                            + incompleteStepDescriptions);
        }

        // VALIDATION 2: New step's start date must be >= latest step's actual
        // completion date
        if (!existingSteps.isEmpty()) {
            MaintenanceStep latestStep = existingSteps.get(existingSteps.size() - 1);
            if (latestStep.getActualEndDate() != null && dto.getStartDate() != null) {
                if (dto.getStartDate().isBefore(latestStep.getActualEndDate())) {
                    throw new MaintenanceException("New step start date must be on or after " +
                            latestStep.getActualEndDate().toLocalDate() +
                            ". The previous step was completed on " +
                            latestStep.getActualEndDate().toLocalDate() + ".");
                }
            }
        }

        // Get the step type
        StepType stepType = stepTypeRepository.findById(dto.getStepTypeId())
                .orElseThrow(() -> new MaintenanceException("Step type not found with id: " + dto.getStepTypeId()));

        // Get the responsible person (can be employee, contact, or merchant)
        Contact responsibleContact = null;
        Employee responsibleEmployee = null;
        Merchant selectedMerchant = null;

        // Priority 1: Check if employee ID is provided (site employee assignment)
        if (dto.getResponsibleEmployeeId() != null) {
            responsibleEmployee = employeeRepository.findById(dto.getResponsibleEmployeeId())
                    .orElseThrow(() -> new MaintenanceException(
                            "Employee not found with id: " + dto.getResponsibleEmployeeId()));
            log.info("Assigned employee {} as responsible person for step",
                    responsibleEmployee.getFirstName() + " " + responsibleEmployee.getLastName());
        } else {
            // Not an employee, so it must be a Merchant Contact (or just Merchant)

            // Priority 2: Check for Contact (The human responsible)
            if (dto.getResponsibleContactId() != null) {
                responsibleContact = contactRepository.findById(dto.getResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException(
                                "Contact not found with ID: " + dto.getResponsibleContactId()));

                // CRITICAL: A contact MUST belong to a merchant (as per domain rules)
                // Automatically assign the contact's merchant to this step
                if (responsibleContact.getMerchant() != null) {
                    selectedMerchant = responsibleContact.getMerchant();
                } else if (dto.getSelectedMerchantId() != null) {
                    // Fallback to manually selected merchant if contact has no linked merchant
                    // (should not happen normally)
                    selectedMerchant = merchantRepository.findById(dto.getSelectedMerchantId())
                            .orElseThrow(() -> new MaintenanceException(
                                    "Merchant not found with id: " + dto.getSelectedMerchantId()));
                }

                log.info("Assigned contact {} (Merchant: {}) as responsible person for step",
                        responsibleContact.getFullName(),
                        selectedMerchant != null ? selectedMerchant.getName() : "None");

            } else if (dto.getSelectedMerchantId() != null) {
                // Priority 3: Merchant only (no specific human contact selected yet)
                selectedMerchant = merchantRepository.findById(dto.getSelectedMerchantId())
                        .orElseThrow(() -> new MaintenanceException(
                                "Merchant not found with id: " + dto.getSelectedMerchantId()));
                log.info("Assigned merchant {} as responsible for step", selectedMerchant.getName());
            }
        }

        // LOCATION TRACKING LOGIC
        // Determine current location based on previous steps and equipment site
        String currentLocation = "";
        if (!existingSteps.isEmpty()) {
            // Get the last completed step
            MaintenanceStep lastStep = existingSteps.get(existingSteps.size() - 1);
            // If last step was a TRANSPORT, current location is its toLocation
            if (lastStep.getStepType() != null && "TRANSPORT".equalsIgnoreCase(lastStep.getStepType().getName())) {
                currentLocation = lastStep.getToLocation() != null ? lastStep.getToLocation() : "";
            } else {
                // Otherwise, inherit location from last step (whether fromLocation or
                // toLocation)
                currentLocation = lastStep.getToLocation() != null && !lastStep.getToLocation().isEmpty()
                        ? lastStep.getToLocation()
                        : (lastStep.getFromLocation() != null ? lastStep.getFromLocation() : "");
            }
        } else {
            // No previous steps, get location from equipment's site
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId()).orElse(null);
            if (equipment != null && equipment.getSite() != null) {
                currentLocation = equipment.getSite().getName();
            }
        }

        // For TRANSPORT steps, fromLocation is current location, toLocation is
        // user-specified
        // For non-TRANSPORT steps, both fromLocation and toLocation can be the current
        // location
        String fromLocation = dto.getFromLocation() != null && !dto.getFromLocation().isEmpty()
                ? dto.getFromLocation()
                : currentLocation;
        String toLocation = dto.getToLocation() != null ? dto.getToLocation() : "";

        // Calculate remaining amount
        BigDecimal expectedCost = dto.getExpectedCost() != null ? dto.getExpectedCost() : BigDecimal.ZERO;
        BigDecimal downPayment = dto.getDownPayment() != null ? dto.getDownPayment() : BigDecimal.ZERO;
        BigDecimal remaining;
        boolean remainingManuallySet = false;

        if (dto.getRemainingManuallySet() != null && dto.getRemainingManuallySet() && dto.getRemaining() != null) {
            // User manually set the remaining value
            remaining = dto.getRemaining();
            remainingManuallySet = true;
        } else {
            // Auto-calculate remaining = expectedCost - downPayment
            remaining = expectedCost.subtract(downPayment);
        }

        MaintenanceStep step = MaintenanceStep.builder()
                .maintenanceRecord(record)
                .stepType(stepType)
                .description(dto.getDescription())
                .responsibleContact(responsibleContact)
                .responsibleEmployee(responsibleEmployee)
                .selectedMerchant(selectedMerchant)
                .startDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDateTime.now())
                .expectedEndDate(dto.getExpectedEndDate())
                .fromLocation(fromLocation)
                .toLocation(toLocation)
                .stepCost(dto.getStepCost() != null ? dto.getStepCost() : BigDecimal.ZERO)
                .downPayment(downPayment)
                .expectedCost(expectedCost)
                .remaining(remaining)
                .remainingManuallySet(remainingManuallySet)
                .actualCost(dto.getActualCost())
                .notes(dto.getNotes())
                .build();

        MaintenanceStep savedStep = maintenanceStepRepository.save(step);

        // Handle merchant items if merchant is selected
        if (selectedMerchant != null && dto.getMerchantItems() != null && !dto.getMerchantItems().isEmpty()) {
            final MaintenanceStep finalStep = savedStep;
            List<MaintenanceStepMerchantItem> merchantItems = dto.getMerchantItems().stream()
                    .map(itemDto -> MaintenanceStepMerchantItem.builder()
                            .maintenanceStep(finalStep)
                            .description(itemDto.getDescription())
                            .cost(itemDto.getCost())
                            .build())
                    .collect(Collectors.toList());
            savedStep.setMerchantItems(merchantItems);
            savedStep = maintenanceStepRepository.save(savedStep);
        }

        // Update main record's current responsible contact (prefer employee over
        // contact for display)
        if (responsibleEmployee != null) {
            // We still need a contact for the record, so keep as null or handle differently
            record.setCurrentResponsibleContact(responsibleContact);
        } else {
            record.setCurrentResponsibleContact(responsibleContact);
        }
        maintenanceRecordRepository.save(record);

        // If this is the FIRST step and status is APPROVED_BY_FINANCE, activate the
        // record
        if (record.getStatus() == MaintenanceStatus.APPROVED_BY_FINANCE) {
            // Check if this is indeed the first step (existingSteps only contained steps
            // before this one was saved)
            // But we already saved this step, so steps count should be >= 1.
            // Actually, we can just check the current status.
            record.setStatus(MaintenanceStatus.ACTIVE);
            log.info("Record {} transitioned from APPROVED_BY_FINANCE to ACTIVE upon adding first step",
                    record.getId());
            maintenanceRecordRepository.save(record);
        }

        // Flush to ensure valid data before sending notifications
        maintenanceStepRepository.flush();

        // Send notifications
        try {
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found"));

            String notificationTitle = "New Maintenance Step Added";
            String notificationMessage = String.format("New %s step added for equipment '%s'. Responsible: %s",
                    stepType.getName(),
                    equipment.getName(),
                    responsibleEmployee != null
                            ? responsibleEmployee.getFirstName() + " " + responsibleEmployee.getLastName()
                            : (responsibleContact != null
                                    ? responsibleContact.getFirstName() + " " + responsibleContact.getLastName()
                                    : "Not assigned"));
            String actionUrl = "/maintenance/records/" + record.getId() + "?tab=steps";
            String relatedEntity = record.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE,
                    Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity);

            log.info("Maintenance step creation notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send maintenance step creation notifications: {}", e.getMessage());
        }

        return convertToDto(savedStep);
    }

    public MaintenanceStepDto getMaintenanceStep(UUID id) {
        MaintenanceStep step = maintenanceStepRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + id));

        return convertToDto(step);
    }

    public List<MaintenanceStepDto> getMaintenanceSteps(UUID maintenanceRecordId) {
        return maintenanceStepRepository.findByMaintenanceRecordIdOrderByStartDateAsc(maintenanceRecordId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public MaintenanceStepDto updateMaintenanceStep(UUID id, MaintenanceStepDto dto) {
        MaintenanceStep step = maintenanceStepRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + id));
        MaintenanceRecord record = step.getMaintenanceRecord();

        // Validation: Prevent modification if pending approval
        if (record.getStatus() == MaintenanceStatus.PENDING_MANAGER_APPROVAL ||
                record.getStatus() == MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
            throw new MaintenanceException("Cannot update steps while record is pending approval.");
        }
        if (record.getStatus() == MaintenanceStatus.COMPLETED) {
            throw new MaintenanceException("Cannot update steps of a completed record.");
        }

        // Update step type if provided
        if (dto.getStepTypeId() != null) {
            StepType stepType = stepTypeRepository.findById(dto.getStepTypeId())
                    .orElseThrow(() -> new MaintenanceException("Step type not found with id: " + dto.getStepTypeId()));
            step.setStepType(stepType);
        }

        if (dto.getDescription() != null) {
            step.setDescription(dto.getDescription());
        }

        // Update responsible person based on what's provided
        if (dto.getResponsibleEmployeeId() != null) {
            Employee employee = employeeRepository.findById(dto.getResponsibleEmployeeId())
                    .orElseThrow(() -> new MaintenanceException(
                            "Employee not found with id: " + dto.getResponsibleEmployeeId()));
            step.setResponsibleEmployee(employee);
            step.setResponsibleContact(null);
            step.setSelectedMerchant(null);
        } else {
            // Not an employee, so it must be a Merchant Contact (or just Merchant)

            // Priority 2: Check for Contact Change
            if (dto.getResponsibleContactId() != null) {
                Contact contact = contactRepository.findById(dto.getResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException(
                                "Contact not found with id: " + dto.getResponsibleContactId()));
                step.setResponsibleContact(contact);

                // CRITICAL: A contact MUST belong to a merchant
                // Automatically assign the contact's merchant to this step
                if (contact.getMerchant() != null) {
                    step.setSelectedMerchant(contact.getMerchant());
                } else if (dto.getSelectedMerchantId() != null) {
                    Merchant merchant = merchantRepository.findById(dto.getSelectedMerchantId())
                            .orElseThrow(() -> new MaintenanceException(
                                    "Merchant not found with id: " + dto.getSelectedMerchantId()));
                    step.setSelectedMerchant(merchant);
                }

                // Ensure we clear any site employee settings
                step.setResponsibleEmployee(null);

            } else if (dto.getSelectedMerchantId() != null) {
                // Priority 3: Merchant only (no specific human contact or changing merchant)
                Merchant merchant = merchantRepository.findById(dto.getSelectedMerchantId())
                        .orElseThrow(() -> new MaintenanceException(
                                "Merchant not found with id: " + dto.getSelectedMerchantId()));
                step.setSelectedMerchant(merchant);

                // If we set a merchant explicitly without a contact, do we clear the old
                // contact?
                // Logic: If I change from "Merchant A - Bob" to "Merchant B", Bob is invalid.
                // So yes, if I set a Merchant explicitly and didn't provide a contact, I likely
                // mean "Merchant B (Generic)".
                // UNTLESS the frontend sends full object state.

                // Front-end sends responsibleContactId: null if not selected.
                // If it was selected before, it will be null now if deselected.
                // However, `if (dto.getResponsibleContactId() != null)` only catches NON-NULL.
                // If the user UNSETS the contact, we need to handle that.
                // But wait, the frontend sends everything.
                // If I switch from "Merchant A - Bob" to "Merchant B", `responsibleContactId`
                // will be null.
                // My code above only enters `if (dto.getResponsibleContactId() != null)`.
                // So it goes to `else if (dto.getSelectedMerchantId() != null)`.
                // Here, I set the Merchant. I MUST clear the Contact because the old contact
                // (Bob) belongs to Merchant A.
                step.setResponsibleContact(null);

                // Ensure we clear any site employee settings
                step.setResponsibleEmployee(null);
            }
        }

        if (dto.getStartDate() != null) {
            step.setStartDate(dto.getStartDate());
        }
        if (dto.getExpectedEndDate() != null) {
            step.setExpectedEndDate(dto.getExpectedEndDate());
        }
        if (dto.getFromLocation() != null) {
            step.setFromLocation(dto.getFromLocation());
        }
        if (dto.getToLocation() != null) {
            step.setToLocation(dto.getToLocation());
        }

        // Update cost fields
        if (dto.getStepCost() != null) {
            step.setStepCost(dto.getStepCost());
        }
        if (dto.getDownPayment() != null) {
            step.setDownPayment(dto.getDownPayment());
        }
        if (dto.getExpectedCost() != null) {
            step.setExpectedCost(dto.getExpectedCost());
        }
        if (dto.getActualCost() != null) {
            step.setActualCost(dto.getActualCost());
        }

        // Handle remaining field with auto-calculation logic
        if (dto.getRemainingManuallySet() != null && dto.getRemainingManuallySet() && dto.getRemaining() != null) {
            // User manually set the remaining value
            step.setRemaining(dto.getRemaining());
            step.setRemainingManuallySet(true);
        } else if (dto.getDownPayment() != null || dto.getExpectedCost() != null) {
            // Auto-calculate remaining = expectedCost - downPayment
            BigDecimal expectedCost = dto.getExpectedCost() != null ? dto.getExpectedCost() : step.getExpectedCost();
            BigDecimal downPayment = dto.getDownPayment() != null ? dto.getDownPayment() : step.getDownPayment();
            if (expectedCost != null && downPayment != null) {
                step.setRemaining(expectedCost.subtract(downPayment));
                step.setRemainingManuallySet(false);
            }
        }

        if (dto.getNotes() != null) {
            step.setNotes(dto.getNotes());
        }

        MaintenanceStep savedStep = maintenanceStepRepository.save(step);

        // Recalculate total cost of parent record
        updateRecordTotalCost(step.getMaintenanceRecord().getId());

        return convertToDto(savedStep);
    }

    public void deleteMaintenanceStep(UUID stepId) {
        MaintenanceStep step = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));

        MaintenanceRecord record = step.getMaintenanceRecord();
        UUID recordId = record.getId();

        // Validation: Prevent modification if pending approval
        if (record.getStatus() == MaintenanceStatus.PENDING_MANAGER_APPROVAL ||
                record.getStatus() == MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
            throw new MaintenanceException("Cannot delete steps while record is pending approval.");
        }
        if (record.getStatus() == MaintenanceStatus.COMPLETED) {
            throw new MaintenanceException("Cannot delete steps of a completed record.");
        }

        maintenanceStepRepository.delete(step);

        // Recalculate total cost of parent record
        updateRecordTotalCost(recordId);
    }

    public MaintenanceStepDto markStepAsFinal(UUID stepId) {
        MaintenanceStep stepToMark = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));

        MaintenanceRecord record = stepToMark.getMaintenanceRecord();

        // Ensure no other step is marked as final
        maintenanceStepRepository.findByMaintenanceRecordIdOrderByStartDateAsc(record.getId()).forEach(s -> {
            if (!s.getId().equals(stepId) && s.isFinalStep()) {
                s.setFinalStep(false);
                maintenanceStepRepository.save(s);
            }
        });

        stepToMark.setFinalStep(true);
        MaintenanceStep savedStep = maintenanceStepRepository.save(stepToMark);

        // Send notifications for marking step as final
        try {
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found"));

            String notificationTitle = "Final Maintenance Step Designated";
            String notificationMessage = String.format("%s step has been marked as the final step for equipment '%s'",
                    savedStep.getStepType().getName(),
                    equipment.getName());
            String actionUrl = "/maintenance/records/" + record.getId() + "?tab=steps";
            String relatedEntity = record.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE,
                    Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity);

            log.info("Final step designation notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send final step designation notifications: {}", e.getMessage());
        }

        // If this step is already completed, trigger record completion logic
        if (savedStep.isCompleted()) {
            completeMaintenanceRecordIfFinalStepCompleted(record);
        }

        return convertToDto(savedStep);
    }

    public void completeMaintenanceStep(UUID stepId, MaintenanceStepDto completionData) {
        MaintenanceStep step = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));

        // Update expected values if provided (these can be filled during completion)
        if (completionData.getExpectedEndDate() != null) {
            step.setExpectedEndDate(completionData.getExpectedEndDate());
        }
        if (completionData.getExpectedCost() != null) {
            step.setExpectedCost(completionData.getExpectedCost());
        }
        if (completionData.getDownPayment() != null) {
            step.setDownPayment(completionData.getDownPayment());
        }

        // Set actual end date from request, or use current time if not provided
        if (completionData.getActualEndDate() != null) {
            step.setActualEndDate(completionData.getActualEndDate());
        } else {
            step.setActualEndDate(LocalDateTime.now());
        }

        // Update actual cost if provided
        if (completionData.getActualCost() != null) {
            step.setActualCost(completionData.getActualCost());
            step.setStepCost(completionData.getActualCost()); // Also update stepCost for backward compatibility
        } else if (completionData.getStepCost() != null) {
            step.setStepCost(completionData.getStepCost());
        }

        // Recalculate remaining if expected values were updated
        if (step.getExpectedCost() != null && step.getDownPayment() != null) {
            step.setRemaining(step.getExpectedCost().subtract(step.getDownPayment()));
        }

        maintenanceStepRepository.save(step);

        // Recalculate total cost of parent record
        updateRecordTotalCost(step.getMaintenanceRecord().getId());

        // Send notifications for step completion
        try {
            MaintenanceRecord record = step.getMaintenanceRecord();
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found"));

            String notificationTitle = "Maintenance Step Completed";
            String notificationMessage = String.format("%s step completed for equipment '%s'. Cost: %.2f",
                    step.getStepType().getName(),
                    equipment.getName(),
                    step.getStepCost() != null ? step.getStepCost() : BigDecimal.ZERO);
            String actionUrl = "/maintenance/records/" + record.getId() + "?tab=steps";
            String relatedEntity = record.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE,
                    Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity);

            log.info("Maintenance step completion notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send maintenance step completion notifications: {}", e.getMessage());
        }

        // If this was the final step, complete the parent record
        if (step.isFinalStep()) {
            completeMaintenanceRecordIfFinalStepCompleted(step.getMaintenanceRecord());
        }
    }

    public void handoffToNextStep(UUID stepId, MaintenanceStepDto nextStepDto) {
        // Complete with current timestamp and existing cost
        MaintenanceStepDto completionData = new MaintenanceStepDto();
        completionData.setActualEndDate(LocalDateTime.now());
        completeMaintenanceStep(stepId, completionData);
        createMaintenanceStep(nextStepDto.getMaintenanceRecordId(), nextStepDto);
    }

    /**
     * Complete a maintenance record when its final step is completed.
     * Also handles equipment status changes considering other active maintenance
     * records.
     */
    private void completeMaintenanceRecordIfFinalStepCompleted(MaintenanceRecord record) {
        // Complete the maintenance record
        record.setStatus(MaintenanceStatus.COMPLETED);
        record.setActualCompletionDate(LocalDateTime.now());
        maintenanceRecordRepository.save(record);

        // Handle equipment status change
        Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found for record"));

        // Check if there are other active maintenance records for this equipment
        List<MaintenanceRecord> otherActiveRecords = maintenanceRecordRepository
                .findByEquipmentIdOrderByCreationDateDesc(equipment.getId())
                .stream()
                .filter(r -> r.getStatus() == MaintenanceStatus.ACTIVE &&
                        !r.getId().equals(record.getId()))
                .collect(Collectors.toList());

        // Only set equipment to AVAILABLE if no other active maintenance records exist
        if (otherActiveRecords.isEmpty()) {
            equipment.setStatus(EquipmentStatus.AVAILABLE);
            equipmentRepository.save(equipment);
            log.info("Equipment {} status changed to AVAILABLE - no other active maintenance records",
                    equipment.getId());
        } else {
            log.info("Equipment {} remains IN_MAINTENANCE - {} other active maintenance records exist",
                    equipment.getId(), otherActiveRecords.size());
        }

        // Send notifications for maintenance record completion
        try {
            String notificationTitle = "Maintenance Completed";
            String notificationMessage = String.format(
                    "Maintenance completed for equipment '%s' (%s). Total cost: %.2f. Equipment status: %s",
                    equipment.getName(),
                    equipment.getFullModelName(),
                    record.getTotalCost() != null ? record.getTotalCost() : BigDecimal.ZERO,
                    otherActiveRecords.isEmpty() ? "Available" : "Still in maintenance");
            String actionUrl = "/maintenance/records/" + record.getId();
            String relatedEntity = record.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE,
                    Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity);

            log.info("Maintenance record completion notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send maintenance record completion notifications: {}", e.getMessage());
        }
    }

    public MaintenanceStepDto assignContactToStep(UUID stepId, UUID contactId) {
        MaintenanceStep step = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));

        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new MaintenanceException("Contact not found with ID: " + contactId));

        step.setResponsibleContact(contact);

        MaintenanceStep savedStep = maintenanceStepRepository.save(step);

        // Update main record's current responsible contact if this is the current step
        MaintenanceRecord record = step.getMaintenanceRecord();
        Optional<MaintenanceStep> currentStep = maintenanceStepRepository
                .findCurrentStepByMaintenanceRecordId(record.getId());
        if (currentStep.isPresent() && currentStep.get().getId().equals(stepId)) {
            record.setCurrentResponsibleContact(contact);
            maintenanceRecordRepository.save(record);
        }

        // Send notifications for responsible person assignment
        try {
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found"));

            String notificationTitle = "Maintenance Responsibility Assigned";
            String notificationMessage = String.format(
                    "%s %s has been assigned as responsible person for %s step on equipment '%s'",
                    contact.getFirstName(),
                    contact.getLastName(),
                    savedStep.getStepType().getName(),
                    equipment.getName());
            String actionUrl = "/maintenance/records/" + record.getId() + "?tab=steps";
            String relatedEntity = record.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE,
                    Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity);

            log.info("Responsible person assignment notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send responsible person assignment notifications: {}", e.getMessage());
        }

        return convertToDto(savedStep);
    }

    // Contact Log Operations

    public ContactLogDto createContactLog(UUID stepId, ContactLogDto dto) {
        MaintenanceStep step = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));

        ContactLog contactLog = ContactLog.builder()
                .maintenanceStep(step)
                .maintenanceRecord(step.getMaintenanceRecord())
                .contactMethod(dto.getContactMethod())
                .contactPerson(dto.getContactPerson())
                .contactDetails(dto.getContactDetails())
                .contactStatus(dto.getContactStatus())
                .responseReceived(dto.getResponseReceived())
                .responseDetails(dto.getResponseDetails())
                .followUpRequired(dto.getFollowUpRequired())
                .followUpDate(dto.getFollowUpDate())
                .notes(dto.getNotes())
                .build();

        ContactLog savedLog = contactLogRepository.save(contactLog);

        // Update step's last contact date
        step.updateLastContact();
        maintenanceStepRepository.save(step);

        return convertToDto(savedLog);
    }

    public List<ContactLogDto> getContactLogs(UUID maintenanceRecordId) {
        return contactLogRepository.findByMaintenanceRecordIdOrderByContactDateDesc(maintenanceRecordId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Dashboard and Analytics

    public MaintenanceDashboardDto getDashboardData() {
        long totalRecords = maintenanceRecordRepository.count();
        long activeRecords = maintenanceRecordRepository.countByStatus(MaintenanceStatus.ACTIVE);
        long overdueRecords = maintenanceRecordRepository.findOverdueRecords(LocalDateTime.now()).size();
        long completedRecords = maintenanceRecordRepository
                .countByStatus(MaintenanceStatus.COMPLETED);

        // Get recent records for dashboard display
        List<MaintenanceRecordDto> recentRecords = maintenanceRecordRepository.findAll().stream()
                .limit(5)
                .map(this::convertToDto)
                .collect(Collectors.toList());

        // Calculate performance metrics
        double completionRate = totalRecords > 0 ? (double) completedRecords / totalRecords * 100 : 0;

        // Calculate cost metrics
        double totalCost = maintenanceRecordRepository.findAll().stream()
                .mapToDouble(record -> record.getTotalCost() != null ? record.getTotalCost().doubleValue() : 0.0)
                .sum();
        double averageCost = totalRecords > 0 ? totalCost / totalRecords : 0;

        // Calculate step metrics
        long totalSteps = maintenanceStepRepository.count();
        long completedSteps = maintenanceStepRepository.findAll().stream()
                .filter(MaintenanceStep::isCompleted)
                .count();
        long activeSteps = totalSteps - completedSteps;

        // Calculate equipment metrics - use findAll and filter instead of non-existent
        // countByStatus
        List<Equipment> allEquipment = equipmentRepository.findAll();
        long equipmentInMaintenance = allEquipment.stream()
                .filter(eq -> eq.getStatus() == EquipmentStatus.IN_MAINTENANCE)
                .count();
        long equipmentAvailable = allEquipment.stream()
                .filter(eq -> eq.getStatus() == EquipmentStatus.AVAILABLE)
                .count();

        return MaintenanceDashboardDto.builder()
                .totalRecords(totalRecords)
                .activeRecords(activeRecords)
                .overdueRecords(overdueRecords)
                .completedRecords(completedRecords)
                .recentRecords(recentRecords)
                .completionRate(completionRate)
                .totalCost(totalCost)
                .averageCost(averageCost)
                .totalSteps(totalSteps)
                .completedSteps(completedSteps)
                .activeSteps(activeSteps)
                .equipmentInMaintenance(equipmentInMaintenance)
                .equipmentAvailable(equipmentAvailable)
                .build();

    }

    private MaintenanceRecordDto convertToDto(MaintenanceRecord record) {
        if (record == null)
            return null;

        // Get maintenance steps
        List<MaintenanceStep> steps = maintenanceStepRepository
                .findByMaintenanceRecordIdOrderByStartDateAsc(record.getId());

        List<MaintenanceStepDto> stepDtos = steps.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        // Calculate steps stats
        int totalSteps = stepDtos.size();
        int completedSteps = (int) stepDtos.stream().filter(MaintenanceStepDto::getIsCompleted).count();
        int activeSteps = totalSteps - completedSteps;

        // Get current step info
        String currentStepDescription = null;
        String currentStepResponsiblePerson = null;
        LocalDateTime currentStepExpectedEndDate = null;
        boolean currentStepIsOverdue = false;

        Optional<MaintenanceStepDto> currentStep = stepDtos.stream()
                .filter(s -> !s.getIsCompleted())
                .findFirst();

        if (currentStep.isPresent()) {
            currentStepDescription = currentStep.get().getDescription() + " (" + currentStep.get().getStepTypeName()
                    + ")";
            currentStepResponsiblePerson = currentStep.get().getResponsiblePerson();
            currentStepExpectedEndDate = currentStep.get().getExpectedEndDate();
            currentStepIsOverdue = currentStep.get().getIsOverdue();
        }

        // Get responsible person details
        String responsiblePersonName = record.getCurrentResponsiblePersonName();
        String responsiblePersonPhone = record.getCurrentResponsiblePersonPhone();
        String responsiblePersonEmail = record.getCurrentResponsiblePersonEmail();

        // Fetch rejection reason if status is REJECTED
        // Fetch reviews for timeline and rejection reason
        List<OfferFinancialReview> reviews = offerFinancialReviewRepository
                .findByMaintenanceRecordIdOrderByCreatedAtDesc(record.getId());

        // Fetch rejection reason if status is REJECTED
        String rejectionReason = null;
        if (record.getStatus() == MaintenanceStatus.REJECTED) {
            if (!reviews.isEmpty()) {
                // The latest review should be the one that rejected it
                Optional<OfferFinancialReview> rejectedReview = reviews.stream()
                        .filter(r -> r
                                .getStatus() == com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.REJECTED)
                        .findFirst();

                if (rejectedReview.isPresent()) {
                    rejectionReason = rejectedReview.get().getRejectionReason();
                }
            }
        }

        // Build Timeline Logic
        List<MaintenanceTimelineEventDto> timelineEvents = new ArrayList<>();

        // 1. Created
        timelineEvents.add(MaintenanceTimelineEventDto.builder()
                .timestamp(record.getCreationDate())
                .title("Maintenance Record Created")
                .description("Initial record created")
                .type("CREATED")
                .actorName("System") // Or creator if we had it easily accessible
                .build());

        // 2. Manager Approval
        if (record.getManagerApprovalDate() != null) {
            timelineEvents.add(MaintenanceTimelineEventDto.builder()
                    .timestamp(record.getManagerApprovalDate())
                    .title("Manager Approved")
                    .description("Approved by Maintenance Manager")
                    .type("APPROVED")
                    .actorName("Manager")
                    .build());
        }

        // 3. Finance Events
        for (OfferFinancialReview review : reviews) {
            // Submitted to Finance (Review Created)
            timelineEvents.add(MaintenanceTimelineEventDto.builder()
                    .timestamp(review.getCreatedAt())
                    .title("Submitted to Finance")
                    .description("Submitted for financial review")
                    .type("INFO")
                    .actorName("System")
                    .build());

            // Review Outcome
            if (review
                    .getStatus() != com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.PENDING) {
                String reviewType = (review
                        .getStatus() == com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.APPROVED)
                                ? "APPROVED"
                                : "REJECTED";
                String reviewTitle = (review
                        .getStatus() == com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.APPROVED)
                                ? "Finance Approved"
                                : "Finance Rejected";
                String reviewDesc = (review
                        .getStatus() == com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus.APPROVED)
                                ? "Approved by Finance Team"
                                : "Rejected: " + review.getRejectionReason();

                timelineEvents.add(MaintenanceTimelineEventDto.builder()
                        .timestamp(review.getReviewedAt() != null ? review.getReviewedAt() : review.getUpdatedAt())
                        .title(reviewTitle)
                        .description(reviewDesc)
                        .type(reviewType)
                        .actorName(review.getReviewedByUserName() != null ? review.getReviewedByUserName()
                                : "Finance Team")
                        .build());
            }
        }

        // 4. Completion
        if (record.getActualCompletionDate() != null) {
            timelineEvents.add(MaintenanceTimelineEventDto.builder().timestamp(record.getActualCompletionDate())
                    .title("Maintenance Completed").description("Work completed").type("COMPLETED").actorName("System")
                    .build());
        }

        // Sort events by timeline
        timelineEvents.sort(Comparator.comparing(MaintenanceTimelineEventDto::getTimestamp));

        // Get equipment details
        String equipmentName = null;
        String equipmentModel = null;
        String equipmentType = null;
        String equipmentSerialNumber = null;
        String site = null;

        Equipment equipment = equipmentRepository.findById(record.getEquipmentId()).orElse(null);
        if (equipment != null) {
            equipmentName = equipment.getName();
            equipmentModel = equipment.getModel();
            equipmentType = equipment.getType() != null ? equipment.getType().getName() : null;
            equipmentSerialNumber = equipment.getSerialNumber();
            site = equipment.getSite() != null ? equipment.getSite().getName() : null;
        }

        // Only recalculate cost from steps if there are steps, otherwise preserve the
        // record's totalCost
        BigDecimal totalCost;
        if (!steps.isEmpty()) {
            totalCost = steps.stream()
                    .map(step -> step.getStepCost() != null ? step.getStepCost() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            // We don't save here to avoid side effects in GET, but we return the calculated
            // cost
        } else {
            totalCost = record.getTotalCost() != null ? record.getTotalCost() : BigDecimal.ZERO;
        }

        return MaintenanceRecordDto.builder().id(record.getId()).equipmentId(record.getEquipmentId())
                .equipmentInfo(record.getEquipmentInfo()).finalDescription(record.getFinalDescription())
                .issueDate(record.getIssueDate()).sparePartName(record.getSparePartName())
                .creationDate(record.getCreationDate()).expectedCompletionDate(record.getExpectedCompletionDate())
                .actualCompletionDate(record.getActualCompletionDate()).totalCost(totalCost).status(record.getStatus())
                .rejectionReason(rejectionReason)
                .responsibleUserId(record.getResponsibleUser() != null ? record.getResponsibleUser().getId() : null)
                .currentResponsibleContactId(
                        record.getCurrentResponsibleContact() != null ? record.getCurrentResponsibleContact().getId()
                                : null)
                .lastUpdated(record.getLastUpdated()).version(record.getVersion()).isOverdue(record.isOverdue())
                .durationInDays(record.getDurationInDays()).totalSteps(totalSteps).completedSteps(completedSteps)
                .activeSteps(activeSteps).steps(stepDtos).timelineEvents(timelineEvents)
                .currentStepDescription(currentStepDescription)
                .currentStepResponsiblePerson(currentStepResponsiblePerson)
                .currentStepExpectedEndDate(currentStepExpectedEndDate).currentStepIsOverdue(currentStepIsOverdue)
                .equipmentName(equipmentName).equipmentModel(equipmentModel).equipmentType(equipmentType)
                .equipmentSerialNumber(equipmentSerialNumber).site(site).currentResponsiblePerson(responsiblePersonName)
                .currentResponsiblePhone(responsiblePersonPhone).currentResponsibleEmail(responsiblePersonEmail)
                .build();
    }

    private MaintenanceStepDto convertToDto(MaintenanceStep step) {
        // Format step type name in title case (TRANSPORT -> Transport)
        String stepTypeName = null;
        if (step.getStepType() != null && step.getStepType().getName() != null) {
            String name = step.getStepType().getName();
            stepTypeName = name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
        }

        // Convert merchant items to DTOs
        List<MaintenanceStepMerchantItemDto> merchantItemDtos = null;
        if (step.getMerchantItems() != null && !step.getMerchantItems().isEmpty()) {
            merchantItemDtos = step.getMerchantItems().stream()
                    .map(item -> MaintenanceStepMerchantItemDto.builder()
                            .id(item.getId())
                            .description(item.getDescription())
                            .cost(item.getCost())
                            .build())
                    .collect(Collectors.toList());
        }

        return MaintenanceStepDto.builder()
                .id(step.getId())
                .maintenanceRecordId(step.getMaintenanceRecord().getId())
                .stepTypeId(step.getStepType() != null ? step.getStepType().getId() : null)
                .stepTypeName(stepTypeName)
                .description(step.getDescription())
                .responsibleContactId(
                        step.getResponsibleContact() != null ? step.getResponsibleContact().getId() : null)
                .responsibleEmployeeId(
                        step.getResponsibleEmployee() != null ? step.getResponsibleEmployee().getId() : null)
                .selectedMerchantId(step.getSelectedMerchant() != null ? step.getSelectedMerchant().getId() : null)
                .merchantItems(merchantItemDtos)
                .contactEmail(step.getResponsibleContact() != null ? step.getResponsibleContact().getEmail()
                        : (step.getResponsibleEmployee() != null ? step.getResponsibleEmployee().getEmail() : null))
                .contactSpecialization(
                        step.getResponsibleContact() != null ? step.getResponsibleContact().getSpecialization()
                                : (step.getResponsibleEmployee() != null
                                        && step.getResponsibleEmployee().getJobPosition() != null
                                                ? step.getResponsibleEmployee().getJobPosition().getPositionName()
                                                : null))
                .lastContactDate(step.getLastContactDate())
                .startDate(step.getStartDate())
                .expectedEndDate(step.getExpectedEndDate())
                .actualEndDate(step.getActualEndDate())
                .fromLocation(step.getFromLocation())
                .toLocation(step.getToLocation())
                .stepCost(step.getStepCost())
                .downPayment(step.getDownPayment())
                .expectedCost(step.getExpectedCost())
                .actualCost(step.getActualCost())
                .remaining(step.getRemaining())
                .remainingManuallySet(step.isRemainingManuallySet())
                .notes(step.getNotes())
                .isFinalStep(step.isFinalStep())
                .createdAt(step.getCreatedAt())
                .updatedAt(step.getUpdatedAt())
                .version(step.getVersion())
                .isCompleted(step.isCompleted())
                .isOverdue(step.isOverdue())
                .durationInHours(step.getDurationInHours())
                .needsFollowUp(step.needsFollowUp())
                .responsiblePerson(step.getResponsiblePersonName())
                .personPhoneNumber(step.getResponsiblePersonPhone())
                .build();
    }

    private ContactLogDto convertToDto(ContactLog contactLog) {
        return ContactLogDto.builder()
                .id(contactLog.getId())
                .maintenanceStepId(contactLog.getMaintenanceStep().getId())
                .maintenanceRecordId(contactLog.getMaintenanceRecord().getId())
                .contactMethod(contactLog.getContactMethod())
                .contactPerson(contactLog.getContactPerson())
                .contactDetails(contactLog.getContactDetails())
                .contactStatus(contactLog.getContactStatus())
                .responseReceived(contactLog.getResponseReceived())
                .responseDetails(contactLog.getResponseDetails())
                .followUpRequired(contactLog.getFollowUpRequired())
                .followUpDate(contactLog.getFollowUpDate())
                .contactDate(contactLog.getContactDate())
                .notes(contactLog.getNotes())
                .isFollowUpOverdue(contactLog.isFollowUpOverdue())
                .daysSinceContact(contactLog.getContactDate() != null
                        ? java.time.Duration.between(contactLog.getContactDate(), LocalDateTime.now()).toDays()
                        : null)
                .build();
    }

    private void updateRecordTotalCost(UUID recordId) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(recordId)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + recordId));

        List<MaintenanceStep> steps = maintenanceStepRepository.findByMaintenanceRecordIdOrderByStartDateAsc(recordId);

        BigDecimal totalCost = steps.stream()
                .map(step -> step.getStepCost() != null ? step.getStepCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        record.setTotalCost(totalCost);
        maintenanceRecordRepository.save(record);
    }

    /**
     * Create default maintenance steps for a new maintenance record.
     * Creates 4 steps: Transport, Purchasing Spare Parts, Maintenance, Transport
     * Back to Site
     */
    private void createDefaultMaintenanceSteps(MaintenanceRecord record, Equipment equipment) {
        try {
            // Get equipment site name for Transport Back step
            String equipmentSite = equipment.getSite() != null ? equipment.getSite().getName() : "";

            // Find step types by name
            StepType transportType = stepTypeRepository.findAll().stream()
                    .filter(st -> "TRANSPORT".equalsIgnoreCase(st.getName()))
                    .findFirst()
                    .orElse(null);

            StepType purchasingType = stepTypeRepository.findAll().stream()
                    .filter(st -> "PURCHASING_SPARE_PARTS".equalsIgnoreCase(st.getName()) ||
                            "PURCHASING".equalsIgnoreCase(st.getName()))
                    .findFirst()
                    .orElse(null);

            StepType maintenanceType = stepTypeRepository.findAll().stream()
                    .filter(st -> "MAINTENANCE".equalsIgnoreCase(st.getName()))
                    .findFirst()
                    .orElse(null);

            StepType transportBackType = stepTypeRepository.findAll().stream()
                    .filter(st -> "TRANSPORT_BACK_TO_SITE".equalsIgnoreCase(st.getName()) ||
                            "TRANSPORT_BACK".equalsIgnoreCase(st.getName()))
                    .findFirst()
                    .orElse(transportType); // Fall back to transport type

            LocalDateTime now = LocalDateTime.now();

            // Step 1: Transport (to workshop/service center)
            if (transportType != null) {
                MaintenanceStep step1 = MaintenanceStep.builder()
                        .maintenanceRecord(record)
                        .stepType(transportType)
                        .description("Transport to workshop/service center")
                        .startDate(now)
                        .fromLocation(equipmentSite)
                        .toLocation("")
                        .stepCost(BigDecimal.ZERO)
                        .downPayment(BigDecimal.ZERO)
                        .expectedCost(BigDecimal.ZERO)
                        .remaining(BigDecimal.ZERO)
                        .build();
                maintenanceStepRepository.save(step1);
            }

            // Step 2: Purchasing Spare Parts
            if (purchasingType != null) {
                MaintenanceStep step2 = MaintenanceStep.builder()
                        .maintenanceRecord(record)
                        .stepType(purchasingType)
                        .description("Purchasing spare parts")
                        .startDate(now)
                        .stepCost(BigDecimal.ZERO)
                        .downPayment(BigDecimal.ZERO)
                        .expectedCost(BigDecimal.ZERO)
                        .remaining(BigDecimal.ZERO)
                        .build();
                maintenanceStepRepository.save(step2);
            }

            // Step 3: Maintenance (the actual repair work)
            if (maintenanceType != null) {
                MaintenanceStep step3 = MaintenanceStep.builder()
                        .maintenanceRecord(record)
                        .stepType(maintenanceType)
                        .description("Maintenance/repair work")
                        .startDate(now)
                        .stepCost(BigDecimal.ZERO)
                        .downPayment(BigDecimal.ZERO)
                        .expectedCost(BigDecimal.ZERO)
                        .remaining(BigDecimal.ZERO)
                        .build();
                maintenanceStepRepository.save(step3);
            }

            // Step 4: Transport Back to Site
            if (transportBackType != null) {
                MaintenanceStep step4 = MaintenanceStep.builder()
                        .maintenanceRecord(record)
                        .stepType(transportBackType)
                        .description("Transport back to site")
                        .startDate(now)
                        .fromLocation("")
                        .toLocation(equipmentSite) // Pre-fill with equipment's site
                        .stepCost(BigDecimal.ZERO)
                        .downPayment(BigDecimal.ZERO)
                        .expectedCost(BigDecimal.ZERO)
                        .remaining(BigDecimal.ZERO)
                        .build();
                maintenanceStepRepository.save(step4);
            }

            log.info("Created 4 default maintenance steps for record: {}", record.getId());
        } catch (Exception e) {
            log.error("Failed to create default maintenance steps: {}", e.getMessage());
            // Don't throw exception, just log error - the record was created successfully
        }
    }

    /**
     * Find or create a Contact entity for an Employee.
     * This is used to automatically assign equipment's main driver as responsible
     * person
     * when creating a maintenance record.
     *
     * @param employee The employee to find or create a contact for
     * @return The Contact entity for the employee
     */
    private Contact findOrCreateContactForEmployee(Employee employee) {
        // Try to find existing contact by email
        Optional<Contact> existingContact = contactRepository.findByEmail(employee.getEmail());

        if (existingContact.isPresent()) {
            log.info("Found existing contact for employee {} {}", employee.getFirstName(), employee.getLastName());
            return existingContact.get();
        }

        // Create new contact for the employee
        // Find or create "INTERNAL_STAFF" contact type
        ContactType internalStaffType = contactTypeRepository.findByNameIgnoreCase("INTERNAL_STAFF")
                .or(() -> contactTypeRepository.findByNameIgnoreCase("INTERNAL STAFF"))
                .or(() -> contactTypeRepository.findByNameIgnoreCase("Internal Staff"))
                .orElseGet(() -> {
                    // Create INTERNAL_STAFF type if it doesn't exist
                    ContactType newType = ContactType.builder()
                            .name("INTERNAL_STAFF")
                            .description("Internal staff member")
                            .isActive(true)
                            .build();
                    return contactTypeRepository.save(newType);
                });

        Contact newContact = Contact.builder()
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .email(employee.getEmail())
                .phoneNumber(employee.getPhoneNumber())
                .contactType(internalStaffType)
                .position(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
                .company(employee.getSite() != null ? employee.getSite().getName() : null)
                .isActive(true)
                .notes("Auto-created from employee record for maintenance tracking")
                .build();

        Contact savedContact = contactRepository.save(newContact);
        log.info("Created new contact for employee {} {} with ID {}",
                employee.getFirstName(), employee.getLastName(), savedContact.getId());

        return savedContact;
    }

    /**
     * Get the currently authenticated user
     * 
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
}
