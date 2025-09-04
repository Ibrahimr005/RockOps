package com.example.backend.services;

import com.example.backend.models.Partner;
import com.example.backend.repositories.PartnerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PartnerService
{
    private final PartnerRepository partnerRepository;

    @Autowired
    public PartnerService(PartnerRepository partnerRepository) {
        this.partnerRepository = partnerRepository;
    }

    public List<Partner> getAllPartners()
    {
        return partnerRepository.findAll();
    }

    public Partner savePartner(Partner partner)
    {
        return partnerRepository.save(partner);
    }

    public Partner updatePartner(int id, Partner updatedPartner) {
        Partner existingPartner = partnerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found with id: " + id));

        existingPartner.setFirstName(updatedPartner.getFirstName());
        existingPartner.setLastName(updatedPartner.getLastName());

        return partnerRepository.save(existingPartner);
    }

    public void deletePartner(int id) {
        // Check if partner exists
        if (!partnerRepository.existsById(id)) {
            throw new RuntimeException("Partner not found with id: " + id);
        }

        // Check if this is the default Rock4Mining partner
        if (isDefaultPartner(id)) {
            throw new RuntimeException("Cannot delete the default Rock4Mining partner");
        }

        // Check if partner has active shares in any site
        if (hasActiveShares(id)) {
            throw new RuntimeException("Cannot delete partner. Partner has active shares in one or more sites. Please remove all site assignments first.");
        }

        // If all checks pass, proceed with deletion
        partnerRepository.deleteById(id);
    }

    public boolean isDefaultPartner(int partnerId) {
        Optional<Partner> partner = partnerRepository.findById(partnerId);
        return partner.isPresent() && "Rock4Mining".equals(partner.get().getFirstName());
    }

    public boolean hasActiveShares(int partnerId) {
        Optional<Partner> partner = partnerRepository.findById(partnerId);
        if (partner.isPresent()) {
            return partner.get().getSitePartners() != null &&
                    !partner.get().getSitePartners().isEmpty();
        }
        return false;
    }
}