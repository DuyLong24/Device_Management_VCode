import { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Tag, Empty, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { EXPORT_LABELS, EXPORT_TABLE_COLUMNS } from '../../constants/export.constants';

const { Title } = Typography;

export default function ExportListPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            setTimeout(() => {
                setData([]);
                setLoading(false);
            }, 500);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        {
            title: EXPORT_TABLE_COLUMNS.CODE,
            dataIndex: 'code',
            key: 'code',
        },
        {
            title: EXPORT_TABLE_COLUMNS.DATE,
            dataIndex: 'createdAt',
            key: 'createdAt',
        },
        {
            title: EXPORT_TABLE_COLUMNS.STATUS,
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag>{status}</Tag>
        },
        {
            title: EXPORT_TABLE_COLUMNS.ACTION,
            key: 'action',
            render: () => <Button size="small">{EXPORT_LABELS.BTN_CREATE}</Button>
        }
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <Title level={3} style={{ margin: 0 }}>{EXPORT_LABELS.PAGE_TITLE}</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => navigate('/export/create')}
                >
                    {EXPORT_LABELS.BTN_CREATE}
                </Button>
            </div>

            <Card bordered={false}>
                {loading ? <Spin /> : data.length === 0 ? (
                    <Empty description={EXPORT_LABELS.NOT_FOUND} />
                ) : (
                    <Table dataSource={data} columns={columns} />
                )}
            </Card>
        </div>
    );
}
