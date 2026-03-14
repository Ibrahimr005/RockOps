package com.example.backend.services.equipment;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.InSiteMaintenanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.services.notification.NotificationService;
import com.example.backend.services.transaction.TransactionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InSiteMaintenanceServiceTest {

    @Mock
    private InSiteMaintenanceRepository inSiteMaintenanceRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private TransactionService transactionService;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private MaintenanceTypeService maintenanceTypeService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private InSiteMaintenanceService inSiteMaintenanceService;

    // ==================== getMaintenanceByEquipmentId ====================

    @Test
    public void getMaintenanceByEquipmentId_success_shouldReturnList() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance m = createMaintenance();

        when(inSiteMaintenanceRepository.findByEquipmentIdWithTransactions(equipmentId)).thenReturn(List.of(m));

        List<InSiteMaintenance> result = inSiteMaintenanceService.getMaintenanceByEquipmentId(equipmentId);

        assertEquals(1, result.size());
    }

    @Test
    public void getMaintenanceByEquipmentId_complexQueryFails_shouldFallback() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance m = createMaintenance();

        when(inSiteMaintenanceRepository.findByEquipmentIdWithTransactions(equipmentId))
                .thenThrow(new RuntimeException("Query failed"));
        when(inSiteMaintenanceRepository.findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId))
                .thenReturn(List.of(m));

        List<InSiteMaintenance> result = inSiteMaintenanceService.getMaintenanceByEquipmentId(equipmentId);

        assertEquals(1, result.size());
        verify(inSiteMaintenanceRepository).findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
    }

    // ==================== createMaintenance (UUID maintenanceTypeId) ====================

    @Test
    public void createMaintenance_withTypeId_success_shouldCreate() {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();
        UUID maintenanceTypeId = UUID.randomUUID();
        LocalDateTime date = LocalDateTime.now();

        Equipment equipment = createEquipment(equipmentId);
        Employee technician = createEmployee(technicianId);
        MaintenanceType mt = new MaintenanceType();
        mt.setId(maintenanceTypeId);
        mt.setName("Oil Change");

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(technicianId)).thenReturn(Optional.of(technician));
        when(maintenanceTypeService.getMaintenanceTypeEntityById(maintenanceTypeId)).thenReturn(mt);
        when(inSiteMaintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> {
            InSiteMaintenance m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        InSiteMaintenance result = inSiteMaintenanceService.createMaintenance(
                equipmentId, technicianId, date, maintenanceTypeId, "Test desc", "PENDING");

        assertNotNull(result.getId());
        assertEquals(equipment, result.getEquipment());
        assertEquals(technician, result.getTechnician());
        assertEquals(mt, result.getMaintenanceType());
        assertEquals("Test desc", result.getDescription());
        assertEquals("PENDING", result.getStatus());
    }

    @Test
    public void createMaintenance_withTypeId_equipmentNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> inSiteMaintenanceService.createMaintenance(
                        equipmentId, UUID.randomUUID(), LocalDateTime.now(), UUID.randomUUID(), "Desc", "PENDING"));
    }

    @Test
    public void createMaintenance_withTypeId_technicianNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(createEquipment(equipmentId)));
        when(employeeRepository.findById(technicianId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> inSiteMaintenanceService.createMaintenance(
                        equipmentId, technicianId, LocalDateTime.now(), UUID.randomUUID(), "Desc", "PENDING"));
    }

    // ==================== createMaintenance (String maintenanceTypeName) ====================

    @Test
    public void createMaintenance_withTypeName_existingType_shouldUseExisting() {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();
        LocalDateTime date = LocalDateTime.now();

        Equipment equipment = createEquipment(equipmentId);
        Employee technician = createEmployee(technicianId);
        MaintenanceType mt = new MaintenanceType();
        mt.setName("Oil Change");

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(technicianId)).thenReturn(Optional.of(technician));
        when(maintenanceTypeService.searchMaintenanceTypes("Oil Change")).thenReturn(List.of(mt));
        when(inSiteMaintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> {
            InSiteMaintenance m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        InSiteMaintenance result = inSiteMaintenanceService.createMaintenance(
                equipmentId, technicianId, date, "Oil Change", "Desc", "PENDING");

        assertNotNull(result);
        verify(maintenanceTypeService, never()).addMaintenanceType(any(), any());
    }

    @Test
    public void createMaintenance_withTypeName_newType_shouldCreateType() {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();
        LocalDateTime date = LocalDateTime.now();

        Equipment equipment = createEquipment(equipmentId);
        Employee technician = createEmployee(technicianId);
        MaintenanceType newMt = new MaintenanceType();
        newMt.setName("New Type");

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(technicianId)).thenReturn(Optional.of(technician));
        when(maintenanceTypeService.searchMaintenanceTypes("New Type")).thenReturn(List.of());
        when(maintenanceTypeService.addMaintenanceType("New Type", "Auto-created from maintenance entry")).thenReturn(newMt);
        when(inSiteMaintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> {
            InSiteMaintenance m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        InSiteMaintenance result = inSiteMaintenanceService.createMaintenance(
                equipmentId, technicianId, date, "New Type", "Desc", "PENDING");

        assertNotNull(result);
        verify(maintenanceTypeService).addMaintenanceType("New Type", "Auto-created from maintenance entry");
    }

    // ==================== findTransactionByBatchNumber ====================

    @Test
    public void findTransactionByBatchNumber_found_shouldReturn() {
        Transaction tx = new Transaction();
        tx.setBatchNumber(100);
        when(transactionRepository.findByBatchNumber(100)).thenReturn(Optional.of(tx));

        Optional<Transaction> result = inSiteMaintenanceService.findTransactionByBatchNumber(100);

        assertTrue(result.isPresent());
        assertEquals(100, result.get().getBatchNumber());
    }

    @Test
    public void findTransactionByBatchNumber_notFound_shouldReturnEmpty() {
        when(transactionRepository.findByBatchNumber(999)).thenReturn(Optional.empty());

        Optional<Transaction> result = inSiteMaintenanceService.findTransactionByBatchNumber(999);

        assertFalse(result.isPresent());
    }

    // ==================== linkTransactionToMaintenance ====================

    @Test
    public void linkTransactionToMaintenance_success_shouldLink() {
        UUID maintenanceId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();

        Equipment equipment = createEquipment(UUID.randomUUID());

        InSiteMaintenance maintenance = createMaintenance();
        maintenance.setId(maintenanceId);
        maintenance.setEquipment(equipment);
        maintenance.setRelatedTransactions(new ArrayList<>());

        Transaction transaction = new Transaction();
        transaction.setId(transactionId);
        transaction.setPurpose(TransactionPurpose.GENERAL);

        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(maintenance));
        when(transactionService.getTransactionById(transactionId)).thenReturn(transaction);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));
        when(inSiteMaintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> i.getArgument(0));

        InSiteMaintenance result = inSiteMaintenanceService.linkTransactionToMaintenance(maintenanceId, transactionId);

        assertEquals(TransactionPurpose.MAINTENANCE, transaction.getPurpose());
        assertEquals(maintenance, transaction.getMaintenance());
        assertTrue(result.getRelatedTransactions().contains(transaction));
    }

    @Test
    public void linkTransactionToMaintenance_maintenanceNotFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();

        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> inSiteMaintenanceService.linkTransactionToMaintenance(maintenanceId, transactionId));
    }

    // ==================== updateMaintenance (UUID maintenanceTypeId) ====================

    @Test
    public void updateMaintenance_withTypeId_success_shouldUpdate() {
        UUID maintenanceId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();
        UUID maintenanceTypeId = UUID.randomUUID();
        LocalDateTime date = LocalDateTime.now();

        Equipment equipment = createEquipment(UUID.randomUUID());
        Employee technician = createEmployee(technicianId);
        MaintenanceType mt = new MaintenanceType();
        mt.setId(maintenanceTypeId);
        mt.setName("Tire Change");

        InSiteMaintenance existing = createMaintenance();
        existing.setId(maintenanceId);
        existing.setEquipment(equipment);

        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(existing));
        when(employeeRepository.findById(technicianId)).thenReturn(Optional.of(technician));
        when(maintenanceTypeService.getMaintenanceTypeEntityById(maintenanceTypeId)).thenReturn(mt);
        when(inSiteMaintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> i.getArgument(0));

        InSiteMaintenance result = inSiteMaintenanceService.updateMaintenance(
                maintenanceId, technicianId, date, maintenanceTypeId, "Updated desc", "COMPLETED");

        assertEquals("Updated desc", result.getDescription());
        assertEquals("COMPLETED", result.getStatus());
        assertEquals(technician, result.getTechnician());
    }

    @Test
    public void updateMaintenance_withTypeId_notFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> inSiteMaintenanceService.updateMaintenance(
                        maintenanceId, UUID.randomUUID(), LocalDateTime.now(), UUID.randomUUID(), "Desc", "PENDING"));
    }

    @Test
    public void updateMaintenance_withTypeId_technicianNotFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();

        InSiteMaintenance existing = createMaintenance();
        existing.setId(maintenanceId);

        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(existing));
        when(employeeRepository.findById(technicianId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> inSiteMaintenanceService.updateMaintenance(
                        maintenanceId, technicianId, LocalDateTime.now(), UUID.randomUUID(), "Desc", "PENDING"));
    }

    // ==================== deleteMaintenance ====================

    @Test
    public void deleteMaintenance_exists_shouldDelete() {
        UUID maintenanceId = UUID.randomUUID();

        Equipment equipment = createEquipment(UUID.randomUUID());
        Employee technician = createEmployee(UUID.randomUUID());
        MaintenanceType mt = new MaintenanceType();
        mt.setName("Oil Change");

        InSiteMaintenance maintenance = createMaintenance();
        maintenance.setId(maintenanceId);
        maintenance.setEquipment(equipment);
        maintenance.setTechnician(technician);
        maintenance.setMaintenanceType(mt);
        maintenance.setMaintenanceDate(LocalDateTime.now());
        maintenance.setStatus("PENDING");

        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(maintenance));

        inSiteMaintenanceService.deleteMaintenance(maintenanceId);

        verify(inSiteMaintenanceRepository).deleteById(maintenanceId);
    }

    @Test
    public void deleteMaintenance_notFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        when(inSiteMaintenanceRepository.findById(maintenanceId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> inSiteMaintenanceService.deleteMaintenance(maintenanceId));
        verify(inSiteMaintenanceRepository, never()).deleteById(any());
    }

    // ==================== Helpers ====================

    private InSiteMaintenance createMaintenance() {
        return InSiteMaintenance.builder()
                .description("Test maintenance")
                .status("PENDING")
                .maintenanceDate(LocalDateTime.now())
                .relatedTransactions(new ArrayList<>())
                .build();
    }

    private Equipment createEquipment(UUID id) {
        Equipment equipment = new Equipment();
        equipment.setId(id);
        equipment.setName("Test Equipment");
        equipment.setModel("Model X");
        return equipment;
    }

    private Employee createEmployee(UUID id) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setFirstName("John");
        employee.setLastName("Doe");
        return employee;
    }
}