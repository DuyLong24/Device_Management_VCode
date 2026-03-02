import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import enUS from 'antd/locale/en_US';
import DashboardLayout from './components/layout/DashboardLayout';
import { PermissionRoute } from './components/routes/PermissionRoute';
import { NotificationProvider } from './contexts/NotificationProvider';
import { PERMISSION_KEYS } from './constants/permissionKeys';

import ImportListPage from './pages/Import/ImportListPage';
import CreateImportPage from './pages/Import/CreateImportPage';
import InventoryListPage from './pages/Import/InventoryListPage';
import InventoryCheckPage from './pages/Import/InventoryCheckPage';
import ImportDetailPage from './pages/Import/ImportDetailPage';
import DeviceListPage from './pages/Device/DeviceListPage';
import WarehousePage from './pages/Warehouse/WarehousePage';
import ExportListPage from './pages/Export/ExportListPage';
import CreateExportPage from './pages/Export/CreateExportPage';
import ExportDetailPage from './pages/Export/ExportDetailPage';
import DeviceDetailPage from './pages/Warehouse/DeviceDetailPage';
import ExportProcessPage from './pages/Export/ExportProcessPage';
import ExportCheckListPage from './pages/Export/ExportCheckListPage';
import RoleManagementPage from './pages/RoleManagement/RoleManagementPage';
import RolePermissionDetailPage from './pages/RoleManagement/RolePermissionDetailPage';
import UserManagementPage from './pages/UserManagement/UserManagementPage';
import SharedDataPage from './pages/SharedData/SharedDataPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WarrantyDashboardPage from './pages/Dashboard/WarrantyDashboardPage';
import ProfilePage from './pages/Profile/ProfilePage';
import WarrantyLookupPage from './pages/Public/WarrantyLookupPage';
// import LoginPage from './pages/Auth/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // staleTime: 1000 * 60 * 5,
      staleTime: 0,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={enUS}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <AntdApp>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* <Route path="/login" element={<LoginPage />} /> */}

                {/* Public Route */}
                <Route path="/warranty-check" element={<WarrantyLookupPage />} />

                <Route path="/" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="warranty-dashboard" element={<WarrantyDashboardPage />} />
                  <Route path="profile" element={<ProfilePage />} />

                  {/* MODULE NHẬP KHO */}
                  <Route path="import">
                    {/* 1. Danh sách tổng: /import/list */}
                    <Route path="list" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.IMPORT.LIST.VIEW}><ImportListPage /></PermissionRoute>} />

                    {/* 2. Tạo mới: /import/create */}
                    <Route path="create" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.IMPORT.CREATE.VIEW}><CreateImportPage /></PermissionRoute>} />
                    <Route path="edit/:id" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.IMPORT.CREATE.VIEW}><CreateImportPage /></PermissionRoute>} />

                    {/* 3. Danh sách chọn kiểm kê: /import/inventory-list */}
                    <Route path="inventory-list" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.IMPORT.INVENTORY.VIEW}><InventoryListPage /></PermissionRoute>} />

                    <Route path="inventory-check/:importId" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.IMPORT.INVENTORY.CHECK}><InventoryCheckPage /></PermissionRoute>} />

                    {/* 4. Chi tiết: /import/:id */}
                    <Route path=":id" element={<ImportDetailPage />} />
                  </Route>

                  {/* MODULE XUẤT KHO */}
                  <Route path="export">
                    <Route path="list" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.EXPORT.LIST.VIEW}><ExportListPage /></PermissionRoute>} />
                    <Route path="create" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.EXPORT.CREATE.VIEW}><CreateExportPage /></PermissionRoute>} />
                    <Route path="edit/:id" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.EXPORT.CREATE.VIEW}><CreateExportPage /></PermissionRoute>} />
                    <Route path="check" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.EXPORT.CHECK.VIEW}><ExportCheckListPage /></PermissionRoute>} />
                    <Route path=":id" element={<ExportDetailPage />} />
                    <Route path=":id/check" element={<PermissionRoute requiredPermission={PERMISSION_KEYS.EXPORT.CHECK.SCAN}><ExportProcessPage /></PermissionRoute>} />
                  </Route>

                  {/* --- CÁC MODULE KHÁC --- */}
                  <Route path="all-devices" element={
                    <PermissionRoute requiredPermission={PERMISSION_KEYS.DEVICE.LIST.VIEW}>
                      <DeviceListPage />
                    </PermissionRoute>
                  } />
                  <Route path="device/:mac" element={
                    <PermissionRoute requiredPermission={PERMISSION_KEYS.DEVICE.LIST.DETAIL}>
                      <DeviceDetailPage />
                    </PermissionRoute>
                  } />
                  <Route path="warehouse/:code" element={
                    <PermissionRoute requiredPermission={PERMISSION_KEYS.WAREHOUSE.ROOT.VIEW}>
                      <WarehousePage />
                    </PermissionRoute>
                  } />


                  {/* MODULE SYSTEM (Protected) */}
                  <Route path="system" element={<PermissionRoute requiredRole="Super admin" />}>
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="roles" element={<RoleManagementPage />} />
                    <Route path="roles/:id" element={<RolePermissionDetailPage />} />
                    <Route path="shared-data" element={<SharedDataPage />} />
                  </Route>
                  <Route path="*" element={<div>404 Not Found</div>} />
                </Route>
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;