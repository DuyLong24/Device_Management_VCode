
export const normalizeString = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

export const generateProjectCode = (name: string): string => {
    if (!name) return '';
    const normalized = normalizeString(name);
    return normalized
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_') // Replace non-alphanumeric with _
        .replace(/_+/g, '_')        // Collapse multiple _
        .replace(/^_|_$/g, '');     // Trim _
};
