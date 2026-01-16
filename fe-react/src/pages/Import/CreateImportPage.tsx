import { useState, useEffect } from 'react';
import {
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
    message,
    Modal,
    Tabs,
    Upload,
    Badge,
    Alert
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
    ImportOutlined
} from '@ant-design/icons';
import type { TableColumnsType, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

import { importService } from '../../services/import.service';
import { userService } from '../../services/user.service';
import { categoryService } from '../../services/category.service';
import { deviceService } from '../../services/device.service';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface ProductItem {
    key: string;
    productCode: string;
    quantity: number;
    boxCount: number;
    itemsPerBox: number;
    serialImported: number;
    expectedSerials: string[];
}

export default function CreateImportPage() {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [productList, setProductList] = useState<ProductItem[]>([]);

    // Data States
    const [userOptions, setUserOptions] = useState<{ label: string, value: string }[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);
    const [modelOptions, setModelOptions] = useState<{ label: string, value: string }[]>([]);

    // [NEW] Modal State
    const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
    const [currentProductKey, setCurrentProductKey] = useState<string | null>(null);
    const [tempSerials, setTempSerials] = useState<string>('');
    const [activeTab, setActiveTab] = useState('manual');

    useEffect(() => {
        const initData = async () => {
            try {
                const [users, categories, devices] = await Promise.all([
                    userService.getAll(),
                    categoryService.getAll(),
                    deviceService.getAll()
                ]);

                setUserOptions(users.map((u: any) => ({ label: u.name, value: u.username })));
                setCategoryOptions(categories.map((c: any) => ({ label: c.name, value: c.name })));

                const deviceList = (devices as any).docs || (devices as any).data || (Array.isArray(devices) ? devices : []);

                const models = [...new Set(deviceList.map((d: any) => d.deviceModel))];
                setModelOptions(models.map(m => ({ label: m as string, value: m as string })));

            } catch (error) {
                console.error('Init data failed:', error);
                message.error('Không thể tải dữ liệu danh mục');
            }
        };

        initData();
    }, []);

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

    const checkPackagingMatch = (quantity: number, boxCount: number, itemsPerBox: number): boolean => {
        return quantity === boxCount * itemsPerBox;
    };

    const handleAddProduct = () => {
        const newProduct: ProductItem = {
            key: `product-${Date.now()}`,
            productCode: '',
            quantity: 1,
            boxCount: 1,
            itemsPerBox: 1,
            serialImported: 0,
            expectedSerials: []
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
                if (field === 'boxCount' || field === 'itemsPerBox') {
                    newItem.quantity = newItem.boxCount * newItem.itemsPerBox;
                }
                if (field === 'productCode') {
                    newItem.expectedSerials = [];
                }
                return newItem;
            }
            return item;
        }));
        setHasUnsavedChanges(true);
    };


    const openSerialModal = (record: ProductItem) => {
        setCurrentProductKey(record.key);
        setTempSerials(record.expectedSerials.join('\n'));
        setIsSerialModalOpen(true);
        setActiveTab('manual');
    };

    const handleSaveSerials = () => {
        if (!currentProductKey) return;

        // 1. Parse text thành mảng & loại bỏ dòng trống
        const rawList = tempSerials.split('\n').map(s => s.trim()).filter(s => s !== '');

        // 2. Loại bỏ trùng lặp nội bộ
        const uniqueList = [...new Set(rawList)];

        // 3. Update vào productList
        setProductList(productList.map(p => {
            if (p.key === currentProductKey) {
                return { ...p, expectedSerials: uniqueList };
            }
            return p;
        }));

        // 4. Validate warning UI
        if (uniqueList.length !== rawList.length) {
            message.warning(`Đã loại bỏ ${rawList.length - uniqueList.length} mã trùng lặp.`);
        } else {
            message.success('Đã cập nhật danh sách Serial');
        }

        setIsSerialModalOpen(false);
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
                // Bỏ qua dòng đầu (index 0) coi như header
                jsonData.slice(1).forEach(row => {
                    if (row[0]) extractedSerials.push(String(row[0]).trim());
                });

                // Merge vào textarea hiện tại
                const current = tempSerials ? tempSerials.split('\n') : [];
                const merged = [...current, ...extractedSerials].filter(s => s.trim() !== '');
                setTempSerials(merged.join('\n'));

                message.success(`Đã đọc được ${extractedSerials.length} serial từ file Excel`);
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

            if (p.expectedSerials.length > 0 && p.expectedSerials.length !== p.quantity) {
                return {
                    valid: false,
                    message: `Sản phẩm ${p.productCode}: Số lượng Serial (${p.expectedSerials.length}) không khớp với số lượng nhập (${p.quantity})`
                };
            }
        }
        return { valid: true };
    };

    const submitImport = async (targetStatus: 'DRAFT' | 'PENDING') => {
        try {
            const values = await form.validateFields();
            const validation = validateProductList();

            if (!validation.valid) {
                message.error(validation.message);
                return;
            }

            setLoading(true);

            const payload = {
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
                    boxCount: p.boxCount,
                    itemsPerBox: p.itemsPerBox,
                    expectedSerials: p.expectedSerials
                })),
            };

            const res = await importService.createImport(payload);
            message.success(targetStatus === 'DRAFT' ? 'Lưu nháp thành công' : 'Tạo phiếu thành công');
            setHasUnsavedChanges(false);

            if (targetStatus === 'DRAFT') {
                navigate('/import/list');
            } else {
                const newId = res.data.id || (res.data as any)._id;
                if (newId) {
                    navigate(`/import/inventory-check/${newId}`);
                } else {
                    message.warning('Phiếu đã tạo nhưng không lấy được ID để chuyển trang.');
                    navigate('/import/list');
                }
            }

        } catch (error) {
            console.error(error);
            message.error('Có lỗi xảy ra khi tạo phiếu');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            Modal.confirm({
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
            title: <span className="font-semibold">Quy cách</span>,
            key: 'packaging',
            width: '20%',
            render: (_, record) => (
                <div className="flex items-center space-x-2">
                    <InputNumber
                        min={1}
                        value={record.boxCount}
                        className="w-1/2"
                        placeholder="Hộp"
                        onChange={(val) => handleProductChange(record.key, 'boxCount', val || 1)}
                    />
                    <span className="text-gray-400 select-none">×</span>
                    <InputNumber
                        min={1}
                        value={record.itemsPerBox}
                        className="w-1/2"
                        placeholder="SP"
                        onChange={(val) => handleProductChange(record.key, 'itemsPerBox', val || 1)}
                    />
                </div>
            ),
        },
        {
            title: <span className="font-semibold text-center block">Danh sách Serial</span>,
            key: 'serials',
            width: '20%',
            align: 'center',
            render: (_, record) => {
                const count = record.expectedSerials.length;
                const isMatch = count === record.quantity;
                const isEmpty = count === 0;

                return (
                    <Badge count={count} offset={[-5, 5]} color={isMatch ? '#52c41a' : '#ff4d4f'}>
                        <Button
                            type={isEmpty ? 'dashed' : 'default'}
                            icon={<BarcodeOutlined />}
                            className={!isMatch && !isEmpty ? 'border-red-500 text-red-500' : ''}
                            onClick={() => openSerialModal(record)}
                        >
                            {isEmpty ? 'Nhập Serial' : 'Chi tiết'}
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
                const pkgMatch = checkPackagingMatch(record.quantity, record.boxCount, record.itemsPerBox);
                const serialMatch = record.expectedSerials.length === record.quantity;
                const serialEmpty = record.expectedSerials.length === 0;

                return (
                    <Space direction="vertical" size="small">
                        {pkgMatch ? <Tag color="success">Quy cách OK</Tag> : <Tag color="warning">Lệch Quy cách</Tag>}
                        {!serialEmpty && (serialMatch ? <Tag color="blue">Serial OK</Tag> : <Tag color="error">Lệch Serial</Tag>)}
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
                    <Title level={2} className="mb-1! text-2xl! font-bold text-gray-800">Thêm mới phiếu nhập kho</Title>
                    <Text className="text-gray-500">Tạo phiếu nhập và khai báo Serial (nếu có)</Text>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button icon={<SaveOutlined />} onClick={() => submitImport('DRAFT')} loading={loading}>
                        Lưu nháp
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => submitImport('PENDING')} loading={loading} className="bg-blue-600 hover:bg-blue-700">
                        Lưu & Nhập Serial
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel}>
                        Hủy
                    </Button>
                </div>
            </header>

            {/* Form Section */}
            <section aria-labelledby="general-info-heading">
                <Card title={<span id="general-info-heading" className="text-lg font-semibold">Thông tin chung phiếu nhập</span>} className="mb-6 shadow-sm border-gray-200" bordered={false}>
                    <Form
                        form={form}
                        layout="vertical"
                        onValuesChange={handleFormChange}
                        initialValues={{ importDate: dayjs(), origin: 'IMPORT', productType: 'Camera' }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6"
                    >
                        {/* Form items giữ nguyên như cũ... */}
                        <Form.Item label="Mã phiếu nhập" className="col-span-1">
                            <Input value="Hệ thống tự sinh sau khi lưu" disabled className="!text-gray-500! font-medium !bg-gray-100! cursor-not-allowed" />
                        </Form.Item>

                        <Form.Item name="productType" label="Loại hàng hóa" rules={[{ required: true }]} className="col-span-1 md:col-span-2 lg:col-span-1">
                            <Select placeholder="Chọn loại hàng" options={categoryOptions} />
                        </Form.Item>

                        <Form.Item name="origin" label="Nguồn gốc" rules={[{ required: true }]} className="col-span-1">
                            <Select>
                                <Select.Option value="DOMESTIC">Nội địa</Select.Option>
                                <Select.Option value="IMPORT">Nhập khẩu</Select.Option>
                                <Select.Option value="WARRANTY_RETURN">Trả bảo hành</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="importDate" label="Ngày nhập" rules={[{ required: true }]} className="col-span-1">
                            <DatePicker className="w-full" format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item name="importedBy" label="Người nhập kho" rules={[{ required: true }]} className="col-span-1">
                            <Select placeholder="Chọn người nhập" options={userOptions} showSearch optionFilterProp="label" />
                        </Form.Item>

                        <Form.Item name="supplier" label="Đơn vị xuất (Nhà cung cấp)" rules={[{ required: true }]} className="col-span-1 md:col-span-2 lg:col-span-1">
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
                            <Button icon={<ImportOutlined />}>Import Excel (Mẫu)</Button>
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
            </section>

            {/* Sticky Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                <div className="max-w-7xl mx-auto flex justify-end gap-3">
                    <Button icon={<SaveOutlined />} onClick={() => submitImport('DRAFT')} loading={loading} size="large" className="min-w-30">
                        Lưu nháp
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => submitImport('PENDING')} loading={loading} size="large" className="bg-blue-600 hover:bg-blue-700 min-w-50">
                        Lưu & tiếp tục nhập serial
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel} size="large" className="min-w-25">
                        Hủy
                    </Button>
                </div>
            </footer>

            {/* [NEW] MODAL NHẬP SERIAL */}
            <Modal
                title="Nhập danh sách Serial"
                open={isSerialModalOpen}
                onOk={handleSaveSerials}
                onCancel={() => setIsSerialModalOpen(false)}
                width={700}
                okText="Cập nhật"
                cancelText="Hủy"
            >
                <Alert
                    message="Hướng dẫn"
                    description="Bạn có thể nhập thủ công (mỗi serial 1 dòng) hoặc tải lên file Excel (cột A chứa Serial)."
                    type="info"
                    showIcon
                    className="mb-4"
                />

                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    {/* TAB 1: NHẬP TAY */}
                    <TabPane
                        tab={<span><FileTextOutlined /> Nhập thủ công</span>}
                        key="manual"
                    >
                        <TextArea
                            rows={10}
                            placeholder="SN-001&#10;SN-002&#10;SN-003..."
                            value={tempSerials}
                            onChange={(e) => setTempSerials(e.target.value)}
                            className="font-mono text-sm"
                        />
                        <div className="flex justify-between mt-2 text-gray-500">
                            <span>Đã nhập: {tempSerials.split('\n').filter(s => s.trim()).length} dòng</span>
                            {currentProductKey && (
                                <span>Yêu cầu: {productList.find(p => p.key === currentProductKey)?.quantity}</span>
                            )}
                        </div>
                    </TabPane>

                    {/* TAB 2: EXCEL */}
                    <TabPane
                        tab={<span><FileExcelOutlined /> Upload Excel</span>}
                        key="excel"
                    >
                        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="mb-4">
                                <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                            </div>
                            <Title level={5}>Tải lên file danh sách Serial</Title>
                            <Text type="secondary" className="block mb-4">
                                File Excel cần có cột đầu tiên (A) chứa mã Serial. Dòng 1 là tiêu đề (bỏ qua).
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
        </main>
    );
}