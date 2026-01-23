package com.example.backend.controllers.finance.equipment;

import com.example.backend.dto.finance.equipment.EquipmentFinancialSummaryDTO;
import com.example.backend.services.finance.equipment.EquipmentFinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/equipment")
public class EquipmentFinanceController {

    @Autowired
    private EquipmentFinanceService equipmentFinanceService;

    /**
     * Get financial summary for a specific equipment
     * Includes: purchase price, current inventory value, and total expenses
     */
    @GetMapping("/{equipmentId}/financials")
    public ResponseEntity<EquipmentFinancialSummaryDTO> getEquipmentFinancials(@PathVariable UUID equipmentId) {
        EquipmentFinancialSummaryDTO financials = equipmentFinanceService.getEquipmentFinancials(equipmentId);
        return ResponseEntity.ok(financials);
    }

    /**
     * Manually trigger financial update for an equipment
     * Useful for recalculating values after data corrections
     */
    @PostMapping("/{equipmentId}/update-financials")
    public ResponseEntity<String> updateEquipmentFinancials(@PathVariable UUID equipmentId) {
        equipmentFinanceService.updateEquipmentFinancials(equipmentId);
        return ResponseEntity.ok("Equipment financial tracking updated successfully");
    }
}