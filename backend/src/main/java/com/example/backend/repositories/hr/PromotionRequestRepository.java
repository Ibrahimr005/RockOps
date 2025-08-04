package com.example.backend.repositories.hr;

import com.example.backend.models.hr.PromotionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PromotionRequestRepository extends JpaRepository<PromotionRequest, UUID> {

    // Find by status
    List<PromotionRequest> findByStatusOrderByCreatedAtDesc(PromotionRequest.PromotionStatus status);

    // Find by employee
    List<PromotionRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    // Find by status and employee
    List<PromotionRequest> findByStatusAndEmployeeIdOrderByCreatedAtDesc(
            PromotionRequest.PromotionStatus status, UUID employeeId);

    // Find by requester
    List<PromotionRequest> findByRequestedByOrderByCreatedAtDesc(String requestedBy);

    // Find all ordered by creation date
    List<PromotionRequest> findAllByOrderByCreatedAtDesc();

    // Find approved promotions ready for implementation
    List<PromotionRequest> findByStatusAndActualEffectiveDateLessThanEqualOrderByActualEffectiveDate(
            PromotionRequest.PromotionStatus status, LocalDate date);

    // Find overdue approved promotions
    List<PromotionRequest> findByStatusAndActualEffectiveDateLessThanOrderByActualEffectiveDate(
            PromotionRequest.PromotionStatus status, LocalDate date);

    // Count methods for statistics
    long countByStatus(PromotionRequest.PromotionStatus status);

    // Find by priority
    List<PromotionRequest> findByPriorityOrderByCreatedAtDesc(PromotionRequest.PromotionPriority priority);

    // Find pending high priority requests
    List<PromotionRequest> findByStatusAndPriorityOrderByCreatedAtDesc(
            PromotionRequest.PromotionStatus status, PromotionRequest.PromotionPriority priority);

    // Find promotions by department (current position)
    @Query("SELECT pr FROM PromotionRequest pr WHERE pr.currentJobPosition.department.id = :departmentId ORDER BY pr.createdAt DESC")
    List<PromotionRequest> findByCurrentDepartmentIdOrderByCreatedAtDesc(@Param("departmentId") UUID departmentId);

    // Find promotions to department (promoted position)
    @Query("SELECT pr FROM PromotionRequest pr WHERE pr.promotedToJobPosition.department.id = :departmentId ORDER BY pr.createdAt DESC")
    List<PromotionRequest> findByPromotedToDepartmentIdOrderByCreatedAtDesc(@Param("departmentId") UUID departmentId);

    // Find interdepartmental promotions
    @Query("SELECT pr FROM PromotionRequest pr WHERE pr.currentJobPosition.department.id != pr.promotedToJobPosition.department.id ORDER BY pr.createdAt DESC")
    List<PromotionRequest> findInterdepartmentalPromotionsOrderByCreatedAtDesc();

    // Find promotions within date range
    @Query("SELECT pr FROM PromotionRequest pr WHERE pr.createdAt >= :startDate AND pr.createdAt <= :endDate ORDER BY pr.createdAt DESC")
    List<PromotionRequest> findByCreatedAtBetweenOrderByCreatedAtDesc(
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate);

    // Find promotions with salary increase above threshold
    @Query("SELECT pr FROM PromotionRequest pr WHERE (pr.proposedSalary - pr.currentSalary) > :threshold ORDER BY (pr.proposedSalary - pr.currentSalary) DESC")
    List<PromotionRequest> findBySalaryIncreaseGreaterThan(@Param("threshold") java.math.BigDecimal threshold);

    // Find promotions by reviewer
    List<PromotionRequest> findByReviewedByOrderByReviewedAtDesc(String reviewedBy);

    // Find employee's recent promotion history
    @Query("SELECT pr FROM PromotionRequest pr WHERE pr.employee.id = :employeeId AND pr.status = 'IMPLEMENTED' ORDER BY pr.implementedAt DESC")
    List<PromotionRequest> findEmployeePromotionHistory(@Param("employeeId") UUID employeeId);

    // Check if employee has pending promotion request
    @Query("SELECT COUNT(pr) > 0 FROM PromotionRequest pr WHERE pr.employee.id = :employeeId AND pr.status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')")
    boolean hasActivePendingRequest(@Param("employeeId") UUID employeeId);

    // Find promotions requiring training
    List<PromotionRequest> findByRequiresAdditionalTrainingTrueAndStatusOrderByCreatedAtDesc(
            PromotionRequest.PromotionStatus status);

    // Statistics queries
    @Query("SELECT COUNT(pr) FROM PromotionRequest pr WHERE pr.createdAt >= :startDate AND pr.createdAt <= :endDate")
    long countPromotionRequestsInPeriod(
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate);

    @Query("SELECT COUNT(pr) FROM PromotionRequest pr WHERE pr.status = 'IMPLEMENTED' AND pr.implementedAt >= :startDate AND pr.implementedAt <= :endDate")
    long countImplementedPromotionsInPeriod(
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate);

    // Advanced queries for analytics
    @Query("SELECT pr.currentJobPosition.department.name, COUNT(pr) FROM PromotionRequest pr WHERE pr.status = 'IMPLEMENTED' GROUP BY pr.currentJobPosition.department.name ORDER BY COUNT(pr) DESC")
    List<Object[]> getPromotionCountBySourceDepartment();

    @Query("SELECT pr.promotedToJobPosition.department.name, COUNT(pr) FROM PromotionRequest pr WHERE pr.status = 'IMPLEMENTED' GROUP BY pr.promotedToJobPosition.department.name ORDER BY COUNT(pr) DESC")
    List<Object[]> getPromotionCountByTargetDepartment();

    @Query("SELECT AVG(pr.proposedSalary - pr.currentSalary) FROM PromotionRequest pr WHERE pr.status = 'IMPLEMENTED'")
    java.math.BigDecimal getAverageSalaryIncrease();
}