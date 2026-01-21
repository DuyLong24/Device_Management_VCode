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
import { useMemo } from 'react';

import { useInventoryCheck } from '../../hooks/useInventoryCheck';
// import type { LocalScannedItem } from '../../hooks/useInventoryCheck';
// import { useScanSound } from '../../hooks/useScanSound';
import { INVENTORY_LABELS } from '../../constants/inventory.constants';

const { Dragger } = Upload;

const { Title, Text } = Typography;


const getSerialStatus = (serial: string, productCode: string | undefined, importProducts: any[]) => {
  if (!importProducts || !productCode) return 'UNKNOWN';
  const product = importProducts.find(p => p.productCode === productCode);
  if (!product) return 'UNKNOWN';

  // Nếu không có expectedSerials -> Mặc định Match
  if (!product.expectedSerials || product.expectedSerials.length === 0) return 'MATCHED';

  return product.expectedSerials.includes(serial) ? 'MATCHED' : 'EXCESS';
};

export default function InventoryCheckPage() {
  // const { playSuccess, playError } = useScanSound();
  const {
    loading, isSaving, session, importInfo, serverItems, localItems, sessionStatus,
    scannedInput, setScannedInput,
    selectedProductCode, setSelectedProductCode, inputRef,
    completeModalVisible, setCompleteModalVisible,
    handleStartSession, handleScanSerial, handleManualImport,
    handleCompleteInventory, handleCompleteConfirm, handleRemoveLocalItem,
    navigate,
    removeServerItem,
    duplicateSerials,
    manualSerials, setManualSerials,
    otherCompletedCount
  } = useInventoryCheck();

  // Logic thống kê Matching
  const allItems = useMemo(() => [...serverItems, ...localItems], [serverItems, localItems]);

  const processedItems = useMemo(() => {
    if (!importInfo) return [];
    return allItems.map(item => {
      let status = getSerialStatus(item.serial, (item as any).productCode || (item as any).deviceModel, importInfo.products);
      if (duplicateSerials.includes(item.serial)) {
        status = 'DUPLICATE';
      }
      return {
        ...item,
        status
      };
    });
  }, [allItems, importInfo, duplicateSerials]);

  const stats = useMemo(() => {
    // Tổng cần kiểm = Tổng Import - Đã kiểm ở các phiên DONE
    const totalImport = importInfo?.totalQuantity || 0;
    const totalRequired = Math.max(0, totalImport - otherCompletedCount);
    const scannedCount = processedItems.length;

    let matchCount = 0;
    let excessCount = 0;
    let duplicateCount = 0;

    processedItems.forEach(i => {
      if (i.status === 'MATCHED') matchCount++;
      if (i.status === 'EXCESS') excessCount++;
      if (i.status === 'DUPLICATE') duplicateCount++;
    });

    const missingCount = Math.max(0, totalRequired - matchCount);

    return {
      totalRequired, scannedCount, matchCount, missingCount, excessCount, duplicateCount
    };
  }, [importInfo, processedItems, otherCompletedCount]);

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

  // Columns
  const serialColumns: TableColumnsType<any> = [
    { title: 'Serial', dataIndex: 'serial', key: 'serial', render: (t) => <Text strong className="text-blue-600 font-mono">{t}</Text> },
    { title: 'Sản phẩm', dataIndex: 'productCode', key: 'productCode' },
    { title: 'Thời gian quét', dataIndex: 'scannedAt', key: 'scannedAt', render: (t) => dayjs(t).format('HH:mm:ss') },
    {
      title: 'So khớp',
      key: 'match',
      render: (_, r) => {
        if (r.status === 'DUPLICATE') return <Tag color="error" icon={<WarningOutlined />}>Đã tồn tại</Tag>;
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
          {stats.duplicateCount > 0 && (
            <Col xs={12} sm={8} md={4}>
              <Statistic title="Lỗi Trùng" value={stats.duplicateCount} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} />
            </Col>
          )}
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
            <Space direction="vertical" className="w-full" size="middle">
              <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <Text strong className="block mb-2 text-blue-800">1. Chọn sản phẩm đang kiểm kê <span className="text-red-500">*</span></Text>
                <Select
                  className="w-full"
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
                  <Space.Compact className="w-full">
                    <Input
                      ref={inputRef}
                      size="large"
                      placeholder={selectedProductCode ? "Đặt trỏ chuột vào đây và quét..." : "Vui lòng chọn sản phẩm trước"}
                      value={scannedInput}
                      onChange={(e) => setScannedInput(e.target.value)}
                      onPressEnter={handleScanSerial}
                      prefix={<ScanOutlined />}
                      disabled={!selectedProductCode || isSaving}
                      autoFocus
                    />
                    <Button type="primary" size="large" onClick={handleScanSerial} disabled={!selectedProductCode || isSaving} loading={isSaving} icon={<CheckCircleOutlined />}>
                      Quét
                    </Button>
                  </Space.Compact>
                </Col>
              </Row>

              <Divider>Hoặc nhập liệu nâng cao</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Space direction="vertical" className="w-full" size="small">
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
                  <Space direction="vertical" className="w-full" size="small">
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
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: '1',
                  label: `Danh sách quét (${stats.scannedCount})`,
                  children: (
                    <Table
                      columns={serialColumns}
                      dataSource={[...processedItems].reverse()}
                      pagination={{ pageSize: 20 }}
                      size="small"
                      bordered
                      rowKey={(r) => r.serial + r.scannedAt}
                      scroll={{ x: 1000, y: 500 }}
                      rowClassName={(record) => record.status === 'DUPLICATE' ? 'bg-red-50' : ''}
                    />
                  )
                },
                {
                  key: '2',
                  label: 'Serial mẫu (Đối chiếu)',
                  children: !selectedProductCode ? (
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
                  )
                }
              ]}
            />
          </Card>

          <Card className={`shadow-sm border-l-4 ${stats.duplicateCount > 0 ? 'border-l-red-500 bg-red-50' : stats.missingCount > 0 ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'}`}>
            <Flex justify="space-between" align="center">
              <div>
                <Text strong className="text-base">Hoàn tất kiểm kê</Text>
                <br />
                <Text type="secondary">
                  {stats.duplicateCount > 0 ? (
                    <Text type="danger" strong>Phát hiện {stats.duplicateCount} serial trùng lặp! Vui lòng xóa trước khi hoàn tất.</Text>
                  ) : stats.missingCount > 0 ? (
                    <Text type="warning">Còn thiếu {stats.missingCount} serial so với phiếu nhập.</Text>
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
                disabled={isSaving}
                className={stats.missingCount > 0 || stats.duplicateCount > 0 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {INVENTORY_LABELS.BTN_COMPLETE}
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
        {duplicateSerials.length > 0 ? (
          <Alert
            message="Lỗi hoàn tất phiên"
            description={
              <div>
                <Text type="danger">Phát hiện {duplicateSerials.length} serial đã tồn tại trong hệ thống:</Text>
                <div className="max-h-32 overflow-y-auto mt-2 bg-white p-2 border rounded">
                  {duplicateSerials.map(s => <Tag color="red" key={s}>{s}</Tag>)}
                </div>
                <div className="mt-2">Vui lòng xóa các serial này khỏi danh sách quét trước khi thử lại.</div>
              </div>
            }
            type="error"
            showIcon
          />
        ) : (
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
        )}
      </Modal>
    </div>
  );
}