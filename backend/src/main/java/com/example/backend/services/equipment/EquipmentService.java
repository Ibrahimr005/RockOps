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
import com.example.backend.dto.hr.EmployeeSummaryDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.*;
import com.example.backend.models.merchant.Merchant;
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
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.Comparator;



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
    private final EquipmentBrandRepository equipmentBrandRepository ;

    @Autowired
    private SarkyLogRepository sarkyLogRepository;

    @Autowired
    public EquipmentService(
            EquipmentRepository equipmentRepository,
            EquipmentTypeRepository equipmentTypeRepository,
            SiteRepository siteRepository,
            EmployeeRepository employeeRepository,
            MinioService minioService, EquipmentBrandRepository equipmentBrandRepository
    ) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.siteRepository = siteRepository;
        this.employeeRepository = employeeRepository;
        this.minioService = minioService;
        this.equipmentBrandRepository = equipmentBrandRepository;
    }

    // GET methods

    public List<EquipmentDTO> getAllEquipment() {
        List<Equipment> equipments = equipmentRepository.findAll();
        return equipments.stream()
                .map(equipment -> {
                    EquipmentDTO dto = EquipmentDTO.fromEntity(equipment);
                    try {
                        String imageUrl = minioService.getEquipmentMainPhoto(equipment.getId());
                        dto.setImageUrl(imageUrl);
                    } catch (Exception e) {
                        dto.setImageUrl(null);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public EquipmentDTO getEquipmentById(UUID id) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));

        EquipmentDTO dto = EquipmentDTO.fromEntity(equipment);

        try {
            String imageUrl = minioService.getEquipmentMainPhoto(equipment.getId());
            dto.setImageUrl(imageUrl);
        } catch (Exception e) {
            dto.setImageUrl(null);
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
                    try {
                        String imageUrl = minioService.getEquipmentMainPhoto(equipment.getId());
                        dto.setImageUrl(imageUrl);
                    } catch (Exception e) {
                        dto.setImageUrl(null);
                    }
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

        EquipmentBrand equipmentBrand  = equipmentBrandRepository.findById(createDTO.getBrandId())
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
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
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
        if (!equipmentType.isDrivable() && (createDTO.getMainDriverId() != null || createDTO.getSubDriverId() != null)) {
            throw new IllegalArgumentException("Cannot assign drivers to non-drivable equipment type: " + equipmentType.getName());
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

        // Automatically assign drivers to equipment's site if both site and drivers are assigned
        assignDriversToEquipmentSite(equipment);

        // Save the equipment
        Equipment savedEquipment = equipmentRepository.save(equipment);

        // Create MinIO bucket for this equipment
        minioService.createEquipmentBucket(savedEquipment.getId());

        // Upload photo if provided
        if (equipmentPhoto != null && !equipmentPhoto.isEmpty()) {
            minioService.uploadEquipmentFile(savedEquipment.getId(), equipmentPhoto, "Main_Image");
        }

        // Create and return DTO
        EquipmentDTO resultDTO = EquipmentDTO.fromEntity(savedEquipment);

        try {
            String imageUrl = minioService.getEquipmentMainPhoto(savedEquipment.getId());
            resultDTO.setImageUrl(imageUrl);
        } catch (Exception e) {
            resultDTO.setImageUrl(null);
        }

        return resultDTO;
    }

    // Support for the old Map-based createEquipment method
// Fixed Map-based createEquipment method in EquipmentService.java
    public EquipmentDTO createEquipment(Map<String, Object> requestBody, MultipartFile equipmentPhoto) throws Exception {
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
        if (requestBody.get("model") != null) createDTO.setModel(requestBody.get("model").toString());
        if (requestBody.get("name") != null) createDTO.setName(requestBody.get("name").toString());
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
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
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
    public EquipmentDTO updateEquipment(UUID id, EquipmentUpdateDTO updateDTO, MultipartFile equipmentPhoto) throws Exception {
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
        if (updateDTO.getModel() != null) equipment.setModel(updateDTO.getModel());
        if (updateDTO.getName() != null) equipment.setName(updateDTO.getName());
        if (updateDTO.getManufactureYear() != null)
            equipment.setManufactureYear(Year.of(updateDTO.getManufactureYear()));
        if (updateDTO.getPurchasedDate() != null) equipment.setPurchasedDate(updateDTO.getPurchasedDate());
        if (updateDTO.getDeliveredDate() != null) equipment.setDeliveredDate(updateDTO.getDeliveredDate());
        if (updateDTO.getEgpPrice() != null) equipment.setEgpPrice(updateDTO.getEgpPrice());
        if (updateDTO.getDollarPrice() != null) equipment.setDollarPrice(updateDTO.getDollarPrice());

        if (updateDTO.getExaminedBy() != null) equipment.setExaminedBy(updateDTO.getExaminedBy());
        if (updateDTO.getEquipmentComplaints() != null)
            equipment.setEquipmentComplaints(updateDTO.getEquipmentComplaints());
        if (updateDTO.getCountryOfOrigin() != null) equipment.setCountryOfOrigin(updateDTO.getCountryOfOrigin());
        if (updateDTO.getSerialNumber() != null) equipment.setSerialNumber(updateDTO.getSerialNumber());
        if (updateDTO.getShipping() != null) equipment.setShipping(updateDTO.getShipping());
        if (updateDTO.getCustoms() != null) equipment.setCustoms(updateDTO.getCustoms());
        if (updateDTO.getTaxes() != null) equipment.setTaxes(updateDTO.getTaxes());
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
        if (updateDTO.getStatus() != null) equipment.setStatus(updateDTO.getStatus());
        if (updateDTO.getRelatedDocuments() != null) equipment.setRelatedDocuments(updateDTO.getRelatedDocuments());
        if (updateDTO.getWorkedHours() != null) equipment.setWorkedHours(updateDTO.getWorkedHours());

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
        if (!equipmentType.isDrivable() && (updateDTO.getMainDriverId() != null || updateDTO.getSubDriverId() != null)) {
            throw new IllegalArgumentException("Cannot assign drivers to non-drivable equipment type: " + equipmentType.getName());
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

        // Automatically assign drivers to equipment's site if both site and drivers are assigned
        assignDriversToEquipmentSite(equipment);

        // Save the equipment
        Equipment updatedEquipment = equipmentRepository.save(equipment);

        // Upload photo if provided
        if (equipmentPhoto != null && !equipmentPhoto.isEmpty()) {
            minioService.uploadEquipmentFile(id, equipmentPhoto, "Main_Image");
        }

        // Create and return DTO
        EquipmentDTO resultDTO = EquipmentDTO.fromEntity(updatedEquipment);

        try {
            String imageUrl = minioService.getEquipmentMainPhoto(updatedEquipment.getId());
            resultDTO.setImageUrl(imageUrl);
        } catch (Exception e) {
            resultDTO.setImageUrl(null);
        }

        return resultDTO;
    }
    // Support for the old Map-based updateEquipment method
// Support for the old Map-based updateEquipment method
    public EquipmentDTO updateEquipment(UUID id, Map<String, Object> requestBody, MultipartFile equipmentPhoto) throws Exception {
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
        if (requestBody.get("equipmentComplaints") != null && !requestBody.get("equipmentComplaints").toString().isEmpty())
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
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
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
        // Check if equipment exists
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));

        // Update status
        equipment.setStatus(statusDTO.getStatus());

        // Save the equipment
        Equipment updatedEquipment = equipmentRepository.save(equipment);

        // Create and return DTO
        EquipmentDTO resultDTO = EquipmentDTO.fromEntity(updatedEquipment);

        try {
            String imageUrl = minioService.getEquipmentMainPhoto(updatedEquipment.getId());
            resultDTO.setImageUrl(imageUrl);
        } catch (Exception e) {
            resultDTO.setImageUrl(null);
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
                throw new IllegalArgumentException("Invalid status. Allowed values: AVAILABLE, RENTED, IN_MAINTENANCE, SOLD, SCRAPPED");
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

        equipmentRepository.delete(equipment);
    }

    /**
     * Validates if an employee can be assigned as a driver for a specific equipment
     * @param equipment The equipment to check
     * @param employee The potential driver to validate
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
     * @param equipmentTypeId The ID of the equipment type
     * @return List of employee summaries who can drive this equipment type
     */
    public List<EmployeeSummaryDTO> getEligibleDriversForEquipmentType(UUID equipmentTypeId) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        // Get list of already assigned drivers
        List<UUID> assignedDriverIds = equipmentRepository.findAll().stream()
                .filter(e -> e.getMainDriver() != null)
                .map(e -> e.getMainDriver().getId())
                .collect(Collectors.toList());

        // Find all employees who can drive this equipment type
        List<Employee> allEmployees = employeeRepository.findAll();
        List<Employee> eligibleDrivers = allEmployees.stream()
                .filter(employee ->
                        // Make sure employee is active
                        "ACTIVE".equals(employee.getStatus()) &&
                                // Check if they can drive this equipment type
                                employee.canDrive(equipmentType) &&
                                // Check if they are not already assigned as a main driver to another equipment
                                !assignedDriverIds.contains(employee.getId()))
                .collect(Collectors.toList());

        // Convert to EmployeeSummaryDTO
        return eligibleDrivers.stream()
                .map(this::convertToSummaryDTO)
                .collect(Collectors.toList());
    }

    public List<EmployeeSummaryDTO> getDriversForSarkyByEquipmentType(UUID equipmentTypeId) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        // Find all employees who can drive this equipment type (no assignment restrictions)
        List<Employee> allEmployees = employeeRepository.findAll();
        List<Employee> eligibleDrivers = allEmployees.stream()
                .filter(employee ->
                        // Make sure employee is active
                        "ACTIVE".equals(employee.getStatus()) &&
                                // Check if they can drive this equipment type
                                employee.canDrive(equipmentType))
                .collect(Collectors.toList());

        // Convert to EmployeeSummaryDTO
        return eligibleDrivers.stream()
                .map(this::convertToSummaryDTO)
                .collect(Collectors.toList());
    }

    // Helper method to convert Employee to EmployeeSummaryDTO
    private EmployeeSummaryDTO convertToSummaryDTO(Employee employee) {
        return EmployeeSummaryDTO.builder()
                .id(employee.getId())
                .fullName(employee.getFullName())
                .position(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
                .department(employee.getJobPosition() != null ? employee.getJobPosition().getDepartment() : null)
                .email(employee.getEmail())
                .phoneNumber(employee.getPhoneNumber())
                .status(employee.getStatus())
                .siteName(employee.getSite() != null ? employee.getSite().getName() : null)
                .photoUrl(employee.getPhotoUrl())
                .salary(employee.getBaseSalary())
                .employmentType(employee.getContractType())
                .hireDate(employee.getHireDate() != null ? employee.getHireDate().toString() : null)
                .build();
    }

    /**
     * Helper method to automatically assign drivers to the equipment's site
     * This ensures that if equipment is assigned to a site and has drivers,
     * those drivers are also assigned to the same site
     */
    private void assignDriversToEquipmentSite(Equipment equipment) {
        if (equipment.getSite() == null) {
            return; // No site assigned, nothing to do
        }

        Site equipmentSite = equipment.getSite();
        boolean driversUpdated = false;

        // Assign main driver to equipment's site if driver exists and is not already assigned to this site
        if (equipment.getMainDriver() != null && 
            (equipment.getMainDriver().getSite() == null || 
             !equipment.getMainDriver().getSite().getId().equals(equipmentSite.getId()))) {
            
            equipment.getMainDriver().setSite(equipmentSite);
            employeeRepository.save(equipment.getMainDriver());
            driversUpdated = true;
        }

        // Assign sub driver to equipment's site if driver exists and is not already assigned to this site
        if (equipment.getSubDriver() != null && 
            (equipment.getSubDriver().getSite() == null || 
             !equipment.getSubDriver().getSite().getId().equals(equipmentSite.getId()))) {
            
            equipment.getSubDriver().setSite(equipmentSite);
            employeeRepository.save(equipment.getSubDriver());
            driversUpdated = true;
        }

        if (driversUpdated) {
            System.out.println("Automatically assigned driver(s) to site: " + equipmentSite.getName());
        }
    }

    /**
     * Check if an employee can be assigned as a driver for an equipment
     * Returns a response with compatibility status and reason
     */
    public DriverCompatibilityResponse checkDriverCompatibility(UUID equipmentId, UUID employeeId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        EquipmentType equipmentType = equipment.getType();
        boolean isCompatible = employee.canDrive(equipmentType);

        DriverCompatibilityResponse response = new DriverCompatibilityResponse();
        response.setCompatible(isCompatible);

        if (isCompatible) {
            response.setMessage("Employee " + employee.getFullName() + " can drive this " + equipmentType.getName());
        } else {
            response.setMessage("Employee " + employee.getFullName() + " cannot drive this " + equipmentType.getName() +
                    ". Required position: " + equipmentType.getRequiredDriverPosition());
            response.setRequiredPosition(equipmentType.getRequiredDriverPosition());
        }

        return response;
    }

    /**
     * Get supported work types for a specific equipment type
     */
    public List<WorkTypeDTO> getSupportedWorkTypesForEquipmentType(UUID equipmentTypeId) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        return equipmentType.getSupportedWorkTypes().stream()
                .filter(WorkType::isActive)
                .map(workType -> {
                    WorkTypeDTO dto = new WorkTypeDTO();
                    dto.setId(workType.getId());
                    dto.setName(workType.getName());
                    dto.setDescription(workType.getDescription());
                    dto.setActive(workType.isActive());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get sarky analytics data for equipment dashboard
     */
    public EquipmentSarkyAnalyticsDTO getSarkyAnalyticsForEquipment(UUID equipmentId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        // Get all sarky logs for this equipment
        List<SarkyLog> sarkyLogs = sarkyLogRepository.findByEquipmentIdOrderByDateAsc(equipmentId);
        
        EquipmentSarkyAnalyticsDTO analytics = new EquipmentSarkyAnalyticsDTO();
        analytics.setEquipmentId(equipmentId);
        analytics.setEquipmentName(equipment.getName());
        analytics.setEquipmentType(equipment.getType().getName());

        if (sarkyLogs.isEmpty()) {
            analytics.setTotalWorkHours(0.0);
            analytics.setTotalWorkDays(0);
            analytics.setAverageHoursPerDay(0.0);
            analytics.setWorkTypeBreakdown(new ArrayList<>());
            analytics.setDriverBreakdown(new ArrayList<>());
            analytics.setMonthlyWorkHours(new ArrayList<>());
            return analytics;
        }

        // Calculate total work hours and days
        double totalHours = sarkyLogs.stream().mapToDouble(SarkyLog::getWorkedHours).sum();
        int totalDays = sarkyLogs.size();
        double averageHours = totalDays > 0 ? totalHours / totalDays : 0.0;

        analytics.setTotalWorkHours(Math.round(totalHours * 100.0) / 100.0);
        analytics.setTotalWorkDays(totalDays);
        analytics.setAverageHoursPerDay(Math.round(averageHours * 100.0) / 100.0);

        // Work type breakdown
        Map<String, Double> workTypeHours = sarkyLogs.stream()
                .collect(Collectors.groupingBy(
                    log -> log.getWorkType().getName(),
                    Collectors.summingDouble(SarkyLog::getWorkedHours)
                ));

        List<WorkTypeAnalyticsDTO> workTypeBreakdown = workTypeHours.entrySet().stream()
                .map(entry -> {
                    WorkTypeAnalyticsDTO dto = new WorkTypeAnalyticsDTO();
                    dto.setWorkTypeName(entry.getKey());
                    dto.setTotalHours(Math.round(entry.getValue() * 100.0) / 100.0);
                    dto.setPercentage(Math.round((entry.getValue() / totalHours) * 100.0 * 100.0) / 100.0);
                    return dto;
                })
                .sorted((a, b) -> Double.compare(b.getTotalHours(), a.getTotalHours()))
                .collect(Collectors.toList());

        analytics.setWorkTypeBreakdown(workTypeBreakdown);

        // Driver breakdown
        Map<String, Double> driverHours = sarkyLogs.stream()
                .collect(Collectors.groupingBy(
                    log -> log.getDriver().getFirstName() + " " + log.getDriver().getLastName(),
                    Collectors.summingDouble(SarkyLog::getWorkedHours)
                ));

        List<DriverAnalyticsDTO> driverBreakdown = driverHours.entrySet().stream()
                .map(entry -> {
                    DriverAnalyticsDTO dto = new DriverAnalyticsDTO();
                    dto.setDriverName(entry.getKey());
                    dto.setTotalHours(Math.round(entry.getValue() * 100.0) / 100.0);
                    dto.setPercentage(Math.round((entry.getValue() / totalHours) * 100.0 * 100.0) / 100.0);
                    return dto;
                })
                .sorted((a, b) -> Double.compare(b.getTotalHours(), a.getTotalHours()))
                .collect(Collectors.toList());

        analytics.setDriverBreakdown(driverBreakdown);

        // Monthly work hours for the last 12 months
        Map<String, Double> monthlyHours = sarkyLogs.stream()
                .collect(Collectors.groupingBy(
                    log -> log.getDate().getYear() + "-" + String.format("%02d", log.getDate().getMonthValue()),
                    Collectors.summingDouble(SarkyLog::getWorkedHours)
                ));

        List<MonthlyWorkHoursDTO> monthlyWorkHours = monthlyHours.entrySet().stream()
                .map(entry -> {
                    MonthlyWorkHoursDTO dto = new MonthlyWorkHoursDTO();
                    dto.setMonth(entry.getKey());
                    dto.setTotalHours(Math.round(entry.getValue() * 100.0) / 100.0);
                    
                    // Count work days for this month
                    long workDays = sarkyLogs.stream()
                            .filter(log -> {
                                String logMonth = log.getDate().getYear() + "-" + String.format("%02d", log.getDate().getMonthValue());
                                return logMonth.equals(entry.getKey());
                            })
                            .count();
                    dto.setWorkDays((int) workDays);
                    dto.setAverageHoursPerDay(workDays > 0 ? Math.round((entry.getValue() / workDays) * 100.0) / 100.0 : 0.0);
                    
                    return dto;
                })
                .sorted(Comparator.comparing(MonthlyWorkHoursDTO::getMonth))
                .collect(Collectors.toList());

        // Get only last 12 months
        if (monthlyWorkHours.size() > 12) {
            monthlyWorkHours = monthlyWorkHours.subList(monthlyWorkHours.size() - 12, monthlyWorkHours.size());
        }

        analytics.setMonthlyWorkHours(monthlyWorkHours);

        // Set first and last work dates
        analytics.setFirstWorkDate(sarkyLogs.get(0).getDate());
        analytics.setLastWorkDate(sarkyLogs.get(sarkyLogs.size() - 1).getDate());

        return analytics;
    }

    // Create a simple response class for compatibility checking
    @Data
    public class DriverCompatibilityResponse {
        private boolean compatible;
        private String message;
        private String requiredPosition;
    }

}