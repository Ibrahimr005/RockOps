package com.example.backend.services.merchant;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MerchantService {

    private final MerchantRepository merchantRepository;
    private final SiteRepository siteRepository;
    private final ItemCategoryRepository itemCategoryRepository;


    public List<Merchant> getAllMerchants() {
        try {
            List<Merchant> merchants = merchantRepository.findAll();
            merchants.forEach(m -> {
                System.out.println("Merchant ID: " + m.getId());
                System.out.println("Name: " + m.getName());
                System.out.println("Contact Email: " + m.getContactEmail());
                System.out.println("Contact Phone: " + m.getContactPhone());
                System.out.println("Address: " + m.getAddress());
                System.out.println("Merchant Type: " + m.getMerchantType());
                System.out.println("Notes: " + m.getNotes());
                if (m.getSite() != null) {
                    System.out.println("Site: " + m.getSite().getName());
                }
                System.out.println("Item Categories: " + m.getItemCategories().size());
                m.getItemCategories().forEach(itemCategory -> {
                    System.out.println("\t- " + itemCategory.getName());
                });
                System.out.println("Contacts: " + (m.getContacts() != null ? m.getContacts().size() : 0));
            });
            return merchants;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch merchants: " + e.getMessage(), e);
        }
    }



    public Merchant getMerchantById(UUID id) {
        return merchantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Merchant not found with id: " + id));
    }


}
