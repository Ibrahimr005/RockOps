import React, { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { BsPrinter } from "react-icons/bs";
import { IoDocumentOutline } from "react-icons/io5";
import warehouseimg1 from "../../../assets/imgs/warehouse1.jpg";
import "./WarehouseInformation.scss";

const WarehouseInformation = () => {
  const { id } = useParams();
  const [warehouseData, setWarehouseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWarehouseDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/v1/warehouses/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch warehouse data");
        }

        const data = await response.json();
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

  // Field component for displaying label/value pairs
  const FieldItem = ({ label, value }) => {
    return (
        <div className="field-item">
          <div className="field-label">{label}</div>
          <div className="field-value">{value || "Not available"}</div>
        </div>
    );
  };

  if (loading) return <div className="warehouse-info-page"><div className="loading-message">Loading warehouse details...</div></div>;
  if (error) return <div className="warehouse-info-page"><div className="error-message">Error: {error}</div></div>;

  // Find the Warehouse Manager from employees array
  const manager = warehouseData.employees?.find(emp => emp.position === "Warehouse Manager");

  // Find all Warehouse Workers
  const workers = warehouseData.employees?.filter(emp => emp.position === "Warehouse Worker") || [];

  return (
      <div className="warehouse-info-page">
        <div id="print-section" className="warehouse-info-container">
          <div className="info-header">
            <h1>Warehouse Information</h1>
            <div className="header-actions">
              <NavLink to={`../RelatedDocuments/${id}`}>
                <IoDocumentOutline />
              </NavLink>
              <button onClick={handlePrint}>
                <BsPrinter />
              </button>
            </div>
          </div>

          <div className="warehouse-image">
            <img src={warehouseimg1} alt="Warehouse" />
          </div>

          <div className="info-content">
            <div className="info-sections">
              <div className="info-section">
                <h2 className="section-title">Warehouse Details</h2>
                <div className="field-list">
                  <FieldItem label="Warehouse ID" value={warehouseData.id} />
                  <FieldItem label="Warehouse Name" value={warehouseData.name} />
                  <FieldItem label="Capacity" value={warehouseData.capacity} />
                </div>
              </div>

              <div className="info-section">
                <h2 className="section-title">Site Information</h2>
                <div className="field-list">
                  <FieldItem label="Site Name" value={warehouseData.site?.name} />
                  <FieldItem label="Site Address" value={warehouseData.site?.physicalAddress} />
                </div>
              </div>

              <div className="info-section">
                <h2 className="section-title">Management</h2>
                <div className="field-list">
                  <FieldItem
                      label="Warehouse Manager"
                      value={manager ? manager.name : "Not Assigned"}
                  />

                  {workers.length > 0 ? (
                      <FieldItem
                          label="Workers Count"
                          value={`${workers.length} worker${workers.length > 1 ? 's' : ''}`}
                      />
                  ) : (
                      <FieldItem label="Workers" value="No workers assigned" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default WarehouseInformation;