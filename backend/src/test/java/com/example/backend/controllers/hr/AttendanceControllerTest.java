package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.attendance.AttendanceRequestDTO;
import com.example.backend.dto.hr.attendance.AttendanceResponseDTO;
import com.example.backend.dto.hr.attendance.BulkAttendanceDTO;
import com.example.backend.dto.hr.employee.EmployeeMonthlyAttendanceDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.services.hr.AttendanceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AttendanceController.class)
@AutoConfigureMockMvc(addFilters = false)
public class AttendanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AttendanceService attendanceService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/attendance
    // -----------------------------------------------------------------------

    @Test
    void getAttendance_happyPath_returns200() throws Exception {
        UUID siteId = UUID.randomUUID();
        EmployeeMonthlyAttendanceDTO dto = new EmployeeMonthlyAttendanceDTO();

        given(attendanceService.getMonthlyAttendance(eq(siteId), anyInt(), anyInt()))
                .willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/attendance")
                        .param("date", "2026-03-01")
                        .param("siteId", siteId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getAttendance_missingParam_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/attendance")
                        .param("date", "2026-03-01"))
                // siteId is missing – Spring binds UUID from required @RequestParam
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/attendance/monthly
    // -----------------------------------------------------------------------

    @Test
    void getMonthlyAttendance_specificSite_returns200() throws Exception {
        UUID siteId = UUID.randomUUID();
        given(attendanceService.getMonthlyAttendance(eq(siteId), eq(2026), eq(3)))
                .willReturn(List.of(new EmployeeMonthlyAttendanceDTO()));

        mockMvc.perform(get("/api/v1/attendance/monthly")
                        .param("siteId", siteId.toString())
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isOk());
    }

    @Test
    void getMonthlyAttendance_noSite_returns200() throws Exception {
        given(attendanceService.getMonthlyAttendanceForUnassignedEmployees(2026, 3))
                .willReturn(List.of());

        mockMvc.perform(get("/api/v1/attendance/monthly")
                        .param("siteId", "no-site")
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isOk());
    }

    @Test
    void getMonthlyAttendance_allSites_returns200() throws Exception {
        given(attendanceService.getAllEmployeesMonthlyAttendance(2026, 3))
                .willReturn(List.of());

        mockMvc.perform(get("/api/v1/attendance/monthly")
                        .param("siteId", "all")
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isOk());
    }

    @Test
    void getMonthlyAttendance_invalidUuid_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/attendance/monthly")
                        .param("siteId", "not-a-uuid")
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMonthlyAttendance_serviceThrows_returns500() throws Exception {
        UUID siteId = UUID.randomUUID();
        given(attendanceService.getMonthlyAttendance(eq(siteId), anyInt(), anyInt()))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/attendance/monthly")
                        .param("siteId", siteId.toString())
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/attendance
    // -----------------------------------------------------------------------

    @Test
    void updateAttendance_happyPath_returns200() throws Exception {
        AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                .employeeId(UUID.randomUUID())
                .date(LocalDate.of(2026, 3, 1))
                .status("PRESENT")
                .build();

        AttendanceResponseDTO responseDTO = new AttendanceResponseDTO();
        given(attendanceService.updateAttendance(any(AttendanceRequestDTO.class)))
                .willReturn(responseDTO);

        mockMvc.perform(put("/api/v1/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void updateAttendance_serviceThrows_returns400() throws Exception {
        AttendanceRequestDTO requestDTO = AttendanceRequestDTO.builder()
                .employeeId(UUID.randomUUID())
                .date(LocalDate.of(2026, 3, 1))
                .build();

        given(attendanceService.updateAttendance(any(AttendanceRequestDTO.class)))
                .willThrow(new RuntimeException("Employee not found"));

        mockMvc.perform(put("/api/v1/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Employee not found"));
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/attendance/bulk
    // -----------------------------------------------------------------------

    @Test
    void bulkSaveAttendance_happyPath_returns200() throws Exception {
        AttendanceRequestDTO record = AttendanceRequestDTO.builder()
                .employeeId(UUID.randomUUID())
                .date(LocalDate.of(2026, 3, 1))
                .status("PRESENT")
                .build();

        BulkAttendanceDTO bulkDTO = BulkAttendanceDTO.builder()
                .date(LocalDate.of(2026, 3, 1))
                .siteId(UUID.randomUUID())
                .attendanceRecords(List.of(record))
                .build();

        AttendanceResponseDTO responseDTO = new AttendanceResponseDTO();
        given(attendanceService.bulkUpdateAttendance(any(BulkAttendanceDTO.class)))
                .willReturn(List.of(responseDTO));

        mockMvc.perform(post("/api/v1/attendance/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bulkDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.processed").value(1));
    }

    @Test
    void bulkSaveAttendance_serviceThrows_returns400() throws Exception {
        BulkAttendanceDTO bulkDTO = BulkAttendanceDTO.builder()
                .attendanceRecords(List.of())
                .build();

        given(attendanceService.bulkUpdateAttendance(any(BulkAttendanceDTO.class)))
                .willThrow(new RuntimeException("Bulk save failed"));

        mockMvc.perform(post("/api/v1/attendance/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bulkDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bulk save failed"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/attendance/summary
    // -----------------------------------------------------------------------

    @Test
    void getAttendanceSummary_happyPath_returns200() throws Exception {
        UUID siteId = UUID.randomUUID();
        EmployeeMonthlyAttendanceDTO dto = new EmployeeMonthlyAttendanceDTO();

        given(attendanceService.getMonthlyAttendance(eq(siteId), anyInt(), anyInt()))
                .willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/attendance/summary")
                        .param("date", "2026-03-01")
                        .param("siteId", siteId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEmployees").exists());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/attendance/employee/{employeeId}
    // -----------------------------------------------------------------------

    @Test
    void getEmployeeAttendance_happyPath_returns200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(attendanceService.getEmployeeAttendanceHistory(
                eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                .willReturn(List.of(new Attendance()));

        mockMvc.perform(get("/api/v1/attendance/employee/{employeeId}", employeeId)
                        .param("startDate", "2026-03-01")
                        .param("endDate", "2026-03-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/attendance/employee/{employeeId}/monthly
    // -----------------------------------------------------------------------

    @Test
    void getEmployeeMonthlyAttendance_happyPath_returns200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(attendanceService.getEmployeeMonthlyAttendance(eq(employeeId), eq(2026), eq(3)))
                .willReturn(List.of(new AttendanceResponseDTO()));

        mockMvc.perform(get("/api/v1/attendance/employee/{employeeId}/monthly", employeeId)
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // DELETE /api/v1/attendance/{id}
    // -----------------------------------------------------------------------

    @Test
    void deleteAttendance_happyPath_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(attendanceService).deleteAttendance(id);

        mockMvc.perform(delete("/api/v1/attendance/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteAttendance_serviceThrows_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("Record not found"))
                .given(attendanceService).deleteAttendance(id);

        mockMvc.perform(delete("/api/v1/attendance/{id}", id))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Record not found"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/attendance/health
    // -----------------------------------------------------------------------

    @Test
    void health_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/attendance/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.service").value("Attendance API"));
    }
}