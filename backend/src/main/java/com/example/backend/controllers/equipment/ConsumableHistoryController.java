package com.example.backend.controllers.equipment;

import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.services.equipment.ConsumablesService;
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

    @Autowired
    private ConsumablesService consumablesService;

    /**
     * Get consumable history for a specific consumable
     * 
     * This endpoint returns the proper transaction-based history of how a given consumable 
     * came to exist in inventory. It rebuilds the history based on actual relationships 
     * and logic, not the unreliable transaction field in consumables.
     * 
     * Logic:
     * 1. Get the equipment field from the consumable - this tells us where this consumable currently is
     * 2. Find all transactions where this equipment was a receiver
     * 3. Check if transaction has purpose "CONSUMABLE" and equipment is receiver  
     * 4. Check if any transaction item matches the consumable's item type
     * 5. Return those transactions with relevant metadata (date, source, purpose, etc.)
     * 
     * Endpoint: GET /api/v1/equipment/consumables/{consumableId}/history
     */
    @GetMapping("/consumables/{consumableId}/history")
    public ResponseEntity<List<TransactionDTO>> getConsumableHistory(@PathVariable UUID consumableId) {
        try {
            System.out.println("🔍 Fetching consumable history for consumable: " + consumableId);
            System.out.println("   Rebuilding history based on transaction relationships (not unreliable transaction field)");
            System.out.println("   Including proper sender/receiver names and specific quantities contributed");
            
            List<TransactionDTO> transactionHistory = consumablesService.getConsumableHistory(consumableId);
            
            System.out.println("✅ Found " + transactionHistory.size() + " transactions that contributed to this consumable");
            System.out.println("   Each transaction shows: batch number, quantity contributed, sender/receiver names");
            
            return ResponseEntity.ok(transactionHistory);
            
        } catch (IllegalArgumentException e) {
            System.out.println("❌ Consumable not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            
        } catch (Exception e) {
            System.out.println("💥 Error fetching consumable history: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 