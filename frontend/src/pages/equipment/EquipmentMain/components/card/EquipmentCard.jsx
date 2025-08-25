import React, { forwardRef, useState, useImperativeHandle, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import "./EquipmentCard.scss";
import equipmentIcon from "../../../../../assets/imgs/equipment_icon.png";

const EquipmentCard = forwardRef((props, ref) => {
    const [equipmentId, setEquipmentId] = useState("");
    const [modelName, setModelName] = useState("Equipment Name");
    const [siteName, setSiteName] = useState("N/A");
    const [status, setStatus] = useState("Unknown");
    const [driver, setDriver] = useState("No Driver Assigned");
    const [imageUrl, setImageUrl] = useState("");
    const [customActions, setCustomActions] = useState([]);

    const navigate = useNavigate();

    // Handler for the entire card click
    const handleCardClick = () => {
        if (equipmentId) {
            navigate(`/equipment/${equipmentId}`);
        }
    };

    // Handler for View Details button
    const handleViewDetails = (e) => {
        e.stopPropagation(); // Prevent card click from triggering
        if (equipmentId) {
            navigate(`/equipment/info/${equipmentId}`); // Navigate to ViewEquipment
        }
    };

    // Get CSS class for status indicator
    const getStatusClass = (status) => {
        if (!status) return "status-unknown";

        const statusLower = status.toLowerCase();
        if (statusLower === "running") return "status-running";
        if (statusLower === "available") return "status-available";
        if (statusLower === "in_use" || statusLower === "in use" || statusLower === "rented") return "status-in-use";
        if (statusLower === "maintenance" || statusLower === "in_maintenance") return "status-maintenance";
        if (statusLower === "unavailable" || statusLower === "sold" || statusLower === "scrapped") return "status-unavailable";

        return "status-unknown";
    };

    // Function to update the card data
    const updateEquipmentCard = (
        newModelName,
        newSiteName,
        newStatus,
        newDriver,
        newImageUrl,
        newEquipmentId
    ) => {
        setModelName(newModelName || "Equipment Name");
        setSiteName(newSiteName || "N/A");
        setStatus(newStatus || "Unknown");
        setDriver(newDriver || "No Driver Assigned");
        setImageUrl(newImageUrl || "");
        setEquipmentId(newEquipmentId || "");

        // Log for debugging
        console.log(`EquipmentCard updated for ${newModelName} with siteName: ${newSiteName} and image: ${newImageUrl}`);
    };

    // Function to set custom actions for the card
    const setActions = (actions) => {
        setCustomActions(actions || []);
    };

    // Expose functions to parent components
    useImperativeHandle(ref, () => ({
        updateEquipmentCard,
        setActions
    }));

    return (
        <div className="equipment-card" onClick={handleCardClick}>
            <div className="equipment-image-container">
                <img
                    className="equipment-image"
                    src={imageUrl || equipmentIcon}
                    alt={modelName}
                    onError={(e) => {
                        console.log(`Image failed to load for ${modelName}: ${imageUrl}`);
                        e.target.src = equipmentIcon;
                    }}
                />
            </div>

            <div className="equipment-details">
                <h2 className="equipment-name">{modelName}</h2>

                <div className="equipment-specs">
                    <div className="spec-row">
                        <div className="spec-item">
                            <span className="spec-label">Site</span>
                            <span className="spec-value">{siteName}</span>
                        </div>

                        <div className="spec-item">
                            <span className="spec-label">Status</span>
                            <span className={`status-indicator ${getStatusClass(status)}`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    <div className="spec-row">
                        <div className="spec-item full-width">
                            <span className="spec-label">Driver</span>
                            <span className="spec-value">{driver}</span>
                        </div>
                    </div>
                </div>

                <div className="equipment-actions">


                    {/* Render custom actions if available */}
                    {customActions.map((action, index) => (
                        <button
                            key={index}
                            className={`btn-custom-action ${action.className || ''}`}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                action.action(equipmentId);
                            }}
                        >
                            {action.icon && <span className="action-icon">{action.icon}</span>}
                            {action.label}
                        </button>
                    ))}

                    {/* Render default edit button if no custom actions */}
                    {customActions.length === 0 && (
                        <button
                            className="btn-edit-equipment"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (props.onEdit && equipmentId) {
                                    props.onEdit(equipmentId);
                                } else {
                                    navigate(`/EditEquipment/${equipmentId}`);
                                }
                            }}
                        >
                            Edit Equipment
                        </button>
                    )}
                    <button className="btn-view-details" onClick={handleViewDetails}>
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
});

export default EquipmentCard;