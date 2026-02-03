import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import enUS from 'antd/locale/en_US';
import DashboardLayout from './components/layout/DashboardLayout';
import { PermissionRoute } from './components/routes/PermissionRoute';

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
import SerialDetailPage from './pages/Warehouse/SerialDetailPage';
import ExportProcessPage from './pages/Export/ExportProcessPage';
import ExportCheckListPage from './pages/Export/ExportCheckListPage';
import RoleManagementPage from './pages/RoleManagement/RoleManagementPage';
import UserManagementPage from './pages/UserManagement/UserManagementPage';
import SharedDataPage from './pages/SharedData/SharedDataPage';
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
          <BrowserRouter>
            <Routes>
              {/* <Route path="/login" element={<LoginPage />} /> */}

              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<div>Nội dung Dashboard</div>} />

                {/* MODULE NHẬP KHO */}
                <Route path="import">
                  {/* 1. Danh sách tổng: /import/list */}
                  <Route path="list" element={<ImportListPage />} />

                  {/* 2. Tạo mới: /import/create */}
                  <Route path="create" element={<CreateImportPage />} />
                  <Route path="edit/:id" element={<CreateImportPage />} />

                  {/* 3. Danh sách chọn kiểm kê: /import/inventory-list */}
                  <Route path="inventory-list" element={<InventoryListPage />} />

                  <Route path="inventory-check/:importId" element={<InventoryCheckPage />} />

                  {/* 4. Chi tiết: /import/:id */}
                  <Route path=":id" element={<ImportDetailPage />} />
                </Route>

                {/* MODULE XUẤT KHO */}
                <Route path="export">
                  <Route path="list" element={<ExportListPage />} />
                  <Route path="create" element={<CreateExportPage />} />
                  <Route path="edit/:id" element={<CreateExportPage />} />
                  <Route path="check" element={<ExportCheckListPage />} />
                  <Route path=":id" element={<ExportDetailPage />} />
                  <Route path=":id/check" element={<ExportProcessPage />} />
                </Route>

                {/* --- CÁC MODULE KHÁC --- */}
                <Route path="all-devices" element={<DeviceListPage />} />
                <Route path="serial/:serial" element={<SerialDetailPage />} />
                <Route path="warehouse/:code" element={<WarehousePage />} />


                {/* MODULE SYSTEM (Protected) */}
                <Route path="system" element={<PermissionRoute requiredRole="Super admin" />}>
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="roles" element={<RoleManagementPage />} />
                  <Route path="shared-data" element={<SharedDataPage />} />
                </Route>
                <Route path="*" element={<div>404 Not Found</div>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;