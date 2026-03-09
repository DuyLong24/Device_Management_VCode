import { Table, Button, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface WarehouseTableProps {
    dataSource: any[];
    isLoading: boolean;
    currentWarehouse: any;
    page: number;
    pageSize: number;
    totalResults: number;
    onChangePage: (page: number, pageSize: number) => void;
    rowSelection: any;
}

export const WarehouseTable = ({
    dataSource,
    isLoading,
    currentWarehouse,
    page,
    pageSize,
    totalResults,
    onChangePage,
    rowSelection
}: WarehouseTableProps) => {
    const navigate = useNavigate();

    const titleMap = (c: any) => {
        const map: Record<string, string> = {
            serial: 'Serial',
            mac: 'MAC Address',
            name: 'Tên thiết bị',
            model: 'Mã Model',
            deviceModel: 'Mã Model',
            importDate: 'Ngày nhập',
            importBy: 'Người nhập',
            qcBy: 'Người QC',
            qcStatus: 'QC Status',
            qcNote: 'QC Note',
        };
        return c.title || map[c.key] || c.key;
    };

    const getColumnDef = (colConfig: { key: string; title: string; type: string }) => {
        const rawKey = String(colConfig.key || '');
        const dataKey = rawKey === 'model' ? 'deviceModel' : rawKey;

        const base = {
            title: colConfig.title || titleMap(colConfig),
            key: dataKey,
            dataIndex: dataKey,
        };

        if (rawKey === 'mac') {
            return {
                ...base,
                render: (text: string, record: any) => {
                    const validMac = record.mac && record.mac !== 'N/A' ? record.mac : '';
                    const identifier = validMac || record.serial;
                    return (
                        <Button
                            type="link"
                            className="p-0 font-mono text-blue-600 font-semibold"
                            onClick={() => identifier ? navigate(`/device/${identifier}`, { state: { activeMenuKey: currentWarehouse?.code ? `warehouse-${currentWarehouse.code}` : undefined } }) : undefined}
                            disabled={!identifier}
                        >
                            {text || '--'}
                        </Button>
                    );
                }
            };
        }

        if (rawKey === 'serial') {
            return {
                ...base,
                render: (text: string, record: any) => {
                    const validMac = record.mac && record.mac !== 'N/A' ? record.mac : '';
                    const identifier = validMac || record.serial;
                    return (
                        <Button
                            type="link"
                            className="p-0 font-mono text-gray-700 font-medium"
                            onClick={() => identifier ? navigate(`/device/${identifier}`, { state: { activeMenuKey: currentWarehouse?.code ? `warehouse-${currentWarehouse.code}` : undefined } }) : undefined}
                            disabled={!identifier}
                        >
                            {text || '--'}
                        </Button>
                    );
                }
            };
        }

        if (colConfig.type === 'action') {
            return {
                ...base,
                title: 'Thao tác',
                align: 'center' as const,
                width: 100,
                fixed: 'right' as const,
                render: (_: any, record: any) => {
                    const validMac = record.mac && record.mac !== 'N/A' ? record.mac : '';
                    const identifier = validMac || record.serial;
                    return (
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => identifier ? navigate(`/device/${identifier}`, { state: { activeMenuKey: currentWarehouse?.code ? `warehouse-${currentWarehouse.code}` : undefined } }) : undefined}
                            disabled={!identifier}
                        >
                            Chi tiết
                        </Button>
                    );
                }
            };
        }

        if (
            colConfig.type === 'date' ||
            rawKey.includes('Date') ||
            rawKey.includes('At')
        ) {
            return {
                ...base,
                render: (date: string, record: any) => {
                    // Shift-Left devices có importDate trong importId.importDate, không phải root
                    const dateVal = date || (rawKey === 'importDate' ? record?.importId?.importDate : undefined);
                    return dateVal ? new Date(dateVal).toLocaleDateString('vi-VN') : '-';
                }
            };
        }

        if (rawKey === 'importBy' || rawKey.includes('importId')) {
            return {
                ...base,
                render: (_: any, record: any) => {
                    const name =
                        record?.importId?.createdBy?.name ??
                        record?.importedBy;

                    return <Text>{name || '--'}</Text>;
                }
            };
        }

        if (rawKey === 'qcBy' || rawKey.includes('qcBy')) {
            return {
                ...base,
                render: (_: any, record: any) => {
                    const name =
                        typeof record?.qcBy === 'object'
                            ? record?.qcBy?.name
                            : record?.qcBy;

                    return <Text>{name || '--'}</Text>;
                }
            };
        }

        return base;
    };

    const columns = currentWarehouse?.config?.columns;
    const safeColumns = Array.isArray(columns) ? columns : [];

    const normalizedColumns = safeColumns.map((c: any) => {
        if (typeof c === 'string') return { key: c, title: titleMap({ key: c }), type: 'text' };
        return c;
    });

    const dataColumns = normalizedColumns.map(getColumnDef);

    // ÉP CỘT ĐỊNH DANH (MAC & SERIAL) LÊN ĐẦU
    const identityColumns = [
        {
            title: 'MAC',
            dataIndex: 'mac',
            key: 'mac',
            width: 180,
            render: (mac: string, record: any) => {
                const validMac = mac && mac !== 'N/A' ? mac : '';
                const identifier = validMac || record.serial;
                return identifier ? (
                    <Link to={`/device/${identifier}`} className="font-medium text-blue-600 hover:underline">
                        {mac || 'N/A'}
                    </Link>
                ) : (
                    <Text className="text-gray-400">N/A</Text>
                );
            }
        },
        {
            title: 'Số Serial',
            dataIndex: 'serial',
            key: 'serial',
            width: 180,
            render: (serial: string, record: any) => {
                const validMac = record.mac && record.mac !== 'N/A' ? record.mac : '';
                const identifier = validMac || serial;
                return identifier ? (
                    <Link to={`/device/${identifier}`} className="font-medium text-blue-600 hover:underline">
                        {serial || 'N/A'}
                    </Link>
                ) : (
                    <Text className="text-gray-400">N/A</Text>
                );
            }
        }
    ];

    // Lọc bỏ những cột trùng lặp config cũ
    const filteredDataColumns = dataColumns.filter((col: any) => col.key !== 'mac' && col.key !== 'serial');

    const finalColumns = [...identityColumns, ...filteredDataColumns];

    return (
        <Table
            columns={finalColumns}
            dataSource={dataSource}
            loading={isLoading}
            rowKey="id"
            rowSelection={rowSelection}
            pagination={{
                current: page,
                pageSize: pageSize,
                total: totalResults,
                onChange: onChangePage,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} thiết bị`
            }}
            rowClassName={(record: any) => record._isPriority ? 'bg-yellow-50' : ''}
        />
    );
};
