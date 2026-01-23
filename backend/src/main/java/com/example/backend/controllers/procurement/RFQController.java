// RFQController.java
package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.OfferItemDTO;
import com.example.backend.dto.procurement.RFQExportRequest;
import com.example.backend.dto.procurement.RFQImportPreviewDTO;
import com.example.backend.services.procurement.OfferService;
import com.example.backend.services.procurement.RFQService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/procurement/rfq")
@CrossOrigin(origins = "*")
public class RFQController {

    private final RFQService rfqService;
    private final OfferService offerService;

    @Autowired
    public RFQController(RFQService rfqService, OfferService offerService) {
        this.rfqService = rfqService;
        this.offerService = offerService;
    }

    /**
     * Export RFQ to Excel
     */
    @PostMapping("/export")
    public ResponseEntity<byte[]> exportRFQ(@RequestBody RFQExportRequest request) {
        try {
            byte[] excelBytes = rfqService.exportRFQ(request);

            String filename = request.getFilename();
            if (filename == null || filename.trim().isEmpty()) {
                filename = "RFQ_" + System.currentTimeMillis();
            }

            // Ensure .xlsx extension
            if (!filename.toLowerCase().endsWith(".xlsx")) {
                filename += ".xlsx";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(excelBytes.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelBytes);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Import and preview RFQ response from Excel
     */
    @PostMapping("/{offerId}/import/preview")
    public ResponseEntity<RFQImportPreviewDTO> previewImport(
            @PathVariable UUID offerId,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            RFQImportPreviewDTO preview = rfqService.importAndPreviewRFQ(offerId, file);
            return ResponseEntity.ok(preview);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    /**
     * Confirm and import RFQ response data
     */
    @PostMapping("/{offerId}/import/confirm")
    public ResponseEntity<List<OfferItemDTO>> confirmImport(
            @PathVariable UUID offerId,
            @RequestParam UUID merchantId,
            @RequestParam List<UUID> validRowIds,
            @RequestBody RFQImportPreviewDTO preview,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            List<OfferItemDTO> items = offerService.confirmRFQImport(offerId, merchantId, validRowIds, preview, username);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}