package com.example.backend.services.hr;

import com.example.backend.dto.hr.promotions.PromotionRequestCreateDTO;
import com.example.backend.dto.hr.promotions.PromotionRequestReviewDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.PromotionRequest;
import com.example.backend.models.hr.PromotionRequest.PromotionPriority;
import com.example.backend.models.hr.PromotionRequest.PromotionStatus;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.hr.PromotionRequestRepository;
import com.example.backend.services.notification.NotificationService;
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
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromotionRequestServiceTest {

    @Mock
    private PromotionRequestRepository promotionRequestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PromotionRequestService promotionRequestService;

    private Employee employee;
    private UUID employeeId;
    private JobPosition currentPosition;
    private JobPosition promotedPosition;
    private UUID currentPositionId;
    private UUID promotedPositionId;
    private PromotionRequest promotionRequest;
    private UUID requestId;
    private Department department;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        currentPositionId = UUID.randomUUID();
        promotedPositionId = UUID.randomUUID();
        requestId = UUID.randomUUID();

        department = new Department();
        department.setId(UUID.randomUUID());
        department.setName("Engineering");

        currentPosition = JobPosition.builder()
                .id(currentPositionId)
                .positionName("Junior Developer")
                .department(department)
                .contractType(JobPosition.ContractType.MONTHLY)
                .baseSalary(5000.0)
                .build();

        promotedPosition = JobPosition.builder()
                .id(promotedPositionId)
                .positionName("Senior Developer")
                .department(department)
                .contractType(JobPosition.ContractType.MONTHLY)
                .baseSalary(8000.0)
                .build();

        employee = Employee.builder()
                .id(employeeId)
                .firstName("John")
                .lastName("Doe")
                .jobPosition(currentPosition)
                .baseSalaryOverride(BigDecimal.valueOf(5000))
                .hireDate(LocalDate.now().minusYears(3))
                .status("ACTIVE")
                .build();

        promotionRequest = PromotionRequest.builder()
                .id(requestId)
                .employee(employee)
                .currentJobPosition(currentPosition)
                .promotedToJobPosition(promotedPosition)
                .requestTitle("Promotion to Senior Developer")
                .justification("Outstanding performance")
                .proposedEffectiveDate(LocalDate.now().plusDays(30))
                .actualEffectiveDate(LocalDate.now().plusDays(30))
                .currentSalary(BigDecimal.valueOf(5000))
                .proposedSalary(BigDecimal.valueOf(8000))
                .status(PromotionStatus.PENDING)
                .priority(PromotionPriority.NORMAL)
                .requestedBy("hr_admin")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("createPromotionRequest")
    class CreatePromotionRequest {

        @Test
        @DisplayName("should create promotion request successfully")
        void shouldCreateSuccessfully() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(employeeId)
                    .promotedToJobPositionId(promotedPositionId)
                    .requestTitle("Promotion Request")
                    .proposedEffectiveDate(LocalDate.now().plusDays(30))
                    .proposedSalary(BigDecimal.valueOf(8000))
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(jobPositionRepository.findById(promotedPositionId)).thenReturn(Optional.of(promotedPosition));
            when(promotionRequestRepository.save(any(PromotionRequest.class))).thenAnswer(inv -> {
                PromotionRequest pr = inv.getArgument(0);
                pr.setId(UUID.randomUUID());
                return pr;
            });

            PromotionRequest result = promotionRequestService.createPromotionRequest(dto, "hr_admin");

            assertThat(result).isNotNull();
            verify(promotionRequestRepository).save(any(PromotionRequest.class));
            verify(notificationService, atLeastOnce()).sendNotificationToHRUsers(
                    eq("New Promotion Request"), anyString(), any(), anyString(), anyString()
            );
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenEmployeeNotFound() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .promotedToJobPositionId(promotedPositionId)
                    .requestTitle("Title")
                    .build();

            when(employeeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            assertThatThrownBy(() -> promotionRequestService.createPromotionRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");
        }

        @Test
        @DisplayName("should throw when employee has no current position")
        void shouldThrowWhenNoCurrentPosition() {
            Employee noPositionEmployee = Employee.builder()
                    .id(employeeId)
                    .firstName("John")
                    .lastName("Doe")
                    .status("ACTIVE")
                    .build();

            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(employeeId)
                    .promotedToJobPositionId(promotedPositionId)
                    .requestTitle("Title")
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(noPositionEmployee));

            assertThatThrownBy(() -> promotionRequestService.createPromotionRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("no current job position");
        }

        @Test
        @DisplayName("should throw when promoted position not found")
        void shouldThrowWhenPromotedPositionNotFound() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(employeeId)
                    .promotedToJobPositionId(UUID.randomUUID())
                    .requestTitle("Title")
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(jobPositionRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            assertThatThrownBy(() -> promotionRequestService.createPromotionRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Promoted to job position not found");
        }

        @Test
        @DisplayName("should throw when promoting to same position")
        void shouldThrowWhenSamePosition() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(employeeId)
                    .promotedToJobPositionId(currentPositionId)
                    .requestTitle("Title")
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(jobPositionRepository.findById(currentPositionId)).thenReturn(Optional.of(currentPosition));

            assertThatThrownBy(() -> promotionRequestService.createPromotionRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Cannot promote employee to the same position");
        }
    }

    @Nested
    @DisplayName("reviewPromotionRequest")
    class ReviewPromotionRequest {

        @Test
        @DisplayName("should approve promotion request")
        void shouldApprove() {
            PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                    .action("approve")
                    .managerComments("Well deserved")
                    .approvedSalary(BigDecimal.valueOf(7500))
                    .actualEffectiveDate(LocalDate.now().plusDays(15))
                    .build();

            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));
            when(promotionRequestRepository.save(any(PromotionRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            PromotionRequest result = promotionRequestService.reviewPromotionRequest(requestId, reviewDTO, "manager");

            assertThat(result.getStatus()).isEqualTo(PromotionStatus.APPROVED);
            assertThat(result.getApprovedSalary()).isEqualByComparingTo(BigDecimal.valueOf(7500));
            assertThat(result.getReviewedBy()).isEqualTo("manager");
        }

        @Test
        @DisplayName("should reject promotion request")
        void shouldReject() {
            PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                    .action("reject")
                    .rejectionReason("Not ready yet")
                    .managerComments("Needs more experience")
                    .build();

            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));
            when(promotionRequestRepository.save(any(PromotionRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            PromotionRequest result = promotionRequestService.reviewPromotionRequest(requestId, reviewDTO, "manager");

            assertThat(result.getStatus()).isEqualTo(PromotionStatus.REJECTED);
        }

        @Test
        @DisplayName("should throw when request not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                    .action("approve")
                    .build();

            when(promotionRequestRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> promotionRequestService.reviewPromotionRequest(unknownId, reviewDTO, "manager"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Promotion request not found");
        }

        @Test
        @DisplayName("should throw when request is not pending")
        void shouldThrowWhenNotPending() {
            promotionRequest.setStatus(PromotionStatus.APPROVED);
            PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                    .action("approve")
                    .build();

            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));

            assertThatThrownBy(() -> promotionRequestService.reviewPromotionRequest(requestId, reviewDTO, "manager"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not in pending status");
        }

        @Test
        @DisplayName("should throw for invalid action")
        void shouldThrowForInvalidAction() {
            PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                    .action("invalid_action")
                    .build();

            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));

            assertThatThrownBy(() -> promotionRequestService.reviewPromotionRequest(requestId, reviewDTO, "manager"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Invalid review action");
        }
    }

    @Nested
    @DisplayName("implementPromotionRequest")
    class ImplementPromotionRequest {

        @Test
        @DisplayName("should implement approved request")
        void shouldImplementSuccessfully() {
            promotionRequest.setStatus(PromotionStatus.APPROVED);
            promotionRequest.setActualEffectiveDate(LocalDate.now().minusDays(1));
            promotionRequest.setApprovedSalary(BigDecimal.valueOf(8000));

            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));
            when(employeeRepository.save(any(Employee.class))).thenReturn(employee);
            when(promotionRequestRepository.save(any(PromotionRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            PromotionRequest result = promotionRequestService.implementPromotionRequest(requestId, "hr_admin");

            assertThat(result.getStatus()).isEqualTo(PromotionStatus.IMPLEMENTED);
            verify(employeeRepository).save(employee);
            assertThat(employee.getJobPosition()).isEqualTo(promotedPosition);
            assertThat(employee.getBaseSalaryOverride()).isEqualByComparingTo(BigDecimal.valueOf(8000));
        }

        @Test
        @DisplayName("should throw when request not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(promotionRequestRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> promotionRequestService.implementPromotionRequest(unknownId, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Promotion request not found");
        }

        @Test
        @DisplayName("should throw when request is not approved")
        void shouldThrowWhenNotApproved() {
            promotionRequest.setStatus(PromotionStatus.PENDING);
            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));

            assertThatThrownBy(() -> promotionRequestService.implementPromotionRequest(requestId, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not approved");
        }

        @Test
        @DisplayName("should throw when cannot be implemented yet")
        void shouldThrowWhenCannotImplementYet() {
            promotionRequest.setStatus(PromotionStatus.APPROVED);
            promotionRequest.setActualEffectiveDate(LocalDate.now().plusDays(30));

            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));

            assertThatThrownBy(() -> promotionRequestService.implementPromotionRequest(requestId, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("cannot be implemented yet");
        }
    }

    @Nested
    @DisplayName("getAllPromotionRequests")
    class GetAllPromotionRequests {

        @Test
        @DisplayName("should filter by status and employee")
        void shouldFilterByStatusAndEmployee() {
            when(promotionRequestRepository.findByStatusAndEmployeeIdOrderByCreatedAtDesc(PromotionStatus.PENDING, employeeId))
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getAllPromotionRequests(PromotionStatus.PENDING, employeeId, null);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should filter by status only")
        void shouldFilterByStatusOnly() {
            when(promotionRequestRepository.findByStatusOrderByCreatedAtDesc(PromotionStatus.PENDING))
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getAllPromotionRequests(PromotionStatus.PENDING, null, null);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should filter by employee only")
        void shouldFilterByEmployeeOnly() {
            when(promotionRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId))
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getAllPromotionRequests(null, employeeId, null);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should filter by requestedBy")
        void shouldFilterByRequestedBy() {
            when(promotionRequestRepository.findByRequestedByOrderByCreatedAtDesc("hr_admin"))
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getAllPromotionRequests(null, null, "hr_admin");

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should return all when no filters")
        void shouldReturnAllWhenNoFilters() {
            when(promotionRequestRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getAllPromotionRequests(null, null, null);

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getPendingPromotionRequests")
    class GetPendingPromotionRequests {

        @Test
        @DisplayName("should return pending requests")
        void shouldReturnPending() {
            when(promotionRequestRepository.findByStatusOrderByCreatedAtDesc(PromotionStatus.PENDING))
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getPendingPromotionRequests();

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getPromotionsReadyForImplementation")
    class GetPromotionsReadyForImplementation {

        @Test
        @DisplayName("should return approved promotions with effective date today or earlier")
        void shouldReturnReady() {
            when(promotionRequestRepository.findByStatusAndActualEffectiveDateLessThanEqualOrderByActualEffectiveDate(
                    eq(PromotionStatus.APPROVED), any(LocalDate.class)))
                    .thenReturn(List.of(promotionRequest));

            List<PromotionRequest> result = promotionRequestService.getPromotionsReadyForImplementation();

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getPromotionRequestById")
    class GetPromotionRequestById {

        @Test
        @DisplayName("should return request when found")
        void shouldReturnRequest() {
            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));

            PromotionRequest result = promotionRequestService.getPromotionRequestById(requestId);

            assertThat(result.getRequestTitle()).isEqualTo("Promotion to Senior Developer");
        }

        @Test
        @DisplayName("should throw when not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(promotionRequestRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> promotionRequestService.getPromotionRequestById(unknownId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Promotion request not found");
        }
    }

    @Nested
    @DisplayName("cancelPromotionRequest")
    class CancelPromotionRequest {

        @Test
        @DisplayName("should cancel pending request")
        void shouldCancelSuccessfully() {
            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));
            when(promotionRequestRepository.save(any(PromotionRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            PromotionRequest result = promotionRequestService.cancelPromotionRequest(requestId, "admin", "Budget cuts");

            assertThat(result.getStatus()).isEqualTo(PromotionStatus.CANCELLED);
            assertThat(result.getRejectionReason()).isEqualTo("Budget cuts");
        }

        @Test
        @DisplayName("should throw when request is completed")
        void shouldThrowWhenCompleted() {
            promotionRequest.setStatus(PromotionStatus.IMPLEMENTED);
            when(promotionRequestRepository.findById(requestId)).thenReturn(Optional.of(promotionRequest));

            assertThatThrownBy(() -> promotionRequestService.cancelPromotionRequest(requestId, "admin", "reason"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Cannot cancel a completed promotion request");
        }
    }

    @Nested
    @DisplayName("getPromotionStatistics")
    class GetPromotionStatistics {

        @Test
        @DisplayName("should return promotion statistics")
        void shouldReturnStats() {
            when(promotionRequestRepository.count()).thenReturn(10L);
            when(promotionRequestRepository.countByStatus(PromotionStatus.PENDING)).thenReturn(3L);
            when(promotionRequestRepository.countByStatus(PromotionStatus.APPROVED)).thenReturn(2L);
            when(promotionRequestRepository.countByStatus(PromotionStatus.IMPLEMENTED)).thenReturn(4L);
            when(promotionRequestRepository.countByStatus(PromotionStatus.REJECTED)).thenReturn(1L);

            Map<String, Object> stats = promotionRequestService.getPromotionStatistics();

            assertThat(stats).containsEntry("totalRequests", 10L);
            assertThat(stats).containsEntry("pendingRequests", 3L);
            assertThat(stats).containsEntry("approvedRequests", 2L);
            assertThat(stats).containsEntry("implementedRequests", 4L);
            assertThat(stats).containsEntry("rejectedRequests", 1L);
            assertThat((Double) stats.get("approvalRate")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("checkOverduePromotions")
    class CheckOverduePromotions {

        @Test
        @DisplayName("should send notifications for overdue promotions")
        void shouldSendNotificationsForOverdue() {
            when(promotionRequestRepository.findByStatusAndActualEffectiveDateLessThanOrderByActualEffectiveDate(
                    eq(PromotionStatus.APPROVED), any(LocalDate.class)))
                    .thenReturn(List.of(promotionRequest));

            promotionRequestService.checkOverduePromotions();

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Overdue Promotion Implementation"), anyString(), any(), anyString(), anyString()
            );
        }

        @Test
        @DisplayName("should do nothing when no overdue promotions")
        void shouldDoNothingWhenNoneOverdue() {
            when(promotionRequestRepository.findByStatusAndActualEffectiveDateLessThanOrderByActualEffectiveDate(
                    eq(PromotionStatus.APPROVED), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            promotionRequestService.checkOverduePromotions();

            verify(notificationService, never()).sendNotificationToHRUsers(
                    eq("Overdue Promotion Implementation"), anyString(), any(), anyString(), anyString()
            );
        }
    }
}