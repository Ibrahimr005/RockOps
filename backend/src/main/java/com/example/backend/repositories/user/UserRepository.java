package com.example.backend.repositories.user;

import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // ================= BASIC USER OPERATIONS =================

    Optional<User> findByUsername(String username);

    Optional<User> findById(UUID id);

    List<User> findByRole(Role role);

    boolean existsByUsername(String username);

    // ================= GROUP NOTIFICATION SUPPORT =================

    /**
     * Find users by their roles - REQUIRED for group notifications
     * @param roles List of roles to search for
     * @return List of users with any of the specified roles
     */
    List<User> findByRoleIn(List<Role> roles);

    // ================= DEPARTMENT-SPECIFIC QUERIES =================

    /**
     * Find all warehouse-related users (WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, ADMIN)
     */
    @Query("SELECT u FROM User u WHERE u.role IN ('WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE', 'ADMIN')")
    List<User> findWarehouseUsers();

    /**
     * Find all HR-related users (HR_MANAGER, HR_EMPLOYEE, ADMIN)
     */
    @Query("SELECT u FROM User u WHERE u.role IN ('HR_MANAGER', 'HR_EMPLOYEE', 'ADMIN')")
    List<User> findHRUsers();

    /**
     * Find all Finance-related users (FINANCE_MANAGER, FINANCE_EMPLOYEE, ADMIN)
     */
    @Query("SELECT u FROM User u WHERE u.role IN ('FINANCE_MANAGER', 'FINANCE_EMPLOYEE', 'ADMIN')")
    List<User> findFinanceUsers();

    /**
     * Find all Procurement-related users (PROCUREMENT, ADMIN)
     */
    @Query("SELECT u FROM User u WHERE u.role IN ('PROCUREMENT', 'ADMIN')")
    List<User> findProcurementUsers();

    /**
     * Find all Equipment-related users (EQUIPMENT_MANAGER, ADMIN)
     */
    @Query("SELECT u FROM User u WHERE u.role IN ('EQUIPMENT_MANAGER', 'ADMIN')")
    List<User> findEquipmentUsers();


    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE CAST(u.id AS string) = CAST(:longId AS string)")
    boolean existsById(Long longId);


    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE CAST(u.id AS string) = CAST(:longId AS string)")
    void deleteById(Long longId);
}