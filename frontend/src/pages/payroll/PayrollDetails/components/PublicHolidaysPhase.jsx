// ========================================
// FILE: PublicHolidaysPhase.jsx
// ========================================

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaChevronRight } from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import payrollService from '../../../../services/payroll/payrollService';
import PublicHolidaysModal from '../modals/PublicHolidaysModal';
import './PublicHolidaysPhase.scss';

const PublicHolidaysPhase = ({ payroll, onTransition, onRefresh, processing, openConfirmDialog }) => {
    // ... existing state and logic ...
    const { showError } = useSnackbar();
    const [publicHolidays, setPublicHolidays] = useState([]);
    const [showHolidaysModal, setShowHolidaysModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPublicHolidays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payroll.id]);

    const fetchPublicHolidays = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getPublicHolidays(payroll.id);
            const data = response.data || response;
            setPublicHolidays(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching public holidays:', error);
            setPublicHolidays([]);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowHolidaysModal(false);
        fetchPublicHolidays();
        onRefresh();
    };

    const handleProceed = () => {
        openConfirmDialog(
            'import-attendance',
            'Proceed to Import Attendance?',
            `You have added ${publicHolidays.length} public holiday(s). These dates will be excluded from attendance calculations. Continue to import attendance?`
        );
    };

    const handleProceedWithoutHolidays = () => {
        openConfirmDialog(
            'import-attendance',
            'Proceed Without Holidays?',
            'Are you sure there are no public holidays for this payroll period? You can proceed to import attendance without adding any holidays.'
        );
    };

    if (loading) {
        return <div className="phase-loading">Loading holidays...</div>;
    }

    return (
        <div className="public-holidays-phase">
            <div className="phase-section">
                <h2>Public Holidays for This Period</h2>

                {/* ... existing card rendering logic ... */}
                {publicHolidays.length > 0 ? (
                    <div className="holidays-review-section">
                        {/* ... existing cards ... */}
                        <div className="holidays-grid">
                            {publicHolidays.map((holiday, index) => {
                                // ... existing mapping logic ...
                                const isSingleDay = !holiday.endDate || holiday.startDate === holiday.endDate;
                                const duration = holiday.endDate
                                    ? Math.floor((new Date(holiday.endDate) - new Date(holiday.startDate)) / (1000 * 60 * 60 * 24)) + 1
                                    : 1;

                                return (
                                    <div key={holiday.id || index} className="holiday-card">
                                        <div className="holiday-date">
                                            <FaCalendarAlt />
                                            {isSingleDay ? (
                                                <span>
                                                    {new Date(holiday.startDate).toLocaleDateString('en-US', {
                                                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </span>
                                            ) : (
                                                <span className="date-range">
                                                    {new Date(holiday.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {' - '}
                                                    {new Date(holiday.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="holiday-name">{holiday.name}</div>
                                        {!isSingleDay && <div className="holiday-duration">{duration} days</div>}
                                        <div className={`holiday-type ${holiday.isPaid ? 'paid' : 'unpaid'}`}>
                                            {holiday.isPaid ? 'Paid Holiday' : 'Unpaid Holiday'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="holidays-actions">
                            <button className="btn-secondary" onClick={() => setShowHolidaysModal(true)} disabled={processing}>
                                <FaCalendarAlt /> Edit Holidays
                            </button>
                            <button className="btn-primary" onClick={handleProceed} disabled={processing}>
                                <FaChevronRight /> Proceed to Import Attendance
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="no-holidays-message">
                        {/* ... existing empty state ... */}
                        <FaCalendarAlt className="empty-icon" />
                        <h3>No Public Holidays Added Yet</h3>
                        <p>You can add single-day or multi-day public holidays for this period, or proceed without any if there are none.</p>

                        <div className="empty-state-actions">
                            <button className="btn-primary" onClick={() => setShowHolidaysModal(true)} disabled={processing}>
                                <FaCalendarAlt /> Add Holidays
                            </button>
                            <button className="btn-secondary-outline" onClick={handleProceedWithoutHolidays} disabled={processing}>
                                <FaChevronRight /> No Holidays - Proceed
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal - PASSING DATES HERE */}
            {showHolidaysModal && (
                <PublicHolidaysModal
                    payrollId={payroll.id}
                    onClose={handleModalClose}
                    minDate={payroll.startDate} // Pass Payroll Start Date
                    maxDate={payroll.endDate}   // Pass Payroll End Date
                />
            )}
        </div>
    );
};

export default PublicHolidaysPhase;