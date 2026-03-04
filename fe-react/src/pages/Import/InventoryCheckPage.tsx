import {
  Card,
  Button,
  Table,
  Tag,
  Alert,
  Input,
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
  Tabs
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  SoundFilled,
  SoundOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';

import { useInventoryCheck, playSuccessSound } from '../../hooks/useInventoryCheck';
import { INVENTORY_LABELS } from '../../constants/inventory.constants';
import { processScannerInput } from '../../utils/mac.util';

// const { Dragger } = Upload;

const { Text } = Typography;


const getMacStatus = (mac: string, deviceCode: string | undefined, importDevices: any[]) => {
  if (!importDevices || !deviceCode) return 'UNKNOWN';
  const device = importDevices.find(p => p.deviceCode === deviceCode);
  if (!device) return 'UNKNOWN';

  // Nếu không có expectedMacs -> Mặc định Match
  if (!device.expectedMacs || device.expectedMacs.length === 0) return 'MATCHED';

  return device.expectedMacs.includes(mac) ? 'MATCHED' : 'EXCESS';
};

export default function InventoryCheckPage() {
  // const { playSuccess, playError } = useScanSound();
  const {
    loading, isSaving, session, importInfo, serverItems, localItems, sessionStatus,
    selectedDeviceCode, setSelectedDeviceCode,
    completeModalVisible, setCompleteModalVisible,
    handleStartSession, handleManualImport,
    handleCompleteInventory, handleCompleteConfirm, handleRemoveLocalItem,
    navigate,
    removeServerItem,
    duplicateMacs,
    manualMacs, setManualMacs,
    otherCompletedCount,
    otherCompletedItemsByModel,
    deviceModels,
    isSoundEnabled, setIsSoundEnabled,
  } = useInventoryCheck();

  // Logic thống kê Matching
  const allItems = useMemo(() => [...serverItems, ...localItems], [serverItems, localItems]);

  const processedItems = useMemo(() => {
    if (!importInfo) return [];
    return allItems.map(item => {
      let status = getMacStatus(item.mac, (item as any).deviceCode || (item as any).deviceModel, importInfo.devices);
      if (duplicateMacs.includes(item.mac)) {
        status = 'DUPLICATE';
      }
      return {
        ...item,
        status
      };
    });
  }, [allItems, importInfo, duplicateMacs]);

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
    deviceType: importInfo?.deviceType || '---',
    importDate: importInfo?.importDate ? dayjs(importInfo.importDate).format('DD/MM/YYYY') : '---',
    importedBy: importInfo?.importedBy || importInfo?.createdBy?.name || '---',
    supplier: importInfo?.supplier || '---',
    createdBy: (session as any)?.createdBy || '---',
    createdAt: session?.createdAt ? dayjs(session.createdAt).format('DD/MM/YYYY HH:mm') : '---',
  };

  // Columns
  const macColumns: TableColumnsType<any> = [
    { title: 'Mac', dataIndex: 'mac', key: 'mac', render: (t) => <Text strong className="text-blue-600 font-mono">{t}</Text> },
    { title: 'Tên thiết bị', dataIndex: 'deviceCode', key: 'deviceCode' },
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
          return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeServerItem && removeServerItem(r.mac)} />;
        }
        return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLocalItem(r.mac)} />;
      }
    }
  ];

  const deviceModelOptions = useMemo(() => {
    if (!deviceModels || deviceModels.length === 0) {
      return importInfo?.devices.map(p => {
        const matchedInCurrent = processedItems.filter(i => (i as any).deviceCode === p.deviceCode && i.status === 'MATCHED').length;
        const scannedInOther = otherCompletedItemsByModel[p.deviceCode] || 0;
        const totalScanned = matchedInCurrent + scannedInOther;
        return { label: `${p.deviceCode} (${totalScanned}/${p.quantity})`, value: p.deviceCode };
      }) || [];
    }

    // Lọc những model có trong phiếu nhập
    const importDeviceCodes = importInfo?.devices.map(d => d.deviceCode) || [];

    return deviceModels
      .filter(model => importDeviceCodes.includes(model.code))
      .map(model => {
        const importProd = importInfo?.devices.find(p => p.deviceCode === model.code);
        let suffix = '';
        if (importProd) {
          const matchedInCurrent = processedItems.filter(i => (i as any).deviceCode === model.code && i.status === 'MATCHED').length;
          const scannedInOther = otherCompletedItemsByModel[model.code] || 0;
          const totalScanned = matchedInCurrent + scannedInOther;
          suffix = ` (${totalScanned}/${importProd.quantity})`;
        } else {
          const scanned = processedItems.filter(i => (i as any).deviceCode === model.code).length;
          if (scanned > 0) suffix = ` (Đã quét: ${scanned})`;
        }

        return {
          label: `${model.name} - ${model.code}${suffix}`,
          value: model.code
        };
      });
  }, [deviceModels, importInfo, processedItems, otherCompletedItemsByModel]);

  return (
    <div className="p-3 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-0">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="mb-4">
          {INVENTORY_LABELS.BTN_BACK}
        </Button>
      </div>

      {/* Session Info & Statistics */}
      <Row gutter={16} className="mb-0">
        <Col span={8}>
          <Card title={INVENTORY_LABELS.SESSION_INFO} className="h-full shadow-sm">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={INVENTORY_LABELS.IMPORT_TICKET}>{sessionInfo.importCode}</Descriptions.Item>
              <Descriptions.Item label={INVENTORY_LABELS.SESSION_CODE}>{sessionInfo.sessionCode}</Descriptions.Item>
              <Descriptions.Item label="Ngày nhập">{sessionInfo.importDate}</Descriptions.Item>
              <Descriptions.Item label="Người nhập kho">{sessionInfo.importedBy}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={sessionStatus === 'in-progress' ? 'processing' : sessionStatus === 'init' ? 'default' : 'success'}>
                  {sessionStatus === 'init' ? 'Chưa bắt đầu' : sessionStatus === 'in-progress' ? 'Đang kiểm kê' : 'Đã hoàn tất'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={16}>
          <Card className="h-full shadow-sm">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={6}>
                <Statistic title="Tổng cần kiểm" value={stats.totalRequired} />
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Statistic
                  title={INVENTORY_LABELS.TOTAL_SCANNED}
                  value={stats.scannedCount}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Statistic title="Khớp" value={stats.matchCount} valueStyle={{ color: '#52c41a' }} suffix={`/ ${stats.totalRequired}`} />
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Statistic title="Còn thiếu" value={stats.missingCount} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
              {stats.excessCount > 0 && (
                <Col xs={12} sm={8} md={6}>
                  <Statistic title="Thừa" value={stats.excessCount} valueStyle={{ color: '#faad14' }} />
                </Col>
              )}
              {stats.duplicateCount > 0 && (
                <Col xs={12} sm={8} md={6}>
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
        </Col>
      </Row>

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
      )
      }

      {/* Actions: In-Progress State */}
      {
        sessionStatus === 'in-progress' && (
          <>
            <Card title="Quét mac kiểm kê" className="mb-6 shadow-sm">
              <Space direction="vertical" className="w-full" size="middle">
                <div className="bg-blue-50 p-4 rounded border border-blue-100">
                  <Text strong className="block mb-2 text-blue-800">1. Chọn thiết bị đang kiểm kê <span className="text-red-500">*</span></Text>
                  <Select
                    className="w-full"
                    size="large"
                    placeholder="-- Chọn mã thiết bị --"
                    options={deviceModelOptions}
                    value={selectedDeviceCode}
                    onChange={setSelectedDeviceCode}
                  />
                </div>

                <Row gutter={16}>
                  {/* <Col xs={24} md={12}> */}
                  <Space direction="vertical" className="w-full" size="small">
                    <Divider>Quét mã mac</Divider>
                    <Input.TextArea
                      placeholder={selectedDeviceCode ? "Nhập từng mã mac trên một dòng" : "Vui lòng chọn thiết bị trước"}
                      disabled={!selectedDeviceCode || isSaving}
                      rows={5}
                      value={manualMacs}
                      // onChange={(e) => {
                      //   const cleanVal = processScannerInput(e.target.value);
                      //   setManualMacs(cleanVal);
                      // }}
                      onChange={(e) => {
                        const cleanVal = processScannerInput(e.target.value);

                        // Đếm số lượng mã MAC hợp lệ trước và sau khi máy quét nhả text vào
                        const oldScannedCount = manualMacs.split('\n').filter(mac => mac.trim()).length;
                        const newScannedCount = cleanVal.split('\n').filter(mac => mac.trim()).length;

                        // Nếu máy quét vừa đẩy vào 1 mã MAC hợp lệ (vượt qua bộ lọc Serial) -> KÊU TÍP!
                        if (newScannedCount > oldScannedCount && isSoundEnabled) {
                          playSuccessSound();
                        }

                        setManualMacs(cleanVal);
                      }}
                    />
                    <Space>
                      <Button block icon={<CheckCircleOutlined />} onClick={handleManualImport}>
                        Nhập
                      </Button>
                      {/* Nút bật/tắt âm thanh quét mã */}
                      <Button
                        type={isSoundEnabled ? 'primary' : 'default'}
                        ghost={isSoundEnabled}
                        icon={isSoundEnabled ? <SoundFilled /> : <SoundOutlined />}
                        onClick={() => setIsSoundEnabled((prev: boolean) => !prev)}
                        title={isSoundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                      />
                    </Space>
                  </Space>
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
                        columns={macColumns}
                        dataSource={[...processedItems].reverse()}
                        pagination={{ pageSize: 20 }}
                        size="small"
                        bordered
                        rowKey={(r) => r.mac + r.scannedAt}
                        scroll={{ x: 1000, y: 500 }}
                        rowClassName={(record) => record.status === 'DUPLICATE' ? 'bg-red-50' : ''}
                      />
                    )
                  },
                  {
                    key: '2',
                    label: 'Mac mẫu (Đối chiếu)',
                    children: !selectedDeviceCode ? (
                      <div className="p-4 text-center text-gray-500">Chọn thiết bị để xem danh sách mac cần quét</div>
                    ) : (
                      <div className="p-4">
                        <Text strong>Mac dự kiến của {selectedDeviceCode}:</Text>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {importInfo?.devices
                            .find(p => p.deviceCode === selectedDeviceCode)
                            ?.expectedMacs?.map(s => {
                              const isScanned = processedItems.some(i => i.mac === s);
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

            <Card className={`shadow-sm border-l-4 ${stats.duplicateCount > 0 || stats.excessCount > 0 ? 'border-l-red-500 bg-red-50' : stats.missingCount > 0 ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'}`}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong className="text-base">Hoàn tất kiểm kê</Text>
                  <br />
                  <Text type="secondary">
                    {stats.duplicateCount > 0 ? (
                      <Text type="danger" strong>Phát hiện {stats.duplicateCount} mã mac trùng lặp! Vui lòng xóa trước khi hoàn tất.</Text>
                    ) : stats.excessCount > 0 ? (
                      <Text type="danger" strong>Phát hiện {stats.excessCount} mã mac thừa so với phiếu nhập! Vui lòng kiểm tra lại.</Text>
                    ) : stats.missingCount > 0 ? (
                      <Text type="warning">Còn thiếu {stats.missingCount} mã mac so với phiếu nhập.</Text>
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
                  disabled={isSaving || stats.excessCount > 0}
                  className={stats.missingCount > 0 || stats.duplicateCount > 0 || stats.excessCount > 0 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                >
                  {INVENTORY_LABELS.BTN_COMPLETE}
                </Button>
              </Flex>
            </Card>
          </>
        )
      }

      <Modal
        title="Xác nhận hoàn tất"
        open={completeModalVisible}
        onOk={handleCompleteConfirm}
        onCancel={() => setCompleteModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={isSaving}
      >
        {stats.matchCount >= stats.totalRequired && (
          <Alert
            message="Lưu ý quan trọng"
            description="Bạn đã kiểm đủ số lượng. Sau khi hoàn tất phiên này, Phiếu nhập kho sẽ tự động chuyển sang trạng thái ĐÃ HOÀN TẤT và không thể kiểm kê thêm."
            type="warning"
            showIcon
            className="mb-4"
          />
        )}
        {duplicateMacs.length > 0 ? (
          <Alert
            message="Lỗi hoàn tất phiên"
            description={
              <div>
                <Text type="danger">Phát hiện {duplicateMacs.length} mã mac đã tồn tại trong hệ thống:</Text>
                <div className="max-h-32 overflow-y-auto mt-2 bg-white p-2 border rounded">
                  {duplicateMacs.map(s => <Tag color="red" key={s}>{s}</Tag>)}
                </div>
                <div className="mt-2">Vui lòng xóa các mã mac này khỏi danh sách quét trước khi thử lại.</div>
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
                <li><b>Số mac đã khớp:</b> {stats.matchCount}</li>
                <li><b>Số mac thừa:</b> {stats.excessCount}</li>
                <li><b>Còn thiếu:</b> {stats.missingCount}</li>
                <li>Hệ thống sẽ tạo thiết bị và cập nhật trạng thái phiếu nhập.</li>
              </ul>
            }
            type={stats.missingCount > 0 ? "warning" : "success"}
            showIcon
          />
        )}
      </Modal>
    </div >
  );
}