package com.example.backend.services.hr;

import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.dto.hr.jobposition.JobPositionDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.hr.PromotionRequestRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobPositionServiceTest {

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private PromotionRequestRepository promotionRequestRepository;

    @Mock
    private VacationBalanceService vacationBalanceService;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private JobPositionService service;

    private Department department;
    private UUID positionId;

    @BeforeEach
    void setUp() {
        positionId = UUID.randomUUID();

        department = mock(Department.class);
        when(department.getId()).thenReturn(UUID.randomUUID());
        when(department.getName()).thenReturn("Engineering");
    }

    // ==================== createJobPosition ====================

    @Nested
    @DisplayName("createJobPosition")
    class CreateJobPosition {

        private JobPositionDTO buildMonthlyDTO() {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setPositionName("Software Engineer");
            dto.setDepartment("Engineering");
            dto.setContractType(JobPosition.ContractType.MONTHLY);
            dto.setMonthlyBaseSalary(5000.0);
            dto.setBaseSalary(5000.0);
            dto.setActive(true);
            dto.setExperienceLevel("SENIOR");
            return dto;
        }

        @Test
        @DisplayName("Should create MONTHLY position successfully")
        void createJobPosition_monthly_success() {
            JobPositionDTO dto = buildMonthlyDTO();

            when(jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCase("Software Engineer", "SENIOR"))
                    .thenReturn(false);
            when(departmentRepository.findByName("Engineering")).thenReturn(Optional.of(department));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.JOB_POSITION)).thenReturn("JP-000001");

            JobPosition savedPosition = mock(JobPosition.class);
            when(savedPosition.getId()).thenReturn(positionId);
            when(savedPosition.getPositionName()).thenReturn("Software Engineer");
            when(savedPosition.getDepartment()).thenReturn(department);
            when(savedPosition.getContractType()).thenReturn(JobPosition.ContractType.MONTHLY);
            when(savedPosition.getActive()).thenReturn(true);
            when(savedPosition.getPositionNumber()).thenReturn("JP-000001");
            when(savedPosition.getMonthlyBaseSalary()).thenReturn(5000.0);
            when(savedPosition.getExperienceLevel()).thenReturn("SENIOR");
            when(savedPosition.getChildPositions()).thenReturn(Collections.emptyList());
            when(savedPosition.getEmployees()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.save(any(JobPosition.class))).thenReturn(savedPosition);

            JobPositionDTO result = service.createJobPosition(dto);

            assertThat(result).isNotNull();
            assertThat(result.getPositionName()).isEqualTo("Software Engineer");
            verify(jobPositionRepository).save(any(JobPosition.class));
            verify(notificationService, atLeastOnce()).sendNotificationToHRUsers(
                    anyString(), anyString(), any(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should create HOURLY position successfully")
        void createJobPosition_hourly_success() {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setPositionName("Technician");
            dto.setDepartment("Engineering");
            dto.setContractType(JobPosition.ContractType.HOURLY);
            dto.setHourlyRate(25.0);
            dto.setHoursPerShift(8);
            dto.setWorkingDaysPerWeek(5);
            dto.setBaseSalary(4000.0);
            dto.setActive(true);
            dto.setExperienceLevel("JUNIOR");

            when(jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCase("Technician", "JUNIOR"))
                    .thenReturn(false);
            when(departmentRepository.findByName("Engineering")).thenReturn(Optional.of(department));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.JOB_POSITION)).thenReturn("JP-000002");

            JobPosition savedPosition = mock(JobPosition.class);
            when(savedPosition.getId()).thenReturn(positionId);
            when(savedPosition.getPositionName()).thenReturn("Technician");
            when(savedPosition.getDepartment()).thenReturn(department);
            when(savedPosition.getContractType()).thenReturn(JobPosition.ContractType.HOURLY);
            when(savedPosition.getActive()).thenReturn(true);
            when(savedPosition.getExperienceLevel()).thenReturn("JUNIOR");
            when(savedPosition.getHourlyRate()).thenReturn(25.0);
            when(savedPosition.getHoursPerShift()).thenReturn(8);
            when(savedPosition.getWorkingDaysPerWeek()).thenReturn(5);
            when(savedPosition.getChildPositions()).thenReturn(Collections.emptyList());
            when(savedPosition.getEmployees()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.save(any(JobPosition.class))).thenReturn(savedPosition);

            JobPositionDTO result = service.createJobPosition(dto);

            assertThat(result).isNotNull();
            verify(jobPositionRepository).save(any(JobPosition.class));
        }

        @Test
        @DisplayName("Should create DAILY position successfully")
        void createJobPosition_daily_success() {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setPositionName("Construction Worker");
            dto.setDepartment("Engineering");
            dto.setContractType(JobPosition.ContractType.DAILY);
            dto.setDailyRate(200.0);
            dto.setWorkingDaysPerMonth(22);
            dto.setBaseSalary(4400.0);
            dto.setActive(true);
            dto.setExperienceLevel("MID");

            when(jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCase("Construction Worker", "MID"))
                    .thenReturn(false);
            when(departmentRepository.findByName("Engineering")).thenReturn(Optional.of(department));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.JOB_POSITION)).thenReturn("JP-000003");

            JobPosition savedPosition = mock(JobPosition.class);
            when(savedPosition.getId()).thenReturn(positionId);
            when(savedPosition.getPositionName()).thenReturn("Construction Worker");
            when(savedPosition.getDepartment()).thenReturn(department);
            when(savedPosition.getContractType()).thenReturn(JobPosition.ContractType.DAILY);
            when(savedPosition.getActive()).thenReturn(true);
            when(savedPosition.getExperienceLevel()).thenReturn("MID");
            when(savedPosition.getDailyRate()).thenReturn(200.0);
            when(savedPosition.getWorkingDaysPerMonth()).thenReturn(22);
            when(savedPosition.getChildPositions()).thenReturn(Collections.emptyList());
            when(savedPosition.getEmployees()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.save(any(JobPosition.class))).thenReturn(savedPosition);

            JobPositionDTO result = service.createJobPosition(dto);

            assertThat(result).isNotNull();
            verify(jobPositionRepository).save(any(JobPosition.class));
        }

        @Test
        @DisplayName("Should throw when position name is null")
        void createJobPosition_nullName() {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setPositionName(null);
            dto.setDepartment("Engineering");
            dto.setContractType(JobPosition.ContractType.MONTHLY);
            dto.setMonthlyBaseSalary(5000.0);

            assertThatThrownBy(() -> service.createJobPosition(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Position name is required");
        }

        @Test
        @DisplayName("Should throw when duplicate position name and level exists")
        void createJobPosition_duplicateName() {
            JobPositionDTO dto = buildMonthlyDTO();

            when(jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCase("Software Engineer", "SENIOR"))
                    .thenReturn(true);

            assertThatThrownBy(() -> service.createJobPosition(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }
    }

    // ==================== getJobPositionDTOById ====================

    @Nested
    @DisplayName("getJobPositionDTOById")
    class GetJobPositionDTOById {

        @Test
        @DisplayName("Should return DTO when found")
        void getJobPositionDTOById_found() {
            JobPosition position = mock(JobPosition.class);
            when(position.getId()).thenReturn(positionId);
            when(position.getPositionName()).thenReturn("Engineer");
            when(position.getDepartment()).thenReturn(department);
            when(position.getContractType()).thenReturn(JobPosition.ContractType.MONTHLY);
            when(position.getActive()).thenReturn(true);
            when(position.getMonthlyBaseSalary()).thenReturn(5000.0);
            when(position.getChildPositions()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(position));

            JobPositionDTO result = service.getJobPositionDTOById(positionId);

            assertThat(result).isNotNull();
            assertThat(result.getPositionName()).isEqualTo("Engineer");
        }

        @Test
        @DisplayName("Should throw when not found")
        void getJobPositionDTOById_notFound() {
            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getJobPositionDTOById(positionId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not found");
        }
    }

    // ==================== getAllJobPositionDTOs ====================

    @Nested
    @DisplayName("getAllJobPositionDTOs")
    class GetAllJobPositionDTOs {

        @Test
        @DisplayName("Should return list of DTOs")
        void getAllJobPositionDTOs_returnsList() {
            JobPosition pos1 = mock(JobPosition.class);
            when(pos1.getPositionName()).thenReturn("Engineer");
            when(pos1.getDepartment()).thenReturn(department);
            when(pos1.getContractType()).thenReturn(JobPosition.ContractType.MONTHLY);
            when(pos1.getActive()).thenReturn(true);
            when(pos1.getMonthlyBaseSalary()).thenReturn(5000.0);
            when(pos1.getChildPositions()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.findAll()).thenReturn(List.of(pos1));

            List<JobPositionDTO> result = service.getAllJobPositionDTOs();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getPositionName()).isEqualTo("Engineer");
        }

        @Test
        @DisplayName("Should return empty list when no positions")
        void getAllJobPositionDTOs_empty() {
            when(jobPositionRepository.findAll()).thenReturn(Collections.emptyList());

            List<JobPositionDTO> result = service.getAllJobPositionDTOs();

            assertThat(result).isEmpty();
        }
    }

    // ==================== updateJobPosition ====================

    @Nested
    @DisplayName("updateJobPosition")
    class UpdateJobPosition {

        @Test
        @DisplayName("Should update position successfully")
        void updateJobPosition_success() {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setPositionName("Lead Engineer");
            dto.setDepartment("Engineering");
            dto.setContractType(JobPosition.ContractType.MONTHLY);
            dto.setMonthlyBaseSalary(7000.0);
            dto.setExperienceLevel("SENIOR");
            dto.setActive(true);

            JobPosition existing = mock(JobPosition.class);
            when(existing.getId()).thenReturn(positionId);
            when(existing.getPositionName()).thenReturn("Engineer");
            when(existing.getDepartment()).thenReturn(department);
            when(existing.getContractType()).thenReturn(JobPosition.ContractType.MONTHLY);
            when(existing.getActive()).thenReturn(true);
            when(existing.getMonthlyBaseSalary()).thenReturn(7000.0);
            when(existing.getExperienceLevel()).thenReturn("SENIOR");
            when(existing.getChildPositions()).thenReturn(Collections.emptyList());
            when(existing.getEmployees()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(existing));
            when(jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCaseAndIdNot(
                    "Lead Engineer", "SENIOR", positionId)).thenReturn(false);
            when(departmentRepository.findByName("Engineering")).thenReturn(Optional.of(department));
            when(jobPositionRepository.save(existing)).thenReturn(existing);

            JobPositionDTO result = service.updateJobPosition(positionId, dto);

            assertThat(result).isNotNull();
            verify(existing).setPositionName("Lead Engineer");
            verify(jobPositionRepository).save(existing);
        }

        @Test
        @DisplayName("Should throw when position not found")
        void updateJobPosition_notFound() {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setPositionName("Lead Engineer");
            dto.setDepartment("Engineering");
            dto.setContractType(JobPosition.ContractType.MONTHLY);
            dto.setMonthlyBaseSalary(7000.0);
            dto.setExperienceLevel("SENIOR");

            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.updateJobPosition(positionId, dto))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("not found");
        }
    }

    // ==================== deleteJobPosition ====================

    @Nested
    @DisplayName("deleteJobPosition")
    class DeleteJobPosition {

        @Test
        @DisplayName("Should delete position with no employees")
        void deleteJobPosition_success() {
            JobPosition position = mock(JobPosition.class);
            when(position.getPositionName()).thenReturn("Old Position");
            when(position.getDepartment()).thenReturn(department);
            when(position.getEmployees()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.existsById(positionId)).thenReturn(true);
            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(position));

            service.deleteJobPosition(positionId);

            verify(jobPositionRepository).deleteById(positionId);
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Job Position Deleted"), anyString(), any(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should throw when position not found")
        void deleteJobPosition_notFound() {
            when(jobPositionRepository.existsById(positionId)).thenReturn(false);

            assertThatThrownBy(() -> service.deleteJobPosition(positionId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should throw when position has active employees")
        void deleteJobPosition_hasEmployees() {
            Employee emp = mock(Employee.class);
            JobPosition position = mock(JobPosition.class);
            when(position.getPositionName()).thenReturn("Busy Position");
            when(position.getDepartment()).thenReturn(department);
            when(position.getEmployees()).thenReturn(List.of(emp));

            when(jobPositionRepository.existsById(positionId)).thenReturn(true);
            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(position));

            assertThatThrownBy(() -> service.deleteJobPosition(positionId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot delete");
        }
    }

    // ==================== getJobPositionById ====================

    @Nested
    @DisplayName("getJobPositionById")
    class GetJobPositionById {

        @Test
        @DisplayName("Should return entity when found")
        void getJobPositionById_found() {
            JobPosition position = mock(JobPosition.class);
            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(position));

            JobPosition result = service.getJobPositionById(positionId);

            assertThat(result).isEqualTo(position);
        }

        @Test
        @DisplayName("Should throw when not found")
        void getJobPositionById_notFound() {
            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getJobPositionById(positionId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not found");
        }
    }

    // ==================== getEmployeesByJobPositionId ====================

    @Nested
    @DisplayName("getEmployeesByJobPositionId")
    class GetEmployeesByJobPositionId {

        @Test
        @DisplayName("Should return employee summaries")
        void getEmployeesByJobPositionId_withEmployees() {
            JobPosition position = mock(JobPosition.class);
            when(position.getPositionName()).thenReturn("Engineer");

            Employee emp = mock(Employee.class);
            when(emp.getId()).thenReturn(UUID.randomUUID());
            when(emp.getFirstName()).thenReturn("John");
            when(emp.getLastName()).thenReturn("Doe");
            when(emp.getFullName()).thenReturn("John Doe");
            when(emp.getStatus()).thenReturn("ACTIVE");
            when(emp.getMonthlySalary()).thenReturn(new BigDecimal("5000"));
            when(emp.getJobPosition()).thenReturn(position);
            when(position.getContractType()).thenReturn(JobPosition.ContractType.MONTHLY);
            when(position.getDepartment()).thenReturn(department);

            when(position.getEmployees()).thenReturn(List.of(emp));
            when(jobPositionRepository.findByIdWithEmployees(positionId)).thenReturn(Optional.of(position));

            List<EmployeeSummaryDTO> result = service.getEmployeesByJobPositionId(positionId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getFullName()).isEqualTo("John Doe");
        }

        @Test
        @DisplayName("Should return empty list when no employees")
        void getEmployeesByJobPositionId_empty() {
            JobPosition position = mock(JobPosition.class);
            when(position.getPositionName()).thenReturn("New Position");
            when(position.getEmployees()).thenReturn(Collections.emptyList());

            when(jobPositionRepository.findByIdWithEmployees(positionId)).thenReturn(Optional.of(position));

            List<EmployeeSummaryDTO> result = service.getEmployeesByJobPositionId(positionId);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should throw when position not found")
        void getEmployeesByJobPositionId_notFound() {
            when(jobPositionRepository.findByIdWithEmployees(positionId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getEmployeesByJobPositionId(positionId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not found");
        }
    }

    // ==================== canDeletePosition ====================

    @Nested
    @DisplayName("canDeletePosition")
    class CanDeletePosition {

        @Test
        @DisplayName("Should return canDelete=true when no employees")
        void canDeletePosition_canDelete() {
            JobPosition position = mock(JobPosition.class);
            when(position.getEmployees()).thenReturn(Collections.emptyList());
            when(position.getVacancies()).thenReturn(Collections.emptyList());
            when(position.getPendingPromotionsFrom()).thenReturn(Collections.emptyList());
            when(position.getPendingPromotionsTo()).thenReturn(Collections.emptyList());
            when(position.getPromotionsFromCount()).thenReturn(0L);
            when(position.getPromotionsToCount()).thenReturn(0L);

            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(position));

            Map<String, Object> result = service.canDeletePosition(positionId);

            assertThat(result.get("canDelete")).isEqualTo(true);
            assertThat((List<?>) result.get("blockingReasons")).isEmpty();
        }

        @Test
        @DisplayName("Should return canDelete=false when has employees")
        void canDeletePosition_cannotDelete() {
            Employee emp = mock(Employee.class);
            JobPosition position = mock(JobPosition.class);
            when(position.getEmployees()).thenReturn(List.of(emp));
            when(position.getVacancies()).thenReturn(Collections.emptyList());
            when(position.getPendingPromotionsFrom()).thenReturn(Collections.emptyList());
            when(position.getPendingPromotionsTo()).thenReturn(Collections.emptyList());
            when(position.getPromotionsFromCount()).thenReturn(0L);
            when(position.getPromotionsToCount()).thenReturn(0L);

            when(jobPositionRepository.findById(positionId)).thenReturn(Optional.of(position));

            Map<String, Object> result = service.canDeletePosition(positionId);

            assertThat(result.get("canDelete")).isEqualTo(false);
            assertThat((List<?>) result.get("blockingReasons")).isNotEmpty();
            assertThat(result.get("employeeCount")).isEqualTo(1);
        }
    }
}