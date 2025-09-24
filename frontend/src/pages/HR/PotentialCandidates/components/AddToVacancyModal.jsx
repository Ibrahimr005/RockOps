import React, { useState, useEffect } from 'react';
import { FaTimes, FaBriefcase, FaUsers, FaSearch, FaPlus } from 'react-icons/fa';
import './AddToVacancyModal.scss';
import { vacancyService } from '../../../../services/hr/vacancyService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';

const AddToVacancyModal = ({ onClose, onConfirm, candidateCount, isLoading }) => {
    const [vacancies, setVacancies] = useState([]);
    const [filteredVacancies, setFilteredVacancies] = useState([]);
    const [selectedVacancy, setSelectedVacancy] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { showError } = useSnackbar();

    useEffect(() => {
        loadVacancies();
    }, []);

    useEffect(() => {
        filterVacancies();
    }, [searchTerm, vacancies]);

    const loadVacancies = async () => {
        try {
            setLoading(true);
            const response = await vacancyService.getAll();

            // Filter to only show OPEN vacancies with available positions
            const openVacancies = (response.data || []).filter(vacancy =>
                vacancy.status === 'OPEN' || vacancy.status === 'ACTIVE'
            );

            setVacancies(openVacancies);
        } catch (error) {
            console.error('Error loading vacancies:', error);
            setError('Failed to load vacancies');
            showError('Failed to load available vacancies');
        } finally {
            setLoading(false);
        }
    };

    const filterVacancies = () => {
        if (!searchTerm.trim()) {
            setFilteredVacancies(vacancies);
            return;
        }

        const filtered = vacancies.filter(vacancy =>
            vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vacancy.description && vacancy.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (vacancy.jobPosition && vacancy.jobPosition.positionName.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        setFilteredVacancies(filtered);
    };

    const handleVacancySelect = (vacancy) => {
        setSelectedVacancy(vacancy);
    };

    const handleConfirm = () => {
        if (!selectedVacancy) {
            showError('Please select a vacancy');
            return;
        }
        onConfirm(selectedVacancy.id);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No deadline';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getRemainingPositions = (vacancy) => {
        const total = vacancy.numberOfPositions || 1;
        const hired = vacancy.hiredCount || 0;
        return Math.max(0, total - hired);
    };

    const getStatusColor = (vacancy) => {
        const remaining = getRemainingPositions(vacancy);
        if (remaining === 0) return 'filled';
        if (remaining <= 2) return 'limited';
        return 'available';
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container add-to-vacancy-modal">
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FaPlus className="title-icon" />
                        Add Candidates to Vacancy
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="selection-summary">
                        <FaUsers className="summary-icon" />
                        <span>Adding <strong>{candidateCount}</strong> potential candidate(s) to selected vacancy</span>
                    </div>

                    {/* Search Section */}
                    <div className="search-section">
                        <div className="search-input-group">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search vacancies by title, description, or position..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    {/* Vacancies List */}
                    <div className="vacancies-section">
                        <h3 className="section-title">Select Vacancy</h3>

                        {loading && (
                            <div className="loading-state">
                                <div className="loading-spinner"></div>
                                <span>Loading vacancies...</span>
                            </div>
                        )}

                        {error && (
                            <div className="error-state">
                                <span>{error}</span>
                            </div>
                        )}

                        {!loading && !error && filteredVacancies.length === 0 && (
                            <div className="empty-state">
                                <FaBriefcase className="empty-icon" />
                                <span>No open vacancies found</span>
                                <small>Try adjusting your search or check back later</small>
                            </div>
                        )}

                        {!loading && !error && filteredVacancies.length > 0 && (
                            <div className="vacancies-list">
                                {filteredVacancies.map(vacancy => (
                                    <div
                                        key={vacancy.id}
                                        className={`vacancy-card ${selectedVacancy?.id === vacancy.id ? 'selected' : ''} ${getStatusColor(vacancy)}`}
                                        onClick={() => handleVacancySelect(vacancy)}
                                    >
                                        <div className="vacancy-header">
                                            <h4 className="vacancy-title">{vacancy.title}</h4>
                                            <div className="vacancy-status">
                                                <span className={`status-badge ${getStatusColor(vacancy)}`}>
                                                    {getRemainingPositions(vacancy)} positions available
                                                </span>
                                            </div>
                                        </div>

                                        <div className="vacancy-details">
                                            {vacancy.jobPosition && (
                                                <div className="detail-item">
                                                    <span className="detail-label">Position:</span>
                                                    <span className="detail-value">{vacancy.jobPosition.positionName}</span>
                                                </div>
                                            )}

                                            <div className="detail-item">
                                                <span className="detail-label">Priority:</span>
                                                <span className={`priority-badge ${vacancy.priority?.toLowerCase() || 'medium'}`}>
                                                    {vacancy.priority || 'Medium'}
                                                </span>
                                            </div>

                                            <div className="detail-item">
                                                <span className="detail-label">Closing Date:</span>
                                                <span className="detail-value">{formatDate(vacancy.closingDate)}</span>
                                            </div>

                                            <div className="detail-item">
                                                <span className="detail-label">Total Positions:</span>
                                                <span className="detail-value">
                                                    {vacancy.hiredCount || 0} / {vacancy.numberOfPositions || 1} filled
                                                </span>
                                            </div>
                                        </div>

                                        {vacancy.description && (
                                            <div className="vacancy-description">
                                                <p>{vacancy.description.length > 150
                                                    ? `${vacancy.description.substring(0, 150)}...`
                                                    : vacancy.description}
                                                </p>
                                            </div>
                                        )}

                                        {selectedVacancy?.id === vacancy.id && (
                                            <div className="selection-indicator">
                                                <span>✓ Selected</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!selectedVacancy || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="loading-spinner small"></div>
                                Adding...
                            </>
                        ) : (
                            <>
                                <FaPlus />
                                Add to Vacancy
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddToVacancyModal;