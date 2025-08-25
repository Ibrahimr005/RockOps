package com.example.backend.repositories;

import com.example.backend.models.MaintenanceStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaintenanceStepRepository extends JpaRepository<MaintenanceStep, UUID> {
    
    // Find steps by maintenance record
    List<MaintenanceStep> findByMaintenanceRecordIdOrderByStartDateAsc(UUID maintenanceRecordId);
    
    // Find active steps (not completed)
    List<MaintenanceStep> findByMaintenanceRecordIdAndActualEndDateIsNullOrderByStartDateAsc(UUID maintenanceRecordId);
    
    // Find completed steps
    List<MaintenanceStep> findByMaintenanceRecordIdAndActualEndDateIsNotNullOrderByStartDateAsc(UUID maintenanceRecordId);
    
    // Find current step for a maintenance record
    @Query("SELECT s FROM MaintenanceStep s WHERE s.maintenanceRecord.id = :recordId AND s.actualEndDate IS NULL ORDER BY s.startDate DESC LIMIT 1")
    Optional<MaintenanceStep> findCurrentStepByMaintenanceRecordId(@Param("recordId") UUID recordId);
    
    // Find overdue steps
    @Query("SELECT s FROM MaintenanceStep s WHERE s.actualEndDate IS NULL AND s.expectedEndDate < :now")
    List<MaintenanceStep> findOverdueSteps(@Param("now") LocalDateTime now);
    
    // Find steps by responsible contact
    List<MaintenanceStep> findByResponsibleContactId(UUID contactId);
    
    // Find steps by type
    List<MaintenanceStep> findByStepType(MaintenanceStep.StepType stepType);
    
    // Find steps that need follow-up (no contact in last 3 days)
    @Query("SELECT s FROM MaintenanceStep s WHERE s.actualEndDate IS NULL AND " +
           "(s.lastContactDate IS NULL OR s.lastContactDate < :threeDaysAgo)")
    List<MaintenanceStep> findStepsNeedingFollowUp(@Param("threeDaysAgo") LocalDateTime threeDaysAgo);
    
    // Find steps by location
    List<MaintenanceStep> findByFromLocationContainingIgnoreCaseOrToLocationContainingIgnoreCase(
            String fromLocation, String toLocation);
    
    // Find steps by cost range
    @Query("SELECT s FROM MaintenanceStep s WHERE s.stepCost BETWEEN :minCost AND :maxCost")
    List<MaintenanceStep> findByCostRange(@Param("minCost") java.math.BigDecimal minCost, 
                                         @Param("maxCost") java.math.BigDecimal maxCost);
    
    // Find steps by date range
    List<MaintenanceStep> findByStartDateBetweenOrderByStartDateDesc(
            LocalDateTime startDate, LocalDateTime endDate);
    
    // Find completed steps by date range
    List<MaintenanceStep> findByActualEndDateBetweenOrderByActualEndDateDesc(
            LocalDateTime startDate, LocalDateTime endDate);
    
    // Count steps by type
    @Query("SELECT s.stepType, COUNT(s) FROM MaintenanceStep s GROUP BY s.stepType")
    List<Object[]> countStepsByType();
    
    // Get total cost by step type
    @Query("SELECT s.stepType, SUM(s.stepCost) FROM MaintenanceStep s GROUP BY s.stepType")
    List<Object[]> getTotalCostByStepType();
    
    // Find steps that haven't been contacted recently
    @Query("SELECT s FROM MaintenanceStep s WHERE s.actualEndDate IS NULL AND " +
           "(s.lastContactDate IS NULL OR s.lastContactDate < :lastContactThreshold)")
    List<MaintenanceStep> findStepsNeedingContact(@Param("lastContactThreshold") LocalDateTime lastContactThreshold);
    
    // Find steps by maintenance record and type
    List<MaintenanceStep> findByMaintenanceRecordIdAndStepTypeOrderByStartDateAsc(UUID maintenanceRecordId, 
                                                                                 MaintenanceStep.StepType stepType);
    
    // Get steps with longest duration
    @Query(value = "SELECT * FROM maintenance_steps WHERE actual_end_date IS NOT NULL " +
           "ORDER BY EXTRACT(EPOCH FROM (actual_end_date - start_date)) DESC", 
           nativeQuery = true)
    List<MaintenanceStep> findStepsByLongestDuration();
    
    // Get steps that are about to be overdue (within 24 hours)
    @Query("SELECT s FROM MaintenanceStep s WHERE s.actualEndDate IS NULL AND " +
           "s.expectedEndDate BETWEEN :now AND :twentyFourHoursLater")
    List<MaintenanceStep> findStepsAboutToBeOverdue(@Param("now") LocalDateTime now, 
                                                   @Param("twentyFourHoursLater") LocalDateTime twentyFourHoursLater);
    
    // Find steps by responsible contact with pagination
    @Query("SELECT s FROM MaintenanceStep s WHERE s.responsibleContact.id = :contactId")
    List<MaintenanceStep> findByResponsibleContactIdWithPagination(@Param("contactId") UUID contactId);
    
    // Get step statistics
    @Query("SELECT COUNT(s), AVG(s.stepCost), MIN(s.stepCost), MAX(s.stepCost) " +
           "FROM MaintenanceStep s WHERE s.actualEndDate IS NOT NULL")
    Object[] getStepStatistics();
    
    // Find steps by maintenance record with status filter
    @Query("SELECT s FROM MaintenanceStep s WHERE s.maintenanceRecord.id = :recordId AND " +
           "(:completed IS NULL OR CASE WHEN :completed = true THEN s.actualEndDate IS NOT NULL ELSE s.actualEndDate IS NULL END)")
    List<MaintenanceStep> findByMaintenanceRecordIdAndCompletionStatus(
            @Param("recordId") UUID recordId, @Param("completed") Boolean completed);
} 