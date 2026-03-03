ALTER TABLE offer_request_item 
ADD COLUMN equipment_purchase_spec_id UUID;

ALTER TABLE offer_request_item 
ADD CONSTRAINT fk_offer_req_item_equip_spec 
FOREIGN KEY (equipment_purchase_spec_id) 
REFERENCES equipment_purchase_spec (id);
