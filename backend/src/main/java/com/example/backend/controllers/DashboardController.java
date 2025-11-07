package com.example.backend.controllers;

import com.example.backend.dto.dashboard.*;
import com.example.backend.services.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Dashboard Controller
 * Provides role-based dashboard endpoints with proper access control
 */
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    /**
     * Get dashboard data for current authenticated user
     * Automatically routes to role-specific dashboard
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getCurrentUserDashboard() {
        try {
            Object dashboardData = dashboardService.getDashboardForCurrentUser();
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error loading dashboard: " + e.getMessage());
        }
    }

    /**
     * Get Admin Dashboard
     * Access: ADMIN only
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminDashboardDTO> getAdminDashboard() {
        try {
            AdminDashboardDTO dashboard = dashboardService.getAdminDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Site Admin Dashboard
     * Access: SITE_ADMIN, ADMIN
     */
    @GetMapping("/site-admin")
    @PreAuthorize("hasAnyRole('SITE_ADMIN', 'ADMIN')")
    public ResponseEntity<SiteAdminDashboardDTO> getSiteAdminDashboard() {
        try {
            SiteAdminDashboardDTO dashboard = dashboardService.getSiteAdminDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Equipment Manager Dashboard
     * Access: EQUIPMENT_MANAGER, ADMIN
     */
    @GetMapping("/equipment-manager")
    @PreAuthorize("hasAnyRole('EQUIPMENT_MANAGER', 'ADMIN')")
    public ResponseEntity<EquipmentManagerDashboardDTO> getEquipmentManagerDashboard() {
        try {
            EquipmentManagerDashboardDTO dashboard = dashboardService.getEquipmentManagerDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Warehouse Manager Dashboard
     * Access: WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, ADMIN
     */
    @GetMapping("/warehouse-manager")
    @PreAuthorize("hasAnyRole('WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE', 'ADMIN')")
    public ResponseEntity<WarehouseManagerDashboardDTO> getWarehouseManagerDashboard() {
        try {
            WarehouseManagerDashboardDTO dashboard = dashboardService.getWarehouseManagerDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get HR Manager Dashboard
     * Access: HR_MANAGER, ADMIN
     */
    @GetMapping("/hr-manager")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    public ResponseEntity<HRManagerDashboardDTO> getHRManagerDashboard() {
        try {
            HRManagerDashboardDTO dashboard = dashboardService.getHRManagerDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get HR Employee Dashboard
     * Access: HR_EMPLOYEE, HR_MANAGER, ADMIN
     */
    @GetMapping("/hr-employee")
    @PreAuthorize("hasAnyRole('HR_EMPLOYEE', 'HR_MANAGER', 'ADMIN')")
    public ResponseEntity<HREmployeeDashboardDTO> getHREmployeeDashboard() {
        try {
            HREmployeeDashboardDTO dashboard = dashboardService.getHREmployeeDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Finance Manager Dashboard
     * Access: FINANCE_MANAGER, ADMIN
     */
    @GetMapping("/finance-manager")
    @PreAuthorize("hasAnyRole('FINANCE_MANAGER', 'ADMIN')")
    public ResponseEntity<FinanceDashboardDTO> getFinanceManagerDashboard() {
        try {
            FinanceDashboardDTO dashboard = dashboardService.getFinanceDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Finance Employee Dashboard
     * Access: FINANCE_EMPLOYEE, FINANCE_MANAGER, ADMIN
     */
    @GetMapping("/finance-employee")
    @PreAuthorize("hasAnyRole('FINANCE_EMPLOYEE', 'FINANCE_MANAGER', 'ADMIN')")
    public ResponseEntity<FinanceDashboardDTO> getFinanceEmployeeDashboard() {
        try {
            FinanceDashboardDTO dashboard = dashboardService.getFinanceDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Maintenance Manager Dashboard
     * Access: MAINTENANCE_MANAGER, ADMIN
     */
    @GetMapping("/maintenance-manager")
    @PreAuthorize("hasAnyRole('MAINTENANCE_MANAGER', 'ADMIN')")
    public ResponseEntity<MaintenanceDashboardDTO> getMaintenanceManagerDashboard() {
        try {
            MaintenanceDashboardDTO dashboard = dashboardService.getMaintenanceDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Maintenance Employee Dashboard
     * Access: MAINTENANCE_EMPLOYEE, MAINTENANCE_MANAGER, ADMIN
     */
    @GetMapping("/maintenance-employee")
    @PreAuthorize("hasAnyRole('MAINTENANCE_EMPLOYEE', 'MAINTENANCE_MANAGER', 'ADMIN')")
    public ResponseEntity<MaintenanceDashboardDTO> getMaintenanceEmployeeDashboard() {
        try {
            MaintenanceDashboardDTO dashboard = dashboardService.getMaintenanceDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Procurement Dashboard
     * Access: PROCUREMENT, ADMIN
     */
    @GetMapping("/procurement")
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'ADMIN')")
    public ResponseEntity<ProcurementDashboardDTO> getProcurementDashboard() {
        try {
            ProcurementDashboardDTO dashboard = dashboardService.getProcurementDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get Secretary Dashboard
     * Access: SECRETARY, ADMIN
     */
    @GetMapping("/secretary")
    @PreAuthorize("hasAnyRole('SECRETARY', 'ADMIN')")
    public ResponseEntity<SecretaryDashboardDTO> getSecretaryDashboard() {
        try {
            SecretaryDashboardDTO dashboard = dashboardService.getSecretaryDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get User Dashboard
     * Access: All authenticated users
     */
    @GetMapping("/user")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDashboardDTO> getUserDashboard() {
        try {
            UserDashboardDTO dashboard = dashboardService.getUserDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

