package com.example.backend.services.hr;

import com.example.backend.dto.hr.salary.*;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.hr.*;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.hr.SalaryHistoryRepository;
import com.example.backend.repositories.hr.SalaryIncreaseRequestRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
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
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalaryIncreaseRequestServiceTest {

    @Mock
    private SalaryIncreaseRequestRepository requestRepository;

    @Mock
    private SalaryHistoryRepository salaryHistoryRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SalaryIncreaseRequestService service;

    private Employee activeEmployee;
    private JobPosition jobPosition;
    private UUID employeeId;
    private UUID jobPositionId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        jobPositionId = UUID.randomUUID();

        jobPosition = mock(JobPosition.class);
        when(jobPosition.getId()).thenReturn(jobPositionId);
        when(jobPosition.getPositionName()).thenReturn("Senior Engineer");
        when(jobPosition.getContractType()).thenReturn(JobPosition.ContractType.MONTHLY);

        activeEmployee = mock(Employee.class);
        when(activeEmployee.getId()).thenReturn(employeeId);
        when(activeEmployee.getStatus()).thenReturn("ACTIVE");
        when(activeEmployee.getMonthlySalary()).thenReturn(new BigDecimal("5000"));
        when(activeEmployee.getEmployeeNumber()).thenReturn("EMP-2025-00001");
        when(activeEmployee.getFullName()).thenReturn("John Doe");
    }

    // ==================== createRequest - EMPLOYEE_LEVEL ====================

    @Nested
    @DisplayName("createRequest - EMPLOYEE_LEVEL")
    class CreateRequestEmployeeLevel {

        private SalaryIncreaseCreateDTO buildEmployeeLevelDTO() {
            SalaryIncreaseCreateDTO dto = mock(SalaryIncreaseCreateDTO.class);
            when(dto.getRequestType()).thenReturn("EMPLOYEE_LEVEL");
            when(dto.getEmployeeId()).thenReturn(employeeId);
            when(dto.getRequestedSalary()).thenReturn(new BigDecimal("6000"));
            when(dto.getEffectiveDate()).thenReturn(LocalDate.now().plusMonths(1));
            when(dto.getReason()).thenReturn("Annual raise");
            return dto;
        }

        @Test
        @DisplayName("Should create employee-level request successfully")
        void createRequest_employeeLevel_success() {
            SalaryIncreaseCreateDTO dto = buildEmployeeLevelDTO();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(requestRepository.existsPendingForEmployee(employeeId)).thenReturn(false);
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.SALARY_INCREASE_REQUEST))
                    .thenReturn("SIR-000001");

            SalaryIncreaseRequest savedRequest = mock(SalaryIncreaseRequest.class);
            when(savedRequest.getRequestNumber()).thenReturn("SIR-000001");
            when(savedRequest.getEmployee()).thenReturn(activeEmployee);
            when(requestRepository.save(any(SalaryIncreaseRequest.class))).thenReturn(savedRequest);

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO expectedDTO = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(savedRequest)).thenReturn(expectedDTO);

                SalaryIncreaseRequestDTO result = service.createRequest(dto, "admin");

                assertThat(result).isEqualTo(expectedDTO);
                verify(requestRepository).save(any(SalaryIncreaseRequest.class));
                verify(entityIdGeneratorService).generateNextId(EntityTypeConfig.SALARY_INCREASE_REQUEST);
            }
        }

        @Test
        @DisplayName("Should throw when employee not found")
        void createRequest_employeeLevel_employeeNotFound() {
            SalaryIncreaseCreateDTO dto = buildEmployeeLevelDTO();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Employee not found");
        }

        @Test
        @DisplayName("Should throw when employee is inactive")
        void createRequest_employeeLevel_inactiveEmployee() {
            SalaryIncreaseCreateDTO dto = buildEmployeeLevelDTO();

            Employee inactiveEmployee = mock(Employee.class);
            when(inactiveEmployee.getStatus()).thenReturn("TERMINATED");
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(inactiveEmployee));

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("active employees");
        }

        @Test
        @DisplayName("Should throw when pending request exists for employee")
        void createRequest_employeeLevel_pendingExists() {
            SalaryIncreaseCreateDTO dto = buildEmployeeLevelDTO();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(requestRepository.existsPendingForEmployee(employeeId)).thenReturn(true);

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already pending");
        }
    }

    // ==================== createRequest - POSITION_LEVEL ====================

    @Nested
    @DisplayName("createRequest - POSITION_LEVEL")
    class CreateRequestPositionLevel {

        private SalaryIncreaseCreateDTO buildPositionLevelDTO() {
            SalaryIncreaseCreateDTO dto = mock(SalaryIncreaseCreateDTO.class);
            when(dto.getRequestType()).thenReturn("POSITION_LEVEL");
            when(dto.getJobPositionId()).thenReturn(jobPositionId);
            when(dto.getRequestedSalary()).thenReturn(new BigDecimal("7000"));
            when(dto.getEffectiveDate()).thenReturn(LocalDate.now().plusMonths(1));
            when(dto.getReason()).thenReturn("Position salary adjustment");
            return dto;
        }

        @Test
        @DisplayName("Should create position-level request successfully")
        void createRequest_positionLevel_success() {
            SalaryIncreaseCreateDTO dto = buildPositionLevelDTO();

            when(jobPositionRepository.findById(jobPositionId)).thenReturn(Optional.of(jobPosition));
            when(jobPosition.calculateMonthlySalary()).thenReturn(5000.0);
            when(employeeRepository.findByJobPositionId(jobPositionId)).thenReturn(List.of(activeEmployee));
            when(requestRepository.existsPendingForPosition(jobPositionId)).thenReturn(false);
            when(activeEmployee.getSite()).thenReturn(null);
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.SALARY_INCREASE_REQUEST))
                    .thenReturn("SIR-000002");

            SalaryIncreaseRequest savedRequest = mock(SalaryIncreaseRequest.class);
            when(savedRequest.getRequestNumber()).thenReturn("SIR-000002");
            when(savedRequest.getEmployee()).thenReturn(activeEmployee);
            when(requestRepository.save(any(SalaryIncreaseRequest.class))).thenReturn(savedRequest);

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO expectedDTO = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(savedRequest)).thenReturn(expectedDTO);

                SalaryIncreaseRequestDTO result = service.createRequest(dto, "admin");

                assertThat(result).isEqualTo(expectedDTO);
                verify(requestRepository).save(any(SalaryIncreaseRequest.class));
            }
        }

        @Test
        @DisplayName("Should throw when position not found")
        void createRequest_positionLevel_positionNotFound() {
            SalaryIncreaseCreateDTO dto = buildPositionLevelDTO();

            when(jobPositionRepository.findById(jobPositionId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Job position not found");
        }

        @Test
        @DisplayName("Should throw when no active employees in position")
        void createRequest_positionLevel_noActiveEmployees() {
            SalaryIncreaseCreateDTO dto = buildPositionLevelDTO();

            Employee inactiveEmp = mock(Employee.class);
            when(inactiveEmp.getStatus()).thenReturn("TERMINATED");

            when(jobPositionRepository.findById(jobPositionId)).thenReturn(Optional.of(jobPosition));
            when(jobPosition.calculateMonthlySalary()).thenReturn(5000.0);
            when(employeeRepository.findByJobPositionId(jobPositionId)).thenReturn(List.of(inactiveEmp));

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("No active employees found");
        }

        @Test
        @DisplayName("Should throw when pending request exists for position")
        void createRequest_positionLevel_pendingExists() {
            SalaryIncreaseCreateDTO dto = buildPositionLevelDTO();

            when(jobPositionRepository.findById(jobPositionId)).thenReturn(Optional.of(jobPosition));
            when(jobPosition.calculateMonthlySalary()).thenReturn(5000.0);
            when(employeeRepository.findByJobPositionId(jobPositionId)).thenReturn(List.of(activeEmployee));
            when(requestRepository.existsPendingForPosition(jobPositionId)).thenReturn(true);

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already pending");
        }

        @Test
        @DisplayName("Should throw when no job position ID provided")
        void createRequest_positionLevel_noJobPositionId() {
            SalaryIncreaseCreateDTO dto = mock(SalaryIncreaseCreateDTO.class);
            when(dto.getRequestType()).thenReturn("POSITION_LEVEL");
            when(dto.getJobPositionId()).thenReturn(null);

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Job position ID is required");
        }
    }

    // ==================== hrDecision ====================

    @Nested
    @DisplayName("hrDecision")
    class HrDecision {

        @Test
        @DisplayName("Should approve and route to finance")
        void hrDecision_approve() {
            UUID requestId = UUID.randomUUID();
            SalaryIncreaseRequest request = mock(SalaryIncreaseRequest.class);
            when(request.getRequestNumber()).thenReturn("SIR-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);

            SalaryIncreaseReviewDTO reviewDTO = mock(SalaryIncreaseReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(true);
            when(reviewDTO.getComments()).thenReturn("Looks good");

            when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(requestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO expectedDTO = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                SalaryIncreaseRequestDTO result = service.hrDecision(requestId, reviewDTO, "hrManager");

                assertThat(result).isEqualTo(expectedDTO);
                verify(request).hrApprove("hrManager", "Looks good");
                verify(requestRepository).save(request);
            }
        }

        @Test
        @DisplayName("Should reject request")
        void hrDecision_reject() {
            UUID requestId = UUID.randomUUID();
            SalaryIncreaseRequest request = mock(SalaryIncreaseRequest.class);

            SalaryIncreaseReviewDTO reviewDTO = mock(SalaryIncreaseReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(false);
            when(reviewDTO.getRejectionReason()).thenReturn("Budget constraints");

            when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(requestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO expectedDTO = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                service.hrDecision(requestId, reviewDTO, "hrManager");

                verify(request).hrReject("hrManager", "Budget constraints");
            }
        }

        @Test
        @DisplayName("Should throw when request not found")
        void hrDecision_notFound() {
            UUID requestId = UUID.randomUUID();
            SalaryIncreaseReviewDTO reviewDTO = mock(SalaryIncreaseReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(true);

            when(requestRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.hrDecision(requestId, reviewDTO, "hrManager"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ==================== financeDecision ====================

    @Nested
    @DisplayName("financeDecision")
    class FinanceDecision {

        @Test
        @DisplayName("Should approve and apply employee-level increase")
        void financeDecision_approve_employeeLevel() {
            UUID requestId = UUID.randomUUID();
            SalaryIncreaseRequest request = mock(SalaryIncreaseRequest.class);
            when(request.getRequestNumber()).thenReturn("SIR-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);
            when(request.getRequestType()).thenReturn(SalaryIncreaseRequest.RequestType.EMPLOYEE_LEVEL);
            when(request.getRequestedSalary()).thenReturn(new BigDecimal("6000"));
            when(request.getEffectiveDate()).thenReturn(LocalDate.now());
            when(request.getReason()).thenReturn("Annual raise");
            when(request.getId()).thenReturn(requestId);

            SalaryIncreaseReviewDTO reviewDTO = mock(SalaryIncreaseReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(true);
            when(reviewDTO.getComments()).thenReturn("Approved by finance");

            when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(requestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO expectedDTO = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                SalaryIncreaseRequestDTO result = service.financeDecision(requestId, reviewDTO, "financeManager");

                assertThat(result).isEqualTo(expectedDTO);
                verify(request).financeApprove("financeManager", "Approved by finance");
                verify(activeEmployee).setBaseSalaryOverride(new BigDecimal("6000"));
                verify(employeeRepository).save(activeEmployee);
                verify(salaryHistoryRepository).save(any(SalaryHistory.class));
                verify(request).markApplied("financeManager");
            }
        }

        @Test
        @DisplayName("Should reject request")
        void financeDecision_reject() {
            UUID requestId = UUID.randomUUID();
            SalaryIncreaseRequest request = mock(SalaryIncreaseRequest.class);
            when(request.getRequestNumber()).thenReturn("SIR-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);

            SalaryIncreaseReviewDTO reviewDTO = mock(SalaryIncreaseReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(false);
            when(reviewDTO.getRejectionReason()).thenReturn("Insufficient funds");

            when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(requestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO expectedDTO = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                service.financeDecision(requestId, reviewDTO, "financeManager");

                verify(request).financeReject("financeManager", "Insufficient funds");
                verify(employeeRepository, never()).save(any());
                verify(salaryHistoryRepository, never()).save(any());
            }
        }
    }

    // ==================== Query Methods ====================

    @Nested
    @DisplayName("Query Methods")
    class QueryMethods {

        @Test
        @DisplayName("getAll should return list of DTOs")
        void getAll_returnsList() {
            SalaryIncreaseRequest req1 = mock(SalaryIncreaseRequest.class);
            SalaryIncreaseRequest req2 = mock(SalaryIncreaseRequest.class);
            when(requestRepository.findAllOrderByCreatedAtDesc()).thenReturn(List.of(req1, req2));

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO dto1 = mock(SalaryIncreaseRequestDTO.class);
                SalaryIncreaseRequestDTO dto2 = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(req1)).thenReturn(dto1);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(req2)).thenReturn(dto2);

                List<SalaryIncreaseRequestDTO> result = service.getAll();

                assertThat(result).hasSize(2).containsExactly(dto1, dto2);
            }
        }

        @Test
        @DisplayName("getByStatus should return filtered list")
        void getByStatus_returnsFiltered() {
            SalaryIncreaseRequest req = mock(SalaryIncreaseRequest.class);
            when(requestRepository.findByStatus(SalaryIncreaseRequest.Status.PENDING_HR))
                    .thenReturn(List.of(req));

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO dto = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(req)).thenReturn(dto);

                List<SalaryIncreaseRequestDTO> result = service.getByStatus(SalaryIncreaseRequest.Status.PENDING_HR);

                assertThat(result).hasSize(1);
            }
        }

        @Test
        @DisplayName("getById should return DTO when found")
        void getById_found() {
            UUID requestId = UUID.randomUUID();
            SalaryIncreaseRequest req = mock(SalaryIncreaseRequest.class);
            when(requestRepository.findById(requestId)).thenReturn(Optional.of(req));

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO dto = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(req)).thenReturn(dto);

                SalaryIncreaseRequestDTO result = service.getById(requestId);

                assertThat(result).isEqualTo(dto);
            }
        }

        @Test
        @DisplayName("getById should throw ResourceNotFoundException when not found")
        void getById_notFound() {
            UUID requestId = UUID.randomUUID();
            when(requestRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(requestId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("getByEmployee should return list of DTOs")
        void getByEmployee_returnsList() {
            SalaryIncreaseRequest req = mock(SalaryIncreaseRequest.class);
            when(requestRepository.findByEmployeeId(employeeId)).thenReturn(List.of(req));

            try (var mockedStatic = mockStatic(SalaryIncreaseRequestDTO.class)) {
                SalaryIncreaseRequestDTO dto = mock(SalaryIncreaseRequestDTO.class);
                mockedStatic.when(() -> SalaryIncreaseRequestDTO.fromEntity(req)).thenReturn(dto);

                List<SalaryIncreaseRequestDTO> result = service.getByEmployee(employeeId);

                assertThat(result).hasSize(1);
            }
        }

        @Test
        @DisplayName("getEmployeeSalaryHistory should return list of history DTOs")
        void getEmployeeSalaryHistory_returnsList() {
            SalaryHistory history = mock(SalaryHistory.class);
            when(salaryHistoryRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId))
                    .thenReturn(List.of(history));

            try (var mockedStatic = mockStatic(SalaryHistoryDTO.class)) {
                SalaryHistoryDTO dto = mock(SalaryHistoryDTO.class);
                mockedStatic.when(() -> SalaryHistoryDTO.fromEntity(history)).thenReturn(dto);

                List<SalaryHistoryDTO> result = service.getEmployeeSalaryHistory(employeeId);

                assertThat(result).hasSize(1);
            }
        }

        @Test
        @DisplayName("getStatistics should return map with all status counts")
        void getStatistics_returnsMap() {
            when(requestRepository.count()).thenReturn(10L);
            when(requestRepository.countByStatus(SalaryIncreaseRequest.Status.PENDING_HR)).thenReturn(2L);
            when(requestRepository.countByStatus(SalaryIncreaseRequest.Status.PENDING_FINANCE)).thenReturn(3L);
            when(requestRepository.countByStatus(SalaryIncreaseRequest.Status.APPROVED)).thenReturn(1L);
            when(requestRepository.countByStatus(SalaryIncreaseRequest.Status.APPLIED)).thenReturn(3L);
            when(requestRepository.countByStatus(SalaryIncreaseRequest.Status.REJECTED)).thenReturn(1L);

            Map<String, Object> stats = service.getStatistics();

            assertThat(stats).containsEntry("total", 10L);
            assertThat(stats).containsEntry("pendingHR", 2L);
            assertThat(stats).containsEntry("pendingFinance", 3L);
            assertThat(stats).containsEntry("approved", 1L);
            assertThat(stats).containsEntry("applied", 3L);
            assertThat(stats).containsEntry("rejected", 1L);
        }
    }
}