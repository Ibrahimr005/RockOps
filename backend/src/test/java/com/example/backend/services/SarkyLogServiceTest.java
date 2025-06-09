package com.example.backend.services;

import com.example.backend.dto.equipment.SarkyLogDTO;
import com.example.backend.dto.equipment.SarkyLogResponseDTO;
import com.example.backend.dto.equipment.DailySarkySummaryDTO;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.SarkyLog;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.models.hr.Employee;
import com.example.backend.repositories.equipment.SarkyLogRepository;
import com.example.backend.services.equipment.SarkyLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test class for enhanced SarkyLogService functionality.
 * Tests the multiple entries per day feature and date continuity logic.
 */
@ExtendWith(MockitoExtension.class)
public class SarkyLogServiceTest {

    @Mock
    private SarkyLogRepository sarkyLogRepository;

    @InjectMocks
    private SarkyLogService sarkyLogService;

    @Test
    public void testMultipleEntriesPerDay() {
        // Given
        UUID equipmentId = UUID.randomUUID();
        LocalDate testDate = LocalDate.of(2024, 1, 15);
        
        // Create mock sarky logs for the same date
        SarkyLog log1 = createMockSarkyLog(equipmentId, testDate, "Excavation", "John Doe", 8.0);
        SarkyLog log2 = createMockSarkyLog(equipmentId, testDate, "Transport", "Jane Smith", 4.0);
        
        List<SarkyLog> logsForDate = Arrays.asList(log1, log2);
        
        when(sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, testDate))
            .thenReturn(logsForDate);
        
        // When
        List<SarkyLogResponseDTO> result = sarkyLogService.getSarkyLogsByEquipmentIdAndDate(equipmentId, testDate);
        
        // Then
        assertEquals(2, result.size());
        // Verify both entries are for the same date
        assertTrue(result.stream().allMatch(entry -> entry.getDate().equals(testDate)));
    }

    @Test
    public void testDailySummary() {
        // Given
        UUID equipmentId = UUID.randomUUID();
        LocalDate testDate = LocalDate.of(2024, 1, 15);
        
        SarkyLog log1 = createMockSarkyLog(equipmentId, testDate, "Excavation", "John Doe", 8.0);
        SarkyLog log2 = createMockSarkyLog(equipmentId, testDate, "Transport", "Jane Smith", 4.0);
        SarkyLog log3 = createMockSarkyLog(equipmentId, testDate, "Excavation", "Bob Wilson", 6.0);
        
        List<SarkyLog> logsForDate = Arrays.asList(log1, log2, log3);
        
        when(sarkyLogRepository.findByEquipmentIdAndDate(equipmentId, testDate))
            .thenReturn(logsForDate);
        
        // When
        DailySarkySummaryDTO summary = sarkyLogService.getDailySarkySummary(equipmentId, testDate);
        
        // Then
        assertEquals(equipmentId, summary.getEquipmentId());
        assertEquals(testDate, summary.getDate());
        assertEquals(3, summary.getTotalEntries());
        assertEquals(18.0, summary.getTotalHours(), 0.01); // 8 + 4 + 6 = 18
        
        // Verify work type breakdown
        assertEquals(14.0, summary.getWorkTypeBreakdown().get("Excavation"), 0.01); // 8 + 6 = 14
        assertEquals(4.0, summary.getWorkTypeBreakdown().get("Transport"), 0.01);
        
        // Verify driver breakdown
        assertEquals(8.0, summary.getDriverBreakdown().get("John Doe"), 0.01);
        assertEquals(4.0, summary.getDriverBreakdown().get("Jane Smith"), 0.01);
        assertEquals(6.0, summary.getDriverBreakdown().get("Bob Wilson"), 0.01);
    }

    private SarkyLog createMockSarkyLog(UUID equipmentId, LocalDate date, String workTypeName, String driverName, Double hours) {
        SarkyLog log = new SarkyLog();
        log.setId(UUID.randomUUID());
        log.setDate(date);
        log.setWorkedHours(hours);
        
        // Mock equipment
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        log.setEquipment(equipment);
        
        // Mock work type
        WorkType workType = new WorkType();
        workType.setId(UUID.randomUUID());
        workType.setName(workTypeName);
        log.setWorkType(workType);
        
        // Mock driver
        Employee driver = new Employee();
        driver.setId(UUID.randomUUID());
        String[] nameParts = driverName.split(" ");
        driver.setFirstName(nameParts[0]);
        driver.setLastName(nameParts.length > 1 ? nameParts[1] : "");
        log.setDriver(driver);
        
        return log;
    }
} 