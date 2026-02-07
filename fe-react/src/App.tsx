import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import enUS from 'antd/locale/en_US';
import DashboardLayout from './components/layout/DashboardLayout';
import { PermissionRoute } from './components/routes/PermissionRoute';
import { NotificationProvider } from './contexts/NotificationProvider';

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
import ProfilePage from './pages/Profile/ProfilePage';
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

                <Route path="/" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="profile" element={<ProfilePage />} />

                  {/* MODULE NHẬP KHO */}
                  <Route path="import">
                    {/* 1. Danh sách tổng: /import/list */}
                    <Route path="list" element={<PermissionRoute requiredPermission="import:VIEW"><ImportListPage /></PermissionRoute>} />

                    {/* 2. Tạo mới: /import/create */}
                    <Route path="create" element={<PermissionRoute requiredPermission="import:CREATE"><CreateImportPage /></PermissionRoute>} />
                    <Route path="edit/:id" element={<PermissionRoute requiredPermission="import:UPDATE"><CreateImportPage /></PermissionRoute>} />

                    {/* 3. Danh sách chọn kiểm kê: /import/inventory-list */}
                    <Route path="inventory-list" element={<PermissionRoute requiredPermission="import.inventory:VIEW"><InventoryListPage /></PermissionRoute>} />

                    <Route path="inventory-check/:importId" element={<PermissionRoute requiredPermission="import.inventory:CHECK"><InventoryCheckPage /></PermissionRoute>} />

                    {/* 4. Chi tiết: /import/:id */}
                    <Route path=":id" element={<ImportDetailPage />} />
                  </Route>

                  {/* MODULE XUẤT KHO */}
                  <Route path="export">
                    <Route path="list" element={<PermissionRoute requiredPermission="export:VIEW"><ExportListPage /></PermissionRoute>} />
                    <Route path="create" element={<PermissionRoute requiredPermission="export:CREATE"><CreateExportPage /></PermissionRoute>} />
                    <Route path="edit/:id" element={<PermissionRoute requiredPermission="export:UPDATE"><CreateExportPage /></PermissionRoute>} />
                    <Route path="check" element={<PermissionRoute requiredPermission="export.check:VIEW"><ExportCheckListPage /></PermissionRoute>} />
                    <Route path=":id" element={<ExportDetailPage />} />
                    <Route path=":id/check" element={<PermissionRoute requiredPermission="export.check:CHECK"><ExportProcessPage /></PermissionRoute>} />
                  </Route>

                  {/* --- CÁC MODULE KHÁC --- */}
                  <Route path="all-devices" element={
                    <PermissionRoute requiredPermission="device:VIEW">
                      <DeviceListPage />
                    </PermissionRoute>
                  } />
                  <Route path="device/:mac" element={
                    <PermissionRoute requiredPermission="device:VIEW">
                      <DeviceDetailPage />
                    </PermissionRoute>
                  } />
                  <Route path="warehouse/:code" element={
                    <PermissionRoute requiredPermission="warehouse:VIEW">
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