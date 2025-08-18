import React, { useEffect, useState } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable";
import { useTranslation } from 'react-i18next';
import {useNavigate} from "react-router-dom";
import Snackbar from "../../../../components/common/Snackbar/Snackbar";
import { siteService } from "../../../../services/siteService";

const SiteMerchantsTab = ({ siteId }) => {
    const { t } = useTranslation();
    const [merchantData, setMerchantData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, show: false }));
    };

    const handleRowClick = (row) => {
        navigate(`/merchants/${row.id}`);
    };

    // Define columns for DataTable
    const columns = [
        {
            header: 'ID',
            accessor: 'conventionalId',
            sortable: true
        },
        {
            header: 'Merchant Name',
            accessor: 'merchantName',
            sortable: true
        },
        {
            header: 'Merchant Type',
            accessor: 'merchantType',
            sortable: true
        },
        {
            header: 'Address',
            accessor: 'address',
            sortable: true
        },
        {
            header: 'Contact Number',
            accessor: 'contactPhone',
            sortable: true
        }
    ];

    useEffect(() => {
        fetchMerchants();
    }, [siteId]);

    const fetchMerchants = async () => {
        try {
            const response = await siteService.getSiteMerchants(siteId);
            const data = response.data;

            if (Array.isArray(data)) {
                const transformedData = data.map((item, index) => ({
                    conventionalId: `ME-${String(index + 1).padStart(3, '0')}`,
                    id: item.id,
                    merchantName: item.name,
                    merchantType: item.merchantType,
                    address: item.address,
                    contactPhone: item.contactPhone,
                }));

                setMerchantData(transformedData);
            } else {
                setMerchantData([]);
                setSnackbar({
                    show: true,
                    message: 'No merchants found for this site',
                    type: 'info'
                });
            }

            setLoading(false);
        } catch (err) {
            setError(err.message);
            setMerchantData([]);
            setLoading(false);
            setSnackbar({
                show: true,
                message: err.message,
                type: 'error'
            });
        }
    };

    const merchantTypeCounts = merchantData.reduce((counts, merchant) => {
        counts[merchant.merchantType] = (counts[merchant.merchantType] || 0) + 1;
        return counts;
    }, {});

    if (loading) return <div className="loading-container">{t('site.loadingMerchants')}</div>;

    return (
        <div className="site-merchants-tab">
            <Snackbar
                show={snackbar.show}
                message={snackbar.message}
                type={snackbar.type}
                onClose={handleCloseSnackbar}
                duration={3000}
            />
            
            <div className="departments-header">
                <h3>{t('site.siteMerchantsReport')}</h3>
            </div>

            {/*<div className="merchants-stats">*/}
            {/*    {Object.entries(merchantTypeCounts).map(([type, count]) => (*/}
            {/*        <div className="stat-card" key={type}>*/}
            {/*            <div className="stat-title">{type}</div>*/}
            {/*            <div className="stat-value">{count}</div>*/}
            {/*        </div>*/}
            {/*    ))}*/}
            {/*</div>*/}

            {error ? (
                <div className="error-container">{error}</div>
            ) : (
                <div className="data-table-container">
                    <DataTable
                        data={merchantData}
                        columns={columns}
                        loading={loading}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={columns}
                        itemsPerPageOptions={[10, 25, 50, 100]}
                        defaultItemsPerPage={10}
                        onRowClick={(row) => {
                            handleRowClick(row);
                            setSnackbar({
                                show: true,
                                message: `Navigating to merchant: ${row.merchantName}`,
                                type: 'info'
                            });
                        }}
                        tableTitle="Merchants List"
                    />
                </div>
            )}
        </div>
    );
};

export default SiteMerchantsTab;