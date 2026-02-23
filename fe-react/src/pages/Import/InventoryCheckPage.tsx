import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Button, Alert, Modal, Typography, Flex, Tag } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useInventoryCheck } from '../../hooks/useInventoryCheck';
import { INVENTORY_LABELS } from '../../constants/inventory.constants';
import { getMacStatus } from '../../utils/inventory.util';

// Components
import { InventorySessionInfo } from './components/InventorySessionInfo';
import { InventoryStatistics } from './components/InventoryStatistics';
import { InventoryScanAction } from './components/InventoryScanAction';
import { InventoryList } from './components/InventoryList';

const { Text } = Typography;

export default function InventoryCheckPage() {
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
    deviceModels
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/import/list')} className="mb-4">
          {INVENTORY_LABELS.BTN_BACK}
        </Button>
      </div>

      {/* Session Info & Statistics */}
      <div className="mb-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <InventorySessionInfo sessionInfo={sessionInfo} sessionStatus={sessionStatus} />
        </div>
        <div className="md:col-span-2">
          <InventoryStatistics stats={stats} />
        </div>
      </div>

      {/* Actions: Init State */}
      {sessionStatus === 'init' && (
        <div className="mt-6">
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
        </div>
      )}

      {/* Actions: In-Progress State */}
      {sessionStatus === 'in-progress' && (
        <div className="mt-6">
          <InventoryScanAction
            sessionStatus={sessionStatus}
            selectedDeviceCode={selectedDeviceCode}
            setSelectedDeviceCode={setSelectedDeviceCode}
            deviceModelOptions={deviceModelOptions}
            manualMacs={manualMacs}
            setManualMacs={setManualMacs}
            handleManualImport={handleManualImport}
            isSaving={isSaving}
          />

          <InventoryList
            scannedCount={stats.scannedCount}
            processedItems={processedItems}
            removeServerItem={removeServerItem}
            handleRemoveLocalItem={handleRemoveLocalItem}
            selectedDeviceCode={selectedDeviceCode}
            importInfo={importInfo}
          />

          <div className={`p-4 rounded border-l-4 shadow-sm bg-white ${stats.duplicateCount > 0 || stats.excessCount > 0 ? 'border-l-red-500 bg-red-50' : stats.missingCount > 0 ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'}`}>
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
          </div>
        </div>
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
