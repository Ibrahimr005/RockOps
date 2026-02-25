-- V2026022202__Add_loan_resolution_requests.sql
-- Create loan_resolution_requests table for early loan resolution workflow

CREATE TABLE IF NOT EXISTS loan_resolution_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    site_id UUID NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    remaining_balance DECIMAL(15, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_HR',
    hr_approved_by VARCHAR(255),
    hr_decision_date TIMESTAMP,
    hr_rejection_reason VARCHAR(1000),
    finance_approved_by VARCHAR(255),
    finance_decision_date TIMESTAMP,
    finance_rejection_reason VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),

    CONSTRAINT fk_loan_resolution_loan FOREIGN KEY (loan_id) REFERENCES loans(id),
    CONSTRAINT fk_loan_resolution_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_loan_resolution_site FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Indexes for common queries
CREATE INDEX idx_loan_resolution_status ON loan_resolution_requests(status);
CREATE INDEX idx_loan_resolution_loan_id ON loan_resolution_requests(loan_id);
CREATE INDEX idx_loan_resolution_employee_id ON loan_resolution_requests(employee_id);
CREATE INDEX idx_loan_resolution_site_id ON loan_resolution_requests(site_id);

-- Add RESOLVED status support to loans (existing status column is VARCHAR, no enum change needed)
