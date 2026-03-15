package com.example.backend.controllers.merchant;

import com.example.backend.config.JwtService;
import com.example.backend.dto.merchant.MerchantPerformanceDTO;
import com.example.backend.dto.merchant.MerchantTransactionDTO;
import com.example.backend.models.contact.Contact;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.repositories.ContactRepository;
import com.example.backend.services.merchant.MerchantService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = MerchantController.class)
@AutoConfigureMockMvc(addFilters = false)
public class MerchantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MerchantService merchantService;

    @MockBean
    private ContactRepository contactRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // -------------------------------------------------------------------------
    // GET /api/v1/merchants  – no filter
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllMerchants_noFilter_returns200WithList() throws Exception {
        Merchant merchant = Merchant.builder()
                .id(UUID.randomUUID())
                .merchantId("M-001")
                .name("Acme Supplies")
                .build();

        given(merchantService.getAllMerchants()).willReturn(List.of(merchant));

        mockMvc.perform(get("/api/v1/merchants")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Acme Supplies"));
    }

    @Test
    @WithMockUser
    void getAllMerchants_noFilter_emptyList_returns200() throws Exception {
        given(merchantService.getAllMerchants()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/merchants")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser
    void getAllMerchants_noFilter_serviceThrows_returns500WithEmptyList() throws Exception {
        given(merchantService.getAllMerchants())
                .willThrow(new RuntimeException("DB unavailable"));

        mockMvc.perform(get("/api/v1/merchants")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/merchants?merchantType=SUPPLIER  – with filter
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllMerchants_withMerchantType_returns200() throws Exception {
        Merchant merchant = Merchant.builder()
                .id(UUID.randomUUID())
                .merchantId("M-002")
                .name("Rock Drilling Co")
                .build();

        given(merchantService.getMerchantsByType("SUPPLIER")).willReturn(List.of(merchant));

        mockMvc.perform(get("/api/v1/merchants")
                        .param("merchantType", "SUPPLIER")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].merchantId").value("M-002"));
    }

    @Test
    @WithMockUser
    void getAllMerchants_withMerchantType_serviceThrows_returns500WithEmptyList() throws Exception {
        given(merchantService.getMerchantsByType("UNKNOWN"))
                .willThrow(new RuntimeException("Invalid type"));

        mockMvc.perform(get("/api/v1/merchants")
                        .param("merchantType", "UNKNOWN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/merchants/{id}
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    void getMerchantById_found_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        Merchant merchant = Merchant.builder()
                .id(id)
                .merchantId("M-003")
                .name("Mining Parts Ltd")
                .build();

        given(merchantService.getMerchantById(id)).willReturn(merchant);

        mockMvc.perform(get("/api/v1/merchants/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.merchantId").value("M-003"))
                .andExpect(jsonPath("$.name").value("Mining Parts Ltd"));
    }

    @Test
    @WithMockUser
    void getMerchantById_notFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();

        given(merchantService.getMerchantById(id))
                .willThrow(new RuntimeException("Merchant not found"));

        mockMvc.perform(get("/api/v1/merchants/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/merchants/{id}/contacts
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    void getContactsByMerchant_found_returns200() throws Exception {
        UUID merchantId = UUID.randomUUID();

        Contact contact = Contact.builder()
                .id(UUID.randomUUID())
                .firstName("Jane")
                .lastName("Doe")
                .email("jane.doe@example.com")
                .build();

        given(contactRepository.findByMerchantId(merchantId)).willReturn(List.of(contact));

        mockMvc.perform(get("/api/v1/merchants/{id}/contacts", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Jane"))
                .andExpect(jsonPath("$[0].email").value("jane.doe@example.com"));
    }

    @Test
    @WithMockUser
    void getContactsByMerchant_emptyList_returns200() throws Exception {
        UUID merchantId = UUID.randomUUID();

        given(contactRepository.findByMerchantId(merchantId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/merchants/{id}/contacts", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser
    void getContactsByMerchant_repositoryThrows_returns500() throws Exception {
        UUID merchantId = UUID.randomUUID();

        given(contactRepository.findByMerchantId(merchantId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/merchants/{id}/contacts", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/merchants/{id}/transactions
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    void getMerchantTransactions_found_returns200() throws Exception {
        UUID merchantId = UUID.randomUUID();

        MerchantTransactionDTO dto = MerchantTransactionDTO.builder()
                .id(UUID.randomUUID())
                .itemTypeName("Drill Bit")
                .itemCategoryName("Equipment Parts")
                .quantityReceived(50.0)
                .status("GOOD")
                .receivedAt(LocalDateTime.now())
                .poNumber("PO-2026-0001")
                .isRedelivery(false)
                .build();

        given(merchantService.getMerchantTransactionDTOs(merchantId)).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/merchants/{id}/transactions", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].itemTypeName").value("Drill Bit"))
                .andExpect(jsonPath("$[0].status").value("GOOD"))
                .andExpect(jsonPath("$[0].poNumber").value("PO-2026-0001"));
    }

    @Test
    @WithMockUser
    void getMerchantTransactions_emptyList_returns200() throws Exception {
        UUID merchantId = UUID.randomUUID();

        given(merchantService.getMerchantTransactionDTOs(merchantId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/merchants/{id}/transactions", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser
    void getMerchantTransactions_serviceThrows_returns500() throws Exception {
        UUID merchantId = UUID.randomUUID();

        given(merchantService.getMerchantTransactionDTOs(merchantId))
                .willThrow(new RuntimeException("Service failure"));

        mockMvc.perform(get("/api/v1/merchants/{id}/transactions", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/merchants/{id}/performance
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    void getMerchantPerformance_found_returns200() throws Exception {
        UUID merchantId = UUID.randomUUID();

        MerchantPerformanceDTO dto = MerchantPerformanceDTO.builder()
                .overallScore(85)
                .performanceRating("GOOD")
                .totalOrders(42)
                .successRate(92.5)
                .merchantStatus("ACTIVE")
                .performanceTrend("IMPROVING")
                .build();

        given(merchantService.getMerchantPerformance(merchantId)).willReturn(dto);

        mockMvc.perform(get("/api/v1/merchants/{id}/performance", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallScore").value(85))
                .andExpect(jsonPath("$.performanceRating").value("GOOD"))
                .andExpect(jsonPath("$.totalOrders").value(42))
                .andExpect(jsonPath("$.successRate").value(92.5))
                .andExpect(jsonPath("$.merchantStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.performanceTrend").value("IMPROVING"));
    }

    @Test
    @WithMockUser
    void getMerchantPerformance_serviceThrows_returns500() throws Exception {
        UUID merchantId = UUID.randomUUID();

        given(merchantService.getMerchantPerformance(merchantId))
                .willThrow(new RuntimeException("Performance data unavailable"));

        mockMvc.perform(get("/api/v1/merchants/{id}/performance", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}