package com.example.backend.services.hr;

import com.example.backend.dto.hr.salary.*;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.hr.*;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.hr.SalaryHistoryRepository;
import com.example.backend.repositories.hr.SalaryIncreaseRequestRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalaryIncreaseRequestService {

    private final SalaryIncreaseRequestRepository requestRepository;
    private final SalaryHistoryRepository salaryHistoryRepository;
    private final EmployeeRepository employeeRepository;
    private final JobPositionRepository jobPositionRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;
    private final NotificationService notificationService;

    /**
     * Create a new salary increase request
     */
    @CacheEvict(value = "statisticsCache", allEntries = true)
    @Transactional
    public SalaryIncreaseRequestDTO createRequest(SalaryIncreaseCreateDTO dto, String createdBy) {
        log.info("Creating salary increase request by {}", createdBy);

        SalaryIncreaseRequest.RequestType requestType = SalaryIncreaseRequest.RequestType.valueOf(dto.getRequestType());

        // Validate and get current salary
        Employee employee;
        BigDecimal currentSalary;
        JobPosition jobPosition = null;

        if (requestType == SalaryIncreaseRequest.RequestType.POSITION_LEVEL) {
            if (dto.getJobPositionId() == null) {
                throw new IllegalStateException("Job position ID is required for POSITION_LEVEL requests");
            }
            JobPosition foundPosition = jobPositionRepository.findById(dto.getJobPositionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Job position not found: " + dto.getJobPositionId()));
            jobPosition = foundPosition;

            currentSalary = BigDecimal.valueOf(foundPosition.calculateMonthlySalary());

            // For POSITION_LEVEL, auto-select highest-paid employee in the position as reference
            List<Employee> positionEmployees = employeeRepository.findByJobPositionId(foundPosition.getId());
            log.info("Found {} employees in position {}", positionEmployees.size(), foundPosition.getPositionName());

            List<Employee> activeEmployees = positionEmployees.stream()
                    .filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus()))
                    .collect(Collectors.toList());
            log.info("Found {} active employees in position {}", activeEmployees.size(), foundPosition.getPositionName());

            if (activeEmployees.isEmpty()) {
                throw new IllegalStateException("No active employees found in position: " + foundPosition.getPositionName());
            }

            employee = activeEmployees.stream()
                    .max(Comparator.comparing(e -> {
                        try {
                            return e.getMonthlySalary();
                        } catch (Exception ex) {
                            log.warn("Error calculating salary for employee {}: {}", e.getEmployeeNumber(), ex.getMessage());
                            return BigDecimal.ZERO;
                        }
                    }))
                    .get();

            // Check for pending position-level request
            if (requestRepository.existsPendingForPosition(dto.getJobPositionId())) {
                throw new IllegalStateException("A salary increase request is already pending for this position");
            }
        } else {
            if (dto.getEmployeeId() == null) {
                throw new IllegalStateException("Employee ID is required for EMPLOYEE_LEVEL requests");
            }
            employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + dto.getEmployeeId()));

            if (!"ACTIVE".equalsIgnoreCase(employee.getStatus())) {
                throw new IllegalStateException("Can only create salary increase requests for active employees");
            }

            currentSalary = employee.getMonthlySalary();

            // Check for pending employee-level request
            if (requestRepository.existsPendingForEmployee(dto.getEmployeeId())) {
                throw new IllegalStateException("A salary increase request is already pending for this employee");
            }
        }

        // Calculate increase
        BigDecimal increaseAmount = dto.getRequestedSalary().subtract(currentSalary);
        BigDecimal increasePercentage = BigDecimal.ZERO;
        if (currentSalary.compareTo(BigDecimal.ZERO) > 0) {
            increasePercentage = increaseAmount
                    .divide(currentSalary, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // Generate request number
        log.info("Generating request number for salary increase request");
        String requestNumber = entityIdGeneratorService.generateNextId(EntityTypeConfig.SALARY_INCREASE_REQUEST);
        log.info("Generated request number: {}", requestNumber);

        log.info("Building salary increase request entity. Employee: {}, Site: {}",
                employee.getEmployeeNumber(), employee.getSite() != null ? employee.getSite().getId() : "NULL");

        SalaryIncreaseRequest request = SalaryIncreaseRequest.builder()
                .requestNumber(requestNumber)
                .requestType(requestType)
                .employee(employee)
                .jobPosition(jobPosition)
                .site(employee.getSite())
                .currentSalary(currentSalary)
                .requestedSalary(dto.getRequestedSalary())
                .increaseAmount(increaseAmount)
                .increasePercentage(increasePercentage)
                .effectiveDate(dto.getEffectiveDate())
                .reason(dto.getReason())
                .status(SalaryIncreaseRequest.Status.PENDING_HR)
                .createdBy(createdBy)
                .build();

        log.info("Saving salary increase request to database");
        SalaryIncreaseRequest saved = requestRepository.save(request);
        log.info("Created salary increase request {} for employee {}", saved.getRequestNumber(), employee.getEmployeeNumber());

        // Notify HR users
        try {
            notificationService.sendNotificationToHRUsers(
                    "New Salary Increase Request",
                    "Salary increase request " + saved.getRequestNumber() + " submitted for " + employee.getFullName(),
                    NotificationType.INFO,
                    "/hr/salary-increases",
                    "SALARY_INCREASE_REQUEST"
            );
        } catch (Exception e) {
            log.warn("Failed to send notification for salary increase request: {}", e.getMessage());
        }

        return SalaryIncreaseRequestDTO.fromEntity(saved);
    }

    /**
     * HR decision (approve or reject)
     */
    @CacheEvict(value = "statisticsCache", allEntries = true)
    @Transactional
    public SalaryIncreaseRequestDTO hrDecision(UUID requestId, SalaryIncreaseReviewDTO dto, String decidedBy) {
        log.info("HR {} salary increase request {} by {}", dto.isApproved() ? "approving" : "rejecting", requestId, decidedBy);

        SalaryIncreaseRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary increase request not found: " + requestId));

        if (dto.isApproved()) {
            request.hrApprove(decidedBy, dto.getComments());

            // Notify Finance users
            try {
                notificationService.sendNotificationToFinanceUsers(
                        "Salary Increase Requires Finance Approval",
                        "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName() + " has been approved by HR",
                        NotificationType.INFO,
                        "/hr/salary-increases",
                        "SALARY_INCREASE_REQUEST"
                );
            } catch (Exception e) {
                log.warn("Failed to send finance notification: {}", e.getMessage());
            }
        } else {
            request.hrReject(decidedBy, dto.getRejectionReason());
        }

        SalaryIncreaseRequest saved = requestRepository.save(request);
        return SalaryIncreaseRequestDTO.fromEntity(saved);
    }

    /**
     * Finance decision (approve or reject). On approval, applies the salary increase.
     */
    @CacheEvict(value = "statisticsCache", allEntries = true)
    @Transactional
    public SalaryIncreaseRequestDTO financeDecision(UUID requestId, SalaryIncreaseReviewDTO dto, String decidedBy) {
        log.info("Finance {} salary increase request {} by {}", dto.isApproved() ? "approving" : "rejecting", requestId, decidedBy);

        SalaryIncreaseRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary increase request not found: " + requestId));

        if (dto.isApproved()) {
            request.financeApprove(decidedBy, dto.getComments());
            requestRepository.save(request);

            // Apply the salary increase
            applyIncrease(request, decidedBy);

            // Notify HR users
            try {
                notificationService.sendNotificationToHRUsers(
                        "Salary Increase Applied",
                        "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName() + " has been approved and applied",
                        NotificationType.SUCCESS,
                        "/hr/salary-increases",
                        "SALARY_INCREASE_REQUEST"
                );
            } catch (Exception e) {
                log.warn("Failed to send HR notification: {}", e.getMessage());
            }
        } else {
            request.financeReject(decidedBy, dto.getRejectionReason());
            requestRepository.save(request);

            // Notify HR users of rejection
            try {
                notificationService.sendNotificationToHRUsers(
                        "Salary Increase Rejected by Finance",
                        "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName() + " was rejected by Finance",
                        NotificationType.WARNING,
                        "/hr/salary-increases",
                        "SALARY_INCREASE_REQUEST"
                );
            } catch (Exception e) {
                log.warn("Failed to send HR notification: {}", e.getMessage());
            }
        }

        return SalaryIncreaseRequestDTO.fromEntity(request);
    }

    /**
     * Apply the salary increase based on request type
     */
    private void applyIncrease(SalaryIncreaseRequest request, String appliedByUser) {
        if (request.getRequestType() == SalaryIncreaseRequest.RequestType.EMPLOYEE_LEVEL) {
            applyEmployeeLevelIncrease(request, appliedByUser);
        } else {
            applyPositionLevelIncrease(request, appliedByUser);
        }
        request.markApplied(appliedByUser);
        requestRepository.save(request);
    }

    private void applyEmployeeLevelIncrease(SalaryIncreaseRequest request, String appliedByUser) {
        Employee employee = request.getEmployee();
        BigDecimal previousSalary = employee.getMonthlySalary();

        employee.setBaseSalaryOverride(request.getRequestedSalary());
        employeeRepository.save(employee);

        // Create salary history record
        SalaryHistory history = SalaryHistory.builder()
                .employee(employee)
                .previousSalary(previousSalary)
                .newSalary(request.getRequestedSalary())
                .changeType("EMPLOYEE_INCREASE")
                .changeReason(request.getReason())
                .referenceId(request.getId())
                .referenceType("SALARY_INCREASE_REQUEST")
                .effectiveDate(request.getEffectiveDate())
                .changedBy(appliedByUser)
                .build();
        salaryHistoryRepository.save(history);

        log.info("Applied employee-level salary increase for {} from {} to {}",
                employee.getEmployeeNumber(), previousSalary, request.getRequestedSalary());
    }

    private void applyPositionLevelIncrease(SalaryIncreaseRequest request, String appliedByUser) {
        JobPosition position = request.getJobPosition();
        BigDecimal diff = request.getRequestedSalary().subtract(request.getCurrentSalary());

        // Update position salary
        Double newPositionSalary = request.getRequestedSalary().doubleValue();
        if (position.getContractType() == JobPosition.ContractType.MONTHLY) {
            position.setMonthlyBaseSalary(newPositionSalary);
        }
        position.setBaseSalary(newPositionSalary);
        jobPositionRepository.save(position);

        log.info("Updated position {} salary to {}", position.getPositionName(), newPositionSalary);

        // Find employees in this position and update the one with highest salary
        List<Employee> employees = employeeRepository.findByJobPositionId(position.getId());
        if (!employees.isEmpty()) {
            Employee highestPaid = employees.stream()
                    .max(Comparator.comparing(Employee::getMonthlySalary))
                    .orElse(null);

            if (highestPaid != null) {
                BigDecimal previousSalary = highestPaid.getMonthlySalary();
                BigDecimal currentOverride = highestPaid.getBaseSalaryOverride();
                BigDecimal newOverride;

                if (currentOverride != null) {
                    newOverride = currentOverride.add(diff);
                } else {
                    newOverride = previousSalary.add(diff);
                }

                highestPaid.setBaseSalaryOverride(newOverride);
                employeeRepository.save(highestPaid);

                // Create salary history for the affected employee
                SalaryHistory history = SalaryHistory.builder()
                        .employee(highestPaid)
                        .previousSalary(previousSalary)
                        .newSalary(newOverride)
                        .changeType("POSITION_INCREASE")
                        .changeReason("Position-level salary increase: " + request.getReason())
                        .referenceId(request.getId())
                        .referenceType("SALARY_INCREASE_REQUEST")
                        .effectiveDate(request.getEffectiveDate())
                        .changedBy(appliedByUser)
                        .build();
                salaryHistoryRepository.save(history);

                log.info("Applied position-level increase diff {} to employee {} (highest paid in position {})",
                        diff, highestPaid.getEmployeeNumber(), position.getPositionName());
            }
        }
    }

    // ==================== Query Methods ====================

    @Transactional(readOnly = true)
    public List<SalaryIncreaseRequestDTO> getAll() {
        log.debug("Fetching all salary increase requests");
        return requestRepository.findAllOrderByCreatedAtDesc().stream()
                .map(SalaryIncreaseRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalaryIncreaseRequestDTO> getByStatus(SalaryIncreaseRequest.Status status) {
        return requestRepository.findByStatus(status).stream()
                .map(SalaryIncreaseRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SalaryIncreaseRequestDTO getById(UUID id) {
        SalaryIncreaseRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary increase request not found: " + id));
        return SalaryIncreaseRequestDTO.fromEntity(request);
    }

    @Transactional(readOnly = true)
    public List<SalaryIncreaseRequestDTO> getByEmployee(UUID employeeId) {
        return requestRepository.findByEmployeeId(employeeId).stream()
                .map(SalaryIncreaseRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalaryHistoryDTO> getEmployeeSalaryHistory(UUID employeeId) {
        return salaryHistoryRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId).stream()
                .map(SalaryHistoryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "statisticsCache", key = "'salaryIncreaseStats'")
    @Transactional(readOnly = true)
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", requestRepository.count());
        stats.put("pendingHR", requestRepository.countByStatus(SalaryIncreaseRequest.Status.PENDING_HR));
        stats.put("pendingFinance", requestRepository.countByStatus(SalaryIncreaseRequest.Status.PENDING_FINANCE));
        stats.put("approved", requestRepository.countByStatus(SalaryIncreaseRequest.Status.APPROVED));
        stats.put("applied", requestRepository.countByStatus(SalaryIncreaseRequest.Status.APPLIED));
        stats.put("rejected", requestRepository.countByStatus(SalaryIncreaseRequest.Status.REJECTED));
        return stats;
    }
}
