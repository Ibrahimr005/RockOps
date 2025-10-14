package com.example.backend.services.equipment;

import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class EquipmentBrandService {

    @Autowired
    private EquipmentBrandRepository equipmentBrandRepository;

    @Autowired
    private NotificationService notificationService;

    public List<EquipmentBrand> getAllEquipmentBrands() {
        return equipmentBrandRepository.findAll();
    }

    public Optional<EquipmentBrand> getEquipmentBrandById(UUID id) {
        return equipmentBrandRepository.findById(id);
    }

    public EquipmentBrand createEquipmentBrand(EquipmentBrand equipmentBrand) {
        // Check if a brand with this name already exists
        Optional<EquipmentBrand> existingBrand = equipmentBrandRepository.findByName(equipmentBrand.getName());
        if (existingBrand.isPresent()) {
            // For equipment brands, we don't have soft delete, so it's always an active duplicate
            throw ResourceConflictException.duplicateActive("Equipment brand", equipmentBrand.getName());
        }

        EquipmentBrand savedBrand = equipmentBrandRepository.save(equipmentBrand);

// Send notifications
        try {
            String notificationTitle = "New Equipment Brand Created";
            String notificationMessage = "Equipment brand '" + savedBrand.getName() + "' has been created. " +
                    (savedBrand.getDescription() != null ? savedBrand.getDescription() : "");
            String actionUrl = "/equipment/brand-management";
            String relatedEntity = savedBrand.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Equipment brand creation notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment brand creation notification: " + e.getMessage());
        }

        return savedBrand;
        //return equipmentBrandRepository.save(equipmentBrand);
    }

    public EquipmentBrand updateEquipmentBrand(UUID id, EquipmentBrand equipmentBrand) {
        Optional<EquipmentBrand> existingBrand = equipmentBrandRepository.findById(id);
        if (existingBrand.isPresent()) {
            EquipmentBrand brand = existingBrand.get();
            
            // Check if name is being changed and if it conflicts with another brand
            if (!brand.getName().equals(equipmentBrand.getName())) {
                Optional<EquipmentBrand> conflictingBrand = equipmentBrandRepository.findByName(equipmentBrand.getName());
                if (conflictingBrand.isPresent()) {
                    throw ResourceConflictException.duplicateActive("Equipment brand", equipmentBrand.getName());
                }
            }
            
            brand.setName(equipmentBrand.getName());
            brand.setDescription(equipmentBrand.getDescription());

            EquipmentBrand updatedBrand = equipmentBrandRepository.save(brand);

// Send notifications
            try {
                String notificationTitle = "Equipment Brand Updated";
                String notificationMessage = "Equipment brand '" + updatedBrand.getName() + "' has been updated. " +
                        (updatedBrand.getDescription() != null ? updatedBrand.getDescription() : "");
                String actionUrl = "/equipment/brand-management";
                String relatedEntity = updatedBrand.getId().toString();

                List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.INFO,
                        actionUrl,
                        relatedEntity
                );

                System.out.println("Equipment brand update notification sent successfully");
            } catch (Exception e) {
                System.err.println("Failed to send equipment brand update notification: " + e.getMessage());
            }

            return updatedBrand;
            //return equipmentBrandRepository.save(brand);
        }
        throw new RuntimeException("Equipment brand not found");
    }

    public void deleteEquipmentBrand(UUID id) {
        if (!equipmentBrandRepository.existsById(id)) {
            throw new RuntimeException("Equipment brand not found");
        }

        // Get brand details before deletion
        EquipmentBrand brand = equipmentBrandRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Equipment brand not found"));

// Send notifications
        try {
            String notificationTitle = "Equipment Brand Deleted";
            String notificationMessage = "Equipment brand '" + brand.getName() + "' has been deleted. " +
                    (brand.getDescription() != null ? brand.getDescription() : "");
            String actionUrl = "/equipment/brand-management";
            String relatedEntity = id.toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Equipment brand deletion notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment brand deletion notification: " + e.getMessage());
        }
        
        equipmentBrandRepository.deleteById(id);
    }
} 