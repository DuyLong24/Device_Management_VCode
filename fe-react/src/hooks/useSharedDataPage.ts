
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { sharedDataService } from '../services/shared-data.service';
import type { SharedDataGroup, SharedData } from '../services/shared-data.service';

export const useSharedDataPage = () => {
    const queryClient = useQueryClient();

    // UI State
    const [selectedGroup, setSelectedGroup] = useState<SharedDataGroup | null>(null);
    const [searchText, setSearchText] = useState('');

    // Modal State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<SharedDataGroup | null>(null);

    const [isDataModalOpen, setIsDataModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<SharedData | null>(null);

    // 1. Fetch Groups
    const { data: groups, isLoading: loadingGroups } = useQuery({
        queryKey: ['shared-data-groups'],
        queryFn: sharedDataService.getGroups,
    });

    // 2. Fetch Data for selected Group
    const { data: sharedDataList, isLoading: loadingData } = useQuery({
        queryKey: ['shared-data-list', selectedGroup?._id],
        queryFn: () => selectedGroup ? sharedDataService.getDataByGroupId(selectedGroup._id) : Promise.resolve([]),
        enabled: !!selectedGroup,
    });

    // Filter Data
    const filteredData = (sharedDataList || []).filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.code.toLowerCase().includes(searchText.toLowerCase())
    );

    // Handle Delete Group
    const deleteGroupMutation = useMutation({
        mutationFn: sharedDataService.deleteGroup,
        onSuccess: () => {
            message.success('Xóa nhóm thành công');
            queryClient.invalidateQueries({ queryKey: ['shared-data-groups'] });
            if (selectedGroup) setSelectedGroup(null);
        },
        onError: () => message.error('Không thể xóa nhóm (Có thể đang chứa dữ liệu)')
    });

    // Handle Delete Data
    const deleteDataMutation = useMutation({
        mutationFn: sharedDataService.deleteData,
        onSuccess: () => {
            message.success('Xóa dữ liệu thành công');
            queryClient.invalidateQueries({ queryKey: ['shared-data-list', selectedGroup?._id] });
        },
        onError: () => message.error('Xóa thất bại')
    });

    // Actions
    const openCreateGroup = () => {
        setEditingGroup(null);
        setIsGroupModalOpen(true);
    };

    const openEditGroup = (group: SharedDataGroup, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingGroup(group);
        setIsGroupModalOpen(true);
    };

    const handleDeleteGroup = (groupId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        deleteGroupMutation.mutate(groupId);
    };

    const openCreateData = () => {
        setEditingData(null);
        setIsDataModalOpen(true);
    };

    const openEditData = (data: SharedData) => {
        setEditingData(data);
        setIsDataModalOpen(true);
    };

    const handleDeleteData = (dataId: string) => {
        deleteDataMutation.mutate(dataId);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
    };

    return {
        // Data
        groups,
        filteredData,
        selectedGroup,
        loadingGroups,
        loadingData,
        searchText,

        // Modal Flags
        isGroupModalOpen,
        editingGroup,
        isDataModalOpen,
        editingData,

        // Setters (if needed directly)
        setSelectedGroup,
        setIsGroupModalOpen,
        setIsDataModalOpen,

        // Actions
        openCreateGroup,
        openEditGroup,
        handleDeleteGroup,
        openCreateData,
        openEditData,
        handleDeleteData,
        handleSearch
    };
};
