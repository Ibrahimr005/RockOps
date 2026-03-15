package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.payroll.EmployeeDeductionRepository;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeDeductionServiceTest {

    @Mock
    private EmployeeDeductionRepository employeeDeductionRepository;

    @Mock
    private DeductionTypeRepository deductionTypeRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeDeductionService employeeDeductionService;

    private UUID employeeId;
    private UUID deductionTypeId;
    private UUID deductionId;
    private Employee employee;
    private DeductionType deductionType;
    private EmployeeDeduction deduction;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        deductionTypeId = UUID.randomUUID();
        deductionId = UUID.randomUUID();

        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");

        deductionType = DeductionType.builder()
                .id(deductionTypeId)
                .code("TAX")
                .name("Income Tax")
                .category(DeductionType.DeductionCategory.STATUTORY)
                .createdBy("system")
                .build();

        deduction = EmployeeDeduction.builder()
                .id(deductionId)
                .deductionNumber("TAX-000001")
                .employee(employee)
                .deductionType(deductionType)
                .amount(BigDecimal.valueOf(500))
                .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                .effectiveStartDate(LocalDate.now().minusMonths(1))
                .isActive(true)
                .priority(100)
                .createdBy("admin")
                .build();
    }

    // ---------------------------------------------------------------
    // getDeductionsByEmployee
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getDeductionsByEmployee")
    class GetDeductionsByEmployee {

        @Test
        @DisplayName("returns mapped DTOs for all deductions of an employee")
        void returnsListOfDTOs() {
            when(employeeDeductionRepository.findByEmployeeIdOrderByPriorityAsc(employeeId))
                    .thenReturn(List.of(deduction));

            List<EmployeeDeductionDTO> result = employeeDeductionService.getDeductionsByEmployee(employeeId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getDeductionNumber()).isEqualTo("TAX-000001");
            verify(employeeDeductionRepository).findByEmployeeIdOrderByPriorityAsc(employeeId);
        }

        @Test
        @DisplayName("returns empty list when no deductions exist")
        void returnsEmptyList() {
            when(employeeDeductionRepository.findByEmployeeIdOrderByPriorityAsc(employeeId))
                    .thenReturn(List.of());

            List<EmployeeDeductionDTO> result = employeeDeductionService.getDeductionsByEmployee(employeeId);

            assertThat(result).isEmpty();
        }
    }

    // ---------------------------------------------------------------
    // getActiveDeductionsByEmployee
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getActiveDeductionsByEmployee")
    class GetActiveDeductionsByEmployee {

        @Test
        @DisplayName("delegates to findActiveByEmployeeId and maps to DTOs")
        void returnsActiveDeductions() {
            when(employeeDeductionRepository.findActiveByEmployeeId(employeeId))
                    .thenReturn(List.of(deduction));

            List<EmployeeDeductionDTO> result = employeeDeductionService.getActiveDeductionsByEmployee(employeeId);

            assertThat(result).hasSize(1);
            verify(employeeDeductionRepository).findActiveByEmployeeId(employeeId);
        }
    }

    // ---------------------------------------------------------------
    // getById
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getById")
    class GetById {

        @Test
        @DisplayName("returns DTO when deduction found")
        void returnsDTOWhenFound() {
            when(employeeDeductionRepository.findById(deductionId))
                    .thenReturn(Optional.of(deduction));

            EmployeeDeductionDTO result = employeeDeductionService.getById(deductionId);

            assertThat(result.getId()).isEqualTo(deductionId);
            assertThat(result.getDeductionNumber()).isEqualTo("TAX-000001");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when deduction not found")
        void throwsWhenNotFound() {
            when(employeeDeductionRepository.findById(deductionId))
                    .thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.getById(deductionId));
        }
    }

    // ---------------------------------------------------------------
    // getDeductionsForPayrollPeriod
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getDeductionsForPayrollPeriod")
    class GetDeductionsForPayrollPeriod {

        @Test
        @DisplayName("delegates to findActiveForPayrollPeriod")
        void delegatesCorrectly() {
            LocalDate start = LocalDate.now().withDayOfMonth(1);
            LocalDate end = start.plusMonths(1).minusDays(1);

            when(employeeDeductionRepository.findActiveForPayrollPeriod(employeeId, start, end))
                    .thenReturn(List.of(deduction));

            List<EmployeeDeductionDTO> result =
                    employeeDeductionService.getDeductionsForPayrollPeriod(employeeId, start, end);

            assertThat(result).hasSize(1);
            verify(employeeDeductionRepository).findActiveForPayrollPeriod(employeeId, start, end);
        }
    }

    // ---------------------------------------------------------------
    // create
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("create")
    class Create {

        private EmployeeDeductionDTO createDTO;

        @BeforeEach
        void setUp() {
            createDTO = EmployeeDeductionDTO.builder()
                    .employeeId(employeeId)
                    .deductionTypeId(deductionTypeId)
                    .amount(BigDecimal.valueOf(300))
                    .effectiveStartDate(LocalDate.now())
                    .build();
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when employee not found")
        void throwsWhenEmployeeNotFound() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.create(createDTO, "admin"));
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when deduction type not found")
        void throwsWhenDeductionTypeNotFound() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.create(createDTO, "admin"));
        }

        @Test
        @DisplayName("saves deduction with FIXED_AMOUNT default and MONTHLY frequency when not specified")
        void savesWithDefaults() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(deductionType));
            when(employeeDeductionRepository.getMaxDeductionNumberSequenceByTypeCode("TAX")).thenReturn(null);
            when(employeeDeductionRepository.save(any(EmployeeDeduction.class))).thenReturn(deduction);

            EmployeeDeductionDTO result = employeeDeductionService.create(createDTO, "admin");

            ArgumentCaptor<EmployeeDeduction> captor = ArgumentCaptor.forClass(EmployeeDeduction.class);
            verify(employeeDeductionRepository).save(captor.capture());

            EmployeeDeduction saved = captor.getValue();
            assertThat(saved.getCalculationMethod()).isEqualTo(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT);
            assertThat(saved.getFrequency()).isEqualTo(EmployeeDeduction.DeductionFrequency.MONTHLY);
            assertThat(saved.getPriority()).isEqualTo(100);
            assertThat(saved.getIsActive()).isTrue();
            assertThat(saved.getCreatedBy()).isEqualTo("admin");
            // Deduction number: TAX-000001 (seq 0 + 1)
            assertThat(saved.getDeductionNumber()).isEqualTo("TAX-000001");
        }

        @Test
        @DisplayName("uses provided calculationMethod and frequency instead of defaults")
        void usesProvidedValues() {
            createDTO.setCalculationMethod(EmployeeDeduction.CalculationMethod.PERCENTAGE_OF_GROSS);
            createDTO.setFrequency(EmployeeDeduction.DeductionFrequency.QUARTERLY);
            createDTO.setPriority(50);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(deductionType));
            when(employeeDeductionRepository.getMaxDeductionNumberSequenceByTypeCode("TAX")).thenReturn(5L);
            when(employeeDeductionRepository.save(any(EmployeeDeduction.class))).thenReturn(deduction);

            employeeDeductionService.create(createDTO, "admin");

            ArgumentCaptor<EmployeeDeduction> captor = ArgumentCaptor.forClass(EmployeeDeduction.class);
            verify(employeeDeductionRepository).save(captor.capture());

            EmployeeDeduction saved = captor.getValue();
            assertThat(saved.getCalculationMethod()).isEqualTo(EmployeeDeduction.CalculationMethod.PERCENTAGE_OF_GROSS);
            assertThat(saved.getFrequency()).isEqualTo(EmployeeDeduction.DeductionFrequency.QUARTERLY);
            assertThat(saved.getPriority()).isEqualTo(50);
            assertThat(saved.getDeductionNumber()).isEqualTo("TAX-000006");
        }
    }

    // ---------------------------------------------------------------
    // update
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("throws when deduction not found")
        void throwsWhenNotFound() {
            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.update(deductionId, EmployeeDeductionDTO.builder().build(), "admin"));
        }

        @Test
        @DisplayName("throws when new deductionTypeId not found")
        void throwsWhenNewTypeNotFound() {
            UUID newTypeId = UUID.randomUUID();
            EmployeeDeductionDTO dto = EmployeeDeductionDTO.builder()
                    .deductionTypeId(newTypeId)
                    .amount(BigDecimal.valueOf(100))
                    .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                    .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                    .effectiveStartDate(LocalDate.now())
                    .build();

            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.of(deduction));
            when(deductionTypeRepository.findById(newTypeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.update(deductionId, dto, "admin"));
        }

        @Test
        @DisplayName("successfully updates all fields")
        void successfullyUpdatesFields() {
            UUID newTypeId = UUID.randomUUID();
            DeductionType newType = DeductionType.builder()
                    .id(newTypeId)
                    .code("INS")
                    .name("Insurance")
                    .category(DeductionType.DeductionCategory.BENEFITS)
                    .createdBy("system")
                    .build();

            EmployeeDeductionDTO dto = EmployeeDeductionDTO.builder()
                    .deductionTypeId(newTypeId)
                    .customName("Health Insurance")
                    .description("Monthly health insurance")
                    .amount(BigDecimal.valueOf(250))
                    .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                    .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                    .effectiveStartDate(LocalDate.now())
                    .effectiveEndDate(LocalDate.now().plusYears(1))
                    .priority(80)
                    .build();

            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.of(deduction));
            when(deductionTypeRepository.findById(newTypeId)).thenReturn(Optional.of(newType));
            when(employeeDeductionRepository.save(any(EmployeeDeduction.class))).thenReturn(deduction);

            employeeDeductionService.update(deductionId, dto, "manager");

            verify(employeeDeductionRepository).save(deduction);
            assertThat(deduction.getCustomName()).isEqualTo("Health Insurance");
            assertThat(deduction.getDescription()).isEqualTo("Monthly health insurance");
            assertThat(deduction.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(250));
            assertThat(deduction.getPriority()).isEqualTo(80);
            assertThat(deduction.getUpdatedBy()).isEqualTo("manager");
            assertThat(deduction.getDeductionType()).isEqualTo(newType);
        }

        @Test
        @DisplayName("does not change deductionType when same typeId provided")
        void doesNotChangeTypeWhenSameId() {
            // dto has same deductionTypeId as existing
            EmployeeDeductionDTO dto = EmployeeDeductionDTO.builder()
                    .deductionTypeId(deductionTypeId)
                    .amount(BigDecimal.valueOf(200))
                    .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                    .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                    .effectiveStartDate(LocalDate.now())
                    .build();

            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.of(deduction));
            when(employeeDeductionRepository.save(any(EmployeeDeduction.class))).thenReturn(deduction);

            employeeDeductionService.update(deductionId, dto, "admin");

            // deductionTypeRepository.findById should NOT be called since type didn't change
            verify(deductionTypeRepository, never()).findById(any());
        }
    }

    // ---------------------------------------------------------------
    // deactivate
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("deactivate")
    class Deactivate {

        @Test
        @DisplayName("throws when not found")
        void throwsWhenNotFound() {
            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.deactivate(deductionId, "admin"));
        }

        @Test
        @DisplayName("calls deactivate on entity and saves")
        void callsDeactivateAndSaves() {
            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.of(deduction));
            when(employeeDeductionRepository.save(any())).thenReturn(deduction);

            employeeDeductionService.deactivate(deductionId, "admin");

            assertThat(deduction.getIsActive()).isFalse();
            assertThat(deduction.getUpdatedBy()).isEqualTo("admin");
            verify(employeeDeductionRepository).save(deduction);
        }
    }

    // ---------------------------------------------------------------
    // reactivate
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("reactivate")
    class Reactivate {

        @Test
        @DisplayName("throws when not found")
        void throwsWhenNotFound() {
            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.reactivate(deductionId, "admin"));
        }

        @Test
        @DisplayName("sets isActive=true, clears effectiveEndDate, sets updatedBy")
        void reactivatesCorrectly() {
            deduction.setIsActive(false);
            deduction.setEffectiveEndDate(LocalDate.now().minusDays(5));

            when(employeeDeductionRepository.findById(deductionId)).thenReturn(Optional.of(deduction));
            when(employeeDeductionRepository.save(any())).thenReturn(deduction);

            employeeDeductionService.reactivate(deductionId, "manager");

            assertThat(deduction.getIsActive()).isTrue();
            assertThat(deduction.getEffectiveEndDate()).isNull();
            assertThat(deduction.getUpdatedBy()).isEqualTo("manager");
            verify(employeeDeductionRepository).save(deduction);
        }
    }

    // ---------------------------------------------------------------
    // delete
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("throws when not found")
        void throwsWhenNotFound() {
            when(employeeDeductionRepository.existsById(deductionId)).thenReturn(false);

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.delete(deductionId));
        }

        @Test
        @DisplayName("calls deleteById when found")
        void callsDeleteById() {
            when(employeeDeductionRepository.existsById(deductionId)).thenReturn(true);

            employeeDeductionService.delete(deductionId);

            verify(employeeDeductionRepository).deleteById(deductionId);
        }
    }

    // ---------------------------------------------------------------
    // recordDeductionsApplied
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("recordDeductionsApplied")
    class RecordDeductionsApplied {

        @Test
        @DisplayName("records deduction for each found ID and saves")
        void recordsAndSaves() {
            LocalDate payrollEndDate = LocalDate.now();
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();

            EmployeeDeduction d1 = EmployeeDeduction.builder()
                    .id(id1)
                    .deductionNumber("TAX-000001")
                    .amount(BigDecimal.valueOf(100))
                    .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                    .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                    .effectiveStartDate(LocalDate.now().minusMonths(1))
                    .isActive(true)
                    .totalDeducted(BigDecimal.ZERO)
                    .deductionCount(0)
                    .priority(100)
                    .createdBy("admin")
                    .build();

            when(employeeDeductionRepository.findById(id1)).thenReturn(Optional.of(d1));
            when(employeeDeductionRepository.findById(id2)).thenReturn(Optional.empty());
            when(employeeDeductionRepository.save(d1)).thenReturn(d1);

            employeeDeductionService.recordDeductionsApplied(List.of(id1, id2), payrollEndDate);

            verify(employeeDeductionRepository).save(d1);
            assertThat(d1.getLastDeductionDate()).isEqualTo(payrollEndDate);
            assertThat(d1.getDeductionCount()).isEqualTo(1);
        }
    }

    // ---------------------------------------------------------------
    // createLoanDeduction
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("createLoanDeduction")
    class CreateLoanDeduction {

        @Test
        @DisplayName("throws ResourceNotFoundException when LOAN deduction type not found")
        void throwsWhenLoanTypeNotFound() {
            when(deductionTypeRepository.findByCode("LOAN")).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> employeeDeductionService.createLoanDeduction(
                            employeeId, UUID.randomUUID(), "LOAN-2025-000001",
                            BigDecimal.valueOf(500), LocalDate.now(),
                            LocalDate.now().plusMonths(12), "admin"));
        }

        @Test
        @DisplayName("creates loan deduction with correct customName and referenceType LOAN")
        void createsLoanDeductionSuccessfully() {
            UUID loanId = UUID.randomUUID();
            String loanNumber = "LOAN-2025-000001";
            BigDecimal installment = BigDecimal.valueOf(500);
            LocalDate start = LocalDate.now();
            LocalDate end = start.plusMonths(12);

            DeductionType loanType = DeductionType.builder()
                    .id(UUID.randomUUID())
                    .code("LOAN")
                    .name("Loan Repayment")
                    .category(DeductionType.DeductionCategory.LOANS)
                    .createdBy("system")
                    .build();

            when(deductionTypeRepository.findByCode("LOAN")).thenReturn(Optional.of(loanType));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(deductionTypeRepository.findById(loanType.getId())).thenReturn(Optional.of(loanType));
            when(employeeDeductionRepository.getMaxDeductionNumberSequenceByTypeCode("LOAN")).thenReturn(null);
            when(employeeDeductionRepository.save(any(EmployeeDeduction.class))).thenReturn(deduction);

            employeeDeductionService.createLoanDeduction(
                    employeeId, loanId, loanNumber, installment, start, end, "admin");

            ArgumentCaptor<EmployeeDeduction> captor = ArgumentCaptor.forClass(EmployeeDeduction.class);
            verify(employeeDeductionRepository).save(captor.capture());

            EmployeeDeduction saved = captor.getValue();
            assertThat(saved.getCustomName()).isEqualTo("Loan: " + loanNumber);
            assertThat(saved.getReferenceType()).isEqualTo("LOAN");
            assertThat(saved.getReferenceId()).isEqualTo(loanId);
            assertThat(saved.getAmount()).isEqualByComparingTo(installment);
            assertThat(saved.getPriority()).isEqualTo(50);
        }
    }

    // ---------------------------------------------------------------
    // deactivateLoanDeduction
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("deactivateLoanDeduction")
    class DeactivateLoanDeduction {

        @Test
        @DisplayName("deactivates and saves when active loan deduction found")
        void deactivatesWhenFound() {
            UUID loanId = UUID.randomUUID();
            when(employeeDeductionRepository.findActiveByReference(loanId, "LOAN"))
                    .thenReturn(Optional.of(deduction));
            when(employeeDeductionRepository.save(any())).thenReturn(deduction);

            employeeDeductionService.deactivateLoanDeduction(loanId, "SYSTEM");

            assertThat(deduction.getIsActive()).isFalse();
            verify(employeeDeductionRepository).save(deduction);
        }

        @Test
        @DisplayName("does nothing when no active loan deduction found")
        void doesNothingWhenNotFound() {
            UUID loanId = UUID.randomUUID();
            when(employeeDeductionRepository.findActiveByReference(loanId, "LOAN"))
                    .thenReturn(Optional.empty());

            employeeDeductionService.deactivateLoanDeduction(loanId, "SYSTEM");

            verify(employeeDeductionRepository, never()).save(any());
        }
    }
}