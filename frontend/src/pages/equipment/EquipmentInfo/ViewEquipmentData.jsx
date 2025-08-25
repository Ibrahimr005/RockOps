import React, { Fragment, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { IoDocumentOutline, IoArrowBackOutline } from "react-icons/io5";
import { BsPrinter } from "react-icons/bs";
import { equipmentService } from "../../../services/equipmentService.js";
import "./ViewEquipmentData.scss";

const ViewEquipmentData = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [equipmentData, setEquipmentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEquipmentData = async () => {
            try {
                console.log("Fetching equipment with ID:", params.EquipmentID);
                const response = await equipmentService.getEquipmentById(params.EquipmentID);
                console.log("Fetched Equipment Data:", response.data);
                setEquipmentData(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching equipment data:", error);
                setError(error.response?.data?.message || error.message);
                setLoading(false);
            }
        };

        fetchEquipmentData();
    }, [params.EquipmentID]);

    const handleGoBack = () => {
        navigate(-1); // Navigate back to the previous page
    };

    const handlePrint = () => {
        const printContent = document.getElementById("print-section");
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    // Field component for displaying label/value pairs
    const FieldItem = ({ label, value, type = "default" }) => {
        const getValueClass = () => {
            if (!value || value === "Not available") return "not-available";
            if (value === "Not applicable") return "not-applicable";
            
            switch (type) {
                case "status":
                    return "status-value";
                case "price":
                    return "price-value";
                case "driver":
                    return "driver-value";
                default:
                    return "";
            }
        };

        return (
            <div className="field-item">
                <div className="field-label">{label}</div>
                <div className={`field-value ${getValueClass()}`}>{value || "Not available"}</div>
            </div>
        );
    };

    if (loading) return <div className="equipment-info-page"><div className="loading-message">Loading equipment details...</div></div>;
    if (error) return <div className="equipment-info-page"><div className="error-message">Error: {error}</div></div>;
    if (!equipmentData) return <div className="equipment-info-page"><div className="error-message">No equipment data found</div></div>;

    // Use the data directly from the response
    const equipment = equipmentData;

    return (
        <div className="equipment-info-page">
            <div id="print-section" className="equipment-info-container">
                <div className="info-header">
                    <h1>Equipment Information</h1>
                    <div className="header-actions">
                        <NavLink to={`/related-documents/equipment/${params.EquipmentID}`}>
                            <IoDocumentOutline />
                        </NavLink>
                        <button onClick={handlePrint}>
                            <BsPrinter />
                        </button>
                    </div>
                </div>

                <div className="equipment-image">
                    <img
                        src={equipment.imageUrl}
                        alt="Equipment"
                        onError={(e) => { 
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcXVpcG1lbnQgSW1hZ2U8L3RleHQ+PC9zdmc+'; 
                        }}
                    />
                </div>

                <div className="info-content">
                    <div className="info-sections">
                        <div className="info-section">
                            <h2 className="section-title">Equipment Details</h2>
                            <div className="field-list">
                                <FieldItem label="Equipment ID" value={equipment.id} />
                                <FieldItem label="Equipment Name" value={equipment.name} />
                                <FieldItem label="Type" value={equipment.typeName} />
                                <FieldItem label="Brand" value={equipment.brandName} />
                                <FieldItem label="Model" value={equipment.model} />
                                <FieldItem label="Serial Number" value={equipment.serialNumber} />
                            </div>
                        </div>

                        <div className="info-section">
                            <h2 className="section-title">Status & Location</h2>
                            <div className="field-list">
                                <FieldItem label="Status" value={equipment.status} type="status" />
                                <FieldItem label="Site Location" value={equipment.siteName} />
                                <FieldItem label="Worked Hours" value={equipment.workedHours} />
                                <FieldItem label="Manufacture Year" value={equipment.manufactureYear} />
                            </div>
                        </div>

                        <div className="info-section">
                            <h2 className="section-title">Personnel</h2>
                            <div className="field-list">
                                <FieldItem 
                                    label="Main Driver" 
                                    value={equipment.drivable ? (equipment.mainDriverName || "Not assigned") : "Not applicable"} 
                                    type="driver"
                                />
                                <FieldItem 
                                    label="Sub Driver" 
                                    value={equipment.drivable ? (equipment.subDriverName || "Not assigned") : "Not applicable"} 
                                    type="driver"
                                />
                                <FieldItem label="Examined By" value={equipment.examinedBy} />
                            </div>
                        </div>

                        <div className="info-section">
                            <h2 className="section-title">Purchase Information</h2>
                            <div className="field-list">
                                <FieldItem label="Purchased From" value={equipment.purchasedFromName} />
                                <FieldItem label="Purchase Date" value={equipment.purchasedDate} />
                                <FieldItem label="Delivery Date" value={equipment.deliveredDate} />
                                <FieldItem label="Country of Origin" value={equipment.countryOfOrigin} />
                                <FieldItem 
                                    label="EGP Price" 
                                    value={equipment.egpPrice ? `EGP ${equipment.egpPrice.toLocaleString()}` : "N/A"} 
                                    type="price"
                                />
                                <FieldItem 
                                    label="USD Price" 
                                    value={equipment.dollarPrice ? `$${equipment.dollarPrice.toLocaleString()}` : "N/A"} 
                                    type="price"
                                />
                            </div>
                        </div>

                        <div className="info-section">
                            <h2 className="section-title">Additional Information</h2>
                            <div className="field-list">
                                <FieldItem label="Shipping Status" value={equipment.shipping} />
                                <FieldItem label="Customs Status" value={equipment.customs} />
                                <FieldItem label="Equipment Complaints" value={equipment.equipmentComplaints} />
                                <FieldItem label="Related Documents" value={equipment.relatedDocuments} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewEquipmentData;