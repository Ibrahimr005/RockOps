package com.example.backend.controllers;

import com.example.backend.models.Partner;
import com.example.backend.services.PartnerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}