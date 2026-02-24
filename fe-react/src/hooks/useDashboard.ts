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
        pendingQc: data?.PENDING_QC || 0,
        underRepair: data?.UNDER_REPAIR || 0,
        readyToExport: data?.READY_TO_EXPORT || 0,
        defect: data?.DEFECT || 0,
        inWarranty: data?.IN_WARRANTY || 0,
        notActivated: data?.NOT_ACTIVATED || 0,
        sold: data?.SOLD || 0,
        soldWarranty: data?.SOLD_WARRANTY || 0,
        removed: data?.REMOVED || 0,
    };

    // Tạo mảng sản phẩm
    const productBreakdown: ProductSummary[] = (data?.categoryBreakdown || []).map((item: any) => ({
        key: item.key,
        productType: item.productType,
        totalPurchased: item.totalPurchased,
        pendingQc: item.pendingQc,
        underRepair: item.underRepair,
        readyToExport: item.readyToExport,
        defect: item.defect,
        inWarranty: item.inWarranty,
        notActivated: item.notActivated,
        sold: item.sold,
        soldWarranty: item.soldWarranty,
        removed: item.removed,
        defectRate: item.defectRate
    }));

    // Tạo mảng cho biểu đồ
    const chartData = productBreakdown.map(item => ({
        name: item.productType,
        pendingQc: item.pendingQc,
        underRepair: item.underRepair,
        readyToExport: item.readyToExport,
        defect: item.defect,
        inWarranty: item.inWarranty,
        notActivated: item.notActivated,
        sold: item.sold,
        soldWarranty: item.soldWarranty,
        removed: item.removed
    }));

    return {
        loading: isLoading,
        stats,
        productBreakdown,
        chartData,
        refresh: refetch
    };
};
