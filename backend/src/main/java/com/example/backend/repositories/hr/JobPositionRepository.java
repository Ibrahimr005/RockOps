package com.example.backend.repositories.hr;

import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobPositionRepository extends JpaRepository<JobPosition, UUID> {

    List<JobPosition> findByPositionNameContainingIgnoreCaseOrDepartmentContainingIgnoreCase(
            String positionNameSearch, String departmentSearch, Sort sort);

    Page<JobPosition> findByPositionNameContainingIgnoreCase(String search, Pageable pageable);
    List<JobPosition> findByPositionNameContainingIgnoreCase(String search);

    Optional<JobPosition> findById(UUID jobPositionId);

    List<JobPosition> findByDepartment_NameContainingIgnoreCase(String departmentName);

    List<JobPosition> findByDepartment(Department department);

    @Query("SELECT jp FROM JobPosition jp " +
            "LEFT JOIN FETCH jp.department " +
            "WHERE jp.id = :id")
    Optional<JobPosition> findByIdWithDepartment(@Param("id") UUID id);

    // ✅ SOLUTION 2: Separate queries for each collection
    @Query("SELECT jp FROM JobPosition jp " +
            "LEFT JOIN FETCH jp.department " +
            "LEFT JOIN FETCH jp.employees " +
            "WHERE jp.id = :id")
    Optional<JobPosition> findByIdWithEmployees(@Param("id") UUID id);

    @Query("SELECT jp FROM JobPosition jp " +
            "LEFT JOIN FETCH jp.department " +
            "LEFT JOIN FETCH jp.vacancies " +
            "WHERE jp.id = :id")
    Optional<JobPosition> findByIdWithVacancies(@Param("id") UUID id);


    // Alternative: Find all with departments
    @Query("SELECT jp FROM JobPosition jp LEFT JOIN FETCH jp.department")
    List<JobPosition> findAllWithDepartments();

    // Find by department name
    @Query("SELECT jp FROM JobPosition jp LEFT JOIN FETCH jp.department d WHERE d.name = :departmentName")
    List<JobPosition> findByDepartmentName(@Param("departmentName") String departmentName);
}