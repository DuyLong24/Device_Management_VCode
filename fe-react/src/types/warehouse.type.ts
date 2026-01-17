export interface WarehouseGroup {
    _id: string;
    name: string;
    code?: string;
}

export interface WarehouseConfigColumn {
    key: string;
    title: string;
    type: 'text' | 'date' | 'status' | 'number';
}

export interface WarehouseConfigFilter {
    key: string;
    type: 'text' | 'select' | 'dateRange';
    label: string;
    source?: string;
}

export interface WarehouseConfig {
    columns: Array<{ key: string; title: string; type: string }>;
    filters: Array<{ key: string; type: string; label: string; source?: string }>;
    actions: string[];
    quickTransfers?: Array<{ to: string; label: string; style: string; description?: string }>;
}

export interface Warehouse {
    id: string;
    _id: string;
    name: string;
    code: string;
    description?: string;
    groupId: {
        _id: string;
        name: string;
        code?: string;
    } | string;
    orderIndex: number;
    color: string;
    icon: string;
    config: WarehouseConfig;
    count?: number;
}