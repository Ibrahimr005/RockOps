package com.example.backend.services.site;

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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SiteService
{
    private SiteRepository siteRepository;
    private PartnerRepository partnerRepository;
    private EmployeeRepository employeeRepository;
    private EquipmentRepository equipmentRepository;
    private FixedAssetsRepository fixedAssetsRepository;

    @Autowired
    public SiteService(SiteRepository siteRepository, PartnerRepository partnerRepository, EmployeeRepository employeeRepository, EquipmentRepository equipmentRepository, FixedAssetsRepository fixedAssetsRepository)
    {
        this.siteRepository = siteRepository;
        this.partnerRepository = partnerRepository;
        this.employeeRepository = employeeRepository;
        this.equipmentRepository = equipmentRepository;
        this.fixedAssetsRepository = fixedAssetsRepository;
    }

    public Site getSiteById(UUID id)
    {
        return siteRepository.findById(id).orElse(null);
    }
    public List<Site> getAllSites() {
        List<Site> sites = siteRepository.findAll();
        for (Site site : sites) {
            // Force load the collections and set the counts
            site.setEquipmentCount(site.getEquipment().size());
            site.setEmployeeCount(site.getEmployees().size());
        }
        return sites;
    }

    public List<Equipment> getSiteEquipments(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getEquipment(); // Ensure this method is correctly mapped
    }

    public List<Employee> getSiteEmployees(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getEmployees(); // Ensure this method is correctly mapped
    }

    public List<Warehouse> getSiteWarehouses(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }

        return site.getWarehouses(); // This will now include the warehouse manager
    }


    public List<Merchant> getSiteMerchants(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getMerchants(); // Ensure this method is correctly mapped
    }

    public List<FixedAssets> getSiteFixedAssets(UUID siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new ArrayList<>(); // Return an empty list if the site does not exist
        }
        return site.getFixedAssets(); // Ensure this method is correctly mapped
    }

    public List<FixedAssets> getUnassignedFixedAssets() {
        // You'll need to inject FixedAssetsRepository in your SiteService
        return fixedAssetsRepository.findBySiteIsNullAndStatusNot(AssetStatus.DISPOSED);
    }

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

    public List<Employee> getUnassignedEmployees() {
        return employeeRepository.findBySiteIsNull();
    }

    public List<Equipment> getUnassignedEquipment() {
        List<Equipment> availableEquipment = equipmentRepository.findBySiteIsNull();
        return availableEquipment;
    }

}
