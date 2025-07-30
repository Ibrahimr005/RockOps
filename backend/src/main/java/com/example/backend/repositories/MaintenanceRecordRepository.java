package com.example.backend.repositories;

import com.example.backend.models.MaintenanceRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaintenanceRecordRepository extends JpaRepository<MaintenanceRecord, UUID> {
    
    // Find records by equipment
    List<MaintenanceRecord> findByEquipmentIdOrderByCreationDateDesc(UUID equipmentId);
    
    // Find records by status
    List<MaintenanceRecord> findByStatusOrderByCreationDateDesc(MaintenanceRecord.MaintenanceStatus status);
    
    // Find active records
    List<MaintenanceRecord> findByStatus(MaintenanceRecord.MaintenanceStatus status);
    
    // Find overdue records
    @Query("SELECT r FROM MaintenanceRecord r WHERE r.status = 'ACTIVE' AND r.expectedCompletionDate < :now")
    List<MaintenanceRecord> findOverdueRecords(@Param("now") LocalDateTime now);
    
    // Find records by responsible person
    List<MaintenanceRecord> findByCurrentResponsibleContactId(UUID contactId);
    
    // Find records by equipment info (partial match)
    List<MaintenanceRecord> findByEquipmentInfoContainingIgnoreCase(String equipmentInfo);
    
    // Find records by creation date range
    List<MaintenanceRecord> findByCreationDateBetweenOrderByCreationDateDesc(
            LocalDateTime startDate, LocalDateTime endDate);
    
    // Find records by completion date range
    List<MaintenanceRecord> findByActualCompletionDateBetweenOrderByActualCompletionDateDesc(
            LocalDateTime startDate, LocalDateTime endDate);
    
    // Find records with pagination
    Page<MaintenanceRecord> findByStatus(MaintenanceRecord.MaintenanceStatus status, Pageable pageable);
    
    // Find records by equipment with pagination
    Page<MaintenanceRecord> findByEquipmentId(UUID equipmentId, Pageable pageable);
    
    // Count records by status
    long countByStatus(MaintenanceRecord.MaintenanceStatus status);
    
    // Count records by equipment
    long countByEquipmentId(UUID equipmentId);
    
    // Find records that need attention (overdue or about to be overdue)
    @Query("SELECT r FROM MaintenanceRecord r WHERE r.status = 'ACTIVE' AND " +
           "(r.expectedCompletionDate < :now OR r.expectedCompletionDate BETWEEN :now AND :twentyFourHoursLater)")
    List<MaintenanceRecord> findRecordsNeedingAttention(@Param("now") LocalDateTime now, 
                                                       @Param("twentyFourHoursLater") LocalDateTime twentyFourHoursLater);
    
    // Find records by cost range
    @Query("SELECT r FROM MaintenanceRecord r WHERE r.totalCost BETWEEN :minCost AND :maxCost")
    List<MaintenanceRecord> findByCostRange(@Param("minCost") java.math.BigDecimal minCost, 
                                           @Param("maxCost") java.math.BigDecimal maxCost);
    
    // Get total cost by status
    @Query("SELECT r.status, SUM(r.totalCost) FROM MaintenanceRecord r GROUP BY r.status")
    List<Object[]> getTotalCostByStatus();
    
    // Find records by equipment type (requires join with equipment table)
    @Query("SELECT r FROM MaintenanceRecord r JOIN Equipment e ON r.equipmentId = e.id " +
           "WHERE e.type.id = :equipmentTypeId")
    List<MaintenanceRecord> findByEquipmentTypeId(@Param("equipmentTypeId") UUID equipmentTypeId);
    
    // Find records by site (requires join with equipment table)
    @Query("SELECT r FROM MaintenanceRecord r JOIN Equipment e ON r.equipmentId = e.id " +
           "WHERE e.site.id = :siteId")
    List<MaintenanceRecord> findBySiteId(@Param("siteId") UUID siteId);
    
    // Find records that haven't been updated recently
    @Query("SELECT r FROM MaintenanceRecord r WHERE r.status = 'ACTIVE' AND " +
           "r.lastUpdated < :lastUpdateThreshold")
    List<MaintenanceRecord> findStaleRecords(@Param("lastUpdateThreshold") LocalDateTime lastUpdateThreshold);
    
    // Get maintenance statistics
    @Query("SELECT COUNT(r), AVG(r.totalCost), MIN(r.totalCost), MAX(r.totalCost) " +
           "FROM MaintenanceRecord r WHERE r.status = 'COMPLETED'")
    Object[] getMaintenanceStatistics();
    
    // Find records by maintenance type (if applicable)
    @Query("SELECT r FROM MaintenanceRecord r WHERE r.initialIssueDescription LIKE %:maintenanceType%")
    List<MaintenanceRecord> findByMaintenanceType(@Param("maintenanceType") String maintenanceType);
    
    // Find records by priority (if priority field exists)
    @Query("SELECT r FROM MaintenanceRecord r WHERE r.expectedCompletionDate <= :priorityDate")
    List<MaintenanceRecord> findHighPriorityRecords(@Param("priorityDate") LocalDateTime priorityDate);
} 