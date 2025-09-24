package com.example.backend.repositories.hr;

import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.models.hr.LeaveRequest.LeaveStatus;
import com.example.backend.models.hr.LeaveRequest.LeaveType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    // Find by employee
    List<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
    
    Page<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId, Pageable pageable);

    // Find by status
    List<LeaveRequest> findByStatusOrderByCreatedAtDesc(LeaveStatus status);
    
    Page<LeaveRequest> findByStatusOrderByCreatedAtDesc(LeaveStatus status, Pageable pageable);

    // Find by employee and status
    List<LeaveRequest> findByEmployeeIdAndStatus(UUID employeeId, LeaveStatus status);

    // Find by leave type
    List<LeaveRequest> findByLeaveTypeOrderByCreatedAtDesc(LeaveType leaveType);

    // Find by date range
    @Query("SELECT lr FROM LeaveRequest lr WHERE " +
           "(lr.startDate <= :endDate AND lr.endDate >= :startDate)")
    List<LeaveRequest> findByDateRange(@Param("startDate") LocalDate startDate, 
                                     @Param("endDate") LocalDate endDate);

    // Find overlapping requests for an employee
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.id = :employeeId AND " +
           "lr.status IN :statuses AND " +
           "(lr.startDate <= :endDate AND lr.endDate >= :startDate)")
    List<LeaveRequest> findOverlappingRequests(@Param("employeeId") UUID employeeId,
                                             @Param("startDate") LocalDate startDate,
                                             @Param("endDate") LocalDate endDate,
                                             @Param("statuses") List<LeaveStatus> statuses);

    // Find pending requests by department
    @Query("SELECT lr FROM LeaveRequest lr JOIN lr.employee e JOIN e.jobPosition jp " +
           "WHERE jp.department.id = :departmentId AND lr.status = 'PENDING' " +
           "ORDER BY lr.createdAt DESC")
    List<LeaveRequest> findPendingRequestsByDepartment(@Param("departmentId") UUID departmentId);

    // Find requests by date range and status
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = :status AND " +
           "lr.startDate >= :fromDate AND lr.endDate <= :toDate " +
           "ORDER BY lr.startDate")
    List<LeaveRequest> findByStatusAndDateRange(@Param("status") LeaveStatus status,
                                              @Param("fromDate") LocalDate fromDate,
                                              @Param("toDate") LocalDate toDate);

    // Count pending requests by employee
    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.employee.id = :employeeId AND lr.status = 'PENDING'")
    long countPendingRequestsByEmployee(@Param("employeeId") UUID employeeId);

    // Find requests requiring attention (pending > X days)
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = 'PENDING' AND " +
           "lr.createdAt < :cutoffDate ORDER BY lr.createdAt")
    List<LeaveRequest> findStaleRequests(@Param("cutoffDate") LocalDateTime cutoffDate);

    // Analytics queries
    @Query("SELECT lr.leaveType, COUNT(lr) FROM LeaveRequest lr WHERE " +
           "lr.createdAt >= :fromDate AND lr.createdAt <= :toDate " +
           "GROUP BY lr.leaveType")
    List<Object[]> getLeaveTypeStatistics(@Param("fromDate") LocalDateTime fromDate,
                                        @Param("toDate") LocalDateTime toDate);

    @Query("SELECT MONTH(lr.startDate), COUNT(lr) FROM LeaveRequest lr WHERE " +
           "lr.status = 'APPROVED' AND YEAR(lr.startDate) = :year " +
           "GROUP BY MONTH(lr.startDate) ORDER BY MONTH(lr.startDate)")
    List<Object[]> getMonthlyLeaveStatistics(@Param("year") int year);
}