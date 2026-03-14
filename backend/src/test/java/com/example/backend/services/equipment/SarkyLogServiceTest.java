package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.DailySarkySummaryDTO;
import com.example.backend.dto.equipment.SarkyLogResponseDTO;
import com.example.backend.dto.equipment.SarkyLogRangeResponseDTO;
import com.example.backend.dto.equipment.SarkyValidationInfoDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.SarkyLog;
import com.example.backend.models.equipment.SarkyLogRange;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.models.hr.Employee;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.SarkyLogRangeRepository;
import com.example.backend.repositories.equipment.SarkyLogRepository;
import com.example.backend.repositories.equipment.WorkTypeRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SarkyLogServiceTest {

    @Mock
    private SarkyLogRepository sarkyLogRepository;

    @Mock
    private SarkyLogRangeRepository sarkyLogRangeRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private WorkTypeRepository workTypeRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private MinioService minioService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SarkyLogService sarkyLogService;

    // ==================== getSarkyLogsByEquipmentId ====================

    @Test
    public void getSarkyLogsByEquipmentId_shouldReturnLogs() {
        UUID equipmentId = UUID.randomUUID();
        SarkyLog log = createSarkyLog(equipmentId, LocalDate.now(), "Drilling", 8.0);

        when(sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId)).thenReturn(List.of(log));

        List<SarkyLogResponseDTO> result = sarkyLogService.getSarkyLogsByEquipmentId(equipmentId);

        assertEquals(1, result.size());
    }

    @Test
    public void getSarkyLogsByEquipmentId_empty_shouldReturnEmpty() {
        UUID equipmentId = UUID.randomUUID();
        when(sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId)).thenReturn(List.of());

        List<SarkyLogResponseDTO> result = sarkyLogService.getSarkyLogsByEquipmentId(equipmentId);

        assertTrue(result.isEmpty());
    }

    // ==================== getSarkyLogRangesByEquipmentId ====================

    @Test
    public void getSarkyLogRangesByEquipmentId_shouldReturnRanges() {
        UUID equipmentId = UUID.randomUUID();
        SarkyLogRange range = createSarkyLogRange(equipmentId);

        when(sarkyLogRangeRepository.findByEquipmentIdOrderByStartDateDesc(equipmentId)).thenReturn(List.of(range));

        List<SarkyLogRangeResponseDTO> result = sarkyLogService.getSarkyLogRangesByEquipmentId(equipmentId);

        assertEquals(1, result.size());
    }

    // ==================== getSarkyLogById ====================

    @Test
    public void getSarkyLogById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        SarkyLog log = createSarkyLog(UUID.randomUUID(), LocalDate.now(), "Drilling", 8.0);
        log.setId(id);

        when(sarkyLogRepository.findById(id)).thenReturn(Optional.of(log));

        SarkyLogResponseDTO result = sarkyLogService.getSarkyLogById(id);

        assertNotNull(result);
    }

    @Test
    public void getSarkyLogById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(sarkyLogRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sarkyLogService.getSarkyLogById(id));
    }

    // ==================== getSarkyLogRangeById ====================

    @Test
    public void getSarkyLogRangeById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        SarkyLogRange range = createSarkyLogRange(UUID.randomUUID());
        range.setId(id);

        when(sarkyLogRangeRepository.findById(id)).thenReturn(Optional.of(range));

        SarkyLogRangeResponseDTO result = sarkyLogService.getSarkyLogRangeById(id);

        assertNotNull(result);
    }

    @Test
    public void getSarkyLogRangeById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(sarkyLogRangeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sarkyLogService.getSarkyLogRangeById(id));
    }

    // ==================== deleteSarkyLog ====================

    @Test
    public void deleteSarkyLog_found_shouldDelete() throws Exception {
        UUID id = UUID.randomUUID();
        SarkyLog log = createSarkyLog(UUID.randomUUID(), LocalDate.now(), "Drilling", 8.0);
        log.setId(id);
        log.setFileUrl(null);

        when(sarkyLogRepository.findById(id)).thenReturn(Optional.of(log));

        sarkyLogService.deleteSarkyLog(id);

        verify(sarkyLogRepository).delete(log);
    }

    @Test
    public void deleteSarkyLog_withFile_shouldDeleteFileAndLog() throws Exception {
        UUID id = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();
        SarkyLog log = createSarkyLog(equipmentId, LocalDate.now(), "Drilling", 8.0);
        log.setId(id);
        log.setFileUrl("http://localhost:9000/rockops/equipment/file.pdf");

        when(sarkyLogRepository.findById(id)).thenReturn(Optional.of(log));

        sarkyLogService.deleteSarkyLog(id);

        verify(minioService).deleteEquipmentFile(eq(equipmentId), eq("sarky-" + id));
        verify(sarkyLogRepository).delete(log);
    }

    @Test
    public void deleteSarkyLog_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(sarkyLogRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sarkyLogService.deleteSarkyLog(id));
    }

    // ==================== deleteSarkyLogRange ====================

    @Test
    public void deleteSarkyLogRange_found_shouldDelete() throws Exception {
        UUID id = UUID.randomUUID();
        SarkyLogRange range = createSarkyLogRange(UUID.randomUUID());
        range.setId(id);
        range.setFileUrl(null);

        when(sarkyLogRangeRepository.findById(id)).thenReturn(Optional.of(range));

        sarkyLogService.deleteSarkyLogRange(id);

        verify(sarkyLogRangeRepository).delete(range);
    }

    @Test
    public void deleteSarkyLogRange_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(sarkyLogRangeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sarkyLogService.deleteSarkyLogRange(id));
    }

    // ==================== getSarkyLogsByEquipmentIdAndDate ====================

    @Test
    public void getSarkyLogsByEquipmentIdAndDate_shouldReturnMatching() {
        UUID equipmentId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 3, 10);
        SarkyLog log = createSarkyLog(equipmentId, date, "Drilling", 8.0);

        when(sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, date)).thenReturn(List.of(log));

        List<SarkyLogResponseDTO> result = sarkyLogService.getSarkyLogsByEquipmentIdAndDate(equipmentId, date);

        assertEquals(1, result.size());
    }

    // ==================== getSarkyLogsByEquipmentIdAndDateRange ====================

    @Test
    public void getSarkyLogsByEquipmentIdAndDateRange_shouldReturnMatching() {
        UUID equipmentId = UUID.randomUUID();
        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);
        SarkyLog log = createSarkyLog(equipmentId, LocalDate.of(2026, 3, 15), "Drilling", 8.0);

        when(sarkyLogRepository.findByEquipmentIdAndDateBetweenOrderByDateDesc(equipmentId, start, end))
                .thenReturn(List.of(log));

        List<SarkyLogResponseDTO> result = sarkyLogService.getSarkyLogsByEquipmentIdAndDateRange(equipmentId, start, end);

        assertEquals(1, result.size());
    }

    // ==================== getDailySarkySummary ====================

    @Test
    public void getDailySarkySummary_multipleEntries_shouldAggregate() {
        UUID equipmentId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 3, 10);

        SarkyLog log1 = createSarkyLog(equipmentId, date, "Drilling", 8.0);
        SarkyLog log2 = createSarkyLog(equipmentId, date, "Transport", 4.0);
        SarkyLog log3 = createSarkyLog(equipmentId, date, "Drilling", 6.0);

        when(sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, date))
                .thenReturn(List.of(log1, log2, log3));

        DailySarkySummaryDTO result = sarkyLogService.getDailySarkySummary(equipmentId, date);

        assertEquals(equipmentId, result.getEquipmentId());
        assertEquals(date, result.getDate());
        assertEquals(3, result.getTotalEntries());
        assertEquals(18.0, result.getTotalHours(), 0.01);
        assertEquals(14.0, result.getWorkTypeBreakdown().get("Drilling"), 0.01);
        assertEquals(4.0, result.getWorkTypeBreakdown().get("Transport"), 0.01);
    }

    @Test
    public void getDailySarkySummary_noEntries_shouldReturnZeros() {
        UUID equipmentId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 3, 10);

        when(sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, date)).thenReturn(List.of());

        DailySarkySummaryDTO result = sarkyLogService.getDailySarkySummary(equipmentId, date);

        assertEquals(0, result.getTotalEntries());
        assertEquals(0.0, result.getTotalHours(), 0.01);
    }

    // ==================== getExistingSarkyDatesForEquipment ====================

    @Test
    public void getExistingSarkyDatesForEquipment_shouldReturnDistinctSortedDates() {
        UUID equipmentId = UUID.randomUUID();
        LocalDate date1 = LocalDate.of(2026, 3, 1);
        LocalDate date2 = LocalDate.of(2026, 3, 2);

        SarkyLog log1 = createSarkyLog(equipmentId, date1, "Drilling", 8.0);
        SarkyLog log2 = createSarkyLog(equipmentId, date1, "Transport", 4.0);
        SarkyLog log3 = createSarkyLog(equipmentId, date2, "Drilling", 6.0);

        when(sarkyLogRepository.findByEquipmentIdOrderByDateAsc(equipmentId))
                .thenReturn(List.of(log1, log2, log3));

        List<LocalDate> result = sarkyLogService.getExistingSarkyDatesForEquipment(equipmentId);

        assertEquals(2, result.size());
        assertEquals(date1, result.get(0));
        assertEquals(date2, result.get(1));
    }

    // ==================== getSarkyValidationInfo ====================

    @Test
    public void getSarkyValidationInfo_withExistingLogs_shouldReturnInfo() {
        UUID equipmentId = UUID.randomUUID();
        LocalDate latestDate = LocalDate.of(2026, 3, 10);

        SarkyLog log = createSarkyLog(equipmentId, latestDate, "Drilling", 8.0);

        when(sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId))
                .thenReturn(List.of(log));
        when(sarkyLogRangeRepository.findLatestByEquipmentId(equipmentId))
                .thenReturn(List.of());
        when(sarkyLogRepository.findByEquipmentIdOrderByDateAsc(equipmentId))
                .thenReturn(List.of(log));

        SarkyValidationInfoDTO result = sarkyLogService.getSarkyValidationInfo(equipmentId);

        assertEquals(equipmentId, result.getEquipmentId());
        assertEquals(latestDate, result.getLatestDate());
        assertEquals(latestDate.plusDays(1), result.getNextAllowedDate());
        assertTrue(result.getCanAddToLatestDate());
    }

    @Test
    public void getSarkyValidationInfo_noLogs_shouldReturnNullLatest() {
        UUID equipmentId = UUID.randomUUID();

        when(sarkyLogRepository.findByEquipmentIdOrderByDateDesc(equipmentId))
                .thenReturn(List.of());
        when(sarkyLogRangeRepository.findLatestByEquipmentId(equipmentId))
                .thenReturn(List.of());
        when(sarkyLogRepository.findByEquipmentIdOrderByDateAsc(equipmentId))
                .thenReturn(List.of());

        SarkyValidationInfoDTO result = sarkyLogService.getSarkyValidationInfo(equipmentId);

        assertNull(result.getLatestDate());
        assertNull(result.getNextAllowedDate());
    }

    // ==================== Helpers ====================

    private SarkyLog createSarkyLog(UUID equipmentId, LocalDate date, String workTypeName, Double hours) {
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Test Equipment");
        equipment.setModel("Model X");

        WorkType workType = new WorkType();
        workType.setId(UUID.randomUUID());
        workType.setName(workTypeName);

        Employee driver = new Employee();
        driver.setId(UUID.randomUUID());
        driver.setFirstName("John");
        driver.setLastName("Doe");

        SarkyLog log = new SarkyLog();
        log.setId(UUID.randomUUID());
        log.setEquipment(equipment);
        log.setDate(date);
        log.setWorkType(workType);
        log.setWorkedHours(hours);
        log.setDriver(driver);
        return log;
    }

    private SarkyLogRange createSarkyLogRange(UUID equipmentId) {
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Test Equipment");
        equipment.setModel("Model X");

        SarkyLogRange range = new SarkyLogRange();
        range.setId(UUID.randomUUID());
        range.setEquipment(equipment);
        range.setStartDate(LocalDate.of(2026, 3, 1));
        range.setEndDate(LocalDate.of(2026, 3, 7));
        range.setWorkEntries(new ArrayList<>());
        return range;
    }
}