package com.example.backend.services.hr;

import com.example.backend.dto.hr.promotions.EmployeePromotionSummaryDTO;
import com.example.backend.dto.hr.promotions.MonthlyPromotionTrendDTO;
import com.example.backend.dto.hr.promotions.PromotionRequestCreateDTO;
import com.example.backend.dto.hr.promotions.PromotionRequestResponseDTO;
import com.example.backend.dto.hr.promotions.PromotionRequestReviewDTO;
import com.example.backend.dto.hr.promotions.PromotionStatisticsDTO;
import com.example.backend.dto.hr.promotions.TopPerformerDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.PromotionRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;

class PromotionRequestMapperServiceTest {

    private PromotionRequestMapperService mapperService;

    private Employee employee;
    private JobPosition currentPosition;
    private JobPosition promotedToPosition;
    private Department currentDepartment;
    private Department newDepartment;

    @BeforeEach
    void setUp() {
        mapperService = new PromotionRequestMapperService();

        currentDepartment = new Department();
        currentDepartment.setName("Engineering");

        newDepartment = new Department();
        newDepartment.setName("Management");

        currentPosition = new JobPosition();
        currentPosition.setId(UUID.randomUUID());
        currentPosition.setPositionName("Junior Engineer");
        currentPosition.setDepartment(currentDepartment);
        currentPosition.setContractType(JobPosition.ContractType.MONTHLY);

        promotedToPosition = new JobPosition();
        promotedToPosition.setId(UUID.randomUUID());
        promotedToPosition.setPositionName("Senior Engineer");
        promotedToPosition.setDepartment(newDepartment);

        employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setEmployeeNumber("EMP-2025-00001");
        employee.setJobPosition(currentPosition);
        employee.setBaseSalaryOverride(new BigDecimal("5000"));
    }

    private PromotionRequest createFullPromotionRequest() {
        return PromotionRequest.builder()
                .id(UUID.randomUUID())
                .requestTitle("Promotion to Senior")
                .justification("Outstanding performance")
                .proposedEffectiveDate(LocalDate.of(2026, 6, 1))
                .actualEffectiveDate(null)
                .status(PromotionRequest.PromotionStatus.PENDING)
                .priority(PromotionRequest.PromotionPriority.HIGH)
                .employee(employee)
                .currentJobPosition(currentPosition)
                .promotedToJobPosition(promotedToPosition)
                .currentSalary(new BigDecimal("5000"))
                .proposedSalary(new BigDecimal("7000"))
                .requestedBy("HR Manager")
                .hrComments("Recommended")
                .performanceRating("Excellent")
                .educationalQualifications("BSc Computer Science")
                .additionalCertifications("AWS Certified")
                .requiresAdditionalTraining(false)
                .trainingPlan(null)
                .submittedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // =========================================================================
    // toResponseDTO
    // =========================================================================
    @Nested
    @DisplayName("toResponseDTO")
    class ToResponseDTO {

        @Test
        @DisplayName("should map full promotion request to response DTO")
        void shouldMapFullData() {
            PromotionRequest request = createFullPromotionRequest();

            PromotionRequestResponseDTO result = mapperService.toResponseDTO(request);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(request.getId());
            assertThat(result.getRequestTitle()).isEqualTo("Promotion to Senior");
            assertThat(result.getStatus()).isEqualTo("PENDING");
            assertThat(result.getPriority()).isEqualTo("HIGH");
            assertThat(result.getEmployeeId()).isEqualTo(employee.getId());
            assertThat(result.getEmployeeNumber()).isEqualTo("EMP-2025-00001");
            assertThat(result.getCurrentPositionName()).isNotNull();
            assertThat(result.getPromotedToPositionName()).isNotNull();
            assertThat(result.getCurrentSalary()).isEqualTo(new BigDecimal("5000"));
            assertThat(result.getProposedSalary()).isEqualTo(new BigDecimal("7000"));
            assertThat(result.getPerformanceRating()).isEqualTo("Excellent");
        }

        @Test
        @DisplayName("should return null for null input")
        void shouldReturnNullForNull() {
            PromotionRequestResponseDTO result = mapperService.toResponseDTO(null);
            assertThat(result).isNull();
        }
    }

    // =========================================================================
    // toResponseDTOList
    // =========================================================================
    @Test
    @DisplayName("toResponseDTOList should map list of requests")
    void shouldMapListOfRequests() {
        PromotionRequest r1 = createFullPromotionRequest();
        PromotionRequest r2 = createFullPromotionRequest();

        List<PromotionRequestResponseDTO> result = mapperService.toResponseDTOList(List.of(r1, r2));

        assertThat(result).hasSize(2);
    }

    // =========================================================================
    // validateCreateDTO
    // =========================================================================
    @Nested
    @DisplayName("validateCreateDTO")
    class ValidateCreateDTO {

        @Test
        @DisplayName("should throw for null DTO")
        void shouldThrowForNullDTO() {
            assertThatThrownBy(() -> mapperService.validateCreateDTO(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("required");
        }

        @Test
        @DisplayName("should throw for null employeeId")
        void shouldThrowForNullEmployeeId() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .promotedToJobPositionId(UUID.randomUUID())
                    .requestTitle("Title")
                    .proposedEffectiveDate(LocalDate.now().plusDays(30))
                    .build();

            assertThatThrownBy(() -> mapperService.validateCreateDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Employee ID");
        }

        @Test
        @DisplayName("should throw for null promotedToJobPositionId")
        void shouldThrowForNullPositionId() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .requestTitle("Title")
                    .proposedEffectiveDate(LocalDate.now().plusDays(30))
                    .build();

            assertThatThrownBy(() -> mapperService.validateCreateDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("job position ID");
        }

        @Test
        @DisplayName("should throw for blank request title")
        void shouldThrowForBlankTitle() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .promotedToJobPositionId(UUID.randomUUID())
                    .requestTitle("   ")
                    .proposedEffectiveDate(LocalDate.now().plusDays(30))
                    .build();

            assertThatThrownBy(() -> mapperService.validateCreateDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("title");
        }

        @Test
        @DisplayName("should throw for null request title")
        void shouldThrowForNullTitle() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .promotedToJobPositionId(UUID.randomUUID())
                    .proposedEffectiveDate(LocalDate.now().plusDays(30))
                    .build();

            assertThatThrownBy(() -> mapperService.validateCreateDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("title");
        }

        @Test
        @DisplayName("should throw for null proposed effective date")
        void shouldThrowForNullDate() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .promotedToJobPositionId(UUID.randomUUID())
                    .requestTitle("Promotion")
                    .build();

            assertThatThrownBy(() -> mapperService.validateCreateDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("effective date");
        }

        @Test
        @DisplayName("should throw for past effective date")
        void shouldThrowForPastDate() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .promotedToJobPositionId(UUID.randomUUID())
                    .requestTitle("Promotion")
                    .proposedEffectiveDate(LocalDate.now().minusDays(1))
                    .build();

            assertThatThrownBy(() -> mapperService.validateCreateDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("past");
        }

        @Test
        @DisplayName("should pass validation for valid DTO")
        void shouldPassForValidDTO() {
            PromotionRequestCreateDTO dto = PromotionRequestCreateDTO.builder()
                    .employeeId(UUID.randomUUID())
                    .promotedToJobPositionId(UUID.randomUUID())
                    .requestTitle("Promotion to Senior")
                    .proposedEffectiveDate(LocalDate.now().plusDays(30))
                    .build();

            assertThatCode(() -> mapperService.validateCreateDTO(dto))
                    .doesNotThrowAnyException();
        }
    }

    // =========================================================================
    // validateReviewDTO
    // =========================================================================
    @Nested
    @DisplayName("validateReviewDTO")
    class ValidateReviewDTO {

        @Test
        @DisplayName("should throw for null DTO")
        void shouldThrowForNullDTO() {
            assertThatThrownBy(() -> mapperService.validateReviewDTO(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("required");
        }

        @Test
        @DisplayName("should throw for null action")
        void shouldThrowForNullAction() {
            PromotionRequestReviewDTO dto = PromotionRequestReviewDTO.builder().build();

            assertThatThrownBy(() -> mapperService.validateReviewDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("action");
        }

        @Test
        @DisplayName("should throw for blank action")
        void shouldThrowForBlankAction() {
            PromotionRequestReviewDTO dto = PromotionRequestReviewDTO.builder()
                    .action("   ")
                    .build();

            assertThatThrownBy(() -> mapperService.validateReviewDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("action");
        }

        @Test
        @DisplayName("should throw for invalid action")
        void shouldThrowForInvalidAction() {
            PromotionRequestReviewDTO dto = PromotionRequestReviewDTO.builder()
                    .action("invalid")
                    .build();

            assertThatThrownBy(() -> mapperService.validateReviewDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("approve");
        }

        @Test
        @DisplayName("should throw for reject without reason")
        void shouldThrowForRejectWithoutReason() {
            PromotionRequestReviewDTO dto = PromotionRequestReviewDTO.builder()
                    .action("reject")
                    .build();

            assertThatThrownBy(() -> mapperService.validateReviewDTO(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Rejection reason");
        }

        @Test
        @DisplayName("should pass validation for valid approve")
        void shouldPassForValidApprove() {
            PromotionRequestReviewDTO dto = PromotionRequestReviewDTO.builder()
                    .action("approve")
                    .managerComments("Well deserved")
                    .build();

            assertThatCode(() -> mapperService.validateReviewDTO(dto))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should pass validation for valid reject with reason")
        void shouldPassForValidReject() {
            PromotionRequestReviewDTO dto = PromotionRequestReviewDTO.builder()
                    .action("reject")
                    .rejectionReason("Not enough experience")
                    .build();

            assertThatCode(() -> mapperService.validateReviewDTO(dto))
                    .doesNotThrowAnyException();
        }
    }

    // =========================================================================
    // fromCreateDTO
    // =========================================================================
    @Test
    @DisplayName("fromCreateDTO should build PromotionRequest correctly")
    void shouldBuildPromotionRequestFromCreateDTO() {
        PromotionRequestCreateDTO createDTO = PromotionRequestCreateDTO.builder()
                .employeeId(employee.getId())
                .promotedToJobPositionId(promotedToPosition.getId())
                .requestTitle("Promote to Senior")
                .justification("Great work")
                .proposedEffectiveDate(LocalDate.of(2026, 7, 1))
                .proposedSalary(new BigDecimal("7000"))
                .hrComments("Recommended")
                .performanceRating("Excellent")
                .educationalQualifications("BSc")
                .additionalCertifications("AWS")
                .requiresAdditionalTraining(false)
                .trainingPlan(null)
                .priority("HIGH")
                .build();

        PromotionRequest result = mapperService.fromCreateDTO(
                createDTO, employee, currentPosition, promotedToPosition, "HR Manager");

        assertThat(result.getEmployee()).isEqualTo(employee);
        assertThat(result.getCurrentJobPosition()).isEqualTo(currentPosition);
        assertThat(result.getPromotedToJobPosition()).isEqualTo(promotedToPosition);
        assertThat(result.getRequestTitle()).isEqualTo("Promote to Senior");
        assertThat(result.getCurrentSalary()).isEqualTo(new BigDecimal("5000"));
        assertThat(result.getProposedSalary()).isEqualTo(new BigDecimal("7000"));
        assertThat(result.getStatus()).isEqualTo(PromotionRequest.PromotionStatus.PENDING);
        assertThat(result.getPriority()).isEqualTo(PromotionRequest.PromotionPriority.HIGH);
        assertThat(result.getRequestedBy()).isEqualTo("HR Manager");
    }

    @Test
    @DisplayName("fromCreateDTO should default priority to NORMAL when null")
    void shouldDefaultPriorityToNormal() {
        PromotionRequestCreateDTO createDTO = PromotionRequestCreateDTO.builder()
                .employeeId(employee.getId())
                .promotedToJobPositionId(promotedToPosition.getId())
                .requestTitle("Promote")
                .proposedEffectiveDate(LocalDate.of(2026, 7, 1))
                .build();

        PromotionRequest result = mapperService.fromCreateDTO(
                createDTO, employee, currentPosition, promotedToPosition, "HR");

        assertThat(result.getPriority()).isEqualTo(PromotionRequest.PromotionPriority.NORMAL);
    }

    // =========================================================================
    // createMonthlyTrendDTO
    // =========================================================================
    @Test
    @DisplayName("createMonthlyTrendDTO should build DTO correctly")
    void shouldBuildMonthlyTrendDTO() {
        MonthlyPromotionTrendDTO result = mapperService.createMonthlyTrendDTO(
                2026, 3, 10L, 5L, 3L, new BigDecimal("1500"));

        assertThat(result.getYear()).isEqualTo(2026);
        assertThat(result.getMonth()).isEqualTo(3);
        assertThat(result.getMonthName()).isEqualTo("MARCH");
        assertThat(result.getTotalRequests()).isEqualTo(10L);
        assertThat(result.getApprovedPromotions()).isEqualTo(5L);
        assertThat(result.getImplementedPromotions()).isEqualTo(3L);
        assertThat(result.getAverageSalaryIncrease()).isEqualTo(new BigDecimal("1500"));
    }

    // =========================================================================
    // createTopPerformerDTO
    // =========================================================================
    @Test
    @DisplayName("createTopPerformerDTO should build DTO correctly")
    void shouldBuildTopPerformerDTO() {
        LocalDateTime lastPromotion = LocalDateTime.of(2026, 1, 15, 10, 0);

        TopPerformerDTO result = mapperService.createTopPerformerDTO(
                employee, 3, 12.5, new BigDecimal("6000"), lastPromotion);

        assertThat(result.getEmployeeId()).isEqualTo(employee.getId());
        assertThat(result.getEmployeeName()).isEqualTo(employee.getFullName());
        assertThat(result.getCurrentPosition()).isEqualTo("Junior Engineer");
        assertThat(result.getDepartment()).isEqualTo("Engineering");
        assertThat(result.getTotalPromotions()).isEqualTo(3);
        assertThat(result.getAverageTimeBetweenPromotions()).isEqualTo(12.5);
        assertThat(result.getTotalSalaryIncrease()).isEqualTo(new BigDecimal("6000"));
        assertThat(result.getLastPromotionDate()).isEqualTo(lastPromotion);
    }

    // =========================================================================
    // toStatisticsDTO
    // =========================================================================
    @Test
    @DisplayName("toStatisticsDTO should build DTO from map correctly")
    void shouldBuildStatisticsDTO() {
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalRequests", 100L);
        statistics.put("pendingRequests", 20L);
        statistics.put("approvedRequests", 50L);
        statistics.put("implementedRequests", 40L);
        statistics.put("rejectedRequests", 10L);
        statistics.put("cancelledRequests", 5L);
        statistics.put("approvalRate", 0.75);
        statistics.put("implementationRate", 0.80);
        statistics.put("averageSalaryIncrease", new BigDecimal("2000"));
        statistics.put("averageSalaryIncreasePercentage", new BigDecimal("15"));
        statistics.put("averageDaysToApproval", 7L);
        statistics.put("averageDaysToImplementation", 14L);

        PromotionStatisticsDTO result = mapperService.toStatisticsDTO(statistics);

        assertThat(result.getTotalRequests()).isEqualTo(100L);
        assertThat(result.getPendingRequests()).isEqualTo(20L);
        assertThat(result.getApprovedRequests()).isEqualTo(50L);
        assertThat(result.getImplementedRequests()).isEqualTo(40L);
        assertThat(result.getRejectedRequests()).isEqualTo(10L);
        assertThat(result.getCancelledRequests()).isEqualTo(5L);
        assertThat(result.getApprovalRate()).isEqualTo(0.75);
        assertThat(result.getAverageSalaryIncrease()).isEqualTo(new BigDecimal("2000"));
        assertThat(result.getAverageDaysToApproval()).isEqualTo(7L);
    }
}