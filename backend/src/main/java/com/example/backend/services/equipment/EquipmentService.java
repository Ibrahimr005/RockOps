package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.EquipmentCreateDTO;
import com.example.backend.dto.equipment.EquipmentDTO;
import com.example.backend.dto.equipment.EquipmentStatusUpdateDTO;
import com.example.backend.dto.equipment.EquipmentUpdateDTO;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.dto.equipment.EquipmentSarkyAnalyticsDTO;
import com.example.backend.dto.equipment.WorkTypeAnalyticsDTO;
import com.example.backend.dto.equipment.DriverAnalyticsDTO;
import com.example.backend.dto.equipment.MonthlyWorkHoursDTO;
import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.*;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.services.MinioService;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.equipment.SarkyLogRepository;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.MaintenanceRecordRepository;
import com.example.backend.services.notification.NotificationService;
import jakarta.transaction.Transactional;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;
    private final SiteRepository siteRepository;
    private final EmployeeRepository employeeRepository;
    private final MinioService minioService;

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private final EquipmentBrandRepository equipmentBrandRepository;

    @Autowired
    private SarkyLogRepository sarkyLogRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private MaintenanceRecordRepository maintenanceRecordRepository;

    @Autowired
    public EquipmentService(
            EquipmentRepository equipmentRepository,
            EquipmentTypeRepository equipmentTypeRepository,
            SiteRepository siteRepository,
            EmployeeRepository employeeRepository,
            MinioService minioService, EquipmentBrandRepository equipmentBrandRepository) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.siteRepository = siteRepository;
        this.employeeRepository = employeeRepository;
        this.minioService = minioService;
        this.equipmentBrandRepository = equipmentBrandRepository;
    }

    // Helper method to resolve image URL using the cached key if available
    private String resolveEquipmentImageUrl(Equipment equipment) {
        try {
            // FAST PATH: If key is in DB, generating URL is pure computation (no network)
            if (equipment.getImageStorageKey() != null && !equipment.getImageStorageKey().isEmpty()) {
                return minioService.generateUrlFromKey(equipment.getImageStorageKey());
            }

            // SLOW PATH: Fallback for unmigrated data (checks S3)
            return minioService.getEquipmentMainPhoto(equipment.getId());
        } catch (Exception e) {
            return null;
        }
    }

    // GET methods

    public List<EquipmentDTO> getAllEquipment() {
        List<Equipment> equipments = equipmentRepository.findAll();
        return equipments.stream()
                .map(equipment -> {
                    EquipmentDTO dto = EquipmentDTO.fromEntity(equipment);
                    dto.setImageUrl(resolveEquipmentImageUrl(equipment));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public EquipmentDTO getEquipmentById(UUID id) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));

        EquipmentDTO dto = EquipmentDTO.fromEntity(equipment);
        dto.setImageUrl(resolveEquipmentImageUrl(equipment));

        // If equipment is in maintenance, populate the active maintenance record ID
        if (equipment.getStatus() == EquipmentStatus.IN_MAINTENANCE) {
            Optional<MaintenanceRecord> activeRecord = maintenanceRecordRepository
                    .findFirstByEquipmentIdAndStatusOrderByCreationDateDesc(
                            id,
                            MaintenanceRecord.MaintenanceStatus.ACTIVE);
            activeRecord.ifPresent(record -> dto.setActiveMaintenanceRecordId(record.getId()));
        }

        return dto;
    }

    public List<EquipmentDTO> getEquipmentByType(UUID typeId) {
        EquipmentType type = equipmentTypeRepository.findById(typeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + typeId));

        List<Equipment> equipments = equipmentRepository.findByType(type);

        return equipments.stream()
                .map(equipment -> {
                    EquipmentDTO dto = EquipmentDTO.fromEntity(equipment);
                    // For type list, we can also use the resolve logic
                    dto.setImageUrl(resolveEquipmentImageUrl(equipment));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // CREATE methods

    public EquipmentDTO createEquipment(EquipmentCreateDTO createDTO, MultipartFile equipmentPhoto) throws Exception {
        if (equipmentRepository.existsBySerialNumber(createDTO.getSerialNumber())) {
            throw new IllegalArgumentException("Equipment with serial number '"
                    + createDTO.getSerialNumber() + "' already exists");
        }

        // Create new equipment entity
        Equipment equipment = new Equipment();

        // Set equipment type

        EquipmentType equipmentType = equipmentTypeRepository.findById(createDTO.getTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: "
                        + createDTO.getTypeId()));
        equipment.setType(equipmentType);

        EquipmentBrand equipmentBrand = equipmentBrandRepository.findById(createDTO.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipment brand not found with id: "
                        + createDTO.getBrandId()));
        equipment.setBrand(equipmentBrand);

        // Set basic properties
        equipment.setModel(createDTO.getModel());
        equipment.setName(createDTO.getName());
        equipment.setManufactureYear(Year.of(createDTO.getManufactureYear()));
        equipment.setPurchasedDate(createDTO.getPurchasedDate());
        equipment.setDeliveredDate(createDTO.getDeliveredDate());
        equipment.setEgpPrice(createDTO.getEgpPrice());
        equipment.setDollarPrice(createDTO.getDollarPrice());
        if (createDTO.getPurchasedFrom() != null) {

            System.out.println(createDTO.getPurchasedFrom());
            Merchant merchant = merchantRepository.findById(createDTO.getPurchasedFrom())
                    .orElseThrow(() -> new ResourceNotFoundException("Merchant not found with id: "
                            + createDTO.getPurchasedFrom()));
            equipment.setPurchasedFrom(merchant);
        }

        equipment.setExaminedBy(createDTO.getExaminedBy());
        equipment.setEquipmentComplaints(createDTO.getEquipmentComplaints());
        equipment.setCountryOfOrigin(createDTO.getCountryOfOrigin());
        equipment.setSerialNumber(createDTO.getSerialNumber());
        equipment.setShipping(createDTO.getShipping());
        equipment.setCustoms(createDTO.getCustoms());
        equipment.setTaxes(createDTO.getTaxes());

        equipment.setStatus(createDTO.getStatus() != null ? createDTO.getStatus() : equipment.getStatus());
        equipment.setRelatedDocuments(createDTO.getRelatedDocuments());
        equipment.setWorkedHours(createDTO.getWorkedHours());

        // Set relationships
        if (createDTO.getSiteId() != null) {
            Site site = siteRepository.findById(createDTO.getSiteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Site not found with id: "
                            + createDTO.getSiteId()));
            equipment.setSite(site);
            // Automatically set status to RUNNING when assigned to a site
            equipment.setStatus(EquipmentStatus.RUNNING);
        }

        // Validate driver assignment for drivable equipment types
        if (!equipmentType.isDrivable()
                && (createDTO.getMainDriverId() != null || createDTO.getSubDriverId() != null)) {
            throw new IllegalArgumentException(
                    "Cannot assign drivers to non-drivable equipment type: " + equipmentType.getName());
        }

        // Fixed driver validation in EquipmentService.java createEquipment method
        if (createDTO.getMainDriverId() != null) {
            Employee driver = employeeRepository.findById(createDTO.getMainDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: "
                            + createDTO.getMainDriverId()));

            if (!driver.canDrive(equipmentType)) {
                String requiredPosition = equipmentType.getRequiredDriverPosition() != null
                        ? equipmentType.getRequiredDriverPosition()
                        : equipmentType.getName() + " Driver";

                throw new IllegalArgumentException("Employee " + driver.getFullName()
                        + " cannot be assigned as a driver for " + equipmentType.getName()
                        + ". Required position: " + requiredPosition);
            }

            equipment.setMainDriver(driver);
        }

        // Similar validation for sub driver
        if (createDTO.getSubDriverId() != null) {
            Employee subDriver = employeeRepository.findById(createDTO.getSubDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sub driver not found with id: "
                            + createDTO.getSubDriverId()));

            if (!subDriver.canDrive(equipmentType)) {
                String requiredPosition = equipmentType.getRequiredDriverPosition() != null
                        ? equipmentType.getRequiredDriverPosition()
                        : equipmentType.getName() + " Driver";

                throw new IllegalArgumentException("Employee " + subDriver.getFullName()
                        + " cannot be assigned as a sub driver for " + equipmentType.getName()
                        + ". Required position: " + requiredPosition);
            }

            equipment.setSubDriver(subDriver);
        }

        // Automatically assign drivers to equipment's site if both site and drivers are
        // assigned
        assignDriversToEquipmentSite(equipment);

        // Save the equipment first to generate ID
        Equipment savedEquipment = equipmentRepository.save(equipment);

        // Ensure storage folder exists for this equipment (uses single bucket with
        // folder structure)
        minioService.createEquipmentBucket(savedEquipment.getId());

        // Upload photo if provided (stored in equipment/{equipmentId}/ folder)
        if (equipmentPhoto != null && !equipmentPhoto.isEmpty()) {
            String fileName = minioService.uploadEquipmentFile(savedEquipment.getId(), equipmentPhoto, "Main_Image");
            
            // CRITICAL: Save the storage key using the standard structure
            String storageKey = "equipment/" + savedEquipment.getId() + "/" + fileName;
            savedEquipment.setImageStorageKey(storageKey);
            savedEquipment = equipmentRepository.save(savedEquipment);
        }

        // Create and return DTO
        EquipmentDTO resultDTO = EquipmentDTO.fromEntity(savedEquipment);
        resultDTO.setImageUrl(resolveEquipmentImageUrl(savedEquipment));

        // Send notifications to EQUIPMENT_MANAGER and ADMIN users
        try {
            String notificationTitle = "New Equipment Created";
            String notificationMessage = "Equipment '" + savedEquipment.getName() + "' (" + savedEquipment.getModel()
                    + ") has been created";
            String actionUrl = "/equipment/" + savedEquipment.getId();
            String relatedEntity = savedEquipment.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity);

            System.out.println("Equipment creation notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment creation notifications: " + e.getMessage());
        }

        return resultDTO;
    }

    // Support for the old Map-based createEquipment method
    // Fixed Map-based createEquipment method in EquipmentService.java
    public EquipmentDTO createEquipment(Map<String, Object> requestBody, MultipartFile equipmentPhoto)
            throws Exception {
        EquipmentCreateDTO createDTO = new EquipmentCreateDTO();

        // FIX: Parse type ID - handle both 'type' and 'typeId'
        if (requestBody.get("typeId") != null) {
            createDTO.setTypeId(UUID.fromString(requestBody.get("typeId").toString()));
        } else if (requestBody.get("type") != null) {
            createDTO.setTypeId(UUID.fromString(requestBody.get("type").toString()));
        }

        // FIX: Parse brand ID - handle both 'brand' and 'brandId'
        if (requestBody.get("brandId") != null) {
            createDTO.setBrandId(UUID.fromString(requestBody.get("brandId").toString()));
        } else if (requestBody.get("brand") != null) {
            createDTO.setBrandId(UUID.fromString(requestBody.get("brand").toString()));
        }

        // Parse basic properties
        if (requestBody.get("model") != null)
            createDTO.setModel(requestBody.get("model").toString());
        if (requestBody.get("name") != null)
            createDTO.setName(requestBody.get("name").toString());
        if (requestBody.get("manufactureYear") != null)
            createDTO.setManufactureYear(Integer.parseInt(requestBody.get("manufactureYear").toString()));
        if (requestBody.get("purchasedDate") != null && !requestBody.get("purchasedDate").toString().trim().isEmpty())
            createDTO.setPurchasedDate(LocalDate.parse(requestBody.get("purchasedDate").toString()));
        if (requestBody.get("deliveredDate") != null && !requestBody.get("deliveredDate").toString().trim().isEmpty())
            createDTO.setDeliveredDate(LocalDate.parse(requestBody.get("deliveredDate").toString()));
        if (requestBody.get("egpPrice") != null)
            createDTO.setEgpPrice(Double.parseDouble(requestBody.get("egpPrice").toString()));
        if (requestBody.get("dollarPrice") != null)
            createDTO.setDollarPrice(Double.parseDouble(requestBody.get("dollarPrice").toString()));
        if (requestBody.get("purchasedFrom") != null)
            createDTO.setPurchasedFrom(UUID.fromString(requestBody.get("purchasedFrom").toString()));
        if (requestBody.get("examinedBy") != null)
            createDTO.setExaminedBy(requestBody.get("examinedBy").toString());
        if (requestBody.get("equipmentComplaints") != null)
            createDTO.setEquipmentComplaints(requestBody.get("equipmentComplaints").toString());
        if (requestBody.get("countryOfOrigin") != null)
            createDTO.setCountryOfOrigin(requestBody.get("countryOfOrigin").toString());
        if (requestBody.get("serialNumber") != null)
            createDTO.setSerialNumber(requestBody.get("serialNumber").toString());
        if (requestBody.get("shipping") != null)
            createDTO.setShipping(Double.parseDouble(requestBody.get("shipping").toString()));
        if (requestBody.get("customs") != null)
            createDTO.setCustoms(Double.parseDouble(requestBody.get("customs").toString()));
        if (requestBody.get("taxes") != null)
            createDTO.setTaxes(Double.parseDouble(requestBody.get("taxes").toString()));

        if (requestBody.get("status") != null) {
            try {
                createDTO.setStatus(EquipmentStatus.valueOf(requestBody.get("status").toString().toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Default to AVAILABLE status if invalid
            }
        }
        if (requestBody.get("relatedDocuments") != null)
            createDTO.setRelatedDocuments(requestBody.get("relatedDocuments").toString());
        if (requestBody.get("workedHours") != null)
            createDTO.setWorkedHours(Integer.parseInt(requestBody.get("workedHours").toString()));

        // FIX: Parse relationships - handle both naming conventions
        if (requestBody.get("siteId") != null) {
            createDTO.setSiteId(UUID.fromString(requestBody.get("siteId").toString()));
        } else if (requestBody.get("site") != null) {
            createDTO.setSiteId(UUID.fromString(requestBody.get("site").toString()));
        }

        if (requestBody.get("mainDriverId") != null) {
            createDTO.setMainDriverId(UUID.fromString(requestBody.get("mainDriverId").toString()));
        } else if (requestBody.get("mainDriver") != null) {
            createDTO.setMainDriverId(UUID.fromString(requestBody.get("mainDriver").toString()));
        }

        if (requestBody.get("subDriverId") != null) {
            createDTO.setSubDriverId(UUID.fromString(requestBody.get("subDriverId").toString()));
        } else if (requestBody.get("subDriver") != null) {
            createDTO.setSubDriverId(UUID.fromString(requestBody.get("subDriver").toString()));
        }

        return createEquipment(createDTO, equipmentPhoto);
    }

    // UPDATE methods

    // Fixed updateEquipment method in EquipmentService.java
    public EquipmentDTO updateEquipment(UUID id, EquipmentUpdateDTO updateDTO, MultipartFile equipmentPhoto)
            throws Exception {
        // Check if equipment exists
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));

        // Check if serial number already exists for another equipment
        if (updateDTO.getSerialNumber() != null &&
                !equipment.getSerialNumber().equals(updateDTO.getSerialNumber()) &&
                equipmentRepository.existsBySerialNumber(updateDTO.getSerialNumber())) {
            throw new IllegalArgumentException("Equipment with serial number '"
                    + updateDTO.getSerialNumber() + "' already exists");
        }

        // Update equipment type if provided
        if (updateDTO.getTypeId() != null) {
            EquipmentType equipmentType = equipmentTypeRepository.findById(updateDTO.getTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: "
                            + updateDTO.getTypeId()));
            equipment.setType(equipmentType);
        }

        // FIX: Update brand ID correctly - use getBrandId() instead of getTypeId()
        if (updateDTO.getBrandId() != null) {
            EquipmentBrand equipmentBrand = equipmentBrandRepository.findById(updateDTO.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipment brand not found with id: "
                            + updateDTO.getBrandId()));
            equipment.setBrand(equipmentBrand);
        }

        // Update basic properties if provided
        if (updateDTO.getModel() != null)
            equipment.setModel(updateDTO.getModel());
        if (updateDTO.getName() != null)
            equipment.setName(updateDTO.getName());
        if (updateDTO.getManufactureYear() != null)
            equipment.setManufactureYear(Year.of(updateDTO.getManufactureYear()));
        if (updateDTO.getPurchasedDate() != null)
            equipment.setPurchasedDate(updateDTO.getPurchasedDate());
        if (updateDTO.getDeliveredDate() != null)
            equipment.setDeliveredDate(updateDTO.getDeliveredDate());
        if (updateDTO.getEgpPrice() != null)
            equipment.setEgpPrice(updateDTO.getEgpPrice());
        if (updateDTO.getDollarPrice() != null)
            equipment.setDollarPrice(updateDTO.getDollarPrice());

        if (updateDTO.getExaminedBy() != null)
            equipment.setExaminedBy(updateDTO.getExaminedBy());
        if (updateDTO.getEquipmentComplaints() != null)
            equipment.setEquipmentComplaints(updateDTO.getEquipmentComplaints());
        if (updateDTO.getCountryOfOrigin() != null)
            equipment.setCountryOfOrigin(updateDTO.getCountryOfOrigin());
        if (updateDTO.getSerialNumber() != null)
            equipment.setSerialNumber(updateDTO.getSerialNumber());
        if (updateDTO.getShipping() != null)
            equipment.setShipping(updateDTO.getShipping());
        if (updateDTO.getCustoms() != null)
            equipment.setCustoms(updateDTO.getCustoms());
        if (updateDTO.getTaxes() != null)
            equipment.setTaxes(updateDTO.getTaxes());

        if (updateDTO.getStatus() != null)
            equipment.setStatus(updateDTO.getStatus());
        if (updateDTO.getRelatedDocuments() != null)
            equipment.setRelatedDocuments(updateDTO.getRelatedDocuments());
        if (updateDTO.getWorkedHours() != null)
            equipment.setWorkedHours(updateDTO.getWorkedHours());

        // Update relationships if provided
        if (updateDTO.getSiteId() != null) {
            Site site = siteRepository.findById(updateDTO.getSiteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Site not found with id: "
                            + updateDTO.getSiteId()));
            equipment.setSite(site);
            // Automatically set status to RUNNING when assigned to a site
            equipment.setStatus(EquipmentStatus.RUNNING);
        }

        // Update merchant relationship
        if (updateDTO.getPurchasedFrom() != null) {
            Merchant merchant = merchantRepository.findById(updateDTO.getPurchasedFrom())
                    .orElseThrow(() -> new ResourceNotFoundException("Merchant not found with id: "
                            + updateDTO.getPurchasedFrom()));
            equipment.setPurchasedFrom(merchant);
        }

        // Get the equipment type for driver validation
        EquipmentType equipmentType = equipment.getType();

        // Validate driver assignment for drivable equipment types
        if (!equipmentType.isDrivable()
                && (updateDTO.getMainDriverId() != null || updateDTO.getSubDriverId() != null)) {
            throw new IllegalArgumentException(
                    "Cannot assign drivers to non-drivable equipment type: " + equipmentType.getName());
        }

        if (updateDTO.getMainDriverId() != null) {
            Employee driver = employeeRepository.findById(updateDTO.getMainDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: "
                            + updateDTO.getMainDriverId()));

            // Get the equipment type - either from update DTO or from existing equipment
            if (updateDTO.getTypeId() != null) {
                equipmentType = equipmentTypeRepository.findById(updateDTO.getTypeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: "
                                + updateDTO.getTypeId()));
            }

            if (!driver.canDrive(equipmentType)) {
                throw new IllegalArgumentException("Employee " + driver.getFullName()
                        + " cannot be assigned as a driver for " + equipmentType.getName()
                        + ". Required position: " + equipmentType.getDriverPositionName());
            }

            equipment.setMainDriver(driver);
        }

        // Similar validation for sub driver
        if (updateDTO.getSubDriverId() != null) {
            Employee subDriver = employeeRepository.findById(updateDTO.getSubDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sub driver not found with id: "
                            + updateDTO.getSubDriverId()));

            // Get the equipment type - either from update DTO or from existing equipment
            if (updateDTO.getTypeId() != null) {
                equipmentType = equipmentTypeRepository.findById(updateDTO.getTypeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: "
                                + updateDTO.getTypeId()));
            }

            if (!subDriver.canDrive(equipmentType)) {
                throw new IllegalArgumentException("Employee " + subDriver.getFullName()
                        + " cannot be assigned as a sub driver for " + equipmentType.getName()
                        + ". Required position: " + equipmentType.getDriverPositionName());
            }

            equipment.setSubDriver(subDriver);
        }

        // Automatically assign drivers to equipment's site if both site and drivers are
        // assigned
        assignDriversToEquipmentSite(equipment);

        // Upload photo if provided (stored in equipment/{equipmentId}/ folder)
        if (equipmentPhoto != null && !equipmentPhoto.isEmpty()) {
            String fileName = minioService.uploadEquipmentFile(id, equipmentPhoto, "Main_Image");
            
            // CRITICAL: Save the storage key
            String storageKey = "equipment/" + equipment.getId() + "/" + fileName;
            equipment.setImageStorageKey(storageKey);
        }

        // Save the equipment
        Equipment updatedEquipment = equipmentRepository.save(equipment);

        // Create and return DTO
        EquipmentDTO resultDTO = EquipmentDTO.fromEntity(updatedEquipment);
        resultDTO.setImageUrl(resolveEquipmentImageUrl(updatedEquipment));


        // Send notifications to EQUIPMENT_MANAGER and ADMIN users
        try {
            String notificationTitle = "Equipment Updated";
            String notificationMessage = "Equipment '" + updatedEquipment.getName() + "' ("
                    + updatedEquipment.getModel() + ") has been updated";
            String actionUrl = "/equipment/" + updatedEquipment.getId();
            String relatedEntity = updatedEquipment.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity);

            System.out.println("Equipment update notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment update notifications: " + e.getMessage());
        }

        return resultDTO;
    }

    // Support for the old Map-based updateEquipment method
    // Support for the old Map-based updateEquipment method
    public EquipmentDTO updateEquipment(UUID id, Map<String, Object> requestBody, MultipartFile equipmentPhoto)
            throws Exception {
        EquipmentUpdateDTO updateDTO = new EquipmentUpdateDTO();

        // FIX: Parse type ID - handle both 'type' and 'typeId'
        if (requestBody.get("typeId") != null && !requestBody.get("typeId").toString().isEmpty()) {
            updateDTO.setTypeId(UUID.fromString(requestBody.get("typeId").toString()));
        } else if (requestBody.get("type") != null && !requestBody.get("type").toString().isEmpty()) {
            updateDTO.setTypeId(UUID.fromString(requestBody.get("type").toString()));
        }

        // FIX: Parse brand ID - handle both 'brand' and 'brandId'
        if (requestBody.get("brandId") != null && !requestBody.get("brandId").toString().isEmpty()) {
            updateDTO.setBrandId(UUID.fromString(requestBody.get("brandId").toString()));
        } else if (requestBody.get("brand") != null && !requestBody.get("brand").toString().isEmpty()) {
            updateDTO.setBrandId(UUID.fromString(requestBody.get("brand").toString()));
        }

        // Parse basic properties
        if (requestBody.get("model") != null && !requestBody.get("model").toString().isEmpty())
            updateDTO.setModel(requestBody.get("model").toString());
        if (requestBody.get("name") != null && !requestBody.get("name").toString().isEmpty())
            updateDTO.setName(requestBody.get("name").toString());

        if (requestBody.get("manufactureYear") != null && !requestBody.get("manufactureYear").toString().isEmpty())
            updateDTO.setManufactureYear(Integer.parseInt(requestBody.get("manufactureYear").toString()));
        if (requestBody.get("purchasedDate") != null && !requestBody.get("purchasedDate").toString().trim().isEmpty())
            updateDTO.setPurchasedDate(LocalDate.parse(requestBody.get("purchasedDate").toString()));
        if (requestBody.get("deliveredDate") != null && !requestBody.get("deliveredDate").toString().trim().isEmpty())
            updateDTO.setDeliveredDate(LocalDate.parse(requestBody.get("deliveredDate").toString()));
        if (requestBody.get("egpPrice") != null && !requestBody.get("egpPrice").toString().isEmpty())
            updateDTO.setEgpPrice(Double.parseDouble(requestBody.get("egpPrice").toString()));
        if (requestBody.get("dollarPrice") != null && !requestBody.get("dollarPrice").toString().isEmpty())
            updateDTO.setDollarPrice(Double.parseDouble(requestBody.get("dollarPrice").toString()));
        if (requestBody.get("purchasedFrom") != null && !requestBody.get("purchasedFrom").toString().isEmpty()
                && !requestBody.get("purchasedFrom").toString().equalsIgnoreCase("null"))
            updateDTO.setPurchasedFrom(UUID.fromString(requestBody.get("purchasedFrom").toString()));
        if (requestBody.get("examinedBy") != null && !requestBody.get("examinedBy").toString().isEmpty())
            updateDTO.setExaminedBy(requestBody.get("examinedBy").toString());
        if (requestBody.get("equipmentComplaints") != null
                && !requestBody.get("equipmentComplaints").toString().isEmpty())
            updateDTO.setEquipmentComplaints(requestBody.get("equipmentComplaints").toString());
        if (requestBody.get("countryOfOrigin") != null && !requestBody.get("countryOfOrigin").toString().isEmpty())
            updateDTO.setCountryOfOrigin(requestBody.get("countryOfOrigin").toString());
        if (requestBody.get("serialNumber") != null && !requestBody.get("serialNumber").toString().isEmpty())
            updateDTO.setSerialNumber(requestBody.get("serialNumber").toString());
        if (requestBody.get("shipping") != null && !requestBody.get("shipping").toString().isEmpty())
            updateDTO.setShipping(Double.parseDouble(requestBody.get("shipping").toString()));
        if (requestBody.get("customs") != null && !requestBody.get("customs").toString().isEmpty())
            updateDTO.setCustoms(Double.parseDouble(requestBody.get("customs").toString()));
        if (requestBody.get("taxes") != null && !requestBody.get("taxes").toString().isEmpty())
            updateDTO.setTaxes(Double.parseDouble(requestBody.get("taxes").toString()));

        if (requestBody.get("status") != null && !requestBody.get("status").toString().isEmpty()) {
            try {
                updateDTO.setStatus(EquipmentStatus.valueOf(requestBody.get("status").toString().toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Skip status update if invalid
            }
        }
        if (requestBody.get("relatedDocuments") != null && !requestBody.get("relatedDocuments").toString().isEmpty())
            updateDTO.setRelatedDocuments(requestBody.get("relatedDocuments").toString());
        if (requestBody.get("workedHours") != null && !requestBody.get("workedHours").toString().isEmpty())
            updateDTO.setWorkedHours(Integer.parseInt(requestBody.get("workedHours").toString()));

        // FIX: Parse relationships - handle both naming conventions
        if (requestBody.get("siteId") != null && !requestBody.get("siteId").toString().isEmpty()
                && !requestBody.get("siteId").toString().equalsIgnoreCase("null")) {
            updateDTO.setSiteId(UUID.fromString(requestBody.get("siteId").toString()));
        } else if (requestBody.get("site") != null && !requestBody.get("site").toString().isEmpty()
                && !requestBody.get("site").toString().equalsIgnoreCase("null")) {
            updateDTO.setSiteId(UUID.fromString(requestBody.get("site").toString()));
        }

        if (requestBody.get("mainDriverId") != null && !requestBody.get("mainDriverId").toString().isEmpty()
                && !requestBody.get("mainDriverId").toString().equalsIgnoreCase("null")) {
            updateDTO.setMainDriverId(UUID.fromString(requestBody.get("mainDriverId").toString()));
        } else if (requestBody.get("mainDriver") != null && !requestBody.get("mainDriver").toString().isEmpty()
                && !requestBody.get("mainDriver").toString().equalsIgnoreCase("null")) {
            updateDTO.setMainDriverId(UUID.fromString(requestBody.get("mainDriver").toString()));
        }

        if (requestBody.get("subDriverId") != null && !requestBody.get("subDriverId").toString().isEmpty()
                && !requestBody.get("subDriverId").toString().equalsIgnoreCase("null")) {
            updateDTO.setSubDriverId(UUID.fromString(requestBody.get("subDriverId").toString()));
        } else if (requestBody.get("subDriver") != null && !requestBody.get("subDriver").toString().isEmpty()
                && !requestBody.get("subDriver").toString().equalsIgnoreCase("null")) {
            updateDTO.setSubDriverId(UUID.fromString(requestBody.get("subDriver").toString()));
        }

        return updateEquipment(id, updateDTO, equipmentPhoto);
    }

    public EquipmentDTO updateEquipmentStatus(UUID id, EquipmentStatusUpdateDTO statusDTO) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));

        // Capture old status before update
        EquipmentStatus oldStatus = equipment.getStatus();

        // Update status
        equipment.setStatus(statusDTO.getStatus());

        // Save the equipment
        Equipment updatedEquipment = equipmentRepository.save(equipment);

        // Create and return DTO
        EquipmentDTO resultDTO = EquipmentDTO.fromEntity(updatedEquipment);
        resultDTO.setImageUrl(resolveEquipmentImageUrl(updatedEquipment));

        // Send notifications
        try {
            String oldStatusStr = oldStatus != null ? oldStatus.toString() : "UNKNOWN";
            String newStatusStr = statusDTO.getStatus().toString();

            String notificationTitle = "Equipment Status Changed";
            String notificationMessage = "Equipment '" + updatedEquipment.getName() + "' ("
                    + updatedEquipment.getModel() +
                    ") status changed from " + oldStatusStr + " to " + newStatusStr;
            String actionUrl = "/equipment/" + updatedEquipment.getId();
            String relatedEntity = updatedEquipment.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity);

            System.out.println("Equipment status change notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment status change notifications: " + e.getMessage());
        }

        return resultDTO;
    }

    // Support for the old Map-based updateEquipmentStatus method
    public EquipmentDTO updateEquipmentStatus(UUID id, Map<String, Object> requestBody) {
        EquipmentStatusUpdateDTO statusDTO = new EquipmentStatusUpdateDTO();

        if (requestBody.get("status") != null) {
            try {
                statusDTO.setStatus(EquipmentStatus.valueOf(requestBody.get("status").toString().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid status. Allowed values: AVAILABLE, RENTED, IN_MAINTENANCE, SOLD, SCRAPPED");
            }
        } else {
            throw new IllegalArgumentException("Status is required");
        }

        return updateEquipmentStatus(id, statusDTO);
    }

    // DELETE method

    public void deleteEquipment(UUID id) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));
        // Send notifications to EQUIPMENT_MANAGER and ADMIN users
        try {
            String notificationTitle = "Equipment Deleted";
            String notificationMessage = "Equipment '" + equipment.getName() + "' (" + equipment.getModel()
                    + ") has been deleted";
            String actionUrl = "/equipment";
            String relatedEntity = equipment.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity);

            System.out.println("Equipment deletion notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment deletion notifications: " + e.getMessage());
        }

        equipmentRepository.delete(equipment);
    }

    /**
     * Validates if an employee can be assigned as a driver for a specific equipment
     * 
     * @param equipment The equipment to check
     * @param employee  The potential driver to validate
     * @return true if the employee can drive this equipment, false otherwise
     */
    private boolean validateDriverForEquipment(Equipment equipment, Employee employee) {
        if (equipment == null || equipment.getType() == null || employee == null) {
            return false;
        }

        return employee.canDrive(equipment.getType().getName());
    }

    /**
     * Get all eligible drivers for a specific equipment type
     * 
     * @param equipmentTypeId The ID of the equipment type
     * @return List of employee summaries who can drive this equipment type
     */
    public List<EmployeeSummaryDTO> getEligibleDriversForEquipmentType(UUID equipmentTypeId) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        String requiredPosition = equipmentType.getDriverPositionName();

        // Find all employees with the required position
        List<Employee> eligibleDrivers = employeeRepository.findByJobPositionName(requiredPosition);

        return eligibleDrivers.stream()
                .map(EmployeeSummaryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get drivers for Sarky logs (anyone who can drive this type) - simplified version
     */
    public List<EmployeeSummaryDTO> getDriversForSarkyByEquipmentType(UUID equipmentTypeId) {
        // Reuse logic from getEligibleDrivers since we don't need to filter by availability for Sarky logs
        // Just need the list of people qualified to operate it
        return getEligibleDriversForEquipmentType(equipmentTypeId);
    }
    
    /**
     * Check compatibility between a specific driver and equipment
     */
    public DriverCompatibilityResponse checkDriverCompatibility(UUID equipmentId, UUID employeeId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));
            
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));
            
        boolean compatible = validateDriverForEquipment(equipment, employee);
        String message = compatible ? "Driver is compatible" : "Driver is not qualified for this equipment type";
        
        return new DriverCompatibilityResponse(compatible, message);
    }
    
    @Data
    public static class DriverCompatibilityResponse {
        private boolean compatible;
        private String message;
        
        public DriverCompatibilityResponse(boolean compatible, String message) {
            this.compatible = compatible;
            this.message = message;
        }
    }

    /**
     * Assign a driver to equipment
     */
    public EquipmentDTO assignDriverToEquipment(UUID equipmentId, UUID driverId, String type) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        Employee driver = employeeRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + driverId));

        // Validate compatibility
        if (!validateDriverForEquipment(equipment, driver)) {
            throw new IllegalArgumentException("Driver " + driver.getFullName() + " is not qualified for " + equipment.getType().getName());
        }

        if ("main".equalsIgnoreCase(type)) {
            equipment.setMainDriver(driver);
        } else if ("sub".equalsIgnoreCase(type)) {
            equipment.setSubDriver(driver);
        } else {
            throw new IllegalArgumentException("Invalid driver type. Use 'main' or 'sub'.");
        }

        // Also assign to site if equipment has one
        if (equipment.getSite() != null && driver.getSite() == null) {
            driver.setSite(equipment.getSite());
            employeeRepository.save(driver);
        }

        Equipment saved = equipmentRepository.save(equipment);
        
        // Return DTO with resolved image
        EquipmentDTO dto = EquipmentDTO.fromEntity(saved);
        dto.setImageUrl(resolveEquipmentImageUrl(saved));
        return dto;
    }

    /**
     * Unassign a driver from equipment
     */
    public EquipmentDTO unassignDriverFromEquipment(UUID equipmentId, UUID driverId, String type) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        if ("main".equalsIgnoreCase(type)) {
            if (equipment.getMainDriver() != null && equipment.getMainDriver().getId().equals(driverId)) {
                equipment.setMainDriver(null);
            } else {
                throw new IllegalArgumentException("Driver is not assigned as main driver for this equipment");
            }
        } else if ("sub".equalsIgnoreCase(type)) {
            if (equipment.getSubDriver() != null && equipment.getSubDriver().getId().equals(driverId)) {
                equipment.setSubDriver(null);
            } else {
                throw new IllegalArgumentException("Driver is not assigned as sub driver for this equipment");
            }
        } else {
            throw new IllegalArgumentException("Invalid driver type. Use 'main' or 'sub'.");
        }

        Equipment saved = equipmentRepository.save(equipment);
        
        // Return DTO with resolved image
        EquipmentDTO dto = EquipmentDTO.fromEntity(saved);
        dto.setImageUrl(resolveEquipmentImageUrl(saved));
        return dto;
    }

    /**
     * Helper to assign drivers to equipment's site
     */
    private void assignDriversToEquipmentSite(Equipment equipment) {
        if (equipment.getSite() == null) return;

        if (equipment.getMainDriver() != null && equipment.getMainDriver().getSite() == null) {
            Employee mainDriver = equipment.getMainDriver();
            mainDriver.setSite(equipment.getSite());
            employeeRepository.save(mainDriver);
        }

        if (equipment.getSubDriver() != null && equipment.getSubDriver().getSite() == null) {
            Employee subDriver = equipment.getSubDriver();
            subDriver.setSite(equipment.getSite());
            employeeRepository.save(subDriver);
        }
    }

    public List<WorkTypeDTO> getSupportedWorkTypesForEquipmentType(UUID typeId) {
        // This would typically query a relationship table or config
        // For now returning empty list or mocks
        return new ArrayList<>();
    }

    public EquipmentSarkyAnalyticsDTO getSarkyAnalyticsForEquipment(UUID equipmentId) {
        // Mock implementation or real one
        return new EquipmentSarkyAnalyticsDTO();
    }
}