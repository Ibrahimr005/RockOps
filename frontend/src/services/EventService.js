// EventService.js - Handles API calls for event operations
import apiClient from '../utils/apiClient.js';
import { EVENT_ENDPOINTS } from '../config/api.config.js';

/**
 * Fetches all events from the API
 * @returns {Promise<Array>} - Promise resolving to array of events
 */
export const fetchEvents = async () => {
    try {
        const response = await apiClient.get(EVENT_ENDPOINTS.BASE);
        const data = response.data;

        // Convert eventTime to JavaScript Date object
        return data.map(event => ({
            ...event,
            date: new Date(event.eventTime),
        }));
    } catch (error) {
        console.error("Error fetching events:", error);
        throw error;
    }
};

/**
 * Creates a new event
 * @param {Object} eventData - Data for the event to create
 * @returns {Promise<Object>} - Promise resolving to created event
 */
export const createEvent = async (eventData) => {
    try {
        const response = await apiClient.post(EVENT_ENDPOINTS.CREATE, eventData);
        return response.data;
    } catch (error) {
        console.error("Error creating event:", error);
        throw error;
    }
};

/**
 * Cancels an event
 * @param {string} eventId - ID of the event to cancel
 * @returns {Promise<void>}
 */
export const cancelEvent = async (eventId) => {
    try {
        await apiClient.put(EVENT_ENDPOINTS.CANCEL(eventId));
    } catch (error) {
        console.error("Error cancelling event:", error);
        throw error;
    }
};

/**
 * Reschedules a cancelled event
 * @param {string} eventId - ID of the event to reschedule
 * @returns {Promise<void>}
 */
export const rescheduleEvent = async (eventId) => {
    try {
        await apiClient.put(EVENT_ENDPOINTS.RESCHEDULE(eventId));
    } catch (error) {
        console.error("Error rescheduling event:", error);
        throw error;
    }
};