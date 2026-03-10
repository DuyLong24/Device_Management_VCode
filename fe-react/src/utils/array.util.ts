import { message } from 'antd';

export const removeDuplicatesWithToast = (
    items: string[],
    itemName: string = 'mã'
): string[] => {
    if (!items || items.length === 0) return [];

    const uniqueSet = new Set(items);
    const uniqueItems = Array.from(uniqueSet);

    const duplicateCount = items.length - uniqueItems.length;

    if (duplicateCount > 0) {
        message.warning(`Đã tự động loại bỏ ${duplicateCount} ${itemName} bị trùng lặp trong danh sách!`);
    }

    return uniqueItems;
};
