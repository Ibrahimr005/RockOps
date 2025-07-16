import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const HRManagerDashboard = () => {
    const { t } = useTranslation();
    const [salaryStats, setSalaryStats] = useState(null);
    const [employeeDistribution, setEmployeeDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



    return (
        <div className="hr-dashboard">

        </div>
    );
};

export default HRManagerDashboard;