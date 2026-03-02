ALTER TABLE offer_item 
ADD COLUMN equipment_purchase_spec_id UUID;

ALTER TABLE offer_item 
ADD CONSTRAINT fk_offer_item_equip_spec 
FOREIGN KEY (equipment_purchase_spec_id) 
REFERENCES equipment_purchase_spec (id);
