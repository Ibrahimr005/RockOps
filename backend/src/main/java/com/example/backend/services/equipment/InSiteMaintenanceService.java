package com.example.backend.services.equipment;

import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.services.transaction.TransactionService;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.InSiteMaintenanceRepository;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.models.hr.Employee;
import com.example.backend.repositories.hr.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InSiteMaintenanceService {

    @Autowired
    private InSiteMaintenanceRepository inSiteMaintenanceRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private MaintenanceTypeService maintenanceTypeService;

    // Get all maintenance records for equipment with related transactions
    public List<InSiteMaintenance> getMaintenanceByEquipmentId(UUID equipmentId) {
        return inSiteMaintenanceRepository.findByEquipmentIdWithTransactions(equipmentId);
    }

    // Create a new maintenance record
    public InSiteMaintenance createMaintenance(UUID equipmentId,
                                               UUID technicianId,
                                               LocalDateTime maintenanceDate,
                                               UUID maintenanceTypeId,
                                               String description,
                                               String status) {

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        Employee technician = employeeRepository.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("Technician not found"));

        MaintenanceType maintenanceType = maintenanceTypeService.getMaintenanceTypeEntityById(maintenanceTypeId);

        InSiteMaintenance maintenance = InSiteMaintenance.builder()
                .equipment(equipment)
                .technician(technician)
                .maintenanceDate(maintenanceDate)
                .maintenanceType(maintenanceType)
                .description(description)
                .status(status)
                .build();

        return inSiteMaintenanceRepository.save(maintenance);
    }

    // Legacy method for backward compatibility (with String maintenanceType)
    public InSiteMaintenance createMaintenance(UUID equipmentId,
                                               UUID technicianId,
                                               LocalDateTime maintenanceDate,
                                               String maintenanceTypeName,
                                               String description,
                                               String status) {

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        Employee technician = employeeRepository.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("Technician not found"));

        // Find or create maintenance type by name
        List<MaintenanceType> existingTypes = maintenanceTypeService.searchMaintenanceTypes(maintenanceTypeName);
        MaintenanceType maintenanceType;
        
        if (!existingTypes.isEmpty() && existingTypes.get(0).getName().equalsIgnoreCase(maintenanceTypeName)) {
            maintenanceType = existingTypes.get(0);
        } else {
            // Create new maintenance type if it doesn't exist
            maintenanceType = maintenanceTypeService.addMaintenanceType(maintenanceTypeName, "Auto-created from maintenance entry");
        }

        InSiteMaintenance maintenance = InSiteMaintenance.builder()
                .equipment(equipment)
                .technician(technician)
                .maintenanceDate(maintenanceDate)
                .maintenanceType(maintenanceType)
                .description(description)
                .status(status)
                .build();

        return inSiteMaintenanceRepository.save(maintenance);
    }

    // Find a transaction by batch number
    public Optional<Transaction> findTransactionByBatchNumber(int batchNumber) {
        return transactionRepository.findByBatchNumber(batchNumber);
    }

    // Link an existing transaction to a maintenance record
    public InSiteMaintenance linkTransactionToMaintenance(UUID maintenanceId, UUID transactionId) {
        InSiteMaintenance maintenance = inSiteMaintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance record not found"));

        Transaction transaction = transactionService.getTransactionById(transactionId);

        // Set the transaction purpose to MAINTENANCE if it's not already
        if (transaction.getPurpose() != TransactionPurpose.MAINTENANCE) {
            transaction.setPurpose(TransactionPurpose.MAINTENANCE);
        }

        // Set the maintenance relationship on the transaction (bidirectional relationship)
        transaction.setMaintenance(maintenance);
        transactionRepository.save(transaction);

        // Add transaction to maintenance if not already present
        if (!maintenance.getRelatedTransactions().contains(transaction)) {
            maintenance.getRelatedTransactions().add(transaction);
        }

        return inSiteMaintenanceRepository.save(maintenance);
    }

    // Update maintenance record
    public InSiteMaintenance updateMaintenance(UUID maintenanceId,
                                               UUID technicianId,
                                               LocalDateTime maintenanceDate,
                                               UUID maintenanceTypeId,
                                               String description,
                                               String status) {

        InSiteMaintenance maintenance = inSiteMaintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance record not found"));

        Employee technician = employeeRepository.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("Technician not found"));

        MaintenanceType maintenanceType = maintenanceTypeService.getMaintenanceTypeEntityById(maintenanceTypeId);

        maintenance.setTechnician(technician);
        maintenance.setMaintenanceDate(maintenanceDate);
        maintenance.setMaintenanceType(maintenanceType);
        maintenance.setDescription(description);
        maintenance.setStatus(status);

        return inSiteMaintenanceRepository.save(maintenance);
    }

    // Legacy update method for backward compatibility (with String maintenanceType)
    public InSiteMaintenance updateMaintenance(UUID maintenanceId,
                                               UUID technicianId,
                                               LocalDateTime maintenanceDate,
                                               String maintenanceTypeName,
                                               String description,
                                               String status) {

        InSiteMaintenance maintenance = inSiteMaintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance record not found"));

        Employee technician = employeeRepository.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("Technician not found"));

        // Find or create maintenance type by name
        List<MaintenanceType> existingTypes = maintenanceTypeService.searchMaintenanceTypes(maintenanceTypeName);
        MaintenanceType maintenanceType;
        
        if (!existingTypes.isEmpty() && existingTypes.get(0).getName().equalsIgnoreCase(maintenanceTypeName)) {
            maintenanceType = existingTypes.get(0);
        } else {
            // Create new maintenance type if it doesn't exist
            maintenanceType = maintenanceTypeService.addMaintenanceType(maintenanceTypeName, "Auto-created from maintenance entry");
        }

        maintenance.setTechnician(technician);
        maintenance.setMaintenanceDate(maintenanceDate);
        maintenance.setMaintenanceType(maintenanceType);
        maintenance.setDescription(description);
        maintenance.setStatus(status);

        return inSiteMaintenanceRepository.save(maintenance);
    }

    // Delete maintenance record
    public void deleteMaintenance(UUID maintenanceId) {
        inSiteMaintenanceRepository.deleteById(maintenanceId);
    }
}