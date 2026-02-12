package com.example.backend.services.procurement;

import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.merchant.MerchantType;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ProcurementTeamService {

    @Autowired
    private EntityIdGeneratorService idGeneratorService;

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private ItemCategoryRepository itemCategoryRepository;

    @Transactional  // ADD THIS
    public Merchant addMerchant(Map<String, Object> merchantData) {
        try {
            System.out.println("Step 1: Extracting required fields...");

            String name = (String) merchantData.get("name");
            System.out.println("Name: " + name);

            // Handle multiple merchant types
            List<MerchantType> merchantTypes = new ArrayList<>();
            if (merchantData.containsKey("merchantTypes")) {
                List<String> typeStrings = (List<String>) merchantData.get("merchantTypes");
                for (String typeStr : typeStrings) {
                    merchantTypes.add(MerchantType.valueOf(typeStr.toUpperCase()));
                }
            }
            System.out.println("Merchant Types: " + merchantTypes);

            // Optional fields
            String contactEmail = (String) merchantData.get("contactEmail");
            String contactPhone = (String) merchantData.get("contactPhone");
            String contactSecondPhone = (String) merchantData.get("contactSecondPhone");
            String contactPersonName = (String) merchantData.get("contactPersonName");
            String address = (String) merchantData.get("address");
            String preferredPaymentMethod = (String) merchantData.get("preferredPaymentMethod");
            String taxIdentificationNumber = (String) merchantData.get("taxIdentificationNumber");
            String photoUrl = (String) merchantData.get("photoUrl");
            Double reliabilityScore = merchantData.get("reliabilityScore") != null ? Double.valueOf(merchantData.get("reliabilityScore").toString()) : null;
            Double averageDeliveryTime = merchantData.get("averageDeliveryTime") != null ? Double.valueOf(merchantData.get("averageDeliveryTime").toString()) : null;

            Date lastOrderDate = null;
            if (merchantData.get("lastOrderDate") != null) {
                lastOrderDate = new Date(Long.parseLong(merchantData.get("lastOrderDate").toString()));
            }

            String notes = (String) merchantData.get("notes");

            // Build and save merchant FIRST without sites/categories
            System.out.println("Step 2: Building and saving merchant...");

            String merchantId = idGeneratorService.generateNextId(EntityTypeConfig.MERCHANT);
            System.out.println("✅ Generated merchant ID: " + merchantId);

            Merchant merchant = Merchant.builder()
                    .merchantId(merchantId)
                    .name(name)
                    .merchantTypes(merchantTypes != null && !merchantTypes.isEmpty() ? merchantTypes : new ArrayList<>())
                    .contactEmail(contactEmail)
                    .contactPhone(contactPhone)
                    .contactSecondPhone(contactSecondPhone)
                    .contactPersonName(contactPersonName)
                    .address(address)
                    .preferredPaymentMethod(preferredPaymentMethod)
                    .taxIdentificationNumber(taxIdentificationNumber)
                    .photoUrl(photoUrl)
                    .reliabilityScore(reliabilityScore)
                    .averageDeliveryTime(averageDeliveryTime)
                    .lastOrderDate(lastOrderDate)
                    .notes(notes)
                    .sites(new ArrayList<>())  // Empty initially
                    .itemCategories(new ArrayList<>())  // Empty initially
                    .contacts(new ArrayList<>())
                    .documents(new ArrayList<>())
                    .build();

            System.out.println("🔵 Saving merchant...");
            Merchant saved = merchantRepository.save(merchant);
            System.out.println("✅ Merchant saved with UUID: " + saved.getId());

            // NOW add sites if provided
            if (merchantData.containsKey("siteIds")) {
                System.out.println("Step 3: Adding sites to merchant...");
                List<String> siteIds = (List<String>) merchantData.get("siteIds");
                for (String siteId : siteIds) {
                    Site site = siteRepository.findById(UUID.fromString(siteId))
                            .orElseThrow(() -> new RuntimeException("Site not found: " + siteId));
                    saved.getSites().add(site);
                }
                System.out.println("✅ Added " + saved.getSites().size() + " sites");
            }

            // Add item categories if provided
            if (merchantData.containsKey("itemCategoryIds")) {
                System.out.println("Step 4: Adding item categories to merchant...");
                String[] categoryIds = ((String) merchantData.get("itemCategoryIds")).split(",");
                for (String id : categoryIds) {
                    UUID uuid = UUID.fromString(id.trim());
                    ItemCategory category = itemCategoryRepository.findById(uuid)
                            .orElseThrow(() -> new RuntimeException("Category not found: " + id));
                    saved.getItemCategories().add(category);
                }
                System.out.println("✅ Added " + saved.getItemCategories().size() + " categories");
            }

            // Save again with relationships
            Merchant finalMerchant = merchantRepository.save(saved);
            System.out.println("✅ Final save complete with all relationships");

            return finalMerchant;

        } catch (Exception e) {
            System.err.println("❌ ERROR: " + e.getMessage());
            System.err.println("❌ Error type: " + e.getClass().getName());
            e.printStackTrace();
            throw new RuntimeException("Failed to create merchant: " + e.getMessage(), e);
        }
    }

    public Merchant updateMerchant(UUID id, Map<String, Object> merchantData) {
        try {
            System.out.println("Updating merchant with ID: " + id);

            if (id == null) {
                throw new RuntimeException("Merchant ID cannot be null");
            }

            Merchant merchant = merchantRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Merchant not found with ID: " + id));

            System.out.println("Found existing merchant: " + merchant.getName());

            // Update name
            if (merchantData.containsKey("name")) {
                String name = (String) merchantData.get("name");
                if (name != null && !name.trim().isEmpty()) {
                    merchant.setName(name.trim());
                }
            }

            // Update merchant types
            if (merchantData.containsKey("merchantTypes")) {
                List<String> typeStrings = (List<String>) merchantData.get("merchantTypes");
                if (typeStrings != null && !typeStrings.isEmpty()) {
                    List<MerchantType> merchantTypes = new ArrayList<>();
                    for (String typeStr : typeStrings) {
                        merchantTypes.add(MerchantType.valueOf(typeStr.toUpperCase()));
                    }
                    merchant.setMerchantTypes(merchantTypes);
                }
            }

            // Update other optional fields...
            if (merchantData.containsKey("contactEmail")) {
                merchant.setContactEmail((String) merchantData.get("contactEmail"));
            }
            if (merchantData.containsKey("contactPhone")) {
                merchant.setContactPhone((String) merchantData.get("contactPhone"));
            }
            if (merchantData.containsKey("contactSecondPhone")) {
                merchant.setContactSecondPhone((String) merchantData.get("contactSecondPhone"));
            }
            if (merchantData.containsKey("contactPersonName")) {
                merchant.setContactPersonName((String) merchantData.get("contactPersonName"));
            }
            if (merchantData.containsKey("address")) {
                merchant.setAddress((String) merchantData.get("address"));
            }
            if (merchantData.containsKey("preferredPaymentMethod")) {
                merchant.setPreferredPaymentMethod((String) merchantData.get("preferredPaymentMethod"));
            }
            if (merchantData.containsKey("taxIdentificationNumber")) {
                merchant.setTaxIdentificationNumber((String) merchantData.get("taxIdentificationNumber"));
            }
            if (merchantData.containsKey("photoUrl")) {
                merchant.setPhotoUrl((String) merchantData.get("photoUrl"));
            }
            if (merchantData.containsKey("reliabilityScore")) {
                Object scoreObj = merchantData.get("reliabilityScore");
                if (scoreObj != null && !scoreObj.toString().trim().isEmpty()) {
                    merchant.setReliabilityScore(Double.valueOf(scoreObj.toString()));
                }
            }
            if (merchantData.containsKey("averageDeliveryTime")) {
                Object deliveryObj = merchantData.get("averageDeliveryTime");
                if (deliveryObj != null && !deliveryObj.toString().trim().isEmpty()) {
                    merchant.setAverageDeliveryTime(Double.valueOf(deliveryObj.toString()));
                }
            }
            if (merchantData.containsKey("notes")) {
                merchant.setNotes((String) merchantData.get("notes"));
            }

            // CHANGED: Update multiple sites instead of single site
            if (merchantData.containsKey("siteIds")) {
                List<String> siteIds = (List<String>) merchantData.get("siteIds");
                List<Site> sites = new ArrayList<>();

                if (siteIds != null && !siteIds.isEmpty()) {
                    for (String siteId : siteIds) {
                        if (siteId != null && !siteId.trim().isEmpty()) {
                            UUID siteUuid = UUID.fromString(siteId.trim());
                            Site site = siteRepository.findById(siteUuid)
                                    .orElseThrow(() -> new RuntimeException("Site not found with ID: " + siteId));
                            sites.add(site);
                        }
                    }
                }
                merchant.setSites(sites);
                System.out.println("Updated sites count: " + sites.size());
            }

            // Update item categories
            if (merchantData.containsKey("itemCategoryIds")) {
                String categoryIdsStr = (String) merchantData.get("itemCategoryIds");
                List<ItemCategory> categories = new ArrayList<>();

                if (categoryIdsStr != null && !categoryIdsStr.trim().isEmpty()) {
                    String[] categoryIds = categoryIdsStr.split(",");
                    for (String categoryIdStr : categoryIds) {
                        String trimmedId = categoryIdStr.trim();
                        if (!trimmedId.isEmpty()) {
                            UUID categoryId = UUID.fromString(trimmedId);
                            ItemCategory category = itemCategoryRepository.findById(categoryId)
                                    .orElseThrow(() -> new RuntimeException("Item category not found with ID: " + categoryId));
                            categories.add(category);
                        }
                    }
                }
                merchant.setItemCategories(categories);
            }

            System.out.println("Saving updated merchant...");
            Merchant updated = merchantRepository.save(merchant);
            System.out.println("Successfully updated merchant with ID: " + updated.getId());
            return updated;

        } catch (Exception e) {
            System.err.println("Unexpected error updating merchant: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update merchant: " + e.getMessage(), e);
        }
    }

    public void deleteMerchant(UUID id) {
        try {
            System.out.println("Attempting to delete merchant with ID: " + id);

            // Validate ID
            if (id == null) {
                throw new RuntimeException("Merchant ID cannot be null");
            }

            // Check if merchant exists
            Merchant merchant = merchantRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Merchant not found with ID: " + id));

            System.out.println("Found merchant to delete: " + merchant.getName());

            // Delete the merchant
            merchantRepository.delete(merchant);

            System.out.println("Successfully deleted merchant with ID: " + id);

        } catch (RuntimeException e) {
            System.err.println("Business logic error: " + e.getMessage());
            throw e; // Re-throw runtime exceptions as-is
        } catch (Exception e) {
            System.err.println("Unexpected error deleting merchant: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete merchant due to unexpected error: " + e.getMessage(), e);
        }
    }
}