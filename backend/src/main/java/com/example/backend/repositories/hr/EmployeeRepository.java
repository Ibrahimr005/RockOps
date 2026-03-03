package com.example.backend.repositories.hr;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.site.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    /**
     * Find employee by ID with all details needed for the details page in a single query.
     * Uses JOIN FETCH to avoid N+1 lazy loading (site, jobPosition, department).
     */
    @Query("SELECT e FROM Employee e " +
           "LEFT JOIN FETCH e.site " +
           "LEFT JOIN FETCH e.jobPosition jp " +
           "LEFT JOIN FETCH jp.department " +
           "WHERE e.id = :id")
    Optional<Employee> findByIdWithDetails(@Param("id") UUID id);

    // Find by email
    Optional<Employee> findByEmail(String email);

    // Find by email
    List<Employee> findByStatus(String status);
    // Find by department
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.department.name = :departmentName")
    List<Employee> findByJobPositionDepartment(String departmentName);

    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.positionName = :positionName")
    List<Employee> findByJobPositionName(String positionName);

    // Count by status
    long countByStatus(String status);

    // Count active employees - use countByStatus("ACTIVE") instead
    // Note: Employee has status field, not isActive field

    // Count new hires
    long countByHireDateAfter(LocalDate date);

    // Find by job position
    List<Employee> findByJobPositionId(UUID jobPositionId);

    // Find by site
    List<Employee> findBySiteId(UUID siteId);

    // Find by site with job position eagerly fetched
    @Query("SELECT e FROM Employee e LEFT JOIN FETCH e.jobPosition WHERE e.site.id = :siteId")
    List<Employee> findBySiteIdWithJobPosition(@Param("siteId") UUID siteId);

    // Find by site object
    List<Employee> findBySite(Site site);

    // Find employees without a site
    List<Employee> findBySiteIsNull();

    // NEW METHODS FOR CONTRACT TYPE FILTERING

    /**
     * Find employees by contract type
     * @param contractType The contract type enum
     * @return List of employees with the specified contract type
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = :contractType")
    List<Employee> findByJobPositionContractType(@Param("contractType") JobPosition.ContractType contractType);

    /**
     * Find active employees by contract type
     * @param contractType The contract type enum
     * @param status The employee status (typically "ACTIVE")
     * @return List of active employees with the specified contract type
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = :contractType AND e.status = :status")
    List<Employee> findByJobPositionContractTypeAndStatus(
            @Param("contractType") JobPosition.ContractType contractType,
            @Param("status") String status);

    /**
     * Find employees by contract type and site
     * @param contractType The contract type enum
     * @param siteId The site ID
     * @return List of employees with the specified contract type at the specified site
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = :contractType AND e.site.id = :siteId")
    List<Employee> findByJobPositionContractTypeAndSiteId(
            @Param("contractType") JobPosition.ContractType contractType,
            @Param("siteId") UUID siteId);

    /**
     * Find employees by contract type and department
     * @param contractType The contract type enum
     * @param departmentName The department name
     * @return List of employees with the specified contract type in the specified department
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = :contractType AND jp.department.name = :departmentName")
    List<Employee> findByJobPositionContractTypeAndDepartmentName(
            @Param("contractType") JobPosition.ContractType contractType,
            @Param("departmentName") String departmentName);

    /**
     * Count employees by contract type
     * @param contractType The contract type enum
     * @return Number of employees with the specified contract type
     */
    @Query("SELECT COUNT(e) FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = :contractType")
    long countByJobPositionContractType(@Param("contractType") JobPosition.ContractType contractType);

    /**
     * Count active employees by contract type
     * @param contractType The contract type enum
     * @param status The employee status
     * @return Number of active employees with the specified contract type
     */
    @Query("SELECT COUNT(e) FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = :contractType AND e.status = :status")
    long countByJobPositionContractTypeAndStatus(
            @Param("contractType") JobPosition.ContractType contractType,
            @Param("status") String status);

    /**
     * Find employees with minimal data for attendance operations
     * This query fetches only the essential fields to reduce data transfer
     */
    @Query("SELECT e.id, e.firstName, e.lastName, e.status, e.photoUrl, " +
            "s.id, s.name, jp.id, jp.positionName, jp.contractType, d.id, d.name " +
            "FROM Employee e " +
            "LEFT JOIN e.site s " +
            "LEFT JOIN e.jobPosition jp " +
            "LEFT JOIN jp.department d " +
            "WHERE e.status = 'ACTIVE'")
    List<Object[]> findMinimalEmployeeDataForAttendance();

    /**
     * Find hourly employees for bulk operations
     * @return List of employees with hourly contracts
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = 'HOURLY' AND e.status = 'ACTIVE'")
    List<Employee> findActiveHourlyEmployees();

    /**
     * Find daily employees for bulk operations
     * @return List of employees with daily contracts
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = 'DAILY' AND e.status = 'ACTIVE'")
    List<Employee> findActiveDailyEmployees();

    /**
     * Find monthly employees for bulk operations
     * @return List of employees with monthly contracts
     */
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.contractType = 'MONTHLY' AND e.status = 'ACTIVE'")
    List<Employee> findActiveMonthlyEmployees();

    // Add this method to your EmployeeRepository interface

    // Alternative query if the above doesn't work with your entity structure:
    @Query("SELECT e FROM Employee e JOIN e.jobPosition jp WHERE jp.positionName = :positionName")
    List<Employee> findByJobPositionPositionNameAlternative(@Param("positionName") String positionName);

    // If you prefer a more flexible approach:
    @Query("SELECT e FROM Employee e WHERE LOWER(e.jobPosition.positionName) = LOWER(:positionName)")
    List<Employee> findByJobPositionPositionNameIgnoreCase(@Param("positionName") String positionName);

    @Query("SELECT e FROM Employee e WHERE e.jobPosition.positionName = :positionName")
    List<Employee> findByJobPositionPositionName(@Param("positionName") String positionName);

    // Add this method to your EmployeeRepository interface

    @Query("SELECT e FROM Employee e WHERE e.site.id = :siteId OR e.site IS NULL")
    List<Employee> findBySiteIdOrSiteIsNull(@Param("siteId") UUID siteId);

    // Find employees by warehouse ID
    @Query("SELECT e FROM Employee e WHERE e.warehouse.id = :warehouseId")
    List<Employee> findByWarehouseId(@Param("warehouseId") UUID warehouseId);

    @Query("SELECT COUNT(e) FROM Employee e JOIN e.jobPosition jp WHERE jp.department.name = :departmentName")
    long countByJobPositionDepartmentName(@Param("departmentName") String departmentName);

    /**
     * Find employees who are not assigned to any site AND not assigned as drivers to any equipment
     * @return List of employees available for site assignment
     */
    @Query("SELECT e FROM Employee e WHERE e.site IS NULL " +
            "AND e.id NOT IN (SELECT eq.mainDriver.id FROM Equipment eq WHERE eq.mainDriver IS NOT NULL) " +
            "AND e.id NOT IN (SELECT eq.subDriver.id FROM Equipment eq WHERE eq.subDriver IS NOT NULL)")
    List<Employee> findUnassignedEmployeesNotAssignedAsDrivers();


    // EmployeeRepository.java - Add this method

    /**
     * Find employees without site assignment
     * Used for attendance tracking of unassigned employees
     *
     * @return List of employees with null site
     */

    /**
     * Alternate naming convention (if the above doesn't work with your JPA version)
     */
    @Query("SELECT e FROM Employee e WHERE e.site IS NULL")
    List<Employee> findEmployeesWithoutSite();



    /**
     * Find all active employees
     */
    @Query("SELECT e FROM Employee e WHERE e.status = 'ACTIVE'")
    List<Employee> findAllActive();

    /**
     * Find all active employees at a site
     */
    @Query("SELECT e FROM Employee e " +
            "WHERE e.site.id = :siteId " +
            "AND e.status = 'ACTIVE'")
    List<Employee> findActiveBySiteId(UUID siteId);

    /**
     * Find by employee number
     */
    Optional<Employee> findByEmployeeNumber(String employeeNumber);

    /**
     * Check if employee number exists
     */
    boolean existsByEmployeeNumber(String employeeNumber);

    /**
     * Get the maximum employee number sequence (legacy - for EMP-XXXXXX format)
     */
    @Query(value = "SELECT MAX(CAST(SUBSTRING(e.employee_number, 5) AS BIGINT)) " +
           "FROM employee e " +
           "WHERE e.employee_number LIKE 'EMP-%' " +
           "AND e.employee_number NOT LIKE 'EMP-____-%'", nativeQuery = true)
    Long getMaxEmployeeNumberSequence();

    /**
     * Get the maximum employee number sequence for a specific year
     * Format: EMP-YYYY-#####
     * @param year The year to get the sequence for (e.g., 2024)
     * @return The maximum sequence number for that year, or null if none exist
     */
    @Query(value = "SELECT MAX(CAST(SUBSTRING(e.employee_number, 10) AS BIGINT)) " +
           "FROM employee e " +
           "WHERE e.employee_number LIKE CONCAT('EMP-', :year, '-%')", nativeQuery = true)
    Long getMaxEmployeeNumberSequenceByYear(@Param("year") String year);

    /**
     * Count employees by hire year
     * Used for generating sequential employee numbers per year
     */
    @Query(value = "SELECT COUNT(*) FROM employee e " +
           "WHERE EXTRACT(YEAR FROM e.hire_date) = :year", nativeQuery = true)
    Long countByHireYear(@Param("year") int year);
}