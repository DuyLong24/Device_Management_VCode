import { useQuery } from '@tanstack/react-query';
import { deviceService } from '../services/device.service';
import type { ProductSummary } from '../pages/Dashboard/components/DashboardTable';

export const useDashboard = () => {
    // Lấy thống kê
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await deviceService.getStatistics();
            return res;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const stats = {
        total: data?.total || 0,
        imported: data?.READY_TO_EXPORT || 0, // "Trong kho" (Sẵn sàng xuất)
        exported: (data?.SOLD || 0) + (data?.REMOVED || 0), // "Đã xuất"
        pending: data?.PENDING_QC || 0,
        defect: data?.DEFECT || 0,
    };

    // Tạo mảng sản phẩm
    const productBreakdown: ProductSummary[] = (data?.categoryBreakdown || []).map((item: ProductSummary) => ({
        key: item.key,
        productType: item.productType,
        totalPurchased: item.totalPurchased,
        pending: item.pending,
        imported: item.imported,
        exported: item.exported,
        defect: item.defect,
        defectRate: item.defectRate
    }));

    // Tạo mảng cho biểu đồ
    const chartData = productBreakdown.map(item => ({
        name: item.productType,
        pending: item.pending,
        imported: item.imported,
        exported: item.exported,
        defect: item.defect
    }));

    return {
        loading: isLoading,
        stats,
        productBreakdown,
        chartData,
        refresh: refetch
    };
};
