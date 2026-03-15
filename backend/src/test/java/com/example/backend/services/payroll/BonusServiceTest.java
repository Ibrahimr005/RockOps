package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.BonusResponseDTO;
import com.example.backend.dto.payroll.BulkCreateBonusDTO;
import com.example.backend.dto.payroll.CreateBonusDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.payroll.Bonus;
import com.example.backend.models.payroll.BonusType;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.BonusTypeRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BonusServiceTest {

    @Mock
    private BonusRepository bonusRepository;

    @Mock
    private BonusTypeRepository bonusTypeRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private BonusService bonusService;

    private UUID employeeId;
    private UUID bonusTypeId;
    private UUID siteId;
    private UUID bonusId;
    private Employee employee;
    private BonusType bonusType;
    private Site site;
    private Bonus bonus;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        bonusTypeId = UUID.randomUUID();
        siteId = UUID.randomUUID();
        bonusId = UUID.randomUUID();

        site = new Site();
        site.setId(siteId);

        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("Jane");
        employee.setLastName("Smith");
        employee.setSite(site);

        bonusType = BonusType.builder()
                .id(bonusTypeId)
                .name("Performance Bonus")
                .code("PERF")
                .build();

        bonus = Bonus.builder()
                .id(bonusId)
                .bonusNumber("BONUS-001")
                .employee(employee)
                .bonusType(bonusType)
                .amount(BigDecimal.valueOf(1000))
                .effectiveMonth(3)
                .effectiveYear(2026)
                .status(Bonus.BonusStatus.PENDING_HR_APPROVAL)
                .reason("Excellent performance")
                .createdBy("hr_manager")
                .site(site)
                .build();
    }

    // ---------------------------------------------------------------
    // createBonus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("createBonus")
    class CreateBonus {

        private CreateBonusDTO createDTO;

        @BeforeEach
        void setUp() {
            createDTO = new CreateBonusDTO();
            createDTO.setEmployeeId(employeeId);
            createDTO.setBonusTypeId(bonusTypeId);
            createDTO.setAmount(BigDecimal.valueOf(1000));
            createDTO.setEffectiveMonth(3);
            createDTO.setEffectiveYear(2026);
            createDTO.setReason("Excellent performance");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when employee not found")
        void throwsWhenEmployeeNotFound() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.createBonus(createDTO, "hr_manager"));
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when bonus type not found")
        void throwsWhenBonusTypeNotFound() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.createBonus(createDTO, "hr_manager"));
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when employee has no site")
        void throwsWhenEmployeeHasNoSite() {
            employee.setSite(null);
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(bonusType));

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.createBonus(createDTO, "hr_manager"));
        }

        @Test
        @DisplayName("saves bonus with PENDING_HR_APPROVAL status on success")
        void savesBonusWithPendingStatus() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(bonusType));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.BONUS)).thenReturn("BONUS-001");
            when(bonusRepository.save(any(Bonus.class))).thenReturn(bonus);

            BonusResponseDTO result = bonusService.createBonus(createDTO, "hr_manager");

            ArgumentCaptor<Bonus> captor = ArgumentCaptor.forClass(Bonus.class);
            verify(bonusRepository).save(captor.capture());

            Bonus saved = captor.getValue();
            assertThat(saved.getStatus()).isEqualTo(Bonus.BonusStatus.PENDING_HR_APPROVAL);
            assertThat(saved.getBonusNumber()).isEqualTo("BONUS-001");
            assertThat(saved.getEmployee()).isEqualTo(employee);
            assertThat(saved.getBonusType()).isEqualTo(bonusType);
            assertThat(saved.getSite()).isEqualTo(site);
            assertThat(saved.getCreatedBy()).isEqualTo("hr_manager");
        }
    }

    // ---------------------------------------------------------------
    // createBulkBonus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("createBulkBonus")
    class CreateBulkBonus {

        private BulkCreateBonusDTO bulkDTO;
        private UUID secondEmployeeId;

        @BeforeEach
        void setUp() {
            secondEmployeeId = UUID.randomUUID();
            bulkDTO = new BulkCreateBonusDTO();
            bulkDTO.setBonusTypeId(bonusTypeId);
            bulkDTO.setAmount(BigDecimal.valueOf(500));
            bulkDTO.setEffectiveMonth(3);
            bulkDTO.setEffectiveYear(2026);
            bulkDTO.setReason("Year-end bonus");
            bulkDTO.setEmployeeIds(List.of(employeeId, secondEmployeeId));
        }

        @Test
        @DisplayName("throws when bonus type not found")
        void throwsWhenBonusTypeNotFound() {
            when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.createBulkBonus(bulkDTO, "admin"));
        }

        @Test
        @DisplayName("throws when one employee not found")
        void throwsWhenOneEmployeeNotFound() {
            when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(bonusType));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(secondEmployeeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.createBulkBonus(bulkDTO, "admin"));
        }

        @Test
        @DisplayName("creates one bonus per employeeId and returns list")
        void createsOneBonusPerEmployee() {
            Employee secondEmployee = new Employee();
            secondEmployee.setId(secondEmployeeId);
            secondEmployee.setFirstName("Bob");
            secondEmployee.setLastName("Jones");
            secondEmployee.setSite(site);

            Bonus bonus2 = Bonus.builder()
                    .id(UUID.randomUUID())
                    .bonusNumber("BONUS-002")
                    .employee(secondEmployee)
                    .bonusType(bonusType)
                    .amount(BigDecimal.valueOf(500))
                    .effectiveMonth(3)
                    .effectiveYear(2026)
                    .status(Bonus.BonusStatus.PENDING_HR_APPROVAL)
                    .createdBy("admin")
                    .site(site)
                    .build();

            when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(bonusType));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(secondEmployeeId)).thenReturn(Optional.of(secondEmployee));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.BONUS))
                    .thenReturn("BONUS-001").thenReturn("BONUS-002");
            when(bonusRepository.saveAll(anyList())).thenReturn(List.of(bonus, bonus2));

            List<BonusResponseDTO> result = bonusService.createBulkBonus(bulkDTO, "admin");

            assertThat(result).hasSize(2);

            ArgumentCaptor<List<Bonus>> captor = ArgumentCaptor.forClass(List.class);
            verify(bonusRepository).saveAll(captor.capture());
            assertThat(captor.getValue()).hasSize(2);
        }
    }

    // ---------------------------------------------------------------
    // getAllBonuses
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getAllBonuses")
    class GetAllBonuses {

        @Test
        @DisplayName("delegates to bonusRepository.findBySiteId")
        void delegatesToFindBySiteId() {
            when(bonusRepository.findBySiteId(siteId)).thenReturn(List.of(bonus));

            List<BonusResponseDTO> result = bonusService.getAllBonuses(siteId);

            assertThat(result).hasSize(1);
            verify(bonusRepository).findBySiteId(siteId);
        }
    }

    // ---------------------------------------------------------------
    // getBonusById
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getBonusById")
    class GetBonusById {

        @Test
        @DisplayName("returns DTO when found")
        void returnsDTOWhenFound() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.of(bonus));

            BonusResponseDTO result = bonusService.getBonusById(bonusId);

            assertThat(result.getId()).isEqualTo(bonusId);
        }

        @Test
        @DisplayName("throws when not found")
        void throwsWhenNotFound() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.getBonusById(bonusId));
        }
    }

    // ---------------------------------------------------------------
    // getBonusesByEmployee
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getBonusesByEmployee")
    class GetBonusesByEmployee {

        @Test
        @DisplayName("delegates to findByEmployeeId")
        void delegatesToFindByEmployeeId() {
            when(bonusRepository.findByEmployeeId(employeeId)).thenReturn(List.of(bonus));

            List<BonusResponseDTO> result = bonusService.getBonusesByEmployee(employeeId);

            assertThat(result).hasSize(1);
            verify(bonusRepository).findByEmployeeId(employeeId);
        }
    }

    // ---------------------------------------------------------------
    // getBonusesForPayroll
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getBonusesForPayroll")
    class GetBonusesForPayroll {

        @Test
        @DisplayName("delegates to findByMonthYearAndSiteAndStatusIn with correct statuses")
        void delegatesWithCorrectStatuses() {
            when(bonusRepository.findByMonthYearAndSiteAndStatusIn(eq(3), eq(2026), eq(siteId), anyList()))
                    .thenReturn(List.of(bonus));

            List<BonusResponseDTO> result = bonusService.getBonusesForPayroll(3, 2026, siteId);

            assertThat(result).hasSize(1);

            ArgumentCaptor<List<Bonus.BonusStatus>> statusCaptor = ArgumentCaptor.forClass(List.class);
            verify(bonusRepository).findByMonthYearAndSiteAndStatusIn(eq(3), eq(2026), eq(siteId), statusCaptor.capture());
            List<Bonus.BonusStatus> statuses = statusCaptor.getValue();
            assertThat(statuses).containsExactlyInAnyOrder(
                    Bonus.BonusStatus.HR_APPROVED,
                    Bonus.BonusStatus.PENDING_PAYMENT,
                    Bonus.BonusStatus.PAID);
        }
    }

    // ---------------------------------------------------------------
    // hrApproveBonus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("hrApproveBonus")
    class HrApproveBonus {

        @Test
        @DisplayName("throws when bonus not found")
        void throwsWhenNotFound() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.hrApproveBonus(bonusId, "hr_manager"));
        }

        @Test
        @DisplayName("approves bonus and creates payment request")
        void approvesBonusAndCreatesPaymentRequest() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.of(bonus));
            when(bonusRepository.save(any(Bonus.class))).thenReturn(bonus);

            PaymentRequest savedPaymentRequest = PaymentRequest.builder()
                    .id(UUID.randomUUID())
                    .requestNumber("PR-2026-000001")
                    .build();

            when(paymentRequestRepository.getMaxRequestNumberSequence(anyString())).thenReturn(null);
            when(paymentRequestRepository.save(any(PaymentRequest.class))).thenReturn(savedPaymentRequest);

            BonusResponseDTO result = bonusService.hrApproveBonus(bonusId, "hr_manager");

            // Verify bonus was approved (status changed to HR_APPROVED then PENDING_PAYMENT)
            assertThat(bonus.getStatus()).isEqualTo(Bonus.BonusStatus.PENDING_PAYMENT);
            assertThat(bonus.getHrApprovedBy()).isEqualTo("hr_manager");

            // Verify payment request was created
            verify(paymentRequestRepository).save(any(PaymentRequest.class));
            // Verify bonus was saved at least once
            verify(bonusRepository, atLeastOnce()).save(bonus);
        }
    }

    // ---------------------------------------------------------------
    // hrRejectBonus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("hrRejectBonus")
    class HrRejectBonus {

        @Test
        @DisplayName("throws when bonus not found")
        void throwsWhenNotFound() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.hrRejectBonus(bonusId, "hr_manager", "Policy violation"));
        }

        @Test
        @DisplayName("rejects bonus and saves")
        void rejectsBonusAndSaves() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.of(bonus));
            when(bonusRepository.save(any(Bonus.class))).thenReturn(bonus);

            BonusResponseDTO result = bonusService.hrRejectBonus(bonusId, "hr_manager", "Policy violation");

            assertThat(bonus.getStatus()).isEqualTo(Bonus.BonusStatus.HR_REJECTED);
            assertThat(bonus.getHrRejectedBy()).isEqualTo("hr_manager");
            assertThat(bonus.getHrRejectionReason()).isEqualTo("Policy violation");
            verify(bonusRepository).save(bonus);
        }
    }

    // ---------------------------------------------------------------
    // cancelBonus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("cancelBonus")
    class CancelBonus {

        @Test
        @DisplayName("throws when bonus not found")
        void throwsWhenNotFound() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> bonusService.cancelBonus(bonusId));
        }

        @Test
        @DisplayName("cancels bonus and saves")
        void cancelsBonusAndSaves() {
            when(bonusRepository.findById(bonusId)).thenReturn(Optional.of(bonus));
            when(bonusRepository.save(any(Bonus.class))).thenReturn(bonus);

            bonusService.cancelBonus(bonusId);

            assertThat(bonus.getStatus()).isEqualTo(Bonus.BonusStatus.CANCELLED);
            verify(bonusRepository).save(bonus);
        }
    }

    // ---------------------------------------------------------------
    // getStatistics
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getStatistics")
    class GetStatistics {

        @Test
        @DisplayName("returns map with all counts and amounts for a site")
        void returnsStatsMap() {
            when(bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.PENDING_HR_APPROVAL, siteId)).thenReturn(5L);
            when(bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.HR_APPROVED, siteId)).thenReturn(3L);
            when(bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.PENDING_PAYMENT, siteId)).thenReturn(2L);
            when(bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.PAID, siteId)).thenReturn(10L);
            when(bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.HR_REJECTED, siteId)).thenReturn(1L);
            when(bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.CANCELLED, siteId)).thenReturn(0L);

            when(bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.PENDING_HR_APPROVAL, siteId))
                    .thenReturn(BigDecimal.valueOf(5000));
            when(bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.HR_APPROVED, siteId))
                    .thenReturn(BigDecimal.valueOf(3000));
            when(bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.PENDING_PAYMENT, siteId))
                    .thenReturn(BigDecimal.valueOf(2000));
            when(bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.PAID, siteId))
                    .thenReturn(BigDecimal.valueOf(10000));

            Map<String, Object> stats = bonusService.getStatistics(siteId);

            assertThat(stats).containsKey("pendingCount");
            assertThat(stats).containsKey("approvedCount");
            assertThat(stats).containsKey("pendingPaymentCount");
            assertThat(stats).containsKey("paidCount");
            assertThat(stats).containsKey("rejectedCount");
            assertThat(stats).containsKey("cancelledCount");
            assertThat(stats).containsKey("totalCount");
            assertThat(stats).containsKey("pendingAmount");
            assertThat(stats).containsKey("approvedAmount");
            assertThat(stats).containsKey("pendingPaymentAmount");
            assertThat(stats).containsKey("paidAmount");

            assertThat(stats.get("pendingCount")).isEqualTo(5L);
            assertThat(stats.get("paidCount")).isEqualTo(10L);
            assertThat(stats.get("totalCount")).isEqualTo(21L);
            assertThat(stats.get("pendingAmount")).isEqualTo(BigDecimal.valueOf(5000));
        }
    }
}