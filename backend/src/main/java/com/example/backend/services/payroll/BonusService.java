package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.BonusResponseDTO;
import com.example.backend.dto.payroll.BulkCreateBonusDTO;
import com.example.backend.dto.payroll.CreateBonusDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.PaymentSourceType;
import com.example.backend.models.finance.accountsPayable.PaymentTargetType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Bonus;
import com.example.backend.models.payroll.BonusType;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.BonusTypeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.models.id.EntityTypeConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing employee bonuses with Finance integration
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BonusService {

    private final BonusRepository bonusRepository;
    private final BonusTypeRepository bonusTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final SiteRepository siteRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;

    // ===================================================
    // BONUS CRUD OPERATIONS
    // ===================================================

    /**
     * Create a new bonus
     */
    @Transactional
    public BonusResponseDTO createBonus(CreateBonusDTO dto, String username, UUID siteId) {
        log.info("Creating bonus for employee {} by {}", dto.getEmployeeId(), username);

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + dto.getEmployeeId()));

        BonusType bonusType = bonusTypeRepository.findById(dto.getBonusTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Bonus type not found: " + dto.getBonusTypeId()));

        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException("Site not found: " + siteId));

        // Generate bonus number
        String bonusNumber = entityIdGeneratorService.generateNextId(EntityTypeConfig.BONUS);

        Bonus bonus = Bonus.builder()
                .bonusNumber(bonusNumber)
                .employee(employee)
                .bonusType(bonusType)
                .amount(dto.getAmount())
                .effectiveMonth(dto.getEffectiveMonth())
                .effectiveYear(dto.getEffectiveYear())
                .status(Bonus.BonusStatus.PENDING_HR_APPROVAL)
                .reason(dto.getReason())
                .notes(dto.getNotes())
                .createdBy(username)
                .site(site)
                .build();

        Bonus saved = bonusRepository.save(bonus);
        log.info("Created bonus: {} for employee {}", saved.getBonusNumber(), employee.getId());

        return mapToResponseDTO(saved);
    }

    /**
     * Create bonuses for multiple employees (bulk)
     */
    @Transactional
    public List<BonusResponseDTO> createBulkBonus(BulkCreateBonusDTO dto, String username, UUID siteId) {
        log.info("Creating bulk bonuses for {} employees by {}", dto.getEmployeeIds().size(), username);

        BonusType bonusType = bonusTypeRepository.findById(dto.getBonusTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Bonus type not found: " + dto.getBonusTypeId()));

        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException("Site not found: " + siteId));

        UUID bulkBonusId = UUID.randomUUID();
        List<Bonus> bonuses = new ArrayList<>();

        for (UUID employeeId : dto.getEmployeeIds()) {
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

            String bonusNumber = entityIdGeneratorService.generateNextId(EntityTypeConfig.BONUS);

            Bonus bonus = Bonus.builder()
                    .bonusNumber(bonusNumber)
                    .employee(employee)
                    .bonusType(bonusType)
                    .amount(dto.getAmount())
                    .effectiveMonth(dto.getEffectiveMonth())
                    .effectiveYear(dto.getEffectiveYear())
                    .status(Bonus.BonusStatus.PENDING_HR_APPROVAL)
                    .reason(dto.getReason())
                    .bulkBonusId(bulkBonusId)
                    .createdBy(username)
                    .site(site)
                    .build();

            bonuses.add(bonus);
        }

        List<Bonus> savedBonuses = bonusRepository.saveAll(bonuses);
        log.info("Created {} bulk bonuses with bulkBonusId: {}", savedBonuses.size(), bulkBonusId);

        return savedBonuses.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all bonuses for a site
     */
    public List<BonusResponseDTO> getAllBonuses(UUID siteId) {
        return bonusRepository.findBySiteId(siteId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get bonus by ID
     */
    public BonusResponseDTO getBonusById(UUID id) {
        Bonus bonus = bonusRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus not found: " + id));
        return mapToResponseDTO(bonus);
    }

    /**
     * Get bonuses by employee
     */
    public List<BonusResponseDTO> getBonusesByEmployee(UUID employeeId) {
        return bonusRepository.findByEmployeeId(employeeId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get bonuses for a payroll period (HR_APPROVED or PAID)
     */
    public List<BonusResponseDTO> getBonusesForPayroll(int month, int year, UUID siteId) {
        List<Bonus.BonusStatus> statuses = List.of(
                Bonus.BonusStatus.HR_APPROVED,
                Bonus.BonusStatus.PENDING_PAYMENT,
                Bonus.BonusStatus.PAID
        );
        return bonusRepository.findByMonthYearAndSiteAndStatusIn(month, year, siteId, statuses).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ===================================================
    // HR APPROVAL WORKFLOW
    // ===================================================

    /**
     * HR approves a bonus and auto-creates a PaymentRequest
     */
    @Transactional
    public BonusResponseDTO hrApproveBonus(UUID bonusId, String approver) {
        log.info("HR approving bonus {} by {}", bonusId, approver);

        Bonus bonus = bonusRepository.findById(bonusId)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus not found: " + bonusId));

        // HR approval
        bonus.hrApprove(approver);
        bonusRepository.save(bonus);
        log.info("HR approved bonus: {}", bonus.getBonusNumber());

        // Auto-create PaymentRequest for the bonus
        try {
            Employee employee = bonus.getEmployee();
            PaymentRequest paymentRequest = createPaymentRequestForBonus(bonus, employee);

            // Update bonus with payment request info
            bonus.markPendingPayment(paymentRequest.getId(), paymentRequest.getRequestNumber());
            bonusRepository.save(bonus);

            log.info("Auto-created payment request {} for bonus {}",
                    paymentRequest.getRequestNumber(), bonus.getBonusNumber());
        } catch (Exception e) {
            log.error("Failed to auto-create payment request for bonus {}: {}",
                    bonus.getBonusNumber(), e.getMessage());
            // Don't fail the HR approval if payment request creation fails
        }

        return mapToResponseDTO(bonus);
    }

    /**
     * HR rejects a bonus
     */
    @Transactional
    public BonusResponseDTO hrRejectBonus(UUID bonusId, String rejector, String reason) {
        log.info("HR rejecting bonus {} by {}", bonusId, rejector);

        Bonus bonus = bonusRepository.findById(bonusId)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus not found: " + bonusId));

        bonus.hrReject(rejector, reason);
        Bonus saved = bonusRepository.save(bonus);

        log.info("HR rejected bonus: {}", saved.getBonusNumber());
        return mapToResponseDTO(saved);
    }

    /**
     * Cancel a bonus
     */
    @Transactional
    public BonusResponseDTO cancelBonus(UUID bonusId) {
        log.info("Cancelling bonus {}", bonusId);

        Bonus bonus = bonusRepository.findById(bonusId)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus not found: " + bonusId));

        bonus.cancel();
        Bonus saved = bonusRepository.save(bonus);

        log.info("Cancelled bonus: {}", saved.getBonusNumber());
        return mapToResponseDTO(saved);
    }

    // ===================================================
    // STATISTICS
    // ===================================================

    /**
     * Get bonus statistics for a site
     */
    public Map<String, Object> getStatistics(UUID siteId) {
        Map<String, Object> stats = new HashMap<>();

        // Counts by status
        long pendingCount = bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.PENDING_HR_APPROVAL, siteId);
        long approvedCount = bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.HR_APPROVED, siteId);
        long pendingPaymentCount = bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.PENDING_PAYMENT, siteId);
        long paidCount = bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.PAID, siteId);
        long rejectedCount = bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.HR_REJECTED, siteId);
        long cancelledCount = bonusRepository.countByStatusAndSiteId(Bonus.BonusStatus.CANCELLED, siteId);

        stats.put("pendingCount", pendingCount);
        stats.put("approvedCount", approvedCount);
        stats.put("pendingPaymentCount", pendingPaymentCount);
        stats.put("paidCount", paidCount);
        stats.put("rejectedCount", rejectedCount);
        stats.put("cancelledCount", cancelledCount);
        stats.put("totalCount", pendingCount + approvedCount + pendingPaymentCount + paidCount + rejectedCount + cancelledCount);

        // Amounts by status
        BigDecimal pendingAmount = bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.PENDING_HR_APPROVAL, siteId);
        BigDecimal approvedAmount = bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.HR_APPROVED, siteId);
        BigDecimal pendingPaymentAmount = bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.PENDING_PAYMENT, siteId);
        BigDecimal paidAmount = bonusRepository.sumAmountByStatusAndSiteId(Bonus.BonusStatus.PAID, siteId);

        stats.put("pendingAmount", pendingAmount);
        stats.put("approvedAmount", approvedAmount);
        stats.put("pendingPaymentAmount", pendingPaymentAmount);
        stats.put("paidAmount", paidAmount);

        return stats;
    }

    // ===================================================
    // HELPER METHODS
    // ===================================================

    /**
     * Create a PaymentRequest for a bonus (following LoanService pattern)
     */
    private PaymentRequest createPaymentRequestForBonus(Bonus bonus, Employee employee) {
        String requestNumber = generatePaymentRequestNumber();

        String employeeName = employee.getFirstName() + " " + employee.getLastName();
        String targetDetails = buildEmployeeTargetDetails(
                employee.getBankName(),
                employee.getBankAccountNumber(),
                employee.getWalletNumber()
        );

        PaymentRequest paymentRequest = PaymentRequest.builder()
                // Source polymorphism
                .sourceType(PaymentSourceType.BONUS)
                .sourceId(bonus.getId())
                .sourceNumber(bonus.getBonusNumber())
                .sourceDescription("Bonus Payment: " + bonus.getBonusNumber() + " - " +
                        bonus.getBonusType().getName() +
                        (bonus.getReason() != null ? " - " + bonus.getReason() : ""))
                // Target polymorphism
                .targetType(PaymentTargetType.EMPLOYEE)
                .targetId(employee.getId())
                .targetName(employeeName)
                .targetDetails(targetDetails)
                // Financial details
                .requestNumber(requestNumber)
                .requestedAmount(bonus.getAmount())
                .currency("EGP")
                .description("Bonus payment to " + employeeName + " - " + bonus.getBonusType().getName())
                .status(PaymentRequestStatus.PENDING)
                // Requestor info
                .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))
                .requestedByUserName(bonus.getHrApprovedBy())
                .requestedByDepartment("HR")
                .requestedAt(LocalDateTime.now())
                // Payment tracking
                .totalPaidAmount(BigDecimal.ZERO)
                .remainingAmount(bonus.getAmount())
                .build();

        return paymentRequestRepository.save(paymentRequest);
    }

    /**
     * Build employee target details JSON for PaymentRequest
     */
    private String buildEmployeeTargetDetails(String bankName, String bankAccountNumber, String walletNumber) {
        StringBuilder details = new StringBuilder("{");
        details.append("\"type\":\"EMPLOYEE\"");

        if (bankName != null && !bankName.isEmpty()) {
            details.append(",\"bankName\":\"").append(bankName).append("\"");
        }
        if (bankAccountNumber != null && !bankAccountNumber.isEmpty()) {
            details.append(",\"bankAccountNumber\":\"").append(bankAccountNumber).append("\"");
        }
        if (walletNumber != null && !walletNumber.isEmpty()) {
            details.append(",\"walletNumber\":\"").append(walletNumber).append("\"");
        }

        details.append("}");
        return details.toString();
    }

    /**
     * Generate payment request number for bonus payments
     */
    private String generatePaymentRequestNumber() {
        int year = LocalDate.now().getYear();
        String prefix = "PR-" + year + "-";
        Long maxSequence = paymentRequestRepository.getMaxRequestNumberSequence(prefix + "%");
        long nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
        return String.format("%s%06d", prefix, nextSequence);
    }

    /**
     * Map Bonus entity to BonusResponseDTO
     */
    private BonusResponseDTO mapToResponseDTO(Bonus bonus) {
        Employee employee = bonus.getEmployee();
        BonusType bonusType = bonus.getBonusType();

        String employeeName = employee != null
                ? employee.getFirstName() + " " + employee.getLastName()
                : null;

        return BonusResponseDTO.builder()
                .id(bonus.getId())
                .bonusNumber(bonus.getBonusNumber())
                .employeeId(employee != null ? employee.getId() : null)
                .employeeName(employeeName)
                .bonusTypeId(bonusType != null ? bonusType.getId() : null)
                .bonusTypeName(bonusType != null ? bonusType.getName() : null)
                .bonusTypeCode(bonusType != null ? bonusType.getCode() : null)
                .amount(bonus.getAmount())
                .effectiveMonth(bonus.getEffectiveMonth())
                .effectiveYear(bonus.getEffectiveYear())
                .status(bonus.getStatus().name())
                .statusDisplayName(bonus.getStatus().getDisplayName())
                .reason(bonus.getReason())
                .notes(bonus.getNotes())
                .hrApprovedBy(bonus.getHrApprovedBy())
                .hrApprovedAt(bonus.getHrApprovedAt())
                .hrRejectedBy(bonus.getHrRejectedBy())
                .hrRejectedAt(bonus.getHrRejectedAt())
                .hrRejectionReason(bonus.getHrRejectionReason())
                .paymentRequestId(bonus.getPaymentRequestId())
                .paymentRequestNumber(bonus.getPaymentRequestNumber())
                .bulkBonusId(bonus.getBulkBonusId())
                .payrollId(bonus.getPayroll() != null ? bonus.getPayroll().getId() : null)
                .createdBy(bonus.getCreatedBy())
                .createdAt(bonus.getCreatedAt())
                .updatedAt(bonus.getUpdatedAt())
                .siteId(bonus.getSite() != null ? bonus.getSite().getId() : null)
                .build();
    }
}
