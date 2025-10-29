package com.example.backend.services.site;

import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
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
import com.example.backend.services.notification.NotificationService;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SiteAdminService
{
//    private final FixedAssetRepository fixedAssetRepository;
    private final SiteRepository siteRepository;
    private final PartnerRepository partnerRepository;
    private final EquipmentRepository equipmentRepository;
    private final EmployeeRepository employeeRepository;
    private final WarehouseRepository warehouseRepository;
    private final FixedAssetsRepository fixedAssetsRepository;
    private final SitePartnerRepository sitePartnerRepository;
    private final NotificationService notificationService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    public SiteAdminService(SiteRepository siteRepository, PartnerRepository partnerRepository, EquipmentRepository equipmentRepository, EmployeeRepository employeeRepository, WarehouseRepository warehouseRepository, FixedAssetsRepository fixedAssetsRepository, SitePartnerRepository sitePartnerRepository, NotificationService notificationService) {
        this.siteRepository = siteRepository;
        this.partnerRepository = partnerRepository;
        this.equipmentRepository = equipmentRepository;
        this.employeeRepository = employeeRepository;
        this.warehouseRepository= warehouseRepository;
        this.fixedAssetsRepository = fixedAssetsRepository;
        this.sitePartnerRepository = sitePartnerRepository;
        this.notificationService = notificationService;
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

            // Send notifications to SITE_ADMIN and ADMIN users
            try {
                String notificationTitle = "New Site Created";
                String notificationMessage = "A new site '" + savedSite.getName() + "' has been created";
                String actionUrl = "/sites/details/" + savedSite.getId();
                String relatedEntity = savedSite.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.SUCCESS,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("✅ Site creation notifications sent successfully");
            } catch (Exception e) {
                System.err.println("⚠️ Failed to send site creation notifications: " + e.getMessage());
                // Don't fail the site creation if notification fails
            }

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

            // Send notifications to SITE_ADMIN and ADMIN users
            try {
                String notificationTitle = "Site Deleted";
                String notificationMessage = "Site '" + site.getName() + "' has been deleted";
                String actionUrl = "/sites";
                String relatedEntity = site.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.ERROR,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("Site deletion notifications sent successfully");
            } catch (Exception e) {
                System.err.println("Failed to send site deletion notifications: " + e.getMessage());
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

        // Send notifications to SITE_ADMIN and ADMIN users
        try {
            String notificationTitle = "Site Updated";
            String notificationMessage = "Site '" + existingSite.getName() + "' has been updated";
            String actionUrl = "/sites/details/" + existingSite.getId();
            String relatedEntity = existingSite.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Site update notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send site update notifications: " + e.getMessage());
        }

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

            // Replace the driver assignment section in assignEquipmentToSite method
// Handle main driver assignment
            if (equipment.getMainDriver() != null) {
                Employee mainDriver = equipment.getMainDriver();
                System.out.println("=== PROCESSING MAIN DRIVER ===");
                System.out.println("Driver ID: " + mainDriver.getId());
                System.out.println("Driver Name: " + mainDriver.getFirstName() + " " + mainDriver.getLastName());
                System.out.println("Driver Current Site: " + (mainDriver.getSite() != null ? mainDriver.getSite().getName() : "NULL"));
                System.out.println("Target Site: " + site.getName() + " (ID: " + site.getId() + ")");

                if (mainDriver.getSite() == null) {
                    try {
                        // Set the site
                        mainDriver.setSite(site);
                        System.out.println("Setting driver site to: " + site.getName());

                        // Save the employee explicitly
                        Employee savedEmployee = employeeRepository.save(mainDriver);
                        System.out.println("Employee saved successfully. New site: " +
                                (savedEmployee.getSite() != null ? savedEmployee.getSite().getName() : "NULL"));

                        // Verify the save worked by checking the database
                        Employee verifyEmployee = employeeRepository.findById(mainDriver.getId()).orElse(null);
                        if (verifyEmployee != null && verifyEmployee.getSite() != null) {
                            System.out.println("✅ VERIFICATION PASSED: Employee site assignment confirmed in database");
                            System.out.println("Verified Site: " + verifyEmployee.getSite().getName());
                        } else {
                            System.err.println("❌ VERIFICATION FAILED: Employee site not found in database after save");
                            throw new RuntimeException("Failed to verify employee site assignment");
                        }

                    } catch (Exception e) {
                        System.err.println("❌ CRITICAL ERROR assigning main driver to site:");
                        System.err.println("Error Type: " + e.getClass().getSimpleName());
                        System.err.println("Error Message: " + e.getMessage());
                        e.printStackTrace();

                        // Don't continue silently - this is critical for data consistency
                        throw new RuntimeException("Failed to assign main driver to site: " + e.getMessage(), e);
                    }
                } else {
                    System.out.println("Main driver already assigned to site: " + mainDriver.getSite().getName());
                    if (!mainDriver.getSite().getId().equals(site.getId())) {
                        System.out.println("⚠️  WARNING: Driver is assigned to different site than equipment target!");
                    }
                }
            }

// Handle sub driver assignment (similar logic)
            if (equipment.getSubDriver() != null) {
                Employee subDriver = equipment.getSubDriver();
                System.out.println("=== PROCESSING SUB DRIVER ===");
                System.out.println("Sub Driver ID: " + subDriver.getId());
                System.out.println("Sub Driver Name: " + subDriver.getFirstName() + " " + subDriver.getLastName());
                System.out.println("Sub Driver Current Site: " + (subDriver.getSite() != null ? subDriver.getSite().getName() : "NULL"));
                System.out.println("Target Site: " + site.getName() + " (ID: " + site.getId() + ")");

                if (subDriver.getSite() == null) {
                    try {
                        subDriver.setSite(site);
                        System.out.println("Setting sub driver site to: " + site.getName());

                        Employee savedEmployee = employeeRepository.save(subDriver);
                        System.out.println("Sub driver saved successfully. New site: " +
                                (savedEmployee.getSite() != null ? savedEmployee.getSite().getName() : "NULL"));

                        // Verify the save worked
                        Employee verifyEmployee = employeeRepository.findById(subDriver.getId()).orElse(null);
                        if (verifyEmployee != null && verifyEmployee.getSite() != null) {
                            System.out.println("✅ VERIFICATION PASSED: Sub driver site assignment confirmed in database");
                        } else {
                            System.err.println("❌ VERIFICATION FAILED: Sub driver site not found in database after save");
                            throw new RuntimeException("Failed to verify sub driver site assignment");
                        }

                    } catch (Exception e) {
                        System.err.println("❌ CRITICAL ERROR assigning sub driver to site:");
                        System.err.println("Error Type: " + e.getClass().getSimpleName());
                        System.err.println("Error Message: " + e.getMessage());
                        e.printStackTrace();
                        throw new RuntimeException("Failed to assign sub driver to site: " + e.getMessage(), e);
                    }
                } else {
                    System.out.println("Sub driver already assigned to site: " + subDriver.getSite().getName());
                    if (!subDriver.getSite().getId().equals(site.getId())) {
                        System.out.println("⚠️  WARNING: Sub driver is assigned to different site than equipment target!");
                    }
                }
            }


            // Save equipment
            Equipment savedEquipment = equipmentRepository.save(equipment);
            System.out.println("Equipment saved successfully");

            // Send notifications to SITE_ADMIN, ADMIN, and EQUIPMENT_MANAGER users
            try {
                String notificationTitle = "Equipment Assigned to Site";
                String notificationMessage = "Equipment '" + savedEquipment.getModel() +
                        "' has been assigned to site '" + site.getName() + "'";
                String actionUrl = "/sites/details/" + site.getId();
                String relatedEntity = site.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.EQUIPMENT_MANAGER);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.SUCCESS,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("Equipment assignment notifications sent successfully");
            } catch (Exception e) {
                System.err.println("Failed to send equipment assignment notifications: " + e.getMessage());
            }

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

        // Send notifications to SITE_ADMIN, ADMIN, and EQUIPMENT_MANAGER users
        try {
            Site site = siteRepository.findById(siteId).orElse(null);
            if (site != null) {
                String notificationTitle = "Equipment Removed from Site";
                String notificationMessage = "Equipment '" + equipment.getModel() +
                        "' has been removed from site '" + site.getName() + "'";
                String actionUrl = "/sites/details/" + site.getId();
                String relatedEntity = site.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.EQUIPMENT_MANAGER);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.WARNING,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("Equipment removal notifications sent successfully");
            }
        } catch (Exception e) {
            System.err.println("Failed to send equipment removal notifications: " + e.getMessage());
        }
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

        // Send notifications to SITE_ADMIN, ADMIN, and HR users
        try {
            String notificationTitle = "Employee Assigned to Site";
            String notificationMessage = "Employee '" + employee.getFirstName() + " " + employee.getLastName() +
                    "' has been assigned to site '" + site.getName() + "'";
            String actionUrl = "/sites/details/" + site.getId();
            String relatedEntity = site.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Employee assignment notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send employee assignment notifications: " + e.getMessage());
        }

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

        List<Equipment> equipmentAtSite = equipmentRepository.findBySiteId(siteId);

        for (Equipment equipment : equipmentAtSite) {
            boolean equipmentUpdated = false;

            // Check if employee is main driver
            if (equipment.getMainDriver() != null &&
                    equipment.getMainDriver().getId().equals(employeeId)) {
                equipment.setMainDriver(null);
                equipmentUpdated = true;
                System.out.println("Removed employee as main driver from equipment: " + equipment.getModel());
            }

            // Check if employee is sub driver
            if (equipment.getSubDriver() != null &&
                    equipment.getSubDriver().getId().equals(employeeId)) {
                equipment.setSubDriver(null);
                equipmentUpdated = true;
                System.out.println("Removed employee as sub driver from equipment: " + equipment.getModel());
            }

            // Save equipment if it was modified
            if (equipmentUpdated) {
                equipmentRepository.save(equipment);
            }
        }

        employee.setSite(null); // Remove site association

        // Send notifications to SITE_ADMIN, ADMIN, and HR users
        try {
            Site site = optionalSite.get();
            String notificationTitle = "Employee Removed from Site";
            String notificationMessage = "Employee '" + employee.getFirstName() + " " + employee.getLastName() +
                    "' has been removed from site '" + site.getName() + "'";
            String actionUrl = "/sites/details/" + site.getId();
            String relatedEntity = site.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Employee removal notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send employee removal notifications: " + e.getMessage());
        }
        return employeeRepository.save(employee);
    }

    @Transactional
    public Employee unassignEmployeeFromWarehouse(UUID warehouseId, UUID employeeId) {
        try {
            System.out.println("=== Unassigning employee from warehouse ===");
            System.out.println("Warehouse ID: " + warehouseId + ", Employee ID: " + employeeId);

            // Find and validate warehouse
            Warehouse warehouse = warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new RuntimeException("Warehouse not found with ID: " + warehouseId));

            // Find and validate employee
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

            // Verify employee is actually assigned to this warehouse
            if (employee.getWarehouse() == null || !employee.getWarehouse().getId().equals(warehouseId)) {
                throw new RuntimeException("Employee is not assigned to this warehouse");
            }

            // Unassign from warehouse and site
            employee.setWarehouse(null);
            employee.setSite(null);

            // Save employee
            Employee savedEmployee = employeeRepository.save(employee);
// Send notifications to SITE_ADMIN, ADMIN, WAREHOUSE, and HR users
            try {
                String notificationTitle = "Employee Removed from Warehouse";
                String notificationMessage = "Employee '" + employee.getFirstName() + " " + employee.getLastName() +
                        "' has been removed from warehouse '" + warehouse.getName() + "'";
                String actionUrl = warehouse.getSite() != null ? "/sites/details/" + warehouse.getSite().getId() : "/warehouses";
                String relatedEntity = warehouse.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN,
                        Role.WAREHOUSE_MANAGER, Role.WAREHOUSE_EMPLOYEE,
                        Role.HR_MANAGER, Role.HR_EMPLOYEE);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.WARNING,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("Employee removal from warehouse notifications sent successfully");
            } catch (Exception e) {
                System.err.println("Failed to send employee removal notifications: " + e.getMessage());
            }
            System.out.println("Employee successfully unassigned from warehouse and site");
            return savedEmployee;

        } catch (Exception e) {
            System.err.println("ERROR unassigning employee from warehouse: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to unassign employee from warehouse: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getWarehouseEmployees(UUID warehouseId) {
        try {
            System.out.println("=== Fetching employees for warehouse: " + warehouseId + " ===");

            // Verify warehouse exists
            warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new RuntimeException("Warehouse not found with ID: " + warehouseId));

            // Get all employees assigned to this warehouse
            List<Employee> employees = employeeRepository.findByWarehouseId(warehouseId);

            // Convert to response format
            List<Map<String, Object>> employeeList = new ArrayList<>();
            for (Employee employee : employees) {
                Map<String, Object> employeeData = new HashMap<>();
                employeeData.put("id", employee.getId());
                employeeData.put("firstName", employee.getFirstName());
                employeeData.put("lastName", employee.getLastName());
                employeeData.put("fullName", employee.getFirstName() + " " + employee.getLastName());

                if (employee.getJobPosition() != null) {
                    employeeData.put("jobPosition", employee.getJobPosition().getPositionName());
                    employeeData.put("isManager", "Warehouse Manager".equals(employee.getJobPosition().getPositionName()));
                } else {
                    employeeData.put("jobPosition", "N/A");
                    employeeData.put("isManager", false);
                }

                employeeList.add(employeeData);
            }

            System.out.println("Found " + employeeList.size() + " employees for warehouse");
            return employeeList;

        } catch (Exception e) {
            System.err.println("Error fetching warehouse employees: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch warehouse employees", e);
        }
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

        // Send notifications to SITE_ADMIN, ADMIN, and EQUIPMENT_MANAGER users
        try {
            if (site != null) {
                String notificationTitle = "Fixed Assets Assigned to Site";
                String notificationMessage = "Fixed Asset '" + fixedAsset.getName() +
                        "' has been assigned to site '" + site.getName() + "'";
                String actionUrl = "/sites/details/" + site.getId();
                String relatedEntity = site.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.FINANCE_EMPLOYEE, Role.FINANCE_MANAGER);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.SUCCESS,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("Fixed asset assignment notifications sent successfully");
            }
        } catch (Exception e) {
            System.err.println("Failed to send fixed asset assignment notifications: " + e.getMessage());
        }

        return fixedAssetsRepository.save(fixedAsset);
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

            // Send notifications to SITE_ADMIN and ADMIN users
            try {
                Site site = siteRepository.findById(siteId).orElse(null);
                Partner partner = partnerRepository.findById(partnerId).orElse(null);

                if (site != null && partner != null) {
                    String notificationTitle = "Partner Assigned to Site";
                    String notificationMessage = "Partner '" + partner.getFirstName() + " " + partner.getLastName() +
                            "' has been assigned " + percentage + "% stake in site '" + site.getName() + "'";
                    String actionUrl = "/sites/details/" + site.getId();
                    String relatedEntity = site.getId().toString();

                    List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_EMPLOYEE);

                    notificationService.sendNotificationToUsersByRoles(
                            targetRoles,
                            notificationTitle,
                            notificationMessage,
                            NotificationType.SUCCESS,
                            actionUrl,
                            relatedEntity
                    );

                    System.out.println("Partner assignment notifications sent successfully");
                }
            } catch (Exception e) {
                System.err.println("Failed to send partner assignment notifications: " + e.getMessage());
            }

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

            // Send notifications to SITE_ADMIN and ADMIN users
            try {
                Site site = siteRepository.findById(siteId).orElse(null);
                Partner partner = partnerRepository.findById(partnerId).orElse(null);

                if (site != null && partner != null) {
                    String notificationTitle = "Partner Percentage Updated";
                    String notificationMessage = "Partner '" + partner.getFirstName() + " " + partner.getLastName() +
                            "' percentage in site '" + site.getName() +
                            "' has been updated from " + oldPercentage + "% to " + newPercentage + "%";
                    String actionUrl = "/sites/details/" + site.getId();
                    String relatedEntity = site.getId().toString();

                    List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_EMPLOYEE);

                    notificationService.sendNotificationToUsersByRoles(
                            targetRoles,
                            notificationTitle,
                            notificationMessage,
                            NotificationType.INFO,
                            actionUrl,
                            relatedEntity
                    );

                    System.out.println("Partner percentage update notifications sent successfully");
                }
            } catch (Exception e) {
                System.err.println("Failed to send partner update notifications: " + e.getMessage());
            }

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

            // Send notifications to SITE_ADMIN and ADMIN users
            try {
                Site site = siteRepository.findById(siteId).orElse(null);
                Partner partner = partnerRepository.findById(partnerId).orElse(null);

                if (site != null && partner != null) {
                    String notificationTitle = "Partner Removed from Site";
                    String notificationMessage = "Partner '" + partner.getFirstName() + " " + partner.getLastName() +
                            "' has been removed from site '" + site.getName() + "'";
                    String actionUrl = "/sites/details/" + site.getId();
                    String relatedEntity = site.getId().toString();

                    List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_EMPLOYEE);

                    notificationService.sendNotificationToUsersByRoles(
                            targetRoles,
                            notificationTitle,
                            notificationMessage,
                            NotificationType.WARNING,
                            actionUrl,
                            relatedEntity
                    );

                    System.out.println("Partner removal notifications sent successfully");
                }
            } catch (Exception e) {
                System.err.println("Failed to send partner removal notifications: " + e.getMessage());
            }

            // Remove the partner assignment
            sitePartnerRepository.delete(sitePartner);

            System.out.println("Partner removed successfully");

        } catch (Exception e) {
            System.err.println("ERROR removing partner: " + e.getMessage());
            throw new RuntimeException("Failed to remove partner: " + e.getMessage(), e);
        }
    }




    // Add this method to your SiteAdminService class

    @Transactional
    public List<Map<String, Object>> getAvailableWarehouseManagers() {
        try {
            System.out.println("=== Fetching available warehouse managers ===");

            // Use the correct case - "Warehouse Manager" not "warehouse manager"
            List<Employee> allWarehouseManagers = employeeRepository.findByJobPositionPositionName("Warehouse Manager");

            // Filter out managers who are already assigned to a warehouse
            List<Employee> availableManagers = allWarehouseManagers.stream()
                    .filter(manager -> manager.getWarehouse() == null)
                    .collect(Collectors.toList());

            // Convert to response format
            List<Map<String, Object>> managerList = new ArrayList<>();
            for (Employee manager : availableManagers) {
                Map<String, Object> managerData = new HashMap<>();
                managerData.put("id", manager.getId());
                managerData.put("firstName", manager.getFirstName());
                managerData.put("lastName", manager.getLastName());
                managerData.put("fullName", manager.getFirstName() + " " + manager.getLastName());

                if (manager.getJobPosition() != null) {
                    managerData.put("jobPosition", manager.getJobPosition().getPositionName());
                }

                managerList.add(managerData);
            }

            System.out.println("Found " + managerList.size() + " available warehouse managers");
            return managerList;

        } catch (Exception e) {
            System.err.println("Error fetching available warehouse managers: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch available warehouse managers", e);
        }
    }

    // Also add this method to get available managers for a specific site (if needed)
    @Transactional
    public List<Map<String, Object>> getAvailableWarehouseManagersForSite(UUID siteId) {
        try {
            System.out.println("=== Fetching available warehouse managers for site: " + siteId + " ===");

            // Verify site exists
            Site site = siteRepository.findById(siteId)
                    .orElseThrow(() -> new RuntimeException("Site not found: " + siteId));

            // Get all warehouse managers
            List<Employee> allWarehouseManagers = employeeRepository.findByJobPositionPositionName("Warehouse Manager");

            // Filter available managers (not assigned to warehouse OR assigned to site but no warehouse)
            List<Employee> availableManagers = allWarehouseManagers.stream()
                    .filter(manager -> {
                        // Manager is available if:
                        // 1. Not assigned to any warehouse
                        // 2. OR assigned to the target site but no warehouse (can be assigned to warehouse in same site)
                        return manager.getWarehouse() == null &&
                                (manager.getSite() == null || manager.getSite().getId().equals(siteId));
                    })
                    .toList();

            // Convert to response format
            List<Map<String, Object>> managerList = new ArrayList<>();
            for (Employee manager : availableManagers) {
                Map<String, Object> managerData = new HashMap<>();
                managerData.put("id", manager.getId());
                managerData.put("firstName", manager.getFirstName());
                managerData.put("lastName", manager.getLastName());
                managerData.put("fullName", manager.getFullName());

                if (manager.getJobPosition() != null) {
                    managerData.put("jobPosition", manager.getJobPosition().getPositionName());
                }

                managerList.add(managerData);
            }

            System.out.println("Found " + managerList.size() + " available warehouse managers for site");
            return managerList;

        } catch (Exception e) {
            System.err.println("Error fetching available warehouse managers for site: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch available warehouse managers for site", e);
        }
    }

    // Add these methods to your SiteAdminService class
    @Transactional
    public List<Map<String, Object>> getAvailableWarehouseWorkers() {
        try {
            System.out.println("=== Fetching available warehouse workers ===");

            // CORRECT: Only get employees with "Warehouse Worker" job position
            List<Employee> warehouseWorkers = employeeRepository.findByJobPositionPositionName("Warehouse Worker");

            List<Employee> availableWorkers = warehouseWorkers.stream()
                    .filter(worker -> worker.getWarehouse() == null)
                    .collect(Collectors.toList());

            // Convert to response format
            List<Map<String, Object>> workerList = new ArrayList<>();
            for (Employee worker : availableWorkers) {
                Map<String, Object> workerData = new HashMap<>();
                workerData.put("id", worker.getId());
                workerData.put("firstName", worker.getFirstName());
                workerData.put("lastName", worker.getLastName());
                workerData.put("fullName", worker.getFirstName() + " " + worker.getLastName());

                if (worker.getJobPosition() != null) {
                    workerData.put("jobPosition", worker.getJobPosition().getPositionName());
                }

                workerList.add(workerData);
            }

            System.out.println("Found " + workerList.size() + " available warehouse workers");
            return workerList;

        } catch (Exception e) {
            System.err.println("Error fetching available warehouse workers: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch available warehouse workers", e);
        }
    }

    @Transactional
    public List<Map<String, Object>> getAvailableWarehouseWorkersForSite(UUID siteId) {
        try {
            System.out.println("=== Fetching available warehouse workers for site: " + siteId + " ===");

            // Verify site exists
            Site site = siteRepository.findById(siteId)
                    .orElseThrow(() -> new RuntimeException("Site not found: " + siteId));

            // CORRECT: Get employees with "Warehouse Worker" job position
            List<Employee> warehouseWorkers = employeeRepository.findByJobPositionPositionName("Warehouse Worker");

            List<Employee> availableWorkers = warehouseWorkers.stream()
                    .filter(worker -> {
                        // Worker is available if:
                        // 1. Not assigned to any warehouse
                        // 2. AND either not assigned to any site OR assigned to the target site
                        return worker.getWarehouse() == null &&
                                (worker.getSite() == null || worker.getSite().getId().equals(siteId));
                    })
                    .collect(Collectors.toList());

            // Convert to response format (same as above)
            List<Map<String, Object>> workerList = new ArrayList<>();
            for (Employee worker : availableWorkers) {
                Map<String, Object> workerData = new HashMap<>();
                workerData.put("id", worker.getId());
                workerData.put("firstName", worker.getFirstName());
                workerData.put("lastName", worker.getLastName());
                workerData.put("fullName", worker.getFirstName() + " " + worker.getLastName());

                if (worker.getJobPosition() != null) {
                    workerData.put("jobPosition", worker.getJobPosition().getPositionName());
                }

                workerList.add(workerData);
            }

            System.out.println("Found " + workerList.size() + " available warehouse workers for site");
            return workerList;

        } catch (Exception e) {
            System.err.println("Error fetching available warehouse workers for site: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch available warehouse workers for site", e);
        }
    }

    // Update the existing addWarehouse method to handle workers properly
    @Transactional
    public Warehouse addWarehouse(UUID siteId, Map<String, Object> requestBody) {
        // Create new warehouse
        Warehouse warehouse = new Warehouse();
        warehouse.setName((String) requestBody.get("name"));

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
                // Verify employee is available (not assigned to another warehouse)
                if (employee.getWarehouse() != null) {
                    throw new RuntimeException("Employee " + employee.getFirstName() + " " + employee.getLastName() +
                            " is already assigned to warehouse: " + employee.getWarehouse().getName());
                }

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

        // Send notifications to SITE_ADMIN, ADMIN, and WAREHOUSE users
        try {
            String notificationTitle = "New Warehouse Created";
            String notificationMessage = "Warehouse '" + savedWarehouse.getName() +
                    "' has been created at site '" + site.getName() + "'";
            String actionUrl = "/warehouses/" + savedWarehouse.getId();
            String relatedEntity = site.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.SITE_ADMIN, Role.ADMIN,
                    Role.WAREHOUSE_MANAGER, Role.WAREHOUSE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Warehouse creation notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send warehouse creation notifications: " + e.getMessage());
        }

        return savedWarehouse;
    }

    @PostConstruct
    public void initializeDefaultPartner() {
        ensureDefaultPartnerExists();
    }


}