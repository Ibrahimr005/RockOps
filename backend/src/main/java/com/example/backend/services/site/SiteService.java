package com.example.backend.services.site;

import com.example.backend.dto.equipment.EquipmentDTO;
import com.example.backend.models.Partner;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.AssetStatus;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.site.SitePartner;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.PartnerRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.fixedAssets.FixedAssetsRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.MinioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SiteService
{
    private final SiteRepository siteRepository;
    private final PartnerRepository partnerRepository;
    private final EmployeeRepository employeeRepository;
    private final EquipmentRepository equipmentRepository;
    private final FixedAssetsRepository fixedAssetsRepository;
    private final MinioService minioService;

    @Autowired
    public SiteService(SiteRepository siteRepository, PartnerRepository partnerRepository, EmployeeRepository employeeRepository, EquipmentRepository equipmentRepository, FixedAssetsRepository fixedAssetsRepository, MinioService minioService)
    {
        this.siteRepository = siteRepository;
        this.partnerRepository = partnerRepository;
        this.employeeRepository = employeeRepository;
        this.equipmentRepository = equipmentRepository;
        this.fixedAssetsRepository = fixedAssetsRepository;
        this.minioService = minioService;
    }

    @Transactional(readOnly = true)
    public Site getSiteById(UUID id)
    {
        Site site = siteRepository.findById(id).orElse(null);
        if (site != null) {
            Object[] counts = siteRepository.findSiteCountsById(id);
            if (counts != null) {
                site.setEquipmentCount(((Number) counts[0]).intValue());
                site.setEmployeeCount(((Number) counts[1]).intValue());
                site.setWarehouseCount(((Number) counts[2]).intValue());
                site.setMerchantCount(((Number) counts[3]).intValue());
            }
        }
        return site;
    }

    @Transactional(readOnly = true)
    public List<Site> getAllSites() {
        List<Site> sites = siteRepository.findAll();

        // Single query gets all counts — avoids N+1 problem
        List<Object[]> allCounts = siteRepository.findAllSiteCounts();
        Map<UUID, Object[]> countsMap = new HashMap<>();
        for (Object[] row : allCounts) {
            countsMap.put((UUID) row[0], row);
        }

        for (Site site : sites) {
            Object[] counts = countsMap.get(site.getId());
            if (counts != null) {
                site.setEquipmentCount(((Number) counts[1]).intValue());
                site.setEmployeeCount(((Number) counts[2]).intValue());
                site.setWarehouseCount(((Number) counts[3]).intValue());
                site.setMerchantCount(((Number) counts[4]).intValue());
            }
        }
        return sites;
    }

    @Transactional(readOnly = true)
    public List<Equipment> getSiteEquipments(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getEquipment(); // Ensure this method is correctly mapped
    }

    @Transactional(readOnly = true)
    public List<Employee> getSiteEmployees(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getEmployees(); // Ensure this method is correctly mapped
    }

    @Transactional(readOnly = true)
    public List<Warehouse> getSiteWarehouses(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }

        return site.getWarehouses(); // This will now include the warehouse manager
    }


    @Transactional(readOnly = true)
    public List<Merchant> getSiteMerchants(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getMerchants(); // Ensure this method is correctly mapped
    }

    @Transactional(readOnly = true)
    public List<FixedAssets> getSiteFixedAssets(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getFixedAssets(); // Ensure this method is correctly mapped
    }

    @Transactional(readOnly = true)
    public List<FixedAssets> getUnassignedFixedAssets() {
        // You'll need to inject FixedAssetsRepository in your SiteService
        return fixedAssetsRepository.findBySiteIsNullAndStatusNot(AssetStatus.DISPOSED);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSitePartners(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }

        List<Map<String, Object>> partnersList = new ArrayList<>();

        for (SitePartner sitePartner : site.getSitePartners()) {
            Map<String, Object> partnerInfo = new HashMap<>();
            Partner partner = sitePartner.getPartner();

            partnerInfo.put("id", partner.getId());
            partnerInfo.put("firstName", partner.getFirstName());
            partnerInfo.put("lastName", partner.getLastName());
            partnerInfo.put("percentage", sitePartner.getPercentage());

            partnersList.add(partnerInfo);
        }

        return partnersList;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUnassignedSitePartners(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }

        // Get IDs of partners already assigned to the site
        List<Integer> assignedPartnerIds = site.getSitePartners()
                .stream()
                .map(sp -> sp.getPartner().getId())
                .toList();

        // Get all partners not assigned
        List<Partner> unassignedPartners;
        if (assignedPartnerIds.isEmpty()) {
            unassignedPartners = partnerRepository.findAll(); // If no assigned partners, all are unassigned
        } else {
            unassignedPartners = partnerRepository.findByIdNotIn(assignedPartnerIds);
        }

        List<Map<String, Object>> unassignedPartnersList = new ArrayList<>();

        for (Partner partner : unassignedPartners) {
            Map<String, Object> partnerInfo = new HashMap<>();

            partnerInfo.put("id", partner.getId());
            partnerInfo.put("firstName", partner.getFirstName());
            partnerInfo.put("lastName", partner.getLastName());
            partnerInfo.put("percentage", null); // Not assigned yet, so no percentage

            unassignedPartnersList.add(partnerInfo);
        }

        return unassignedPartnersList;
    }

    @Transactional(readOnly = true)
    public List<Employee> getUnassignedEmployees() {
        System.out.println("=== FETCHING UNASSIGNED EMPLOYEES (EXCLUDING EQUIPMENT DRIVERS) ===");

        List<Employee> unassignedEmployees = employeeRepository.findUnassignedEmployeesNotAssignedAsDrivers();

        System.out.println("Found " + unassignedEmployees.size() + " available employees:");
        for (Employee emp : unassignedEmployees) {
            System.out.println("- ID: " + emp.getId() +
                    ", Name: " + emp.getFirstName() + " " + emp.getLastName() +
                    ", Site: " + (emp.getSite() != null ? emp.getSite().getName() : "NULL") +
                    ", Is Driver: " + emp.isDriver());
        }

        return unassignedEmployees;
    }
    
    @Transactional(readOnly = true)
    public List<Equipment> getUnassignedEquipment() {
        List<Equipment> availableEquipment = equipmentRepository.findBySiteIsNull();
        return availableEquipment;
    }
    @Transactional(readOnly = true)
    public List<EquipmentDTO> getSiteEquipmentsDTO(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>();
        }

        return site.getEquipment().stream()
                .map(equipment -> {
                    EquipmentDTO dto = EquipmentDTO.fromEntity(equipment);
                    // Use the same logic as EquipmentService
                    try {
                        if (equipment.getImageStorageKey() != null && !equipment.getImageStorageKey().isEmpty()) {
                            dto.setImageUrl(minioService.generateUrlFromKey(equipment.getImageStorageKey()));
                        } else {
                            dto.setImageUrl(minioService.getEquipmentMainPhoto(equipment.getId()));
                        }
                    } catch (Exception e) {
                        dto.setImageUrl(null);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
