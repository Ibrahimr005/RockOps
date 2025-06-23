import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// English translations
const enTranslations = {
    common: {
        dashboard: 'Dashboard',
        admin: 'Admin',
        logout: 'Logout',
        welcome: 'Welcome',
        loading: 'Loading...',
        noData: 'No data available',
        error: 'An error occurred',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        confirm: 'Confirm',
        notification: 'Notification',
        details: 'Details',
        uploadPhoto: 'Upload Photo',
        editPhoto: 'Edit Photo',
        type: 'Type',
        model: 'Model',
        status: 'Status',
        action: 'Action',
        name: 'Name',
        mobileNumber: 'Mobile Number',
        category: 'Category',
    },
    auth: {
        login: 'Login',
        username: 'Username',
        password: 'Password',
        forgotPassword: 'Forgot Password?',
        loginButton: 'Log In',
        loginFailed: 'Login failed. Please check your credentials.',
        sessionExpired: 'Session expired, please login again',
        enterUsername: '@username',
        enterPassword: 'Enter your password',
    },
    admin: {
        userManagement: 'User Management',
        usersList: 'Users List',
        userDetails: 'User Details',
        addUser: 'Add User',
        editUser: 'Edit User',
        deleteUser: 'Delete User',
        firstName: 'First Name',
        lastName: 'Last Name',
        role: 'Role',
        actions: 'Actions',
        confirmDelete: 'Are you sure you want to delete this user?',
        userDeleted: 'User deleted successfully',
        userSaved: 'User saved successfully',
        userStats: 'User Statistics',
        userRoleDistribution: 'User Role Distribution',
        totalUsers: 'Total Users',
    },
    roles: {
        ADMIN: 'Administrator',
        USER: 'User',
        SITE_ADMIN: 'Site Admin',
        PROCUREMENT: 'Procurement',
        WAREHOUSE_MANAGER: 'Warehouse Manager',
        SECRETARY: 'Secretary',
        EQUIPMENT_MANAGER: 'Equipment Manager',
        HR_MANAGER: 'HR Manager',
        HR_EMPLOYEE: 'HR Employee',
        FINANCE_EMPLOYEE: 'Finance Employee',
        FINANCE_MANAGER: 'Finance Manager',
        MAINTENANCE_EMPLOYEE: 'Maintenance Employee',
        MAINTENANCE_MANAGER: 'Maintenance Manager'
    },
    hr: {
        dashboard: {
            title: 'HR Dashboard',
            salaryStatistics: 'Salary Statistics',
            employeeDistribution: 'Employee Distribution',
            averageSalary: 'Average Salary',
            totalSalary: 'Total Salary',
            employeeCount: 'Employee Count',
            totalBonuses: 'Total Bonuses',
            totalCommissions: 'Total Commissions',
            departmentSalaries: 'Department Salaries',
            monthlySalaries: 'Monthly Salary Totals',
            employeesByPosition: 'Employees by Position',
            employees: 'Employees',
            department: 'Department',
            position: 'Position',
            employmentType: 'Employment Type',
            departments: 'Departments',
            positions: 'Positions',
            employmentTypes: 'Employment Types',
            allSites: 'All Sites',

        },
        employees: 'Employees',
        vacancies: 'Vacancies',
        candidates: 'Candidates',
        positions: 'Positions',
        tasks: 'Tasks',
        contractType: 'Contract Type',
        employeeName: 'Employee Name'
    },
    // Inside enTranslations
    site: {
        site: 'Site',
        siteManagement: 'Site Management',
        siteList: 'Site List',
        siteDetails: 'Site Details',
        addSite: 'Add Site',
        editSite: 'Edit Site',
        deleteSite: 'Delete Site',
        siteName: 'Site Name',
        siteLocation: 'Site Location',
        siteManager: 'Site Manager',
        confirmDelete: 'Are you sure you want to delete this site?',
        siteSaved: 'Site saved successfully',
        siteDeleted: 'Site deleted successfully',
        efficiency: 'Efficiency',
        companyAddress: 'Company Address',
        physicalAddress: 'Physical Address',
        creationDate: 'Creation Date',
        partners: 'Partners',
        selectPartners: 'Select Partners',
        noPartnersAvailable: 'No Partners Available',
        siteEquipmentReport: 'Site Equipment Report',
        assignEquipment: 'Assign Equipment',
        noEquipmentAvailable: 'No available equipment to assign',
        assign: 'Assign',
        loadingEquipment: 'Loading Equipment...',
        loadingEmployees: 'Loading Employees...',
        siteEmployeesReport: 'Site Employees Report',
        assignEmployee: 'Assign Employee',
        noEmployeesAvailable: 'No available employees to assign',
        unassign: 'Unassign',
        loadingWarehouses: 'Loading Warehouses...',
        siteWarehousesReport: 'Site Warehouses Report',
        assignWarehouse: 'Assign Warehouse',
        noWarehousesAvailable: 'No available warehouses to assign',
        noRecordsFound: 'No Records Found',
        loadingFixedAssets: 'Loading Fixed Assets...',
        siteFixedAssetsReport: 'Site Fixed Assets Report',
        loadingMerchants: 'Loading Merchants...',
        siteMerchantsReport: 'Site Merchants Report',
        assignFixedAsset: 'Assign Fixed Asset',
        noFixedAssetsAvailable: 'No Available Fixed Assets',
    },
    equipment: {
        equipment: 'Equipment',
        equipmentType: 'Equipment Type',
        modelNumber: 'Model Number',
        driverName: 'Driver Name',
        manufactureDate: 'Manufacture Date',
        purchaseDate: 'Purchase Date',
    },
    warehouse: {
        warehouses: 'Warehouses',
        capacity: 'Capacity',
    },
    fixedAssets: {
        fixedAssets: 'Fixed Assets',
        areaOrQuantity: 'Area/Quantity',
    },
    merchants: {
        merchants: 'Merchants',
        merchantName: 'Merchant Name',
        merchantType: 'Merchant Type',
        totalSales: 'Total Sales',
    }

// Inside arTranslations


};


// Arabic translations
const arTranslations = {
    common: {
        dashboard: 'لوحة القيادة',
        admin: 'المشرف',
        logout: 'تسجيل خروج',
        welcome: 'مرحبا',
        loading: 'جاري التحميل...',
        noData: 'لا توجد بيانات متاحة',
        error: 'حدث خطأ',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        confirm: 'تأكيد',
        notification: 'إشعار',
        details: 'تفاصيل',
        uploadPhoto: 'تحميل الصورة',
        editPhoto: 'تعديل الصورة',
        type: 'نوع',
        model: 'موديل',
        status: 'حالة',
        action: 'إجراء',
        name: 'الاسم',
        mobileNumber: 'رقم الهاتف',
        category: 'فئة',
    },
    auth: {
        login: 'تسجيل الدخول',
        username: 'اسم المستخدم',
        password: 'كلمة المرور',
        forgotPassword: 'نسيت كلمة المرور؟',
        loginButton: 'تسجيل الدخول',
        loginFailed: 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.',
        sessionExpired: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
        enterUsername: 'أدخل اسم المستخدم الخاص بك',
        enterPassword: 'أدخل كلمة المرور الخاصة بك',
    },
    admin: {
        userManagement: 'إدارة المستخدمين',
        usersList: 'قائمة المستخدمين',
        userDetails: 'تفاصيل المستخدم',
        addUser: 'إضافة مستخدم',
        editUser: 'تعديل المستخدم',
        deleteUser: 'حذف المستخدم',
        firstName: 'الاسم الأول',
        lastName: 'اسم العائلة',
        role: 'الدور',
        actions: 'الإجراءات',
        confirmDelete: 'هل أنت متأكد أنك تريد حذف هذا المستخدم؟',
        userDeleted: 'تم حذف المستخدم بنجاح',
        userSaved: 'تم حفظ المستخدم بنجاح',
        userStats: 'إحصائيات المستخدم',
        userRoleDistribution: 'توزيع أدوار المستخدمين',
        totalUsers: 'إجمالي المستخدمين',
    },
    roles: {
        ADMIN: 'مدير',
        USER: 'مستخدم',
        SITE_ADMIN: 'مدير الموقع',
        PROCUREMENT: 'المشتريات',
        WAREHOUSE_MANAGER: 'مدير المستودع',
        SECRETARY: 'سكرتير',
        EQUIPMENT_MANAGER: 'مدير المعدات',
        HR_MANAGER: 'مدير الموارد البشرية',
        HR_EMPLOYEE: 'موظف الموارد البشرية',
        FINANCE_EMPLOYEE: 'موظف مالي',
        FINANCE_MANAGER: 'مدير المالية',
        MAINTENANCE_EMPLOYEE: 'موظف الصيانة',
        MAINTENANCE_MANAGER: 'مدير الصيانة'
    },
    site: {
        site: 'الموقع',
        siteManagement: 'إدارة المواقع',
        siteList: 'قائمة المواقع',
        siteDetails: 'تفاصيل الموقع',
        addSite: 'إضافة موقع',
        editSite: 'تعديل الموقع',
        deleteSite: 'حذف الموقع',
        siteName: 'اسم الموقع',
        siteLocation: 'موقع الموقع',
        siteManager: 'مدير الموقع',
        confirmDelete: 'هل أنت متأكد أنك تريد حذف هذا الموقع؟',
        siteSaved: 'تم حفظ الموقع بنجاح',
        siteDeleted: 'تم حذف الموقع بنجاح',
        efficiency: 'كفاءة',
        companyAddress: 'عنوان الشركة',
        physicalAddress: 'العنوان الفعلي',
        creationDate: 'تاريخ الإنشاء',
        partners: 'الشركاء',
        selectPartners: 'اختار الشركاء',
        noPartnersAvailable: 'لا يوجد شركاء متاحون',
        siteEquipmentReport: 'تقرير معدات الموقع',
        assignEquipment: 'تعيين معدة',
        noEquipmentAvailable: 'لا توجد معدات متاحة للتعيين',
        assign: 'تعيين',
        loadingEquipment: 'جاري تحميل المعدات...',
        loadingEmployees: 'جاري تحميل الموظفين...',
        siteEmployeesReport: 'تقرير موظفي الموقع',
        assignEmployee: 'تعيين موظف',
        noEmployeesAvailable: 'لا يوجد موظفين متاحين للتعيين',
        unassign: 'إلغاء التعيين',
        loadingWarehouses: 'جاري تحميل المستودعات...',
        siteWarehousesReport: 'تقرير مستودعات الموقع',
        assignWarehouse: 'تعيين مستودع',
        noWarehousesAvailable: 'لا توجد مستودعات متاحة للتعيين',
        noRecordsFound: 'لم يتم العثور على سجلات',
        loadingFixedAssets: 'جاري تحميل الأصول الثابتة...',
        siteFixedAssetsReport: 'تقرير الأصول الثابتة للموقع',
        loadingMerchants: 'جاري تحميل التجار...',
        siteMerchantsReport: 'تقرير تجار الموقع',
        assignFixedAsset: 'تعيين الأصول الثابتة',
        noFixedAssetsAvailable: 'لا يوجد أصول ثابتة متاحة'

    },
    hr: {
        dashboard: {
            title: 'لوحة القيادة للموارد البشرية',
            salaryStatistics: 'إحصائيات الرواتب',
            employeeDistribution: 'توزيع الموظفين',
            averageSalary: 'متوسط الراتب',
            totalSalary: 'إجمالي الرواتب',
            employeeCount: 'عدد الموظفين',
            totalBonuses: 'إجمالي المكافآت',
            totalCommissions: 'إجمالي العمولات',
            departmentSalaries: 'رواتب الأقسام',
            monthlySalaries: 'إجمالي الرواتب الشهرية',
            employeesByPosition: 'الموظفين حسب المنصب',
            employees: 'الموظفين',
            department: 'القسم',
            position: 'المنصب',
            employmentType: 'نوع التوظيف',
            departments: 'الأقسام',
            positions: 'المناصب',
            employmentTypes: 'أنواع التوظيف',
            allSites: 'جميع المواقع',

        },
        employees: 'الموظفين',
        vacancies: 'الوظائف الشاغرة',
        candidates: 'المرشحين',
        positions: 'المناصب',
        tasks: 'المهام',
        contractType: 'نوع العقد' ,
        employeeName: 'اسم الموظف',
    },
    equipment: {
        equipment: 'معدات',
        equipmentType: 'نوع المعدات',
        modelNumber: 'رقم الموديل',
        driverName: 'اسم السائق',
        manufactureDate: 'تاريخ التصنيع',
        purchaseDate: 'تاريخ الشراء',
    },
    warehouse: {
        warehouses: 'مستودعات',
        capacity: 'سعة'
    },
    fixedAssets: {
        fixedAssets: 'الأصول الثابتة',
        areaOrQuantity: 'المساحة/الكمية'
    },
    merchants: {
        merchants: 'التجار',
        merchantName: 'اسم التاجر',
        merchantType: 'نوع التاجر',
        totalSales: 'إجمالي المبيعات'
    }
};

// Initialize i18next
i18n
    .use(Backend) // Load translations from server (optional)
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Initialize react-i18next
    .init({
        resources: {
            en: {
                translation: enTranslations
            },
            ar: {
                translation: arTranslations
            }
        },
        fallbackLng: 'en', // Use English as fallback
        debug: process.env.NODE_ENV === 'development', // Enable debug in development
        interpolation: {
            escapeValue: false // React already escapes values
        },
        react: {
            useSuspense: true // Use React Suspense for loading
        },
        detection: {
            order: ['localStorage', 'navigator'], // First check localStorage, then browser language
            lookupLocalStorage: 'i18nextLng', // Key to use in localStorage
            caches: ['localStorage'], // Cache user language preference in localStorage
        }
    });

// Helper function to set document direction based on language
export const setDocumentDirection = (language) => {
    if (language === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
        // Add RTL class to body for additional styling if needed
        document.body.classList.add('rtl');
    } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';
        document.body.classList.remove('rtl');
    }
};

// Change language and set document direction
export const changeLanguage = (language) => {
    i18n.changeLanguage(language);
    setDocumentDirection(language);
    return language;
};


// Set initial document direction based on current language
setDocumentDirection(i18n.language);

export default i18n;