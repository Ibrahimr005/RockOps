package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.PayrollBatch;
import com.example.backend.models.payroll.PayrollStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollBatchRepository extends JpaRepository<PayrollBatch, UUID> {

    List<PayrollBatch> findByPayrollId(UUID payrollId);

    List<PayrollBatch> findByPayrollIdOrderByCreatedAtAsc(UUID payrollId);

    Optional<PayrollBatch> findByPayrollIdAndPaymentTypeId(UUID payrollId, UUID paymentTypeId);

    Optional<PayrollBatch> findByBatchNumber(String batchNumber);

    List<PayrollBatch> findByStatus(PayrollStatus status);

    @Query("SELECT pb FROM PayrollBatch pb WHERE pb.payroll.id = :payrollId AND pb.status = :status")
    List<PayrollBatch> findByPayrollIdAndStatus(@Param("payrollId") UUID payrollId, @Param("status") PayrollStatus status);

    @Query("SELECT pb FROM PayrollBatch pb WHERE pb.status IN :statuses ORDER BY pb.createdAt DESC")
    List<PayrollBatch> findByStatusIn(@Param("statuses") List<PayrollStatus> statuses);

    @Query("SELECT COUNT(pb) FROM PayrollBatch pb WHERE pb.payroll.id = :payrollId")
    long countByPayrollId(@Param("payrollId") UUID payrollId);

    @Query("SELECT COUNT(pb) FROM PayrollBatch pb WHERE pb.payroll.id = :payrollId AND pb.status = :status")
    long countByPayrollIdAndStatus(@Param("payrollId") UUID payrollId, @Param("status") PayrollStatus status);

    @Query("SELECT pb FROM PayrollBatch pb " +
           "JOIN FETCH pb.payroll p " +
           "JOIN FETCH pb.paymentType pt " +
           "WHERE pb.id = :id")
    Optional<PayrollBatch> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT pb FROM PayrollBatch pb " +
           "JOIN FETCH pb.paymentType pt " +
           "WHERE pb.payroll.id = :payrollId " +
           "ORDER BY pt.displayOrder ASC")
    List<PayrollBatch> findByPayrollIdWithPaymentType(@Param("payrollId") UUID payrollId);

    /**
     * Check if all batches for a payroll have reached a certain status
     */
    @Query("SELECT CASE WHEN COUNT(pb) = 0 THEN true ELSE false END " +
           "FROM PayrollBatch pb WHERE pb.payroll.id = :payrollId AND pb.status != :status")
    boolean allBatchesHaveStatus(@Param("payrollId") UUID payrollId, @Param("status") PayrollStatus status);

    /**
     * Check if any batch for a payroll has a certain status
     */
    @Query("SELECT CASE WHEN COUNT(pb) > 0 THEN true ELSE false END " +
           "FROM PayrollBatch pb WHERE pb.payroll.id = :payrollId AND pb.status = :status")
    boolean anyBatchHasStatus(@Param("payrollId") UUID payrollId, @Param("status") PayrollStatus status);

    /**
     * Get batch number sequence for a year
     */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(pb.batchNumber, 9, 6) AS int)), 0) " +
           "FROM PayrollBatch pb WHERE pb.batchNumber LIKE CONCAT('PB-', :year, '-%')")
    Integer getMaxBatchSequenceForYear(@Param("year") String year);
}
