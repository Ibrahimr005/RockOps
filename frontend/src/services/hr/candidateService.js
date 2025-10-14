// frontend/src/services/hr/candidateService.js
import apiClient from '../../utils/apiClient.js';
import { CANDIDATE_ENDPOINTS } from '../../config/api.config.js';

export const candidateService = {
    // ===============================
    // EXISTING METHODS (Enhanced)
    // ===============================

    // Get all candidates
    getAll: () => {
        return apiClient.get(CANDIDATE_ENDPOINTS.BASE);
    },

    // Get candidate by ID
    getById: (id) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.BY_ID(id));
    },

    // Get candidates by vacancy ID
    getByVacancy: (vacancyId) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.BY_VACANCY(vacancyId));
    },

    // Create new candidate with multipart form data
    create: (formData) => {
        return apiClient.post(CANDIDATE_ENDPOINTS.CREATE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Update existing candidate with multipart form data
    update: (id, formData) => {
        return apiClient.put(CANDIDATE_ENDPOINTS.UPDATE(id), formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Update candidate status only
    updateStatus: (id, status) => {
        return apiClient.put(CANDIDATE_ENDPOINTS.UPDATE_STATUS(id), { status });
    },

    // Delete candidate
    delete: (id) => {
        return apiClient.delete(CANDIDATE_ENDPOINTS.DELETE(id));
    },

    // Convert candidate to employee data
    convertToEmployee: (id) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.TO_EMPLOYEE(id));
    },

    // ===============================
    // NEW METHODS FOR POTENTIAL CANDIDATES
    // ===============================

    // ===============================
    // SEARCH AND FILTERING
    // ===============================

    // Advanced search candidates
    search: (searchParams = {}) => {
        const queryString = buildQueryParams(searchParams);
        const url = queryString ?
            `${CANDIDATE_ENDPOINTS.SEARCH}?${queryString}` :
            CANDIDATE_ENDPOINTS.SEARCH;

        return apiClient.get(url);
    },

    // Filter candidates with multiple criteria
    filter: (filterParams = {}) => {
        const queryString = buildQueryParams(filterParams);
        const url = queryString ?
            `${CANDIDATE_ENDPOINTS.FILTER}?${queryString}` :
            CANDIDATE_ENDPOINTS.FILTER;

        return apiClient.get(url);
    },

    // Search potential candidates with filters
    searchPotentialCandidates: (searchParams = {}) => {
        const allowedParams = {
            query: searchParams.query,
            location: searchParams.location,
            position: searchParams.position,
            skills: searchParams.skills,
            experience: searchParams.experience,
            rejectionReason: searchParams.rejectionReason,
            dateFrom: searchParams.dateFrom,
            dateTo: searchParams.dateTo,
            sortBy: searchParams.sortBy || 'applicationDate',
            sortOrder: searchParams.sortOrder || 'desc',
            page: searchParams.page || 0,
            size: searchParams.size || 50
        };

        const queryString = buildQueryParams(allowedParams);
        const url = queryString ?
            `${CANDIDATE_ENDPOINTS.POTENTIAL}?${queryString}` :
            CANDIDATE_ENDPOINTS.POTENTIAL;

        return apiClient.get(url);
    },
    updateRating: (id, rating, ratingNotes = null) => {
        return apiClient.put(`/api/v1/candidates/${id}/rating`, {
            rating,
            ratingNotes
        });
    },

    // ENHANCED: Update status with rating and rejection reason
    updateStatusWithDetails: (id, status, rejectionReason = null, rating = null, ratingNotes = null) => {
        return apiClient.put(`/api/v1/candidates/${id}/status`, {
            status,
            rejectionReason,
            rating,
            ratingNotes
        });
    },



    // ===============================
    // CANDIDATE ANALYTICS AND HISTORY
    // ===============================

    // Get candidate analytics
    getAnalytics: (id) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.ANALYTICS(id));
    },

    // Get candidate timeline/history
    getTimeline: (id) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.TIMELINE(id));
    },

    // ===============================
    // BATCH OPERATIONS
    // ===============================

    // Batch delete candidates
    batchDelete: (candidateIds) => {
        return apiClient.delete(CANDIDATE_ENDPOINTS.BASE, {
            data: { candidateIds }
        });
    },

    // Batch move candidates to potential
    batchMoveToPotential: (candidateIds, reason = null) => {
        return apiClient.post(CANDIDATE_ENDPOINTS.BULK_UPDATE_STATUS, {
            updates: candidateIds.map(id => ({
                candidateId: id,
                status: 'POTENTIAL',
                reason
            }))
        });
    },

    // Batch restore candidates from potential
    batchRestoreFromPotential: (candidateIds, vacancyId) => {
        return apiClient.post(CANDIDATE_ENDPOINTS.BULK_UPDATE_STATUS, {
            updates: candidateIds.map(id => ({
                candidateId: id,
                status: 'APPLIED',
                vacancyId
            }))
        });
    },

    // ===============================
    // CANDIDATE VALIDATION AND CHECKS
    // ===============================

    // Check if candidate email exists
    checkEmailExists: (email, excludeId = null) => {
        const params = { email };
        if (excludeId) params.excludeId = excludeId;

        const queryString = buildQueryParams(params);
        return apiClient.get(`${CANDIDATE_ENDPOINTS.BASE}/check-email?${queryString}`);
    },

    // Validate candidate data before creation/update
    validateCandidate: (candidateData) => {
        return apiClient.post(`${CANDIDATE_ENDPOINTS.BASE}/validate`, candidateData);
    },

    // ===============================
    // FILE AND DOCUMENT MANAGEMENT
    // ===============================

    // Upload candidate resume
    uploadResume: (candidateId, file) => {
        const formData = new FormData();
        formData.append('resume', file);

        return apiClient.post(
            `${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/resume`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    },

    // Download candidate resume
    downloadResume: (candidateId) => {
        return apiClient.get(
            `${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/resume/download`,
            { responseType: 'blob' }
        );
    },

    // Delete candidate resume
    deleteResume: (candidateId) => {
        return apiClient.delete(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/resume`);
    },

    // ===============================
    // CANDIDATE NOTES AND COMMUNICATION
    // ===============================

    // Add note to candidate
    addNote: (candidateId, note) => {
        return apiClient.post(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/notes`, {
            content: note,
            timestamp: new Date().toISOString()
        });
    },

    // Get candidate notes
    getNotes: (candidateId) => {
        return apiClient.get(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/notes`);
    },

    // Update note
    updateNote: (candidateId, noteId, content) => {
        return apiClient.put(
            `${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/notes/${noteId}`,
            { content }
        );
    },

    // Delete note
    deleteNote: (candidateId, noteId) => {
        return apiClient.delete(
            `${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/notes/${noteId}`
        );
    },

    // ===============================
    // REPORTING AND EXPORT
    // ===============================

    // Export candidate data
    exportCandidates: (params = {}, format = 'csv') => {
        const queryString = buildQueryParams({ ...params, format });
        return apiClient.get(
            `${CANDIDATE_ENDPOINTS.BASE}/export?${queryString}`,
            { responseType: 'blob' }
        );
    },

    // Export potential candidates data
    exportPotentialCandidates: (params = {}, format = 'csv') => {
        const queryString = buildQueryParams({ ...params, format });
        return apiClient.get(
            `${CANDIDATE_ENDPOINTS.POTENTIAL}/export?${queryString}`,
            { responseType: 'blob' }
        );
    },

    // Generate candidate report
    generateReport: (candidateId, reportType = 'summary') => {
        return apiClient.get(
            `${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/report`,
            { params: { type: reportType } }
        );
    },

    // ===============================
    // UTILITY METHODS
    // ===============================

    // Get candidate statistics
    getStatistics: (filters = {}) => {
        const queryString = buildQueryParams(filters);
        const url = queryString ?
            `${CANDIDATE_ENDPOINTS.BASE}/statistics?${queryString}` :
            `${CANDIDATE_ENDPOINTS.BASE}/statistics`;

        return apiClient.get(url);
    },

    // Get potential candidates statistics
    getPotentialStatistics: () => {
        return apiClient.get(`${CANDIDATE_ENDPOINTS.POTENTIAL}/statistics`);
    },

    // Get candidate status history
    getStatusHistory: (candidateId) => {
        return apiClient.get(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/status-history`);
    },

    // ===============================
    // INTEGRATION HELPERS
    // ===============================

    // Prepare candidate for hiring (pre-fill employee form data)
    prepareForHiring: (candidateId) => {
        return apiClient.get(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/prepare-hiring`);
    },

    // Link candidate to vacancy
    linkToVacancy: (candidateId, vacancyId) => {
        return apiClient.post(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/link-vacancy`, {
            vacancyId
        });
    },

    // Unlink candidate from vacancy
    unlinkFromVacancy: (candidateId) => {
        return apiClient.delete(`${CANDIDATE_ENDPOINTS.BY_ID(candidateId)}/unlink-vacancy`);
    }
};