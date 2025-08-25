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

    // Count new hires
    long countByHireDateAfter(LocalDate date);

    // Find by job position
    List<Employee> findByJobPositionId(UUID jobPositionId);

    // Find by site
    List<Employee> findBySiteId(UUID siteId);

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
}