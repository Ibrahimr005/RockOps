package com.example.backend.controllers.merchant;



import com.example.backend.models.merchant.Merchant;
import com.example.backend.services.merchant.MerchantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantService merchantService;



    @GetMapping
    public ResponseEntity<?> getAllMerchants() {
        try {
            List<Merchant> merchants = merchantService.getAllMerchants();
            return ResponseEntity.ok(merchants);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Merchant> getMerchantById(@PathVariable UUID id) {
        try {
            Merchant merchant = merchantService.getMerchantById(id);
            return ResponseEntity.ok(merchant);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(null); // Not found
        }
    }

}
