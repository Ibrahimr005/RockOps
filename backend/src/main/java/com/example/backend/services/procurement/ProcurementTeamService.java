package com.example.backend.services.procurement;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.merchant.MerchantType;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ProcurementTeamService {

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private ItemCategoryRepository itemCategoryRepository;

    public Merchant addMerchant(Map<String, Object> merchantData) {
        try {
            System.out.println("Step 1: Extracting required fields...");

            // Required fields
            String name = (String) merchantData.get("name");
            System.out.println("Name: " + name);

            MerchantType merchantType = MerchantType.valueOf(((String) merchantData.get("merchantType")).toUpperCase());
            System.out.println("Merchant Type: " + merchantType);

            // Optional fields
            String contactEmail = (String) merchantData.get("contactEmail");
            String contactPhone = (String) merchantData.get("contactPhone");
            String contactSecondPhone = (String) merchantData.get("contactSecondPhone");
            String contactPersonName = (String) merchantData.get("contactPersonName");
            String address = (String) merchantData.get("address");
            String preferredPaymentMethod = (String) merchantData.get("preferredPaymentMethod");
            String taxIdentificationNumber = (String) merchantData.get("taxIdentificationNumber");
            Double reliabilityScore = merchantData.get("reliabilityScore") != null ? Double.valueOf(merchantData.get("reliabilityScore").toString()) : null;
            Double averageDeliveryTime = merchantData.get("averageDeliveryTime") != null ? Double.valueOf(merchantData.get("averageDeliveryTime").toString()) : null;

            Date lastOrderDate = null;
            if (merchantData.get("lastOrderDate") != null) {
                lastOrderDate = new Date(Long.parseLong(merchantData.get("lastOrderDate").toString())); // assuming timestamp in millis
            }

            String notes = (String) merchantData.get("notes");

            // Resolve site
            Site site = null;
            if (merchantData.containsKey("siteId")) {
                System.out.println("Step 2: Resolving site...");
                site = siteRepository.findById(UUID.fromString((String) merchantData.get("siteId")))
                        .orElse(null);
            }

            // Resolve item categories
            List<ItemCategory> categories = new ArrayList<>();
            if (merchantData.containsKey("itemCategoryIds")) {
                System.out.println("Step 3: Resolving item categories...");
                String[] categoryIds = ((String) merchantData.get("itemCategoryIds")).split(",");
                for (String id : categoryIds) {
                    UUID uuid = UUID.fromString(id.trim());
                    itemCategoryRepository.findById(uuid).ifPresent(categories::add);
                    System.out.println(itemCategoryRepository.findById(uuid).get().getName());
                }
            }

            // Build and save merchant
            System.out.println("Step 4: Building and saving merchant...");

            Merchant merchant = Merchant.builder()
                    .name(name)
                    .merchantType(merchantType)
                    .contactEmail(contactEmail)
                    .contactPhone(contactPhone)
                    .contactSecondPhone(contactSecondPhone)
                    .contactPersonName(contactPersonName)
                    .address(address)
                    .preferredPaymentMethod(preferredPaymentMethod)
                    .taxIdentificationNumber(taxIdentificationNumber)
                    .reliabilityScore(reliabilityScore)
                    .averageDeliveryTime(averageDeliveryTime)
                    .lastOrderDate(lastOrderDate)
                    .notes(notes)
                    .site(site)
                    .itemCategories(categories)
                    .build();

            Merchant saved = merchantRepository.save(merchant);
            System.out.println("Merchant saved with ID: " + saved.getId());
            return saved;

        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to create merchant: " + e.getMessage(), e);
        }
    }


    public Merchant updateMerchant(UUID id, Map<String, Object> merchantData) {
        try {
            System.out.println("Updating merchant with ID: " + id);
            System.out.println("Data received: " + merchantData);

            // Validate ID
            if (id == null) {
                throw new RuntimeException("Merchant ID cannot be null");
            }

            // Find existing merchant
            Merchant merchant = merchantRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Merchant not found with ID: " + id));

            System.out.println("Found existing merchant: " + merchant.getName());

            // Required fields
            if (merchantData.containsKey("name")) {
                String name = (String) merchantData.get("name");
                if (name != null && !name.trim().isEmpty()) {
                    merchant.setName(name.trim());
                    System.out.println("Updated name: " + name);
                }
            }

            if (merchantData.containsKey("merchantType")) {
                String typeStr = (String) merchantData.get("merchantType");
                if (typeStr != null && !typeStr.trim().isEmpty()) {
                    try {
                        MerchantType merchantType = MerchantType.valueOf(typeStr.toUpperCase());
                        merchant.setMerchantType(merchantType);
                        System.out.println("Updated merchant type: " + merchantType);
                    } catch (IllegalArgumentException e) {
                        throw new RuntimeException("Invalid merchant type: " + typeStr);
                    }
                }
            }

            // Optional fields with null safety
            if (merchantData.containsKey("contactEmail")) {
                String email = (String) merchantData.get("contactEmail");
                if (email != null && !email.trim().isEmpty()) {
                    merchant.setContactEmail(email.trim());
                }
            }

            if (merchantData.containsKey("contactPhone")) {
                String phone = (String) merchantData.get("contactPhone");
                if (phone != null && !phone.trim().isEmpty()) {
                    merchant.setContactPhone(phone.trim());
                }
            }

            if (merchantData.containsKey("contactSecondPhone")) {
                String phone2 = (String) merchantData.get("contactSecondPhone");
                if (phone2 != null && !phone2.trim().isEmpty()) {
                    merchant.setContactSecondPhone(phone2.trim());
                }
            }

            if (merchantData.containsKey("contactPersonName")) {
                String contactName = (String) merchantData.get("contactPersonName");
                if (contactName != null && !contactName.trim().isEmpty()) {
                    merchant.setContactPersonName(contactName.trim());
                }
            }

            if (merchantData.containsKey("address")) {
                String address = (String) merchantData.get("address");
                if (address != null && !address.trim().isEmpty()) {
                    merchant.setAddress(address.trim());
                }
            }

            if (merchantData.containsKey("preferredPaymentMethod")) {
                String paymentMethod = (String) merchantData.get("preferredPaymentMethod");
                if (paymentMethod != null && !paymentMethod.trim().isEmpty()) {
                    merchant.setPreferredPaymentMethod(paymentMethod.trim());
                }
            }

            if (merchantData.containsKey("taxIdentificationNumber")) {
                String taxId = (String) merchantData.get("taxIdentificationNumber");
                if (taxId != null && !taxId.trim().isEmpty()) {
                    merchant.setTaxIdentificationNumber(taxId.trim());
                }
            }

            // Handle numeric fields with proper null safety
            if (merchantData.containsKey("reliabilityScore")) {
                Object scoreObj = merchantData.get("reliabilityScore");
                if (scoreObj != null && !scoreObj.toString().trim().isEmpty()) {
                    try {
                        Double score = Double.valueOf(scoreObj.toString());
                        if (score < 0 || score > 5) {
                            throw new RuntimeException("Reliability score must be between 0 and 5");
                        }
                        merchant.setReliabilityScore(score);
                        System.out.println("Updated reliability score: " + score);
                    } catch (NumberFormatException e) {
                        throw new RuntimeException("Invalid reliability score format: " + scoreObj);
                    }
                }
            }

            if (merchantData.containsKey("averageDeliveryTime")) {
                Object deliveryObj = merchantData.get("averageDeliveryTime");
                if (deliveryObj != null && !deliveryObj.toString().trim().isEmpty()) {
                    try {
                        Double deliveryTime = Double.valueOf(deliveryObj.toString());
                        if (deliveryTime < 0) {
                            throw new RuntimeException("Average delivery time cannot be negative");
                        }
                        merchant.setAverageDeliveryTime(deliveryTime);
                        System.out.println("Updated delivery time: " + deliveryTime);
                    } catch (NumberFormatException e) {
                        throw new RuntimeException("Invalid delivery time format: " + deliveryObj);
                    }
                }
            }

            if (merchantData.containsKey("notes")) {
                String notes = (String) merchantData.get("notes");
                merchant.setNotes(notes); // Notes can be null/empty
            }

            // Site relationship
            if (merchantData.containsKey("siteId")) {
                String siteIdStr = (String) merchantData.get("siteId");
                if (siteIdStr != null && !siteIdStr.trim().isEmpty()) {
                    try {
                        UUID siteId = UUID.fromString(siteIdStr.trim());
                        Site site = siteRepository.findById(siteId)
                                .orElseThrow(() -> new RuntimeException("Site not found with ID: " + siteId));
                        merchant.setSite(site);
                        System.out.println("Updated site: " + site.getName());
                    } catch (IllegalArgumentException e) {
                        throw new RuntimeException("Invalid site ID format: " + siteIdStr);
                    }
                } else {
                    merchant.setSite(null); // Clear site if empty
                }
            }

            // Item category relationship
            if (merchantData.containsKey("itemCategoryIds")) {
                String categoryIdsStr = (String) merchantData.get("itemCategoryIds");
                List<ItemCategory> categories = new ArrayList<>();

                if (categoryIdsStr != null && !categoryIdsStr.trim().isEmpty()) {
                    String[] categoryIds = categoryIdsStr.split(",");
                    for (String categoryIdStr : categoryIds) {
                        String trimmedId = categoryIdStr.trim();
                        if (!trimmedId.isEmpty()) {
                            try {
                                UUID categoryId = UUID.fromString(trimmedId);
                                ItemCategory category = itemCategoryRepository.findById(categoryId)
                                        .orElseThrow(() -> new RuntimeException("Item category not found with ID: " + categoryId));
                                categories.add(category);
                            } catch (IllegalArgumentException e) {
                                throw new RuntimeException("Invalid category ID format: " + trimmedId);
                            }
                        }
                    }
                }
                merchant.setItemCategories(categories);
                System.out.println("Updated categories count: " + categories.size());
            }

            // Save and return updated merchant
            System.out.println("Saving updated merchant...");
            Merchant updated = merchantRepository.save(merchant);
            System.out.println("Successfully updated merchant with ID: " + updated.getId());
            return updated;

        } catch (RuntimeException e) {
            System.err.println("Business logic error: " + e.getMessage());
            throw e; // Re-throw runtime exceptions as-is
        } catch (Exception e) {
            System.err.println("Unexpected error updating merchant: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update merchant due to unexpected error: " + e.getMessage(), e);
        }
    }




}
