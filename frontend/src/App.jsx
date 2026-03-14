import React, { Suspense, useState } from 'react'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';
import './App.css'
import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { SnackbarProvider } from "./contexts/SnackbarContext.jsx";
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import Login from "./pages/login/Login.jsx";
import Sidebar, { SidebarProvider } from "./components/common/Sidebar/Sidebar.jsx";
import LoadingPage from "./components/common/LoadingPage/LoadingPage.jsx";
import LoadingFallback from "./components/common/LoadingFallback/LoadingFallback.jsx";

// Layout components — always needed, keep static
import HRLayout from "./pages/HR/HRLayout.jsx";
import PayrollLayout from "./pages/payroll/PayrollLayout.jsx";
import MaintenanceLayout from "./pages/maintenance/MaintenanceLayout.jsx";
import SitesLayout from "./pages/site/SitesLayout.jsx";

import {
    ADMIN,
    USER,
    SITE_ADMIN,
    PROCUREMENT,
    WAREHOUSE_MANAGER,
    WAREHOUSE_EMPLOYEE,
    SECRETARY,
    EQUIPMENT_MANAGER,
    HR_MANAGER,
    HR_EMPLOYEE,
    FINANCE_MANAGER,
    FINANCE_EMPLOYEE,
    MAINTENANCE_MANAGER,
    MAINTENANCE_EMPLOYEE,
    ROLES
} from './utils/roles';

// ===================== Lazy-loaded page components =====================
// Dashboard pages
const AdminPage = React.lazy(() => import("./pages/admin/AdminPage.jsx"));
const DashboardPage = React.lazy(() => import("./pages/dashboards/DashboardPage.jsx"));
const AdminDashboard = React.lazy(() => import("./pages/dashboards/AdminDashboard.jsx"));
const SiteAdminDashboard = React.lazy(() => import("./pages/dashboards/SiteAdminDashboard.jsx"));
const EquipmentManagerDashboard = React.lazy(() => import("./pages/dashboards/EquipmentManagerDashboard.jsx"));
const WarehouseManagerDashboard = React.lazy(() => import("./pages/dashboards/WarehouseManagerDashboard.jsx"));
const HRManagerDashboard = React.lazy(() => import("./pages/dashboards/HRManagerDashboard.jsx"));
const FinanceManagerDashboard = React.lazy(() => import("./pages/dashboards/FinanceManagerDashboard.jsx"));
const ProcurementDashboard = React.lazy(() => import("./pages/dashboards/ProcurementDashboard.jsx"));
const MaintenanceManagerDashboard = React.lazy(() => import("./pages/dashboards/MaintenanceManagerDashboard.jsx"));

// HR pages
const VacancyList = React.lazy(() => import("./pages/HR/Vacancy/VacancyList.jsx"));
const PositionsList = React.lazy(() => import("./pages/HR/JobPosition/PositionsList.jsx"));
const EmployeesList = React.lazy(() => import("./pages/HR/Employee/EmployeesList.jsx"));
const EmployeeDetails = React.lazy(() => import("./pages/HR/Employee/details/EmployeeDetails.jsx"));
const VacancyDetails = React.lazy(() => import("./pages/HR/Vacancy/details/VacancyDetails.jsx"));
const DepartmentsList = React.lazy(() => import("./pages/HR/Departments/DepartmentsList.jsx"));
const DepartmentDetails = React.lazy(() => import("./pages/HR/Departments/DepartmentDetails.jsx"));
const AttendancePage = React.lazy(() => import("./pages/HR/Attendance/AttendancePage.jsx"));
const EmployeeOnboarding = React.lazy(() => import("./pages/HR/Vacancy/EmployeeOnboarding.jsx"));
const PromotionList = React.lazy(() => import("./pages/HR/Promotion/PromotionList.jsx"));
const SalaryIncreaseList = React.lazy(() => import("./pages/HR/SalaryIncrease/SalaryIncreaseList.jsx"));
const DemotionList = React.lazy(() => import("./pages/HR/Demotion/DemotionList.jsx"));
const JobPositionDetails = React.lazy(() => import("./pages/HR/JobPosition/details/JobPositionDetails.jsx"));
const LeaveRequestDetailPage = React.lazy(() => import('./pages/HR/LeaveRequests/LeaveRequestDetailPage'));
const LeaveRequestList = React.lazy(() => import("./pages/HR/LeaveRequests/LeaveRequestList.jsx"));
const VacationBalancePage = React.lazy(() => import('./pages/HR/VacationBalance/VacationBalancePage'));
const PotentialCandidates = React.lazy(() => import("./pages/HR/PotentialCandidates/PotentialCandidates.jsx"));

// Site pages
const AllSites = React.lazy(() => import("./pages/site/AllSites/AllSites.jsx"));
const SiteDetails = React.lazy(() => import("./pages/site/SiteDetails/SiteDetails.jsx"));
const Partners = React.lazy(() => import("./pages/partners/Partners.jsx"));

// Equipment pages
const EquipmentMain = React.lazy(() => import("./pages/equipment/EquipmentMain/EquipmentMain.jsx"));
const EquipmentBrandManagement = React.lazy(() => import("./pages/equipment/EquipmentManagement/EquipmentBrandManagement.jsx"));
const EquipmentTypeManagement = React.lazy(() => import("./pages/equipment/EquipmentManagement/EquipmentTypeManagement.jsx"));
const WorkTypeManagement = React.lazy(() => import("./pages/equipment/EquipmentManagement/WorkTypeManagement.jsx"));
const MaintenanceTypeManagement = React.lazy(() => import("./pages/equipment/EquipmentManagement/MaintenanceTypeManagement.jsx"));
const ViewEquipmentData = React.lazy(() => import("./pages/equipment/EquipmentInfo/ViewEquipmentData.jsx"));
const EquipmentDetails = React.lazy(() => import("./pages/equipment/EquipmentDetails/EquipmentDetails.jsx"));

// Warehouse pages
const WarehousesList = React.lazy(() => import("./pages/warehouse/WarehousesList/Warehouse List/WarehousesList.jsx"));
const WarehouseDetails = React.lazy(() => import("./pages/warehouse/WarehousesDetails/WarehouseDetails.jsx"));
const WarehouseInformation = React.lazy(() => import("./pages/warehouse/WarehousesInformation/WarehouseInformation.jsx"));
const WarehouseViewItemCategoriesTable = React.lazy(() => import("./pages/warehouse/WarehouseCategories/WarehouseViewItemsCategoriesTable.jsx"));
const WarehouseViewItemTypesTable = React.lazy(() => import("./pages/warehouse/WarehouseItemTypes/WarehouseViewItemTypesTable.jsx"));
const ItemDetailsPage = React.lazy(() => import("./pages/warehouse/WarehouseItems/ItemDetailsPage/ItemDetailsPage.jsx"));
const ItemTypeDetailsPage = React.lazy(() => import("./pages/warehouse/WarehouseItemTypes/ItemTypeDetailsPage/ItemTypeDetailsPage.jsx"));
const MeasuringUnits = React.lazy(() => import("./pages/warehouse/WarehouseMeasuringUnits/MeasuringUnits.jsx"));
const TransactionDetailsPage = React.lazy(() => import("./components/common/TransactionDetailsPage/TransactionDetailsPage.jsx"));

// Merchant & Procurement pages
const ProcurementMerchants = React.lazy(() => import("./pages/merchant/MerchantList/ProcurementMerchants.jsx"));
const MerchantDetails = React.lazy(() => import("./pages/merchant/MerchantDetails/MerchantDetails.jsx"));
const ProcurementOffers = React.lazy(() => import("./pages/procurement/ProcurementOffers/ProcurementOffers.jsx"));
const ProcurementRequestOrders = React.lazy(() => import("./pages/procurement/ProcurementRequestOrders/ProcurementRequestOrders.jsx"));
const PurchaseOrders = React.lazy(() => import("./pages/procurement/ProcurementPurchaseOrders/PurchaseOrders.jsx"));
const PurchaseOrderDetails = React.lazy(() => import("./pages/procurement/ProcurementPurchaseOrders/PurchaseOrderDetails/PurchaseOrderDetails.jsx"));
const ResolveIssuesPage = React.lazy(() => import("./pages/procurement/ProcurementPurchaseOrders/ResolveIssuesPage/ResolveIssuesPage.jsx"));
const PurchaseOrderDetailsPage = React.lazy(() => import("./components/procurement/PurchaseOrderDetailsPage/PurchaseOrderDetailsPage.jsx"));
const RequestOrderDetailsPage = React.lazy(() => import("./components/procurement/RequestOrderDetailsPage/RequestOrderDetailsPage.jsx"));
const PriceApprovals = React.lazy(() => import("./pages/procurement/ProcurementPriceApprovals/PriceApprovals.jsx"));
const ProcurementLogistics = React.lazy(() => import("./pages/procurement/ProcurementLogistics/ProcurementLogistics.jsx"));
const LogisticsDetailsPage = React.lazy(() => import("./pages/procurement/ProcurementLogistics/LogisticsDetailsPage/LogisticsDetailsPage.jsx"));
const PurchaseOrderReturns = React.lazy(() => import("./pages/procurement/PurchaseOrderReturns/PurchaseOrderReturns.jsx"));
const PurchaseOrderReturnDetailsPage = React.lazy(() => import("./pages/procurement/PurchaseOrderReturns/PurchaseOrderReturnDetailsPage/PurchaseOrderReturnDetailsPage.jsx"));

// Finance pages
const GeneralLedger = React.lazy(() => import("./pages/finance/GeneralLedger/GeneralLedger.jsx"));
const Payables = React.lazy(() => import("./pages/finance/Payables/Payables.jsx"));
const FixedAssets = React.lazy(() => import("./pages/finance/FixedAssets/FixedAssets.jsx"));
const BankReconciliation = React.lazy(() => import("./pages/finance/BankReconciliation/BankReconciliation.jsx"));
const InventoryValuation = React.lazy(() => import("./pages/finance/InventoryValuation/InventoryValuation.jsx"));
const Balances = React.lazy(() => import("./pages/finance/Balances/Balances.jsx"));
const AccountsPayable = React.lazy(() => import("./pages/finance/AccountsPayable/AccountsPayable.jsx"));
const PaymentRequestDetailsPage = React.lazy(() => import("./pages/finance/AccountsPayable/PaymentRequests/PaymentRequestDetailsPage.jsx"));
const ProcessPaymentPage = React.lazy(() => import("./pages/finance/AccountsPayable/Payments/ProcessPaymentPage.jsx"));
const CompanyLoansPage = React.lazy(() => import("./pages/finance/CompanyLoans/CompanyLoansPage.jsx"));
const CreateLoanPage = React.lazy(() => import("./pages/finance/CompanyLoans/CreateLoanPage.jsx"));
const LoanDetailsPage = React.lazy(() => import("./pages/finance/CompanyLoans/LoanDetailsPage.jsx"));
const FinancialInstitutionsPage = React.lazy(() => import("./pages/finance/CompanyLoans/FinancialInstitutionsPage.jsx"));
const CreateInstitutionPage = React.lazy(() => import("./pages/finance/CompanyLoans/CreateInstitutionPage.jsx"));

// Payroll pages
const PayrollCycles = React.lazy(() => import("./pages/payroll/PayrollCycles/PayrollCycles.jsx"));
const PayrollDetails = React.lazy(() => import("./pages/payroll/PayrollDetails/PayrollDetails.jsx"));
const EmployeePayrollList = React.lazy(() => import("./pages/payroll/EmployeePayrolls/EmployeePayrollList.jsx"));
const EmployeePayrollDetails = React.lazy(() => import('./pages/payroll/EmployeePayrolls/EmployeePayrollDetails/EmployeePayrollDetails.jsx'));
const LoanManagement = React.lazy(() => import("./pages/payroll/Loans/LoanManagement/LoanManagement.jsx"));
const LoanDetails = React.lazy(() => import("./pages/payroll/Loans/LoanDetails/LoanDetails.jsx"));
const PayrollReports = React.lazy(() => import("./pages/payroll/PayrollReports/PayrollReports.jsx"));
const BonusManagement = React.lazy(() => import("./pages/payroll/Bonuses/BonusManagement/BonusManagement.jsx"));
const DeductionManagement = React.lazy(() => import("./pages/payroll/deduction/DeductionManagement.jsx"));
const PaymentTypes = React.lazy(() => import("./pages/payroll/PaymentTypes/PaymentTypes.jsx"));
const PayslipManagement = React.lazy(() => import("./pages/payroll/payslip/PayslipManagement.jsx"));
const PayslipEdit = React.lazy(() => import("./pages/payroll/payslip/PayslipEdit.jsx"));

// Maintenance pages
const MaintenanceRecords = React.lazy(() => import("./pages/maintenance/MaintenanceRecords/MaintenanceRecords.jsx"));
const StepTypeManagement = React.lazy(() => import("./pages/maintenance/StepTypeManagement/StepTypeManagement.jsx"));
const ContactTypeManagement = React.lazy(() => import("./pages/maintenance/ContactTypeManagement/ContactTypeManagement.jsx"));
const Contacts = React.lazy(() => import("./pages/maintenance/Contacts/Contacts.jsx"));
const MaintenanceRecordDetail = React.lazy(() => import("./pages/maintenance/MaintenanceRecordDetail/MaintenanceRecordDetail.jsx"));
const DirectPurchaseDetailView = React.lazy(() => import("./pages/maintenance/DirectPurchaseDetail/DirectPurchaseDetailView.jsx"));

// Other pages
const Notifications = React.lazy(() => import('./pages/notification/Notifications.jsx'));
const RelatedDocuments = React.lazy(() => import("./pages/RelatedDocuments/RelatedDocuments.jsx"));
const MyTasksPage = React.lazy(() => import("./pages/secretary/MyTasksPage/MyTasksPage.jsx"));
const SecretaryTasksPage = React.lazy(() => import("./pages/secretary/SecretaryTasksPage/SecretaryTasksPage.jsx"));


const AuthRedirect = () => {
    const { currentUser, isAuthenticated, loading } = useAuth();
    if (loading) return <LoadingPage />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Navigate to={currentUser?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
};

const RoleRoute = ({ allowedRoles, children, redirectPath = '/dashboard' }) => {
    const { currentUser, isAuthenticated, loading } = useAuth();
    if (loading) return <LoadingPage />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(currentUser?.role)) return <Navigate to={redirectPath} replace />;
    return children;
};

const allRoles = Object.values(ROLES);

// ===================== Layout Components =====================
const MainLayout = () => (
    <SidebarProvider>
        <div className="app-container">
            <Sidebar />
            <div className="main-content-wrapper">
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    </SidebarProvider>
);

function App() {
    const [count, setCount] = useState(0)

    return (
        <QueryClientProvider client={queryClient}>
        <Router>
            <SnackbarProvider>
                <LanguageProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <NotificationProvider>
                                <Suspense fallback={<LoadingFallback />}>
                                <Routes>
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/" element={<AuthRedirect />} />

                                    <Route element={<MainLayout />}>
                                        <Route path="/admin" element={<RoleRoute allowedRoles={[ADMIN]}><AdminPage /></RoleRoute>} />

                                        <Route path="/dashboard" element={<RoleRoute allowedRoles={allRoles}><DashboardPage /></RoleRoute>} />

                                        {/* Individual Dashboard Routes for Admin */}
                                        <Route path="/dashboards/admin" element={<RoleRoute allowedRoles={[ADMIN]}><AdminDashboard /></RoleRoute>} />
                                        <Route path="/dashboards/site-admin" element={<RoleRoute allowedRoles={[ADMIN]}><SiteAdminDashboard /></RoleRoute>} />
                                        <Route path="/dashboards/equipment-manager" element={<RoleRoute allowedRoles={[ADMIN]}><EquipmentManagerDashboard /></RoleRoute>} />
                                        <Route path="/dashboards/warehouse-manager" element={<RoleRoute allowedRoles={[ADMIN]}><WarehouseManagerDashboard /></RoleRoute>} />
                                        <Route path="/dashboards/hr-manager" element={<RoleRoute allowedRoles={[ADMIN]}><HRManagerDashboard /></RoleRoute>} />
                                        <Route path="/dashboards/finance-manager" element={<RoleRoute allowedRoles={[ADMIN]}><FinanceManagerDashboard /></RoleRoute>} />
                                        <Route path="/dashboards/procurement" element={<RoleRoute allowedRoles={[ADMIN]}><ProcurementDashboard /></RoleRoute>} />

                                        <Route path="/partners" element={<RoleRoute allowedRoles={[ADMIN, SITE_ADMIN]}><Partners /></RoleRoute>} />

                                        {/* ===================== Notifications Route ===================== */}
                                        <Route path="/notifications" element={<RoleRoute allowedRoles={allRoles}><Notifications /></RoleRoute>} />

                                        {/* ===================== Site Management Routes ===================== */}
                                        <Route path="/sites" element={<RoleRoute allowedRoles={allRoles}><SitesLayout /></RoleRoute>}>
                                            <Route index element={<RoleRoute allowedRoles={allRoles}><AllSites /></RoleRoute>} />
                                            <Route path="details/:siteId" element={<RoleRoute allowedRoles={allRoles}><SiteDetails /></RoleRoute>} />
                                            <Route path="employee-details/:id" element={<RoleRoute allowedRoles={allRoles}><EmployeeDetails /></RoleRoute>} />
                                        </Route>

                                        {/* ===================== Warehouse Management Routes ===================== */}
                                        <Route path="/warehouses" element={<RoleRoute allowedRoles={allRoles}><SitesLayout /></RoleRoute>}>
                                            <Route index element={<RoleRoute allowedRoles={allRoles}><WarehousesList /></RoleRoute>} />
                                            <Route path="item-categories" element={<RoleRoute allowedRoles={allRoles}><WarehouseViewItemCategoriesTable /></RoleRoute>} />
                                            <Route path="item-types" element={<RoleRoute allowedRoles={allRoles}><WarehouseViewItemTypesTable /></RoleRoute>} />
                                            <Route path="measuring-units" element={<RoleRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE']}><MeasuringUnits /></RoleRoute>} />
                                            <Route path=":id" element={<WarehouseDetails />} />
                                            <Route path="warehouse-details/:id" element={<WarehouseInformation />} />
                                            <Route path=":id/items/:itemTypeId" element={<ItemDetailsPage />} />
                                            <Route path=":id/request-orders/:requestOrderId" element={<RequestOrderDetailsPage />} />
                                            <Route path=":id/transactions/:transaction" element={<TransactionDetailsPage />} />
                                            <Route path="item-types/:itemTypeId" element={<RoleRoute allowedRoles={allRoles}><ItemTypeDetailsPage /></RoleRoute>} />
                                        </Route>

                                        {/* ===================== Merchant Routes ===================== */}
                                        <Route path="/merchants" element={<RoleRoute allowedRoles={[ADMIN, PROCUREMENT, SITE_ADMIN, WAREHOUSE_MANAGER]}><ProcurementMerchants /></RoleRoute>} />
                                        <Route path="/merchants/:id" element={<RoleRoute allowedRoles={[ADMIN, PROCUREMENT, SITE_ADMIN, WAREHOUSE_MANAGER]}><MerchantDetails /></RoleRoute>} />

                                        {/* ===================== Procurement Routes ===================== */}
                                        <Route path="/procurement" element={<RoleRoute allowedRoles={[PROCUREMENT, SITE_ADMIN, ADMIN, EQUIPMENT_MANAGER]}><SitesLayout/></RoleRoute>}>
                                            <Route path="request-orders" element={<ProcurementRequestOrders/>}/>
                                            <Route path="request-orders/:requestOrderId" element={<RequestOrderDetailsPage/>}/>
                                            <Route path="offers" element={<ProcurementOffers/>}/>
                                            <Route path="purchase-orders" element={<PurchaseOrders/>}/>
                                            <Route path="purchase-orders/:id" element={<PurchaseOrderDetails/>}/>
                                            <Route path="purchase-orders/:id/resolve-issues" element={<ResolveIssuesPage/>}/>
                                            <Route path="purchase-orders/details/:id/" element={<PurchaseOrderDetailsPage/>}/>
                                            <Route path="price-approvals" element={<PriceApprovals/>}/>
                                            <Route path="logistics" element={<ProcurementLogistics/>}/>
                                            <Route path="logistics/:id" element={<LogisticsDetailsPage/>}/>
                                            <Route path="purchase-order-returns" element={<PurchaseOrderReturns/>}/>
                                            <Route path="purchase-order-returns/:id" element={<PurchaseOrderReturnDetailsPage/>}/>
                                        </Route>

                                        {/* ===================== HR Management Routes ===================== */}
                                        <Route path="/hr" element={<RoleRoute allowedRoles={[HR_MANAGER, HR_EMPLOYEE, ADMIN]}><HRLayout/></RoleRoute>}>
                                            <Route path="vacancies" element={<VacancyList/>}/>
                                            <Route path="positions" element={<PositionsList/>}/>
                                            <Route path="positions/:id" element={<JobPositionDetails/>}/>
                                            <Route path="employees" element={<EmployeesList/>}/>
                                            <Route path="employees/add" element={<EmployeeOnboarding/>}/>
                                            <Route path="employees/:id/onboarding" element={<EmployeeOnboarding/>}/>
                                            <Route path="employee-details/:id" element={<EmployeeDetails/>}/>
                                            <Route path="attendance" element={<AttendancePage/>}/>
                                            <Route path="vacancies/:id" element={<VacancyDetails/>}/>
                                            <Route path="potential-candidates" element={<PotentialCandidates/>}/>
                                            <Route path="departments" element={<DepartmentsList/>}/>
                                            <Route path="departments/:id" element={<DepartmentDetails/>}/>
                                            <Route path="promotions/*" element={<PromotionList/>}/>
                                            <Route path="salary-increases" element={<SalaryIncreaseList/>}/>
                                            <Route path="demotions" element={<DemotionList/>}/>
                                            <Route path="leave-requests/:id" element={<LeaveRequestDetailPage />} />
                                            <Route path="leave-requests" element={<LeaveRequestList />} />
                                            <Route path="vacation-balances" element={<VacationBalancePage />} />
                                        </Route>

                                        {/* ===================== Payroll Routes ===================== */}
                                        <Route path="/payroll">
                                            <Route path="cycles" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><PayrollCycles/></RoleRoute>}/>
                                            <Route path="cycles/:id" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><PayrollDetails/></RoleRoute>}/>
                                            <Route path="employee-payrolls" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><EmployeePayrollList/></RoleRoute>}/>
                                            <Route
                                                path="cycles/:payrollId/employee/:employeeId"
                                                element={
                                                    <RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}>
                                                        <EmployeePayrollDetails/>
                                                    </RoleRoute>
                                                }
                                            />
                                            <Route path="loans" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><LoanManagement/></RoleRoute>}/>
                                            <Route path="loans/:id" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><LoanDetails/></RoleRoute>}/>
                                            <Route path="bonuses" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><BonusManagement/></RoleRoute>}/>
                                            <Route path="deductions" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><DeductionManagement/></RoleRoute>}/>
                                            <Route path="payment-types" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><PaymentTypes/></RoleRoute>}/>
                                            <Route path="payslips" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><PayslipManagement/></RoleRoute>}/>
                                            <Route path="payslips/:id" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><PayslipEdit/></RoleRoute>}/>
                                            <Route path="reports" element={<RoleRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']}><PayrollReports/></RoleRoute>}/>
                                        </Route>

                                        {/* ===================== Equipment Management Routes ===================== */}
                                        <Route path="/equipment" element={<RoleRoute allowedRoles={allRoles}><SitesLayout /></RoleRoute>}>
                                            <Route index element={<RoleRoute allowedRoles={allRoles}><EquipmentMain /></RoleRoute>} />
                                            <Route path="brand-management" element={<RoleRoute allowedRoles={allRoles}><EquipmentBrandManagement /></RoleRoute>} />
                                            <Route path="type-management" element={<RoleRoute allowedRoles={allRoles}><EquipmentTypeManagement /></RoleRoute>} />
                                            <Route path="work-type-management" element={<RoleRoute allowedRoles={allRoles}><WorkTypeManagement /></RoleRoute>} />
                                            <Route path="maintenance-type-management" element={<RoleRoute allowedRoles={allRoles}><MaintenanceTypeManagement /></RoleRoute>} />
                                            <Route path="info/:EquipmentID" element={<RoleRoute allowedRoles={allRoles}><ViewEquipmentData /></RoleRoute>} />
                                            <Route path=":EquipmentID" element={<RoleRoute allowedRoles={allRoles}><EquipmentDetails /></RoleRoute>} />
                                        </Route>

                                        {/* ===================== Maintenance Team Routes ===================== */}
                                        <Route path="/maintenance" element={<RoleRoute allowedRoles={[ADMIN, USER, SITE_ADMIN, EQUIPMENT_MANAGER, MAINTENANCE_MANAGER, MAINTENANCE_EMPLOYEE]}><MaintenanceLayout /></RoleRoute>}>
                                            <Route index element={<MaintenanceManagerDashboard />} />
                                            <Route path="records" element={<MaintenanceRecords />} />
                                            <Route path="records/:recordId" element={<MaintenanceRecordDetail />} />
                                            <Route path="direct-purchase/:ticketId" element={<DirectPurchaseDetailView />} />
                                            <Route path="contacts" element={<Contacts />} />
                                            <Route path="step-types" element={<RoleRoute allowedRoles={[ADMIN, MAINTENANCE_MANAGER]}><StepTypeManagement /></RoleRoute>} />
                                            <Route path="contact-types" element={<RoleRoute allowedRoles={[ADMIN, MAINTENANCE_MANAGER]}><ContactTypeManagement /></RoleRoute>} />
                                        </Route>


                                        {/* ===================== Secretary Routes ===================== */}
                                        <Route path="/my-tasks" element={<RoleRoute allowedRoles={allRoles}><MyTasksPage/></RoleRoute>}/>
                                        <Route path="/secretary" element={<Navigate to="/secretary/tasks" replace/>}/>
                                        <Route path="/secretary/tasks" element={<RoleRoute allowedRoles={[ADMIN, SECRETARY]}><SecretaryTasksPage/></RoleRoute>}/>

                                        {/* ===================== Finance Routes ===================== */}
                                        <Route path="/finance/general-ledger" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><GeneralLedger /></RoleRoute>} />
                                        <Route path="/finance/payables" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><Payables /></RoleRoute>} />
                                        <Route path="/finance/fixed-assets" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><FixedAssets /></RoleRoute>} />
                                        <Route path="/finance/bank-reconciliation" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><BankReconciliation /></RoleRoute>} />
                                        <Route path="/finance/inventory-valuation" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><InventoryValuation /></RoleRoute>} />
                                        <Route path="/finance/balances" element={<RoleRoute allowedRoles={allRoles}><Balances /></RoleRoute>} />
                                        <Route path="/finance/accounts-payable" element={<RoleRoute allowedRoles={allRoles}><AccountsPayable /></RoleRoute>} />
                                        <Route path="/finance/accounts-payable/payment-requests/:id" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><PaymentRequestDetailsPage /></RoleRoute>} />
                                        <Route path="/finance/accounts-payable/process-payment" element={<RoleRoute allowedRoles={[ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE]}><ProcessPaymentPage /></RoleRoute>} />

                                        <Route path="/finance/company-loans" element={<CompanyLoansPage />} />
                                        <Route path="/finance/company-loans/new" element={<CreateLoanPage />} />
                                        <Route path="/finance/company-loans/institutions" element={<FinancialInstitutionsPage />} />
                                        <Route path="/finance/company-loans/institutions/new" element={<CreateInstitutionPage />} />
                                        <Route path="/finance/company-loans/institutions/:id/edit" element={<CreateInstitutionPage />} />
                                        <Route path="/finance/company-loans/institutions/:id" element={<CreateInstitutionPage />} />
                                        <Route path="/finance/company-loans/:id" element={<LoanDetailsPage />} />
                                        {/* ===================== Generic Related Documents Route ===================== */}
                                        <Route path="/RelatedDocuments/:entityType/:entityId" element={<RoleRoute allowedRoles={allRoles}><RelatedDocuments /></RoleRoute>} />
                                        <Route path="/related-documents/:entityType/:entityId" element={<RoleRoute allowedRoles={allRoles}><RelatedDocuments /></RoleRoute>} />
                                    </Route>

                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                                </Suspense>
                            </NotificationProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </LanguageProvider>
            </SnackbarProvider>
        </Router>
        </QueryClientProvider>)
}

export default App
