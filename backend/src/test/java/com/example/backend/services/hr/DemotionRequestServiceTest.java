package com.example.backend.services.hr;

import com.example.backend.dto.hr.demotion.*;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.generalLedger.AuditAction;
import com.example.backend.models.hr.*;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.hr.*;
import com.example.backend.services.finance.generalLedger.AuditService;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class DemotionRequestServiceTest {

    @Mock
    private DemotionRequestRepository demotionRequestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private SalaryHistoryRepository salaryHistoryRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private VacationBalanceService vacationBalanceService;

    @Mock
    private AuditService auditService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private DemotionRequestService service;

    private Employee activeEmployee;
    private JobPosition currentPosition;
    private JobPosition newPosition;
    private UUID employeeId;
    private UUID currentPositionId;
    private UUID newPositionId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        currentPositionId = UUID.randomUUID();
        newPositionId = UUID.randomUUID();

        currentPosition = mock(JobPosition.class);
        when(currentPosition.getId()).thenReturn(currentPositionId);
        when(currentPosition.getPositionName()).thenReturn("Senior Engineer");

        newPosition = mock(JobPosition.class);
        when(newPosition.getId()).thenReturn(newPositionId);
        when(newPosition.getPositionName()).thenReturn("Junior Engineer");

        activeEmployee = mock(Employee.class);
        when(activeEmployee.getId()).thenReturn(employeeId);
        when(activeEmployee.getStatus()).thenReturn("ACTIVE");
        when(activeEmployee.getJobPosition()).thenReturn(currentPosition);
        when(activeEmployee.getMonthlySalary()).thenReturn(new BigDecimal("5000"));
        when(activeEmployee.getEmployeeNumber()).thenReturn("EMP-2025-00001");
        when(activeEmployee.getFullName()).thenReturn("John Doe");
    }

    // ==================== createRequest ====================

    @Nested
    @DisplayName("createRequest")
    class CreateRequest {

        private DemotionRequestCreateDTO buildDTO() {
            DemotionRequestCreateDTO dto = mock(DemotionRequestCreateDTO.class);
            when(dto.getEmployeeId()).thenReturn(employeeId);
            when(dto.getNewPositionId()).thenReturn(newPositionId);
            when(dto.getNewSalary()).thenReturn(new BigDecimal("3500"));
            when(dto.getNewGrade()).thenReturn("B");
            when(dto.getEffectiveDate()).thenReturn(LocalDate.now().plusMonths(1));
            when(dto.getReason()).thenReturn("Performance issues");
            return dto;
        }

        @Test
        @DisplayName("Should create demotion request successfully")
        void createRequest_success() throws JsonProcessingException {
            DemotionRequestCreateDTO dto = buildDTO();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(activeEmployee.getSite()).thenReturn(null);
            when(jobPositionRepository.findById(newPositionId)).thenReturn(Optional.of(newPosition));
            when(demotionRequestRepository.existsPendingForEmployee(employeeId)).thenReturn(false);
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.DEMOTION_REQUEST))
                    .thenReturn("DEM-000001");
            when(objectMapper.writeValueAsString(anyList())).thenReturn("[{\"step\":\"SUBMISSION\"}]");

            DemotionRequest savedRequest = mock(DemotionRequest.class);
            when(savedRequest.getRequestNumber()).thenReturn("DEM-000001");
            when(savedRequest.getId()).thenReturn(UUID.randomUUID());
            when(demotionRequestRepository.save(any(DemotionRequest.class))).thenReturn(savedRequest);

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO expectedDTO = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(savedRequest)).thenReturn(expectedDTO);

                DemotionRequestDTO result = service.createRequest(dto, "admin");

                assertThat(result).isEqualTo(expectedDTO);
                verify(demotionRequestRepository).save(any(DemotionRequest.class));
                verify(auditService).logEvent(eq("DemotionRequest"), any(UUID.class), eq(AuditAction.CREATE), anyMap(), isNull());
            }
        }

        @Test
        @DisplayName("Should throw when employee not found")
        void createRequest_employeeNotFound() {
            DemotionRequestCreateDTO dto = buildDTO();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Employee not found");
        }

        @Test
        @DisplayName("Should throw when employee is inactive")
        void createRequest_inactiveEmployee() {
            DemotionRequestCreateDTO dto = buildDTO();

            Employee inactiveEmployee = mock(Employee.class);
            when(inactiveEmployee.getStatus()).thenReturn("TERMINATED");
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(inactiveEmployee));

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("active employees");
        }

        @Test
        @DisplayName("Should throw when employee has no current position")
        void createRequest_noCurrentPosition() {
            DemotionRequestCreateDTO dto = buildDTO();

            Employee noPositionEmployee = mock(Employee.class);
            when(noPositionEmployee.getStatus()).thenReturn("ACTIVE");
            when(noPositionEmployee.getJobPosition()).thenReturn(null);
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(noPositionEmployee));

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("no current job position");
        }

        @Test
        @DisplayName("Should throw when demoting to same position")
        void createRequest_samePosition() {
            DemotionRequestCreateDTO dto = mock(DemotionRequestCreateDTO.class);
            when(dto.getEmployeeId()).thenReturn(employeeId);
            when(dto.getNewPositionId()).thenReturn(currentPositionId);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(jobPositionRepository.findById(currentPositionId)).thenReturn(Optional.of(currentPosition));

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("same position");
        }

        @Test
        @DisplayName("Should throw when pending request exists")
        void createRequest_pendingExists() throws JsonProcessingException {
            DemotionRequestCreateDTO dto = buildDTO();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(jobPositionRepository.findById(newPositionId)).thenReturn(Optional.of(newPosition));
            when(demotionRequestRepository.existsPendingForEmployee(employeeId)).thenReturn(true);

            assertThatThrownBy(() -> service.createRequest(dto, "admin"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already pending");
        }
    }

    // ==================== deptHeadDecision ====================

    @Nested
    @DisplayName("deptHeadDecision")
    class DeptHeadDecision {

        @Test
        @DisplayName("Should approve and route to HR")
        void deptHeadDecision_approve() throws JsonProcessingException {
            UUID requestId = UUID.randomUUID();
            DemotionRequest request = mock(DemotionRequest.class);
            when(request.getRequestNumber()).thenReturn("DEM-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);
            when(request.getId()).thenReturn(requestId);
            when(request.getApprovals()).thenReturn("[{\"step\":\"SUBMISSION\"}]");

            DemotionReviewDTO reviewDTO = mock(DemotionReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(true);
            when(reviewDTO.getComments()).thenReturn("Approved by dept head");

            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.databind.type.CollectionType.class)))
                    .thenReturn(new ArrayList<>(List.of(Map.of("step", "SUBMISSION"))));
            when(objectMapper.writeValueAsString(anyList())).thenReturn("[{\"step\":\"SUBMISSION\"},{\"step\":\"DEPT_HEAD\"}]");
            when(objectMapper.getTypeFactory()).thenReturn(new ObjectMapper().getTypeFactory());
            when(demotionRequestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO expectedDTO = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                DemotionRequestDTO result = service.deptHeadDecision(requestId, reviewDTO, "deptHead");

                assertThat(result).isEqualTo(expectedDTO);
                verify(request).deptHeadApprove("deptHead", "Approved by dept head");
                verify(demotionRequestRepository).save(request);
            }
        }

        @Test
        @DisplayName("Should reject request")
        void deptHeadDecision_reject() throws JsonProcessingException {
            UUID requestId = UUID.randomUUID();
            DemotionRequest request = mock(DemotionRequest.class);
            when(request.getRequestNumber()).thenReturn("DEM-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);
            when(request.getId()).thenReturn(requestId);
            when(request.getApprovals()).thenReturn("[{\"step\":\"SUBMISSION\"}]");

            DemotionReviewDTO reviewDTO = mock(DemotionReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(false);
            when(reviewDTO.getRejectionReason()).thenReturn("Not justified");

            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.databind.type.CollectionType.class)))
                    .thenReturn(new ArrayList<>(List.of(Map.of("step", "SUBMISSION"))));
            when(objectMapper.writeValueAsString(anyList())).thenReturn("[{\"step\":\"SUBMISSION\"},{\"step\":\"DEPT_HEAD\"}]");
            when(objectMapper.getTypeFactory()).thenReturn(new ObjectMapper().getTypeFactory());
            when(demotionRequestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO expectedDTO = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                service.deptHeadDecision(requestId, reviewDTO, "deptHead");

                verify(request).deptHeadReject("deptHead", "Not justified");
            }
        }

        @Test
        @DisplayName("Should throw when request not found")
        void deptHeadDecision_notFound() {
            UUID requestId = UUID.randomUUID();
            DemotionReviewDTO reviewDTO = mock(DemotionReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(true);

            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.deptHeadDecision(requestId, reviewDTO, "deptHead"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ==================== hrDecision ====================

    @Nested
    @DisplayName("hrDecision")
    class HrDecision {

        @Test
        @DisplayName("Should approve and apply demotion")
        void hrDecision_approve() throws JsonProcessingException {
            UUID requestId = UUID.randomUUID();
            DemotionRequest request = mock(DemotionRequest.class);
            when(request.getRequestNumber()).thenReturn("DEM-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);
            when(request.getId()).thenReturn(requestId);
            when(request.getNewPosition()).thenReturn(newPosition);
            when(request.getNewSalary()).thenReturn(new BigDecimal("3500"));
            when(request.getCurrentPosition()).thenReturn(currentPosition);
            when(request.getEffectiveDate()).thenReturn(LocalDate.now());
            when(request.getReason()).thenReturn("Performance issues");
            when(request.getApprovals()).thenReturn("[{\"step\":\"SUBMISSION\"}]");

            DemotionReviewDTO reviewDTO = mock(DemotionReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(true);
            when(reviewDTO.getComments()).thenReturn("Approved by HR");

            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.databind.type.CollectionType.class)))
                    .thenReturn(new ArrayList<>(List.of(Map.of("step", "SUBMISSION"))));
            when(objectMapper.writeValueAsString(anyList())).thenReturn("[{\"step\":\"SUBMISSION\"},{\"step\":\"HR\"}]");
            when(objectMapper.getTypeFactory()).thenReturn(new ObjectMapper().getTypeFactory());
            when(demotionRequestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO expectedDTO = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                DemotionRequestDTO result = service.hrDecision(requestId, reviewDTO, "hrManager");

                assertThat(result).isEqualTo(expectedDTO);
                verify(request).hrApprove("hrManager", "Approved by HR");

                // Verify demotion applied
                verify(activeEmployee).setJobPosition(newPosition);
                verify(activeEmployee).setBaseSalaryOverride(new BigDecimal("3500"));
                verify(employeeRepository).save(activeEmployee);
                verify(salaryHistoryRepository).save(any(SalaryHistory.class));
                verify(vacationBalanceService).updateAllocationForEmployee(employeeId);
                verify(request).markApplied("hrManager");
            }
        }

        @Test
        @DisplayName("Should reject request")
        void hrDecision_reject() throws JsonProcessingException {
            UUID requestId = UUID.randomUUID();
            DemotionRequest request = mock(DemotionRequest.class);
            when(request.getRequestNumber()).thenReturn("DEM-000001");
            when(request.getEmployee()).thenReturn(activeEmployee);
            when(request.getId()).thenReturn(requestId);
            when(request.getApprovals()).thenReturn("[{\"step\":\"SUBMISSION\"}]");

            DemotionReviewDTO reviewDTO = mock(DemotionReviewDTO.class);
            when(reviewDTO.isApproved()).thenReturn(false);
            when(reviewDTO.getRejectionReason()).thenReturn("Not warranted");

            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
            when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.databind.type.CollectionType.class)))
                    .thenReturn(new ArrayList<>(List.of(Map.of("step", "SUBMISSION"))));
            when(objectMapper.writeValueAsString(anyList())).thenReturn("[{\"step\":\"SUBMISSION\"},{\"step\":\"HR\"}]");
            when(objectMapper.getTypeFactory()).thenReturn(new ObjectMapper().getTypeFactory());
            when(demotionRequestRepository.save(request)).thenReturn(request);

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO expectedDTO = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(request)).thenReturn(expectedDTO);

                service.hrDecision(requestId, reviewDTO, "hrManager");

                verify(request).hrReject("hrManager", "Not warranted");
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
            DemotionRequest req1 = mock(DemotionRequest.class);
            DemotionRequest req2 = mock(DemotionRequest.class);
            when(demotionRequestRepository.findAllOrderByCreatedAtDesc()).thenReturn(List.of(req1, req2));

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO dto1 = mock(DemotionRequestDTO.class);
                DemotionRequestDTO dto2 = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(req1)).thenReturn(dto1);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(req2)).thenReturn(dto2);

                List<DemotionRequestDTO> result = service.getAll();

                assertThat(result).hasSize(2).containsExactly(dto1, dto2);
            }
        }

        @Test
        @DisplayName("getByStatus should return filtered list")
        void getByStatus_returnsFiltered() {
            DemotionRequest req = mock(DemotionRequest.class);
            when(demotionRequestRepository.findByStatus(DemotionRequest.Status.PENDING))
                    .thenReturn(List.of(req));

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO dto = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(req)).thenReturn(dto);

                List<DemotionRequestDTO> result = service.getByStatus(DemotionRequest.Status.PENDING);

                assertThat(result).hasSize(1);
            }
        }

        @Test
        @DisplayName("getById should return DTO when found")
        void getById_found() {
            UUID requestId = UUID.randomUUID();
            DemotionRequest req = mock(DemotionRequest.class);
            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.of(req));

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO dto = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(req)).thenReturn(dto);

                DemotionRequestDTO result = service.getById(requestId);

                assertThat(result).isEqualTo(dto);
            }
        }

        @Test
        @DisplayName("getById should throw ResourceNotFoundException when not found")
        void getById_notFound() {
            UUID requestId = UUID.randomUUID();
            when(demotionRequestRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(requestId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("getByEmployee should return list of DTOs")
        void getByEmployee_returnsList() {
            DemotionRequest req = mock(DemotionRequest.class);
            when(demotionRequestRepository.findByEmployeeId(employeeId)).thenReturn(List.of(req));

            try (var mockedStatic = mockStatic(DemotionRequestDTO.class)) {
                DemotionRequestDTO dto = mock(DemotionRequestDTO.class);
                mockedStatic.when(() -> DemotionRequestDTO.fromEntity(req)).thenReturn(dto);

                List<DemotionRequestDTO> result = service.getByEmployee(employeeId);

                assertThat(result).hasSize(1);
            }
        }

        @Test
        @DisplayName("getStatistics should return map with all status counts")
        void getStatistics_returnsMap() {
            when(demotionRequestRepository.count()).thenReturn(15L);
            when(demotionRequestRepository.countByStatus(DemotionRequest.Status.PENDING)).thenReturn(3L);
            when(demotionRequestRepository.countByStatus(DemotionRequest.Status.DEPT_HEAD_APPROVED)).thenReturn(2L);
            when(demotionRequestRepository.countByStatus(DemotionRequest.Status.HR_APPROVED)).thenReturn(4L);
            when(demotionRequestRepository.countByStatus(DemotionRequest.Status.APPLIED)).thenReturn(5L);
            when(demotionRequestRepository.countByStatus(DemotionRequest.Status.REJECTED)).thenReturn(1L);

            Map<String, Object> stats = service.getStatistics();

            assertThat(stats).containsEntry("total", 15L);
            assertThat(stats).containsEntry("pending", 3L);
            assertThat(stats).containsEntry("deptHeadApproved", 2L);
            assertThat(stats).containsEntry("hrApproved", 4L);
            assertThat(stats).containsEntry("applied", 5L);
            assertThat(stats).containsEntry("rejected", 1L);
        }
    }
}