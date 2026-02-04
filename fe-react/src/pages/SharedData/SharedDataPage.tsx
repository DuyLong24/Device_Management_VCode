import { Card, Table, Button, Space, Typography, List, Popconfirm, Tag, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import type { SharedDataGroup, SharedData } from '../../services/shared-data.service';
import { CreateEditGroupModal } from './components/CreateEditGroupModal';
import { CreateEditDataModal } from './components/CreateEditDataModal';
import { useSharedDataPage } from '../../hooks/useSharedDataPage';

const { Text } = Typography;

export default function SharedDataPage() {
    const {
        groups,
        filteredData,
        selectedGroup,
        loadingGroups,
        loadingData,
        searchText,
        isGroupModalOpen,
        editingGroup,
        isDataModalOpen,
        editingData,
        setSelectedGroup,
        setIsGroupModalOpen,
        setIsDataModalOpen,
        openCreateGroup,
        openEditGroup,
        handleDeleteGroup,
        openCreateData,
        openEditData,
        handleDeleteData,
        handleSearch
    } = useSharedDataPage();

    // Columns for Data Table
    const columns = [
        {
            title: 'Mã (Code)',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Tag color="blue" className="font-mono">{text}</Tag>,
            width: 150
        },
        {
            title: 'Tên hiển thị',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Thứ tự',
            dataIndex: 'order',
            key: 'order',
            width: 100,
            render: (val: number) => <Tag>{val}</Tag>
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 120,
            render: (_: any, record: SharedData) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        className="text-blue-500"
                        onClick={() => openEditData(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc muốn xóa?"
                        onConfirm={() => handleDeleteData(record._id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="h-[calc(100vh-140px)] flex gap-3">
            {/* LEFT: Group List */}
            <Card
                className="w-1/3 h-full overflow-hidden flex flex-col shadow-sm"
                bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                title={<span className="text-gray-700 font-semibold"><FolderOutlined /> Danh mục</span>}
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={openCreateGroup}
                    >
                        Tạo nhóm
                    </Button>
                }
            >
                <div className="flex-1 overflow-y-auto p-2">
                    <List
                        loading={loadingGroups}
                        dataSource={groups || []}
                        renderItem={(group: SharedDataGroup) => (
                            <List.Item
                                className={`cursor-pointer rounded-md mb-1 transition-colors hover:bg-blue-50 px-3 py-3 border-b-0 ${selectedGroup?._id === group._id ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                                    }`}
                                onClick={() => setSelectedGroup(group)}
                                actions={[
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={(e) => openEditGroup(group, e)}
                                    />,
                                    <Popconfirm
                                        title="Xóa nhóm này?"
                                        description="Tất cả dữ liệu bên trong cũng sẽ bị xóa!"
                                        onConfirm={(e) => handleDeleteGroup(group._id, e)}
                                        onCancel={(e) => e?.stopPropagation()}
                                        okText="Xóa luôn"
                                        cancelText="Hủy"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={<AvatarIcon />}
                                    title={<Text strong={selectedGroup?._id === group._id}>{group.name}</Text>}
                                    description={<Text type="secondary" className="text-xs font-mono">{group.code}</Text>}
                                />
                            </List.Item>
                        )}
                    />
                </div>
            </Card>

            {/* RIGHT: Data List */}
            <Card
                className="flex-1 h-full shadow-sm flex flex-col"
                bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
                title={
                    selectedGroup ? (
                        <div className="flex justify-between items-center w-full pr-4">
                            <Space>
                                <AppstoreOutlined className="text-blue-500" />
                                <span>Dữ liệu: <Text strong>{selectedGroup.name}</Text></span>
                            </Space>
                            <Input
                                placeholder="Tìm kiếm tên, mã..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                value={searchText}
                                onChange={handleSearch}
                                className="w-[250px]"
                                allowClear
                            />
                        </div>
                    ) : (
                        <Text type="secondary">Chọn một nhóm để xem dữ liệu</Text>
                    )
                }
                extra={
                    selectedGroup && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateData}
                        >
                            Thêm dữ liệu
                        </Button>
                    )
                }
            >
                {selectedGroup ? (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        loading={loadingData}
                        rowKey="_id"
                        pagination={{
                            pageSize: 10,
                            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} của ${total} bản ghi`,
                            showSizeChanger: true
                        }}
                        className="flex-1 overflow-auto"
                        scroll={{ y: 'calc(100vh - 280px)' }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <Space direction="vertical" align="center">
                            <AppstoreOutlined className="text-[48px]" />
                            <span>Vui lòng chọn danh mục bên trái</span>
                        </Space>
                    </div>
                )}
            </Card>

            {/* MODALS */}
            <CreateEditGroupModal
                open={isGroupModalOpen}
                onCancel={() => setIsGroupModalOpen(false)}
                group={editingGroup}
            />

            {selectedGroup && (
                <CreateEditDataModal
                    open={isDataModalOpen}
                    onCancel={() => setIsDataModalOpen(false)}
                    data={editingData}
                    groupId={selectedGroup._id}
                />
            )}
        </div>
    );
}

const AvatarIcon = () => (
    <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
        <FolderOutlined />
    </div>
);
