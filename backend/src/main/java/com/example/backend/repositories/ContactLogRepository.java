package com.example.backend.repositories;

import com.example.backend.models.ContactLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ContactLogRepository extends JpaRepository<ContactLog, UUID> {
    
    // Find contact logs by maintenance record
    List<ContactLog> findByMaintenanceRecordIdOrderByContactDateDesc(UUID maintenanceRecordId);
    
    // Find contact logs by maintenance step
    List<ContactLog> findByMaintenanceStepIdOrderByContactDateDesc(UUID maintenanceStepId);
    
    // Find contact logs by contact person
    List<ContactLog> findByContactPersonContainingIgnoreCase(String contactPerson);
    
    // Find contact logs by status
    List<ContactLog> findByContactStatus(ContactLog.ContactStatus contactStatus);
    
    // Find contact logs that need follow-up
    List<ContactLog> findByFollowUpRequiredTrueAndFollowUpDateBefore(LocalDateTime date);
    
    // Find overdue follow-ups
    @Query("SELECT cl FROM ContactLog cl WHERE cl.followUpRequired = true AND cl.followUpDate < :now")
    List<ContactLog> findOverdueFollowUps(@Param("now") LocalDateTime now);
    
    // Find contact logs within date range
    @Query("SELECT cl FROM ContactLog cl WHERE cl.contactDate BETWEEN :startDate AND :endDate")
    List<ContactLog> findByContactDateBetween(@Param("startDate") LocalDateTime startDate, 
                                             @Param("endDate") LocalDateTime endDate);
    
    // Find contact logs by contact method
    List<ContactLog> findByContactMethod(String contactMethod);
    
    // Find contact logs that received response
    List<ContactLog> findByResponseReceivedTrue();
    
    // Find contact logs that didn't receive response
    List<ContactLog> findByResponseReceivedFalse();
    
    // Get contact statistics by method
    @Query("SELECT cl.contactMethod, COUNT(cl), " +
           "SUM(CASE WHEN cl.responseReceived = true THEN 1 ELSE 0 END) " +
           "FROM ContactLog cl GROUP BY cl.contactMethod")
    List<Object[]> getContactStatisticsByMethod();
    
    // Get contact statistics by person
    @Query("SELECT cl.contactPerson, COUNT(cl), " +
           "SUM(CASE WHEN cl.responseReceived = true THEN 1 ELSE 0 END) " +
           "FROM ContactLog cl GROUP BY cl.contactPerson")
    List<Object[]> getContactStatisticsByPerson();
    
    // Get contact statistics by status
    @Query("SELECT cl.contactStatus, COUNT(cl) FROM ContactLog cl GROUP BY cl.contactStatus")
    List<Object[]> getContactStatisticsByStatus();
    
    // Find recent contacts (last 7 days)
    @Query("SELECT cl FROM ContactLog cl WHERE cl.contactDate >= :sevenDaysAgo")
    List<ContactLog> findRecentContacts(@Param("sevenDaysAgo") LocalDateTime sevenDaysAgo);
    
    // Find contacts that need immediate follow-up (within 24 hours)
    @Query("SELECT cl FROM ContactLog cl WHERE cl.followUpRequired = true AND " +
           "cl.followUpDate BETWEEN :now AND :twentyFourHoursLater")
    List<ContactLog> findContactsNeedingImmediateFollowUp(@Param("now") LocalDateTime now, 
                                                         @Param("twentyFourHoursLater") LocalDateTime twentyFourHoursLater);
    
    // Get contact success rate by maintenance record
    @Query("SELECT cl.maintenanceRecord.id, COUNT(cl), " +
           "SUM(CASE WHEN cl.responseReceived = true THEN 1 ELSE 0 END), " +
           "CAST(SUM(CASE WHEN cl.responseReceived = true THEN 1 ELSE 0 END) AS FLOAT) / COUNT(cl) * 100 " +
           "FROM ContactLog cl GROUP BY cl.maintenanceRecord.id")
    List<Object[]> getContactSuccessRateByMaintenanceRecord();
    
    // Find contacts by maintenance record and date range
    @Query("SELECT cl FROM ContactLog cl WHERE cl.maintenanceRecord.id = :recordId AND " +
           "cl.contactDate BETWEEN :startDate AND :endDate ORDER BY cl.contactDate DESC")
    List<ContactLog> findByMaintenanceRecordIdAndContactDateBetween(@Param("recordId") UUID recordId,
                                                                   @Param("startDate") LocalDateTime startDate,
                                                                   @Param("endDate") LocalDateTime endDate);
} 