package com.example.backend.services.finance.equipment;

import com.example.backend.dto.finance.equipment.EquipmentFinancialSummaryDTO; // ADD THIS
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EquipmentFinanceService {

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private ConsumableRepository consumableRepository;

    @Transactional
    public void updateEquipmentFinancials(UUID equipmentId) {
        System.out.println("📊 Updating financial tracking for equipment: " + equipmentId);

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        List<Consumable> inWarehouse = consumableRepository.findByEquipmentIdAndStatus(
                equipmentId, ItemStatus.IN_WAREHOUSE);

        Double currentInventoryValue = inWarehouse.stream()
                .filter(c -> c.getUnitPrice() != null && c.getUnitPrice() > 0)
                .mapToDouble(c -> c.getQuantity() * c.getUnitPrice())
                .sum();

        List<Consumable> consumed = consumableRepository.findByEquipmentIdAndStatus(
                equipmentId, ItemStatus.CONSUMED);

        Double totalExpenses = consumed.stream()
                .filter(c -> c.getUnitPrice() != null && c.getUnitPrice() > 0)
                .mapToDouble(c -> c.getQuantity() * c.getUnitPrice())
                .sum();

        equipment.setCurrentInventoryValue(currentInventoryValue);
        equipment.setTotalExpenses(totalExpenses);
        equipment.setFinanceBalanceUpdatedAt(LocalDateTime.now());

        equipmentRepository.save(equipment);

        System.out.println("✅ Equipment financials updated:");
        System.out.println("   - Current Inventory Value: " + currentInventoryValue + " EGP");
        System.out.println("   - Total Expenses: " + totalExpenses + " EGP");
    }

    public EquipmentFinancialSummaryDTO getEquipmentFinancials(UUID equipmentId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        updateEquipmentFinancials(equipmentId);

        return EquipmentFinancialSummaryDTO.builder()
                .equipmentId(equipment.getId())
                .equipmentName(equipment.getName())
                .purchasePrice(equipment.getEgpPrice())
                .currentInventoryValue(equipment.getCurrentInventoryValue())
                .totalExpenses(equipment.getTotalExpenses())
                .lastUpdated(equipment.getFinanceBalanceUpdatedAt())
                .build();
    }
}