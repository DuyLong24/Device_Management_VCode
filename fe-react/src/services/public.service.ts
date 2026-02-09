import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const publicService = {
    checkWarranty: async (serial: string) => {
        const response = await axios.get(`${API_URL}/public/devices/warranty-check`, {
            params: { serial }
        });
        return response.data;
    }
};
