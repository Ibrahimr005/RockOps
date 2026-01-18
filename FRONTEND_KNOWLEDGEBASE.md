# RockOps Frontend Knowledgebase

**Last Updated:** 2026-01-16
**Version:** 1.0
**Purpose:** Comprehensive documentation of the RockOps React frontend application architecture, components, patterns, and development guidelines.

---

## Table of Contents
1. [Frontend Overview](#frontend-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Project Structure](#project-structure)
5. [Routing System](#routing-system)
6. [State Management (Contexts)](#state-management-contexts)
7. [Services Layer](#services-layer)
8. [Components Library](#components-library)
9. [Pages Overview](#pages-overview)
10. [Styling System](#styling-system)
11. [Utilities & Helpers](#utilities--helpers)
12. [Configuration](#configuration)
13. [Development Patterns](#development-patterns)
14. [API Integration](#api-integration)
15. [Error Handling](#error-handling)
16. [Performance Optimization](#performance-optimization)
17. [Internationalization (i18n)](#internationalization-i18n)
18. [WebSocket Integration](#websocket-integration)
19. [Feature Changelog](#feature-changelog)

---

## Frontend Overview

The RockOps frontend is a **single-page application (SPA)** built with React 19.1.0 and Vite 6.3.5. It provides a comprehensive user interface for managing all aspects of mining site operations with real-time updates, multi-language support, and role-based access control.

### Key Characteristics
- **Modern React**: Uses React 19.1.0 with hooks and functional components
- **Fast Development**: Vite for lightning-fast HMR and builds
- **Responsive Design**: Mobile-first responsive UI
- **Real-time**: WebSocket notifications via STOMP
- **Multi-language**: English and Arabic with RTL support
- **Theme Support**: Light and dark mode
- **Type Safety**: PropTypes for component validation
- **Accessibility**: ARIA labels and keyboard navigation

### Core Features
- Role-based dashboards (14 user roles)
- Equipment lifecycle management
- HR and payroll processing
- Procurement workflow
- Warehouse inventory management
- Finance and accounting
- Real-time notifications
- Document management with S3 integration
- Advanced data tables with filtering, sorting, and export

---

## Technology Stack

### Core Libraries
- **React**: 19.1.0 - UI framework
- **React Router**: 7.6.0 - Client-side routing
- **Vite**: 6.3.5 - Build tool and dev server

### HTTP & Real-time Communication
- **Axios**: 1.9.0 - HTTP client
- **@stomp/stompjs**: 7.1.1 - WebSocket (STOMP protocol)
- **sockjs-client**: 1.6.1 - WebSocket fallback

### Styling
- **Sass**: 1.89.0 - CSS preprocessor
- **CSS Variables** - Theme system

### UI & Visualization
- **Recharts**: 2.15.3 - Charts and graphs
- **react-icons**: 5.5.0 - Icon library
- **lucide-react**: 0.511.0 - Additional icons
- **react-modal**: 3.16.3 - Modal dialogs

### Internationalization
- **i18next**: 25.2.0 - i18n framework
- **react-i18next**: 15.5.1 - React bindings
- **i18next-browser-languagedetector**: 8.1.0 - Language detection
- **i18next-http-backend**: 3.0.2 - Translation loading

### Utilities
- **xlsx**: 0.18.5 - Excel export

### Development Tools
- **ESLint**: 9.25.0 - Linting
- **Vite Plugin React**: 4.4.1 - React support in Vite

---

## Application Architecture

### Architecture Pattern
The application follows a **layered component architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                     │
│  Pages (route-level components)                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   COMPONENT LAYER                        │
│  Reusable UI components (common + domain-specific)      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                          │
│  API integration, business logic abstraction            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   STATE LAYER                            │
│  Context API providers (Auth, Theme, Snackbar, etc.)    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   API LAYER                              │
│  Axios client with interceptors                         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Pattern

**Unidirectional Data Flow**:
```
User Action
    ↓
Component Event Handler
    ↓
Service Call (async)
    ↓
API Client (Axios with interceptors)
    ↓
Backend API
    ↓
Response
    ↓
Service processes response
    ↓
Component updates state
    ↓
React re-renders UI
    ↓
Snackbar shows success/error notification
```

### State Management Philosophy
- **Local State**: Component-level state with `useState`
- **Global State**: Context API for cross-cutting concerns
- **Server State**: Services manage API data (no Redux/MobX)
- **URL State**: React Router for navigation state

---

## Project Structure

```
frontend/
├── public/                      # Static assets
│   └── favicon.ico
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/             # Shared components (DataTable, Sidebar, etc.)
│   │   ├── equipment/          # Equipment-specific components
│   │   ├── procurement/        # Procurement-specific components
│   │   ├── HR/                 # HR-specific components
│   │   └── maintenance/        # Maintenance-specific components
│   │
│   ├── pages/                  # Page components (route handlers)
│   │   ├── admin/              # User management pages
│   │   ├── dashboards/         # Role-based dashboard pages
│   │   ├── equipment/          # Equipment management pages
│   │   ├── warehouse/          # Warehouse pages
│   │   ├── HR/                 # HR module pages
│   │   ├── payroll/            # Payroll pages
│   │   ├── finance/            # Finance pages
│   │   ├── procurement/        # Procurement pages
│   │   ├── maintenance/        # Maintenance pages
│   │   ├── merchant/           # Merchant pages
│   │   ├── site/               # Site management pages
│   │   ├── partners/           # Partner pages
│   │   ├── notification/       # Notification center
│   │   ├── login/              # Authentication pages
│   │   └── RelatedDocuments/   # Document viewer
│   │
│   ├── services/               # API service classes
│   │   ├── hr/                 # HR-related services
│   │   ├── warehouse/          # Warehouse services
│   │   ├── procurement/        # Procurement services
│   │   ├── payroll/            # Payroll services
│   │   ├── equipmentService.js
│   │   ├── authService.js
│   │   ├── financeService.js
│   │   ├── merchantService.js
│   │   └── [50+ service files]
│   │
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── SnackbarContext.jsx
│   │   ├── ThemeContext.jsx
│   │   ├── LanguageContext.jsx
│   │   ├── NotificationContext.jsx
│   │   ├── SidebarContext.jsx
│   │   └── JobPositionContext.jsx
│   │
│   ├── styles/                 # Global SCSS files
│   │   ├── primary-button.scss
│   │   ├── modal-styles.scss
│   │   ├── status-badges.scss
│   │   ├── tabs.scss
│   │   ├── dashboard-styles.scss
│   │   └── theme-variables.css
│   │
│   ├── utils/                  # Utility functions
│   │   ├── apiClient.js        # Axios instance
│   │   ├── errorHandler.js     # Error handling utilities
│   │   ├── rbac.js             # Role-based access control
│   │   ├── roles.js            # Role constants
│   │   └── formatters.js       # Data formatting utilities
│   │
│   ├── config/                 # Configuration files
│   │   └── api.config.js       # API endpoint definitions (969 lines)
│   │
│   ├── constants/              # Application constants
│   │   └── documentTypes.js
│   │
│   ├── assets/                 # Images, fonts, etc.
│   │
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx                # Application entry point
│   ├── App.css                 # Global app styles
│   ├── index.css               # Base CSS styles
│   └── i18n.jsx                # i18n configuration (927 lines)
│
├── .eslintrc.cjs               # ESLint configuration
├── .gitignore
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
└── README.md
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `DataTable.jsx`, `EquipmentCard.jsx`)
- **Pages**: PascalCase (e.g., `EquipmentDetails.jsx`, `DashboardPage.jsx`)
- **Services**: camelCase + Service (e.g., `equipmentService.js`, `authService.js`)
- **Contexts**: PascalCase + Context (e.g., `AuthContext.jsx`, `ThemeContext.jsx`)
- **Styles**: kebab-case (e.g., `equipment-card.scss`, `modal-styles.scss`)
- **Utilities**: camelCase (e.g., `apiClient.js`, `formatters.js`)

---

## Routing System

### Router Configuration
**Location**: `App.jsx` (330 lines)

**Router Type**: React Router v7 with BrowserRouter

### Route Structure

```jsx
<Routes>
  {/* Public Routes */}
  <Route path="/login" element={<Login />} />

  {/* Protected Routes with Layout */}
  <Route element={<MainLayout />}>
    {/* Dashboard - Role-based */}
    <Route path="/dashboard" element={<DashboardPage />} />

    {/* Admin Routes - ADMIN only */}
    <Route path="/admin" element={
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AdminPage />
      </RoleRoute>
    } />

    {/* Equipment Routes */}
    <Route path="/equipment" element={<EquipmentMain />} />
    <Route path="/equipment/:id" element={<EquipmentDetails />} />
    <Route path="/equipment-types" element={<EquipmentTypeManagement />} />

    {/* Warehouse Routes */}
    <Route path="/warehouses" element={<WarehousesList />} />
    <Route path="/warehouses/:id" element={<WarehouseDetails />} />

    {/* HR Routes - HR Layout */}
    <Route path="/hr" element={<HRLayout />}>
      <Route path="departments" element={<DepartmentsList />} />
      <Route path="employees" element={<EmployeesList />} />
      <Route path="employees/:id" element={<EmployeeDetails />} />
      <Route path="positions" element={<PositionsList />} />
      <Route path="vacancies" element={<VacancyList />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="promotions" element={<PromotionList />} />
      <Route path="leave-requests" element={<LeaveRequestList />} />
    </Route>

    {/* Payroll Routes */}
    <Route path="/payroll" element={<PayrollCycles />} />
    <Route path="/payroll/:id" element={<PayrollDetails />} />

    {/* Finance Routes */}
    <Route path="/finance/general-ledger" element={<GeneralLedger />} />
    <Route path="/finance/payables" element={<Payables />} />
    <Route path="/finance/fixed-assets" element={<FixedAssets />} />

    {/* Procurement Routes */}
    <Route path="/procurement/request-orders" element={<ProcurementRequestOrders />} />
    <Route path="/procurement/offers" element={<ProcurementOffers />} />
    <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />

    {/* Maintenance Routes */}
    <Route path="/maintenance" element={<MaintenanceRecords />} />
    <Route path="/maintenance/:id" element={<MaintenanceRecordDetail />} />

    {/* Sites Routes */}
    <Route path="/sites" element={<AllSites />} />
    <Route path="/sites/:id" element={<SiteDetails />} />

    {/* Other Routes */}
    <Route path="/merchants" element={<MerchantList />} />
    <Route path="/partners" element={<Partners />} />
    <Route path="/notifications" element={<Notifications />} />
  </Route>

  {/* Fallback */}
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

### Protected Route Component

**RoleRoute Component**:
```jsx
const RoleRoute = ({
  allowedRoles,
  children,
  redirectPath = '/dashboard'
}) => {
  const { currentUser, isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingPage />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser?.role)) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};
```

### Layout Components

**MainLayout**:
- Sidebar navigation
- Navbar (top bar)
- Main content area
- Notification toasts

**HRLayout**:
- HR-specific sidebar
- HR module navigation
- Content area

**SitesLayout**:
- Site-specific navigation
- Site selector
- Content area

### Navigation Patterns

**Programmatic Navigation**:
```jsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Navigate to route
navigate('/equipment/123');

// Navigate back
navigate(-1);

// Replace current route
navigate('/dashboard', { replace: true });

// Pass state
navigate('/equipment/123', { state: { from: 'dashboard' } });
```

**Link Navigation**:
```jsx
import { Link } from 'react-router-dom';

<Link to="/equipment">Equipment</Link>
<Link to={`/equipment/${id}`}>View Details</Link>
```

---

## State Management (Contexts)

### 1. AuthContext

**Location**: `src/contexts/AuthContext.jsx` (230 lines)

**Purpose**: Manage user authentication, session persistence, and role-based access.

**Provider Setup**:
```jsx
import { AuthProvider } from './contexts/AuthContext';

<AuthProvider>
  <App />
</AuthProvider>
```

**API**:
```jsx
const {
  // State
  currentUser,      // { role, firstName, lastName, username }
  token,            // JWT token string
  isAuthenticated,  // Boolean
  loading,          // Boolean

  // Methods
  login,            // (username, password) => Promise<void>
  logout,           // () => Promise<void>
  hasRole,          // (role: string) => boolean
  hasAnyRole,       // (roles: string[]) => boolean
  isTokenExpired,   // (token: string) => boolean
  refreshUserData,  // () => Promise<void>
  validateSession   // () => Promise<boolean>
} = useAuth();
```

**Usage Example**:
```jsx
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { currentUser, login, logout, hasRole } = useAuth();

  const handleLogin = async () => {
    try {
      await login('username', 'password');
      // Redirect handled by AuthContext
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {currentUser && <p>Welcome, {currentUser.firstName}</p>}
      {hasRole('ADMIN') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

**Features**:
- JWT token storage in localStorage
- Automatic token expiration checking (every 60 seconds)
- Session persistence across page refreshes
- Token refresh on expiration
- Role-based access helpers

---

### 2. SnackbarContext

**Location**: `src/contexts/SnackbarContext.jsx` (116 lines)

**Purpose**: Global notification system for user feedback.

**API**:
```jsx
const {
  // State
  snackbar,         // { message, type, isOpen, duration, persistent, actions }

  // Methods
  showSnackbar,     // (message, type, duration, persistent, actions)
  hideSnackbar,     // () => void
  showSuccess,      // (message, duration?) => void
  showError,        // (message, duration?) => void
  showInfo,         // (message, duration?, persistent?) => void
  showWarning,      // (message, duration?, persistent?) => void
  showConfirmation  // (message, onConfirm, onCancel?) => void
} = useSnackbar();
```

**Usage Example**:
```jsx
import { useSnackbar } from '../contexts/SnackbarContext';

const MyComponent = () => {
  const { showSuccess, showError, showConfirmation } = useSnackbar();

  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('Data saved successfully');
    } catch (error) {
      showError('Failed to save data. Please try again.');
    }
  };

  const handleDelete = () => {
    showConfirmation(
      'Are you sure you want to delete this item?',
      async () => {
        await deleteItem();
        showSuccess('Item deleted');
      }
    );
  };
};
```

**Notification Types**:
- `success` - Green background, checkmark icon
- `error` - Red background, error icon
- `info` - Blue background, info icon
- `warning` - Orange background, warning icon

**Features**:
- Auto-dismiss (default 3 seconds)
- Persistent notifications (require manual close)
- Action buttons (for confirmations)
- Queue system (one notification at a time)

---

### 3. ThemeContext

**Location**: `src/contexts/ThemeContext.jsx` (100 lines)

**Purpose**: Light/dark mode theme switching with persistence.

**API**:
```jsx
const {
  theme,        // 'light' | 'dark'
  toggleTheme,  // () => void
  isLoaded      // boolean
} = useTheme();
```

**Usage Example**:
```jsx
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
};
```

**Features**:
- System preference detection
- localStorage persistence
- CSS variable-based theming
- Meta theme-color updating
- Smooth transition animations

**Theme Variables** (in `theme-variables.css`):
```css
[data-theme="light"] {
  --background-color: #f9f9f9;
  --text-color: #333;
  --primary-color: #2563eb;
  --border-color: #e0e0e0;
}

[data-theme="dark"] {
  --background-color: #1e1e1e;
  --text-color: #f0f0f0;
  --primary-color: #3b82f6;
  --border-color: #444;
}
```

---

### 4. LanguageContext

**Location**: `src/contexts/LanguageContext.jsx` (64 lines)

**Purpose**: Multi-language support with English and Arabic (RTL).

**API**:
```jsx
const {
  language,       // 'en' | 'ar'
  switchLanguage  // (lang: 'en' | 'ar') => void
} = useLanguage();
```

**Usage Example**:
```jsx
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { language, switchLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div>
      <p>{t('common.welcome')}</p>
      <button onClick={() => switchLanguage('en')}>English</button>
      <button onClick={() => switchLanguage('ar')}>العربية</button>
    </div>
  );
};
```

**Features**:
- localStorage persistence
- RTL support for Arabic
- Document direction management (`dir="ltr"` or `dir="rtl"`)
- i18next integration

---

### 5. NotificationContext

**Location**: `src/contexts/NotificationContext.jsx` (187 lines)

**Purpose**: Real-time WebSocket notifications with toast UI.

**API**:
```jsx
const {
  // State
  toasts,         // Array of toast notifications
  wsConnected,    // boolean (WebSocket connection status)

  // Methods
  showToast,      // ({ type, title, message, duration, action, avatar, timestamp, persistent })
  removeToast,    // (id: string) => void
  clearAllToasts, // () => void
  showSuccess,    // (title, message, options?) => void
  showError,      // (title, message, options?) => void
  showWarning,    // (title, message, options?) => void
  showInfo        // (title, message, options?) => void
} = useNotification();
```

**Usage Example**:
```jsx
import { useNotification } from '../contexts/NotificationContext';

const MyComponent = () => {
  const { showSuccess, showError, wsConnected } = useNotification();

  useEffect(() => {
    if (wsConnected) {
      console.log('WebSocket connected');
    }
  }, [wsConnected]);

  const handleAction = async () => {
    try {
      await performAction();
      showSuccess('Success', 'Action completed successfully');
    } catch (error) {
      showError('Error', 'Action failed');
    }
  };
};
```

**Features**:
- Real-time WebSocket notifications
- Toast UI with auto-dismiss
- Max 5 toasts at once (oldest removed)
- Connection status tracking
- Manual close option
- Persistent toasts option
- Action buttons in toasts

---

### 6. SidebarContext

**Location**: `src/contexts/SidebarContext.jsx`

**Purpose**: Manage sidebar expand/collapse state (global).

**API**:
```jsx
const {
  isExpanded,   // boolean
  toggleSidebar // () => void
} = useSidebar();
```

---

### 7. JobPositionContext

**Location**: `src/contexts/JobPositionContext.jsx`

**Purpose**: Domain-specific context for job position management.

**Features**:
- Job position hierarchy management
- Promotion eligibility tracking
- Position analytics

---

## Services Layer

### Service Organization

**56 service files** organized by domain:

#### Core Services
- `authService.js` - Authentication, JWT management
- `apiClient.js` - Axios instance with interceptors
- `dashboardService.js` - Dashboard data aggregation

#### Equipment Services
- `equipmentService.js` - Equipment CRUD, transactions
- `equipmentTypeService.js` - Equipment types
- `equipmentBrandService.js` - Brands
- `sarkyService.js` - Usage logs
- `consumableService.js` - Consumables
- `inSiteMaintenanceService.js` - Maintenance

#### HR Services (`/services/hr/`)
- `employeeService.js`
- `attendanceService.js`
- `candidateService.js`
- `departmentService.js`
- `jobPositionService.js`
- `promotionService.js`
- `vacancyService.js`
- `hrEmployeeService.js`

#### Warehouse Services (`/services/warehouse/`)
- `warehouseService.js`
- `itemService.js`
- `itemCategoryService.js`
- `itemTypeService.js`
- `warehouseEmployeeService.js`

#### Procurement Services (`/services/procurement/`)
- `requestOrderService.js`
- `offerService.js`
- `purchaseOrderService.js`
- `procurementService.js`

#### Finance Services
- `financeService.js` - Comprehensive finance operations

#### Payroll Services (`/services/payroll/`)
- `payrollService.js`
- `loanService.js`
- `deductionService.js`
- `payslipService.js`

#### Other Services
- `siteService.js`
- `merchantService.js`
- `contactService.js`
- `maintenanceService.js`
- `directPurchaseService.js`
- `notificationService.js`
- `webSocketService.js`
- `transactionService.js`

### Service Pattern

**Standard Service Structure**:
```javascript
// services/exampleService.js
import apiClient from '../utils/apiClient';
import { EXAMPLE_ENDPOINTS } from '../config/api.config';

export const exampleService = {
  // GET all
  getAll: async () => {
    const response = await apiClient.get(EXAMPLE_ENDPOINTS.BASE);
    return response.data;
  },

  // GET by ID
  getById: async (id) => {
    const response = await apiClient.get(EXAMPLE_ENDPOINTS.BY_ID(id));
    return response.data;
  },

  // POST create
  create: async (data) => {
    const response = await apiClient.post(EXAMPLE_ENDPOINTS.CREATE, data);
    return response.data;
  },

  // PUT update
  update: async (id, data) => {
    const response = await apiClient.put(EXAMPLE_ENDPOINTS.UPDATE(id), data);
    return response.data;
  },

  // DELETE
  delete: async (id) => {
    const response = await apiClient.delete(EXAMPLE_ENDPOINTS.DELETE(id));
    return response.data;
  }
};

export default exampleService;
```

### Service Usage in Components

```jsx
import exampleService from '../services/exampleService';
import { useSnackbar } from '../contexts/SnackbarContext';

const MyComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useSnackbar();

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await exampleService.getAll();
        setData(result);
      } catch (error) {
        showError('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create item
  const handleCreate = async (formData) => {
    try {
      const newItem = await exampleService.create(formData);
      setData([...data, newItem]);
      showSuccess('Item created successfully');
    } catch (error) {
      showError('Failed to create item');
    }
  };

  if (loading) return <LoadingSpinner />;

  return <div>{/* Render data */}</div>;
};
```

---

## Components Library

### Common Components (`/components/common/`)

#### 1. DataTable Component

**Location**: `src/components/common/DataTable.jsx` (1,142 lines)

**Purpose**: Highly sophisticated table component with filtering, sorting, pagination, and Excel export.

**Props**:
```jsx
<DataTable
  data={items}                    // Array of objects
  columns={columns}               // Array of column definitions
  showSearch={true}               // Show global search
  showFilters={true}              // Show column filters
  showExportButton={true}         // Show Excel export button
  showAddButton={true}            // Show add button
  onAddClick={handleAdd}          // Add button handler
  onRowClick={handleRowClick}     // Row click handler
  actions={[                      // Row action buttons
    { label: 'Edit', icon: <FaEdit />, onClick: handleEdit },
    { label: 'Delete', icon: <FaTrash />, onClick: handleDelete, variant: 'danger' }
  ]}
  emptyMessage="No items found"   // Empty state message
  itemsPerPageOptions={[10, 25, 50, 100]}
/>
```

**Column Definition**:
```javascript
const columns = [
  {
    header: 'Name',              // Column header text
    accessor: 'name',            // Object property to access
    sortable: true,              // Enable sorting
    filterable: true,            // Enable filtering
    filterType: 'text',          // Filter type: text, select, date, number
    render: (value, row) => (    // Custom cell renderer
      <span>{value}</span>
    )
  },
  {
    header: 'Status',
    accessor: 'status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: ['Active', 'Inactive'],  // Options for select filter
    render: (value) => (
      <span className={`badge badge-${value.toLowerCase()}`}>
        {value}
      </span>
    )
  },
  {
    header: 'Created Date',
    accessor: 'createdAt',
    sortable: true,
    filterable: true,
    filterType: 'date',
    render: (value) => new Date(value).toLocaleDateString()
  }
];
```

**Features**:
- **Sorting**: Multi-column sorting (ascending/descending)
- **Filtering**: Text, select, date, number filters per column
- **Pagination**: Configurable items per page
- **Global Search**: Search across all columns
- **Excel Export**: Export filtered/sorted data to Excel
- **Empty State**: Custom empty message
- **Actions**: Inline action buttons or dropdown menu
- **Custom Renderers**: Custom cell rendering
- **Responsive**: Mobile-friendly design
- **Loading States**: Skeleton loading

**Usage Example**:
```jsx
import DataTable from '../components/common/DataTable';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);

  const columns = [
    { header: 'Name', accessor: 'name', sortable: true, filterable: true },
    { header: 'Position', accessor: 'position', sortable: true, filterable: true },
    { header: 'Department', accessor: 'department', sortable: true, filterable: true },
    {
      header: 'Salary',
      accessor: 'salary',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => `$${value.toLocaleString()}`
    }
  ];

  const actions = [
    { label: 'Edit', icon: <FaEdit />, onClick: handleEdit },
    { label: 'Delete', icon: <FaTrash />, onClick: handleDelete, variant: 'danger' }
  ];

  return (
    <DataTable
      data={employees}
      columns={columns}
      actions={actions}
      showSearch={true}
      showFilters={true}
      showExportButton={true}
    />
  );
};
```

---

#### 2. Sidebar Component

**Location**: `src/components/common/Sidebar.jsx` (766 lines)

**Purpose**: Role-based navigation sidebar with collapsible menus.

**Features**:
- Collapsible/expandable state (global via SidebarContext)
- Mobile responsive with backdrop overlay
- Nested submenu support
- Active route highlighting
- Tooltip labels when collapsed
- Theme-aware logo switching
- Role-based menu filtering

**Menu Structure**:
```javascript
const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <FaHome />, roles: ['ALL'] },
  { path: '/admin', label: 'Admin', icon: <FaUserShield />, roles: ['ADMIN'] },
  { path: '/sites', label: 'Sites', icon: <FaBuilding />, roles: ['ADMIN', 'SITE_ADMIN'] },
  {
    label: 'Equipment',
    icon: <FaTruck />,
    roles: ['ADMIN', 'EQUIPMENT_MANAGER'],
    submenu: [
      { path: '/equipment', label: 'Equipment List' },
      { path: '/equipment-types', label: 'Equipment Types' },
      { path: '/equipment-brands', label: 'Brands' }
    ]
  }
];
```

---

#### 3. Navbar Component

**Location**: `src/components/common/Navbar.jsx`

**Purpose**: Top navigation bar with user controls.

**Features**:
- User profile display
- Theme toggle (light/dark)
- Language switcher (English/Arabic)
- Notifications bell with badge
- Logout button

---

#### 4. Other Common Components

**LoadingPage**: Full-page loading spinner
```jsx
<LoadingPage />
```

**LoadingSpinner**: Inline loading indicator
```jsx
<LoadingSpinner size="small" />
```

**Snackbar**: Toast notification display (used by SnackbarContext)

**NotificationToast**: Real-time notification toasts (used by NotificationContext)

**ConfirmationDialog**: Modal confirmation dialogs
```jsx
<ConfirmationDialog
  isOpen={isOpen}
  title="Confirm Deletion"
  message="Are you sure you want to delete this item?"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

**PageHeader**: Consistent page headers with breadcrumbs
```jsx
<PageHeader
  title="Equipment Management"
  breadcrumbs={[
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Equipment', path: '/equipment' },
    { label: 'Details' }
  ]}
  actions={
    <button onClick={handleAdd}>Add Equipment</button>
  }
/>
```

**BackButton**: Navigation back button
```jsx
<BackButton to="/equipment" />
```

**ChartCard**: Wrapper for charts
```jsx
<ChartCard title="Monthly Sales">
  <LineChart data={data} />
</ChartCard>
```

**StatisticsCards**: Dashboard metric cards
```jsx
<StatisticsCards
  stats={[
    { label: 'Total Equipment', value: 150, icon: <FaTruck /> },
    { label: 'In Maintenance', value: 12, icon: <FaWrench /> }
  ]}
/>
```

**Tabs**: Tab navigation component
```jsx
<Tabs
  tabs={[
    { label: 'Overview', content: <Overview /> },
    { label: 'Details', content: <Details /> }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

---

### Domain-Specific Components

#### Equipment Components
- **TransactionHub**: Complex transaction management
- **BatchValidationWorkflow**: Batch number validation
- **MaintenanceLinkingSection**: Link transactions to maintenance
- **InlineMaintenanceCreation**: Create maintenance inline
- **DocumentUpload**: Equipment document upload

#### Procurement Components
- **OfferTimeline**: Timeline visualization for offers
- **PurchaseOrderDetailsPage**: Tabbed PO details
- **RequestOrderDetails**: RO information
- **PurchaseOrderViewModal**: PO viewing modal

#### HR Components
- **CandidateStatusModal**: Update candidate status

#### Maintenance Components
- **MaintenanceCard**: Maintenance record card display

---

## Pages Overview

### Role-Based Dashboards

**Location**: `src/pages/dashboards/`

**Available Dashboards**:
- `AdminDashboard.jsx` - System-wide metrics
- `SiteAdminDashboard.jsx` - Site-specific analytics
- `EquipmentManagerDashboard.jsx` - Equipment fleet overview
- `WarehouseManagerDashboard.jsx` - Inventory metrics
- `HRManagerDashboard.jsx` - Employee analytics
- `FinanceManagerDashboard.jsx` - Financial summaries
- `ProcurementDashboard.jsx` - Procurement KPIs
- `MaintenanceManagerDashboard.jsx` - Maintenance tracking

**Dashboard Router**:
`DashboardPage.jsx` automatically displays the appropriate dashboard based on user role.

---

### HR Module Pages

**Location**: `src/pages/HR/`

**Employee Management**:
- `EmployeesList.jsx` - All employees with DataTable
- `EmployeeDetails.jsx` - Employee details with 10 tabs:
  1. Personal Info
  2. Employment Details
  3. Attendance History
  4. Documents
  5. Compensation
  6. Loans
  7. Deductions
  8. Commissions
  9. Payslips
  10. Vacation Balance

**Vacancy & Recruitment**:
- `VacancyList.jsx` - Job vacancies
- `VacancyDetails.jsx` - Vacancy details with candidates
- `EmployeeOnboarding.jsx` - Convert candidate to employee
- `PotentialCandidates.jsx` - Candidate pool

**Job Positions**:
- `PositionsList.jsx` - All positions
- `JobPositionDetails.jsx` - Position details with 4 tabs:
  1. Overview
  2. Employees
  3. Promotions
  4. Analytics

**Other HR Pages**:
- `PromotionList.jsx` - Promotion requests with bulk actions
- `DepartmentsList.jsx` - Departments
- `DepartmentDetails.jsx` - Department details
- `AttendancePage.jsx` - Monthly attendance view
- `LeaveRequestList.jsx` - Leave requests
- `LeaveRequestDetailPage.jsx` - Leave details
- `VacationBalancePage.jsx` - Vacation balance tracking

---

### Equipment Pages

**Location**: `src/pages/equipment/`

- `EquipmentMain.jsx` - Equipment list (card/table view)
- `EquipmentDetails.jsx` - Detailed equipment view
- `ViewEquipmentData.jsx` - Equipment information
- `EquipmentConsumablesInventory.jsx` - Consumable tracking
- `EquipmentSarkyMatrix.jsx` - Usage log matrix
- `InSiteMaintenanceLog.jsx` - Maintenance history
- `EquipmentBrandManagement.jsx` - Brand management
- `EquipmentTypeManagement.jsx` - Type management
- `WorkTypeManagement.jsx` - Work types
- `MaintenanceTypeManagement.jsx` - Maintenance types

---

### Warehouse Pages

**Location**: `src/pages/warehouse/`

- `WarehousesList.jsx` - All warehouses
- `WarehouseDetails.jsx` - Warehouse details
- `WarehouseInformation.jsx` - Warehouse info
- `WarehouseViewItemsCategoriesTable.jsx` - Item categories
- `WarehouseViewItemTypesTable.jsx` - Item types

---

### Procurement Pages

**Location**: `src/pages/procurement/`

- `ProcurementRequestOrders.jsx` - Request orders list
- `ProcurementRequestOrderDetails.jsx` - RO details
- `ProcurementOffers.jsx` - Offers list
- `PurchaseOrders.jsx` - PO list
- `PurchaseOrderDetails.jsx` - PO details with tabs
- `ResolveIssuesPage.jsx` - Issue resolution

---

### Finance Pages

**Location**: `src/pages/finance/`

- `GeneralLedger.jsx` - Journal entries, periods
- `Payables.jsx` - Invoices and payments
- `FixedAssets.jsx` - Asset management
- `BankReconciliation.jsx` - Bank reconciliation
- `Balances.jsx` - Balance management
- `AccountsPayable.jsx` - AP workflow

---

### Payroll Pages

**Location**: `src/pages/payroll/`

- `PayrollCycles.jsx` - Payroll lifecycle management
- `PayrollDetails.jsx` - Payroll cycle details
- `EmployeePayrollList.jsx` - All employee payrolls
- `EmployeePayrollDetails.jsx` - Individual payroll
- `LoanManagement.jsx` - Loan tracking
- `LoanDetails.jsx` - Loan details
- `DeductionManagement.jsx` - Deductions
- `PayslipManagement.jsx` - Payslips
- `PayslipEdit.jsx` - Edit payslip
- `PayrollReports.jsx` - Reports

---

## Styling System

### Sass/SCSS Organization

**Component-scoped SCSS**: Each component has its own `.scss` file

**Global styles**: `/src/styles/` directory

### Shared Style Files

**Button Styles**:
- `primary-button.scss` - Primary button styles

**Modal Styles**:
- `modal-styles.scss` - Base modal styles
- `compact-modal-styles.scss` - Compact modal layouts
- `cancel-modal-button.scss` - Cancel button
- `close-modal-button.scss` - Close button

**Form Styles**:
- `textarea-styles.scss` - Textarea styling
- `form-validation.scss` - Validation indicators

**Layout Styles**:
- `dashboard-styles.scss` - Dashboard common styles
- `tabs.scss` - Tab navigation

**Component Styles**:
- `status-badges.scss` - Status badge colors

**Theme System**:
- `theme-variables.css` - CSS variables for theming

### Theme Variables

**CSS Variables** (in `theme-variables.css`):
```css
/* Light Theme */
[data-theme="light"] {
  --background-color: #f9f9f9;
  --surface-color: #ffffff;
  --text-color: #333333;
  --text-secondary: #666666;
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --info-color: #3b82f6;
  --border-color: #e0e0e0;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Dark Theme */
[data-theme="dark"] {
  --background-color: #1e1e1e;
  --surface-color: #2a2a2a;
  --text-color: #f0f0f0;
  --text-secondary: #b0b0b0;
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --success-color: #22c55e;
  --error-color: #f87171;
  --warning-color: #fbbf24;
  --info-color: #60a5fa;
  --border-color: #444444;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

### Styling Patterns

**BEM Naming Convention**:
```scss
.rockops-table {
  &__header { }
  &__body { }
  &__row {
    &--selected { }
    &--disabled { }
  }
  &__cell { }
}
```

**Theme-Aware Styling**:
```scss
.my-component {
  background-color: var(--background-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);

  &:hover {
    background-color: var(--primary-hover);
  }
}
```

**RTL Support**:
```scss
.my-component {
  padding-left: 1rem;

  [dir="rtl"] & {
    padding-left: 0;
    padding-right: 1rem;
  }
}
```

**Responsive Design**:
```scss
.my-component {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
```

### Component Styling Example

**Component**: `EquipmentCard.jsx`
**Style**: `EquipmentCard.scss`

```scss
.equipment-card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    h3 {
      color: var(--text-color);
      font-size: 1.25rem;
      margin: 0;
    }
  }

  &__status {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;

    &--available {
      background-color: var(--success-color);
      color: white;
    }

    &--maintenance {
      background-color: var(--warning-color);
      color: white;
    }
  }

  &__body {
    color: var(--text-secondary);

    p {
      margin: 0.5rem 0;
    }
  }

  &__footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 0.5rem;
  }
}
```

---

## Utilities & Helpers

### apiClient.js

**Location**: `src/utils/apiClient.js` (41 lines)

**Purpose**: Centralized Axios instance with interceptors.

**Configuration**:
```javascript
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip 401 handling for login endpoint
    if (error.response?.status === 401 &&
        !error.config.url.includes('/auth/authenticate')) {
      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### roles.js

**Location**: `src/utils/roles.js` (33 lines)

**Purpose**: Role constants for the application.

**Roles**:
```javascript
export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  SITE_ADMIN: 'SITE_ADMIN',
  PROCUREMENT: 'PROCUREMENT',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  WAREHOUSE_EMPLOYEE: 'WAREHOUSE_EMPLOYEE',
  SECRETARY: 'SECRETARY',
  EQUIPMENT_MANAGER: 'EQUIPMENT_MANAGER',
  HR_MANAGER: 'HR_MANAGER',
  HR_EMPLOYEE: 'HR_EMPLOYEE',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  FINANCE_EMPLOYEE: 'FINANCE_EMPLOYEE',
  MAINTENANCE_MANAGER: 'MAINTENANCE_MANAGER',
  MAINTENANCE_EMPLOYEE: 'MAINTENANCE_EMPLOYEE'
};
```

---

### rbac.js

**Location**: `src/utils/rbac.js`

**Purpose**: Role-based access control helper functions.

**Functions**:
```javascript
export const hasRole = (user, role) => {
  return user?.role === role;
};

export const hasAnyRole = (user, roles) => {
  return roles.includes(user?.role);
};

export const canAccess = (user, allowedRoles) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true; // Admin has access to everything
  return allowedRoles.includes(user.role);
};
```

---

### formatters.js

**Location**: `src/utils/formatters.js`

**Purpose**: Data formatting utilities.

**Example Functions**:
```javascript
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatCurrency = (amount, currency = 'EGP') => {
  if (amount == null) return 'N/A';
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
```

---

## Configuration

### API Configuration

**Location**: `src/config/api.config.js` (969 lines)

**Purpose**: Centralized API endpoint definitions.

**Base URL**:
```javascript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
```

**Endpoint Structure**:
```javascript
export const EQUIPMENT_ENDPOINTS = {
  BASE: '/api/v1/equipment',
  BY_ID: (id) => `/api/v1/equipment/${id}`,
  CREATE: '/api/v1/equipment',
  UPDATE: (id) => `/api/v1/equipment/${id}`,
  DELETE: (id) => `/api/v1/equipment/${id}`,
  BY_TYPE: (typeId) => `/api/v1/equipment/type/${typeId}`,
  CONSUMABLES: (equipmentId) => `/api/v1/equipment/${equipmentId}/consumables`,
  MAINTENANCE: (equipmentId) => `/api/v1/equipment/${equipmentId}/maintenance`,
  TRANSACTIONS: (equipmentId) => `/api/v1/equipment/${equipmentId}/transactions`,
  SEND_TRANSACTION: (equipmentId) => `/api/v1/equipment/${equipmentId}/send-transaction`
};
```

**All Endpoint Categories**:
- DIRECT_PURCHASE_ENDPOINTS
- DASHBOARD_ENDPOINTS
- EQUIPMENT_ENDPOINTS
- BATCH_VALIDATION_ENDPOINTS
- CONSUMABLE_ENDPOINTS
- EQUIPMENT_TYPE_ENDPOINTS
- SARKY_ENDPOINTS
- FINANCE_ENDPOINTS (comprehensive)
- EMPLOYEE_ENDPOINTS
- HR_ENDPOINTS
- SITE_ENDPOINTS
- MERCHANT_ENDPOINTS
- WORK_TYPE_ENDPOINTS
- CONTACT_TYPE_ENDPOINTS
- JOB_POSITION_ENDPOINTS
- DOCUMENT_ENDPOINTS
- PARTNER_ENDPOINTS
- AUTH_ENDPOINTS
- ADMIN_ENDPOINTS
- ITEM_CATEGORY_ENDPOINTS
- REQUEST_ORDER_ENDPOINTS
- OFFER_ENDPOINTS
- CANDIDATE_ENDPOINTS
- VACANCY_ENDPOINTS
- DEPARTMENT_ENDPOINTS
- ATTENDANCE_ENDPOINTS
- TRANSACTION_ENDPOINTS
- ITEM_TYPE_ENDPOINTS
- WAREHOUSE_ENDPOINTS
- MAINTENANCE_TYPE_ENDPOINTS
- INSITE_MAINTENANCE_ENDPOINTS
- ITEM_ENDPOINTS
- WAREHOUSE_EMPLOYEE_ENDPOINTS
- NOTIFICATION_ENDPOINTS
- PROCUREMENT_ENDPOINTS
- PURCHASE_ORDER_ENDPOINTS
- MAINTENANCE_ENDPOINTS
- CONTACT_ENDPOINTS
- LOAN_ENDPOINTS

---

### i18n Configuration

**Location**: `src/i18n.jsx` (927 lines)

**Purpose**: Internationalization configuration with translations.

**Setup**:
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    debug: false,
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });
```

**Translation Usage**:
```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.dashboard')}</h1>
      <p>{t('hr.employees')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

**Translation Keys** (examples):
- `common.dashboard` - "Dashboard"
- `common.save` - "Save"
- `common.cancel` - "Cancel"
- `hr.employees` - "Employees"
- `equipment.list` - "Equipment List"
- `finance.generalLedger` - "General Ledger"

---

### Environment Variables

**File**: `.env` (not in version control)

**Variables**:
```env
VITE_API_BASE_URL=http://localhost:8080
```

**Usage**:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

---

## Development Patterns

### 1. Component Pattern

**Standard Functional Component**:
```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import exampleService from '../services/exampleService';
import './MyComponent.scss';

const MyComponent = () => {
  // Contexts
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effects
  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await exampleService.getAll();
      setData(result);
    } catch (err) {
      setError(err.message);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      const newItem = await exampleService.create(formData);
      setData([...data, newItem]);
      showSuccess('Item created successfully');
    } catch (err) {
      showError('Failed to create item');
    }
  };

  // Render
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="my-component">
      <h1>My Component</h1>
      {/* Component content */}
    </div>
  );
};

export default MyComponent;
```

---

### 2. Modal Pattern

```jsx
const MyComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (item) => {
    setModalMode('view');
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleSubmit = async (formData) => {
    if (modalMode === 'create') {
      await exampleService.create(formData);
    } else if (modalMode === 'edit') {
      await exampleService.update(selectedItem.id, formData);
    }
    handleCloseModal();
    fetchData();
  };

  return (
    <>
      <button onClick={handleOpenCreateModal}>Add Item</button>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Create Item' : modalMode === 'edit' ? 'Edit Item' : 'View Item'}
      >
        <ItemForm
          item={selectedItem}
          mode={modalMode}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </>
  );
};
```

---

### 3. Form Handling Pattern

```jsx
const ItemForm = ({ item, mode, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(item || {
    name: '',
    description: '',
    category: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={isViewMode}
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={isViewMode}
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          disabled={isViewMode}
          className={errors.category ? 'error' : ''}
        >
          <option value="">Select category</option>
          <option value="type1">Type 1</option>
          <option value="type2">Type 2</option>
        </select>
        {errors.category && <span className="error-message">{errors.category}</span>}
      </div>

      {!isViewMode && (
        <div className="form-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </form>
  );
};
```

---

### 4. List with CRUD Operations Pattern

```jsx
const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const { showSuccess, showError, showConfirmation } = useSnackbar();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await exampleService.getAll();
      setItems(data);
    } catch (err) {
      showError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    showConfirmation(
      `Are you sure you want to delete "${item.name}"?`,
      async () => {
        try {
          await exampleService.delete(item.id);
          setItems(items.filter(i => i.id !== item.id));
          showSuccess('Item deleted successfully');
        } catch (err) {
          showError('Failed to delete item');
        }
      }
    );
  };

  const handleSubmit = async (formData) => {
    try {
      if (modalMode === 'create') {
        const newItem = await exampleService.create(formData);
        setItems([...items, newItem]);
        showSuccess('Item created successfully');
      } else {
        const updatedItem = await exampleService.update(selectedItem.id, formData);
        setItems(items.map(i => i.id === selectedItem.id ? updatedItem : i));
        showSuccess('Item updated successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      showError(`Failed to ${modalMode} item`);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name', sortable: true, filterable: true },
    { header: 'Category', accessor: 'category', sortable: true, filterable: true },
    { header: 'Created', accessor: 'createdAt', sortable: true, render: (value) => formatDate(value) }
  ];

  const actions = [
    { label: 'Edit', icon: <FaEdit />, onClick: handleEdit },
    { label: 'Delete', icon: <FaTrash />, onClick: handleDelete, variant: 'danger' }
  ];

  if (loading) return <LoadingPage />;

  return (
    <div className="item-list">
      <PageHeader
        title="Items"
        actions={<button onClick={handleCreate}>Add Item</button>}
      />

      <DataTable
        data={items}
        columns={columns}
        actions={actions}
        showSearch={true}
        showFilters={true}
        showExportButton={true}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Item' : 'Edit Item'}
      >
        <ItemForm
          item={selectedItem}
          mode={modalMode}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};
```

---

## API Integration

### Service Call Pattern

```jsx
// 1. Import service
import equipmentService from '../services/equipmentService';
import { useSnackbar } from '../contexts/SnackbarContext';

// 2. Call service in component
const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useSnackbar();

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const data = await equipmentService.getAll();
        setEquipment(data);
      } catch (error) {
        showError('Failed to load equipment');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);
};
```

### File Upload Pattern

```jsx
const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', 'EQUIPMENT');
  formData.append('entityId', equipmentId);

  try {
    const response = await documentService.upload(formData);
    showSuccess('File uploaded successfully');
    return response;
  } catch (error) {
    showError('Failed to upload file');
  }
};
```

### Polling Pattern

```jsx
useEffect(() => {
  const pollInterval = setInterval(async () => {
    try {
      const status = await jobService.getStatus(jobId);
      if (status === 'COMPLETED') {
        clearInterval(pollInterval);
        showSuccess('Job completed');
      }
    } catch (error) {
      clearInterval(pollInterval);
      showError('Failed to check status');
    }
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(pollInterval);
}, [jobId]);
```

---

## Error Handling

### Try-Catch Pattern

```jsx
const handleAction = async () => {
  try {
    setLoading(true);
    const result = await service.action();
    showSuccess('Action completed successfully');
    return result;
  } catch (error) {
    // Handle specific error codes
    if (error.response?.status === 400) {
      showError('Invalid input. Please check your data.');
    } else if (error.response?.status === 403) {
      showError('You don\'t have permission to perform this action.');
    } else if (error.response?.status === 404) {
      showError('Item not found.');
    } else if (error.response?.status === 409) {
      showError('Conflict: Item already exists.');
    } else {
      showError('An unexpected error occurred. Please try again.');
    }
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

### Error Boundary (React)

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Performance Optimization

### 1. useMemo for Expensive Computations

```jsx
const filteredData = useMemo(() => {
  return data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [data, searchTerm]);
```

### 2. useCallback for Event Handlers

```jsx
const handleFilterChange = useCallback((field, value) => {
  setFilters(prev => ({ ...prev, [field]: value }));
}, []);
```

### 3. React.memo for Component Memoization

```jsx
const ExpensiveComponent = React.memo(({ data }) => {
  // Expensive rendering logic
  return <div>{/* Rendered output */}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.data.id === nextProps.data.id;
});
```

### 4. Code Splitting with React.lazy

```jsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <HeavyComponent />
  </Suspense>
);
```

### 5. Debouncing Input

```jsx
import { useState, useEffect } from 'react';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Usage
const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search
      searchService.search(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
};
```

---

## Internationalization (i18n)

### Translation Usage

```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('common.dashboard')}</h1>
      <p>{t('hr.employees', { count: 5 })}</p>
      <button onClick={() => i18n.changeLanguage('ar')}>
        {t('common.changeLanguage')}
      </button>
    </div>
  );
};
```

### Translation Keys Structure

```javascript
// en.json
{
  "common": {
    "dashboard": "Dashboard",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "hr": {
    "employees": "Employees",
    "departments": "Departments",
    "positions": "Job Positions"
  },
  "equipment": {
    "list": "Equipment List",
    "details": "Equipment Details"
  }
}

// ar.json
{
  "common": {
    "dashboard": "لوحة التحكم",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف"
  }
}
```

---

## WebSocket Integration

### WebSocket Service

**Location**: `src/services/webSocketService.js`

**Connection Setup**:
```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const connectWebSocket = (userId, onMessageReceived) => {
  const socket = new SockJS('http://localhost:8080/ws');
  const stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log('WebSocket connected');

      // Subscribe to user-specific notifications
      stompClient.subscribe(`/user/${userId}/queue/notifications`, (message) => {
        const notification = JSON.parse(message.body);
        onMessageReceived(notification);
      });

      // Subscribe to broadcast notifications
      stompClient.subscribe('/topic/notifications', (message) => {
        const notification = JSON.parse(message.body);
        onMessageReceived(notification);
      });
    },

    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },

    onStompError: (frame) => {
      console.error('STOMP error:', frame);
    }
  });

  stompClient.activate();

  return stompClient;
};
```

### NotificationContext WebSocket Integration

The `NotificationContext` automatically handles WebSocket connections and displays toast notifications for real-time updates.

---

## Feature Changelog

### Version 1.0 (Current) - 2026-01-16

**Initial Frontend Release**

**Core Features**:
1. **Authentication System**
   - JWT-based authentication
   - Session persistence
   - Role-based access control
   - Token expiration handling

2. **Dashboard System**
   - 14 role-specific dashboards
   - Real-time metrics
   - Chart visualizations

3. **Equipment Module**
   - Equipment list (card/table view)
   - Equipment details with tabs
   - Consumable tracking
   - Sarky log matrix
   - Maintenance integration
   - Transaction system

4. **HR Module**
   - Employee management (10-tab details)
   - Vacancy and recruitment
   - Job positions with hierarchy
   - Promotions with bulk actions
   - Departments
   - Attendance tracking
   - Leave management
   - Vacation balances

5. **Warehouse Module**
   - Warehouse list and details
   - Item management
   - Item categories and types
   - Transaction system

6. **Procurement Module**
   - Request orders
   - Offers with timeline
   - Purchase orders
   - Issue resolution

7. **Finance Module**
   - General ledger
   - Accounts payable
   - Fixed assets
   - Bank reconciliation
   - Balance management

8. **Payroll Module**
   - Payroll lifecycle management
   - Employee payroll details
   - Loan tracking
   - Deduction management
   - Payslip generation
   - Reports

9. **Maintenance Module**
   - Maintenance records
   - Direct purchase tickets
   - Contact management
   - Step type configuration

10. **System Features**
    - Real-time notifications (WebSocket)
    - Multi-language support (English/Arabic with RTL)
    - Light/dark theme
    - Advanced DataTable component
    - Excel export
    - Responsive design
    - Mobile support

**Technical Achievements**:
- React 19.1.0 with hooks
- Vite build system
- Context API state management
- Comprehensive service layer
- Centralized API configuration
- Error handling with user-friendly messages
- Performance optimizations (useMemo, useCallback)

---

## Development Guidelines

### Best Practices

1. **Always use service layer** - Never make direct API calls from components
2. **Always use SnackbarContext** - All user feedback through snackbar
3. **Always handle errors** - Try-catch with meaningful error messages
4. **Always show loading states** - Use LoadingSpinner or LoadingPage
5. **Always validate input** - Client-side validation before API calls
6. **Always use contexts** - Use provided contexts (Auth, Snackbar, Theme, etc.)
7. **Always follow naming conventions** - PascalCase for components, camelCase for services
8. **Always write responsive CSS** - Mobile-first approach
9. **Always use i18n** - Wrap text in t() function
10. **Always check user roles** - Use hasRole/hasAnyRole before rendering

### Code Review Checklist

- [ ] Component uses service layer (no direct API calls)
- [ ] Error handling with try-catch and SnackbarContext
- [ ] Loading states implemented
- [ ] Responsive design (mobile-friendly)
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Internationalized (all text wrapped in t())
- [ ] Theme-aware (uses CSS variables)
- [ ] PropTypes defined
- [ ] No console.logs in production code
- [ ] Comments for complex logic
- [ ] Clean imports (no unused imports)

---

**End of Frontend Knowledgebase v1.0**

*This document should be updated with every significant feature addition, architectural change, or pattern enhancement.*
