package com.example.backend.services;

import com.example.backend.models.Partner;
import com.example.backend.repositories.PartnerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

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
}