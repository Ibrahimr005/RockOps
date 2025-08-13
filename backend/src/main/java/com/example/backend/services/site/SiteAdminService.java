package com.example.backend.services.site;

import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.fixedAssets.FixedAssetsRepository;
import com.example.backend.models.Partner;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.site.SitePartner;
import com.example.backend.models.site.SitePartnerId;
import com.example.backend.repositories.*;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SitePartnerRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class SiteAdminService
{
//    private final FixedAssetRepository fixedAssetRepository;
    private SiteRepository siteRepository;
    private PartnerRepository partnerRepository;
    private EquipmentRepository equipmentRepository;
    private EmployeeRepository employeeRepository;
    private WarehouseRepository warehouseRepository;
    private FixedAssetsRepository fixedAssetsRepository;
    private SitePartnerRepository sitePartnerRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    public SiteAdminService(SiteRepository siteRepository, PartnerRepository partnerRepository, EquipmentRepository equipmentRepository, EmployeeRepository employeeRepository, WarehouseRepository warehouseRepository, FixedAssetsRepository fixedAssetsRepository, SitePartnerRepository sitePartnerRepository) {
        this.siteRepository = siteRepository;
        this.partnerRepository = partnerRepository;
        this.equipmentRepository = equipmentRepository;
        this.employeeRepository = employeeRepository;
        this.warehouseRepository= warehouseRepository;
        this.fixedAssetsRepository = fixedAssetsRepository;
        this.sitePartnerRepository = sitePartnerRepository;
    }


    @Transactional
    public Site addSite(Map<String, Object> siteData) {
        try {
            System.out.println("=== Creating new site ===");

            // Create site entity
            Site site = new Site();
            site.setName((String) siteData.get("name"));
            site.setPhysicalAddress((String) siteData.get("physicalAddress"));
            site.setCompanyAddress((String) siteData.get("companyAddress"));
            // Don't initialize sitePartners collection to avoid cascade issues

            if (siteData.get("photoUrl") != null) {
                site.setPhotoUrl((String) siteData.get("photoUrl"));
            }

            if (siteData.get("creationDate") != null) {
                site.setCreationDate(LocalDate.parse((String) siteData.get("creationDate")));
            }

            // Save site first
            Site savedSite = siteRepository.save(site);
            System.out.println("Site saved with ID: " + savedSite.getId());

            // Create default partner assignment using direct repository save
            createDefaultPartnerAssignment(savedSite.getId());

            System.out.println("=== Site creation completed ===");
            return savedSite;

        } catch (Exception e) {
            System.err.println("ERROR in addSite: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to create site: " + e.getMessage(), e);
        }
    }

    public void deleteSite(UUID id)
    {
        try {
            Site site = siteRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Site not found"));
            if(site.getEmployees() != null && !site.getEmployees().isEmpty())
            {
                throw new RuntimeException("Site already has employees");
            }
            if(site.getEquipment() != null && !site.getEquipment().isEmpty())
            {
                throw new RuntimeException("Site already has equipment");
            }
            if(site.getWarehouses() != null && !site.getWarehouses().isEmpty())
            {
                throw new RuntimeException("Site already has warehouses");
            }
            if(site.getFixedAssets() != null && !site.getFixedAssets().isEmpty())
            {
                throw new RuntimeException("Site already has fixed assets");
            }
            siteRepository.delete(site);
            System.out.println("Successfully deleted site with id: " + id);
        }
        catch (Exception e) {
            System.err.println("Error deleting site: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete site: " + e.getMessage(), e);
        }
}

    // Helper method to create default assignment
    private void createDefaultPartnerAssignment(UUID siteId) {
        try {
            System.out.println("Creating default partner assignment");

            // Get default partner
            Partner defaultPartner = ensureDefaultPartnerExists();
            System.out.println("Default partner ID: " + defaultPartner.getId());

            // Check if assignment already exists
            SitePartnerId assignmentId = new SitePartnerId(siteId, defaultPartner.getId());
            if (sitePartnerRepository.existsById(assignmentId)) {
                System.out.println("Assignment already exists, skipping");
                return;
            }

            // Use native query to insert directly (avoids Hibernate session conflicts)
            String sql = "INSERT INTO site_partner (site_id, partner_id, percentage) VALUES (?1, ?2, ?3)";

            int rowsAffected = entityManager.createNativeQuery(sql)
                    .setParameter(1, siteId)
                    .setParameter(2, defaultPartner.getId())
                    .setParameter(3, 100.0)
                    .executeUpdate();

            if (rowsAffected > 0) {
                System.out.println("Default assignment created successfully");
            } else {
                System.out.println("No rows affected - assignment may already exist");
            }

        } catch (Exception e) {
            System.err.println("Error creating default assignment: " + e.getMessage());
            e.printStackTrace();
            // Don't throw here to avoid breaking site creation
        }
    }

    // Alternative helper method using repository (if native query doesn't work)
    private void createDefaultPartnerAssignmentAlternative(UUID siteId) {
        try {
            System.out.println("Creating default assignment using repository");

            Partner defaultPartner = ensureDefaultPartnerExists();

            // Create minimal entities to avoid session conflicts
            Site siteRef = new Site();
            siteRef.setId(siteId);

            Partner partnerRef = new Partner();
            partnerRef.setId(defaultPartner.getId());

            SitePartnerId assignmentId = new SitePartnerId(siteId, defaultPartner.getId());

            if (!sitePartnerRepository.existsById(assignmentId)) {
                SitePartner assignment = new SitePartner();
                assignment.setId(assignmentId);
                assignment.setSite(siteRef);  // Use reference entity
                assignment.setPartner(partnerRef);  // Use reference entity
                assignment.setPercentage(100.0);

                sitePartnerRepository.save(assignment);
                System.out.println("Default assignment created");
            }

        } catch (Exception e) {
            System.err.println("Error in alternative assignment creation: " + e.getMessage());
            e.printStackTrace();
        }
    }


//    @Transactional
//    public Site addSite(Map<String, Object> siteData) {
//        Site site = new Site();
//        site.setName((String) siteData.get("name"));
//        site.setPhysicalAddress((String) siteData.get("physicalAddress"));
//        site.setCompanyAddress((String) siteData.get("companyAddress"));
//
//        // Store the photo URL if provided
//        if (siteData.get("photoUrl") != null) {
//            site.setPhotoUrl((String) siteData.get("photoUrl"));
//        }
//
//        // Convert and set creation date
//        if (siteData.get("creationDate") != null) {
//            site.setCreationDate(LocalDate.parse((String) siteData.get("creationDate")));
//        }
//
//        // Initialize the sitePartners list if it's null
//        if (site.getSitePartners() == null) {
//            site.setSitePartners(new ArrayList<>());
//        }
//
//        // Save site entity first to get an ID
//        site = siteRepository.save(site);
//
//        // Handle partners (if provided)
//        if (siteData.get("partners") instanceof List<?> partnersList) {
//            for (Object partnerData : partnersList) {
//                if (partnerData instanceof Map<?, ?> partnerMap) {
//                    int partnerId = ((Number) partnerMap.get("partnerId")).intValue();
//                    Double percentage = partnerMap.get("percentage") != null ?
//                            ((Number) partnerMap.get("percentage")).doubleValue() : 0.0;
//
//                    Partner partner = partnerRepository.findById(partnerId)
//                            .orElseThrow(() -> new RuntimeException("❌ Partner not found with ID: " + partnerId));
//
//                    // Create the SitePartner entity with percentage
//                    SitePartnerId id = new SitePartnerId(site.getId(), partner.getId());
//                    SitePartner sitePartner = new SitePartner();
//                    sitePartner.setId(id);
//                    sitePartner.setSite(site);
//                    sitePartner.setPartner(partner);
//                    sitePartner.setPercentage(percentage);
//
//                    // Add to site collection only - don't modify partner collection here
//                    site.getSitePartners().add(sitePartner);
//
//                    // Let the cascade do the work of saving the SitePartner
//                }
//            }
//        }
//
//        // Save the site again with its partners
//        return siteRepository.save(site);
//    }

    @Transactional
    public Site updateSite(UUID siteId, Map<String, Object> updates) {
        System.out.println("Updating site with ID: " + siteId); // Debugging log

        Site existingSite = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("Site not found: " + siteId));

        updates.forEach((key, value) -> {
            switch (key) {
                case "name":
                    existingSite.setName((String) value);
                    break;
                case "physicalAddress":
                    existingSite.setPhysicalAddress((String) value);
                    break;
                case "companyAddress":
                    existingSite.setCompanyAddress((String) value);
                    break;
                case "creationDate":
                    existingSite.setCreationDate(LocalDate.parse((String) value));
                    break;
                case "photoUrl":
                    existingSite.setPhotoUrl((String) value);
                    break;
//                case "partners": // Updated to handle partners with percentages
//                    if (value instanceof List<?> partnersList) {
//                        // Clear existing site partners
//                        if (existingSite.getSitePartners() != null) {
//                            existingSite.getSitePartners().clear();
//                        } else {
//                            existingSite.setSitePartners(new ArrayList<>());
//                        }
//
//                        // Add updated partners with percentages
//                        for (Object partnerData : partnersList) {
//                            if (partnerData instanceof Map<?, ?> partnerMap) {
//                                int partnerId = ((Number) partnerMap.get("partnerId")).intValue();
//                                Double percentage = partnerMap.get("percentage") != null ?
//                                        ((Number) partnerMap.get("percentage")).doubleValue() : 0.0;
//
//                                Partner partner = partnerRepository.findById(partnerId)
//                                        .orElseThrow(() -> new RuntimeException("❌ Partner not found with ID: " + partnerId));
//
//                                // Create the SitePartner entity with percentage
//                                SitePartnerId id = new SitePartnerId(existingSite.getId(), partner.getId());
//                                SitePartner sitePartner = new SitePartner();
//                                sitePartner.setId(id);
//                                sitePartner.setSite(existingSite);
//                                sitePartner.setPartner(partner);
//                                sitePartner.setPercentage(percentage);
//
//                                existingSite.getSitePartners().add(sitePartner);
//                            }
//                        }
//                    }
//                    break;
                default:
                    throw new IllegalArgumentException("Invalid field: " + key);
            }
        });

        return siteRepository.save(existingSite);
    }



    @Transactional
    public Equipment assignEquipmentToSite(UUID siteId, UUID equipmentId) {
        try {
            System.out.println("=== Starting equipment assignment ===");
            System.out.println("Site ID: " + siteId + ", Equipment ID: " + equipmentId);

            // Validate inputs
            if (siteId == null || equipmentId == null) {
                throw new IllegalArgumentException("Site ID and Equipment ID cannot be null");
            }

            // Find site
            Site site = siteRepository.findById(siteId)
                    .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));
            System.out.println("Site found: " + site.getName());

            // Find equipment
            Equipment equipment = equipmentRepository.findById(equipmentId)
                    .orElseThrow(() -> new RuntimeException("❌ Equipment not found with ID: " + equipmentId));
            System.out.println("Equipment found: " + equipment.getModel());

            // Check if equipment is already assigned
            if (equipment.getSite() != null) {
                throw new RuntimeException("Equipment is already assigned to site: " + equipment.getSite().getName());
            }

            // Assign equipment to site
            equipment.setSite(site);
            System.out.println("Equipment assigned to site");

            // Set equipment status safely
            try {
                if (equipment.getStatus() == null) {
                    equipment.setStatus(EquipmentStatus.RUNNING);
                    System.out.println("Equipment status set to RUNNING");
                }
            } catch (Exception e) {
                System.out.println("Warning: Could not set equipment status - " + e.getMessage());
                // Continue without failing the entire operation
            }

            // Handle main driver assignment
            if (equipment.getMainDriver() != null) {
                try {
                    Employee mainDriver = equipment.getMainDriver();
                    System.out.println("Processing main driver: " + mainDriver.getFirstName());

                    if (mainDriver.getSite() == null) {
                        mainDriver.setSite(site);
                        employeeRepository.save(mainDriver);
                        System.out.println("Main driver assigned to site");
                    } else {
                        System.out.println("Main driver already assigned to site: " + mainDriver.getSite().getName());
                    }
                } catch (Exception e) {
                    System.err.println("Error assigning main driver: " + e.getMessage());
                    // Log but don't fail the entire operation
                }
            }

            // Handle sub driver assignment
            if (equipment.getSubDriver() != null) {
                try {
                    Employee subDriver = equipment.getSubDriver();
                    System.out.println("Processing sub driver: " + subDriver.getFirstName());

                    if (subDriver.getSite() == null) {
                        subDriver.setSite(site);
                        employeeRepository.save(subDriver);
                        System.out.println("Sub driver assigned to site");
                    } else {
                        System.out.println("Sub driver already assigned to site: " + subDriver.getSite().getName());
                    }
                } catch (Exception e) {
                    System.err.println("Error assigning sub driver: " + e.getMessage());
                    // Log but don't fail the entire operation
                }
            }

            // Save equipment
            Equipment savedEquipment = equipmentRepository.save(equipment);
            System.out.println("Equipment saved successfully");

            System.out.println("=== Equipment assignment completed ===");
            return savedEquipment;

        } catch (Exception e) {
            System.err.println("ERROR in assignEquipmentToSite: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to assign equipment to site: " + e.getMessage(), e);
        }
    }

// Add these helper methods to your service class

    public boolean siteExists(UUID siteId) {
        return siteRepository.existsById(siteId);
    }

    public boolean equipmentExists(UUID equipmentId) {
        return equipmentRepository.existsById(equipmentId);
    }


    @Transactional
    public Equipment removeEquipmentFromSite(UUID siteId, UUID equipmentId) {
        siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("❌ Equipment not found with ID: " + equipmentId));

        if (equipment.getSite() == null || !equipment.getSite().getId().equals(siteId)) {
            throw new RuntimeException("Equipment is not assigned to the specified site!");
        }

        // Unassign main driver from the site if exists
        if (equipment.getMainDriver() != null) {
            Employee mainDriver = equipment.getMainDriver();
            mainDriver.setSite(null);
            employeeRepository.save(mainDriver);
        }

        // Unassign sub driver from the site if exists
        if (equipment.getSubDriver() != null) {
            Employee subDriver = equipment.getSubDriver();
            subDriver.setSite(null);
            employeeRepository.save(subDriver);
        }

        equipment.setSite(null);
        return equipmentRepository.save(equipment);
    }



    @Transactional
    public Employee assignEmployeeToSite(UUID siteId, UUID employeeId) {
        Optional<Employee> optionalEmployee = employeeRepository.findById(employeeId);
        Optional<Site> optionalSite = siteRepository.findById(siteId);

        if (optionalEmployee.isEmpty() || optionalSite.isEmpty()) {
            throw new RuntimeException("Employee or Site not found");
        }

        Employee employee = optionalEmployee.get();
        Site site = optionalSite.get();

        employee.setSite(site);
        return employeeRepository.save(employee);
    }


    public Employee removeEmployeeFromSite(UUID siteId, UUID employeeId) {
        Optional<Employee> optionalEmployee = employeeRepository.findById(employeeId);
        Optional<Site> optionalSite = siteRepository.findById(siteId);

        if (optionalEmployee.isEmpty() || optionalSite.isEmpty()) {
            throw new RuntimeException("Employee or Site not found");
        }

        Employee employee = optionalEmployee.get();

        // Ensure the employee is currently assigned to the given site
        if (!employee.getSite().getId().equals(siteId)) {
            throw new RuntimeException("Employee is not assigned to this site");
        }

        employee.setSite(null); // Remove site association
        return employeeRepository.save(employee);
    }


    @Transactional
    public Warehouse assignWarehouseToSite(UUID siteId, UUID warehouseId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("❌ Warehouse not found with ID: " + warehouseId));

        if (warehouse.getSite() != null) {
            throw new RuntimeException("Warehouse is already assigned to a site!");
        }

        // Set the site for the warehouse
        warehouse.setSite(site);

        // If warehouse has employees, assign them all to the same site
        if (warehouse.getEmployees() != null && !warehouse.getEmployees().isEmpty()) {
            for (Employee employee : warehouse.getEmployees()) {
                employee.setSite(site);
                // No need to save each employee individually as they will be saved
                // with the @Transactional annotation
            }
        }

        return warehouseRepository.save(warehouse);
    }

    @Transactional
    public FixedAssets assignFixedAssetToSite(UUID siteId, UUID fixedAssetId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        FixedAssets fixedAsset = fixedAssetsRepository.findById(fixedAssetId)
                .orElseThrow(() -> new RuntimeException("❌ Fixed Asset not found with ID: " + fixedAssetId));

        if (fixedAsset.getSite() != null) {
            throw new RuntimeException("Fixed Asset is already assigned to a site!");
        }

        // Assign fixed asset to site
        fixedAsset.setSite(site);

        return fixedAssetsRepository.save(fixedAsset);
    }

    @Transactional
    public Warehouse addWarehouse(UUID siteId, Map<String, Object> requestBody) {
        // Create new warehouse
        Warehouse warehouse = new Warehouse();
        warehouse.setName((String) requestBody.get("name"));
//        warehouse.setCapacity((Integer) requestBody.get("capacity"));

        if (requestBody.get("photoUrl") != null) {
            warehouse.setPhotoUrl((String) requestBody.get("photoUrl"));
        }

        // Get and assign the site directly from the siteId parameter
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));
        warehouse.setSite(site);

        List<Employee> employees = new ArrayList<>();

        // Handle employees if provided
        if (requestBody.containsKey("employees")) {
            List<Map<String, Object>> employeeList = (List<Map<String, Object>>) requestBody.get("employees");
            List<UUID> employeeIds = employeeList.stream()
                    .map(emp -> UUID.fromString((String) emp.get("id")))
                    .toList();
            employees = employeeRepository.findAllById(employeeIds);

            for (Employee employee : employees) {
                employee.setWarehouse(warehouse);
                employee.setSite(site);
            }

            warehouse.setEmployees(employees);
        } else {
            warehouse.setEmployees(new ArrayList<>());
        }

        // Save the warehouse
        Warehouse savedWarehouse = warehouseRepository.save(warehouse);

        // Save all employees
        if (!employees.isEmpty()) {
            employeeRepository.saveAll(employees);
        }

        return savedWarehouse;
    }

    // PRODUCTION-READY VERSION - USE THIS ONE
    // Replace your entire assignPartnerToSite method with this:
    @Transactional
    public SitePartner assignPartnerToSite(UUID siteId, Integer partnerId, Double percentage) {
        // Input validation
        if (siteId == null || partnerId == null || percentage == null || percentage <= 0 || percentage > 100) {
            throw new IllegalArgumentException("Invalid input parameters");
        }

        try {
            System.out.println("=== Starting partner assignment (Pure SQL) ===");
            System.out.println("Site ID: " + siteId + ", Partner ID: " + partnerId + ", Percentage: " + percentage);

            // Step 1: Verify site exists
            Long siteCount = (Long) entityManager.createNativeQuery("SELECT COUNT(*) FROM site WHERE id = ?1")
                    .setParameter(1, siteId)
                    .getSingleResult();

            if (siteCount == 0) {
                throw new RuntimeException("Site not found: " + siteId);
            }

            // Step 2: Verify partner exists
            Long partnerCount = (Long) entityManager.createNativeQuery("SELECT COUNT(*) FROM partner WHERE id = ?1")
                    .setParameter(1, partnerId)
                    .getSingleResult();

            if (partnerCount == 0) {
                throw new RuntimeException("Partner not found: " + partnerId);
            }

            // Step 3: Check if assignment already exists
            Long existingCount = (Long) entityManager.createNativeQuery(
                            "SELECT COUNT(*) FROM site_partner WHERE site_id = ?1 AND partner_id = ?2")
                    .setParameter(1, siteId)
                    .setParameter(2, partnerId)
                    .getSingleResult();

            if (existingCount > 0) {
                throw new RuntimeException("Partner is already assigned to this site");
            }

            // Step 4: Get default partner ID (Rock4Mining)
            Integer defaultPartnerId;
            try {
                Object result = entityManager.createNativeQuery(
                                "SELECT id FROM partner WHERE first_name = 'Rock4Mining' LIMIT 1")
                        .getSingleResult();
                defaultPartnerId = ((Number) result).intValue();
            } catch (Exception e) {
                throw new RuntimeException("Default partner Rock4Mining not found");
            }

            System.out.println("Default partner ID: " + defaultPartnerId);

            // Step 5: Get default partner's current percentage
            Object percentageResult = entityManager.createNativeQuery(
                            "SELECT percentage FROM site_partner WHERE site_id = ?1 AND partner_id = ?2")
                    .setParameter(1, siteId)
                    .setParameter(2, defaultPartnerId)
                    .getSingleResult();

            Double availablePercentage = ((Number) percentageResult).doubleValue();
            System.out.println("Available percentage: " + availablePercentage);

            // Step 6: Validate percentage availability
            if (percentage > availablePercentage) {
                throw new RuntimeException(String.format(
                        "Cannot assign %.2f%% to partner. Only %.2f%% is available.",
                        percentage, availablePercentage));
            }

            // Step 7: Update default partner's percentage
            int updatedRows = entityManager.createNativeQuery(
                            "UPDATE site_partner SET percentage = ?1 WHERE site_id = ?2 AND partner_id = ?3")
                    .setParameter(1, availablePercentage - percentage)
                    .setParameter(2, siteId)
                    .setParameter(3, defaultPartnerId)
                    .executeUpdate();

            if (updatedRows == 0) {
                throw new RuntimeException("Failed to update default partner percentage");
            }

            System.out.println("Updated default partner percentage to: " + (availablePercentage - percentage));

            // Step 8: Insert new partner assignment
            int insertedRows = entityManager.createNativeQuery(
                            "INSERT INTO site_partner (site_id, partner_id, percentage) VALUES (?1, ?2, ?3)")
                    .setParameter(1, siteId)
                    .setParameter(2, partnerId)
                    .setParameter(3, percentage)
                    .executeUpdate();

            if (insertedRows == 0) {
                throw new RuntimeException("Failed to create partner assignment");
            }

            System.out.println("Partner assignment created successfully");

            // Step 9: Verify by querying the database
            Long verificationCount = (Long) entityManager.createNativeQuery(
                            "SELECT COUNT(*) FROM site_partner WHERE site_id = ?1 AND partner_id = ?2")
                    .setParameter(1, siteId)
                    .setParameter(2, partnerId)
                    .getSingleResult();

            if (verificationCount == 0) {
                throw new RuntimeException("Assignment verification failed");
            }

            // Step 10: Create response object (minimal, no Hibernate entities)
            SitePartnerId responseId = new SitePartnerId(siteId, partnerId);
            SitePartner response = new SitePartner();
            response.setId(responseId);
            response.setPercentage(percentage);

            System.out.println("=== Partner assignment completed successfully ===");
            return response;

        } catch (Exception e) {
            System.err.println("ERROR in assignPartnerToSite: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to assign partner: " + e.getMessage(), e);
        }
    }

    // Helper method to validate inputs
    private void validateAssignmentInputs(UUID siteId, Integer partnerId, Double percentage) {
        if (siteId == null) {
            throw new IllegalArgumentException("Site ID cannot be null");
        }
        if (partnerId == null) {
            throw new IllegalArgumentException("Partner ID cannot be null");
        }
        if (percentage == null || percentage <= 0 || percentage > 100) {
            throw new IllegalArgumentException("Percentage must be between 0 and 100");
        }
    }

    // Improved helper method
    private Partner ensureDefaultPartnerExists() {
        Optional<Partner> existingPartner = partnerRepository.findByFirstName("Rock4Mining");

        if (existingPartner.isPresent()) {
            return existingPartner.get();
        }

        // Create new default partner
        System.out.println("Creating default Rock4Mining partner");
        Partner defaultPartner = new Partner();
        defaultPartner.setFirstName("Rock4Mining");
        defaultPartner.setLastName("");

        return partnerRepository.save(defaultPartner);
    }

    @Transactional
    public SitePartner updatePartnerPercentage(UUID siteId, Integer partnerId, Double newPercentage) {
        validateAssignmentInputs(siteId, partnerId, newPercentage);

        try {
            System.out.println("=== Updating partner percentage ===");

            // Find the partner assignment
            SitePartner sitePartner = sitePartnerRepository
                    .findBySiteIdAndPartnerId(siteId, partnerId)
                    .orElseThrow(() -> new RuntimeException("Partner assignment not found"));

            // Check if this is the default partner
            Partner defaultPartner = ensureDefaultPartnerExists();
            if (partnerId.equals(defaultPartner.getId())) {
                throw new RuntimeException("Cannot directly update the default partner's percentage");
            }

            Double oldPercentage = sitePartner.getPercentage();
            Double percentageDifference = newPercentage - oldPercentage;

            // Find default partner assignment
            SitePartner defaultAssignment = sitePartnerRepository
                    .findBySiteIdAndPartnerId(siteId, defaultPartner.getId())
                    .orElseThrow(() -> new RuntimeException("Default partner assignment not found"));

            Double availableFromDefault = defaultAssignment.getPercentage();

            if (percentageDifference > 0 && percentageDifference > availableFromDefault) {
                throw new RuntimeException(String.format(
                        "Cannot increase by %.2f%%. Only %.2f%% available.",
                        percentageDifference, availableFromDefault));
            }

            // Update percentages
            sitePartner.setPercentage(newPercentage);
            defaultAssignment.setPercentage(availableFromDefault - percentageDifference);

            // Save both assignments
            sitePartnerRepository.save(defaultAssignment);
            SitePartner updated = sitePartnerRepository.save(sitePartner);

            System.out.println("Partner percentage updated successfully");
            return updated;

        } catch (Exception e) {
            System.err.println("ERROR updating partner percentage: " + e.getMessage());
            throw new RuntimeException("Failed to update percentage: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void removePartnerFromSite(UUID siteId, Integer partnerId) {
        try {
            System.out.println("=== Removing partner from site ===");

            // Find the partner assignment
            SitePartner sitePartner = sitePartnerRepository
                    .findBySiteIdAndPartnerId(siteId, partnerId)
                    .orElseThrow(() -> new RuntimeException("Partner assignment not found"));

            // Check if this is the default partner
            Partner defaultPartner = ensureDefaultPartnerExists();
            if (partnerId.equals(defaultPartner.getId())) {
                throw new RuntimeException("Cannot remove the default Rock4Mining partner");
            }

            Double percentageToRecover = sitePartner.getPercentage();

            // Find default partner assignment
            SitePartner defaultAssignment = sitePartnerRepository
                    .findBySiteIdAndPartnerId(siteId, defaultPartner.getId())
                    .orElseThrow(() -> new RuntimeException("Default partner assignment not found"));

            // Add percentage back to default partner
            defaultAssignment.setPercentage(defaultAssignment.getPercentage() + percentageToRecover);
            sitePartnerRepository.save(defaultAssignment);

            // Remove the partner assignment
            sitePartnerRepository.delete(sitePartner);

            System.out.println("Partner removed successfully");

        } catch (Exception e) {
            System.err.println("ERROR removing partner: " + e.getMessage());
            throw new RuntimeException("Failed to remove partner: " + e.getMessage(), e);
        }
    }

    // Helper methods
//    private void validateAssignmentInputs(UUID siteId, Integer partnerId, Double percentage) {
//        if (siteId == null) {
//            throw new IllegalArgumentException("Site ID cannot be null");
//        }
//        if (partnerId == null) {
//            throw new IllegalArgumentException("Partner ID cannot be null");
//        }
//        if (percentage == null || percentage <= 0 || percentage > 100) {
//            throw new IllegalArgumentException("Percentage must be between 0 and 100");
//        }
//    }

//    private Partner ensureDefaultPartnerExists() {
//        return partnerRepository.findByFirstName("Rock4Mining")
//                .orElseGet(() -> {
//                    System.out.println("Creating default Rock4Mining partner");
//                    Partner defaultPartner = Partner.builder()
//                            .firstName("Rock4Mining")
//                            .lastName("")
//                            .build();
//                    return partnerRepository.save(defaultPartner);
//                });
//    }

    @PostConstruct
    public void initializeDefaultPartner() {
        ensureDefaultPartnerExists();
    }


}