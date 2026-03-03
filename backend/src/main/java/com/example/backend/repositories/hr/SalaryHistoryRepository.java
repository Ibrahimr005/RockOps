package com.example.backend.repositories.hr;

import com.example.backend.models.hr.SalaryHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SalaryHistoryRepository extends JpaRepository<SalaryHistory, UUID> {

    List<SalaryHistory> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<SalaryHistory> findByReferenceId(UUID referenceId);
}
