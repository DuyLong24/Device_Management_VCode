import { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { userManagementService } from '../services/user-management.service';
import type { UserDTO, UserFilters } from "../services/user-management.service";

export const useUserManagement = () => {
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<UserFilters>({
        page: 1,
        limit: 20,
    });
    const [total, setTotal] = useState(0);

    // Modal states
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);

    useEffect(() => {
        loadUsers();
    }, [filters]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const result = await userManagementService.getAll(filters);
            setUsers(result.data);
            setTotal(result.total);
        } catch (error: any) {
            message.error(error.message || 'Không thể tải danh sách users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        await userManagementService.create(data);
        setCreateModalVisible(false);
        loadUsers();
    };

    const handleUpdate = async (id: string, data: any) => {
        await userManagementService.update(id, data);
        setEditModalVisible(false);
        setSelectedUser(null);
        loadUsers();
    };

    const handleLock = (user: UserDTO) => {
        Modal.confirm({
            title: 'Khóa tài khoản?',
            content: `Bạn có chắc muốn khóa tài khoản ${user.email}?`,
            okText: 'Khóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await userManagementService.lock(user.id);
                    message.success('Đã khóa tài khoản');
                    loadUsers();
                } catch (error: any) {
                    message.error(error.message || 'Không thể khóa tài khoản');
                }
            },
        });
    };

    const handleUnlock = (user: UserDTO) => {
        Modal.confirm({
            title: 'Mở khóa tài khoản?',
            content: `Bạn có chắc muốn mở khóa tài khoản ${user.email}?`,
            okText: 'Mở khóa',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await userManagementService.unlock(user.id);
                    message.success('Đã mở khóa tài khoản');
                    loadUsers();
                } catch (error: any) {
                    message.error(error.message || 'Không thể mở khóa tài khoản');
                }
            },
        });
    };

    const handleResetPassword = async (id: string, password: string, mustChange: boolean) => {
        await userManagementService.resetPassword(id, password, mustChange);
        setResetPasswordModalVisible(false);
        setSelectedUser(null);
    };

    const handleExport = () => {
        message.info('Chức năng xuất Excel đang phát triển');
    };

    const openCreateModal = () => setCreateModalVisible(true);
    const openEditModal = (user: UserDTO) => {
        setSelectedUser(user);
        setEditModalVisible(true);
    };
    const openResetPasswordModal = (user: UserDTO) => {
        setSelectedUser(user);
        setResetPasswordModalVisible(true);
    };

    return {
        users,
        loading,
        filters,
        total,
        setFilters,
        loadUsers,
        handleLock,
        handleUnlock,
        handleExport,
        // Modals
        createModalVisible,
        editModalVisible,
        resetPasswordModalVisible,
        selectedUser,
        openCreateModal,
        openEditModal,
        openResetPasswordModal,
        handleCreate,
        handleUpdate,
        handleResetPassword,
        closeCreateModal: () => setCreateModalVisible(false),
        closeEditModal: () => {
            setEditModalVisible(false);
            setSelectedUser(null);
        },
        closeResetPasswordModal: () => {
            setResetPasswordModalVisible(false);
            setSelectedUser(null);
        },
    };
};
