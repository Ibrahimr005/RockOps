package com.example.backend.repositories.warehouse;

import com.example.backend.models.warehouse.WarehouseEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseEmployeeRepository extends JpaRepository<WarehouseEmployee, UUID> {

    // Find all warehouse assignments for a specific user
    List<WarehouseEmployee> findByUserId(UUID userId);

    // Find all employees assigned to a specific warehouse
    List<WarehouseEmployee> findByWarehouseId(UUID warehouseId);

    // Find specific assignment
    Optional<WarehouseEmployee> findByUserIdAndWarehouseId(UUID userId, UUID warehouseId);

    // Check if user is assigned to any warehouse
    boolean existsByUserId(UUID userId);

    // Check if user is assigned to specific warehouse
    boolean existsByUserIdAndWarehouseId(UUID userId, UUID warehouseId);

    // Get warehouse IDs for a user
    @Query("SELECT we.warehouse.id FROM WarehouseEmployee we WHERE we.user.id = :userId")
    List<UUID> findWarehouseIdsByUserId(@Param("userId") UUID userId);

    // Get users assigned to a warehouse
    @Query("SELECT we.user FROM WarehouseEmployee we WHERE we.warehouse.id = :warehouseId")
    List<com.example.backend.models.user.User> findUsersByWarehouseId(@Param("warehouseId") UUID warehouseId);

    // Get assignments with warehouse details for a user
    @Query("SELECT we FROM WarehouseEmployee we JOIN FETCH we.warehouse WHERE we.user.id = :userId")
    List<WarehouseEmployee> findByUserIdWithWarehouse(@Param("userId") UUID userId);

    // Get assignments with user details for a warehouse
    @Query("SELECT we FROM WarehouseEmployee we JOIN FETCH we.user WHERE we.warehouse.id = :warehouseId")
    List<WarehouseEmployee> findByWarehouseIdWithUser(@Param("warehouseId") UUID warehouseId);
}