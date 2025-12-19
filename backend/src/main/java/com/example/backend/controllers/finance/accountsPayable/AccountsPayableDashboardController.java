package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.BalanceSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.AccountsPayableDashboardSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.MerchantPaymentSummaryResponseDTO;
import com.example.backend.services.finance.accountsPayable.AccountsPayableDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/dashboard")
@CrossOrigin(origins = "http://localhost:3000")
public class AccountsPayableDashboardController {

    private final AccountsPayableDashboardService dashboardService;

    @Autowired
    public AccountsPayableDashboardController(AccountsPayableDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * GET /api/v1/finance/dashboard/summary
     * Get dashboard summary (6 cards + recent activity)
     */
    @GetMapping("/summary")
    public ResponseEntity<AccountsPayableDashboardSummaryResponseDTO> getDashboardSummary() {
        try {
            AccountsPayableDashboardSummaryResponseDTO summary = dashboardService.getDashboardSummary();
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/dashboard/balances
     * Get balance summary (overview of all accounts)
     */
    @GetMapping("/balances")
    public ResponseEntity<BalanceSummaryResponseDTO> getBalanceSummary() {
        try {
            BalanceSummaryResponseDTO balances = dashboardService.getBalanceSummary();
            return ResponseEntity.ok(balances);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/dashboard/merchants
     * Get merchant payment summaries (for "By Merchant" page)
     */
    @GetMapping("/merchants")
    public ResponseEntity<List<MerchantPaymentSummaryResponseDTO>> getMerchantPaymentSummaries() {
        try {
            List<MerchantPaymentSummaryResponseDTO> summaries = dashboardService.getMerchantPaymentSummaries();
            return ResponseEntity.ok(summaries);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}