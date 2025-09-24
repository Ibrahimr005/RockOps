package com.example.backend.controllers;

import com.example.backend.models.Partner;
import com.example.backend.services.PartnerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/partner")
public class PartnerController
{
    private final PartnerService partnerService;

    @Autowired
    public PartnerController(PartnerService partnerService) {
        this.partnerService = partnerService;
    }

    @GetMapping("/getallpartners")
    public ResponseEntity<List<Partner>> getAllPartners() {
        return ResponseEntity.ok(partnerService.getAllPartners());
    }

    @PostMapping("/add")
    public ResponseEntity<Partner> addPartner(@RequestParam String firstName, @RequestParam String lastName) {
        Partner newPartner = new Partner();
        newPartner.setFirstName(firstName);
        newPartner.setLastName(lastName);

        Partner savedPartner = partnerService.savePartner(newPartner);
        return new ResponseEntity<>(savedPartner, HttpStatus.CREATED);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Partner> updatePartner(@PathVariable int id,
                                                 @RequestParam String firstName,
                                                 @RequestParam String lastName) {
        Partner updatedPartner = new Partner();
        updatedPartner.setFirstName(firstName);
        updatedPartner.setLastName(lastName);

        Partner savedPartner = partnerService.updatePartner(id, updatedPartner);
        return ResponseEntity.ok(savedPartner);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deletePartner(@PathVariable int id) {
        try {
            partnerService.deletePartner(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            // Create a proper error response that your frontend can read
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }
}