// import React, { useState } from 'react';
// import { FaFileDownload, FaChartPie, FaChartLine, FaFileAlt, FaCalendarAlt } from 'react-icons/fa';
// import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
//
// const FixedAssetsReports = () => {
//     const [selectedReportType, setSelectedReportType] = useState('summary');
//     const [dateRange, setDateRange] = useState({
//         startDate: '',
//         endDate: ''
//     });
//     const { showSuccess, showError } = useSnackbar();
//
//     const reportTypes = [
//         {
//             id: 'summary',
//             title: 'Asset Summary Report',
//             description: 'Complete overview of all fixed assets, their current status, and book values',
//             icon: <FaFileAlt />,
//             color: 'primary'
//         },
//         {
//             id: 'depreciation',
//             title: 'Depreciation Schedule',
//             description: 'Detailed depreciation calculations and schedules for all assets',
//             icon: <FaChartLine />,
//             color: 'warning'
//         },
//         {
//             id: 'disposal',
//             title: 'Disposal Report',
//             description: 'Asset disposal history with gain/loss analysis',
//             icon: <FaChartPie />,
//             color: 'danger'
//         },
//         {
//             id: 'aging',
//             title: 'Asset Aging Report',
//             description: 'Analysis of asset age and remaining useful life',
//             icon: <FaCalendarAlt />,
//             color: 'info'
//         },
//         {
//             id: 'category',
//             title: 'Category Analysis',
//             description: 'Breakdown of assets by category and location',
//             icon: <FaChartPie />,
//             color: 'success'
//         }
//     ];
//
//     const handleGenerateReport = () => {
//         if (!dateRange.startDate || !dateRange.endDate) {
//             showError('Please select both start and end dates');
//             return;
//         }
//
//         const reportTypeData = reportTypes.find(type => type.id === selectedReportType);
//         showSuccess(`Generating ${reportTypeData.title} for ${dateRange.startDate} to ${dateRange.endDate}`);
//
//         // Here you would call your backend API to generate the report
//         // Based on your controller endpoints like:
//         // - /api/v1/fixed-assets/disposals/summary
//         // - /api/v1/fixed-assets/disposals/total-gain-loss
//     };
//
//     const handleDownloadReport = (format) => {
//         showSuccess(`Downloading ${selectedReportType} report in ${format.toUpperCase()} format`);
//     };
//
//     return (
//         <div className="fixed-assets-reports">
//             <style jsx>{`
//                 .fixed-assets-reports {
//                     width: 100%;
//                     padding: 1rem;
//                 }
//
//                 .reports-header {
//                     margin-bottom: 2rem;
//                 }
//
//                 .reports-header h2 {
//                     color: var(--color-text-primary);
//                     margin: 0 0 0.5rem 0;
//                     font-size: 1.5rem;
//                     font-weight: 600;
//                 }
//
//                 .reports-header p {
//                     color: var(--color-text-secondary);
//                     margin: 0;
//                     font-size: 1rem;
//                 }
//
//                 .report-selection {
//                     display: grid;
//                     grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
//                     gap: 1rem;
//                     margin-bottom: 2rem;
//                 }
//
//                 .report-card {
//                     background: var(--section-background-color);
//                     border-radius: 8px;
//                     padding: 1.5rem;
//                     box-shadow: var(--shadow-sm);
//                     border: 2px solid transparent;
//                     cursor: pointer;
//                     transition: all 0.3s ease;
//                     position: relative;
//                 }
//
//                 .report-card:hover {
//                     transform: translateY(-2px);
//                     box-shadow: var(--shadow-md);
//                 }
//
//                 .report-card.selected {
//                     border-color: var(--color-primary);
//                     background: rgba(59, 130, 246, 0.05);
//                 }
//
//                 [data-theme="dark"] .report-card.selected {
//                     background: rgba(72, 128, 255, 0.1);
//                 }
//
//                 .report-card-header {
//                     display: flex;
//                     align-items: center;
//                     gap: 1rem;
//                     margin-bottom: 1rem;
//                 }
//
//                 .report-icon {
//                     width: 50px;
//                     height: 50px;
//                     border-radius: 8px;
//                     display: flex;
//                     align-items: center;
//                     justify-content: center;
//                     font-size: 1.5rem;
//                 }
//
//                 .report-icon.primary {
//                     background: rgba(59, 130, 246, 0.1);
//                     color: #3b82f6;
//                 }
//
//                 .report-icon.warning {
//                     background: rgba(245, 158, 11, 0.1);
//                     color: #f59e0b;
//                 }
//
//                 .report-icon.danger {
//                     background: rgba(239, 68, 68, 0.1);
//                     color: #ef4444;
//                 }
//
//                 .report-icon.info {
//                     background: rgba(59, 130, 246, 0.1);
//                     color: #3b82f6;
//                 }
//
//                 .report-icon.success {
//                     background: rgba(16, 185, 129, 0.1);
//                     color: #10b981;
//                 }
//
//                 [data-theme="dark"] .report-icon.primary {
//                     background: rgba(72, 128, 255, 0.2);
//                     color: var(--color-primary);
//                 }
//
//                 [data-theme="dark"] .report-icon.warning {
//                     background: rgba(245, 158, 11, 0.2);
//                     color: #fbbf24;
//                 }
//
//                 [data-theme="dark"] .report-icon.danger {
//                     background: rgba(239, 68, 68, 0.2);
//                     color: #f87171;
//                 }
//
//                 [data-theme="dark"] .report-icon.success {
//                     background: rgba(16, 185, 129, 0.2);
//                     color: #4ade80;
//                 }
//
//                 .report-card h3 {
//                     margin: 0;
//                     font-size: 1.1rem;
//                     font-weight: 600;
//                     color: var(--color-text-primary);
//                 }
//
//                 .report-card p {
//                     margin: 0;
//                     font-size: 0.9rem;
//                     color: var(--color-text-secondary);
//                     line-height: 1.5;
//                 }
//
//                 .report-config {
//                     background: var(--section-background-color);
//                     border-radius: 8px;
//                     padding: 2rem;
//                     box-shadow: var(--shadow-sm);
//                     border: 1px solid var(--border-color);
//                     margin-bottom: 2rem;
//                 }
//
//                 .config-section {
//                     margin-bottom: 2rem;
//                 }
//
//                 .config-section:last-child {
//                     margin-bottom: 0;
//                 }
//
//                 .config-section h3 {
//                     margin: 0 0 1rem 0;
//                     font-size: 1.1rem;
//                     font-weight: 600;
//                     color: var(--color-text-primary);
//                 }
//
//                 .date-range {
//                     display: grid;
//                     grid-template-columns: 1fr 1fr;
//                     gap: 1rem;
//                 }
//
//                 .form-group {
//                     display: flex;
//                     flex-direction: column;
//                     gap: 0.5rem;
//                 }
//
//                 .form-group label {
//                     font-size: 0.9rem;
//                     font-weight: 500;
//                     color: var(--color-text-secondary);
//                 }
//
//                 .form-group input {
//                     padding: 0.75rem;
//                     border: 1px solid var(--border-color);
//                     border-radius: 6px;
//                     background: var(--section-background-color);
//                     color: var(--color-text-primary);
//                     font-size: 0.9rem;
//                 }
//
//                 .form-group input:focus {
//                     outline: none;
//                     border-color: var(--color-primary);
//                     box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
//                 }
//
//                 .report-actions {
//                     display: flex;
//                     gap: 1rem;
//                     justify-content: center;
//                     flex-wrap: wrap;
//                 }
//
//                 .btn {
//                     padding: 0.75rem 1.5rem;
//                     border-radius: 8px;
//                     border: none;
//                     cursor: pointer;
//                     font-weight: 500;
//                     font-size: 0.9rem;
//                     transition: all 0.3s ease;
//                     display: flex;
//                     align-items: center;
//                     gap: 0.5rem;
//                 }
//
//                 .btn-primary {
//                     background: var(--color-primary);
//                     color: white;
//                     box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
//                 }
//
//                 .btn-primary:hover {
//                     background: var(--color-primary-dark);
//                     transform: translateY(-1px);
//                     box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
//                 }
//
//                 .btn-secondary {
//                     background: var(--color-surface);
//                     color: var(--color-text-primary);
//                     border: 1px solid var(--border-color);
//                 }
//
//                 .btn-secondary:hover {
//                     background: var(--color-surface-hover);
//                     transform: translateY(-1px);
//                 }
//
//                 .download-options {
//                     display: flex;
//                     gap: 0.5rem;
//                     flex-wrap: wrap;
//                 }
//
//                 .download-btn {
//                     padding: 0.5rem 1rem;
//                     background: var(--color-surface);
//                     border: 1px solid var(--border-color);
//                     border-radius: 6px;
//                     color: var(--color-text-primary);
//                     font-size: 0.8rem;
//                     cursor: pointer;
//                     transition: all 0.2s ease;
//                 }
//
//                 .download-btn:hover {
//                     background: var(--color-surface-hover);
//                     border-color: var(--color-primary);
//                 }
//
//                 @media (max-width: 768px) {
//                     .report-selection {
//                         grid-template-columns: 1fr;
//                     }
//
//                     .date-range {
//                         grid-template-columns: 1fr;
//                     }
//
//                     .report-actions {
//                         flex-direction: column;
//                     }
//
//                     .download-options {
//                         justify-content: center;
//                     }
//                 }
//             `}</style>
//
//             <div className="reports-header">
//                 <h2>Fixed Assets Reports</h2>
//                 <p>Generate comprehensive reports for asset management and compliance</p>
//             </div>
//
//             {/* Report Type Selection */}
//             <div className="report-selection">
//                 {reportTypes.map((report) => (
//                     <div
//                         key={report.id}
//                         className={`report-card ${selectedReportType === report.id ? 'selected' : ''}`}
//                         onClick={() => setSelectedReportType(report.id)}
//                     >
//                         <div className="report-card-header">
//                             <div className={`report-icon ${report.color}`}>
//                                 {report.icon}
//                             </div>
//                             <div>
//                                 <h3>{report.title}</h3>
//                             </div>
//                         </div>
//                         <p>{report.description}</p>
//                     </div>
//                 ))}
//             </div>
//
//             {/* Report Configuration */}
//             <div className="report-config">
//                 <div className="config-section">
//                     <h3>Report Parameters</h3>
//                     <div className="date-range">
//                         <div className="form-group">
//                             <label>Start Date</label>
//                             <input
//                                 type="date"
//                                 value={dateRange.startDate}
//                                 onChange={(e) => setDateRange(prev => ({
//                                     ...prev,
//                                     startDate: e.target.value
//                                 }))}
//                             />
//                         </div>
//                         <div className="form-group">
//                             <label>End Date</label>
//                             <input
//                                 type="date"
//                                 value={dateRange.endDate}
//                                 onChange={(e) => setDateRange(prev => ({
//                                     ...prev,
//                                     endDate: e.target.value
//                                 }))}
//                             />
//                         </div>
//                     </div>
//                 </div>
//
//                 <div className="config-section">
//                     <div className="report-actions">
//                         <button
//                             className="btn btn-primary"
//                             onClick={handleGenerateReport}
//                         >
//                             <FaFileAlt />
//                             Generate Report
//                         </button>
//
//                         <div className="download-options">
//                             <button
//                                 className="download-btn"
//                                 onClick={() => handleDownloadReport('pdf')}
//                             >
//                                 <FaFileDownload /> PDF
//                             </button>
//                             <button
//                                 className="download-btn"
//                                 onClick={() => handleDownloadReport('excel')}
//                             >
//                                 <FaFileDownload /> Excel
//                             </button>
//                             <button
//                                 className="download-btn"
//                                 onClick={() => handleDownloadReport('csv')}
//                             >
//                                 <FaFileDownload /> CSV
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//
//             {/* Report Preview Area */}
//             <div className="report-preview">
//                 <div style={{
//                     background: 'var(--section-background-color)',
//                     borderRadius: '8px',
//                     padding: '2rem',
//                     textAlign: 'center',
//                     border: '2px dashed var(--border-color)',
//                     color: 'var(--color-text-secondary)'
//                 }}>
//                     <FaFileAlt style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
//                     <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
//                         Report Preview
//                     </h3>
//                     <p style={{ margin: 0 }}>
//                         Select report parameters and click "Generate Report" to view results here
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// };
//
// export default FixedAssetsReports;