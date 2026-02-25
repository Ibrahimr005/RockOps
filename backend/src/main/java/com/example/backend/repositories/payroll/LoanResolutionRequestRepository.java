package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.LoanResolutionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanResolutionRequestRepository extends JpaRepository<LoanResolutionRequest, UUID> {

    List<LoanResolutionRequest> findByStatus(LoanResolutionRequest.ResolutionStatus status);

    List<LoanResolutionRequest> findByStatusAndSiteId(LoanResolutionRequest.ResolutionStatus status, UUID siteId);

    List<LoanResolutionRequest> findByLoanId(UUID loanId);

    List<LoanResolutionRequest> findByEmployeeId(UUID employeeId);

    @Query("SELECT COUNT(r) > 0 FROM LoanResolutionRequest r " +
            "WHERE r.loan.id = :loanId AND r.status IN ('PENDING_HR', 'PENDING_FINANCE')")
    boolean existsPendingForLoan(@Param("loanId") UUID loanId);
}
