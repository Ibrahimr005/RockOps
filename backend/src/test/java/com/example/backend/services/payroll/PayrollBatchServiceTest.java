package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.PayrollBatchDTO;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollBatchRepository;
import com.example.backend.repositories.payroll.PayrollRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollBatchServiceTest {

    @Mock
    private PayrollBatchRepository batchRepository;

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private PayrollBatchService payrollBatchService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setPayrollNumber("PRL-2026-000001");
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
        payroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);
    }

    private EmployeePayroll buildEmployeePayroll(UUID paymentTypeId, String code, String name, BigDecimal netPay) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(UUID.randomUUID());
        ep.setEmployeeName("Employee");
        ep.setPaymentTypeId(paymentTypeId);
        ep.setPaymentTypeCode(code);
        ep.setPaymentTypeName(name);
        ep.setNetPay(netPay);
        ep.setPayroll(payroll);
        return ep;
    }

    private PayrollBatch buildBatch(UUID id, String batchNumber) {
        PayrollBatch batch = new PayrollBatch();
        batch.setId(id);
        batch.setBatchNumber(batchNumber);
        batch.setPayroll(payroll);
        batch.setTotalAmount(new BigDecimal("5000"));
        batch.setEmployeeCount(2);
        batch.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);
        return batch;
    }

    // ==================== createBatchesForPayroll ====================

    @Test
    void createBatchesForPayroll_payrollNotFound_throwsException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> payrollBatchService.createBatchesForPayroll(payrollId, "admin"));
    }

    @Test
    void createBatchesForPayroll_wrongStatus_throwsException() {
        payroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> payrollBatchService.createBatchesForPayroll(payrollId, "admin"));
        assertTrue(ex.getMessage().contains("CONFIRMED_AND_LOCKED"));
    }

    @Test
    void createBatchesForPayroll_noEmployeePayrolls_throwsException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        assertThrows(RuntimeException.class,
                () -> payrollBatchService.createBatchesForPayroll(payrollId, "admin"));
    }

    @Test
    void createBatchesForPayroll_singlePaymentType_createsSingleBatch() {
        UUID typeId = UUID.randomUUID();
        EmployeePayroll ep1 = buildEmployeePayroll(typeId, "BANK", "Bank Transfer", new BigDecimal("2000"));
        EmployeePayroll ep2 = buildEmployeePayroll(typeId, "BANK", "Bank Transfer", new BigDecimal("3000"));

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep1, ep2));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("BATCH-001");
        when(batchRepository.save(any(PayrollBatch.class))).thenAnswer(inv -> {
            PayrollBatch b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        List<PayrollBatchDTO> result = payrollBatchService.createBatchesForPayroll(payrollId, "admin");

        assertEquals(1, result.size());
        assertEquals(new BigDecimal("5000"), result.get(0).getTotalAmount());
        assertEquals(2, result.get(0).getEmployeeCount());
    }

    @Test
    void createBatchesForPayroll_multiplePaymentTypes_createsMultipleBatches() {
        UUID bankTypeId = UUID.randomUUID();
        UUID cashTypeId = UUID.randomUUID();
        EmployeePayroll ep1 = buildEmployeePayroll(bankTypeId, "BANK", "Bank Transfer", new BigDecimal("2000"));
        EmployeePayroll ep2 = buildEmployeePayroll(cashTypeId, "CASH", "Cash", new BigDecimal("1500"));

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep1, ep2));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("BATCH-001", "BATCH-002");
        when(batchRepository.save(any(PayrollBatch.class))).thenAnswer(inv -> {
            PayrollBatch b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        List<PayrollBatchDTO> result = payrollBatchService.createBatchesForPayroll(payrollId, "admin");

        assertEquals(2, result.size());
    }

    @Test
    void createBatchesForPayroll_existingBatchesDeleted() {
        UUID typeId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(typeId, "BANK", "Bank Transfer", new BigDecimal("2000"));

        PayrollBatch existingBatch = buildBatch(UUID.randomUUID(), "OLD-BATCH");

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(existingBatch));
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("BATCH-002");
        when(batchRepository.save(any(PayrollBatch.class))).thenAnswer(inv -> {
            PayrollBatch b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        payrollBatchService.createBatchesForPayroll(payrollId, "admin");

        verify(batchRepository).deleteAll(List.of(existingBatch));
    }

    @Test
    void createBatchesForPayroll_employeesWithoutPaymentType_logsWarningButContinues() {
        UUID typeId = UUID.randomUUID();
        EmployeePayroll withType = buildEmployeePayroll(typeId, "BANK", "Bank Transfer", new BigDecimal("2000"));
        EmployeePayroll withoutType = buildEmployeePayroll(null, null, null, new BigDecimal("1000"));

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(withType, withoutType));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("BATCH-001");
        when(batchRepository.save(any(PayrollBatch.class))).thenAnswer(inv -> {
            PayrollBatch b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        List<PayrollBatchDTO> result = payrollBatchService.createBatchesForPayroll(payrollId, "admin");

        // Only 1 batch for the employee with payment type
        assertEquals(1, result.size());
    }

    // ==================== sendBatchesToFinance ====================

    @Test
    void sendBatchesToFinance_payrollNotFound_throwsException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> payrollBatchService.sendBatchesToFinance(payrollId, "admin"));
    }

    @Test
    void sendBatchesToFinance_noBatches_throwsException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> payrollBatchService.sendBatchesToFinance(payrollId, "admin"));
        assertTrue(ex.getMessage().contains("Create batches first"));
    }

    @Test
    void sendBatchesToFinance_batchAlreadySent_skipsCreatingNewPaymentRequest() {
        PayrollBatch batch = buildBatch(UUID.randomUUID(), "BATCH-001");

        PaymentRequest existingRequest = new PaymentRequest();
        existingRequest.setId(UUID.randomUUID());
        existingRequest.setRequestNumber("PR-123");
        batch.setPaymentRequest(existingRequest);

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(batch));

        List<PayrollBatchDTO> result = payrollBatchService.sendBatchesToFinance(payrollId, "admin");

        assertEquals(1, result.size());
        verify(paymentRequestRepository, never()).save(any());
    }

    @Test
    void sendBatchesToFinance_newBatch_createsPaymentRequestAndUpdatesPayroll() {
        PayrollBatch batch = buildBatch(UUID.randomUUID(), "BATCH-001");
        PaymentType pt = new PaymentType();
        pt.setId(UUID.randomUUID());
        pt.setName("Bank Transfer");
        batch.setPaymentType(pt);

        PaymentRequest savedRequest = new PaymentRequest();
        savedRequest.setId(UUID.randomUUID());
        savedRequest.setRequestNumber("PR-2026-001");

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(batch));
        when(paymentRequestRepository.save(any(PaymentRequest.class))).thenReturn(savedRequest);

        List<PayrollBatchDTO> result = payrollBatchService.sendBatchesToFinance(payrollId, "admin");

        assertEquals(1, result.size());
        verify(paymentRequestRepository).save(any(PaymentRequest.class));
        verify(batchRepository).save(batch);
        verify(payrollRepository).save(payroll);
        assertEquals(PayrollStatus.PENDING_FINANCE_REVIEW, payroll.getStatus());
    }

    // ==================== getBatchesForPayroll ====================

    @Test
    void getBatchesForPayroll_returnsBatchDTOs() {
        PayrollBatch batch = buildBatch(UUID.randomUUID(), "BATCH-001");
        when(batchRepository.findByPayrollIdWithPaymentType(payrollId)).thenReturn(List.of(batch));

        List<PayrollBatchDTO> result = payrollBatchService.getBatchesForPayroll(payrollId);

        assertEquals(1, result.size());
        assertEquals("BATCH-001", result.get(0).getBatchNumber());
    }

    @Test
    void getBatchesForPayroll_noBatches_returnsEmptyList() {
        when(batchRepository.findByPayrollIdWithPaymentType(payrollId)).thenReturn(Collections.emptyList());

        List<PayrollBatchDTO> result = payrollBatchService.getBatchesForPayroll(payrollId);

        assertTrue(result.isEmpty());
    }

    // ==================== getBatchById ====================

    @Test
    void getBatchById_found_returnsDTO() {
        UUID batchId = UUID.randomUUID();
        PayrollBatch batch = buildBatch(batchId, "BATCH-001");
        when(batchRepository.findByIdWithDetails(batchId)).thenReturn(Optional.of(batch));

        PayrollBatchDTO result = payrollBatchService.getBatchById(batchId);

        assertNotNull(result);
        assertEquals("BATCH-001", result.getBatchNumber());
    }

    @Test
    void getBatchById_notFound_throwsException() {
        UUID batchId = UUID.randomUUID();
        when(batchRepository.findByIdWithDetails(batchId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> payrollBatchService.getBatchById(batchId));
    }

    // ==================== updateBatchStatus ====================

    @Test
    void updateBatchStatus_notFound_throwsException() {
        UUID batchId = UUID.randomUUID();
        when(batchRepository.findById(batchId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> payrollBatchService.updateBatchStatus(batchId, PayrollStatus.PAID, "admin"));
    }

    @Test
    void updateBatchStatus_updatesStatusAndTriggersPayrollUpdate() {
        UUID batchId = UUID.randomUUID();
        PayrollBatch batch = buildBatch(batchId, "BATCH-001");

        when(batchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(batch));

        payrollBatchService.updateBatchStatus(batchId, PayrollStatus.PAID, "admin");

        assertEquals(PayrollStatus.PAID, batch.getStatus());
        verify(batchRepository).save(batch);
    }

    // ==================== updatePayrollStatusFromBatches ====================

    @Test
    void updatePayrollStatusFromBatches_allPaid_setsPayrollPaid() {
        PayrollBatch b1 = buildBatch(UUID.randomUUID(), "B1");
        b1.setStatus(PayrollStatus.PAID);
        PayrollBatch b2 = buildBatch(UUID.randomUUID(), "B2");
        b2.setStatus(PayrollStatus.PAID);

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(b1, b2));

        payrollBatchService.updatePayrollStatusFromBatches(payrollId, "admin");

        assertEquals(PayrollStatus.PAID, payroll.getStatus());
        verify(payrollRepository).save(payroll);
    }

    @Test
    void updatePayrollStatusFromBatches_anyRejected_setsFinanceRejected() {
        PayrollBatch b1 = buildBatch(UUID.randomUUID(), "B1");
        b1.setStatus(PayrollStatus.FINANCE_APPROVED);
        PayrollBatch b2 = buildBatch(UUID.randomUUID(), "B2");
        b2.setStatus(PayrollStatus.FINANCE_REJECTED);

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(b1, b2));

        payrollBatchService.updatePayrollStatusFromBatches(payrollId, "admin");

        assertEquals(PayrollStatus.FINANCE_REJECTED, payroll.getStatus());
    }

    @Test
    void updatePayrollStatusFromBatches_allApproved_setsFinanceApproved() {
        PayrollBatch b1 = buildBatch(UUID.randomUUID(), "B1");
        b1.setStatus(PayrollStatus.FINANCE_APPROVED);

        payroll.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(b1));

        payrollBatchService.updatePayrollStatusFromBatches(payrollId, "admin");

        assertEquals(PayrollStatus.FINANCE_APPROVED, payroll.getStatus());
    }

    @Test
    void updatePayrollStatusFromBatches_somePaid_setsPartiallyPaid() {
        PayrollBatch b1 = buildBatch(UUID.randomUUID(), "B1");
        b1.setStatus(PayrollStatus.PAID);
        PayrollBatch b2 = buildBatch(UUID.randomUUID(), "B2");
        b2.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);

        payroll.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(List.of(b1, b2));

        payrollBatchService.updatePayrollStatusFromBatches(payrollId, "admin");

        assertEquals(PayrollStatus.PARTIALLY_PAID, payroll.getStatus());
    }

    @Test
    void updatePayrollStatusFromBatches_noBatches_doesNothing() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(batchRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollBatchService.updatePayrollStatusFromBatches(payrollId, "admin");

        verify(payrollRepository, never()).save(any());
    }

    // ==================== toDTO ====================

    @Test
    void toDTO_batchWithNoPaymentType_handlesNullGracefully() {
        PayrollBatch batch = new PayrollBatch();
        batch.setId(UUID.randomUUID());
        batch.setBatchNumber("BATCH-001");
        batch.setPayroll(payroll);
        batch.setTotalAmount(new BigDecimal("1000"));
        batch.setEmployeeCount(1);
        batch.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);

        PayrollBatchDTO dto = payrollBatchService.toDTO(batch);

        assertNotNull(dto);
        assertNull(dto.getPaymentTypeId());
        assertEquals("BATCH-001", dto.getBatchNumber());
    }
}