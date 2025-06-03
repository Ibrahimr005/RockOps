import React, { useState, useEffect, useRef } from "react";
import "./WarehouseViewItemCategories.scss";
import ParentCategoriesTable from "./ParentCategoriesTable";
import ChildCategoriesTable from "./ChildCategoriesTable";

const WarehouseViewItemCategoriesTable = ({ warehouseId, onAddButtonClick }) => {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showNotification2, setShowNotification2] = useState(false);
  const [tableUpdateTrigger, setTableUpdateTrigger] = useState(0);

  const [categoryAction, setCategoryAction] = useState('create'); // Default to 'create'
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [validParentCategories, setValidParentCategories] = useState([]);
  const [userRole, setUserRole] = useState("");

  const openCategoryModal = (category) => {
    if (category) {
      setCategoryAction('update');
      setSelectedCategory(category);
      setNewCategoryName(category.name);
      setNewCategoryDescription(category.description);
      setSelectedParentCategory(category.parentCategory ? category.parentCategory.id : null);
    } else {
      setCategoryAction('create');
      setNewCategoryName('');
      setNewCategoryDescription('');
      setSelectedCategory(null);
      setSelectedParentCategory(null);
    }
    setIsModalOpen(true);
  };

  // Register the add function with parent component
  useEffect(() => {
    if (onAddButtonClick) {
      onAddButtonClick(openCategoryModal);
    }
  }, [onAddButtonClick]);

  // Define fetchAllCategories function at the component level
  const fetchAllCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch('http://localhost:8080/api/v1/itemCategories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(error.message);
      setAllCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all categories on component mount
  useEffect(() => {
    try {
      fetchAllCategories();
    } catch (error) {
      console.error("Error in useEffect:", error);
      setError(error.message);
    }
  }, []);

  // Get user role from localStorage
  useEffect(() => {
    try {
      const userInfoString = localStorage.getItem("userInfo");
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserRole(userInfo.role);
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
    }
  }, []);

  // Update valid parent categories list when allCategories changes
  useEffect(() => {
    if (!allCategories.length) return;

    const validParents = allCategories.filter(category => {
      const hasChildCategories = allCategories.some(
          c => c.parentCategory && c.parentCategory.id === category.id
      );
      const hasNoParent = !category.parentCategory;
      return hasChildCategories || hasNoParent;
    });

    setValidParentCategories(validParents);
  }, [allCategories]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  // Handle form input changes
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'name') {
      setNewCategoryName(value);
    } else if (name === 'description') {
      setNewCategoryDescription(value);
    }
  };

  const handleParentCategoryChange = (event) => {
    const parentId = event.target.value;
    if (parentId === "none") {
      setSelectedParentCategory(null);
    } else {
      setSelectedParentCategory(parentId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newCategoryName || !newCategoryDescription) {
      alert("Please provide both name and description.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Create a simple request body with just the required fields
      const requestBody = {
        name: newCategoryName,
        description: newCategoryDescription
      };

      if (selectedParentCategory) {
        requestBody.parentCategoryId = selectedParentCategory;
      }

      console.log("Sending request body:", JSON.stringify(requestBody, null, 2));

      let response;

      if (categoryAction === "create") {
        // Create a new global category
        response = await fetch(`http://localhost:8080/api/v1/itemCategories`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
      } else if (categoryAction === "update" && selectedCategory) {
        // Update an existing global category
        response = await fetch(
            `http://localhost:8080/api/v1/itemCategories/${selectedCategory.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify(requestBody),
            }
        );
      } else {
        alert("Invalid action or missing category selection.");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(`Request failed with status: ${response.status}`);
      }

      // Get the updated category data
      const updatedCategory = await response.json();

      // Update the allCategories state to include the new/updated category
      if (categoryAction === "create") {
        // Add the new category to allCategories
        setAllCategories(prevCategories => [...prevCategories, updatedCategory]);
      } else {
        // Replace the updated category in allCategories
        setAllCategories(prevCategories =>
            prevCategories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
        );
      }

      // Reset form and close modal
      setIsModalOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setSelectedCategory(null);
      setSelectedParentCategory(null);

      // Trigger a refresh of the tables
      setTableUpdateTrigger(prev => prev + 1);

      // Show success notification
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      // Fetch all categories again to ensure everything is up to date
      fetchAllCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category. Error: " + error.message);
    }
  };

  const deleteItemCategory = async (id) => {
    try {
      // Added token to fetch request
      const token = localStorage.getItem("token");

      // Make a DELETE request to the backend API to delete the global item category
      const response = await fetch(`http://localhost:8080/api/v1/itemCategories/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      // Check if the response is not successful
      if (!response.ok) {
        throw new Error(`Failed to delete item category: ${response.status}`);
      }

      // Update local state to remove the deleted category
      setAllCategories(prevCategories => prevCategories.filter(cat => cat.id !== id));

      // Trigger a refresh of the tables
      setTableUpdateTrigger(prev => prev + 1);

      // Show delete success notification
      setShowNotification2(true);
      setTimeout(() => {
        setShowNotification2(false);
      }, 3000);

      // Fetch all categories again to ensure everything is in sync
      fetchAllCategories();
    } catch (error) {
      console.error("Error deleting item category:", error);
      alert("Failed to delete item category. Error: " + error.message);
    }
  };

  // Show loading state
  if (loading) {
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading categories...</p>
        </div>
    );
  }

  // If there's an error, show error message instead of crashing
  if (error) {
    return (
        <div className="error-container">
          <p>Error loading categories: {error}</p>
          <button onClick={fetchAllCategories} className="retry-button">
            Retry
          </button>
        </div>
    );
  }

  return (
      <>
        {/* Parent Categories Table - Using its own API endpoint */}
        <ParentCategoriesTable
            onEdit={openCategoryModal}
            onDelete={deleteItemCategory}
            key={`parent-${tableUpdateTrigger}`}
        />

        {/* Child Categories Table - Using its own API endpoint */}
        <ChildCategoriesTable
            onEdit={openCategoryModal}
            onDelete={deleteItemCategory}
            key={`child-${tableUpdateTrigger}`}
        />

        {/* Modal for adding/editing categories */}
        {isModalOpen && (
            <div className="modal-backdrop2">
              <div className="modal2" ref={modalRef}>
                <div className="modal-header2">
                  <h2>{categoryAction === 'update' ? 'Edit Item Category' : 'Add Item Category'}</h2>
                  <button className="close-modal" onClick={() => setIsModalOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <div className="modal-content-category">
                  <form onSubmit={handleSubmit}>
                    {/* Input fields for name and description */}
                    <div className="form-row2">
                      <div className="form-group2">
                        <label htmlFor="newCategoryName">Category Name</label>
                        <input
                            type="text"
                            id="newCategoryName"
                            name="name"
                            value={newCategoryName}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                      <div className="form-group2">
                        <label htmlFor="newCategoryDescription">Description</label>
                        <textarea
                            id="newCategoryDescription"
                            name="description"
                            value={newCategoryDescription}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                    </div>

                    {/* Parent Category Dropdown */}
                    <div className="form-row2">
                      <div className="form-group2">
                        <label htmlFor="parentCategory">Parent Category (Optional)</label>
                        <select
                            id="parentCategory"
                            value={selectedParentCategory || "none"}
                            onChange={handleParentCategoryChange}
                        >
                          {/* 'None' option for root category */}
                          <option value="none">None (Root Category)</option>
                          {validParentCategories
                              .filter(cat => !selectedCategory || cat.id !== selectedCategory.id)
                              .map(category => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                              ))}
                        </select>

                        <small className="form-text text-muted">
                          Only categories that are already parents or don't have assigned item types are available as parent categories.
                        </small>
                      </div>
                    </div>

                    {/* Submit button */}
                    <div className="modal-footer">
                      <button type="submit" className="submit-button2">
                        {categoryAction === 'update' ? 'Update Category' : 'Add Category'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* Success notification */}
        {showNotification && (
            <div className="notification2 success-notification2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <span>Category successfully {categoryAction === 'update' ? 'updated' : 'added'}</span>
            </div>
        )}

        {/* Delete notification */}
        {showNotification2 && (
            <div className="notification2 delete-notification2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <span>Category successfully deleted</span>
            </div>
        )}
      </>
  );
};

export default WarehouseViewItemCategoriesTable;