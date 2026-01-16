import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import enUS from 'antd/locale/en_US';
import DashboardLayout from './components/layout/DashboardLayout';

import ImportListPage from './pages/Import/ImportListPage';
import CreateImportPage from './pages/Import/CreateImportPage';
import InventoryListPage from './pages/Import/InventoryListPage';
import InventoryCheckPage from './pages/Import/InventoryCheckPage';
import AllSerialsPage from './pages/AllSerialsPage';
import WarehousePage from './pages/Warehouse/WarehousePage';
import ExportListPage from './pages/Export/ExportListPage';

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
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />

            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<div>Nội dung Dashboard</div>} />

              {/* MODULE NHẬP KHO */}
              <Route path="import">
                {/* 1. Danh sách tổng: /import/list */}
                <Route path="list" element={<ImportListPage />} />

                {/* 2. Tạo mới: /import/create */}
                <Route path="create" element={<CreateImportPage />} />

                {/* 3. Danh sách chọn kiểm kê: /import/inventory-list */}
                <Route path="inventory-list" element={<InventoryListPage />} />

                <Route path="inventory-check/:importId" element={<InventoryCheckPage />} />
              </Route>

              {/* MODULE XUẤT KHO */}
              <Route path="export">
                <Route path="list" element={<ExportListPage />} />
                <Route path="create" element={<div>Create Export (Coming Soon)</div>} />
                <Route path="check" element={<div>Check Export (Coming Soon)</div>} />
              </Route>

              {/* --- CÁC MODULE KHÁC --- */}
              {/* --- CÁC MODULE KHÁC --- */}
              <Route path="all-serials" element={<AllSerialsPage />} />
              <Route path="warehouse/:code" element={<WarehousePage />} />

              <Route path="*" element={<div>404 Not Found</div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;