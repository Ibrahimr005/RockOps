package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.*;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.user.User;
import com.example.backend.models.equipment.*;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.MinioService;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.SarkyLogRangeRepository;
import com.example.backend.repositories.equipment.SarkyLogRepository;
import com.example.backend.repositories.equipment.WorkTypeRepository;
import com.example.backend.models.hr.Employee;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;

/**
 * Service for managing Sarky Log entries for equipment work tracking.
 * 
 * IMPROVED SARKY SYSTEM APPROACH:
 * 
 * This service now supports multiple sarky entries per day using a simplified approach:
 * 
 * 1. MULTIPLE ENTRIES PER DAY: The system allows multiple SarkyLog entries for the same date,
 *    enabling tracking of different work types, drivers, or shifts on the same day.
 * 
 * 2. DATE CONTINUITY: When adding new entries:
 *    - Entries can be added for the same date as the latest existing entry
 *    - Entries can be added for the next day (latest date + 1)
 *    - Gaps in dates are not allowed to maintain work continuity
 *    - Entries cannot be added for dates before the latest existing entry
 * 
 * 3. BUSINESS LOGIC:
 *    - Each entry represents work done by a specific driver with a specific work type
 *    - Multiple drivers can work on the same equipment on the same day
 *    - Different work types can be performed on the same day
 *    - Total daily hours can exceed standard work hours for heavy equipment usage
 * 
 * 4. DEPRECATED FEATURES:
 *    - SarkyLogRange and WorkEntry models are deprecated but kept for backward compatibility
 *    - New implementations should use multiple individual SarkyLog entries instead
 * 
 * 5. ANALYTICS AND REPORTING:
 *    - Daily summaries aggregate all entries for a specific date
 *    - Analytics consider all entries when calculating total hours and work patterns
 *    - Equipment utilization is tracked across all daily entries
 * 
 * @author System
 * @since Enhanced Sarky System v2.0
 */
@Service
public class SarkyLogService {

    @Autowired
    private SarkyLogRepository sarkyLogRepository;

    @Autowired
    private SarkyLogRangeRepository sarkyLogRangeRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private WorkTypeRepository workTypeRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private MinioService minioService;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper;

    public SarkyLogService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    /**
     * Get all sarky logs for a specific equipment
     */
    public List<SarkyLogResponseDTO> getSarkyLogsByEquipmentId(UUID equipmentId) {
        return sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId).stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all sarky log ranges for a specific equipment
     */
    public List<SarkyLogRangeResponseDTO> getSarkyLogRangesByEquipmentId(UUID equipmentId) {
        return sarkyLogRangeRepository.findByEquipmentIdOrderByStartDateDesc(equipmentId).stream()
                .map(this::convertRangeToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get the latest date for sarky logs and ranges for an equipment
     */
    public LocalDate getLatestSarkyDateForEquipment(UUID equipmentId) {
        LocalDate latestSingleDate = null;
        LocalDate latestRangeDate = null;

        // Find latest single date
        List<SarkyLog> latestSarkyLog = sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId);
        if (!latestSarkyLog.isEmpty()) {
            latestSingleDate = latestSarkyLog.get(0).getDate();
        }

        // Find latest range date
        List<SarkyLogRange> latestRange = sarkyLogRangeRepository.findLatestByEquipmentId(equipmentId);
        if (!latestRange.isEmpty()) {
            latestRangeDate = latestRange.get(0).getEndDate();
        }

        // Return the most recent date
        if (latestSingleDate == null && latestRangeDate == null) {
            return null;
        } else if (latestSingleDate == null) {
            return latestRangeDate;
        } else if (latestRangeDate == null) {
            return latestSingleDate;
        } else {
            return latestSingleDate.isAfter(latestRangeDate) ? latestSingleDate : latestRangeDate;
        }
    }

    /**
     * Create a new sarky log entry
     */
    @Transactional
    public SarkyLogResponseDTO createSarkyLog(SarkyLogDTO sarkyLogDTO, MultipartFile file) throws Exception {
        Equipment equipment = equipmentRepository.findById(sarkyLogDTO.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + sarkyLogDTO.getEquipmentId()));

        WorkType workType = workTypeRepository.findById(sarkyLogDTO.getWorkTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + sarkyLogDTO.getWorkTypeId()));

        // Validate that the work type is supported by the equipment type
        if (!equipment.getType().supportsWorkType(workType)) {
            throw new IllegalArgumentException("Work type '" + workType.getName() + 
                "' is not supported by equipment type '" + equipment.getType().getName() + "'");
        }

        Employee driver = employeeRepository.findById(sarkyLogDTO.getDriverId())
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + sarkyLogDTO.getDriverId()));

        // Check if driver is eligible to operate this equipment type
        if (!driver.canDrive(equipment.getType())) {
            throw new IllegalArgumentException("Driver '" + driver.getFullName() + 
                "' is not authorized to operate equipment type '" + equipment.getType().getName() + "'");
        }

        // Check for existing entries on the same date for 24-hour validation
        List<SarkyLog> existingEntriesForDate = sarkyLogRepository.findByEquipmentIdAndDate(
                equipment.getId(), sarkyLogDTO.getDate());

        // Calculate total hours for the date
        double totalHoursForDate = existingEntriesForDate.stream()
                .mapToDouble(SarkyLog::getWorkedHours)
                .sum();

        // Check if adding this entry would exceed 24 hours
        if (totalHoursForDate + sarkyLogDTO.getWorkedHours() > 24) {
            throw new IllegalArgumentException(String.format(
                "You cannot exceed 24 hours of work in one day. Current total for %s: %.1f hours. Trying to add: %.1f hours.",
                sarkyLogDTO.getDate().toString(),
                totalHoursForDate,
                sarkyLogDTO.getWorkedHours()
            ));
        }

        // Log the multiple entries for this equipment and date for auditing purposes
        if (!existingEntriesForDate.isEmpty()) {
            System.out.println("Adding additional sarky entry for equipment " + equipment.getName() + 
                              " on date " + sarkyLogDTO.getDate() + 
                              ". Total entries for this date will be: " + (existingEntriesForDate.size() + 1));
        }

        // Get current user for createdBy field
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + authentication.getName()));

        // Create new sarky log
        SarkyLog sarkyLog = new SarkyLog();
        sarkyLog.setEquipment(equipment);
        sarkyLog.setWorkType(workType);
        sarkyLog.setWorkedHours(sarkyLogDTO.getWorkedHours());
        sarkyLog.setDate(sarkyLogDTO.getDate());
        sarkyLog.setDriver(driver);
        sarkyLog.setCreatedBy(currentUser);

        // Handle file upload if provided using MinIO
        if (file != null && !file.isEmpty()) {
            try {
                // Create equipment-specific bucket if it doesn't exist
                minioService.createEquipmentBucket(equipment.getId());
                
                // Upload file with a structured naming convention
                String fileName = "sarky_" + sarkyLogDTO.getDate() + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
                String uploadedFileName = minioService.uploadEquipmentFile(equipment.getId(), file, fileName);
                sarkyLog.setDocumentPath(uploadedFileName);
            } catch (Exception e) {
                throw new Exception("Failed to upload document: " + e.getMessage(), e);
            }
        }

        // Save sarky log
        SarkyLog savedSarkyLog = sarkyLogRepository.save(sarkyLog);

        return SarkyLogResponseDTO.fromEntity(savedSarkyLog);
    }

    /**
     * Create a new sarky log range entry
     */
    @Transactional
    public SarkyLogRangeResponseDTO createSarkyLogRange(SarkyLogRangeDTO sarkyLogRangeDTO, MultipartFile file) throws Exception {
        // Validate date range
        if (sarkyLogRangeDTO.getEndDate().isBefore(sarkyLogRangeDTO.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        // Find equipment
        Equipment equipment = equipmentRepository.findById(sarkyLogRangeDTO.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + sarkyLogRangeDTO.getEquipmentId()));

        // Check for overlapping date ranges
        List<SarkyLogRange> overlappingRanges = sarkyLogRangeRepository.findOverlappingRanges(
                sarkyLogRangeDTO.getEquipmentId(), sarkyLogRangeDTO.getStartDate(), sarkyLogRangeDTO.getEndDate());

        if (!overlappingRanges.isEmpty()) {
            throw new IllegalArgumentException("Date range overlaps with existing entries");
        }

        // Validate work entries
        if (sarkyLogRangeDTO.getWorkEntries() == null || sarkyLogRangeDTO.getWorkEntries().isEmpty()) {
            throw new IllegalArgumentException("Work entries cannot be empty");
        }

        // Check that all dates within the range have entries
        List<LocalDate> allDates = new ArrayList<>();
        LocalDate current = sarkyLogRangeDTO.getStartDate();
        while (!current.isAfter(sarkyLogRangeDTO.getEndDate())) {
            allDates.add(current);
            current = current.plusDays(1);
        }

        // We now allow multiple work entries per day - but ensure each day has at least one entry
        List<LocalDate> entryDates = sarkyLogRangeDTO.getWorkEntries().stream()
                .map(WorkEntryDTO::getDate)
                .distinct()
                .collect(Collectors.toList());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Find the User entity based on the username
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + authentication.getName()));

        // Create new sarky log range
        SarkyLogRange sarkyLogRange = new SarkyLogRange();
        sarkyLogRange.setEquipment(equipment);
        sarkyLogRange.setStartDate(sarkyLogRangeDTO.getStartDate());
        sarkyLogRange.setEndDate(sarkyLogRangeDTO.getEndDate());
        sarkyLogRange.setCreatedBy(currentUser);

        // Save sarky log range first to get the ID
        SarkyLogRange savedSarkyLogRange = sarkyLogRangeRepository.save(sarkyLogRange);

        // Add work entries
        for (WorkEntryDTO entryDTO : sarkyLogRangeDTO.getWorkEntries()) {
            WorkType workType = workTypeRepository.findById(entryDTO.getWorkTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + entryDTO.getWorkTypeId()));

            // Validate that the work type is supported by the equipment type
            if (!equipment.getType().supportsWorkType(workType)) {
                throw new IllegalArgumentException("Work type '" + workType.getName() + 
                    "' is not supported by equipment type '" + equipment.getType().getName() + "'");
            }

            Employee driver = employeeRepository.findById(entryDTO.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + entryDTO.getDriverId()));

            WorkEntry entry = new WorkEntry();
            entry.setSarkyLogRange(savedSarkyLogRange);
            entry.setDate(entryDTO.getDate());
            entry.setWorkType(workType);
            entry.setWorkedHours(entryDTO.getWorkedHours());
            entry.setDriver(driver);

            savedSarkyLogRange.addWorkEntry(entry);
        }

        // Handle file upload if provided using MinIO
        if (file != null && !file.isEmpty()) {
            try {
                // Make sure the equipment bucket exists
                minioService.createEquipmentBucket(equipment.getId());

                // Upload the file with the sarky-range- prefix and the range ID
                String fileName = "sarky-range-" + savedSarkyLogRange.getId().toString();
                minioService.uploadEquipmentFile(equipment.getId(), file, fileName);

                // Set the file URL in the sarky log range
                String fileUrl = minioService.getEquipmentFileUrl(equipment.getId(), fileName);
                savedSarkyLogRange.setFileUrl(fileUrl);
            } catch (Exception e) {
                // Log error but continue
                System.err.println("Error uploading file to MinIO: " + e.getMessage());
            }
        }

        // Save again with work entries and file URL
        savedSarkyLogRange = sarkyLogRangeRepository.save(savedSarkyLogRange);

        return convertRangeToResponseDTO(savedSarkyLogRange);
    }
    /**
     * Get sarky log by ID
     */
    public SarkyLogResponseDTO getSarkyLogById(UUID id) {
        SarkyLog sarkyLog = sarkyLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sarky log not found with id: " + id));
        return convertToResponseDTO(sarkyLog);
    }

    /**
     * Get sarky log range by ID
     */
    public SarkyLogRangeResponseDTO getSarkyLogRangeById(UUID id) {
        SarkyLogRange sarkyLogRange = sarkyLogRangeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sarky log range not found with id: " + id));
        return convertRangeToResponseDTO(sarkyLogRange);
    }

    /**
     * Update an existing sarky log
     */
    @Transactional
    public SarkyLogResponseDTO updateSarkyLog(UUID id, SarkyLogDTO sarkyLogDTO, MultipartFile file) throws Exception {
        SarkyLog sarkyLog = sarkyLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sarky log not found with id: " + id));

        // Find work type if changed
        if (!sarkyLog.getWorkType().getId().equals(sarkyLogDTO.getWorkTypeId())) {
            WorkType workType = workTypeRepository.findById(sarkyLogDTO.getWorkTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + sarkyLogDTO.getWorkTypeId()));
            
            // Validate that the work type is supported by the equipment type
            if (!sarkyLog.getEquipment().getType().supportsWorkType(workType)) {
                throw new IllegalArgumentException("Work type '" + workType.getName() + 
                    "' is not supported by equipment type '" + sarkyLog.getEquipment().getType().getName() + "'");
            }
            
            sarkyLog.setWorkType(workType);
        }

        // Find driver if changed
        if (sarkyLogDTO.getDriverId() != null && 
            (sarkyLog.getDriver() == null || !sarkyLog.getDriver().getId().equals(sarkyLogDTO.getDriverId()))) {
            Employee driver = employeeRepository.findById(sarkyLogDTO.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + sarkyLogDTO.getDriverId()));
            sarkyLog.setDriver(driver);
        }

        // **REMOVED ENHANCED DATE VALIDATION FOR UPDATES**
        // Users can now update Sarky entries to any date without chronological restrictions
        // This allows more flexibility for correcting historical data and adjusting entries
        if (!sarkyLog.getDate().equals(sarkyLogDTO.getDate())) {
            // Log the date change for auditing purposes
            System.out.println("Updating sarky entry date from " + sarkyLog.getDate() + 
                              " to " + sarkyLogDTO.getDate() + " for equipment " + sarkyLog.getEquipment().getName());
        }

        // Check for 24-hour validation on the target date
        List<SarkyLog> existingEntriesForTargetDate = sarkyLogRepository.findByEquipmentIdAndDate(
                sarkyLog.getEquipment().getId(), sarkyLogDTO.getDate());

        // Calculate total hours for the target date, excluding the current entry being updated
        double totalHoursForTargetDate = existingEntriesForTargetDate.stream()
                .filter(entry -> !entry.getId().equals(id)) // Exclude the current entry
                .mapToDouble(SarkyLog::getWorkedHours)
                .sum();

        // Check if updating this entry would exceed 24 hours
        if (totalHoursForTargetDate + sarkyLogDTO.getWorkedHours() > 24) {
            throw new IllegalArgumentException(String.format(
                "You cannot exceed 24 hours of work in one day. Current total for %s: %.1f hours. Trying to set: %.1f hours.",
                sarkyLogDTO.getDate().toString(),
                totalHoursForTargetDate,
                sarkyLogDTO.getWorkedHours()
            ));
        }

        sarkyLog.setWorkedHours(sarkyLogDTO.getWorkedHours());
        sarkyLog.setDate(sarkyLogDTO.getDate());


        // Handle file upload if provided using MinIO
        if (file != null && !file.isEmpty()) {
            try {
                Equipment equipment = sarkyLog.getEquipment();

                // Make sure the equipment bucket exists
                minioService.createEquipmentBucket(equipment.getId());

                // Delete old file if it exists
                if (sarkyLog.getFileUrl() != null && !sarkyLog.getFileUrl().isEmpty()) {
                    try {
                        // Extract the filename from the URL (assumes filename is last part of URL)
                        String oldFileName = "sarky-" + id;
                        minioService.deleteEquipmentFile(equipment.getId(), oldFileName);
                    } catch (Exception e) {
                        // Log error but continue
                        System.err.println("Error deleting old file from MinIO: " + e.getMessage());
                    }
                }

                // Upload the new file
                String fileName = "sarky-" + id;
                minioService.uploadEquipmentFile(equipment.getId(), file, fileName);

                // Set the new file URL
                String fileUrl = minioService.getEquipmentFileUrl(equipment.getId(), fileName);
                sarkyLog.setFileUrl(fileUrl);
            } catch (Exception e) {
                // Log error but continue
                System.err.println("Error uploading file to MinIO: " + e.getMessage());
            }
        }

        SarkyLog updatedSarkyLog = sarkyLogRepository.save(sarkyLog);
        return convertToResponseDTO(updatedSarkyLog);
    }

    /**
     * Update an existing sarky log range
     */
    @Transactional
    public SarkyLogRangeResponseDTO updateSarkyLogRange(UUID id, SarkyLogRangeDTO sarkyLogRangeDTO, MultipartFile file) throws Exception {
        SarkyLogRange sarkyLogRange = sarkyLogRangeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sarky log range not found with id: " + id));

        // Validate date range
        if (sarkyLogRangeDTO.getEndDate().isBefore(sarkyLogRangeDTO.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        // Check for overlapping date ranges excluding the current range
        List<SarkyLogRange> overlappingRanges = sarkyLogRangeRepository.findOverlappingRangesExcludingCurrent(
                sarkyLogRange.getEquipment().getId(), sarkyLogRangeDTO.getStartDate(), sarkyLogRangeDTO.getEndDate(), id);

        if (!overlappingRanges.isEmpty()) {
            throw new IllegalArgumentException("Date range overlaps with existing entries");
        }

        // Validate work entries
        if (sarkyLogRangeDTO.getWorkEntries() == null || sarkyLogRangeDTO.getWorkEntries().isEmpty()) {
            throw new IllegalArgumentException("Work entries cannot be empty");
        }

        // Check that all dates within the new range have entries
        List<LocalDate> allDates = new ArrayList<>();
        LocalDate current = sarkyLogRangeDTO.getStartDate();
        while (!current.isAfter(sarkyLogRangeDTO.getEndDate())) {
            allDates.add(current);
            current = current.plusDays(1);
        }

        // We now allow multiple work entries per day - but ensure each day has at least one entry
        List<LocalDate> entryDates = sarkyLogRangeDTO.getWorkEntries().stream()
                .map(WorkEntryDTO::getDate)
                .distinct()
                .collect(Collectors.toList());

        for (LocalDate date : allDates) {
            if (!entryDates.contains(date)) {
                throw new IllegalArgumentException("Missing work entry for date: " + date);
            }
        }

        // Update range dates
        sarkyLogRange.setStartDate(sarkyLogRangeDTO.getStartDate());
        sarkyLogRange.setEndDate(sarkyLogRangeDTO.getEndDate());

        // Clear existing work entries and add new ones
        sarkyLogRange.getWorkEntries().clear();

        for (WorkEntryDTO entryDTO : sarkyLogRangeDTO.getWorkEntries()) {
            WorkType workType = workTypeRepository.findById(entryDTO.getWorkTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + entryDTO.getWorkTypeId()));

            // Validate that the work type is supported by the equipment type
            if (!sarkyLogRange.getEquipment().getType().supportsWorkType(workType)) {
                throw new IllegalArgumentException("Work type '" + workType.getName() + 
                    "' is not supported by equipment type '" + sarkyLogRange.getEquipment().getType().getName() + "'");
            }

            Employee driver = employeeRepository.findById(entryDTO.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + entryDTO.getDriverId()));

            WorkEntry entry = new WorkEntry();
            entry.setSarkyLogRange(sarkyLogRange);
            entry.setDate(entryDTO.getDate());
            entry.setWorkType(workType);
            entry.setWorkedHours(entryDTO.getWorkedHours());
            entry.setDriver(driver);

            sarkyLogRange.addWorkEntry(entry);
        }

        // Handle file upload if provided using MinIO
        if (file != null && !file.isEmpty()) {
            try {
                Equipment equipment = sarkyLogRange.getEquipment();

                // Make sure the equipment bucket exists
                minioService.createEquipmentBucket(equipment.getId());

                // Delete old file if it exists
                if (sarkyLogRange.getFileUrl() != null && !sarkyLogRange.getFileUrl().isEmpty()) {
                    try {
                        String oldFileName = "sarky-range-" + id;
                        minioService.deleteEquipmentFile(equipment.getId(), oldFileName);
                    } catch (Exception e) {
                        System.err.println("Error deleting old file from MinIO: " + e.getMessage());
                    }
                }

                // Upload the new file
                String fileName = "sarky-range-" + id;
                minioService.uploadEquipmentFile(equipment.getId(), file, fileName);

                // Set the new file URL
                String fileUrl = minioService.getEquipmentFileUrl(equipment.getId(), fileName);
                sarkyLogRange.setFileUrl(fileUrl);
            } catch (Exception e) {
                System.err.println("Error uploading file to MinIO: " + e.getMessage());
            }
        }

        SarkyLogRange updatedSarkyLogRange = sarkyLogRangeRepository.save(sarkyLogRange);
        return convertRangeToResponseDTO(updatedSarkyLogRange);
    }

    /**
     * Delete a sarky log
     */
    @Transactional
    public void deleteSarkyLog(UUID id) throws Exception {
        SarkyLog sarkyLog = sarkyLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sarky log not found with id: " + id));

        // Delete the file from MinIO if exists
        if (sarkyLog.getFileUrl() != null && !sarkyLog.getFileUrl().isEmpty()) {
            try {
                String fileName = "sarky-" + id;
                minioService.deleteEquipmentFile(sarkyLog.getEquipment().getId(), fileName);
            } catch (Exception e) {
                // Log error but continue with deletion
                System.err.println("Error deleting file from MinIO: " + e.getMessage());
            }
        }

        sarkyLogRepository.delete(sarkyLog);
    }

    /**
     * Delete a sarky log range
     */
    @Transactional
    public void deleteSarkyLogRange(UUID id) throws Exception {
        SarkyLogRange sarkyLogRange = sarkyLogRangeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sarky log range not found with id: " + id));

        // Delete the file from MinIO if exists
        if (sarkyLogRange.getFileUrl() != null && !sarkyLogRange.getFileUrl().isEmpty()) {
            try {
                String fileName = "sarky-range-" + id;
                minioService.deleteEquipmentFile(sarkyLogRange.getEquipment().getId(), fileName);
            } catch (Exception e) {
                // Log error but continue with deletion
                System.err.println("Error deleting file from MinIO: " + e.getMessage());
            }
        }

        sarkyLogRangeRepository.delete(sarkyLogRange);
    }

    /**
     * Convert entity to response DTO
     */
    private SarkyLogResponseDTO convertToResponseDTO(SarkyLog sarkyLog) {
        SarkyLogResponseDTO dto = new SarkyLogResponseDTO();
        dto.setId(sarkyLog.getId());
        dto.setEquipmentId(sarkyLog.getEquipment().getId());
        dto.setEquipmentType(sarkyLog.getEquipment().getType());

        WorkTypeDTO workTypeDTO = new WorkTypeDTO();
        workTypeDTO.setId(sarkyLog.getWorkType().getId());
        workTypeDTO.setName(sarkyLog.getWorkType().getName());
        workTypeDTO.setDescription(sarkyLog.getWorkType().getDescription());
        workTypeDTO.setActive(sarkyLog.getWorkType().isActive());

        dto.setWorkType(workTypeDTO);
        dto.setWorkedHours(sarkyLog.getWorkedHours());
        dto.setDate(sarkyLog.getDate());
        dto.setFilePath(sarkyLog.getFileUrl());

        // Add driver information
        dto.setDriverId(sarkyLog.getDriver().getId());
        dto.setDriverName(sarkyLog.getDriver().getFirstName() + " " + sarkyLog.getDriver().getLastName());

        if (sarkyLog.getCreatedBy() != null) {
            dto.setCreatedByName(sarkyLog.getCreatedBy().getFirstName() + " " + sarkyLog.getCreatedBy().getLastName());
        }

        dto.setCreatedAt(sarkyLog.getCreatedAt().toLocalDate());

        return dto;
    }
    /**
     * Convert sarky log range entity to response DTO
     */
    private SarkyLogRangeResponseDTO convertRangeToResponseDTO(SarkyLogRange sarkyLogRange) {
        SarkyLogRangeResponseDTO dto = new SarkyLogRangeResponseDTO();
        dto.setId(sarkyLogRange.getId());
        dto.setEquipmentId(sarkyLogRange.getEquipment().getId());
        dto.setEquipmentType(sarkyLogRange.getEquipment().getType());
        dto.setStartDate(sarkyLogRange.getStartDate());
        dto.setEndDate(sarkyLogRange.getEndDate());
        dto.setFilePath(sarkyLogRange.getFileUrl());
        dto.setStatus("Completed"); // Default status

        List<WorkEntryResponseDTO> workEntryDTOs = sarkyLogRange.getWorkEntries().stream()
                .map(this::convertWorkEntryToResponseDTO)
                .collect(Collectors.toList());

        dto.setWorkEntries(workEntryDTOs);

        if (sarkyLogRange.getCreatedBy() != null) {
            dto.setCreatedByName(sarkyLogRange.getCreatedBy().getFirstName() + " " +
                    sarkyLogRange.getCreatedBy().getLastName());
        }

        dto.setCreatedAt(sarkyLogRange.getCreatedAt().toLocalDate());

        return dto;
    }



    /**
     * Convert work entry entity to response DTO
     */
    private WorkEntryResponseDTO convertWorkEntryToResponseDTO(WorkEntry workEntry) {
        WorkEntryResponseDTO dto = new WorkEntryResponseDTO();
        dto.setId(workEntry.getId());
        dto.setDate(workEntry.getDate());

        WorkTypeDTO workTypeDTO = new WorkTypeDTO();
        workTypeDTO.setId(workEntry.getWorkType().getId());
        workTypeDTO.setName(workEntry.getWorkType().getName());
        workTypeDTO.setDescription(workEntry.getWorkType().getDescription());
        workTypeDTO.setActive(workEntry.getWorkType().isActive());

        dto.setWorkType(workTypeDTO);
        dto.setWorkedHours(workEntry.getWorkedHours());

        // Add driver information
        dto.setDriverId(workEntry.getDriver().getId());
        dto.setDriverName(workEntry.getDriver().getFirstName() + " " + workEntry.getDriver().getLastName());

        return dto;
    }

    /**
     * Get the date of the next sarky entry after a specific entry
     */
    private LocalDate getNextSarkyDateAfter(UUID sarkyId, UUID equipmentId) {
        // Find next single date
        List<SarkyLog> singleEntries = sarkyLogRepository.findByEquipmentIdOrderByDateAsc(equipmentId);

        LocalDate sarkyDate = sarkyLogRepository.findById(sarkyId)
                .map(SarkyLog::getDate)
                .orElse(null);

        if (sarkyDate == null) {
            return null;
        }

        LocalDate nextSingleDate = null;
        for (SarkyLog log : singleEntries) {
            if (log.getDate().isAfter(sarkyDate) &&
                    (nextSingleDate == null || log.getDate().isBefore(nextSingleDate))) {
                nextSingleDate = log.getDate();
            }
        }

        // Find next range start date
        List<SarkyLogRange> rangeEntries = sarkyLogRangeRepository.findByEquipmentIdOrderByStartDateAsc(equipmentId);
        LocalDate nextRangeDate = null;

        for (SarkyLogRange range : rangeEntries) {
            if (range.getStartDate().isAfter(sarkyDate) &&
                    (nextRangeDate == null || range.getStartDate().isBefore(nextRangeDate))) {
                nextRangeDate = range.getStartDate();
            }
        }

        // Return the earliest next date
        if (nextSingleDate == null && nextRangeDate == null) {
            return null;
        } else if (nextSingleDate == null) {
            return nextRangeDate;
        } else if (nextRangeDate == null) {
            return nextSingleDate;
        } else {
            return nextSingleDate.isBefore(nextRangeDate) ? nextSingleDate : nextRangeDate;
        }
    }

    /**
     * Get the date of the previous sarky entry before a specific entry
     */
    private LocalDate getPreviousSarkyDateBefore(UUID sarkyId, UUID equipmentId) {
        // Find previous single date
        List<SarkyLog> singleEntries = sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId);

        LocalDate sarkyDate = sarkyLogRepository.findById(sarkyId)
                .map(SarkyLog::getDate)
                .orElse(null);

        if (sarkyDate == null) {
            return null;
        }

        LocalDate prevSingleDate = null;
        for (SarkyLog log : singleEntries) {
            if (log.getDate().isBefore(sarkyDate) &&
                    (prevSingleDate == null || log.getDate().isAfter(prevSingleDate))) {
                prevSingleDate = log.getDate();
            }
        }

        // Find previous range end date
        List<SarkyLogRange> rangeEntries = sarkyLogRangeRepository.findByEquipmentIdOrderByEndDateDesc(equipmentId);
        LocalDate prevRangeDate = null;

        for (SarkyLogRange range : rangeEntries) {
            if (range.getEndDate().isBefore(sarkyDate) &&
                    (prevRangeDate == null || range.getEndDate().isAfter(prevRangeDate))) {
                prevRangeDate = range.getEndDate();
            }
        }

        // Return the latest previous date
        if (prevSingleDate == null && prevRangeDate == null) {
            return null;
        } else if (prevSingleDate == null) {
            return prevRangeDate;
        } else if (prevRangeDate == null) {
            return prevSingleDate;
        } else {
            return prevSingleDate.isAfter(prevRangeDate) ? prevSingleDate : prevRangeDate;
        }
    }

    /**
     * Get all sarky logs for a specific equipment and date
     */
    public List<SarkyLogResponseDTO> getSarkyLogsByEquipmentIdAndDate(UUID equipmentId, LocalDate date) {
        return sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, date).stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all sarky logs for a specific equipment and date range
     */
    public List<SarkyLogResponseDTO> getSarkyLogsByEquipmentIdAndDateRange(UUID equipmentId, LocalDate startDate, LocalDate endDate) {
        return sarkyLogRepository.findByEquipmentIdAndDateBetweenOrderByDateDesc(equipmentId, startDate, endDate).stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get daily work summary for a specific equipment and date
     */
    public DailySarkySummaryDTO getDailySarkySummary(UUID equipmentId, LocalDate date) {
        List<SarkyLog> dailyLogs = sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, date);
        
        DailySarkySummaryDTO summary = new DailySarkySummaryDTO();
        summary.setEquipmentId(equipmentId);
        summary.setDate(date);
        summary.setTotalEntries(dailyLogs.size());
        summary.setTotalHours(dailyLogs.stream().mapToDouble(SarkyLog::getWorkedHours).sum());
        
        // Group by work type
        Map<String, Double> workTypeHours = dailyLogs.stream()
                .collect(Collectors.groupingBy(
                    log -> log.getWorkType().getName(),
                    Collectors.summingDouble(SarkyLog::getWorkedHours)
                ));
        summary.setWorkTypeBreakdown(workTypeHours);
        
        // Group by driver
        Map<String, Double> driverHours = dailyLogs.stream()
                .collect(Collectors.groupingBy(
                    log -> log.getDriver().getFirstName() + " " + log.getDriver().getLastName(),
                    Collectors.summingDouble(SarkyLog::getWorkedHours)
                ));
        summary.setDriverBreakdown(driverHours);
        
        return summary;
    }

    /**
     * Get all dates that have existing sarky entries for an equipment
     */
    public List<LocalDate> getExistingSarkyDatesForEquipment(UUID equipmentId) {
        List<SarkyLog> allLogs = sarkyLogRepository.findByEquipmentIdOrderByDateAsc(equipmentId);
        return allLogs.stream()
                .map(SarkyLog::getDate)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * Get validation info for adding new sarky entries
     */
    public SarkyValidationInfoDTO getSarkyValidationInfo(UUID equipmentId) {
        LocalDate latestDate = getLatestSarkyDateForEquipment(equipmentId);
        List<LocalDate> existingDates = getExistingSarkyDatesForEquipment(equipmentId);
        
        SarkyValidationInfoDTO info = new SarkyValidationInfoDTO();
        info.setEquipmentId(equipmentId);
        info.setLatestDate(latestDate);
        info.setExistingDates(existingDates);
        
        if (latestDate != null) {
            info.setNextAllowedDate(latestDate.plusDays(1));
            info.setCanAddToLatestDate(true);
        }
        
        return info;
    }

}