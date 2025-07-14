package com.example.backend.controllers.finance.fixedAssets;

import com.example.backend.dto.finance.fixedAssets.*;
import com.example.backend.models.finance.fixedAssets.AssetStatus;
import com.example.backend.models.finance.fixedAssets.DisposalMethod;
import com.example.backend.models.user.User;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.finance.fixedAssets.FixedAssetsService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fixed-assets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FixedAssetsController {

    private final FixedAssetsService fixedAssetsService;
    private final MinioService minioService;
    private final UserRepository userRepository;


    // Basic CRUD Operations
    @PostMapping
    public ResponseEntity<FixedAssetsResponseDTO> createAsset(@Valid @RequestBody FixedAssetsRequestDTO requestDTO) {
        FixedAssetsResponseDTO responseDTO = fixedAssetsService.createAsset(requestDTO);
        return new ResponseEntity<>(responseDTO, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FixedAssetsResponseDTO> getAssetById(@PathVariable UUID id) {
        FixedAssetsResponseDTO responseDTO = fixedAssetsService.getAssetById(id);
        return ResponseEntity.ok(responseDTO);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FixedAssetsResponseDTO> updateAsset(
            @PathVariable UUID id,
            @Valid @RequestBody FixedAssetsRequestDTO requestDTO) {
        FixedAssetsResponseDTO responseDTO = fixedAssetsService.updateAsset(id, requestDTO);
        return ResponseEntity.ok(responseDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID id) {
        fixedAssetsService.deleteAsset(id);
        return ResponseEntity.noContent().build();
    }

    // List Operations
    @GetMapping
    public ResponseEntity<List<FixedAssetsResponseDTO>> getAllAssets() {
        List<FixedAssetsResponseDTO> assets = fixedAssetsService.getAllAssets();
        return ResponseEntity.ok(assets);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<FixedAssetsResponseDTO>> getAssetsByStatus(@PathVariable AssetStatus status) {
        List<FixedAssetsResponseDTO> assets = fixedAssetsService.getAssetsByStatus(status);
        return ResponseEntity.ok(assets);
    }

//    @GetMapping("/category/{category}")
//    public ResponseEntity<List<FixedAssetsResponseDTO>> getAssetsByCategory(@PathVariable String category) {
//        List<FixedAssetsResponseDTO> assets = fixedAssetsService.getAssetsByCategory(category);
//        return ResponseEntity.ok(assets);
//    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<FixedAssetsResponseDTO>> getAssetsBySite(@PathVariable UUID siteId) {
        List<FixedAssetsResponseDTO> assets = fixedAssetsService.getAssetsBySite(siteId);
        return ResponseEntity.ok(assets);
    }

    // CORE FEATURE: Depreciation Calculations (FA-002)
    @GetMapping("/{id}/depreciation/monthly")
    public ResponseEntity<BigDecimal> getMonthlyDepreciation(@PathVariable UUID id) {
        BigDecimal monthlyDepreciation = fixedAssetsService.calculateMonthlyDepreciation(id);
        return ResponseEntity.ok(monthlyDepreciation);
    }

    @GetMapping("/{id}/depreciation/accumulated")
    public ResponseEntity<BigDecimal> getAccumulatedDepreciation(
            @PathVariable UUID id,
            @RequestParam(required = false) LocalDate asOfDate) {
        LocalDate dateToUse = asOfDate != null ? asOfDate : LocalDate.now();
        BigDecimal accumulatedDepreciation = fixedAssetsService.calculateAccumulatedDepreciation(id, dateToUse);
        return ResponseEntity.ok(accumulatedDepreciation);
    }

    @GetMapping("/{id}/book-value")
    public ResponseEntity<BigDecimal> getCurrentBookValue(
            @PathVariable UUID id,
            @RequestParam(required = false) LocalDate asOfDate) {
        LocalDate dateToUse = asOfDate != null ? asOfDate : LocalDate.now();
        BigDecimal bookValue = fixedAssetsService.calculateCurrentBookValue(id, dateToUse);
        return ResponseEntity.ok(bookValue);
    }

    // Search Operations
    @GetMapping("/search")
    public ResponseEntity<List<FixedAssetsResponseDTO>> searchAssetsByName(@RequestParam String name) {
        List<FixedAssetsResponseDTO> assets = fixedAssetsService.searchAssetsByName(name);
        return ResponseEntity.ok(assets);
    }

//    // Utility Endpoints
//    @GetMapping("/categories")
//    public ResponseEntity<List<String>> getAllCategories() {
//        List<String> categories = fixedAssetsService.getAllCategories();
//        return ResponseEntity.ok(categories);
//    }




    // CORE FEATURE: Asset Disposal (FA-004)

    // Replace your current dispose endpoint with this:
    @PostMapping(value = "/{id}/dispose", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssetDisposalResponseDTO> disposeAsset(
            @PathVariable UUID id,
            @RequestParam("disposalData") String disposalDataJson,
            @RequestParam(value = "document", required = false) MultipartFile document) {
        try {
            // Convert JSON String to AssetDisposalRequestDTO
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.registerModule(new JavaTimeModule());
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            objectMapper.configure(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES, true);

            AssetDisposalRequestDTO requestDTO = objectMapper.readValue(disposalDataJson, AssetDisposalRequestDTO.class);
            System.out.println("Received Disposal JSON: " + disposalDataJson);

            // Upload document if provided
            if (document != null && !document.isEmpty()) {
                String fileName = minioService.uploadFile(document);
                String fileUrl = minioService.getFileUrl(fileName);
                requestDTO.setDocumentPath(fileUrl);
            }

            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Logged-in user not found in the database"));

            // Set created by user
            requestDTO.setCreatedBy(currentUser.getUsername()); // or currentUser.getFullName() if you have it

            // Set asset ID from path
            requestDTO.setAssetId(id);

            // Dispose asset
            AssetDisposalResponseDTO responseDTO = fixedAssetsService.disposeAsset(requestDTO);

            return new ResponseEntity<>(responseDTO, HttpStatus.CREATED);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @GetMapping("/{id}/disposal")
    public ResponseEntity<AssetDisposalResponseDTO> getAssetDisposal(@PathVariable UUID id) {
        AssetDisposalResponseDTO disposal = fixedAssetsService.getAssetDisposal(id);
        return ResponseEntity.ok(disposal);
    }

    // Disposal Management Endpoints

    @GetMapping("/disposals")
    public ResponseEntity<List<AssetDisposalResponseDTO>> getAllDisposals() {
        List<AssetDisposalResponseDTO> disposals = fixedAssetsService.getAllDisposals();
        return ResponseEntity.ok(disposals);
    }

    @GetMapping("/disposals/method/{method}")
    public ResponseEntity<List<AssetDisposalResponseDTO>> getDisposalsByMethod(@PathVariable DisposalMethod method) {
        List<AssetDisposalResponseDTO> disposals = fixedAssetsService.getDisposalsByMethod(method);
        return ResponseEntity.ok(disposals);
    }

    @GetMapping("/disposals/date-range")
    public ResponseEntity<List<AssetDisposalResponseDTO>> getDisposalsByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<AssetDisposalResponseDTO> disposals = fixedAssetsService.getDisposalsByDateRange(startDate, endDate);
        return ResponseEntity.ok(disposals);
    }

    @GetMapping("/disposals/profitable")
    public ResponseEntity<List<AssetDisposalResponseDTO>> getProfitableDisposals() {
        List<AssetDisposalResponseDTO> disposals = fixedAssetsService.getProfitableDisposals();
        return ResponseEntity.ok(disposals);
    }

    @GetMapping("/disposals/losses")
    public ResponseEntity<List<AssetDisposalResponseDTO>> getLossDisposals() {
        List<AssetDisposalResponseDTO> disposals = fixedAssetsService.getLossDisposals();
        return ResponseEntity.ok(disposals);
    }

    @GetMapping("/disposals/recent")
    public ResponseEntity<List<AssetDisposalResponseDTO>> getRecentDisposals() {
        List<AssetDisposalResponseDTO> disposals = fixedAssetsService.getRecentDisposals();
        return ResponseEntity.ok(disposals);
    }

    // Disposal Reports & Analytics

    @GetMapping("/disposals/summary")
    public ResponseEntity<DisposalSummaryDTO> getDisposalSummary(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        DisposalSummaryDTO summary = fixedAssetsService.getDisposalSummary(startDate, endDate);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/disposals/total-gain-loss")
    public ResponseEntity<BigDecimal> getTotalGainLossForPeriod(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        BigDecimal totalGainLoss = fixedAssetsService.getTotalGainLossForPeriod(startDate, endDate);
        return ResponseEntity.ok(totalGainLoss);
    }
}