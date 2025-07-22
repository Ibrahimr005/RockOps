
// EmployeeDeductionRepository.java
package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.EmployeeDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmployeeDeductionRepository extends JpaRepository<EmployeeDeduction, UUID> {

    // Find active deductions for employee
    @Query("SELECT ed FROM EmployeeDeduction ed WHERE ed.employee.id = :employeeId " +
            "AND ed.isActive = true AND ed.effectiveFrom <= :date " +
            "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :date)")
    List<EmployeeDeduction> findActiveDeductionsForEmployee(@Param("employeeId") UUID employeeId,
                                                            @Param("date") LocalDate date);

    // Find deductions by employee
    List<EmployeeDeduction> findByEmployeeIdOrderByEffectiveFromDesc(UUID employeeId);

    // Find deductions by type
    List<EmployeeDeduction> findByDeductionTypeIdOrderByEffectiveFromDesc(UUID deductionTypeId);
}