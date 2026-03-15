package com.example.backend.controllers.equipment;

import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.dto.equipment.ConsumableHistoryDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.services.equipment.ConsumablesService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/equipment")
@CrossOrigin(origins = "http://localhost:3000")
public class ConsumableHistoryController {

    private static final Logger log = LoggerFactory.getLogger(ConsumableHistoryController.class);

    @Autowired
    private ConsumablesService consumablesService;

    /**
     * Get consumable history for a specific consumable
     *
     * This endpoint returns the proper transaction-based history of how a given consumable
     * came to exist in inventory. It rebuilds the history based on actual relationships
     * and logic, not the unreliable transaction field in consumables.
     *
     * Endpoint: GET /api/v1/equipment/consumables/{consumableId}/history
     */
    @GetMapping("/consumables/{consumableId}/history")
    public ResponseEntity<ConsumableHistoryDTO> getConsumableHistory(@PathVariable UUID consumableId) {
        try {
            ConsumableHistoryDTO history = consumablesService.getConsumableHistoryWithResolutions(consumableId);
            log.debug("Found {} transactions and {} resolutions for consumable {}",
                    history.getTransactions().size(), history.getResolutions().size(), consumableId);
            return ResponseEntity.ok(history);

        } catch (IllegalArgumentException e) {
            log.warn("Consumable not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        } catch (Exception e) {
            log.error("Error fetching consumable history for {}", consumableId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * EMERGENCY ENDPOINT: Manually trigger backfill for all resolved transaction items
     * This fixes historical data that was resolved before the transaction item update fix
     */
    @PostMapping("/consumables/backfill-resolved-items")
    public ResponseEntity<String> backfillResolvedTransactionItems() {
        try {
            log.info("Manual backfill triggered via API endpoint");
            consumablesService.manualBackfillAllResolvedTransactionItems();
            return ResponseEntity.ok("Backfill completed successfully. Check logs for details.");
        } catch (Exception e) {
            log.error("Backfill failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Backfill failed: " + e.getMessage());
        }
    }
}
