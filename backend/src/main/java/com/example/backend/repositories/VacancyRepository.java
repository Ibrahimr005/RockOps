package com.example.backend.repositories;

import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.Vacancy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface VacancyRepository extends JpaRepository<Vacancy, UUID> {
    List<Vacancy> findByJobPosition(JobPosition jobPosition);
    List<Vacancy> findByStatus(String status);

    /**
     * Find vacancies by status and closing date between two dates
     * Used for finding vacancies closing soon
     */
    List<Vacancy> findByStatusAndClosingDateBetween(String status, LocalDate startDate, LocalDate endDate);

    /**
     * Find vacancies by status and closing date before given date
     * Used for finding expired vacancies that need to be auto-closed
     */
    List<Vacancy> findByStatusAndClosingDateBefore(String status, LocalDate date);


    List<Vacancy> findByClosingDateBefore(LocalDate today);

    // Dashboard metrics methods
    long countByStatusIn(List<String> statuses);
}