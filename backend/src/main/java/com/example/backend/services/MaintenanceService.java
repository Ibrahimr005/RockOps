package com.example.backend.services;

import com.example.backend.dtos.*;
import com.example.backend.models.*;
import com.example.backend.repositories.*;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.repositories.equipment.EquipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
        
        // Set current responsible contact if provided
        if (dto.getCurrentResponsibleContactId() != null) {
            try {
                ContactDto contactDto = contactService.getContact(dto.getCurrentResponsibleContactId());
                Contact contact = Contact.builder()
                        .id(contactDto.getId())
                        .firstName(contactDto.getFirstName())
                        .lastName(contactDto.getLastName())
                        .email(contactDto.getEmail())
                        .phoneNumber(contactDto.getPhoneNumber())
                        .contactType(contactDto.getContactType())
                        .version(contactDto.getVersion())
                        .build();
                record.setCurrentResponsibleContact(contact);
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to record: {}", dto.getCurrentResponsibleContactId(), e.getMessage());
            }
        }
        
        MaintenanceRecord savedRecord = maintenanceRecordRepository.save(record);
        
        // Update equipment status to IN_MAINTENANCE if not already in maintenance
        if (equipment.getStatus() != EquipmentStatus.IN_MAINTENANCE) {
            equipment.setStatus(EquipmentStatus.IN_MAINTENANCE);
            equipmentRepository.save(equipment);
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
                ContactDto contactDto = contactService.getContact(dto.getCurrentResponsibleContactId());
                Contact contact = Contact.builder()
                        .id(contactDto.getId())
                        .firstName(contactDto.getFirstName())
                        .lastName(contactDto.getLastName())
                        .email(contactDto.getEmail())
                        .phoneNumber(contactDto.getPhoneNumber())
                        .contactType(contactDto.getContactType())
                        .version(contactDto.getVersion())
                        .build();
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
        
        // Complete the current step if it exists
        Optional<MaintenanceStep> currentStep = maintenanceStepRepository.findCurrentStepByMaintenanceRecordId(maintenanceRecordId);
        if (currentStep.isPresent()) {
            completeMaintenanceStep(currentStep.get().getId());
        }
        
        // Get the responsible contact
        Contact responsibleContact = null;
        if (dto.getResponsibleContactId() != null) {
            try {
                ContactDto contactDto = contactService.getContact(dto.getResponsibleContactId());
                responsibleContact = Contact.builder()
                        .id(contactDto.getId())
                        .firstName(contactDto.getFirstName())
                        .lastName(contactDto.getLastName())
                        .email(contactDto.getEmail())
                        .phoneNumber(contactDto.getPhoneNumber())
                        .contactType(contactDto.getContactType())
                        .version(contactDto.getVersion())
                        .build();
            } catch (Exception e) {
                log.warn("Could not assign contact with ID {} to step: {}", dto.getResponsibleContactId(), e.getMessage());
            }
        }
        
        MaintenanceStep step = MaintenanceStep.builder()
                .maintenanceRecord(record)
                .stepType(dto.getStepType())
                .description(dto.getDescription())
                .responsibleContact(responsibleContact)
                .startDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDateTime.now())
                .expectedEndDate(dto.getExpectedEndDate())
                .fromLocation(dto.getFromLocation())
                .toLocation(dto.getToLocation())
                .stepCost(dto.getStepCost())
                .notes(dto.getNotes())
                .build();
        
        MaintenanceStep savedStep = maintenanceStepRepository.save(step);
        
        // Update main record's current responsible contact if this is the current step
        record.setCurrentResponsibleContact(responsibleContact);
        maintenanceRecordRepository.save(record);
        
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
        
        return convertToDto(savedStep);
    }
    
    public void completeMaintenanceStep(UUID stepId) {
        MaintenanceStep step = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));
        
        step.setActualEndDate(LocalDateTime.now());
        maintenanceStepRepository.save(step);
        
        // If this was the final step, complete the parent record
        if (step.isFinalStep()) {
            MaintenanceRecord record = step.getMaintenanceRecord();
            record.setStatus(MaintenanceRecord.MaintenanceStatus.COMPLETED);
            record.setActualCompletionDate(LocalDateTime.now());
            
            Equipment equipment = equipmentRepository.findById(record.getEquipmentId())
                    .orElseThrow(() -> new MaintenanceException("Equipment not found for record"));
            equipment.setStatus(EquipmentStatus.AVAILABLE);
            
            equipmentRepository.save(equipment);
            maintenanceRecordRepository.save(record);
        }
    }
    
    public void handoffToNextStep(UUID stepId, MaintenanceStepDto nextStepDto) {
        completeMaintenanceStep(stepId);
        createMaintenanceStep(nextStepDto.getMaintenanceRecordId(), nextStepDto);
    }
    
    public MaintenanceStepDto assignContactToStep(UUID stepId, UUID contactId) {
        MaintenanceStep step = maintenanceStepRepository.findById(stepId)
                .orElseThrow(() -> new MaintenanceException("Maintenance step not found with id: " + stepId));
        
        ContactDto contactDto = contactService.getContact(contactId);
        Contact contact = Contact.builder()
                .id(contactDto.getId())
                .firstName(contactDto.getFirstName())
                .lastName(contactDto.getLastName())
                .email(contactDto.getEmail())
                .phoneNumber(contactDto.getPhoneNumber())
                .contactType(contactDto.getContactType())
                .version(contactDto.getVersion())
                .build();
        
        step.setResponsibleContact(contact);
        
        MaintenanceStep savedStep = maintenanceStepRepository.save(step);
        
        // Update main record's current responsible contact if this is the current step
        MaintenanceRecord record = step.getMaintenanceRecord();
        Optional<MaintenanceStep> currentStep = maintenanceStepRepository.findCurrentStepByMaintenanceRecordId(record.getId());
        if (currentStep.isPresent() && currentStep.get().getId().equals(stepId)) {
            record.setCurrentResponsibleContact(contact);
            maintenanceRecordRepository.save(record);
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
        return MaintenanceStepDto.builder()
                .id(step.getId())
                .maintenanceRecordId(step.getMaintenanceRecord().getId())
                .stepType(step.getStepType())
                .description(step.getDescription())
                .responsibleContactId(step.getResponsibleContact() != null ? step.getResponsibleContact().getId() : null)
                .contactEmail(step.getResponsibleContact() != null ? step.getResponsibleContact().getEmail() : null)
                .contactSpecialization(step.getResponsibleContact() != null ? step.getResponsibleContact().getSpecialization() : null)
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
                .responsiblePerson(step.getResponsibleContact() != null ? 
                    step.getResponsibleContact().getFirstName() + " " + step.getResponsibleContact().getLastName() : null)
                .personPhoneNumber(step.getResponsibleContact() != null ? step.getResponsibleContact().getPhoneNumber() : null)
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
} 