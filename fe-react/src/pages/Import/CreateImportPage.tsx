import {
    Button,
    Form,
    Typography,
} from 'antd';
import {
    SaveOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { ImportWizardModal } from '../../components/ImportWizard/ImportWizardModal';

// Imported Components
import { ImportInfoForm } from './components/ImportInfoForm';
import { ImportCreationTable } from './components/ImportCreationTable';
import { DeviceSelectionModal } from './components/DeviceSelectionModal';

// Hook
import { useCreateImport } from '../../hooks/useCreateImport';

const { Title, Text } = Typography;

export default function CreateImportPage() {
    const {
        isEditMode,
        form,
        loading,
        deviceList,
        categoryOptions,
        modelOptions,
        originOptions,
        isMacModalOpen, setIsMacModalOpen,
        currentDeviceKey,
        tempMacs,
        isImportWizardOpen, setIsImportWizardOpen,
        openMacModal,
        handleSaveMacs,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        handleFormChange,
        submitImport,
        handleCancel,
        handleWizardSuccess,
        IMPORT_TICKET_FIELDS
    } = useCreateImport();

    return (
        <main className="p-3 pb-24 max-w-none mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1 gap-4">
                <div>
                    <Title level={2} className="mb-1! text-2xl! font-bold text-gray-800">
                        {isEditMode ? 'Cập nhật phiếu nhập kho' : 'Thêm mới phiếu nhập kho'}
                    </Title>
                </div>
            </header>

            {/* Form Section */}
            <section aria-labelledby="general-info-heading">
                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={handleFormChange}
                    initialValues={{ importDate: dayjs(), origin: 'IMPORT' }}
                >
                    <ImportInfoForm
                        categoryOptions={categoryOptions}
                        originOptions={originOptions}
                    />
                </Form>
            </section>

            {/* Device Table Section */}
            <section aria-labelledby="device-list-heading">
                <ImportCreationTable
                    deviceList={deviceList}
                    modelOptions={modelOptions}
                    onAddDevice={handleAddDevice}
                    onDeleteDevice={handleDeleteDevice}
                    onDeviceChange={handleDeviceChange}
                    onOpenMacModal={openMacModal}
                    onOpenWizard={() => setIsImportWizardOpen(true)}
                />
            </section >

            {/* Sticky Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                <div className="max-w-full mx-auto flex justify-end gap-3">
                    <Button icon={<SaveOutlined />} onClick={() => submitImport('DRAFT')} loading={loading} size="large" className="min-w-30">
                        Lưu nháp
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => submitImport('PUBLIC')} loading={loading} size="large" className="bg-blue-600 hover:bg-blue-700 min-w-50">
                        Hoàn thiện & đóng
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel} size="large" className="min-w-25">
                        Hủy
                    </Button>
                </div>
            </footer>

            {/* MODAL NHẬP MAC */}
            <DeviceSelectionModal
                open={isMacModalOpen}
                onCancel={() => setIsMacModalOpen(false)}
                onSave={handleSaveMacs}
                initialMacs={tempMacs ? tempMacs.split('\n') : []}
                deviceKey={currentDeviceKey}
                requiredQuantity={currentDeviceKey ? deviceList.find(p => p.key === currentDeviceKey)?.quantity : 0}
                deviceName={(() => {
                    const dev = deviceList.find(p => p.key === currentDeviceKey);
                    if (!dev) return '';
                    const model = modelOptions.find(m => m.value === dev.deviceCode);
                    return model?.name || model?.stockName || '';
                })()}
            />

            {/* IMPORT WIZARD */}
            <ImportWizardModal
                open={isImportWizardOpen}
                onCancel={() => setIsImportWizardOpen(false)}
                strategy="IMPORT_TICKET"
                fieldDefinitions={IMPORT_TICKET_FIELDS}
                onSuccess={handleWizardSuccess}
            />
        </main>
    );
}