
import { axiosInstance } from "../configs/axios.config";

export interface DataImportSession {
    sessionId: string;
    sheets: string[];
    preview: {
        headers: string[];
        sample: any[][];
        totalRows: number;
    };
}

export interface ValidationSummary {
    total: number;
    valid: number;
    invalid: number;
    details: Array<{
        valid: boolean;
        row: number;
        data: any;
        errors: string[];
    }>;
}

export const dataImportService = {
    upload: async (file: File): Promise<DataImportSession> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axiosInstance.post('/data-import/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getPreview: async (sessionId: string, sheetName: string, headerRow: number) => {
        const response = await axiosInstance.post(`/data-import/${sessionId}/preview`, {
            sheetName, headerRow
        });
        return response.data;
    },

    validate: async (sessionId: string, mapping: Record<string, string>, strategy: string, payload?: any): Promise<ValidationSummary> => {
        const response = await axiosInstance.post(`/data-import/${sessionId}/validate`, {
            mapping, strategy, payload
        });
        return response.data;
    },

    execute: async (sessionId: string, strategy: string, payload?: any) => {
        const response = await axiosInstance.post(`/data-import/${sessionId}/execute`, {
            strategy, payload
        });
        return response.data;
    }
};
