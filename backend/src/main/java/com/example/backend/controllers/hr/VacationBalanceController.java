package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.leave.VacationBalanceResponseDTO;
import com.example.backend.services.hr.VacationBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vacation-balance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class VacationBalanceController {

    private final VacationBalanceService vacationBalanceService;

    /**
     * Get all vacation balances (optionally filtered by year)
     * GET /vacation-balance or /vacation-balance?year=2025
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> getAllVacationBalances(@RequestParam(required = false) Integer year) {
        try {
            List<VacationBalanceResponseDTO> balances = vacationBalanceService.getAllVacationBalances(year);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", balances,
                    "count", balances.size(),
                    "year", year != null ? year : "current"
            ));
        } catch (Exception e) {
            log.error("Error fetching all vacation balances for year: {}", year, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    /**
     * Get employee's vacation balance
     * GET /vacation-balance/{employeeId}
     */
    @GetMapping("/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getVacationBalance(@PathVariable UUID employeeId) {
        try {
            // TODO: Add authorization check - employees can only see their own balance
            VacationBalanceResponseDTO balanceDTO = vacationBalanceService.getVacationBalance(employeeId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", balanceDTO
            ));
        } catch (Exception e) {
            log.error("Error fetching vacation balance for employee: {}", employeeId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Initialize vacation balances for all employees for a given year
     * POST /vacation-balance/initialize/{year}
     */
    @PostMapping("/initialize/{year}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> initializeYearlyBalances(@PathVariable Integer year) {
        try {
            vacationBalanceService.initializeYearlyBalances(year);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vacation balances initialized successfully for year " + year
            ));
        } catch (Exception e) {
            log.error("Error initializing vacation balances for year: {}", year, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Carry forward unused vacation days
     * POST /vacation-balance/carry-forward
     */
    @PostMapping("/carry-forward")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> carryForwardBalances(
            @RequestParam Integer fromYear,
            @RequestParam Integer toYear,
            @RequestParam(defaultValue = "5") Integer maxCarryForward) {
        try {
            vacationBalanceService.carryForwardBalances(fromYear, toYear, maxCarryForward);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", String.format("Vacation balances carried forward from %d to %d (max %d days)",
                            fromYear, toYear, maxCarryForward)
            ));
        } catch (Exception e) {
            log.error("Error carrying forward vacation balances", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Award bonus vacation days to an employee
     * POST /vacation-balance/{employeeId}/bonus
     */
    /**
     * Award bonus vacation days to an employee
     * POST /vacation-balance/{employeeId}/bonus
     */
    @PostMapping("/{employeeId}/bonus")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> awardBonusDays(
            @PathVariable UUID employeeId,
            @RequestBody Map<String, Object> requestBody) {
        try {
            log.debug("Award bonus request body: {}", requestBody);
            Map<String, Object> data= (Map<String, Object>) requestBody.get("year");
            // Safe extraction with type conversion
            Object yearObj = data.get("year")    ;
            Object bonusDaysObj = data.get("bonusDays");
            String reason = (String) data.get("reason");

            // Convert year to Integer
            Integer year = null;
            if (yearObj instanceof Integer) {
                year = (Integer) yearObj;
            } else if (yearObj instanceof Number) {
                year = ((Number) yearObj).intValue();
            } else if (yearObj instanceof String) {
                try {
                    year = Integer.valueOf((String) yearObj);
                } catch (NumberFormatException e) {
                    log.warn("Invalid year format: {}", yearObj);
                }
            }

            // Convert bonusDays to Integer
            Integer bonusDays = null;
            if (bonusDaysObj instanceof Integer) {
                bonusDays = (Integer) bonusDaysObj;
            } else if (bonusDaysObj instanceof Number) {
                bonusDays = ((Number) bonusDaysObj).intValue();
            } else if (bonusDaysObj instanceof String) {
                try {
                    bonusDays = Integer.valueOf((String) bonusDaysObj);
                } catch (NumberFormatException e) {
                    log.warn("Invalid bonusDays format: {}", bonusDaysObj);
                }
            }

            // Validate required fields
            if (year == null || bonusDays == null || reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "success", false,
                        "error", "Year, bonusDays, and reason are required"
                ));
            }

            // Validate bonus days range
            if (bonusDays <= 0 || bonusDays > 30) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "success", false,
                        "error", "Bonus days must be between 1 and 30"
                ));
            }

            vacationBalanceService.awardBonusDays(employeeId, year, bonusDays, reason);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", String.format("Awarded %d bonus days to employee for: %s", bonusDays, reason)
            ));
        } catch (Exception e) {
            log.error("Error awarding bonus days", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    /**
     * Get employees with low vacation balance
     * GET /vacation-balance/low-balance
     */
    @GetMapping("/low-balance")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> getEmployeesWithLowBalance(
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "5") Integer threshold) {
        try {
            List<VacationBalanceResponseDTO> lowBalances = vacationBalanceService
                    .getEmployeesWithLowBalance(year, threshold);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", lowBalances,
                    "count", lowBalances.size(),
                    "threshold", threshold
            ));
        } catch (Exception e) {
            log.error("Error fetching employees with low balance", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}
