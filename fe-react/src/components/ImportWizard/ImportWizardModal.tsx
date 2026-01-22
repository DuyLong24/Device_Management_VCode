
import React, { useState, useEffect } from 'react';
import { Modal, Steps, Button, App } from 'antd';
import { UploadOutlined, SettingOutlined, SwapOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { type DataImportSession, dataImportService } from '../../services/data-import.service';
import type { ValidationSummary } from '../../services/data-import.service';
import * as XLSX from 'xlsx';
import { Step1_Upload } from './steps/Step1_Upload';
import { Step3_Mapping } from './steps/Step3_Mapping';
import type { FieldDefinition } from './steps/Step3_Mapping';
import { Step4_Preview } from './steps/Step4_Preview';
import { Step2_Configuration } from './steps/Step2_Configuration';

interface ImportWizardModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: (result?: any) => void;
    strategy: string;
    fieldDefinitions: FieldDefinition[];
    title?: string;
    payload?: any;
}

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
    open, onCancel, onSuccess, strategy, fieldDefinitions, title = "Nhập dữ liệu từ Excel", payload
}) => {
    const { message } = App.useApp();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Data State
    const [session, setSession] = useState<DataImportSession | null>(null);
    const [uploadConfig, setUploadConfig] = useState({ sheetName: '', headerRow: 0 }); // Config của Step 1 (đọc file)

    // Config của Step 2 (Logic nhập)
    const [importConfig, setImportConfig] = useState({
        mergeStrategy: 'insert' as 'upsert' | 'insert' | 'update',
        duplicateKey: 'mac',
        skipEmpty: true,
        autoCreateCategory: false
    });

    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [validationResult, setValidationResult] = useState<ValidationSummary | null>(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setCurrentStep(0);
            setSession(null);
            setUploadConfig({ sheetName: '', headerRow: 0 });
            setImportConfig({
                mergeStrategy: 'insert',
                duplicateKey: 'mac',
                skipEmpty: true,
                autoCreateCategory: false
            });
            setMapping({});
            setValidationResult(null);
        }
    }, [open]);

    // --- Actions ---

    const handleUpload = async (file: File) => {
        setLoading(true);
        try {
            const res = await dataImportService.upload(file);
            setSession(res);
            setUploadConfig({ sheetName: res.sheets[0], headerRow: 0 });
            message.success("Tải file thành công");
        } catch (error) {
            message.error("Lỗi tải file");
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = async (sheetName: string, headerRow: number) => {
        if (!session) return;
        setLoading(true);
        try {
            const res = await dataImportService.getPreview(session.sessionId, sheetName, headerRow);
            // Patch session preview
            setSession({ ...session, preview: res });
            setUploadConfig({ sheetName, headerRow });
        } catch (error) {
            message.error("Không thể đọc dữ liệu với cấu hình này");
        } finally {
            setLoading(false);
        }
    };

    const handleValidate = async () => {
        if (!session) return;
        setLoading(true);
        try {
            // Pass importConfig to validate API if needed, or just keep it for Execute step
            const res = await dataImportService.validate(session.sessionId, mapping, strategy, {
                ...payload,
                ...importConfig // Pass config to validation logic
            });
            setValidationResult(res);
            setCurrentStep(3); // Move to Preview
        } catch (error) {
            message.error("Lỗi kiểm tra dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const res = await dataImportService.execute(session.sessionId, strategy, {
                ...payload,
                ...importConfig
            });
            message.success(`Đã nhập thành công ${res.successCount} dòng. Lỗi ${res.errorCount} dòng.`);
            onSuccess(res.details);
            onCancel();
        } catch (error) {
            message.error("Lỗi thực hiện import");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        // Create headers from fieldDefinitions
        const headers = fieldDefinitions.map(f => f.label);
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Import_Template.xlsx");
    };

    // --- Navigation ---

    const next = () => {
        if (currentStep === 0 && !session) {
            message.warning("Vui lòng tải lên file Excel");
            return;
        }
        if (currentStep === 2) { // Moving from Mapping to Preview
            // Validate mapping
            const missingRequired = fieldDefinitions.filter(f => f.required && !mapping[f.key]);
            if (missingRequired.length > 0) {
                message.error(`Vui lòng ghép cột cho: ${missingRequired.map(f => f.label).join(', ')}`);
                return;
            }
            handleValidate();
            return;
        }
        setCurrentStep(currentStep + 1);
    };

    const prev = () => setCurrentStep(currentStep - 1);

    const steps = [
        {
            title: 'Tải file',
            icon: <UploadOutlined />,
            content: <Step1_Upload
                session={session}
                loading={loading}
                config={uploadConfig}
                onConfigChange={handleConfigChange}
                onDownloadTemplate={handleDownloadTemplate}
            // Handler injected in main render
            />
        },
        {
            title: 'Cấu hình',
            icon: <SettingOutlined />,
            content: (
                <Step2_Configuration
                    config={importConfig}
                    onChange={setImportConfig}
                    fieldDefinitions={fieldDefinitions}
                />
            )
        },
        {
            title: 'Ghép cột',
            icon: <SwapOutlined />,
            content: session && <Step3_Mapping
                excelHeaders={session.preview.headers}
                fieldDefinitions={fieldDefinitions}
                mapping={mapping}
                onMappingChange={setMapping}
            />
        },
        {
            title: 'Kiểm tra & Nhập',
            icon: <CheckCircleOutlined />,
            content: <Step4_Preview validationResult={validationResult} />
        }
    ];

    // Patching Step1 content render to handle file upload correctly
    // I need to override contents of step 0 because I can't easily pass the handleUpload to Step1 as I defined it weirdly in previous file
    // Actually I can pass a wrapper to Step1 that calls handleUpload.



    return (
        <Modal
            title={title}
            open={open}
            onCancel={onCancel}
            width={850}
            footer={
                <div className="flex justify-between">
                    <Button onClick={onCancel}>Hủy</Button>
                    <div>
                        {currentStep > 0 && (
                            <Button style={{ margin: '0 8px' }} onClick={prev}>
                                Quay lại
                            </Button>
                        )}
                        {currentStep < steps.length - 1 && (
                            <Button type="primary" onClick={next} loading={loading}>
                                Tiếp tục
                            </Button>
                        )}
                        {currentStep === steps.length - 1 && (
                            <Button type="primary" onClick={handleExecute} loading={loading} disabled={validationResult?.valid === 0}>
                                Thực hiện Import
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <Steps items={steps.map(s => ({ title: s.title, icon: s.icon }))} current={currentStep} className="mb-6" />

            <div className="min-h-[300px]">
                {/* Custom Render for Step 1 to inject upload handler */}
                {currentStep === 0 ? (
                    <div className="space-y-4">
                        <Step1_Upload
                            session={session}
                            loading={loading}
                            config={uploadConfig}
                            onConfigChange={handleConfigChange}
                            onUploadFile={handleUpload}
                            onDownloadTemplate={handleDownloadTemplate}
                        />
                    </div>
                ) : (
                    steps[currentStep].content
                )}
            </div>
        </Modal>
    );
};
