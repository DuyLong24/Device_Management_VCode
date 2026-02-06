import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import type { DeviceExport } from '../types/export.type';

// URL font hỗ trợ tiếng Việt (Roboto)
const ROBOTO_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';

export const exportExportTicketPDF = async (data: DeviceExport, projectName?: string) => {
    const doc = new jsPDF();

    // 1. Load Font (Async)
    try {
        const response = await fetch(ROBOTO_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const buffer = await response.arrayBuffer();

        const blob = new Blob([buffer]);
        const reader = new FileReader();
        reader.readAsDataURL(blob);

        await new Promise((resolve) => {
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const base64Clean = base64data.split(',')[1];

                doc.addFileToVFS('Roboto-Regular.ttf', base64Clean);
                doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
                doc.setFont('Roboto');
                resolve(true);
            };
        });
    } catch (error) {
        console.warn('Không thể tải font, sử dụng font mặc định', error);
    }

    // 2. Setup Data
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    // 3. Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('PHIẾU XUẤT KHO', pageWidth / 2, y, { align: 'center' });

    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Mã phiếu: ${data.code}`, pageWidth / 2, y, { align: 'center' });

    y += 6;
    doc.text(`Ngày in: ${dayjs().format('DD/MM/YYYY HH:mm')}`, pageWidth / 2, y, { align: 'center' });

    y += 20;

    // 4. General Info (Grid Layout)
    doc.setFontSize(11);
    doc.setTextColor(0);

    const infoX = margin;
    const valueX = margin + 35;
    const col2X = pageWidth / 2 + 10;
    const col2ValueX = col2X + 35;

    // Row 1
    doc.text('Tên phiếu:', infoX, y);
    doc.text(data.exportName || '---', valueX, y);

    doc.text('Ngày xuất:', col2X, y);
    doc.text(data.createdAt ? dayjs(data.createdAt).format('DD/MM/YYYY') : '---', col2ValueX, y);

    y += 8;
    // Row 2
    doc.text('Loại xuất:', infoX, y);
    doc.text(data.type || '---', valueX, y);

    doc.text('Trạng thái:', col2X, y);
    doc.text(data.status || '---', col2ValueX, y);

    y += 8;
    // Row 3
    doc.text('Người nhận:', infoX, y);
    doc.text(data.receiverPerson || data.receiver || '---', valueX, y);

    doc.text('Đơn vị nhận:', col2X, y);
    doc.text(data.receiver || '---', col2ValueX, y);

    y += 8;
    // Row 4
    doc.text('Dự án:', infoX, y);
    doc.text(projectName || data.project || '---', valueX, y);

    doc.text('Khách hàng:', col2X, y);
    doc.text(data.customer || '---', col2ValueX, y);

    y += 8;
    // Row 5
    doc.text('Địa chỉ:', infoX, y);
    doc.text(data.deliveryAddress || '---', valueX, y);

    y += 8;
    // Row 6
    doc.text('Người tạo:', infoX, y);
    const creatorName = typeof data.createdBy === 'object' ? (data.createdBy as any).name || (data.createdBy as any).username : data.createdBy;
    doc.text(creatorName || '---', valueX, y);

    if (data.approvedBy) {
        doc.text('Người duyệt:', col2X, y);
        const approverName = typeof data.approvedBy === 'object' ? (data.approvedBy as any).name || (data.approvedBy as any).username : data.approvedBy;
        doc.text(approverName || '---', col2ValueX, y);
    }


    y += 8;
    doc.text('Ghi chú:', infoX, y);
    doc.text(data.notes || '---', valueX, y);

    y += 15;

    // 5. Device Table
    // Determine items to show: if there are scanned items, show them. Otherwise show requirements.
    let tableBody: any[] = [];
    let tableHead: string[][] = [];

    if (data.items && data.items.length > 0) {
        tableHead = [['STT', 'Mã thiết bị (Model)', 'Tên thiết bị', 'Serial', 'MAC Address']];
        tableBody = data.items.map((item: any, index: number) => [
            String(index + 1),
            item.deviceModel || item.deviceCode || '---',
            item.deviceName || '---',
            item.serial || '---',
            item.mac || '---'
        ]);
    } else if (data.requirements && data.requirements.length > 0) {
        tableHead = [['STT', 'Mã thiết bị (Model)', 'Tên thiết bị', 'Số lượng yêu cầu']];
        tableBody = data.requirements.map((req: any, index: number) => [
            String(index + 1),
            req.deviceCode,
            req.deviceName || '---',
            String(req.quantity)
        ]);
    }

    if (tableBody.length > 0) {
        autoTable(doc, {
            startY: y,
            head: tableHead,
            body: tableBody,
            headStyles: {
                fillColor: [22, 119, 255],
                font: 'Roboto',
                fontStyle: 'bold'
            },
            styles: {
                font: 'Roboto',
                fontSize: 10,
                cellPadding: 3,
                fontStyle: 'normal'
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
            }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.text('(Chưa có danh sách thiết bị)', margin, y);
        y += 10;
    }


    // 6. Signatures (Footer)
    const storeKeeperY = y + 10;

    doc.setFontSize(11);
    doc.text('Người lập phiếu', margin + 20, storeKeeperY, { align: 'center' });
    doc.text('(Ký, họ tên)', margin + 20, storeKeeperY + 5, { align: 'center' });

    doc.text('Người nhận hàng', pageWidth / 2, storeKeeperY, { align: 'center' });
    doc.text('(Ký, họ tên)', pageWidth / 2, storeKeeperY + 5, { align: 'center' });

    doc.text('Thủ kho / Giám đốc', pageWidth - margin - 20, storeKeeperY, { align: 'center' });
    doc.text('(Ký, họ tên)', pageWidth - margin - 20, storeKeeperY + 5, { align: 'center' });


    // 7. Save
    doc.save(`PhieuXuat_${data.code}.pdf`);
};
