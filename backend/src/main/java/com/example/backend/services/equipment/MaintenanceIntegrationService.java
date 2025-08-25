package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.MaintenanceDTO;
import com.example.backend.dto.equipment.MaintenanceLinkingRequest;
import com.example.backend.dto.equipment.MaintenanceSearchCriteria;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.repositories.equipment.InSiteMaintenanceRepository;
import com.example.backend.repositories.equipment.MaintenanceTypeRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.services.transaction.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MaintenanceIntegrationService {

    @Autowired
    private InSiteMaintenanceRepository maintenanceRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private MaintenanceTypeRepository maintenanceTypeRepository;

    @Autowired
    private InSiteMaintenanceService maintenanceService;

    /**
     * Search maintenance records with filters
     */
    public List<MaintenanceDTO> searchMaintenanceRecords(UUID equipmentId, MaintenanceSearchCriteria criteria) {
        List<InSiteMaintenance> maintenanceRecords;
        try {
            maintenanceRecords = maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId);
        } catch (Exception e) {
            // Fall back to simple query if complex query fails
            System.err.println("Error with complex query in MaintenanceIntegrationService, falling back to simple query: " + e.getMessage());
            maintenanceRecords = maintenanceRepository.findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
        }
        
        return maintenanceRecords.stream()
                .filter(maintenance -> matchesCriteria(maintenance, criteria))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Link transaction to existing maintenance
     */
    @Transactional
    public void linkTransactionToMaintenance(UUID transactionId, UUID maintenanceId) {
        Transaction transaction = transactionService.getTransactionById(transactionId);
        InSiteMaintenance maintenance = maintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance record not found"));

        // Set the transaction purpose to MAINTENANCE if it's not already
        if (transaction.getPurpose() != TransactionPurpose.MAINTENANCE) {
            transaction.setPurpose(TransactionPurpose.MAINTENANCE);
        }

        // Set the maintenance relationship on the transaction
        transaction.setMaintenance(maintenance);
        transactionRepository.save(transaction);

        // Add transaction to maintenance if not already present
        if (!maintenance.getRelatedTransactions().contains(transaction)) {
            maintenance.getRelatedTransactions().add(transaction);
            maintenanceRepository.save(maintenance);
        }
    }

    /**
     * Create maintenance and link transaction
     */
    @Transactional
    public InSiteMaintenance createMaintenanceAndLinkTransaction(
            UUID equipmentId, 
            MaintenanceLinkingRequest.NewMaintenanceRequest request, 
            UUID transactionId) {
        
        // Create the maintenance record
        InSiteMaintenance maintenance = maintenanceService.createMaintenance(
                equipmentId,
                request.getTechnicianId(),
                request.getMaintenanceDate(),
                request.getMaintenanceTypeId(),
                request.getDescription(),
                request.getStatus()
        );

        // Link the transaction to the new maintenance record
        linkTransactionToMaintenance(transactionId, maintenance.getId());

        return maintenance;
    }

    /**
     * Get maintenance records for linking (recent and relevant)
     */
    public List<MaintenanceDTO> getMaintenanceRecordsForLinking(UUID equipmentId) {
        // Get recent maintenance records (last 30 days) that are not completed
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        
        MaintenanceSearchCriteria criteria = MaintenanceSearchCriteria.builder()
                .startDate(thirtyDaysAgo)
                .hasLinkedTransactions(false) // Prefer maintenance without many linked transactions
                .build();

        List<MaintenanceDTO> recentRecords = searchMaintenanceRecords(equipmentId, criteria);
        
        // If no recent records, get the last 10 maintenance records regardless of date
        if (recentRecords.isEmpty()) {
            List<InSiteMaintenance> lastTenRecords = maintenanceRepository.findTop10ByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
            return lastTenRecords.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        }
        
        return recentRecords;
    }

    /**
     * Check if maintenance record matches search criteria
     */
    private boolean matchesCriteria(InSiteMaintenance maintenance, MaintenanceSearchCriteria criteria) {
        if (criteria == null) return true;

        // Date range filter
        if (criteria.getStartDate() != null && maintenance.getMaintenanceDate().toLocalDate().isBefore(criteria.getStartDate())) {
            return false;
        }
        if (criteria.getEndDate() != null && maintenance.getMaintenanceDate().toLocalDate().isAfter(criteria.getEndDate())) {
            return false;
        }

        // Technician filter
        if (criteria.getTechnicianId() != null && !criteria.getTechnicianId().equals(maintenance.getTechnician().getId())) {
            return false;
        }

        // Maintenance type filter
        if (criteria.getMaintenanceTypeId() != null && !criteria.getMaintenanceTypeId().equals(maintenance.getMaintenanceType().getId())) {
            return false;
        }

        // Status filter
        if (criteria.getStatus() != null && !criteria.getStatus().equalsIgnoreCase(maintenance.getStatus())) {
            return false;
        }

        // Description text search
        if (criteria.getDescription() != null && !maintenance.getDescription().toLowerCase().contains(criteria.getDescription().toLowerCase())) {
            return false;
        }

        // Linked transactions filter
        if (criteria.getHasLinkedTransactions() != null) {
            boolean hasTransactions = !maintenance.getRelatedTransactions().isEmpty();
            return criteria.getHasLinkedTransactions() == hasTransactions;
        }

        return true;
    }

    /**
     * Convert maintenance entity to DTO
     */
    private MaintenanceDTO convertToDTO(InSiteMaintenance maintenance) {
        return MaintenanceDTO.builder()
                .id(maintenance.getId())
                .equipmentId(maintenance.getEquipment().getId())
                .equipmentName(maintenance.getEquipment().getName())
                .technicianId(maintenance.getTechnician().getId())
                .technicianName(maintenance.getTechnician().getFullName())
                .maintenanceDate(maintenance.getMaintenanceDate())
                .maintenanceTypeId(maintenance.getMaintenanceType().getId())
                .maintenanceTypeName(maintenance.getMaintenanceType().getName())
                .description(maintenance.getDescription())
                .status(maintenance.getStatus())
                .linkedTransactionCount(maintenance.getRelatedTransactions().size())
                .lastTransactionBatch(getLastTransactionBatch(maintenance))
                .build();
    }

    /**
     * Get the batch number of the most recent linked transaction
     */
    private String getLastTransactionBatch(InSiteMaintenance maintenance) {
        return maintenance.getRelatedTransactions().stream()
                .filter(t -> t.getBatchNumber() != null)
                .max((t1, t2) -> t1.getCreatedAt().compareTo(t2.getCreatedAt()))
                .map(t -> String.valueOf(t.getBatchNumber()))
                .orElse(null);
    }
} 