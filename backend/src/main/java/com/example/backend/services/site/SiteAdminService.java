package com.example.backend.services.site;

import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.fixedAssets.FixedAssetsRepository;
import com.example.backend.models.Partner;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.site.SitePartner;
import com.example.backend.models.site.SitePartnerId;
import com.example.backend.repositories.*;
import com.example.backend.repositories.hr.EmployeeRepository;
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
    private final FixedAssetsRepository fixedAssetRepository;
    private SiteRepository siteRepository;
    private PartnerRepository partnerRepository;
    private EquipmentRepository equipmentRepository;
    private EmployeeRepository employeeRepository;
    private WarehouseRepository warehouseRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    public SiteAdminService(SiteRepository siteRepository, PartnerRepository partnerRepository, EquipmentRepository equipmentRepository, EmployeeRepository employeeRepository, WarehouseRepository warehouseRepository, FixedAssetsRepository fixedAssetRepository) {
        this.siteRepository = siteRepository;
        this.partnerRepository = partnerRepository;
        this.equipmentRepository = equipmentRepository;
        this.employeeRepository = employeeRepository;
        this.warehouseRepository= warehouseRepository;
        this.fixedAssetRepository = fixedAssetRepository;
    }

    @Transactional
    public Site addSite(Map<String, Object> siteData) {
        Site site = new Site();
        site.setName((String) siteData.get("name"));
        site.setPhysicalAddress((String) siteData.get("physicalAddress"));
        site.setCompanyAddress((String) siteData.get("companyAddress"));

        if (siteData.get("photoUrl") != null) {
            site.setPhotoUrl((String) siteData.get("photoUrl"));
        }

        if (siteData.get("creationDate") != null) {
            site.setCreationDate(LocalDate.parse((String) siteData.get("creationDate")));
        }

        // Initialize the sitePartners list
        site.setSitePartners(new ArrayList<>());

        // Save site first to generate ID
        Site savedSite = siteRepository.save(site);

        // Find default Rock4Mining partner
        System.out.println("11111");
        Partner defaultPartner = partnerRepository.findByFirstName("Rock4Mining")
                .orElseThrow(() -> new RuntimeException("Default partner Rock4Mining not found"));

        System.out.println("22222");

        // Create default partner assignment with 100%
        SitePartnerId id = new SitePartnerId(savedSite.getId(), defaultPartner.getId());
        SitePartner sitePartner = new SitePartner();
        sitePartner.setId(id);
        sitePartner.setSite(savedSite);
        sitePartner.setPartner(defaultPartner);
        sitePartner.setPercentage(100.0);

        System.out.println("33333");

// Save the SitePartner by persisting it through EntityManager
        entityManager.persist(sitePartner);
        entityManager.flush();
        System.out.println("44444");

// Add to the list AFTER persisting
        savedSite.getSitePartners().add(sitePartner);

// Return the site without saving again
        return savedSite;
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
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new RuntimeException("❌ Equipment not found with ID: " + equipmentId));

        if (equipment.getSite() != null) {
            throw new RuntimeException("Equipment is already assigned to a site!");
        }

        // Assign equipment to site
        equipment.setSite(site);

        // If equipment has a main driver, assign them to the site
        if (equipment.getMainDriver() != null) {
            Employee mainDriver = equipment.getMainDriver();
            if (mainDriver.getSite() == null) {
                mainDriver.setSite(site);
                employeeRepository.save(mainDriver);
            }
        }

        // If equipment has a sub driver, assign them to the site
        if (equipment.getSubDriver() != null) {
            Employee subDriver = equipment.getSubDriver();
            if (subDriver.getSite() == null) {
                subDriver.setSite(site);
                employeeRepository.save(subDriver);
            }
        }

        return equipmentRepository.save(equipment);
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
        Optional<FixedAssets> optionalFixedAssets = fixedAssetRepository.findById(fixedAssetId);
        Optional<Site> optionalSite = siteRepository.findById(siteId);

        if (optionalFixedAssets.isEmpty() || optionalSite.isEmpty()) {
            throw new RuntimeException("Employee or Site not found");
        }

        FixedAssets fixedAssets = optionalFixedAssets.get();
        Site site = optionalSite.get();

        fixedAssets.setSite(site);
        return fixedAssetRepository.save(fixedAssets);
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

    @Transactional
    public SitePartner assignPartnerToSite(UUID siteId, Integer partnerId, Double percentage) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("❌ Partner not found with ID: " + partnerId));

        // Validate percentage
        if (percentage == null || percentage <= 0 || percentage > 100) {
            throw new RuntimeException("Percentage must be between 0 and 100");
        }

        SitePartnerId id = new SitePartnerId(site.getId(), partner.getId());

        // Check if already assigned
        boolean alreadyAssigned = site.getSitePartners().stream()
                .anyMatch(sp -> sp.getId().getPartnerId() == partner.getId());
        if (alreadyAssigned) {
            throw new RuntimeException("Partner is already assigned to this site!");
        }

        // Find the default Rock4Mining partner
        Partner defaultPartner = partnerRepository.findByFirstName("Rock4Mining")
                .orElseThrow(() -> new RuntimeException("Default partner Rock4Mining not found"));

        // Find the default partner's site assignment
        SitePartner defaultSitePartner = site.getSitePartners().stream()
                .filter(sp -> sp.getPartner().getId() == defaultPartner.getId())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Default partner assignment not found"));

        // Calculate remaining percentage
        Double currentDefaultPercentage = defaultSitePartner.getPercentage();
        if (percentage > currentDefaultPercentage) {
            throw new RuntimeException("Cannot assign " + percentage + "% to new partner. Only " +
                    currentDefaultPercentage + "% is available.");
        }

        // Reduce default partner's percentage
        defaultSitePartner.setPercentage(currentDefaultPercentage - percentage);

        // Create new partner assignment
        SitePartner sitePartner = new SitePartner();
        sitePartner.setId(id);
        sitePartner.setSite(site);
        sitePartner.setPartner(partner);
        sitePartner.setPercentage(percentage);

        site.getSitePartners().add(sitePartner);

        // Save via the site (because cascade should save the SitePartner)
        siteRepository.save(site);

        return sitePartner;
    }

    @Transactional
    public SitePartner updatePartnerPercentage(UUID siteId, Integer partnerId, Double newPercentage) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("❌ Partner not found with ID: " + partnerId));

        // Validate percentage
        if (newPercentage == null || newPercentage <= 0 || newPercentage > 100) {
            throw new RuntimeException("Percentage must be between 0 and 100");
        }

        SitePartnerId id = new SitePartnerId(site.getId(), partner.getId());

        // Find the specific SitePartner association
        SitePartner sitePartner = site.getSitePartners().stream()
                .filter(sp -> sp.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Partner is not assigned to this site!"));

        // Check if this is the default Rock4Mining partner - if so, we shouldn't directly change it
        Partner defaultPartner = partnerRepository.findByFirstName("Rock4Mining")
                .orElseThrow(() -> new RuntimeException("Default partner Rock4Mining not found"));

        if (partner.getId() == defaultPartner.getId()) {
            throw new RuntimeException("Cannot directly update the default partner's percentage. Please modify other partners instead.");
        }

        // Get the current percentage of this partner
        Double oldPercentage = sitePartner.getPercentage();
        Double percentageDifference = newPercentage - oldPercentage;

        // Find the default partner's site assignment
        SitePartner defaultSitePartner = site.getSitePartners().stream()
                .filter(sp -> sp.getPartner().getId() == defaultPartner.getId())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Default partner assignment not found"));

        // Calculate if there's enough percentage available
        Double currentDefaultPercentage = defaultSitePartner.getPercentage();
        if (percentageDifference > 0 && percentageDifference > currentDefaultPercentage) {
            throw new RuntimeException("Cannot increase partner percentage by " + percentageDifference +
                    "%. Only " + currentDefaultPercentage + "% is available from default partner.");
        }

        // Update the percentage
        sitePartner.setPercentage(newPercentage);

        // Adjust the default partner's percentage (subtract if increasing, add if decreasing)
        defaultSitePartner.setPercentage(currentDefaultPercentage - percentageDifference);

        // Save via the site (because SitePartner should be cascaded)
        siteRepository.save(site);

        return sitePartner;
    }

    @Transactional
    public void removePartnerFromSite(UUID siteId, Integer partnerId) {
        // Fetch the Site
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("❌ Site not found with ID: " + siteId));

        // Fetch the Partner
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("❌ Partner not found with ID: " + partnerId));

        // Don't allow removing the default partner
        Partner defaultPartner = partnerRepository.findByFirstName("Rock4Mining")
                .orElseThrow(() -> new RuntimeException("Default partner Rock4Mining not found"));

        if (partner.getId() == defaultPartner.getId()) {
            throw new RuntimeException("Cannot remove the default Rock4Mining partner from a site");
        }

        // Create the SitePartnerId
        SitePartnerId id = new SitePartnerId(site.getId(), partner.getId());

        // Find the specific SitePartner
        SitePartner sitePartner = site.getSitePartners().stream()
                .filter(sp -> sp.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Partner is not assigned to this site!"));

        // Get the percentage of the partner being removed
        Double percentageToRecover = sitePartner.getPercentage();

        // Find the default partner's site assignment
        SitePartner defaultSitePartner = site.getSitePartners().stream()
                .filter(sp -> sp.getPartner().getId() == defaultPartner.getId())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Default partner assignment not found"));

        // Add the removed partner's percentage back to the default partner
        defaultSitePartner.setPercentage(defaultSitePartner.getPercentage() + percentageToRecover);

        // Remove the SitePartner from the site's list
        site.getSitePartners().remove(sitePartner);

        // Save the site to apply the change (cascade should handle deleting SitePartner)
        siteRepository.save(site);
    }

    @PostConstruct
    public void ensureDefaultPartnerExists() {
        // Check if Rock4Mining partner exists, if not create it
        if (partnerRepository.findByFirstName("Rock4Mining").isEmpty()) {
            Partner defaultPartner = new Partner();
            defaultPartner.setFirstName("Rock4Mining");
            defaultPartner.setLastName("");
            partnerRepository.save(defaultPartner);
        }
    }


}