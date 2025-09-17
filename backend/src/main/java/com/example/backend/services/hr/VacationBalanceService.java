package com.example.backend.services.hr;

import com.example.backend.dto.hr.leave.VacationBalanceResponseDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.VacationBalance;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.VacationBalanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VacationBalanceService {

    private final VacationBalanceRepository vacationBalanceRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Get or create vacation balance for employee and year
     */
    public VacationBalance getOrCreateBalance(UUID employeeId, Integer year) {
        return vacationBalanceRepository.findByEmployeeIdAndYear(employeeId, year)
            .orElseGet(() -> createInitialBalance(employeeId, year));
    }

    /**
     * Get vacation balance by employee ID
     */
    public VacationBalanceResponseDTO getVacationBalance(UUID employeeId) {
        int currentYear = LocalDate.now().getYear();
        VacationBalance balance = getOrCreateBalance(employeeId, currentYear);
        return mapToResponseDTO(balance);
    }

    /**
     * Process approved leave - move from pending to used
     */
    public void processApprovedLeave(UUID employeeId, int days) {
        int currentYear = LocalDate.now().getYear();
        VacationBalance balance = getOrCreateBalance(employeeId, currentYear);
        
        balance.removePendingDays(days);
        balance.addUsedDays(days);
        
        vacationBalanceRepository.save(balance);
        log.info("Processed approved leave for employee {}: {} days", employeeId, days);
    }

    /**
     * Add pending days when leave request is submitted
     */
    public void addPendingDays(UUID employeeId, int days) {
        int currentYear = LocalDate.now().getYear();
        VacationBalance balance = getOrCreateBalance(employeeId, currentYear);
        
        balance.addPendingDays(days);
        vacationBalanceRepository.save(balance);
        log.info("Added pending days for employee {}: {} days", employeeId, days);
    }

    /**
     * Remove pending days when leave request is rejected/cancelled
     */
    public void removePendingDays(UUID employeeId, int days) {
        int currentYear = LocalDate.now().getYear();
        VacationBalance balance = getOrCreateBalance(employeeId, currentYear);
        
        balance.removePendingDays(days);
        vacationBalanceRepository.save(balance);
        log.info("Removed pending days for employee {}: {} days", employeeId, days);
    }

    /**
     * Initialize vacation balances for all employees for a given year
     */
    public void initializeYearlyBalances(Integer year) {
        log.info("Initializing vacation balances for year: {}", year);
        
        List<Employee> activeEmployees = employeeRepository.findAll().stream()
            .filter(emp -> "ACTIVE".equals(emp.getStatus()))
            .collect(Collectors.toList());

        int initializedCount = 0;
        for (Employee employee : activeEmployees) {
            if (!vacationBalanceRepository.existsByEmployeeIdAndYear(employee.getId(), year)) {
                createInitialBalance(employee.getId(), year);
                initializedCount++;
            }
        }

        log.info("Initialized {} vacation balances for year {}", initializedCount, year);
    }

    /**
     * Carry forward unused vacation days to next year
     */
    public void carryForwardBalances(Integer fromYear, Integer toYear, Integer maxCarryForward) {
        log.info("Carrying forward balances from {} to {} (max: {})", fromYear, toYear, maxCarryForward);
        
        List<VacationBalance> previousYearBalances = vacationBalanceRepository.findByYear(fromYear);
        
        for (VacationBalance prevBalance : previousYearBalances) {
            int remainingDays = prevBalance.getRemainingDays();
            int carryForward = Math.min(remainingDays, maxCarryForward);
            
            if (carryForward > 0) {
                VacationBalance newBalance = getOrCreateBalance(prevBalance.getEmployee().getId(), toYear);
                newBalance.setCarriedForward(carryForward);
                vacationBalanceRepository.save(newBalance);
                
                log.debug("Carried forward {} days for employee {}", carryForward, 
                    prevBalance.getEmployee().getId());
            }
        }
    }

    /**
     * Award bonus vacation days
     */
    public void awardBonusDays(UUID employeeId, Integer year, int bonusDays, String reason) {
        VacationBalance balance = getOrCreateBalance(employeeId, year);
        balance.setBonusDays(balance.getBonusDays() + bonusDays);
        vacationBalanceRepository.save(balance);
        
        log.info("Awarded {} bonus days to employee {} for reason: {}", bonusDays, employeeId, reason);
    }

    /**
     * Get employees with low vacation balance
     */
    public List<VacationBalanceResponseDTO> getEmployeesWithLowBalance(Integer year, Integer threshold) {
        if (year == null) {
            year = LocalDate.now().getYear();
        }
        if (threshold == null) {
            threshold = 5; // Default threshold
        }

        List<VacationBalance> lowBalances = vacationBalanceRepository
            .findEmployeesWithLowBalance(year, threshold);
            
        return lowBalances.stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());
    }

    // Private helper methods

    private VacationBalance createInitialBalance(UUID employeeId, Integer year) {
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));

        int allocatedDays = calculateAllocatedVacationDays(employee);

        VacationBalance balance = VacationBalance.builder()
            .employee(employee)
            .year(year)
            .totalAllocated(allocatedDays)
            .usedDays(0)
            .pendingDays(0)
            .carriedForward(0)
            .bonusDays(0)
            .build();

        VacationBalance savedBalance = vacationBalanceRepository.save(balance);
        log.info("Created initial vacation balance for employee {}: {} days", employeeId, allocatedDays);
        
        return savedBalance;
    }

    private int calculateAllocatedVacationDays(Employee employee) {
        // Extract vacation days from JobPosition.vacations field
        if (employee.getJobPosition() == null || employee.getJobPosition().getVacations() == null) {
            return 21; // Default
        }

        String vacationText = employee.getJobPosition().getVacations();
        
        // Try to extract number from vacation text (e.g., "21 days annual leave" -> 21)
        Pattern pattern = Pattern.compile("(\\d+)\\s*days?", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(vacationText);
        
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }

        // Default if can't parse
        return 21;
    }

    private VacationBalanceResponseDTO mapToResponseDTO(VacationBalance balance) {
        return VacationBalanceResponseDTO.builder()
            .id(balance.getId())
            .employeeId(balance.getEmployee().getId())
            .employeeName(balance.getEmployee().getFullName())
            .year(balance.getYear())
            .totalAllocated(balance.getTotalAllocated())
            .usedDays(balance.getUsedDays())
            .pendingDays(balance.getPendingDays())
            .carriedForward(balance.getCarriedForward())
            .bonusDays(balance.getBonusDays())
            .remainingDays(balance.getRemainingDays())
            .availableDays(balance.getAvailableDays())
            .utilizationRate(balance.getUtilizationRate())
            .hasLowBalance(balance.getRemainingDays() < 5)
            .hasUnusedDays(balance.getUsedDays() == 0)
            .build();
    }

    /**
     * Get all vacation balances, optionally filtered by year
     */
    public List<VacationBalanceResponseDTO> getAllVacationBalances(Integer year) {
        Integer targetYear = year != null ? year : LocalDate.now().getYear();

        log.info("Fetching all vacation balances for year: {}", targetYear);

        // First, ensure all active employees have vacation balances for the target year
        initializeYearlyBalances(targetYear);

        // Get all vacation balances for the specified year
        List<VacationBalance> balances = vacationBalanceRepository.findByYear(targetYear);

        return balances.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }
}
