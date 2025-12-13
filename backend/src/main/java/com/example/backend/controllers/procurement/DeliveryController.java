package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.DeliverySessionDTO;
import com.example.backend.dto.procurement.ProcessDeliveryRequest;
import com.example.backend.services.procurement.DeliveryProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/procurement/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryProcessingService deliveryProcessingService;

    @PostMapping("/process")
    public ResponseEntity<DeliverySessionDTO> processDelivery(
            @RequestBody ProcessDeliveryRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Override with actual authenticated user
        request.setProcessedBy(userDetails.getUsername());

        DeliverySessionDTO result = deliveryProcessingService.processDelivery(request);
        return ResponseEntity.ok(result);
    }
}