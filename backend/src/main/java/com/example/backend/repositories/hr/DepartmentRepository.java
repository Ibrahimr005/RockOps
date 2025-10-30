package com.example.backend.repositories.hr;

import com.example.backend.models.hr.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {

    Optional<Department> findByName(String name);

    boolean existsByName(String name);

    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM Department d WHERE LOWER(d.name) = LOWER(:name)")
    boolean existsByNameIgnoreCase(@Param("name") String name);

    @Query("SELECT d FROM Department d WHERE LOWER(d.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Department> findByNameContainingIgnoreCase(@Param("name") String name);

    @Query("SELECT d FROM Department d ORDER BY d.name ASC")
    List<Department> findAllOrderByName();

    @Query("SELECT COUNT(jp) FROM JobPosition jp WHERE jp.department.id = :departmentId")
    long countJobPositionsByDepartmentId(@Param("departmentId") UUID departmentId);

    @Query("SELECT d FROM Department d WHERE SIZE(d.jobPositions) = 0")
    List<Department> findDepartmentsWithNoJobPositions();
}