package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiveItemsRequestDTO {
    private List<ReceivedItemDTO> receivedItems;
}