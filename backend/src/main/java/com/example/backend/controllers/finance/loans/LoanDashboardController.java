package com.example.backend.controllers.finance.loans;

import com.example.backend.services.finance.loans.LoanDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/finance/loans/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LoanDashboardController {

    private final LoanDashboardService dashboardService;

    /**
     * Get dashboard summary
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        Map<String, Object> summary = dashboardService.getDashboardSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Get loans maturing soon
     */
    @GetMapping("/maturing-soon")
    public ResponseEntity<Map<String, Object>> getLoansMaturingSoon() {
        Map<String, Object> result = dashboardService.getLoansMaturingSoon();
        return ResponseEntity.ok(result);
    }

    /**
     * Get monthly installment summary
     */
    @GetMapping("/monthly-installments")
    public ResponseEntity<Map<String, Object>> getMonthlyInstallments(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();

        Map<String, Object> result = dashboardService.getMonthlyInstallmentSummary(y, m);
        return ResponseEntity.ok(result);
    }
}