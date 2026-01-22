import { useState, useEffect } from 'react';
import {
    App,
    Card,
    Button,
    Space,
    Form,
    Input,
    DatePicker,
    Select,
    InputNumber,
    Table,
    Tag,
    Typography,
    Modal,
    Tabs,
    Upload,
    Badge,
    Alert,
    Tooltip
} from 'antd';
import {
    SaveOutlined,
    CloseOutlined,
    PlusOutlined,
    DeleteOutlined,
    BarcodeOutlined,
    UploadOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    ImportOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';

import { importService } from '../../services/import.service';
import { sharedDataService } from '../../services/shared-data.service';
import { userService } from '../../services/user.service';
import { categoryService } from '../../services/category.service';
import { deviceService } from '../../services/device.service';

import { ImportWizardModal } from '../../components/ImportWizard/ImportWizardModal';
import { type FieldDefinition } from '../../components/ImportWizard/steps/Step3_Mapping';
// import type { DataImportSession } from '../../services/data-import.service';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface ProductItem {
    key: string;
    productCode: string;
    quantity: number;
    boxCount: number | null;
    itemsPerBox: number | null;
    macImported: number;
    expectedMacs: string[];
}

export default function CreateImportPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const [form] = Form.useForm();
    const { message, modal } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [productList, setProductList] = useState<ProductItem[]>([]);

    // Data States
    const [userOptions, setUserOptions] = useState<{ label: string, value: string }[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);
    const [modelOptions, setModelOptions] = useState<{ label: string, value: string }[]>([]);

    // [NEW] Modal State
    const [isMacModalOpen, setIsMacModalOpen] = useState(false);
    const [currentProductKey, setCurrentProductKey] = useState<string | null>(null);
    const [tempMacs, setTempMacs] = useState<string>('');
    const [activeTab, setActiveTab] = useState('manual');
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
    const [originOptions, setOriginOptions] = useState<any[]>([]); // Data from Shared Data Service

    // Field Definitions
    const IMPORT_TICKET_FIELDS: FieldDefinition[] = [
        { key: 'productCode', label: 'Mã sản phẩm', required: true, description: 'SKU của sản phẩm' },
        { key: 'mac', label: 'MAC Address', required: true, description: 'Địa chỉ MAC (Duy nhất)' },
        { key: 'serial', label: 'Serial Number', required: false, description: 'Số Serial (Tùy chọn)' },
        { key: 'quantity', label: 'Số lượng', required: false, description: 'Mặc định là 1 nếu có MAC' },
        { key: 'boxCount', label: 'Số hộp', required: false },
        { key: 'itemsPerBox', label: 'Số SP/Hộp', required: false },
    ];

    const generateImportCode = () => {
        const today = dayjs();
        const dateStr = today.format('DD/MM/YYYY');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        // Format: PN-dd/MM/yyyy-xxx
        return `PN-${dateStr}-${random}`;
    };

    useEffect(() => {
        const initData = async () => {
            try {
                // Load Dropdown Options
                const [users, categories, devices] = await Promise.all([
                    userService.getAll(),
                    categoryService.getAll(),
                    deviceService.getAll()
                ]);

                setUserOptions(users.map((u: any) => ({ label: u.name, value: u.username })));
                setCategoryOptions(categories.map((c: any) => ({ label: c.name, value: c.name })));

                // [NEW] Load Shared Data (Model)
                const models = await sharedDataService.getDataByGroupCode('MODEL');
                if (models && models.length > 0) {
                    setModelOptions(models.map(m => ({ label: m.name, value: m.code })));
                } else {
                    // Fallback to existing devices if no shared data found (optional, but good for transition)
                    const deviceList = (devices as any).docs || (devices as any).data || (Array.isArray(devices) ? devices : []);
                    const fallbackModels = [...new Set(deviceList.map((d: any) => d.deviceModel))];
                    if (fallbackModels.length > 0) {
                        setModelOptions(fallbackModels.map(m => ({ label: m as string, value: m as string })));
                    }
                }

                // Handle Edit Mode or Create Mode
                if (isEditMode) {
                    const res = await importService.getImportDetail(id!);
                    const data = res.data;

                    if (data.status !== 'DRAFT') {
                        message.warning('Chỉ có thể sửa phiếu nhập ở trạng thái NHÁP');
                        navigate('/import/list');
                        return;
                    }

                    form.setFieldsValue({
                        ...data,
                        importDate: dayjs(data.importDate),
                        // details map automatically if names match
                    });

                    // Map products
                    const mappedProducts: ProductItem[] = data.products.map((p: any, index: number) => ({
                        key: p._id || `prod-${index}`,
                        productCode: p.productCode,
                        quantity: p.quantity,
                        boxCount: p.boxCount,
                        itemsPerBox: p.itemsPerBox,
                        expectedMacs: p.expectedMacs || [],
                        macImported: p.macImported || 0,
                    }));
                    setProductList(mappedProducts);

                } else {
                    // Create Mode: New Code
                    form.setFieldValue('code', generateImportCode());
                }

                // [NEW] Load Shared Data (Origin)
                const origins = await sharedDataService.getDataByGroupCode('ORIGIN');
                if (origins && origins.length > 0) {
                    setOriginOptions(origins.map((o: any) => ({
                        label: o.name,
                        value: o.code
                    })));
                }

            } catch (error) {
                console.error('Init data failed:', error);
                message.error('Không thể tải dữ liệu');
            }
        };

        initData();
    }, [id, isEditMode]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleFormChange = () => setHasUnsavedChanges(true);

    const handleAddProduct = () => {
        const newProduct: ProductItem = {
            key: `product-${Date.now()}`,
            productCode: '',
            quantity: 1,
            boxCount: null,
            itemsPerBox: null,
            expectedMacs: [],
            macImported: 0
        };
        setProductList([...productList, newProduct]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteProduct = (key: string) => {
        setProductList(productList.filter(item => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleProductChange = (key: string, field: string, value: any) => {
        setProductList(productList.map(item => {
            if (item.key === key) {
                const newItem = { ...item, [field]: value };
                if (field === 'productCode') {
                    newItem.expectedMacs = [];
                }
                return newItem;
            }
            return item;
        }));
        setHasUnsavedChanges(true);
    };


    const openMacModal = (record: ProductItem) => {
        setCurrentProductKey(record.key);
        setTempMacs(record.expectedMacs.join('\n'));
        setIsMacModalOpen(true);
        setActiveTab('manual');
    };

    const handleSaveMacs = () => {
        if (!currentProductKey) return;
        // 1. Parse text thành mảng & loại bỏ dòng trống
        const rawList = tempMacs.split('\n').map(s => s.trim()).filter(s => s !== '');

        // 2. Loại bỏ trùng lặp nội bộ
        const uniqueList = [...new Set(rawList)];

        // 3. Update vào productList
        setProductList(productList.map(p => {
            if (p.key === currentProductKey) {
                return { ...p, expectedMacs: uniqueList };
            }
            return p;
        }));

        // 4. Validate warning UI
        if (uniqueList.length !== rawList.length) {
            message.warning(`Đã loại bỏ ${rawList.length - uniqueList.length} MAC trùng lặp.`);
        } else {
            message.success('Đã cập nhật danh sách MAC');
        }

        setIsMacModalOpen(false);
        setHasUnsavedChanges(true);
    };

    const handleExcelUpload: UploadProps['beforeUpload'] = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                // Đọc cột A (dòng đầu có thể là header)
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                const extractedSerials: string[] = [];
                // Bỏ qua dòng đầu (index 0)
                jsonData.slice(1).forEach(row => {
                    if (row[0]) extractedSerials.push(String(row[0]).trim());
                });

                // Merge vào textarea hiện tại
                const current = tempMacs ? tempMacs.split('\n') : [];
                const merged = [...current, ...extractedSerials].filter(s => s.trim() !== '');
                setTempMacs(merged.join('\n'));

                message.success(`Đã đọc được ${extractedSerials.length} MAC từ file Excel`);
                setActiveTab('manual'); // Chuyển về tab manual để review

            } catch (err) {
                message.error('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.');
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    // --- VALIDATION & SUBMIT ---

    const validateProductList = (): { valid: boolean; message?: string } => {
        if (productList.length === 0) return { valid: false, message: 'Vui lòng thêm ít nhất 1 sản phẩm' };
        for (const p of productList) {
            if (!p.productCode) return { valid: false, message: 'Vui lòng chọn Mã sản phẩm' };
            if (p.quantity <= 0) return { valid: false, message: 'Số lượng phải lớn hơn 0' };

        }
        return { valid: true };
    };

    const submitImport = async (targetStatus: 'DRAFT' | 'PUBLIC') => {
        try {
            const values = await form.validateFields();
            const validation = validateProductList();

            if (!validation.valid) {
                message.error(validation.message);
                return;
            }

            setLoading(true);

            const payload = {
                code: values.code,
                productType: values.productType,
                origin: values.origin,
                importDate: values.importDate.toISOString(),
                importedBy: values.importedBy,
                supplier: values.supplier,
                handoverPerson: values.handoverPerson,
                notes: values.notes,
                status: targetStatus,
                products: productList.map(p => ({
                    productCode: p.productCode,
                    quantity: p.quantity,
                    boxCount: p.boxCount || undefined,
                    itemsPerBox: p.itemsPerBox || undefined,
                    expectedMacs: p.expectedMacs
                })),
            };

            let finalId = id;

            if (isEditMode) {
                await importService.updateImport(id!, payload);
                message.success(targetStatus === 'DRAFT' ? 'Cập nhật nháp thành công' : 'Cập nhật & Chuyển trạng thái thành công');
            } else {
                const res = await importService.createImport(payload);
                message.success(targetStatus === 'DRAFT' ? 'Lưu nháp thành công' : 'Tạo phiếu thành công');
                finalId = res?.data?.id || (res?.data as any)?._id;
            }

            setHasUnsavedChanges(false);

            if (targetStatus === 'DRAFT') {
                if (isEditMode) {
                    // Nếu đang sửa nháp -> Ở lại trang để sửa tiếp
                    message.success('Cập nhật nháp thành công');
                } else {
                    // Nếu tạo mới nháp -> Chuyển sang trang edit
                    if (finalId) {
                        navigate(`/import/edit/${finalId}`);
                    } else {
                        navigate('/import/list');
                    }
                }
            } else {
                if (finalId) {
                    navigate(`/import/${finalId}`);
                } else {
                    message.warning('Phiếu đã xử lý nhưng không lấy được ID để chuyển trang.');
                    navigate('/import/list');
                }
            }

        } catch (error) {
            console.error(error);
            message.error('Có lỗi xảy ra khi xử lý phiếu');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            modal.confirm({
                title: 'Xác nhận thoát',
                content: 'Dữ liệu chưa lưu sẽ bị mất? Bạn có chắc chắn muốn hủy?',
                okText: 'Thoát',
                cancelText: 'Ở lại',
                onOk: () => navigate('/import/list'),
            });
        } else {
            navigate('/import/list');
        }
    };

    const productColumns: TableColumnsType<ProductItem> = [
        {
            title: <span className="font-semibold"><span className="text-red-500 mr-1" aria-hidden="true">*</span>Mã sản phẩm (Model)</span>,
            dataIndex: 'productCode',
            key: 'productCode',
            width: '25%',
            render: (value, record) => (
                <Select
                    showSearch
                    mode="tags"
                    maxCount={1}
                    value={value ? [value] : []}
                    placeholder="Chọn hoặc nhập mã SP"
                    className="w-full"
                    options={modelOptions}
                    onChange={(val) => handleProductChange(record.key, 'productCode', val ? val[0] : '')}
                />
            ),
        },
        {
            title: <span className="font-semibold"><span className="text-red-500 mr-1" aria-hidden="true">*</span>Số lượng</span>,
            dataIndex: 'quantity',
            key: 'quantity',
            width: '10%',
            render: (value, record) => (
                <InputNumber
                    min={1}
                    value={value}
                    className="w-full"
                    onChange={(val) => handleProductChange(record.key, 'quantity', val || 1)}
                />
            ),
        },
        {
            title: <span className="font-semibold">Quy cách (Hộp x Chiếc)</span>,
            key: 'packaging',
            width: '20%',
            render: (_, record) => (
                <div className="flex items-center space-x-2">
                    <InputNumber
                        min={1}
                        value={record.boxCount}
                        className="w-1/2"
                        placeholder="Hộp"
                        onChange={(val) => handleProductChange(record.key, 'boxCount', val)}
                    />
                    <span className="text-gray-400 select-none">x</span>
                    <InputNumber
                        // min={1}
                        value={record.itemsPerBox}
                        className="w-1/2"
                        placeholder="SP"
                        onChange={(val) => handleProductChange(record.key, 'itemsPerBox', val)}
                    />
                </div>
            ),
        },
        {
            title: <span className="font-semibold text-center block">Danh sách MAC</span>,
            key: 'macs',
            width: '20%',
            align: 'center',
            render: (_, record) => {
                const count = record.expectedMacs.length;
                const isMatch = count === record.quantity;
                const isEmpty = count === 0;

                return (
                    <Badge count={count} offset={[-5, 5]} color={isMatch ? '#52c41a' : '#ff4d4f'}>
                        <Button
                            type={isEmpty ? 'dashed' : 'default'}
                            icon={<BarcodeOutlined />}
                            className={!isMatch && !isEmpty ? 'border-red-500 text-red-500' : ''}
                            onClick={() => openMacModal(record)}
                        >
                            {isEmpty ? 'Nhập MAC' : 'Chi tiết'}
                        </Button>
                    </Badge>
                );
            }
        },
        {
            title: <span className="font-semibold text-center block">Trạng thái</span>,
            key: 'check',
            width: '15%',
            align: 'center',
            render: (_, record) => {
                const serialMatch = record.expectedMacs.length === record.quantity;
                const serialEmpty = record.expectedMacs.length === 0;

                return (
                    <Space direction="vertical" size="small">
                        {!serialEmpty && (serialMatch ? <Tag color="blue">Đủ MAC</Tag> : <Tag color="warning">MAC chưa khớp SL</Tag>)}
                        {serialEmpty && <Tag color="default">Chưa nhập MAC</Tag>}
                    </Space>
                )
            }
        },
        {
            title: <span className="sr-only">Thao tác</span>,
            key: 'action',
            width: '10%',
            align: 'center',
            render: (_, record) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteProduct(record.key)}
                />
            ),
        },
    ];

    return (
        <main className="p-6 pb-24 max-w-none mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <Title level={2} className="mb-1! text-2xl! font-bold text-gray-800">
                        {isEditMode ? 'Cập nhật phiếu nhập kho' : 'Thêm mới phiếu nhập kho'}
                    </Title>
                    <Text className="text-gray-500">
                        {isEditMode ? 'Chỉnh sửa thông tin phiếu nhập' : 'Tạo phiếu nhập và khai báo Serial (nếu có)'}
                    </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button icon={<SaveOutlined />} onClick={() => submitImport('DRAFT')} loading={loading}>
                        {isEditMode ? 'Cập nhật Nháp' : 'Lưu nháp'}
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => submitImport('PUBLIC')} loading={loading} className="bg-blue-600 hover:bg-blue-700">
                        Lưu & đóng
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel}>
                        Hủy
                    </Button>
                </div>
            </header>

            {/* Form Section */}
            <section aria-labelledby="general-info-headikng">
                <Card title={<span id="general-info-heading" className="text-lg font-semibold">Thông tin chung phiếu nhập</span>} className="mb-6 shadow-sm border-gray-200" bordered={false}>
                    <Form
                        form={form}
                        layout="vertical"
                        onValuesChange={handleFormChange}
                        initialValues={{ importDate: dayjs(), origin: 'IMPORT', productType: 'Camera' }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6"
                    >
                        <Form.Item
                            name="code"
                            label={
                                <span>
                                    Mã phiếu nhập{' '}
                                    <Tooltip title="Mã tự sinh theo đợt xuất kho, có thể chỉnh sửa">
                                        <InfoCircleOutlined className="text-gray-400" />
                                    </Tooltip>
                                </span>
                            }
                            className="col-span-1" rules={[{ required: true, message: 'Vui lòng nhập mã phiếu' }]}>
                            <Input placeholder="Nhập mã phiếu nhập" className="font-semibold text-blue-600" />
                        </Form.Item>

                        <Form.Item name="productType" label="Loại hàng hóa" rules={[{ required: true }]} className="col-span-1 md:col-span-2 lg:col-span-1">
                            <Select placeholder="Chọn loại hàng" options={categoryOptions} />
                        </Form.Item>

                        <Form.Item name="origin" label="Nguồn gốc" rules={[{ required: true }]} className="col-span-1">
                            <Select options={originOptions} placeholder="Chọn nguồn gốc" />
                        </Form.Item>

                        <Form.Item name="importDate" label="Ngày nhập" rules={[{ required: true }]} className="col-span-1">
                            <DatePicker className="w-full" format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item name="importedBy" label="Người nhập kho" rules={[{ required: true }]} className="col-span-1">
                            <Select placeholder="Chọn người nhập" options={userOptions} showSearch optionFilterProp="label" />
                        </Form.Item>

                        <Form.Item name="supplier" label="Đơn vị xuất (Tùy chọn)" className="col-span-1 md:col-span-2 lg:col-span-1">
                            <Input placeholder="Nhập tên nhà cung cấp" />
                        </Form.Item>

                        <Form.Item name="handoverPerson" label="Người bàn giao" className="col-span-1 md:col-span-2 lg:col-span-1">
                            <Input placeholder="Tên người giao hàng" />
                        </Form.Item>

                        <Form.Item name="notes" label="Ghi chú" className="col-span-1 md:col-span-2 lg:col-span-3">
                            <TextArea rows={2} placeholder="Ghi chú thêm..." className="resize-none" />
                        </Form.Item>
                    </Form>
                </Card>
            </section>

            {/* Product Table Section */}
            <section aria-labelledby="product-list-heading">
                <Card
                    title={<span id="product-list-heading" className="text-lg font-semibold">Danh sách sản phẩm ({productList.length})</span>}
                    className="shadow-sm border-gray-200"
                    bordered={false}
                    extra={
                        <Space>
                            <Button icon={<ImportOutlined />} onClick={() => setIsImportWizardOpen(true)}>Import Excel Tổng</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProduct} className="bg-blue-600 hover:bg-blue-700">
                                Thêm mã sản phẩm
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        columns={productColumns}
                        dataSource={productList}
                        pagination={false}
                        bordered
                        size="middle"
                        locale={{ emptyText: 'Chưa có sản phẩm nào. Bấm "Thêm mã sản phẩm" để bắt đầu.' }}
                        rowClassName="align-middle"
                    />

                    {productList.length > 0 && (
                        <div className="mt-6 flex justify-end items-center gap-2">
                            <span className="text-gray-600">Tổng số lượng:</span>
                            <span className="text-xl font-bold text-green-600">
                                {productList.reduce((acc, cur) => acc + (cur.quantity || 0), 0)}
                            </span>
                        </div>
                    )}
                </Card>
            </section >

            {/* Sticky Footer */}
            {/* Sticky Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                <div className="max-w-7xl mx-auto flex justify-end gap-3">
                    <Button icon={<SaveOutlined />} onClick={() => submitImport('DRAFT')} loading={loading} size="large" className="min-w-30">
                        Lưu nháp
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => submitImport('PUBLIC')} loading={loading} size="large" className="bg-blue-600 hover:bg-blue-700 min-w-50">
                        Lưu & đóng
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel} size="large" className="min-w-25">
                        Hủy
                    </Button>
                </div>
            </footer>

            {/* MODAL NHẬP MAC */}
            <Modal
                title="Nhập danh sách MAC"
                open={isMacModalOpen}
                onOk={handleSaveMacs}
                onCancel={() => setIsMacModalOpen(false)}
                width={700}
                okText="Cập nhật"
                cancelText="Hủy"
            >
                <Alert
                    message="Hướng dẫn"
                    description="Bạn có thể nhập thủ công (mỗi MAC 1 dòng) hoặc tải lên file Excel (cột A chứa MAC)."
                    type="info"
                    showIcon
                    className="mb-4"
                />

                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    {/* NHẬP TAY */}
                    <TabPane
                        tab={<span><FileTextOutlined /> Nhập thủ công</span>}
                        key="manual"
                    >
                        <TextArea
                            rows={10}
                            placeholder="MAC-001&#10;MAC-002&#10;MAC-003..."
                            value={tempMacs}
                            onChange={(e) => setTempMacs(e.target.value)}
                            className="font-mono text-sm"
                        />
                        <div className="flex justify-between mt-2 text-gray-500">
                            <span>Đã nhập: {tempMacs.split('\n').filter(s => s.trim()).length} dòng</span>
                            {currentProductKey && (
                                <span>Yêu cầu: {productList.find(p => p.key === currentProductKey)?.quantity}</span>
                            )}
                        </div>
                    </TabPane>

                    {/* EXCEL */}
                    <TabPane
                        tab={<span><FileExcelOutlined /> Upload Excel</span>}
                        key="excel"
                    >
                        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="mb-4">
                                <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                            </div>
                            <Title level={5}>Tải lên file danh sách MAC</Title>
                            <Text type="secondary" className="block mb-4">
                                File Excel cần có cột đầu tiên (A) chứa mã MAC. Dòng 1 là tiêu đề (bỏ qua).
                            </Text>
                            <Upload
                                beforeUpload={handleExcelUpload}
                                showUploadList={false}
                                accept=".xlsx, .xls"
                            >
                                <Button icon={<UploadOutlined />} size="large">Chọn file Excel</Button>
                            </Upload>
                        </div>
                    </TabPane>
                </Tabs>

            </Modal>

            {/* IMPORT WIZARD - Moved outside of Serial Modal */}
            <ImportWizardModal
                open={isImportWizardOpen}
                onCancel={() => setIsImportWizardOpen(false)}
                strategy="IMPORT_TICKET"
                fieldDefinitions={IMPORT_TICKET_FIELDS}
                onSuccess={(details) => {
                    if (!details || details.length === 0) return;

                    // Aggregate data by Product Code
                    const productMap = new Map<string, {
                        quantity: number;
                        boxCount: number | null;
                        itemsPerBox: number | null;
                        serials: string[];
                    }>();

                    details.forEach((row: any) => {
                        const pCode = row.productCode;
                        if (!pCode) return;

                        const current = productMap.get(pCode) || {
                            quantity: 0,
                            boxCount: row.boxCount || null,
                            itemsPerBox: row.itemsPerBox || null,
                            serials: [] as string[]
                        };

                        let qty = Number(row.quantity) || 0;
                        if (row.mac && qty === 0) qty = 1;

                        current.quantity += qty;
                        if (row.mac) current.serials.push(row.mac);

                        // Update packaging info
                        if (!current.boxCount && row.boxCount) current.boxCount = row.boxCount;
                        if (!current.itemsPerBox && row.itemsPerBox) current.itemsPerBox = row.itemsPerBox;

                        productMap.set(pCode, current);
                    });

                    // Merge into existing productList
                    setProductList(prev => {
                        const nextList = [...prev];

                        productMap.forEach((data, code) => {
                            const existingIndex = nextList.findIndex(p => p.productCode === code);

                            if (existingIndex > -1) {
                                // Update existing
                                const existing = nextList[existingIndex];
                                nextList[existingIndex] = {
                                    ...existing,
                                    quantity: existing.quantity + data.quantity,
                                    expectedMacs: [...new Set([...existing.expectedMacs, ...data.serials])],
                                };
                            } else {
                                // Add new
                                nextList.push({
                                    key: `import-${code}-${Date.now()}`,
                                    productCode: code,
                                    quantity: data.quantity,
                                    boxCount: data.boxCount,
                                    itemsPerBox: data.itemsPerBox,
                                    macImported: 0,
                                    expectedMacs: data.serials
                                });
                            }
                        });
                        return nextList;
                    });

                    setHasUnsavedChanges(true);
                }}
            />
        </main>
    );
}