package com.example.backend.services;

import com.example.backend.dtos.*;
import com.example.backend.models.*;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.*;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.models.StepType;
import com.example.backend.repositories.StepTypeRepository;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
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
    private final NotificationService notificationService;
    
    // Maintenance Record Operations
    
    public MaintenanceRecordDto createMaintenanceRecord(MaintenanceRecordDto dto) {
        log.info("Creating new maintenance record for equipment: {}", dto.getEquipmentId());
        
        // Validate equipment exists
        Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found with id: " + dto.getEquipmentId()));
        
        // Allow creating maintenance records even if equipment is already in maintenance

        MaintenanceRecord record = MaintenanceRecord.builder()
                .equipmentId(dto.getEquipmentId())
                .equipmentInfo(dto.getEquipmentInfo() != null ? dto.getEquipmentInfo() :
                        equipment.getType().getName() + " - " + equipment.getFullModelName())
                .initialIssueDescription(dto.getInitialIssueDescription())
                .expectedCompletionDate(dto.getExpectedCompletionDate())
                .status(MaintenanceRecord.MaintenanceStatus.ACTIVE)
                // ADD THIS LINE - Set initial cost from DTO
                .totalCost(dto.getTotalCost() != null ? dto.getTotalCost() :
                        (dto.getEstimatedCost() != null ? dto.getEstimatedCost() : BigDecimal.ZERO))
                .build();
        
        // Set current responsible contact if provided, otherwise use equipment's main driver
        if (dto.getCurrentResponsibleContactId() != null) {
            try {
                Contact contact = contactRepository.findById(dto.getCurrentResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException("Contact not found with ID: " + dto.getCurrentResponsibleContactId()));
                record.setCurrentResponsibleContact(contact);
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to record: {}", dto.getCurrentResponsibleContactId(), e.getMessage());
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
        
        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);
        
        // Update equipment status to IN_MAINTENANCE if not already in maintenance
        if (equipment.getStatus() != EquipmentStatus.IN_MAINTENANCE) {
            equipment.setStatus(EquipmentStatus.IN_MAINTENANCE);
            equipmentRepository.save(equipment);
        }
        
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
                    relatedEntity
            );
            
            log.info("Maintenance record creation notifications sent successfully");
        } catch (Exception e) {
            log.error("Failed to send maintenance record creation notifications: {}", e.getMessage());
        }
        
        log.info("Created maintenance record: {} for equipment: {}", savedRecord.getId(), dto.getEquipmentId());
        return convertToDto(savedRecord);
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
        return maintenanceRecordRepository.findByStatus(MaintenanceRecord.MaintenanceStatus.ACTIVE).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }
    
    public List<MaintenanceRecordDto> getOverdueMaintenanceRecords() {
        return maintenanceRecordRepository.findOverdueRecords(LocalDateTime.now()).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }
    
    public MaintenanceRecordDto completeMaintenanceRecord(UUID id) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));
        
        // Complete the record using the centralized completion logic
        completeMaintenanceRecordIfFinalStepCompleted(record);
        
        return convertToDto(record);
    }
    
    public MaintenanceRecordDto updateMaintenanceRecord(UUID id, MaintenanceRecordDto dto) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(id)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + id));
        
        if (dto.getInitialIssueDescription() != null) {
            record.setInitialIssueDescription(dto.getInitialIssueDescription());
        }
        if (dto.getFinalDescription() != null) {
            record.setFinalDescription(dto.getFinalDescription());
        }
        if (dto.getExpectedCompletionDate() != null) {
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
            if (dto.getStatus() == MaintenanceRecord.MaintenanceStatus.COMPLETED) {
                Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                        .orElseThrow(() -> new MaintenanceException("Equipment not found"));
                
                // Check if there are other active maintenance records for this equipment
                List<MaintenanceRecord> activeRecords = maintenanceRecordRepository.findByEquipmentIdOrderByCreationDateDesc(equipment.getId())
                        .stream()
                        .filter(r -> r.getStatus() == MaintenanceRecord.MaintenanceStatus.ACTIVE && !r.getId().equals(record.getId()))
                        .collect(Collectors.toList());
                
                // Only change equipment status to AVAILABLE if no other active maintenance records exist
                if (activeRecords.isEmpty()) {
                    equipment.setStatus(EquipmentStatus.AVAILABLE);
                    equipmentRepository.save(equipment);
                }
                // If there are still active records, keep equipment status as IN_MAINTENANCE
                
                record.setActualCompletionDate(LocalDateTime.now());
            }
        }
        
        // Update current responsible contact if provided
        if (dto.getCurrentResponsibleContactId() != null) {
            try {
                Contact contact = contactRepository.findById(dto.getCurrentResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException("Contact not found with ID: " + dto.getCurrentResponsibleContactId()));
                record.setCurrentResponsibleContact(contact);
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to record: {}", dto.getCurrentResponsibleContactId(), e.getMessage());
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
        
        // Delete the maintenance record
        maintenanceRecordRepository.delete(record);
        
        // Check if there are any remaining active maintenance records for this equipment
        List<MaintenanceRecord> remainingActiveRecords = maintenanceRecordRepository.findByEquipmentIdOrderByCreationDateDesc(equipment.getId())
                .stream()
                .filter(r -> r.getStatus() == MaintenanceRecord.MaintenanceStatus.ACTIVE)
                .collect(Collectors.toList());
        
        // If no active maintenance records remain, change equipment status to AVAILABLE
        if (remainingActiveRecords.isEmpty()) {
            equipment.setStatus(EquipmentStatus.AVAILABLE);
            equipmentRepository.save(equipment);
        }
        // If there are still active records, keep equipment status as IN_MAINTENANCE
    }
    
    // Maintenance Step Operations
    
    public MaintenanceStepDto createMaintenanceStep(UUID maintenanceRecordId, MaintenanceStepDto dto) {
        MaintenanceRecord record = maintenanceRecordRepository.findById(maintenanceRecordId)
                .orElseThrow(() -> new MaintenanceException("Maintenance record not found with id: " + maintenanceRecordId));
        
        // Get all existing steps ordered by start date
        List<MaintenanceStep> existingSteps = maintenanceStepRepository.findByMaintenanceRecordIdOrderByStartDateAsc(maintenanceRecordId);
        
        // VALIDATION 1: All previous steps must be completed before adding a new step
        List<MaintenanceStep> incompleteSteps = existingSteps.stream()
                .filter(step -> step.getActualEndDate() == null)
                .collect(Collectors.toList());
        
        if (!incompleteSteps.isEmpty()) {
            String incompleteStepDescriptions = incompleteSteps.stream()
                    .map(step -> step.getDescription())
                    .collect(Collectors.joining(", "));
            throw new MaintenanceException("Cannot add new step. Please complete all previous steps first. Incomplete steps: " + incompleteStepDescriptions);
        }
        
        // VALIDATION 2: New step's start date must be >= latest step's actual completion date
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
        
        // Get the responsible person (can be either employee or contact, not both)
        Contact responsibleContact = null;
        Employee responsibleEmployee = null;
        
        // Priority 1: Check if employee ID is provided (site employee assignment)
        if (dto.getResponsibleEmployeeId() != null) {
            responsibleEmployee = employeeRepository.findById(dto.getResponsibleEmployeeId())
                    .orElseThrow(() -> new MaintenanceException("Employee not found with id: " + dto.getResponsibleEmployeeId()));
            log.info("Assigned employee {} as responsible person for step", responsibleEmployee.getFirstName() + " " + responsibleEmployee.getLastName());
        }
        // Priority 2: Check if contact ID is provided (external contact assignment)
        else if (dto.getResponsibleContactId() != null) {
            try {
                responsibleContact = contactRepository.findById(dto.getResponsibleContactId())
                        .orElseThrow(() -> new MaintenanceException("Contact not found with ID: " + dto.getResponsibleContactId()));
                log.info("Assigned contact {} as responsible person for step", responsibleContact.getFirstName() + " " + responsibleContact.getLastName());
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to step: {}", dto.getResponsibleContactId(), e.getMessage());
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
                // Otherwise, inherit location from last step (whether fromLocation or toLocation)
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
        
        // For TRANSPORT steps, fromLocation is current location, toLocation is user-specified
        // For non-TRANSPORT steps, both fromLocation and toLocation can be the current location
        String fromLocation = dto.getFromLocation() != null && !dto.getFromLocation().isEmpty() 
            ? dto.getFromLocation() 
            : currentLocation;
        String toLocation = dto.getToLocation() != null ? dto.getToLocation() : "";
        
        MaintenanceStep step = MaintenanceStep.builder()
                .maintenanceRecord(record)
                .stepType(stepType)
                .description(dto.getDescription())
                .responsibleContact(responsibleContact)
                .responsibleEmployee(responsibleEmployee)
                .startDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDateTime.now())
                .expectedEndDate(dto.getExpectedEndDate())
                .fromLocation(fromLocation)
                .toLocation(toLocation)
                .stepCost(dto.getStepCost() != null ? dto.getStepCost() : BigDecimal.ZERO)
                .notes(dto.getNotes())
                .build();
        
        MaintenanceStep savedStep = maintenanceStepRepository.save(step);
        
        // Update main record's current responsible contact (prefer employee over contact for display)
        if (responsibleEmployee != null) {
            // We still need a contact for the record, so keep as null or handle differently
            record.setCurrentResponsibleContact(responsibleContact);
        } else {
            record.setCurrentResponsibleContact(responsibleContact);
        }
        maintenanceRecordRepository.save(record);
        
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
            
            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE, Role.EQUIPMENT_MANAGER, Role.ADMIN);
            
            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );
            
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
        
        if (dto.getDescription() != null) {
            step.setDescription(dto.getDescription());
        }
        if (dto.getExpectedEndDate() != null) {
            step.setExpectedEndDate(dto.getExpectedEndDate());
        }
        if (dto.getStepCost() != null) {
            step.setStepCost(dto.getStepCost());
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

        UUID recordId = step.getMaintenanceRecord().getId();
        
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
            
            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE, Role.EQUIPMENT_MANAGER, Role.ADMIN);
            
            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity
            );
            
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
        
        // Set actual end date from request, or use current time if not provided
        if (completionData.getActualEndDate() != null) {
            step.setActualEndDate(completionData.getActualEndDate());
        } else {
            step.setActualEndDate(LocalDateTime.now());
        }
        
        // Update actual cost if provided
        if (completionData.getStepCost() != null) {
            step.setStepCost(completionData.getStepCost());
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
            
            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE, Role.EQUIPMENT_MANAGER, Role.ADMIN);
            
            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );
            
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
     * Also handles equipment status changes considering other active maintenance records.
     */
    private void completeMaintenanceRecordIfFinalStepCompleted(MaintenanceRecord record) {
        // Complete the maintenance record
        record.setStatus(MaintenanceRecord.MaintenanceStatus.COMPLETED);
        record.setActualCompletionDate(LocalDateTime.now());
        maintenanceRecordRepository.save(record);
        
        // Handle equipment status change
        Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                .orElseThrow(() -> new MaintenanceException("Equipment not found for record"));
        
        // Check if there are other active maintenance records for this equipment
        List<MaintenanceRecord> otherActiveRecords = maintenanceRecordRepository
                .findByEquipmentIdOrderByCreationDateDesc(equipment.getId())
                .stream()
                .filter(r -> r.getStatus() == MaintenanceRecord.MaintenanceStatus.ACTIVE && 
                           !r.getId().equals(record.getId()))
                .collect(Collectors.toList());
        
        // Only set equipment to AVAILABLE if no other active maintenance records exist
        if (otherActiveRecords.isEmpty()) {
            equipment.setStatus(EquipmentStatus.AVAILABLE);
            equipmentRepository.save(equipment);
            log.info("Equipment {} status changed to AVAILABLE - no other active maintenance records", equipment.getId());
        } else {
            log.info("Equipment {} remains IN_MAINTENANCE - {} other active maintenance records exist", 
                    equipment.getId(), otherActiveRecords.size());
        }
        
        // Send notifications for maintenance record completion
        try {
            String notificationTitle = "Maintenance Completed";
            String notificationMessage = String.format("Maintenance completed for equipment '%s' (%s). Total cost: %.2f. Equipment status: %s", 
                    equipment.getName(),
                    equipment.getFullModelName(),
                    record.getTotalCost() != null ? record.getTotalCost() : BigDecimal.ZERO,
                    otherActiveRecords.isEmpty() ? "Available" : "Still in maintenance");
            String actionUrl = "/maintenance/records/" + record.getId();
            String relatedEntity = record.getId().toString();
            
            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE, Role.EQUIPMENT_MANAGER, Role.ADMIN);
            
            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );
            
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
        Optional<MaintenanceStep> currentStep = maintenanceStepRepository.findCurrentStepByMaintenanceRecordId(record.getId());
        if (currentStep.isPresent() && currentStep.get().getId().equals(stepId)) {
            record.setCurrentResponsibleContact(contact);
            maintenanceRecordRepository.save(record);
        }
        
        // Send notifications for responsible person assignment
        try {
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found"));
            
            String notificationTitle = "Maintenance Responsibility Assigned";
            String notificationMessage = String.format("%s %s has been assigned as responsible person for %s step on equipment '%s'", 
                    contact.getFirstName(),
                    contact.getLastName(),
                    savedStep.getStepType().getName(),
                    equipment.getName());
            String actionUrl = "/maintenance/records/" + record.getId() + "?tab=steps";
            String relatedEntity = record.getId().toString();
            
            List<Role> targetRoles = Arrays.asList(Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE, Role.EQUIPMENT_MANAGER, Role.ADMIN);
            
            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );
            
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
        long activeRecords = maintenanceRecordRepository.countByStatus(MaintenanceRecord.MaintenanceStatus.ACTIVE);
        long overdueRecords = maintenanceRecordRepository.findOverdueRecords(LocalDateTime.now()).size();
        long completedRecords = maintenanceRecordRepository.countByStatus(MaintenanceRecord.MaintenanceStatus.COMPLETED);
        
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
        
        // Calculate equipment metrics - use findAll and filter instead of non-existent countByStatus
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
    
    // Private conversion methods
    
    private MaintenanceRecordDto convertToDto(MaintenanceRecord record) {
        List<MaintenanceStep> steps = maintenanceStepRepository.findByMaintenanceRecordIdOrderByStartDateAsc(record.getId());
        Optional<MaintenanceStep> currentStep = steps.stream()
                .filter(step -> step.getActualEndDate() == null)
                .findFirst();
        
        // Get equipment information
        Equipment equipment = equipmentRepository.findById(record.getEquipmentId()).orElse(null);
        
        // Recalculate cost to ensure it is up-to-date
        BigDecimal totalCost = steps.stream()
                .map(step -> step.getStepCost() != null ? step.getStepCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        record.setTotalCost(totalCost);
        
        return MaintenanceRecordDto.builder()
                .id(record.getId())
                .equipmentId(record.getEquipmentId())
                .equipmentInfo(record.getEquipmentInfo())
                .initialIssueDescription(record.getInitialIssueDescription())
                .finalDescription(record.getFinalDescription())
                .creationDate(record.getCreationDate())
                .expectedCompletionDate(record.getExpectedCompletionDate())
                .actualCompletionDate(record.getActualCompletionDate())
                .totalCost(record.getTotalCost())
                .status(record.getStatus())
                .currentResponsibleContactId(record.getCurrentResponsibleContact() != null ? record.getCurrentResponsibleContact().getId() : null)
                .lastUpdated(record.getLastUpdated())
                .version(record.getVersion())
                .isOverdue(record.isOverdue())
                .durationInDays(record.getDurationInDays())
                .totalSteps(steps.size())
                .completedSteps((int) steps.stream().filter(MaintenanceStep::isCompleted).count())
                .activeSteps((int) steps.stream().filter(step -> !step.isCompleted()).count())
                .steps(steps.stream().map(this::convertToDto).collect(Collectors.toList()))
                .currentStepDescription(currentStep.map(MaintenanceStep::getDescription).orElse(null))
                .currentStepResponsiblePerson(currentStep.map(step -> 
                    step.getResponsibleContact() != null ? step.getResponsibleContact().getFullName() : null).orElse(null))
                .currentStepExpectedEndDate(currentStep.map(MaintenanceStep::getExpectedEndDate).orElse(null))
                .currentStepIsOverdue(currentStep.map(MaintenanceStep::isOverdue).orElse(false))
                .equipmentName(equipment != null ? equipment.getName() : null)
                .equipmentModel(equipment != null ? equipment.getModel() : null)
                .equipmentType(equipment != null && equipment.getType() != null ? equipment.getType().getName() : null)
                .equipmentSerialNumber(equipment != null ? equipment.getSerialNumber() : null)
                .site(equipment != null && equipment.getSite() != null ? equipment.getSite().getName() : "N/A")
                .currentResponsiblePerson(record.getCurrentResponsibleContact() != null ? record.getCurrentResponsibleContact().getFullName() : null)
                .currentResponsiblePhone(record.getCurrentResponsibleContact() != null ? record.getCurrentResponsibleContact().getPhoneNumber() : null)
                .currentResponsibleEmail(record.getCurrentResponsibleContact() != null ? record.getCurrentResponsibleContact().getEmail() : null)
                .build();
    }
    
    private MaintenanceStepDto convertToDto(MaintenanceStep step) {
        // Format step type name in title case (TRANSPORT -> Transport)
        String stepTypeName = null;
        if (step.getStepType() != null && step.getStepType().getName() != null) {
            String name = step.getStepType().getName();
            stepTypeName = name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
        }
        
        return MaintenanceStepDto.builder()
                .id(step.getId())
                .maintenanceRecordId(step.getMaintenanceRecord().getId())
                .stepTypeId(step.getStepType() != null ? step.getStepType().getId() : null)
                .stepTypeName(stepTypeName)
                .description(step.getDescription())
                .responsibleContactId(step.getResponsibleContact() != null ? step.getResponsibleContact().getId() : null)
                .responsibleEmployeeId(step.getResponsibleEmployee() != null ? step.getResponsibleEmployee().getId() : null)
                .contactEmail(step.getResponsibleContact() != null ? step.getResponsibleContact().getEmail() : 
                             (step.getResponsibleEmployee() != null ? step.getResponsibleEmployee().getEmail() : null))
                .contactSpecialization(step.getResponsibleContact() != null ? step.getResponsibleContact().getSpecialization() : 
                                      (step.getResponsibleEmployee() != null && step.getResponsibleEmployee().getJobPosition() != null ? 
                                       step.getResponsibleEmployee().getJobPosition().getPositionName() : null))
                .lastContactDate(step.getLastContactDate())
                .startDate(step.getStartDate())
                .expectedEndDate(step.getExpectedEndDate())
                .actualEndDate(step.getActualEndDate())
                .fromLocation(step.getFromLocation())
                .toLocation(step.getToLocation())
                .stepCost(step.getStepCost())
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
                .daysSinceContact(contactLog.getContactDate() != null ? 
                        java.time.Duration.between(contactLog.getContactDate(), LocalDateTime.now()).toDays() : null)
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
     * Find or create a Contact entity for an Employee.
     * This is used to automatically assign equipment's main driver as responsible person
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
} 