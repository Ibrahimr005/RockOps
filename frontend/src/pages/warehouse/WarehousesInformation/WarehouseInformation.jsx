import React, { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { BsPrinter } from "react-icons/bs";
import { IoDocumentOutline } from "react-icons/io5";
import warehouseimg1 from "../../../assets/imgs/warehouse1.jpg";
import "./WarehouseInformation.scss";
import { warehouseService } from "../../../services/warehouse/warehouseService";

const WarehouseInformation = () => {
  const { id } = useParams();
  const [warehouseData, setWarehouseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWarehouseDetails = async () => {
      try {
        const data = await warehouseService.getById(id);
        console.log(JSON.stringify(data, null, 2));
        setWarehouseData(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouseDetails();
  }, [id]);

  const handlePrint = () => {
    const printContent = document.getElementById("print-section");
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // Simple field component
  const InfoRow = ({ label, value }) => {
    return (
        <div className="info-row">
          <span className="info-label">{label}</span>
          <span className="info-value">{value || "Not available"}</span>
        </div>
    );
  };

  if (loading) {
    return (
        <div className="warehouse-info-page">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading warehouse details...</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="warehouse-info-page">
          <div className="error-state">
            <h3>Error Loading Warehouse</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
    );
  }

  // Find the Warehouse Manager from employees array
  const manager = warehouseData.employees?.find(emp => emp.position === "Warehouse Manager");
  // Find all Warehouse Workers
  const workers = warehouseData.employees?.filter(emp => emp.position === "Warehouse Worker") || [];

  return (
      <div className="warehouse-info-page">
        <div id="print-section" className="warehouse-info-container">

          {/* Simple Header */}
          <div className="info-header">
            <div className="header-left">
              <h1>Warehouse Information</h1>
            </div>
            <div className="header-actions">

              <button onClick={handlePrint} className="btn-primary">
                <BsPrinter />
                Print
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="info-content">

            {/* Warehouse Image */}
            <div className="warehouse-image-section">
              <img
                  src={warehouseData?.photoUrl || warehouseimg1}
                  alt="Warehouse"
                  className="warehouse-image"
                  onError={(e) => {
                    e.target.src = warehouseimg1;
                  }}
              />
              <div className="image-info">
                <h2>{warehouseData.name}</h2>
              </div>
            </div>

            {/* Information Sections */}
            <div className="info-sections">

              {/* Basic Details */}
              <div className="info-section">
                <h3>Warehouse Details</h3>
                <div className="info-rows">
                  <InfoRow label="Warehouse Name" value={warehouseData.name} />
                  <InfoRow label="Warehouse ID" value={warehouseData.id} />
                  <InfoRow label="Capacity" value={warehouseData.capacity} />
                </div>
              </div>

              {/* Site Information */}
              <div className="info-section">
                <h3>Site Information</h3>
                <div className="info-rows">
                  <InfoRow label="Site Name" value={warehouseData.site?.name} />
                  <InfoRow label="Physical Address" value={warehouseData.site?.physicalAddress} />
                </div>
              </div>

              {/* Staff Information */}
              <div className="info-section">
                <h3>Management & Staff</h3>
                <div className="info-rows">
                  <InfoRow
                      label="Warehouse Manager"
                      value={manager ? manager.name : "Not Assigned"}
                  />
                  <InfoRow
                      label="Total Staff"
                      value={warehouseData.employees?.length || 0}
                  />
                  <InfoRow
                      label="Workers"
                      value={workers.length > 0 ? `${workers.length} worker${workers.length > 1 ? 's' : ''}` : "No workers assigned"}
                  />
                </div>
              </div>

              {/* Staff List (if workers exist) */}
              {workers.length > 0 && (
                  <div className="info-section">
                    <h3>Staff Directory</h3>
                    <div className="staff-list">
                      {manager && (
                          <div className="staff-item manager">
                            <span className="staff-name">{manager.name}</span>
                            <span className="staff-role">Manager</span>
                          </div>
                      )}
                      {workers.map((worker, index) => (
                          <div key={index} className="staff-item">
                            <span className="staff-name">{worker.name}</span>
                            <span className="staff-role">Worker</span>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

            </div>
          </div>
        </div>
      </div>
  );
};

export default WarehouseInformation;