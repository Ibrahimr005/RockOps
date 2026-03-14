package com.example.backend.services.hr;

import com.example.backend.dto.hr.attendance.AttendanceRequestDTO;
import com.example.backend.dto.hr.attendance.AttendanceResponseDTO;
import com.example.backend.dto.hr.attendance.BulkAttendanceDTO;
import com.example.backend.dto.hr.employee.EmployeeMonthlyAttendanceDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AttendanceService attendanceService;

    private UUID siteId;
    private UUID employeeId;
    private Employee activeEmployee;
    private JobPosition monthlyPosition;
    private JobPosition hourlyPosition;
    private JobPosition dailyPosition;
    private Department department;

    @BeforeEach
    void setUp() {
        siteId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        department = new Department();
        department.setName("Engineering");

        monthlyPosition = new JobPosition();
        monthlyPosition.setContractType(JobPosition.ContractType.MONTHLY);
        monthlyPosition.setPositionName("Software Engineer");
        monthlyPosition.setDepartment(department);
        monthlyPosition.setStartTime(LocalTime.of(9, 0));
        monthlyPosition.setWorkingHours(8);

        hourlyPosition = new JobPosition();
        hourlyPosition.setContractType(JobPosition.ContractType.HOURLY);
        hourlyPosition.setPositionName("Technician");
        hourlyPosition.setDepartment(department);
        hourlyPosition.setHoursPerShift(8);
        hourlyPosition.setStartTime(LocalTime.of(8, 0));

        dailyPosition = new JobPosition();
        dailyPosition.setContractType(JobPosition.ContractType.DAILY);
        dailyPosition.setPositionName("Laborer");
        dailyPosition.setDepartment(department);
        dailyPosition.setStartTime(LocalTime.of(7, 0));

        activeEmployee = new Employee();
        activeEmployee.setId(employeeId);
        activeEmployee.setStatus("ACTIVE");
        activeEmployee.setJobPosition(monthlyPosition);
        activeEmployee.setFirstName("John");
        activeEmployee.setLastName("Doe");
    }

    // =========================================================================
    // generateMonthlyAttendanceSheet
    // =========================================================================
    @Nested
    @DisplayName("generateMonthlyAttendanceSheet")
    class GenerateMonthlyAttendanceSheet {

        @Test
        @DisplayName("should generate attendance for active employees with job positions")
        void shouldGenerateForActiveEmployeesWithJobPosition() {
            // February 2026 has 28 days
            int year = 2026;
            int month = 2;
            LocalDate startDate = LocalDate.of(year, month, 1);
            LocalDate endDate = LocalDate.of(year, month, 28);

            when(employeeRepository.findBySiteId(siteId)).thenReturn(List.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDateRange(eq(employeeId), eq(startDate), eq(endDate)))
                    .thenReturn(Collections.emptyList());
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> {
                Attendance a = invocation.getArgument(0);
                a.setId(UUID.randomUUID());
                return a;
            });

            List<EmployeeMonthlyAttendanceDTO> result =
                    attendanceService.generateMonthlyAttendanceSheet(siteId, year, month);

            assertThat(result).hasSize(1);
            EmployeeMonthlyAttendanceDTO dto = result.get(0);
            assertThat(dto.getEmployeeId()).isEqualTo(employeeId);
            assertThat(dto.getYear()).isEqualTo(year);
            assertThat(dto.getMonth()).isEqualTo(month);
            assertThat(dto.getTotalDays()).isEqualTo(28);
            verify(attendanceRepository, atLeastOnce()).save(any(Attendance.class));
        }

        @Test
        @DisplayName("should skip attendance creation for employee without job position")
        void shouldSkipEmployeeWithoutJobPosition() {
            Employee noPositionEmployee = new Employee();
            noPositionEmployee.setId(UUID.randomUUID());
            noPositionEmployee.setStatus("ACTIVE");
            noPositionEmployee.setJobPosition(null);
            noPositionEmployee.setFirstName("Jane");
            noPositionEmployee.setLastName("Smith");

            when(employeeRepository.findBySiteId(siteId)).thenReturn(List.of(noPositionEmployee));
            when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                    .thenReturn(Collections.emptyList());

            List<EmployeeMonthlyAttendanceDTO> result =
                    attendanceService.generateMonthlyAttendanceSheet(siteId, 2026, 1);

            assertThat(result).hasSize(1);
            // No attendance records saved because employee has no job position
            verify(attendanceRepository, never()).save(any(Attendance.class));
        }

        @Test
        @DisplayName("should return empty list when no active employees exist")
        void shouldReturnEmptyListForNoEmployees() {
            when(employeeRepository.findBySiteId(siteId)).thenReturn(Collections.emptyList());

            List<EmployeeMonthlyAttendanceDTO> result =
                    attendanceService.generateMonthlyAttendanceSheet(siteId, 2026, 3);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should filter out inactive employees")
        void shouldFilterOutInactiveEmployees() {
            Employee inactiveEmployee = new Employee();
            inactiveEmployee.setId(UUID.randomUUID());
            inactiveEmployee.setStatus("INACTIVE");
            inactiveEmployee.setFirstName("Bob");
            inactiveEmployee.setLastName("Inactive");

            when(employeeRepository.findBySiteId(siteId)).thenReturn(List.of(inactiveEmployee));

            List<EmployeeMonthlyAttendanceDTO> result =
                    attendanceService.generateMonthlyAttendanceSheet(siteId, 2026, 3);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should send error notification and rethrow on exception")
        void shouldSendErrorNotificationOnException() {
            when(employeeRepository.findBySiteId(siteId)).thenThrow(new RuntimeException("DB error"));

            assertThatThrownBy(() -> attendanceService.generateMonthlyAttendanceSheet(siteId, 2026, 3))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("DB error");

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Attendance Sheet Generation Failed"),
                    contains("DB error"),
                    eq(NotificationType.ERROR),
                    eq("/hr/attendance"),
                    anyString()
            );
        }
    }

    // =========================================================================
    // updateAttendance
    // =========================================================================
    @Nested
    @DisplayName("updateAttendance")
    class UpdateAttendance {

        @Test
        @DisplayName("should update attendance for MONTHLY employee")
        void shouldUpdateForMonthlyEmployee() {
            LocalDate date = LocalDate.of(2026, 3, 10); // Tuesday
            AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .checkIn(LocalTime.of(9, 0))
                    .checkOut(LocalTime.of(17, 0))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            AttendanceResponseDTO result = attendanceService.updateAttendance(requestDTO);

            assertThat(result).isNotNull();
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
            verify(attendanceRepository).save(any(Attendance.class));
        }

        @Test
        @DisplayName("should update attendance for HOURLY employee")
        void shouldUpdateForHourlyEmployee() {
            activeEmployee.setJobPosition(hourlyPosition);
            LocalDate date = LocalDate.of(2026, 3, 10);
            AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .hoursWorked(10.0)
                    .checkIn(LocalTime.of(8, 0))
                    .checkOut(LocalTime.of(18, 0))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .expectedHours(8.0)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            AttendanceResponseDTO result = attendanceService.updateAttendance(requestDTO);

            assertThat(result).isNotNull();
            verify(attendanceRepository).save(any(Attendance.class));
        }

        @Test
        @DisplayName("should update attendance for DAILY employee")
        void shouldUpdateForDailyEmployee() {
            activeEmployee.setJobPosition(dailyPosition);
            LocalDate date = LocalDate.of(2026, 3, 10);
            AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .checkIn(LocalTime.of(7, 0))
                    .checkOut(LocalTime.of(15, 0))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            AttendanceResponseDTO result = attendanceService.updateAttendance(requestDTO);

            assertThat(result).isNotNull();
            verify(attendanceRepository).save(any(Attendance.class));
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenEmployeeNotFound() {
            UUID unknownId = UUID.randomUUID();
            AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                    .employeeId(unknownId)
                    .date(LocalDate.of(2026, 3, 10))
                    .status("PRESENT")
                    .build();

            when(employeeRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> attendanceService.updateAttendance(requestDTO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Attendance Update Failed"),
                    anyString(),
                    eq(NotificationType.ERROR),
                    anyString(),
                    anyString()
            );
        }

        @Test
        @DisplayName("should detect late arrival for monthly employee")
        void shouldDetectLateArrival() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            // Start time is 9:00, grace is 15 min, so 9:16+ is late
            AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .checkIn(LocalTime.of(9, 30))
                    .checkOut(LocalTime.of(17, 30))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            AttendanceResponseDTO result = attendanceService.updateAttendance(requestDTO);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo("LATE");
        }

        @Test
        @DisplayName("should calculate overtime for monthly employee working extra hours")
        void shouldCalculateOvertimeForMonthly() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            // Working 9:00 to 19:00 = 10 hours raw, minus 1 hour break = 9 hours. Expected 8 -> overtime = 1
            AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .checkIn(LocalTime.of(9, 0))
                    .checkOut(LocalTime.of(19, 0))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            AttendanceResponseDTO result = attendanceService.updateAttendance(requestDTO);

            assertThat(result).isNotNull();
            assertThat(result.getOvertimeHours()).isGreaterThan(0.0);
        }
    }

    // =========================================================================
    // bulkUpdateAttendance
    // =========================================================================
    @Nested
    @DisplayName("bulkUpdateAttendance")
    class BulkUpdateAttendance {

        @Test
        @DisplayName("should process all records successfully")
        void shouldProcessAllSuccessfully() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            AttendanceRequestDTO record = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .build();

            BulkAttendanceDTO bulkDTO = BulkAttendanceDTO.builder()
                    .date(date)
                    .attendanceRecords(List.of(record))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            List<AttendanceResponseDTO> results = attendanceService.bulkUpdateAttendance(bulkDTO);

            assertThat(results).hasSize(1);
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Bulk Attendance Update Completed"),
                    anyString(),
                    eq(NotificationType.SUCCESS),
                    anyString(),
                    anyString()
            );
        }

        @Test
        @DisplayName("should handle partial errors gracefully")
        void shouldHandlePartialErrors() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            UUID unknownEmployeeId = UUID.randomUUID();

            AttendanceRequestDTO goodRecord = AttendanceRequestDTO.builder()
                    .employeeId(employeeId)
                    .date(date)
                    .status("PRESENT")
                    .build();

            AttendanceRequestDTO badRecord = AttendanceRequestDTO.builder()
                    .employeeId(unknownEmployeeId)
                    .date(date)
                    .status("PRESENT")
                    .build();

            BulkAttendanceDTO bulkDTO = BulkAttendanceDTO.builder()
                    .date(date)
                    .attendanceRecords(List.of(goodRecord, badRecord))
                    .build();

            Attendance existingAttendance = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(employeeRepository.findById(unknownEmployeeId)).thenReturn(Optional.empty());
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existingAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            List<AttendanceResponseDTO> results = attendanceService.bulkUpdateAttendance(bulkDTO);

            assertThat(results).hasSize(1);
            // Should send warning notification since there were errors
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Bulk Attendance Update Completed with Errors"),
                    anyString(),
                    eq(NotificationType.WARNING),
                    anyString(),
                    anyString()
            );
        }
    }

    // =========================================================================
    // getEmployeeAttendanceHistory
    // =========================================================================
    @Test
    @DisplayName("getEmployeeAttendanceHistory should delegate to repository")
    void shouldReturnAttendanceHistory() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        Attendance attendance = Attendance.builder()
                .id(UUID.randomUUID())
                .employee(activeEmployee)
                .date(LocalDate.of(2026, 1, 15))
                .status(Attendance.AttendanceStatus.PRESENT)
                .build();

        when(attendanceRepository.findByEmployeeIdAndDateRange(employeeId, start, end))
                .thenReturn(List.of(attendance));

        List<Attendance> result = attendanceService.getEmployeeAttendanceHistory(employeeId, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmployee()).isEqualTo(activeEmployee);
    }

    // =========================================================================
    // deleteAttendance
    // =========================================================================
    @Nested
    @DisplayName("deleteAttendance")
    class DeleteAttendance {

        @Test
        @DisplayName("should delete and send success notification")
        void shouldDeleteSuccessfully() {
            UUID attendanceId = UUID.randomUUID();
            doNothing().when(attendanceRepository).deleteById(attendanceId);

            attendanceService.deleteAttendance(attendanceId);

            verify(attendanceRepository).deleteById(attendanceId);
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Attendance Record Deleted"),
                    anyString(),
                    eq(NotificationType.INFO),
                    anyString(),
                    anyString()
            );
        }

        @Test
        @DisplayName("should send error notification and rethrow on exception")
        void shouldSendErrorNotificationOnException() {
            UUID attendanceId = UUID.randomUUID();
            doThrow(new RuntimeException("Delete failed")).when(attendanceRepository).deleteById(attendanceId);

            assertThatThrownBy(() -> attendanceService.deleteAttendance(attendanceId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Delete failed");

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Attendance Deletion Failed"),
                    contains("Delete failed"),
                    eq(NotificationType.ERROR),
                    anyString(),
                    anyString()
            );
        }
    }

    // =========================================================================
    // markLeaveDay
    // =========================================================================
    @Nested
    @DisplayName("markLeaveDay")
    class MarkLeaveDay {

        @Test
        @DisplayName("should create new attendance record for leave when none exists")
        void shouldCreateNewAttendanceForLeave() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.empty());
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            attendanceService.markLeaveDay(employeeId, date, "SICK", true);

            verify(attendanceRepository).save(argThat(attendance ->
                    attendance.getStatus() == Attendance.AttendanceStatus.ON_LEAVE
                            && "SICK".equals(attendance.getLeaveType())
                            && attendance.getLeaveApproved()
            ));
        }

        @Test
        @DisplayName("should update existing attendance record for leave")
        void shouldUpdateExistingAttendanceForLeave() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            Attendance existing = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.PRESENT)
                    .dayType(Attendance.DayType.WORKING_DAY)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(activeEmployee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(existing));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            attendanceService.markLeaveDay(employeeId, date, "VACATION", false);

            verify(attendanceRepository).save(argThat(attendance ->
                    attendance.getStatus() == Attendance.AttendanceStatus.ON_LEAVE
                            && "VACATION".equals(attendance.getLeaveType())
                            && !attendance.getLeaveApproved()
            ));
        }
    }

    // =========================================================================
    // removeLeaveMarking
    // =========================================================================
    @Nested
    @DisplayName("removeLeaveMarking")
    class RemoveLeaveMarking {

        @Test
        @DisplayName("should revert ON_LEAVE record to ABSENT")
        void shouldRevertOnLeaveToAbsent() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            Attendance onLeave = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ON_LEAVE)
                    .leaveType("SICK")
                    .leaveApproved(true)
                    .build();

            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(onLeave));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

            attendanceService.removeLeaveMarking(employeeId, date);

            verify(attendanceRepository).save(argThat(attendance ->
                    attendance.getStatus() == Attendance.AttendanceStatus.ABSENT
                            && attendance.getLeaveType() == null
                            && attendance.getLeaveApproved() == null
            ));
        }

        @Test
        @DisplayName("should not modify non-leave record")
        void shouldNotModifyNonLeaveRecord() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            Attendance presentRecord = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(activeEmployee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.PRESENT)
                    .build();

            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.of(presentRecord));

            attendanceService.removeLeaveMarking(employeeId, date);

            verify(attendanceRepository, never()).save(any(Attendance.class));
        }

        @Test
        @DisplayName("should do nothing when no record found")
        void shouldDoNothingWhenNoRecord() {
            LocalDate date = LocalDate.of(2026, 3, 10);
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date))
                    .thenReturn(Optional.empty());

            attendanceService.removeLeaveMarking(employeeId, date);

            verify(attendanceRepository, never()).save(any(Attendance.class));
        }
    }

    // =========================================================================
    // getMonthlyAttendanceForUnassignedEmployees
    // =========================================================================
    @Test
    @DisplayName("getMonthlyAttendanceForUnassignedEmployees should return attendance for unassigned employees")
    void shouldReturnForUnassignedEmployees() {
        Employee unassigned = new Employee();
        unassigned.setId(UUID.randomUUID());
        unassigned.setStatus("ACTIVE");
        unassigned.setJobPosition(monthlyPosition);
        unassigned.setFirstName("Unassigned");
        unassigned.setLastName("Employee");

        when(employeeRepository.findBySiteIsNull()).thenReturn(List.of(unassigned));
        when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> {
            Attendance a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        List<EmployeeMonthlyAttendanceDTO> result =
                attendanceService.getMonthlyAttendanceForUnassignedEmployees(2026, 2);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmployeeId()).isEqualTo(unassigned.getId());
    }

    // =========================================================================
    // getAllEmployeesMonthlyAttendance
    // =========================================================================
    @Test
    @DisplayName("getAllEmployeesMonthlyAttendance should return attendance for all active employees")
    void shouldReturnForAllActiveEmployees() {
        Employee emp1 = new Employee();
        emp1.setId(UUID.randomUUID());
        emp1.setStatus("ACTIVE");
        emp1.setJobPosition(monthlyPosition);
        emp1.setFirstName("Alice");
        emp1.setLastName("A");

        Employee emp2 = new Employee();
        emp2.setId(UUID.randomUUID());
        emp2.setStatus("ACTIVE");
        emp2.setJobPosition(hourlyPosition);
        emp2.setFirstName("Bob");
        emp2.setLastName("B");

        when(employeeRepository.findAll()).thenReturn(List.of(emp1, emp2));
        when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> {
            Attendance a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        List<EmployeeMonthlyAttendanceDTO> result =
                attendanceService.getAllEmployeesMonthlyAttendance(2026, 2);

        assertThat(result).hasSize(2);
    }

    // =========================================================================
    // getEmployeeMonthlyAttendance
    // =========================================================================
    @Test
    @DisplayName("getEmployeeMonthlyAttendance should return response DTOs")
    void shouldReturnEmployeeMonthlyAttendance() {
        Attendance attendance = Attendance.builder()
                .id(UUID.randomUUID())
                .employee(activeEmployee)
                .date(LocalDate.of(2026, 3, 10))
                .status(Attendance.AttendanceStatus.PRESENT)
                .dayType(Attendance.DayType.WORKING_DAY)
                .checkIn(LocalTime.of(9, 0))
                .checkOut(LocalTime.of(17, 0))
                .build();

        when(attendanceRepository.findByEmployeeIdAndDateRange(eq(employeeId), any(), any()))
                .thenReturn(List.of(attendance));

        List<AttendanceResponseDTO> result =
                attendanceService.getEmployeeMonthlyAttendance(employeeId, 2026, 3);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo("PRESENT");
    }
}