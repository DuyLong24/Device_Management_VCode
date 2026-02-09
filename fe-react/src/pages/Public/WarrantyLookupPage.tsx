import { useState } from 'react';
import { Input, Button, Card, Typography, Alert, Tag } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { publicService } from '../../services/public.service';
import dayjs from 'dayjs';
import logoImage from '../../assets/logo_alvar.png';

const { Title, Text } = Typography;

export default function WarrantyLookupPage() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!input.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            // Service returns an array now
            const data = await publicService.checkWarranty(input.trim());
            setResults(Array.isArray(data) ? data : [data]);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi tra cứu (Error occurred)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4 pb-20">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-8">
                    {/* <SafetyCertificateOutlined className="text-6xl text-blue-600 mb-4" /> */}
                    <img src={logoImage} alt="Logo" className="w-20 h-auto mx-auto mb-4" />
                    <Title level={2}>Tra cứu bảo hành</Title>
                    <Text type="secondary">Nhập danh sách MAC Address (mỗi dòng một mã) để kiểm tra</Text>
                </div>

                <Card className="shadow-lg mb-8">
                    <div className="flex flex-col gap-4">
                        <Input.TextArea
                            size="large"
                            placeholder="Nhập MAC Address... (Xuống dòng để tra nhiều mã)"
                            rows={4}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <Button type="primary" size="large" onClick={handleSearch} loading={loading} block icon={<SearchOutlined />}>
                            Kiểm tra danh sách
                        </Button>
                    </div>
                </Card>

                {error && (
                    <Alert
                        message="Lỗi"
                        description={error}
                        type="error"
                        showIcon
                        className="mb-8"
                    />
                )}

                {results && (
                    <div className="space-y-6">
                        <Title level={4}>Kết quả tra cứu ({results.length})</Title>

                        {results.map((item, index) => (
                            <Card key={index} className={`shadow-md border-t-4 ${item.found ? (item.data.status === 'ACTIVE' ? 'border-t-green-500' : 'border-t-red-500') : 'border-t-gray-300'}`}>
                                {!item.found ? (
                                    <div className="flex items-center gap-3">
                                        <CloseCircleOutlined className="text-2xl text-red-500" />
                                        <div>
                                            <Text strong className="text-lg block">{item.input}</Text>
                                            <Text type="danger">Không tìm thấy thông tin thiết bị</Text>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-4 border-b pb-4">
                                            <div>
                                                <Title level={5} className="m-0! text-blue-800">{item.data.deviceName}</Title>
                                                <Text type="secondary">Model: {item.data.model}</Text>
                                            </div>
                                            <Tag color={item.data.status === 'ACTIVE' ? 'success' : 'error'} className="text-base px-3 py-1">
                                                {item.data.status === 'ACTIVE' ? 'CÒN HẠN BẢO HÀNH' : 'HẾT HẠN BẢO HÀNH'}
                                            </Tag>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex gap-2"><Text type="secondary" className="w-24">Serial:</Text> <Text strong>{item.data.serial || '-'}</Text></div>
                                                <div className="flex gap-2"><Text type="secondary" className="w-24">MAC:</Text> <Text strong>{item.data.mac}</Text></div>
                                                <div className="flex gap-2"><Text type="secondary" className="w-24">Bảo hành:</Text> <Text strong>{item.data.warrantyMonths} tháng</Text></div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex gap-2">
                                                    <CheckCircleOutlined className={item.data.activationDate ? "text-green-500" : "text-gray-300"} />
                                                    <Text type="secondary" className="w-20">Kích hoạt:</Text>
                                                    <Text>{item.data.activationDate ? dayjs(item.data.activationDate).format('DD/MM/YYYY') : 'Chưa kích hoạt'}</Text>
                                                </div>
                                                <div className="flex gap-2">
                                                    {item.data.status === 'EXPIRED' ? <CloseCircleOutlined className="text-red-500" /> : <SafetyCertificateOutlined className="text-blue-500" />}
                                                    <Text type="secondary" className="w-20">Hết hạn:</Text>
                                                    <Text>{item.data.expirationDate ? dayjs(item.data.expirationDate).format('DD/MM/YYYY') : '---'}</Text>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
