# Maintenance Steps Frontend

This directory contains the frontend components for managing maintenance steps within the external maintenance tracking system.

## Components

### MaintenanceSteps.jsx
The main component for displaying and managing maintenance steps for a specific maintenance record.

**Features:**
- Displays all steps for a maintenance record in a data table
- Shows step type, description, status, responsible person, location, cost, and dates
- Allows creating, editing, completing, and deleting steps
- Color-coded step type badges and status indicators
- Responsive design for mobile and desktop

**Props:**
- `recordId` (string): The ID of the maintenance record
- `onStepUpdate` (function): Callback function when steps are updated

### MaintenanceStepModal.jsx
Modal component for creating and editing maintenance steps.

**Features:**
- Form for step type, description, responsible contact, dates, locations, and cost
- Validation for required fields and date logic
- Integration with contact service for responsible person selection
- Consistent styling with existing modals

**Props:**
- `isOpen` (boolean): Whether the modal is open
- `onClose` (function): Function to close the modal
- `onSubmit` (function): Function to handle form submission
- `editingStep` (object): Step data when editing (null for new steps)
- `maintenanceRecord` (object): Parent maintenance record data

## Integration

The maintenance steps functionality is integrated with:

1. **MaintenanceRecordDetail.jsx** - Shows steps in a dedicated tab
2. **MaintenanceRecords.jsx** - Added "View Steps" action button
3. **App.jsx** - Added routing for maintenance record details

## API Endpoints Used

- `GET /api/maintenance/records/{recordId}/steps` - Get steps for a record
- `POST /api/maintenance/records/{recordId}/steps` - Create new step
- `PUT /api/maintenance/steps/{stepId}` - Update step
- `DELETE /api/maintenance/steps/{stepId}` - Delete step
- `POST /api/maintenance/steps/{stepId}/complete` - Complete step
- `GET /api/contacts/available` - Get available contacts

## Step Types

The system supports the following step types:
- **TRANSPORT** - Moving equipment between locations
- **INSPECTION** - Visual or technical inspection
- **REPAIR** - Actual repair work
- **TESTING** - Testing after repair
- **DIAGNOSIS** - Problem diagnosis
- **ESCALATION** - Escalating to specialists
- **RETURN_TO_SERVICE** - Returning equipment to operational status

## Status Indicators

Steps can have the following statuses:
- **Active** - Currently in progress
- **Completed** - Step has been finished
- **Overdue** - Past expected completion date

## Usage

1. Navigate to Maintenance Records
2. Click "View Steps" on any record to see its steps
3. Use "New Step" to add steps to the maintenance process
4. Edit, complete, or delete steps as needed
5. Track progress through the maintenance lifecycle

## Styling

The components use SCSS modules with:
- Consistent color variables from the design system
- Responsive breakpoints for mobile/tablet/desktop
- Consistent spacing and typography
- Interactive states (hover, focus, active) 