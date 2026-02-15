package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.EquipmentPurchaseSpecDTO;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import com.example.backend.services.procurement.EquipmentPurchaseSpecService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/procurement/equipment-purchase-specs")
@RequiredArgsConstructor
public class EquipmentPurchaseSpecController {

    private final EquipmentPurchaseSpecService specService;

    @GetMapping
    public ResponseEntity<List<EquipmentPurchaseSpec>> getAll() {
        return ResponseEntity.ok(specService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentPurchaseSpec> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(specService.getById(id));
    }

    @PostMapping
    public ResponseEntity<EquipmentPurchaseSpec> create(@RequestBody EquipmentPurchaseSpecDTO dto) {
        return ResponseEntity.ok(specService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipmentPurchaseSpec> update(@PathVariable UUID id, @RequestBody EquipmentPurchaseSpecDTO dto) {
        return ResponseEntity.ok(specService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        specService.delete(id);
        return ResponseEntity.ok().build();
    }
}
