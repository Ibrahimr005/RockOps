-- Create Tasks table for the secretary/task management module
-- Entity: com.example.backend.models.secretary.Task

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    notes VARCHAR(1000),
    assigned_by_id UUID NOT NULL,
    assigned_to_id UUID NOT NULL,
    CONSTRAINT fk_task_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users(id),
    CONSTRAINT fk_task_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
