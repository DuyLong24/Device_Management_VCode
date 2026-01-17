import { useState, useEffect } from 'react';
import { Form, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { EXPORT_STATUS } from '../constants/export-status.constant';
import type { DeviceExport } from '../types/export.type';
import { exportService } from '../services/export.service';

interface ProductItem {
    key: string;
    productCode: string;
    productName: string;
    quantity: number;
    inStock?: number;
}

// Mock data
const mockProductCodes = [
    { value: 'CAM-IN-001', label: 'CAM-IN-001 - Camera Indoor 2MP', inStock: 45 },
    { value: 'CAM-OUT-002', label: 'CAM-OUT-002 - Camera Outdoor 4MP', inStock: 78 },
    { value: 'NVR-4CH-001', label: 'NVR-4CH-001 - NVR 4 kênh', inStock: 20 },
    { value: 'MON-27-001', label: 'MON-27-001 - Màn hình 27 inch', inStock: 15 },
    { value: 'BAR-AUTO-001', label: 'BAR-AUTO-001 - Barrier tự động', inStock: 12 },
];

const mockProjects = [
    { value: 'project1', label: 'Dự án Smart City Hà Nội' },
    { value: 'project2', label: 'Dự án An ninh ABC' },
    { value: 'project3', label: 'Dự án Camera Quận 1' },
];

const mockCustomers = [
    { value: 'customer1', label: 'Công ty TNHH ABC' },
    { value: 'customer2', label: 'Công ty CP XYZ' },
    { value: 'customer3', label: 'Tập đoàn DEF' },
];

export const useCreateExport = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [productList, setProductList] = useState<ProductItem[]>([]);
    const [autoExportCode, setAutoExportCode] = useState('');

    useEffect(() => {
        const today = dayjs();
        const code = `PX-${today.format('YYYY-MM')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        setAutoExportCode(code);
    }, []);

    const handleFormChange = () => {
        setHasUnsavedChanges(true);
    };

    const getProductStock = (productCode: string): number => {
        const product = mockProductCodes.find((p) => p.value === productCode);
        return product?.inStock || 0;
    };

    const handleAddProduct = () => {
        const newProduct: ProductItem = {
            key: `product-${Date.now()}`,
            productCode: '',
            productName: '',
            quantity: 1,
        };
        setProductList([...productList, newProduct]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteProduct = (key: string) => {
        setProductList(productList.filter((item) => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleProductChange = (key: string, field: string, value: any) => {
        setProductList(
            productList.map((item) => {
                if (item.key === key) {
                    if (field === 'productCode') {
                        const product = mockProductCodes.find((p) => p.value === value);
                        return {
                            ...item,
                            productCode: value,
                            productName: product?.label.split(' - ')[1] || '',
                            inStock: product?.inStock || 0,
                        };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
        setHasUnsavedChanges(true);
    };

    const validateProductList = (): { valid: boolean; message?: string } => {
        if (productList.length === 0) {
            return { valid: false, message: 'Phiếu xuất phải có ít nhất 1 sản phẩm' };
        }

        const productCodes = productList.map((p) => p.productCode);
        const duplicates = productCodes.filter((code, index) => code && productCodes.indexOf(code) !== index);
        if (duplicates.length > 0) {
            return { valid: false, message: `Mã sản phẩm ${duplicates[0]} đã tồn tại trong phiếu` };
        }

        for (const product of productList) {
            if (!product.productCode) {
                return { valid: false, message: 'Vui lòng chọn mã sản phẩm cho tất cả các dòng' };
            }
            if (!product.quantity || product.quantity <= 0) {
                return { valid: false, message: 'Số lượng phải lớn hơn 0' };
            }

            const inStock = getProductStock(product.productCode);
            if (product.quantity > inStock) {
                return {
                    valid: false,
                    message: `Mã sản phẩm ${product.productCode} chỉ còn ${inStock} sản phẩm trong kho`,
                };
            }
        }

        return { valid: true };
    };

    const handleSaveDraft = async () => {
        try {
            const formValues = await form.validateFields();
            const productValidation = validateProductList();

            if (!productValidation.valid) {
                message.error(productValidation.message);
                return;
            }

            setLoading(true);

            const payload = {
                ...formValues,
                code: autoExportCode,
                status: EXPORT_STATUS.DRAFT,
                requirements: productList.map((p) => ({
                    productCode: p.productCode,
                    productName: p.productName,
                    quantity: p.quantity,
                })),
                totalProductCodes: productList.length,
                totalQuantity: productList.reduce((sum, p) => sum + p.quantity, 0),
                items: [],
            };

            const res = await exportService.create(payload);
            if (res.data) {
                message.success('Lưu nháp phiếu xuất thành công');
                setHasUnsavedChanges(false);
                const exportData = res.data as DeviceExport;
                navigate(`/export/${exportData.id || exportData._id}`);
            }
        } catch (error: any) {
            logger.error('Failed to save draft', { error, module: 'useCreateExport', action: 'saveDraft' });
            if (error.errorFields && error.errorFields.length > 0) {
                const firstError = error.errorFields[0];
                message.error(firstError.errors[0]);
                form.scrollToField(firstError.name);
            } else {
                message.error('Không thể lưu nháp phiếu xuất');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndSubmit = async () => {
        try {
            const formValues = await form.validateFields();
            const productValidation = validateProductList();

            if (!productValidation.valid) {
                message.error(productValidation.message);
                return;
            }

            setLoading(true);

            const payload = {
                ...formValues,
                code: autoExportCode,
                status: EXPORT_STATUS.PENDING_APPROVAL,
                requirements: productList.map((p) => ({
                    productCode: p.productCode,
                    productName: p.productName,
                    quantity: p.quantity,
                })),
                totalProductCodes: productList.length,
                totalQuantity: productList.reduce((sum, p) => sum + p.quantity, 0),
                items: [],
            };

            const res = await exportService.create(payload);
            if (res.data) {
                message.success('Tạo phiếu xuất và gửi duyệt thành công!');
                setHasUnsavedChanges(false);
                const exportData = res.data as DeviceExport;
                navigate(`/export/${exportData.id || exportData._id}`);
            }
        } catch (error: any) {
            logger.error('Failed to submit export', { error, module: 'useCreateExport', action: 'saveAndSubmit' });
            if (error.errorFields && error.errorFields.length > 0) {
                const firstError = error.errorFields[0];
                message.error(firstError.errors[0]);
                form.scrollToField(firstError.name);
            } else {
                message.error('Không thể tạo phiếu xuất');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            Modal.confirm({
                title: 'Xác nhận thoát',
                content: 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn thoát?',
                okText: 'Thoát',
                cancelText: 'Ở lại',
                okButtonProps: { danger: true },
                onOk: () => navigate('/export/list'),
            });
        } else {
            navigate('/export/list');
        }
    };

    return {
        form,
        loading,
        hasUnsavedChanges,
        setHasUnsavedChanges: handleFormChange,

        productList,
        autoExportCode,

        handleAddProduct,
        handleDeleteProduct,
        handleProductChange,
        getProductStock,

        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,

        mockProductCodes,
        mockProjects,
        mockCustomers,

        navigate,
    };
};
