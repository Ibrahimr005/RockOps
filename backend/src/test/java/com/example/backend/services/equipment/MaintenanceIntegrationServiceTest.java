package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.MaintenanceDTO;
import com.example.backend.dto.equipment.MaintenanceLinkingRequest;
import com.example.backend.dto.equipment.MaintenanceSearchCriteria;
import com.example.backend.models.equipment.Equipment;
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
public class MaintenanceIntegrationServiceTest {

    @Mock
    private InSiteMaintenanceRepository maintenanceRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private TransactionService transactionService;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private MaintenanceTypeRepository maintenanceTypeRepository;

    @Mock
    private InSiteMaintenanceService maintenanceService;

    @InjectMocks
    private MaintenanceIntegrationService maintenanceIntegrationService;

    // ==================== searchMaintenanceRecords ====================

    @Test
    public void searchMaintenanceRecords_noCriteria_shouldReturnAll() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance m = createMaintenance(equipmentId);

        when(maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId)).thenReturn(List.of(m));

        List<MaintenanceDTO> result = maintenanceIntegrationService.searchMaintenanceRecords(equipmentId, null);

        assertEquals(1, result.size());
    }

    @Test
    public void searchMaintenanceRecords_withStatusFilter_shouldFilter() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance pending = createMaintenance(equipmentId);
        pending.setStatus("PENDING");

        InSiteMaintenance completed = createMaintenance(equipmentId);
        completed.setStatus("COMPLETED");

        when(maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId))
                .thenReturn(List.of(pending, completed));

        MaintenanceSearchCriteria criteria = MaintenanceSearchCriteria.builder()
                .status("PENDING")
                .build();

        List<MaintenanceDTO> result = maintenanceIntegrationService.searchMaintenanceRecords(equipmentId, criteria);

        assertEquals(1, result.size());
        assertEquals("PENDING", result.get(0).getStatus());
    }

    @Test
    public void searchMaintenanceRecords_complexQueryFails_shouldFallback() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance m = createMaintenance(equipmentId);

        when(maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId))
                .thenThrow(new RuntimeException("Query failed"));
        when(maintenanceRepository.findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId))
                .thenReturn(List.of(m));

        List<MaintenanceDTO> result = maintenanceIntegrationService.searchMaintenanceRecords(equipmentId, null);

        assertEquals(1, result.size());
        verify(maintenanceRepository).findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
    }

    @Test
    public void searchMaintenanceRecords_withDescriptionFilter_shouldFilter() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance m1 = createMaintenance(equipmentId);
        m1.setDescription("Oil change procedure");

        InSiteMaintenance m2 = createMaintenance(equipmentId);
        m2.setDescription("Tire replacement");

        when(maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId))
                .thenReturn(List.of(m1, m2));

        MaintenanceSearchCriteria criteria = MaintenanceSearchCriteria.builder()
                .description("oil")
                .build();

        List<MaintenanceDTO> result = maintenanceIntegrationService.searchMaintenanceRecords(equipmentId, criteria);

        assertEquals(1, result.size());
    }

    // ==================== linkTransactionToMaintenance ====================

    @Test
    public void linkTransactionToMaintenance_success_shouldLink() {
        UUID transactionId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();

        Transaction transaction = new Transaction();
        transaction.setId(transactionId);
        transaction.setPurpose(TransactionPurpose.GENERAL);

        InSiteMaintenance maintenance = createMaintenance(UUID.randomUUID());
        maintenance.setId(maintenanceId);
        maintenance.setRelatedTransactions(new ArrayList<>());

        when(transactionService.getTransactionById(transactionId)).thenReturn(transaction);
        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(maintenance));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));
        when(maintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> i.getArgument(0));

        maintenanceIntegrationService.linkTransactionToMaintenance(transactionId, maintenanceId);

        assertEquals(TransactionPurpose.MAINTENANCE, transaction.getPurpose());
        assertEquals(maintenance, transaction.getMaintenance());
        verify(transactionRepository).save(transaction);
    }

    @Test
    public void linkTransactionToMaintenance_alreadyMaintenancePurpose_shouldKeepPurpose() {
        UUID transactionId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();

        Transaction transaction = new Transaction();
        transaction.setId(transactionId);
        transaction.setPurpose(TransactionPurpose.MAINTENANCE);

        InSiteMaintenance maintenance = createMaintenance(UUID.randomUUID());
        maintenance.setId(maintenanceId);
        maintenance.setRelatedTransactions(new ArrayList<>());

        when(transactionService.getTransactionById(transactionId)).thenReturn(transaction);
        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(maintenance));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));
        when(maintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> i.getArgument(0));

        maintenanceIntegrationService.linkTransactionToMaintenance(transactionId, maintenanceId);

        assertEquals(TransactionPurpose.MAINTENANCE, transaction.getPurpose());
    }

    @Test
    public void linkTransactionToMaintenance_maintenanceNotFound_shouldThrow() {
        UUID transactionId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();

        Transaction transaction = new Transaction();
        transaction.setId(transactionId);

        when(transactionService.getTransactionById(transactionId)).thenReturn(transaction);
        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceIntegrationService.linkTransactionToMaintenance(transactionId, maintenanceId));
    }

    // ==================== getMaintenanceRecordsForLinking ====================

    @Test
    public void getMaintenanceRecordsForLinking_recentRecordsExist_shouldReturnFiltered() {
        UUID equipmentId = UUID.randomUUID();
        InSiteMaintenance recent = createMaintenance(equipmentId);
        recent.setMaintenanceDate(LocalDateTime.now().minusDays(5));
        recent.setRelatedTransactions(new ArrayList<>());

        when(maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId))
                .thenReturn(List.of(recent));

        List<MaintenanceDTO> result = maintenanceIntegrationService.getMaintenanceRecordsForLinking(equipmentId);

        assertFalse(result.isEmpty());
    }

    @Test
    public void getMaintenanceRecordsForLinking_noRecentRecords_shouldFallbackToLastTen() {
        UUID equipmentId = UUID.randomUUID();

        // Return no records matching the criteria (empty because of date filter)
        when(maintenanceRepository.findByEquipmentIdWithTransactions(equipmentId))
                .thenReturn(List.of());

        InSiteMaintenance oldRecord = createMaintenance(equipmentId);
        when(maintenanceRepository.findTop10ByEquipmentIdOrderByMaintenanceDateDesc(equipmentId))
                .thenReturn(List.of(oldRecord));

        List<MaintenanceDTO> result = maintenanceIntegrationService.getMaintenanceRecordsForLinking(equipmentId);

        assertEquals(1, result.size());
        verify(maintenanceRepository).findTop10ByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
    }

    // ==================== createMaintenanceAndLinkTransaction ====================

    @Test
    public void createMaintenanceAndLinkTransaction_success_shouldCreateAndLink() {
        UUID equipmentId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();

        MaintenanceLinkingRequest.NewMaintenanceRequest request = new MaintenanceLinkingRequest.NewMaintenanceRequest();
        request.setTechnicianId(UUID.randomUUID());
        request.setMaintenanceDate(LocalDateTime.now());
        request.setMaintenanceTypeId(UUID.randomUUID());
        request.setDescription("New maintenance");
        request.setStatus("PENDING");

        InSiteMaintenance created = createMaintenance(equipmentId);
        created.setId(maintenanceId);
        created.setRelatedTransactions(new ArrayList<>());

        Transaction transaction = new Transaction();
        transaction.setId(transactionId);
        transaction.setPurpose(TransactionPurpose.GENERAL);

        when(maintenanceService.createMaintenance(
                eq(equipmentId), any(), any(), any(UUID.class), any(), any()))
                .thenReturn(created);
        when(transactionService.getTransactionById(transactionId)).thenReturn(transaction);
        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(created));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));
        when(maintenanceRepository.save(any(InSiteMaintenance.class))).thenAnswer(i -> i.getArgument(0));

        InSiteMaintenance result = maintenanceIntegrationService.createMaintenanceAndLinkTransaction(
                equipmentId, request, transactionId);

        assertNotNull(result);
        assertEquals(maintenanceId, result.getId());
        verify(maintenanceService).createMaintenance(
                eq(equipmentId), any(), any(), any(UUID.class), any(), any());
    }

    // ==================== Helper ====================

    private InSiteMaintenance createMaintenance(UUID equipmentId) {
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Test Equipment");

        Employee technician = new Employee();
        technician.setId(UUID.randomUUID());
        technician.setFirstName("John");
        technician.setLastName("Doe");

        MaintenanceType mt = new MaintenanceType();
        mt.setId(UUID.randomUUID());
        mt.setName("Oil Change");

        return InSiteMaintenance.builder()
                .id(UUID.randomUUID())
                .equipment(equipment)
                .technician(technician)
                .maintenanceType(mt)
                .maintenanceDate(LocalDateTime.now())
                .description("Test maintenance")
                .status("PENDING")
                .relatedTransactions(new ArrayList<>())
                .build();
    }
}