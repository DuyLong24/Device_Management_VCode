import {
  Card,
  Button,
  Table,
  Tag,
  Alert,
  Input,
  message,
  Modal,
  Descriptions,
  Statistic,
  Select,
  Progress,
  Typography,
  Row,
  Col,
  Space,
  Divider,
  Flex,
  Tabs,
  Upload
} from 'antd';
import {
  ArrowLeftOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  DownloadOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { useInventoryCheck } from '../../hooks/useInventoryCheck';
import type { LocalScannedItem } from '../../hooks/useInventoryCheck';
import { useScanSound } from '../../hooks/useScanSound';
import { INVENTORY_LABELS } from '../../constants/inventory.constants';

const { Dragger } = Upload;

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const getSerialStatus = (serial: string, productCode: string | undefined, importProducts: any[]) => {
  if (!importProducts || !productCode) return 'UNKNOWN';
  const product = importProducts.find(p => p.productCode === productCode);
  if (!product) return 'UNKNOWN';

  // Nếu không có expectedSerials -> Mặc định Match
  if (!product.expectedSerials || product.expectedSerials.length === 0) return 'MATCHED';

  return product.expectedSerials.includes(serial) ? 'MATCHED' : 'EXCESS';
};

export default function InventoryCheckPage() {
  const { playSuccess, playError } = useScanSound();
  const {
    loading, isSaving, session, importInfo, serverItems, localItems, sessionStatus,
    scannedInput, setScannedInput,
    selectedProductCode, setSelectedProductCode, inputRef,
    completeModalVisible, setCompleteModalVisible,
    handleStartSession,
    handleSaveItems, handleCompleteInventory, handleCompleteConfirm, handleRemoveLocalItem,
    navigate,
    removeServerItem,
    setLocalItems
  } = useInventoryCheck();

  // Logic thống kê Matching
  const allItems = useMemo(() => [...serverItems, ...localItems], [serverItems, localItems]);

  const processedItems = useMemo(() => {
    if (!importInfo) return [];
    return allItems.map(item => ({
      ...item,
      status: getSerialStatus(item.serial, (item as any).productCode || (item as any).deviceModel, importInfo.products)
    }));
  }, [allItems, importInfo]);

  const stats = useMemo(() => {
    const totalRequired = importInfo?.totalQuantity || 0;
    const scannedCount = processedItems.length;

    let matchCount = 0;
    let excessCount = 0;

    processedItems.forEach(i => {
      if (i.status === 'MATCHED') matchCount++;
      if (i.status === 'EXCESS') excessCount++;
    });

    const missingCount = Math.max(0, totalRequired - matchCount);

    return {
      totalRequired, scannedCount, matchCount, missingCount, excessCount, duplicateCount: 0
    };
  }, [importInfo, processedItems]);

  const sessionInfo = {
    sessionName: session?.name || 'Phiên kiểm kê mới',
    sessionCode: session?.code || '---',
    importCode: importInfo?.code || '---',
    productType: importInfo?.productType || '---',
    importDate: importInfo?.importDate ? dayjs(importInfo.importDate).format('DD/MM/YYYY') : '---',
    importedBy: importInfo?.importedBy || '---',
    supplier: importInfo?.supplier || '---',
    createdBy: (session as any)?.createdBy || '---',
    createdAt: session?.createdAt ? dayjs(session.createdAt).format('DD/MM/YYYY HH:mm') : '---',
  };

  // [NEW] State for Manual Import
  const [manualSerials, setManualSerials] = useState('');

  const handleManualImport = () => {
    if (!selectedProductCode) {
      message.warning('Vui lòng chọn sản phẩm trước khi nhập!');
      return;
    }
    if (!manualSerials.trim()) return;

    const lines = manualSerials.split(/\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let addedCount = 0;
    const newItems: LocalScannedItem[] = [];

    lines.forEach(serial => {
      // Check local duplicate in new batch or existing items
      const isDup = allItems.some(i => i.serial === serial) || newItems.some(i => i.serial === serial);
      if (!isDup) {
        newItems.push({
          serial,
          deviceModel: selectedProductCode,
          productCode: selectedProductCode,
          scannedAt: new Date().toISOString()
        } as any);
        addedCount++;
      }
    });

    if (newItems.length > 0) {
      setLocalItems(prev => [...newItems, ...prev]);
      message.success(`Đã thêm ${newItems.length} serial.`);
      playSuccess();
      setManualSerials('');
    }

    if (addedCount < lines.length) {
      message.warning(`Đã bỏ qua ${lines.length - addedCount} serial trùng lặp.`);
    }
  };

  // Override handleScanSerial để có âm thanh & status
  const onScanSerial = () => {
    const code = scannedInput.trim();
    if (!code) return;

    if (!selectedProductCode) {
      playError();
      message.warning('Vui lòng CHỌN SẢN PHẨM trước khi quét!');
      return;
    }

    // Check trùng
    const isDup = allItems.some(i => i.serial === code);
    if (isDup) {
      playError();
      message.warning(`Serial ${code} đã tồn tại!`);
      setScannedInput('');
      return;
    }

    // Check status & Sound
    const status = getSerialStatus(code, selectedProductCode, importInfo?.products || []);
    if (status === 'MATCHED') {
      playSuccess();
      message.success(`Đã quét: ${code}`);
    } else {
      playError();
      message.warning(`Cảnh báo: Serial ${code} KHÔNG CÓ trong phiếu nhập`);
    }

    const newItem: LocalScannedItem = {
      serial: code,
      deviceModel: selectedProductCode,
      productCode: selectedProductCode,
      scannedAt: new Date().toISOString()
    } as any;

    setLocalItems(prev => [newItem, ...prev]);
    setScannedInput('');
    inputRef.current?.focus();
  };

  // Columns
  const serialColumns: TableColumnsType<any> = [
    { title: 'Serial', dataIndex: 'serial', key: 'serial', render: (t) => <Text strong className="text-blue-600 font-mono">{t}</Text> },
    { title: 'Sản phẩm', dataIndex: 'productCode', key: 'productCode' },
    { title: 'Thời gian quét', dataIndex: 'scannedAt', key: 'scannedAt', render: (t) => dayjs(t).format('HH:mm:ss') },
    {
      title: 'So khớp',
      key: 'match',
      render: (_, r) => {
        if (r.status === 'MATCHED') return <Tag color="success" icon={<CheckCircleOutlined />}>Khớp</Tag>;
        if (r.status === 'EXCESS') return <Tag color="warning" icon={<WarningOutlined />}>Thừa</Tag>;
        return <Tag>Unknown</Tag>;
      }
    },
    { title: 'Trạng thái', key: 'status', render: (_, r) => r._id ? <Tag color="blue">Đã lưu</Tag> : <Tag color="orange">Chưa lưu</Tag> },
    {
      title: '',
      key: 'action',
      render: (_, r) => {
        if (r._id) {
          return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeServerItem && removeServerItem(r.serial)} />;
        }
        return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLocalItem(r.serial)} />;
      }
    }
  ];

  const productOptions = importInfo?.products.map(p => {
    // Đếm số lượng matched
    const matched = processedItems.filter(i => (i as any).productCode === p.productCode && i.status === 'MATCHED').length;
    return {
      label: `${p.productCode} (${matched}/${p.quantity})`,
      value: p.productCode
    };
  }) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/import/list')} className="mb-4">
          {INVENTORY_LABELS.BTN_BACK}
        </Button>
      </div>

      <div className="mb-6">
        <Title level={3} className="mb-2!">{sessionInfo.sessionName}</Title>
        <Space>
          <Tag color="blue">{sessionInfo.sessionCode}</Tag>
          <Tag>{sessionInfo.importCode}</Tag>
          <Tag color={sessionStatus === 'in-progress' ? 'processing' : sessionStatus === 'init' ? 'default' : 'success'}>
            {sessionStatus === 'init' ? 'Chưa bắt đầu' : sessionStatus === 'in-progress' ? 'Đang kiểm kê' : 'Đã hoàn tất'}
          </Tag>
        </Space>
      </div>

      {/* Session Info */}
      <Card title={INVENTORY_LABELS.SESSION_INFO} className="mb-6 shadow-sm">
        <Descriptions column={{ xxl: 4, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} size="small" bordered>
          <Descriptions.Item label={INVENTORY_LABELS.SESSION_CODE}>{sessionInfo.sessionCode}</Descriptions.Item>
          <Descriptions.Item label={INVENTORY_LABELS.IMPORT_TICKET}>{sessionInfo.importCode}</Descriptions.Item>
          <Descriptions.Item label="Ngày nhập">{sessionInfo.importDate}</Descriptions.Item>
          <Descriptions.Item label="Người nhập kho">{sessionInfo.importedBy}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Statistics */}
      <Card className="mb-6 shadow-sm">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Tổng cần kiểm" value={stats.totalRequired} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={INVENTORY_LABELS.TOTAL_SCANNED}
              value={stats.scannedCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Khớp" value={stats.matchCount} valueStyle={{ color: '#52c41a' }} suffix={`/ ${stats.totalRequired}`} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Còn thiếu" value={stats.missingCount} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Thừa" value={stats.excessCount} valueStyle={{ color: '#faad14' }} />
          </Col>
        </Row>
        <Divider className="my-4" />
        <Progress
          percent={stats.totalRequired > 0 ? Math.round((stats.matchCount / stats.totalRequired) * 100) : 0}
          status={stats.matchCount === stats.totalRequired ? 'success' : 'active'}
          strokeLinecap="square"
        />
      </Card>

      {/* Actions: Init State */}
      {sessionStatus === 'init' && (
        <Card className="mb-6 shadow-sm">
          <Alert
            message="Phiên kiểm kê chưa bắt đầu"
            description="Nhấn nút 'Bắt đầu kiểm kê' để hệ thống khởi tạo phiên làm việc."
            type="warning"
            showIcon
            action={
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStartSession} loading={loading}>
                Bắt đầu kiểm kê
              </Button>
            }
          />
        </Card>
      )}

      {/* Actions: In-Progress State */}
      {sessionStatus === 'in-progress' && (
        <>
          <Card title="Quét serial kiểm kê" className="mb-6 shadow-sm">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <Text strong className="block mb-2 text-blue-800">1. Chọn sản phẩm đang kiểm kê <span className="text-red-500">*</span></Text>
                <Select
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="-- Chọn mã sản phẩm --"
                  options={productOptions}
                  value={selectedProductCode}
                  onChange={setSelectedProductCode}
                />
              </div>

              <Row gutter={16}>
                <Col span={24}>
                  <Text strong className="block mb-2">2. Quét hoặc nhập Serial</Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      ref={inputRef}
                      size="large"
                      placeholder={selectedProductCode ? "Đặt trỏ chuột vào đây và quét..." : "Vui lòng chọn sản phẩm trước"}
                      value={scannedInput}
                      onChange={(e) => setScannedInput(e.target.value)}
                      onPressEnter={onScanSerial}
                      prefix={<ScanOutlined />}
                      disabled={!selectedProductCode}
                      autoFocus
                    />
                    <Button type="primary" size="large" onClick={onScanSerial} disabled={!selectedProductCode} icon={<CheckCircleOutlined />}>
                      Quét
                    </Button>
                  </Space.Compact>
                </Col>
              </Row>

              {localItems.length > 0 && (
                <Alert
                  message={`Bạn có ${localItems.length} mã mới chưa lưu.`}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" type="primary" onClick={handleSaveItems} loading={isSaving}>
                      Lưu ngay
                    </Button>
                  }
                />
              )}

              <Divider>Hoặc nhập liệu nâng cao</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong>Nhập thủ công nhiều serial</Text>
                    <Input.TextArea
                      rows={5}
                      placeholder="Nhập từng serial trên một dòng..."
                      value={manualSerials}
                      onChange={(e) => setManualSerials(e.target.value)}
                    />
                    <Button block icon={<CheckCircleOutlined />} onClick={handleManualImport}>
                      Nhập danh sách
                    </Button>
                  </Space>
                </Col>

                <Col xs={24} md={12}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong>Import từ file Excel</Text>
                    <Dragger
                      beforeUpload={() => false}
                      showUploadList={false}
                      onChange={() => message.info('Tính năng đang phát triển')}
                    >
                      <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                      <p className="ant-upload-text">Kéo thả file hoặc click để chọn</p>
                    </Dragger>
                    <Button block icon={<DownloadOutlined />} onClick={() => { }}>
                      Tải template Excel
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Space>
          </Card>

          <Card className="mb-6 shadow-sm">
            <Tabs defaultActiveKey="1">
              <TabPane tab={`Danh sách quét (${stats.scannedCount})`} key="1">
                <Table
                  columns={serialColumns}
                  dataSource={[...processedItems].reverse()}
                  pagination={{ pageSize: 20 }}
                  size="small"
                  bordered
                  rowKey={(r) => r.serial + r.scannedAt}
                  scroll={{ x: 1000, y: 500 }}
                />
              </TabPane>
              <TabPane tab="Serial mẫu (Đối chiếu)" key="2">
                {!selectedProductCode ? (
                  <div className="p-4 text-center text-gray-500">Chọn sản phẩm để xem danh sách serial cần quét</div>
                ) : (
                  <div className="p-4">
                    <Text strong>Serial dự kiến của {selectedProductCode}:</Text>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {importInfo?.products
                        .find(p => p.productCode === selectedProductCode)
                        ?.expectedSerials?.map(s => {
                          const isScanned = processedItems.some(i => i.serial === s);
                          return (
                            <Tag key={s} color={isScanned ? 'green' : 'default'}>
                              {s} {isScanned && <CheckCircleOutlined />}
                            </Tag>
                          )
                        })
                      }
                    </div>
                  </div>
                )}
              </TabPane>
            </Tabs>
          </Card>

          <Card className={`shadow-sm border-l-4 ${stats.missingCount > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-green-50'}`}>
            <Flex justify="space-between" align="center">
              <div>
                <Text strong style={{ fontSize: 16 }}>Hoàn tất kiểm kê</Text>
                <br />
                <Text type="secondary">
                  {stats.missingCount > 0 ? (
                    <Text type="danger">Còn thiếu {stats.missingCount} serial so với phiếu nhập.</Text>
                  ) : (
                    <Text type="success">Đã đủ số lượng yêu cầu.</Text>
                  )}
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleCompleteInventory}
                disabled={localItems.length > 0 || isSaving}
                className={stats.missingCount > 0 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {localItems.length > 0 ? 'Lưu dữ liệu trước' : INVENTORY_LABELS.BTN_COMPLETE}
              </Button>
            </Flex>
          </Card>
        </>
      )}

      <Modal
        title="Xác nhận hoàn tất"
        open={completeModalVisible}
        onOk={handleCompleteConfirm}
        onCancel={() => setCompleteModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={isSaving}
      >
        <Alert
          message="Xác nhận hoàn tất kiểm kê"
          description={
            <ul className="pl-5 mt-2 mb-0">
              <li><b>Số serial đã khớp:</b> {stats.matchCount}</li>
              <li><b>Số serial thừa:</b> {stats.excessCount}</li>
              <li><b>Còn thiếu:</b> {stats.missingCount}</li>
              <li>Hệ thống sẽ tạo thiết bị và cập nhật trạng thái phiếu nhập.</li>
            </ul>
          }
          type={stats.missingCount > 0 ? "warning" : "success"}
          showIcon
        />
      </Modal>
    </div>
  );
}