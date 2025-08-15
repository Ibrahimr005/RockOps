# Maintenance Team Frontend

This directory contains the frontend components for the maintenance team functionality in the RockOps web application.

## Overview

The maintenance team frontend provides a comprehensive interface for managing equipment maintenance activities, tracking maintenance records, and monitoring team performance. The interface is designed to be consistent with the overall webapp styling and uses theme variables for seamless dark/light mode support.

## Components

### 1. MaintenanceLayout (`MaintenanceLayout.jsx`)
- **Purpose**: Layout wrapper for all maintenance pages
- **Features**: Provides consistent layout structure and styling
- **Usage**: Wraps maintenance pages in the routing system

### 2. MaintenanceDashboard (`MaintenanceDashboard/`)
- **Purpose**: Main dashboard for maintenance team overview
- **Features**:
  - KPI cards showing active maintenance, completed tasks, overdue items
  - Interactive charts (pie charts, bar charts, line charts)
  - Recent activity feed
  - Team performance metrics
  - Alerts and notifications
  - Responsive design with filtering options
- **Key Metrics**:
  - Active maintenance count
  - Weekly completion rates
  - Overdue maintenance alerts
  - Team efficiency scores
  - Site performance breakdown

### 3. MaintenanceRecords (`MaintenanceRecords/`)
- **Purpose**: CRUD interface for maintenance records
- **Features**:
  - DataTable with sorting, filtering, and search
  - Create/Edit/Delete maintenance records
  - Status tracking with color-coded badges
  - Equipment information display
  - Cost tracking
  - Date management
- **Actions**:
  - View record details
  - Edit existing records
  - Delete records with confirmation
  - Filter by status, site, type, and date range

### 4. MaintenanceRecordModal (`MaintenanceRecordModal.jsx`)
- **Purpose**: Modal form for creating and editing maintenance records
- **Features**:
  - Comprehensive form with validation
  - Equipment selection with auto-populated details
  - Issue description with rich text support
  - Maintenance type and priority selection
  - Responsible person assignment
  - Cost estimation
  - Timeline management
  - Form validation with error messages

## Styling

All components use the application's theme variables for consistent styling:

### Theme Variables Used
- `--color-primary`: Primary brand color
- `--color-success`: Success states and completed items
- `--color-danger`: Error states and overdue items
- `--color-warning`: Warning states and pending items
- `--color-info`: Information states
- `--section-background-color`: Card and modal backgrounds
- `--border-color`: Borders and dividers
- `--text-color`: Primary text color
- `--color-text-secondary`: Secondary text color
- `--shadow-sm`, `--shadow-md`: Shadow effects
- `--radius-sm`, `--radius-md`, `--radius-lg`: Border radius values
- `--transition-fast`, `--transition-normal`: Animation timing

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px and 1024px
- Collapsible sidebar integration
- Touch-friendly interface elements

## API Integration

The maintenance frontend integrates with the backend through the `maintenanceService.js`:

### Key Endpoints
- `GET /api/maintenance/dashboard` - Dashboard data
- `GET /api/maintenance/records` - List maintenance records
- `POST /api/maintenance/records` - Create new record
- `PUT /api/maintenance/records/{id}` - Update record
- `DELETE /api/maintenance/records/{id}` - Delete record
- `GET /api/maintenance/records/active` - Active records
- `GET /api/maintenance/records/overdue` - Overdue records

### Error Handling
- Automatic token refresh
- 401 redirect to login
- User-friendly error messages
- Retry mechanisms for failed requests

## Role-Based Access Control

The maintenance frontend supports role-based access:

### Allowed Roles
- `ADMIN`: Full access to all features
- `MAINTENANCE_MANAGER`: Full access to maintenance features
- `MAINTENANCE_EMPLOYEE`: Limited access (view and create records)
- `EQUIPMENT_MANAGER`: Access to maintenance features
- `SITE_ADMIN`: Access to site-related maintenance
- `USER`: Basic access to view maintenance information

### Permission Levels
- **View**: All roles can view maintenance records and dashboard
- **Create**: Maintenance employees and above can create records
- **Edit**: Maintenance managers and above can edit records
- **Delete**: Only maintenance managers and admins can delete records

## Usage Examples

### Accessing Maintenance Dashboard
```javascript
// Navigate to maintenance dashboard
navigate('/maintenance');

// Navigate to maintenance records
navigate('/maintenance/records');
```

### Creating a Maintenance Record
```javascript
const recordData = {
    equipmentId: '550e8400-e29b-41d4-a716-446655440000',
    initialIssueDescription: 'Engine failure - suspected air intake problem',
    expectedCompletionDate: '2024-01-17T17:00:00',
    currentResponsiblePerson: 'John Smith',
    currentResponsiblePhone: '+1-555-0123',
    maintenanceType: 'CORRECTIVE',
    priority: 'HIGH',
    estimatedCost: 1500.00,
    notes: 'Requires immediate attention'
};

await maintenanceService.createRecord(recordData);
```

### Filtering Records
```javascript
const filters = {
    status: 'ACTIVE',
    site: 'Site A',
    type: 'CORRECTIVE',
    dateRange: 'week'
};

const records = await maintenanceService.getRecords(filters);
```

## Dependencies

### Required Packages
- `react`: Core React library
- `react-router-dom`: Routing functionality
- `react-icons`: Icon components
- `lucide-react`: Additional icons for charts
- `recharts`: Chart components for dashboard
- `axios`: HTTP client for API calls

### Internal Dependencies
- `DataTable`: Reusable table component
- `SnackbarContext`: Notification system
- `AuthContext`: Authentication and user management
- `ThemeContext`: Theme management
- `LanguageContext`: Internationalization

## Future Enhancements

### Planned Features
1. **Maintenance Steps Tracking**: Detailed step-by-step maintenance process
2. **Contact Logging**: Communication tracking with responsible parties
3. **File Attachments**: Support for maintenance documentation
4. **Mobile App**: Native mobile application for field technicians
5. **Real-time Notifications**: Live updates for maintenance status changes
6. **Advanced Analytics**: Predictive maintenance and trend analysis
7. **Integration**: Connect with external maintenance systems

### Technical Improvements
1. **Offline Support**: Service worker for offline functionality
2. **Progressive Web App**: PWA capabilities for mobile users
3. **Performance Optimization**: Virtual scrolling for large datasets
4. **Accessibility**: Enhanced screen reader support
5. **Testing**: Comprehensive unit and integration tests

## Contributing

When contributing to the maintenance frontend:

1. Follow the existing code style and patterns
2. Use theme variables for all styling
3. Ensure responsive design works on all screen sizes
4. Add proper error handling and loading states
5. Update this documentation for new features
6. Test with different user roles and permissions

## Support

For issues or questions about the maintenance frontend:
1. Check the browser console for error messages
2. Verify API endpoints are accessible
3. Confirm user permissions and role assignments
4. Review the maintenance tracking system documentation 