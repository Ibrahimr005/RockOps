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

    @Query("SELECT jp FROM JobPosition jp LEFT JOIN FETCH jp.department")
    List<JobPosition> findAllWithDepartments();

    @Query("SELECT jp FROM JobPosition jp LEFT JOIN FETCH jp.department d WHERE d.name = :departmentName")
    List<JobPosition> findByDepartmentName(@Param("departmentName") String departmentName);

    // Hierarchy related methods
    List<JobPosition> findByParentJobPositionId(UUID parentId);
    List<JobPosition> findByParentJobPositionIsNull(); // Root positions

    // ======================================
    // NEW: Duplicate check methods
    // ======================================

    /**
     * Check if a position exists with the given name (case-insensitive)
     * @param positionName The position name to check
     * @return true if a position with this name exists
     */
    @Query("SELECT CASE WHEN COUNT(jp) > 0 THEN true ELSE false END FROM JobPosition jp " +
            "WHERE LOWER(TRIM(jp.positionName)) = LOWER(TRIM(:positionName))")
    boolean existsByPositionNameIgnoreCase(@Param("positionName") String positionName);

    /**
     * Check if a position exists with the given name and experience level (case-insensitive)
     * @param positionName The position name to check
     * @param experienceLevel The experience level to check
     * @return true if a position with this name and experience level exists
     */
    @Query("SELECT CASE WHEN COUNT(jp) > 0 THEN true ELSE false END FROM JobPosition jp " +
            "WHERE LOWER(TRIM(jp.positionName)) = LOWER(TRIM(:positionName)) " +
            "AND LOWER(TRIM(COALESCE(jp.experienceLevel, ''))) = LOWER(TRIM(COALESCE(:experienceLevel, '')))")
    boolean existsByPositionNameAndExperienceLevelIgnoreCase(
            @Param("positionName") String positionName,
            @Param("experienceLevel") String experienceLevel);

    /**
     * Check if a position exists with the given name and experience level, excluding a specific ID
     * Used for update validation to exclude the current record
     * @param positionName The position name to check
     * @param experienceLevel The experience level to check
     * @param excludeId The ID to exclude from the check
     * @return true if a duplicate position exists
     */
    @Query("SELECT CASE WHEN COUNT(jp) > 0 THEN true ELSE false END FROM JobPosition jp " +
            "WHERE LOWER(TRIM(jp.positionName)) = LOWER(TRIM(:positionName)) " +
            "AND LOWER(TRIM(COALESCE(jp.experienceLevel, ''))) = LOWER(TRIM(COALESCE(:experienceLevel, ''))) " +
            "AND jp.id != :excludeId")
    boolean existsByPositionNameAndExperienceLevelExcludingId(
            @Param("positionName") String positionName,
            @Param("experienceLevel") String experienceLevel,
            @Param("excludeId") UUID excludeId);

    /**
     * Find position by exact name (case-insensitive)
     * @param positionName The position name to find
     * @return Optional containing the position if found
     */
    @Query("SELECT jp FROM JobPosition jp WHERE LOWER(TRIM(jp.positionName)) = LOWER(TRIM(:positionName))")
    Optional<JobPosition> findByPositionNameIgnoreCase(@Param("positionName") String positionName);

    /**
     * Find positions by contract type
     * @param contractType The contract type to filter by
     * @return List of positions with the specified contract type
     */
    List<JobPosition> findByContractType(JobPosition.ContractType contractType);

    /**
     * Find active positions by contract type
     * @param contractType The contract type to filter by
     * @param active The active status
     * @return List of active positions with the specified contract type
     */
    List<JobPosition> findByContractTypeAndActive(JobPosition.ContractType contractType, Boolean active);

    /**
     * Count positions by contract type
     * @param contractType The contract type to count
     * @return Number of positions with the specified contract type
     */
    long countByContractType(JobPosition.ContractType contractType);

    /**
     * Count active positions
     * @param active The active status
     * @return Number of positions with the specified active status
     */
    long countByActive(Boolean active);

    /**
     * Find positions by department ID
     * @param departmentId The department ID
     * @return List of positions in the specified department
     */
    @Query("SELECT jp FROM JobPosition jp WHERE jp.department.id = :departmentId")
    List<JobPosition> findByDepartmentId(@Param("departmentId") UUID departmentId);
}