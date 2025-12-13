package com.example.backend.repositories;

import com.example.backend.models.maintenance.DirectPurchaseStep;
import com.example.backend.models.maintenance.DirectPurchaseStepStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DirectPurchaseStepRepository extends JpaRepository<DirectPurchaseStep, UUID> {

    // Find steps by ticket
    List<DirectPurchaseStep> findByDirectPurchaseTicketIdOrderByStepNumberAsc(UUID ticketId);

    // Find step by ticket and step number
    Optional<DirectPurchaseStep> findByDirectPurchaseTicketIdAndStepNumber(UUID ticketId, Integer stepNumber);

    // Find by status
    List<DirectPurchaseStep> findByStatus(DirectPurchaseStepStatus status);

    // Find by ticket and status
    List<DirectPurchaseStep> findByDirectPurchaseTicketIdAndStatus(UUID ticketId, DirectPurchaseStepStatus status);

    // Count completed steps for a ticket
    @Query("SELECT COUNT(s) FROM DirectPurchaseStep s WHERE s.directPurchaseTicket.id = :ticketId AND s.status = 'COMPLETED'")
    long countCompletedStepsByTicketId(@Param("ticketId") UUID ticketId);

    // Check if all steps are completed for a ticket
    @Query("SELECT CASE WHEN COUNT(s) = (SELECT COUNT(s2) FROM DirectPurchaseStep s2 WHERE s2.directPurchaseTicket.id = :ticketId AND s2.status = 'COMPLETED') " +
           "THEN true ELSE false END FROM DirectPurchaseStep s WHERE s.directPurchaseTicket.id = :ticketId")
    boolean areAllStepsCompleted(@Param("ticketId") UUID ticketId);

    // Delete all steps by ticket
    void deleteByDirectPurchaseTicketId(UUID ticketId);
}
