package com.example.backend.services.hr;

import com.example.backend.dto.hr.SalaryStatisticsDTO;
import com.example.backend.dto.hr.employee.EmployeeDistributionDTO;
import com.example.backend.dto.hr.employee.EmployeeRequestDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HREmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private MinioService minioService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private HREmployeeService hrEmployeeService;

    private Employee employee1;
    private Employee employee2;
    private JobPosition jobPosition;
    private Department department;
    private Site site;

    @BeforeEach
    void setUp() {
        department = new Department();
        department.setId(UUID.randomUUID());
        department.setName("Engineering");

        jobPosition = JobPosition.builder()
                .id(UUID.randomUUID())
                .positionName("Software Engineer")
                .department(department)
                .contractType(JobPosition.ContractType.MONTHLY)
                .baseSalary(5000.0)
                .monthlyBaseSalary(5000.0)
                .build();

        site = Site.builder()
                .id(UUID.randomUUID())
                .name("Main Site")
                .build();

        employee1 = Employee.builder()
                .id(UUID.randomUUID())
                .firstName("John")
                .lastName("Doe")
                .jobPosition(jobPosition)
                .baseSalaryOverride(BigDecimal.valueOf(6000))
                .status("ACTIVE")
                .site(site)
                .photoUrl("photo1.jpg")
                .idFrontImage("front1.jpg")
                .idBackImage("back1.jpg")
                .build();

        employee2 = Employee.builder()
                .id(UUID.randomUUID())
                .firstName("Jane")
                .lastName("Smith")
                .jobPosition(jobPosition)
                .baseSalaryOverride(BigDecimal.valueOf(7000))
                .status("ACTIVE")
                .site(site)
                .build();
    }

    @Nested
    @DisplayName("getSalaryStatistics")
    class GetSalaryStatistics {

        @Test
        @DisplayName("should calculate salary statistics with employees")
        void shouldCalculateStatisticsWithEmployees() {
            when(employeeRepository.findAll()).thenReturn(List.of(employee1, employee2));

            SalaryStatisticsDTO result = hrEmployeeService.getSalaryStatistics();

            assertThat(result).isNotNull();
            assertThat(result.getEmployeeCount()).isEqualTo(2);
            assertThat(result.getMinSalary()).isEqualByComparingTo(BigDecimal.valueOf(6000));
            assertThat(result.getMaxSalary()).isEqualByComparingTo(BigDecimal.valueOf(7000));
            assertThat(result.getTotalSalaries()).isEqualByComparingTo(BigDecimal.valueOf(13000));
            assertThat(result.getDepartmentAverageSalaries()).containsKey("Engineering");
            verify(employeeRepository).findAll();
        }

        @Test
        @DisplayName("should handle empty employee list")
        void shouldHandleEmptyList() {
            when(employeeRepository.findAll()).thenReturn(Collections.emptyList());

            SalaryStatisticsDTO result = hrEmployeeService.getSalaryStatistics();

            assertThat(result).isNotNull();
            assertThat(result.getEmployeeCount()).isEqualTo(0);
            assertThat(result.getAverageSalary()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getDepartmentAverageSalaries()).isEmpty();
        }

        @Test
        @DisplayName("should rethrow exception and send error notification")
        void shouldRethrowExceptionAndNotify() {
            when(employeeRepository.findAll()).thenThrow(new RuntimeException("DB error"));

            assertThatThrownBy(() -> hrEmployeeService.getSalaryStatistics())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("DB error");

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Salary Statistics Error"),
                    contains("DB error"),
                    eq(NotificationType.ERROR),
                    anyString(),
                    anyString()
            );
        }
    }

    @Nested
    @DisplayName("getEmployeeDistribution")
    class GetEmployeeDistribution {

        @Test
        @DisplayName("should return distribution with employees")
        void shouldReturnDistribution() {
            when(employeeRepository.findAll()).thenReturn(List.of(employee1, employee2));

            List<EmployeeDistributionDTO> result = hrEmployeeService.getEmployeeDistribution();

            assertThat(result).isNotEmpty();
            assertThat(result.get(0).getTotalEmployees()).isEqualTo(2);
        }

        @Test
        @DisplayName("should return empty list when no employees")
        void shouldReturnEmptyWhenNoEmployees() {
            when(employeeRepository.findAll()).thenReturn(Collections.emptyList());

            List<EmployeeDistributionDTO> result = hrEmployeeService.getEmployeeDistribution();

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("addEmployee")
    class AddEmployee {

        @Test
        @DisplayName("should create employee with job position and site")
        void shouldCreateEmployeeSuccessfully() {
            UUID jobPosId = jobPosition.getId();
            UUID siteId = site.getId();

            EmployeeRequestDTO dto = EmployeeRequestDTO.builder()
                    .firstName("New")
                    .lastName("Employee")
                    .jobPositionId(jobPosId)
                    .siteId(siteId)
                    .status("ACTIVE")
                    .build();

            when(jobPositionRepository.findById(jobPosId)).thenReturn(Optional.of(jobPosition));
            when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.EMPLOYEE)).thenReturn("EMP-001");
            when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> {
                Employee e = inv.getArgument(0);
                e.setId(UUID.randomUUID());
                return e;
            });

            Map<String, Object> result = hrEmployeeService.addEmployee(dto, null, null, null);

            assertThat(result).isNotNull();
            assertThat(result.get("firstName")).isEqualTo("New");
            verify(employeeRepository).save(any(Employee.class));
            verify(entityIdGeneratorService).generateNextId(EntityTypeConfig.EMPLOYEE);
            verify(notificationService, atLeastOnce()).sendNotificationToHRUsers(
                    eq("New Employee Added"), anyString(), eq(NotificationType.SUCCESS), anyString(), anyString()
            );
        }

        @Test
        @DisplayName("should throw when job position not found")
        void shouldThrowWhenJobPositionNotFound() {
            UUID jobPosId = UUID.randomUUID();
            EmployeeRequestDTO dto = EmployeeRequestDTO.builder()
                    .firstName("Test")
                    .lastName("User")
                    .jobPositionId(jobPosId)
                    .status("ACTIVE")
                    .build();

            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.EMPLOYEE)).thenReturn("EMP-002");
            when(jobPositionRepository.findById(jobPosId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hrEmployeeService.addEmployee(dto, null, null, null))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Job position not found");
        }

        @Test
        @DisplayName("should throw when site not found")
        void shouldThrowWhenSiteNotFound() {
            UUID siteId = UUID.randomUUID();
            EmployeeRequestDTO dto = EmployeeRequestDTO.builder()
                    .firstName("Test")
                    .lastName("User")
                    .siteId(siteId)
                    .status("ACTIVE")
                    .build();

            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.EMPLOYEE)).thenReturn("EMP-003");
            when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hrEmployeeService.addEmployee(dto, null, null, null))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Site not found");
        }
    }

    @Nested
    @DisplayName("updateEmployee")
    class UpdateEmployee {

        @Test
        @DisplayName("should update existing employee successfully")
        void shouldUpdateSuccessfully() {
            UUID empId = employee1.getId();
            EmployeeRequestDTO dto = EmployeeRequestDTO.builder()
                    .firstName("Updated")
                    .lastName("Name")
                    .status("ACTIVE")
                    .build();

            when(employeeRepository.findById(empId)).thenReturn(Optional.of(employee1));
            when(employeeRepository.save(any(Employee.class))).thenReturn(employee1);

            Map<String, Object> result = hrEmployeeService.updateEmployee(empId, dto, null, null, null);

            assertThat(result).isNotNull();
            verify(employeeRepository).findById(empId);
            verify(employeeRepository).save(any(Employee.class));
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenNotFound() {
            UUID empId = UUID.randomUUID();
            EmployeeRequestDTO dto = EmployeeRequestDTO.builder()
                    .firstName("Test")
                    .lastName("User")
                    .status("ACTIVE")
                    .build();

            when(employeeRepository.findById(empId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hrEmployeeService.updateEmployee(empId, dto, null, null, null))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");
        }
    }

    @Nested
    @DisplayName("getEmployeeById")
    class GetEmployeeById {

        @Test
        @DisplayName("should return employee when found")
        void shouldReturnEmployee() {
            UUID empId = employee1.getId();
            when(employeeRepository.findByIdWithDetails(empId)).thenReturn(Optional.of(employee1));

            Map<String, Object> result = hrEmployeeService.getEmployeeById(empId);

            assertThat(result).isNotNull();
            assertThat(result.get("firstName")).isEqualTo("John");
            assertThat(result.get("lastName")).isEqualTo("Doe");
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenNotFound() {
            UUID empId = UUID.randomUUID();
            when(employeeRepository.findByIdWithDetails(empId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hrEmployeeService.getEmployeeById(empId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");
        }
    }

    @Nested
    @DisplayName("deleteEmployee")
    class DeleteEmployee {

        @Test
        @DisplayName("should delete employee with images")
        void shouldDeleteWithImages() {
            UUID empId = employee1.getId();
            when(employeeRepository.findById(empId)).thenReturn(Optional.of(employee1));

            hrEmployeeService.deleteEmployee(empId);

            verify(minioService).deleteFile("photo1.jpg");
            verify(minioService).deleteFile("front1.jpg");
            verify(minioService).deleteFile("back1.jpg");
            verify(employeeRepository).delete(employee1);
            verify(notificationService, atLeastOnce()).sendNotificationToHRUsers(
                    eq("Employee Record Deleted"), anyString(), eq(NotificationType.ERROR), anyString(), anyString()
            );
        }

        @Test
        @DisplayName("should delete employee without images")
        void shouldDeleteWithoutImages() {
            UUID empId = employee2.getId();
            when(employeeRepository.findById(empId)).thenReturn(Optional.of(employee2));

            hrEmployeeService.deleteEmployee(empId);

            verify(minioService, never()).deleteFile(anyString());
            verify(employeeRepository).delete(employee2);
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenNotFound() {
            UUID empId = UUID.randomUUID();
            when(employeeRepository.findById(empId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hrEmployeeService.deleteEmployee(empId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");
        }

        @Test
        @DisplayName("should still delete employee when image deletion fails")
        void shouldDeleteEvenIfImageDeletionFails() {
            UUID empId = employee1.getId();
            when(employeeRepository.findById(empId)).thenReturn(Optional.of(employee1));
            doThrow(new RuntimeException("MinIO error")).when(minioService).deleteFile("photo1.jpg");

            hrEmployeeService.deleteEmployee(empId);

            verify(employeeRepository).delete(employee1);
        }
    }
}