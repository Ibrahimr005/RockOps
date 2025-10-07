package com.example.backend.services.equipment;

import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.services.notification.NotificationService;
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
import java.util.Arrays;
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

    @Autowired
    private NotificationService notificationService;

    // Get all maintenance records for equipment with related transactions
    public List<InSiteMaintenance> getMaintenanceByEquipmentId(UUID equipmentId) {
        try {
            // Try the complex query first
            return inSiteMaintenanceRepository.findByEquipmentIdWithTransactions(equipmentId);
        } catch (Exception e) {
            // If it fails, fall back to the simple query
            System.err.println("Error with complex query, falling back to simple query: " + e.getMessage());
            return inSiteMaintenanceRepository.findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
        }
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

        // Save first to get the ID
        InSiteMaintenance savedMaintenance = inSiteMaintenanceRepository.save(maintenance);

// Send notifications to EQUIPMENT_MANAGER, MAINTENANCE_MANAGER, and MAINTENANCE_EMPLOYEE
        try {
            String notificationTitle = "New Maintenance Record Created";
            String notificationMessage = "Maintenance for equipment '" + equipment.getName() + "' (" + equipment.getModel() +
                    ") created - Date: " + maintenanceDate.toLocalDate() +
                    ", Type: " + (maintenanceType != null ? maintenanceType.getName() : "N/A") +
                    ", Technician: " + technician.getFirstName() + " " + technician.getLastName() +
                    ", Status: " + status;
            String actionUrl = "/equipment/" + equipment.getId();
            String relatedEntity = savedMaintenance.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance creation notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance creation notifications: " + e.getMessage());
        }

        return savedMaintenance;

       // return inSiteMaintenanceRepository.save(maintenance);
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

        // Save first to get the ID
        InSiteMaintenance savedMaintenance = inSiteMaintenanceRepository.save(maintenance);

// Send notifications to EQUIPMENT_MANAGER, MAINTENANCE_MANAGER, and MAINTENANCE_EMPLOYEE
        try {
            String notificationTitle = "New Maintenance Record Created";
            String notificationMessage = "Maintenance for equipment '" + equipment.getName() + "' (" + equipment.getModel() +
                    ") created - Date: " + maintenanceDate.toLocalDate() +
                    ", Type: " + (maintenanceType != null ? maintenanceType.getName() : "N/A") +
                    ", Technician: " + technician.getFirstName() + " " + technician.getLastName() +
                    ", Status: " + status;
            String actionUrl = "/equipment/" + equipment.getId();
            String relatedEntity = savedMaintenance.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance creation notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance creation notifications: " + e.getMessage());
        }

        return savedMaintenance;

       // return inSiteMaintenanceRepository.save(maintenance);
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

        // Save first
        InSiteMaintenance savedMaintenance = inSiteMaintenanceRepository.save(maintenance);

// Send notifications to EQUIPMENT_MANAGER, WAREHOUSE_MANAGER, and WAREHOUSE_EMPLOYEE
        try {
            String notificationTitle = "Transaction Linked to Maintenance";
            String notificationMessage = "Transaction (Batch #" + transaction.getBatchNumber() +
                    ") has been linked to maintenance for equipment '" +
                    maintenance.getEquipment().getName() + "' (" +
                    maintenance.getEquipment().getModel() + ")";
            String actionUrl = "/equipment/" + maintenance.getEquipment().getId();
            String relatedEntity = maintenance.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.WAREHOUSE_MANAGER, Role.WAREHOUSE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Transaction link notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send transaction link notifications: " + e.getMessage());
        }

        return savedMaintenance;

       // return inSiteMaintenanceRepository.save(maintenance);
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

        // Save first to get updated data
        InSiteMaintenance updatedMaintenance = inSiteMaintenanceRepository.save(maintenance);

// Send notifications to EQUIPMENT_MANAGER, MAINTENANCE_MANAGER, and MAINTENANCE_EMPLOYEE
        try {
            String notificationTitle = "Maintenance Record Updated";
            String notificationMessage = "Maintenance for equipment '" + maintenance.getEquipment().getName() +
                    "' (" + maintenance.getEquipment().getModel() + ") updated - Date: " +
                    maintenanceDate.toLocalDate() + ", Type: " +
                    (maintenanceType != null ? maintenanceType.getName() : "N/A") +
                    ", Technician: " + technician.getFirstName() + " " + technician.getLastName() +
                    ", Status: " + status;
            String actionUrl = "/equipment/" + maintenance.getEquipment().getId();
            String relatedEntity = updatedMaintenance.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance update notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance update notifications: " + e.getMessage());
        }

        return updatedMaintenance;

       // return inSiteMaintenanceRepository.save(maintenance);
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

        // Save first to get updated data
        InSiteMaintenance updatedMaintenance = inSiteMaintenanceRepository.save(maintenance);

// Send notifications to EQUIPMENT_MANAGER, MAINTENANCE_MANAGER, and MAINTENANCE_EMPLOYEE
        try {
            String notificationTitle = "Maintenance Record Updated";
            String notificationMessage = "Maintenance for equipment '" + maintenance.getEquipment().getName() +
                    "' (" + maintenance.getEquipment().getModel() + ") updated - Date: " +
                    maintenanceDate.toLocalDate() + ", Type: " +
                    (maintenanceType != null ? maintenanceType.getName() : "N/A") +
                    ", Technician: " + technician.getFirstName() + " " + technician.getLastName() +
                    ", Status: " + status;
            String actionUrl = "/equipment/" + maintenance.getEquipment().getId();
            String relatedEntity = updatedMaintenance.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance update notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance update notifications: " + e.getMessage());
        }

        return updatedMaintenance;

        //return inSiteMaintenanceRepository.save(maintenance);
    }

    // Delete maintenance record
    public void deleteMaintenance(UUID maintenanceId) {

        // Get maintenance details before deletion
        InSiteMaintenance maintenance = inSiteMaintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance record not found"));

        Equipment equipment = maintenance.getEquipment();
        String technicianName = maintenance.getTechnician().getFirstName() + " " + maintenance.getTechnician().getLastName();
        String maintenanceTypeName = maintenance.getMaintenanceType() != null ? maintenance.getMaintenanceType().getName() : "N/A";

// Send notifications to EQUIPMENT_MANAGER, MAINTENANCE_MANAGER, and MAINTENANCE_EMPLOYEE
        try {
            String notificationTitle = "Maintenance Record Deleted";
            String notificationMessage = "Maintenance for equipment '" + equipment.getName() + "' (" + equipment.getModel() +
                    ") deleted - Date: " + maintenance.getMaintenanceDate().toLocalDate() +
                    ", Type: " + maintenanceTypeName +
                    ", Technician: " + technicianName +
                    ", Status: " + maintenance.getStatus();
            String actionUrl = "/equipment/" + equipment.getId();
            String relatedEntity = maintenanceId.toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.MAINTENANCE_MANAGER, Role.MAINTENANCE_EMPLOYEE);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance deletion notifications sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance deletion notifications: " + e.getMessage());
        }
        inSiteMaintenanceRepository.deleteById(maintenanceId);
    }
}