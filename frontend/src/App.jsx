import {useState} from 'react'
import {BrowserRouter as Router, Navigate, Outlet, Route, Routes} from 'react-router-dom';
import './App.css'
import {LanguageProvider} from "./contexts/LanguageContext.jsx";
import {ThemeProvider} from "./contexts/ThemeContext.jsx";
import {AuthProvider, useAuth} from "./contexts/AuthContext.jsx";
import Login from "./pages/login/Login.jsx";
import Sidebar, {SidebarProvider} from "./components/common/Sidebar/Sidebar.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";
import Navbar from "./components/common/Navbar/Navbar.jsx";
import DashboardPage from "./pages/dashboards/DashboardPage.jsx";
import VacancyList from "./pages/HR/Vacancy/VacancyList.jsx";
import PositionsList from "./pages/HR/JobPosition/PositionsList.jsx";
import EmployeesList from "./pages/HR/Employee/EmployeesList.jsx";
import HRLayout from "./pages/HR/HRLayout.jsx";
import EmployeeDetails from "./pages/HR/Employee/details/EmployeeDetails.jsx";
import VacancyDetails from "./pages/HR/Vacancy/details/VacancyDetails.jsx";
import DepartmentsList from "./pages/HR/Departments/DepartmentsList.jsx";
import AllSites from "./pages/site/AllSites/AllSites.jsx";
import SitesLayout from "./pages/site/SitesLayout.jsx";
import Partners from "./pages/partners/Partners.jsx";
import SiteDetails from "./pages/site/SiteDetails/SiteDetails.jsx";
import EquipmentMain from "./pages/equipment/EquipmentMain/EquipmentMain.jsx";
import {SnackbarProvider} from "./contexts/SnackbarContext.jsx";
import EquipmentBrandManagement from "./pages/equipment/EquipmentManagement/EquipmentBrandManagement.jsx";
import EquipmentTypeManagement from "./pages/equipment/EquipmentManagement/EquipmentTypeManagement.jsx";
import WorkTypeManagement from "./pages/equipment/EquipmentManagement/WorkTypeManagement.jsx";
import MaintenanceTypeManagement from "./pages/equipment/EquipmentManagement/MaintenanceTypeManagement.jsx";
import ViewEquipmentData from "./pages/equipment/EquipmentInfo/ViewEquipmentData.jsx";
import EquipmentDetails from "./pages/equipment/EquipmentDetails/EquipmentDetails.jsx";
import RelatedDocuments from "./pages/RelatedDocuments/RelatedDocuments.jsx";

// ===================== Warehouse Imports =====================
import WarehousesList from "./pages/warehouse/WarehousesList/WarehousesList.jsx";
import WarehouseDetails from "./pages/warehouse/WarehousesDetails/WarehouseDetails.jsx";
import WarehouseInformation from "./pages/warehouse/WarehousesInformation/WarehouseInformation.jsx";
import WarehouseViewItemCategoriesTable from "./pages/warehouse/WarehouseCategories/WarehouseViewItemsCategoriesTable.jsx";
import WarehouseViewItemTypesTable from "./pages/warehouse/WarehouseItemTypes/WarehouseViewItemTypesTable.jsx";

// ===================== Merchant & Procurement Components =====================
import MerchantDetails from "./pages/merchant/MerchantDetails/MerchantDetails.jsx";
import ProcurementOffers from "./pages/procurement/ProcurementOffers/ProcurementOffers.jsx";
import ProcurementRequestOrderDetails
    from "./pages/procurement/ProcurementRequestOrderDetails/ProcurementRequestOrderDetails.jsx";
import ProcurementMerchants from "./pages/merchant/MerchantList/ProcurementMerchants.jsx";
import ProcurementRequestOrders from "./pages/procurement/ProcurementRequestOrders/ProcurementRequestOrders.jsx";
import PurchaseOrders from "./pages/procurement/ProcurementPurchaseOrders/PurchaseOrders.jsx";
import PurchaseOrderDetails
    from "./pages/procurement/ProcurementPurchaseOrders/PurchaseOrderDetails/PurchaseOrderDetails.jsx";

import AttendancePage from "./pages/HR/Attendance/AttendancePage.jsx";
import GeneralLedger from "./pages/finance/GeneralLedger/GeneralLedger.jsx";
import LoadingPage from "./components/common/LoadingPage/LoadingPage.jsx";
import Payables from "./pages/finance/Payables/Payables.jsx";
// ===================== Notifications =====================
import Notifications from './pages/notification/Notifications.jsx';
import FixedAssets from "./pages/finance/FixedAssets/FixedAssets.jsx";

import { ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE, ROLES } from './utils/roles';
import PayrollDashboard from "./pages/payroll/PayrollDashboard/PayrollDashboard.jsx";
import PayslipList from "./pages/payroll/PayslipList/PayslipList.jsx";
import LoanManagement from "./pages/payroll/Loans/LoanManagement/LoanManagement.jsx";
import PayrollLayout from "./pages/payroll/PayrollLayout.jsx";
import LoanDetails from "./pages/payroll/Loans/LoanDetails/LoanDetails.jsx";
import PayrollReports from "./pages/payroll/PayrollReports/PayrollReports.jsx";
import PayslipDetails from "./pages/payroll/PayslipDetails/PayslipDetails.jsx";
import EmployeeOnboarding from "./pages/HR/Vacancy/EmployeeOnboarding.jsx";
import PromotionList from "./pages/HR/Promotion/PromotionList.jsx";

const AuthRedirect = () => {
    const {currentUser, isAuthenticated, loading} = useAuth();
    if (loading) return <LoadingPage/>;
    if (!isAuthenticated) return <Navigate to="/login" replace/>;
    return <Navigate to={currentUser?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace/>;
};

const RoleRoute = ({allowedRoles, children, redirectPath = '/dashboard'}) => {
    const {currentUser, isAuthenticated, loading} = useAuth();
    if (loading) return <LoadingPage/>;
    if (!isAuthenticated) return <Navigate to="/login" replace/>;
    if (!allowedRoles.includes(currentUser?.role)) return <Navigate to={redirectPath} replace/>;
    return children;
};

const allRoles = Object.values(ROLES);



// ===================== Layout Components =====================
// Updated MainLayout to match Claude.ai structure
const MainLayout = () => (
    <SidebarProvider>
        <div className="app-container">
            <Sidebar />
            <div className="main-content-wrapper">
                <Navbar />
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
        <Router>
            <SnackbarProvider>
                <LanguageProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <Routes>
                                <Route path="/login" element={<Login/>}/>
                                <Route path="/" element={<AuthRedirect/>}/>

                                <Route element={<MainLayout/>}>
                                    <Route path="/admin" element={<RoleRoute allowedRoles={[ADMIN]}><AdminPage/></RoleRoute>}/>

                                    <Route path="/dashboard" element={<RoleRoute allowedRoles={allRoles}><DashboardPage/></RoleRoute>}/>

                                    <Route path="/partners" element={<RoleRoute allowedRoles={[ADMIN, SITE_ADMIN]}><Partners/></RoleRoute>}/>

                                    {/* ===================== Notifications Route ===================== */}
                                    <Route path="/notifications" element={<RoleRoute allowedRoles={allRoles}><Notifications/></RoleRoute>}/>

                                    {/* Site Management Routes */}
                                    <Route path="/sites" element={<RoleRoute allowedRoles={allRoles}><SitesLayout/></RoleRoute>}>
                                        <Route index element={<RoleRoute allowedRoles={allRoles}><AllSites/></RoleRoute>}/>
                                        <Route path="details/:siteId" element={<RoleRoute allowedRoles={allRoles}><SiteDetails/></RoleRoute>}/>
                                        <Route path="employee-details/:id" element={<RoleRoute allowedRoles={allRoles}><EmployeeDetails/></RoleRoute>}/>
                                    </Route>

                                    {/* Warehouse Management Routes */}
                                    <Route path="/warehouses" element={<RoleRoute allowedRoles={allRoles}><SitesLayout/></RoleRoute>}>
                                        <Route index element={<RoleRoute allowedRoles={allRoles}><WarehousesList/></RoleRoute>}/>
                                        <Route path="item-categories" element={<RoleRoute allowedRoles={allRoles}><WarehouseViewItemCategoriesTable/></RoleRoute>}/>
                                        <Route path="item-types" element={<RoleRoute allowedRoles={allRoles}><WarehouseViewItemTypesTable/></RoleRoute>}/>
                                        <Route path=":id" element={<WarehouseDetails/>}/>
                                        <Route path="warehouse-details/:id" element={<WarehouseInformation/>}/>
                                    </Route>

                                    {/* Merchant Routes */}
                                    <Route path="/merchants" element={<RoleRoute allowedRoles={[ADMIN, PROCUREMENT, SITE_ADMIN, WAREHOUSE_MANAGER]}><ProcurementMerchants/></RoleRoute>}/>
                                    <Route path="/merchants/:id" element={<RoleRoute allowedRoles={[ADMIN, PROCUREMENT, SITE_ADMIN]}><MerchantDetails/></RoleRoute>}/>

                                    {/* Procurement Routes */}
                                    <Route path="/procurement" element={<RoleRoute allowedRoles={[PROCUREMENT, SITE_ADMIN, ADMIN]}><SitesLayout/></RoleRoute>}>
                                        <Route path="request-orders" element={<ProcurementRequestOrders/>}/>
                                        <Route path="request-orders/:id" element={<ProcurementRequestOrderDetails/>}/>
                                        <Route path="offers" element={<ProcurementOffers/>}/>
                                        <Route path="purchase-orders" element={<PurchaseOrders/>}/>
                                        <Route path="purchase-orders/:id" element={<PurchaseOrderDetails/>}/>
                                    </Route>

                                    {/* HR Management Routes */}
                                    <Route path="/hr" element={<RoleRoute allowedRoles={[HR_MANAGER, HR_EMPLOYEE, ADMIN]}><HRLayout/></RoleRoute>}>
                                        <Route path="vacancies" element={<VacancyList/>}/>
                                        <Route path="positions" element={<PositionsList/>}/>
                                        <Route path="employees" element={<EmployeesList/>}/>
                                        <Route path="employees/add" element={<EmployeeOnboarding/>}/>
                                        <Route path="employee-details/:id" element={<EmployeeDetails/>}/>
                                        <Route path="attendance" element={<AttendancePage/>}/>
                                        <Route path="vacancies/:id" element={<VacancyDetails/>}/>
                                        <Route path="departments" element={<DepartmentsList/>}/>
                                        <Route path="promotions/*" element={<PromotionList/>}/>
                                    </Route>


                                    {/* Payroll Routes */}
                                    <Route path="/payroll" element={<RoleRoute allowedRoles={[HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE, ADMIN]}><PayrollLayout/></RoleRoute>}>
                                        <Route index element={<PayrollDashboard/>}/>
                                        <Route path="payslips" element={<PayslipList/>}/>
                                        <Route path="payslips/:id" element={<PayslipDetails/>}/>
                                        <Route path="loans" element={<LoanManagement/>}/>
                                        <Route path="loans/:id" element={<LoanDetails/>}/>
                                        <Route path="reports" element={<PayrollReports/>}/>
                                    </Route>

                                    {/* Equipment Management Routes */}
                                    <Route path="/equipment" element={<RoleRoute allowedRoles={allRoles}><SitesLayout/></RoleRoute>}>
                                        <Route index element={<RoleRoute allowedRoles={allRoles}><EquipmentMain/></RoleRoute>}/>
                                        <Route path="brand-management" element={<RoleRoute allowedRoles={allRoles}><EquipmentBrandManagement/></RoleRoute>}/>
                                        <Route path="type-management" element={<RoleRoute allowedRoles={allRoles}><EquipmentTypeManagement/></RoleRoute>}/>
                                        <Route path="work-type-management" element={<RoleRoute allowedRoles={allRoles}><WorkTypeManagement/></RoleRoute>}/>
                                        <Route path="maintenance-type-management" element={<RoleRoute allowedRoles={allRoles}><MaintenanceTypeManagement/></RoleRoute>}/>
                                        <Route path="info/:EquipmentID" element={<RoleRoute allowedRoles={allRoles}><ViewEquipmentData/></RoleRoute>}/>
                                        <Route path=":EquipmentID" element={<RoleRoute allowedRoles={allRoles}><EquipmentDetails/></RoleRoute>}/>
                                    </Route>

                                    {/* Finance Routes */}
                                    <Route path="/finance/general-ledger" element={<RoleRoute allowedRoles={allRoles}><GeneralLedger/></RoleRoute>} />
                                    <Route path="/finance/payables" element={<RoleRoute allowedRoles={allRoles}><Payables/></RoleRoute>} />
                                    <Route path="/finance/fixed-assets" element={<RoleRoute allowedRoles={allRoles}><FixedAssets/></RoleRoute>} />



                                    {/* Generic Related Documents Route */}
                                    <Route path="/RelatedDocuments/:entityType/:entityId" element={<RoleRoute allowedRoles={allRoles}><RelatedDocuments/></RoleRoute>}/>


                                    {/* Generic Related Documents Route */}
                                    <Route path="/related-documents/:entityType/:entityId" element={<RoleRoute allowedRoles={allRoles}><RelatedDocuments/></RoleRoute>}/>
                                </Route>


                                <Route path="*" element={<Navigate to="/" replace/>}/>
                                {/* Your other routes here */}
                            </Routes>
                        </AuthProvider>
                    </ThemeProvider>
                </LanguageProvider>
            </SnackbarProvider>
        </Router>)
}



export default App