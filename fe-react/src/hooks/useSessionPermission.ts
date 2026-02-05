import { useCallback } from 'react';
import { message } from 'antd';
import { useAuth } from './useAuth';

export function useSessionPermission(permissionKey: string)//Key permission cần check
{
    const { hasPermission } = useAuth();
    const canAccess = hasPermission(permissionKey); //canAccess để hiển thị UI, guardAction để bảo vệ hành động

    // Bọc action trong permission check để tránh lặp lại logic if/return
    const guardAction = useCallback((action: () => void | Promise<void>) => {
        if (!canAccess) // Dùng canAccess để ẩn/hiện nút
        {
            message.error('Bạn không có quyền thực hiện thao tác này');
            return;
        }
        return action();
    }, [canAccess]);

    return { canAccess, guardAction };
}
