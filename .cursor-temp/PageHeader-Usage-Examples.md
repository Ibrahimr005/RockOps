# PageHeader Component Usage Examples

## Overview
The enhanced PageHeader component now supports add buttons and other action buttons, making it easy to create consistent page headers across the RockOps application.

## Basic Usage

### Simple Header (No Action Button)
```jsx
import PageHeader from '../../../components/common/PageHeader/PageHeader';

<PageHeader
    title="Equipment Dashboard"
    subtitle="Monitor and manage your equipment fleet"
/>
```

### Header with Add Button
```jsx
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import { FiPlus } from 'react-icons/fi';

<PageHeader
    title="Departments"
    subtitle="Manage departments to structure your workforce effectively"
    actionButton={{
        text: "Add Department",
        onClick: handleOpenCreateModal,
        disabled: loading
    }}
/>
```

### Header with Custom Icon
```jsx
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import { FaUserPlus } from 'react-icons/fa';

<PageHeader
    title="Job Vacancies"
    subtitle="Post open positions, manage applications, and track your recruitment process"
    actionButton={{
        text: "Post New Vacancy",
        icon: <FaUserPlus />,
        onClick: () => setShowAddModal(true),
        disabled: loading
    }}
/>
```

### Header with Custom Button Styling
```jsx
import PageHeader from '../../../components/common/PageHeader/PageHeader';

<PageHeader
    title="Equipment Management"
    subtitle="Add and manage equipment across your sites"
    actionButton={{
        text: "Add Equipment",
        onClick: handleAddEquipment,
        disabled: loading,
        className: "btn-success" // Custom CSS class
    }}
/>
```

### Header with Multiple Actions (Using children)
```jsx
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import { FiPlus, FiDownload } from 'react-icons/fi';

<PageHeader
    title="Financial Reports"
    subtitle="Generate and manage financial reports"
>
    <button className="btn btn-secondary">
        <FiDownload /> Export
    </button>
    <button className="btn btn-primary">
        <FiPlus /> Add Report
    </button>
</PageHeader>
```

## Migration from departments-header

### Before (Old Pattern)
```jsx
<div className="departments-header">
    <h1>
        Departments
        <p className="employees-header__subtitle">
            Manage departments to structure your workforce effectively
        </p>
    </h1>
    <button
        className="btn btn-primary"
        onClick={handleOpenCreateModal}
        disabled={loading}
    >
        <FiPlus /> Add Department
    </button>
</div>
```

### After (New PageHeader)
```jsx
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import { FiPlus } from 'react-icons/fi';

<PageHeader
    title="Departments"
    subtitle="Manage departments to structure your workforce effectively"
    actionButton={{
        text: "Add Department",
        icon: <FiPlus />,
        onClick: handleOpenCreateModal,
        disabled: loading
    }}
/>
```

## Props Reference

### PageHeader Props
- `title` (string, required): Main title of the page
- `subtitle` (string, optional): Subtitle/description of the page
- `children` (React.ReactNode, optional): Additional content (buttons, etc.)
- `className` (string, optional): Additional CSS classes
- `actionButton` (object, optional): Configuration for action button

### actionButton Object Props
- `text` (string, optional): Button text (default: "Add")
- `icon` (React.ReactNode, optional): Button icon (default: FiPlus)
- `onClick` (function, required): Click handler for the button
- `disabled` (boolean, optional): Whether button is disabled
- `className` (string, optional): Additional CSS classes for the button

## Benefits

1. **Consistency**: All page headers now have the same styling and behavior
2. **Maintainability**: Changes to header styling only need to be made in one place
3. **Flexibility**: Supports both simple headers and headers with action buttons
4. **Responsive**: Automatically handles mobile layouts
5. **Accessibility**: Proper semantic HTML structure

## Styling

The component uses the existing `.global-page-header` and `.departments-header` classes, ensuring backward compatibility with existing styles while providing new functionality.

The action buttons use the standard `btn btn-primary` classes, making them consistent with the rest of the application's button styling.









