package com.example.backend.services.hr;

import com.example.backend.dto.hr.demotion.*;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.generalLedger.AuditAction;
import com.example.backend.models.hr.*;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.*;
import com.example.backend.services.finance.generalLedger.AuditService;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemotionRequestService {

    private final DemotionRequestRepository demotionRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final JobPositionRepository jobPositionRepository;
    private final SalaryHistoryRepository salaryHistoryRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;
    private final NotificationService notificationService;
    private final VacationBalanceService vacationBalanceService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    /**
     * Create a new demotion request
     */
    @CacheEvict(value = "statisticsCache", allEntries = true)
    @Transactional
    public DemotionRequestDTO createRequest(DemotionRequestCreateDTO dto, String requestedBy) {
        log.info("Creating demotion request by {}", requestedBy);

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + dto.getEmployeeId()));

        if (!"ACTIVE".equalsIgnoreCase(employee.getStatus())) {
            throw new IllegalStateException("Can only create demotion requests for active employees");
        }

        JobPosition currentPosition = employee.getJobPosition();
        if (currentPosition == null) {
            throw new IllegalStateException("Employee has no current job position assigned");
        }

        JobPosition newPosition = jobPositionRepository.findById(dto.getNewPositionId())
                .orElseThrow(() -> new ResourceNotFoundException("New position not found: " + dto.getNewPositionId()));

        if (currentPosition.getId().equals(newPosition.getId())) {
            throw new IllegalStateException("Cannot demote to the same position");
        }

        // Check for pending requests
        if (demotionRequestRepository.existsPendingForEmployee(dto.getEmployeeId())) {
            throw new IllegalStateException("A demotion request is already pending for this employee");
        }

        BigDecimal currentSalary = employee.getMonthlySalary();
        BigDecimal newSalary = dto.getNewSalary();

        // Calculate reduction
        BigDecimal reductionAmount = currentSalary.subtract(newSalary);
        BigDecimal reductionPercentage = BigDecimal.ZERO;
        if (currentSalary.compareTo(BigDecimal.ZERO) > 0) {
            reductionPercentage = reductionAmount
                    .divide(currentSalary, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // Determine grades (JobPosition does not have a grade field; grades are user-provided)
        String currentGrade = null;
        String newGrade = dto.getNewGrade();

        String requestNumber = entityIdGeneratorService.generateNextId(EntityTypeConfig.DEMOTION_REQUEST);

        // Create initial approval step
        String approvalsJson = buildInitialApprovals(requestedBy);

        DemotionRequest request = DemotionRequest.builder()
                .requestNumber(requestNumber)
                .employee(employee)
                .currentPosition(currentPosition)
                .newPosition(newPosition)
                .currentGrade(currentGrade)
                .newGrade(newGrade)
                .currentSalary(currentSalary)
                .newSalary(newSalary)
                .salaryReductionAmount(reductionAmount)
                .salaryReductionPercentage(reductionPercentage)
                .effectiveDate(dto.getEffectiveDate())
                .reason(dto.getReason())
                .status(DemotionRequest.Status.PENDING)
                .approvals(approvalsJson)
                .site(employee.getSite())
                .requestedBy(requestedBy)
                .build();

        DemotionRequest saved = demotionRequestRepository.save(request);
        log.info("Created demotion request {} for employee {}", saved.getRequestNumber(), employee.getEmployeeNumber());

        // Audit log
        logAudit(saved, AuditAction.CREATE, Map.of(
                "action", "CREATED",
                "requestedBy", requestedBy,
                "employee", employee.getFullName(),
                "currentPosition", currentPosition.getPositionName(),
                "newPosition", newPosition.getPositionName()
        ));

        // Notify HR users
        sendNotification(
                "New Demotion Request",
                "Demotion request " + saved.getRequestNumber() + " submitted for " + employee.getFullName(),
                NotificationType.INFO
        );

        return DemotionRequestDTO.fromEntity(saved);
    }

    /**
     * Department Head decision (approve or reject)
     */
    @CacheEvict(value = "statisticsCache", allEntries = true)
    @Transactional
    public DemotionRequestDTO deptHeadDecision(UUID requestId, DemotionReviewDTO dto, String decidedBy) {
        log.info("Dept Head {} demotion request {} by {}",
                dto.isApproved() ? "approving" : "rejecting", requestId, decidedBy);

        DemotionRequest request = demotionRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demotion request not found: " + requestId));

        if (dto.isApproved()) {
            request.deptHeadApprove(decidedBy, dto.getComments());
            appendApprovalStep(request, "DEPT_HEAD", decidedBy, true, dto.getComments());

            // Audit
            logAudit(request, AuditAction.UPDATE, Map.of(
                    "action", "DEPT_HEAD_APPROVED",
                    "approvedBy", decidedBy
            ));

            // Notify HR for next approval
            sendNotification(
                    "Demotion Request Awaiting HR Approval",
                    "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName()
                            + " has been approved by Department Head",
                    NotificationType.INFO
            );
        } else {
            request.deptHeadReject(decidedBy, dto.getRejectionReason());
            appendApprovalStep(request, "DEPT_HEAD", decidedBy, false, dto.getRejectionReason());

            // Audit
            logAudit(request, AuditAction.UPDATE, Map.of(
                    "action", "DEPT_HEAD_REJECTED",
                    "rejectedBy", decidedBy,
                    "reason", dto.getRejectionReason() != null ? dto.getRejectionReason() : ""
            ));

            sendNotification(
                    "Demotion Request Rejected by Dept Head",
                    "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName()
                            + " was rejected by Department Head",
                    NotificationType.WARNING
            );
        }

        DemotionRequest saved = demotionRequestRepository.save(request);
        return DemotionRequestDTO.fromEntity(saved);
    }

    /**
     * HR decision (approve or reject). On approval, applies the demotion.
     */
    @CacheEvict(value = "statisticsCache", allEntries = true)
    @Transactional
    public DemotionRequestDTO hrDecision(UUID requestId, DemotionReviewDTO dto, String decidedBy) {
        log.info("HR {} demotion request {} by {}",
                dto.isApproved() ? "approving" : "rejecting", requestId, decidedBy);

        DemotionRequest request = demotionRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demotion request not found: " + requestId));

        if (dto.isApproved()) {
            request.hrApprove(decidedBy, dto.getComments());
            appendApprovalStep(request, "HR", decidedBy, true, dto.getComments());
            demotionRequestRepository.save(request);

            // Apply the demotion
            applyDemotion(request, decidedBy);

            // Audit
            logAudit(request, AuditAction.UPDATE, Map.of(
                    "action", "HR_APPROVED_AND_APPLIED",
                    "approvedBy", decidedBy
            ));

            sendNotification(
                    "Demotion Applied",
                    "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName()
                            + " has been approved and applied",
                    NotificationType.SUCCESS
            );
        } else {
            request.hrReject(decidedBy, dto.getRejectionReason());
            appendApprovalStep(request, "HR", decidedBy, false, dto.getRejectionReason());
            demotionRequestRepository.save(request);

            // Audit
            logAudit(request, AuditAction.UPDATE, Map.of(
                    "action", "HR_REJECTED",
                    "rejectedBy", decidedBy,
                    "reason", dto.getRejectionReason() != null ? dto.getRejectionReason() : ""
            ));

            sendNotification(
                    "Demotion Request Rejected by HR",
                    "Request " + request.getRequestNumber() + " for " + request.getEmployee().getFullName()
                            + " was rejected by HR",
                    NotificationType.WARNING
            );
        }

        return DemotionRequestDTO.fromEntity(request);
    }

    /**
     * Apply the demotion: update position, salary, create history, update vacation balance
     */
    private void applyDemotion(DemotionRequest request, String appliedByUser) {
        Employee employee = request.getEmployee();
        BigDecimal previousSalary = employee.getMonthlySalary();

        // 1. Update employee position
        employee.setJobPosition(request.getNewPosition());

        // 2. Update salary (set baseSalaryOverride to new salary)
        employee.setBaseSalaryOverride(request.getNewSalary());
        employeeRepository.save(employee);

        // 3. Create salary history record
        SalaryHistory history = SalaryHistory.builder()
                .employee(employee)
                .previousSalary(previousSalary)
                .newSalary(request.getNewSalary())
                .changeType("DEMOTION")
                .changeReason("Demotion: " + request.getReason())
                .referenceId(request.getId())
                .referenceType("DEMOTION_REQUEST")
                .effectiveDate(request.getEffectiveDate())
                .changedBy(appliedByUser)
                .build();
        salaryHistoryRepository.save(history);

        // 4. Update vacation balance based on new position
        try {
            vacationBalanceService.updateAllocationForEmployee(employee.getId());
            log.info("Updated vacation balance for employee {} after demotion", employee.getEmployeeNumber());
        } catch (Exception e) {
            log.warn("Failed to update vacation balance for employee {}: {}", employee.getEmployeeNumber(), e.getMessage());
        }

        // 5. Mark request as applied
        request.markApplied(appliedByUser);
        demotionRequestRepository.save(request);

        log.info("Applied demotion for employee {}: position {} -> {}, salary {} -> {}",
                employee.getEmployeeNumber(),
                request.getCurrentPosition().getPositionName(),
                request.getNewPosition().getPositionName(),
                previousSalary,
                request.getNewSalary());
    }

    // ==================== Query Methods ====================

    @Transactional(readOnly = true)
    public List<DemotionRequestDTO> getAll() {
        return demotionRequestRepository.findAllOrderByCreatedAtDesc().stream()
                .map(DemotionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DemotionRequestDTO> getByStatus(DemotionRequest.Status status) {
        return demotionRequestRepository.findByStatus(status).stream()
                .map(DemotionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DemotionRequestDTO getById(UUID id) {
        DemotionRequest request = demotionRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demotion request not found: " + id));
        return DemotionRequestDTO.fromEntity(request);
    }

    @Transactional(readOnly = true)
    public List<DemotionRequestDTO> getByEmployee(UUID employeeId) {
        return demotionRequestRepository.findByEmployeeId(employeeId).stream()
                .map(DemotionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "statisticsCache", key = "'demotionStats'")
    @Transactional(readOnly = true)
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", demotionRequestRepository.count());
        stats.put("pending", demotionRequestRepository.countByStatus(DemotionRequest.Status.PENDING));
        stats.put("deptHeadApproved", demotionRequestRepository.countByStatus(DemotionRequest.Status.DEPT_HEAD_APPROVED));
        stats.put("hrApproved", demotionRequestRepository.countByStatus(DemotionRequest.Status.HR_APPROVED));
        stats.put("applied", demotionRequestRepository.countByStatus(DemotionRequest.Status.APPLIED));
        stats.put("rejected", demotionRequestRepository.countByStatus(DemotionRequest.Status.REJECTED));
        return stats;
    }

    // ==================== Private Helpers ====================

    private String buildInitialApprovals(String requestedBy) {
        try {
            List<Map<String, Object>> steps = new ArrayList<>();
            steps.add(Map.of(
                    "step", "SUBMISSION",
                    "by", requestedBy,
                    "at", LocalDateTime.now().toString(),
                    "approved", true,
                    "comments", "Request submitted"
            ));
            return objectMapper.writeValueAsString(steps);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize approval steps: {}", e.getMessage());
            return "[]";
        }
    }

    private void appendApprovalStep(DemotionRequest request, String stepName, String by, boolean approved, String comments) {
        try {
            List<Map<String, Object>> steps;
            if (request.getApprovals() != null && !request.getApprovals().isEmpty()) {
                steps = objectMapper.readValue(request.getApprovals(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
            } else {
                steps = new ArrayList<>();
            }

            Map<String, Object> step = new LinkedHashMap<>();
            step.put("step", stepName);
            step.put("by", by);
            step.put("at", LocalDateTime.now().toString());
            step.put("approved", approved);
            step.put("comments", comments != null ? comments : "");

            steps.add(step);
            request.setApprovals(objectMapper.writeValueAsString(steps));
        } catch (JsonProcessingException e) {
            log.warn("Failed to update approval steps: {}", e.getMessage());
        }
    }

    private void logAudit(DemotionRequest request, AuditAction action, Map<String, Object> changes) {
        try {
            auditService.logEvent("DemotionRequest", request.getId(), action, changes, null);
        } catch (Exception e) {
            log.warn("Failed to create audit log for demotion request {}: {}", request.getRequestNumber(), e.getMessage());
        }
    }

    private void sendNotification(String title, String message, NotificationType type) {
        try {
            notificationService.sendNotificationToHRUsers(
                    title, message, type, "/hr/demotions", "DEMOTION_REQUEST"
            );
        } catch (Exception e) {
            log.warn("Failed to send notification: {}", e.getMessage());
        }
    }
}
