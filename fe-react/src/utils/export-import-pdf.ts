import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import type { DeviceImport } from '../types/import.type';

// URL font hỗ trợ tiếng Việt (Roboto)
const ROBOTO_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';

export const exportImportPDF = async (data: DeviceImport) => {
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
    doc.text('PHIẾU NHẬP KHO', pageWidth / 2, y, { align: 'center' });

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
    doc.text('Ngày nhập:', infoX, y);
    doc.text(dayjs(data.importDate).format('DD/MM/YYYY'), valueX, y);

    doc.text('Loại hàng:', col2X, y);
    doc.text(data.deviceType, col2ValueX, y);

    y += 8;
    // Row 2
    doc.text('Nhà cung cấp:', infoX, y);
    doc.text(data.supplier || '---', valueX, y);

    doc.text('Nguồn gốc:', col2X, y);
    doc.text(data.origin === 'IMPORT' ? 'Nhập khẩu' : data.origin === 'DOMESTIC' ? 'Nội địa' : data.origin, col2ValueX, y);

    y += 8;
    // Row 3 (Full width)
    doc.text('Người nhập:', infoX, y);
    doc.text(data.importedBy || data.createdBy?.name || '---', valueX, y);

    y += 8;
    doc.text('Ghi chú:', infoX, y);
    doc.text(data.notes || '---', valueX, y);

    y += 15;

    // 5. Device Table
    autoTable(doc, {
        startY: y,
        head: [['STT', 'Mã thiết bị (Model)', 'Số lượng', 'Quy cách', 'Serial đã nhập']],
        body: data.devices.map((p, index) => [
            index + 1,
            p.deviceCode,
            p.quantity,
            p.boxCount ? `${p.boxCount} thùng x ${p.itemsPerBox} cái` : '---',
            `${p.serialImported || 0} / ${p.quantity}`
        ]),
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
            2: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 35, halign: 'center' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || y;

    // 6. Signatures (Footer)
    const storeKeeperY = finalY + 20;

    doc.setFontSize(11);
    doc.text('Người lập phiếu', margin + 20, storeKeeperY, { align: 'center' });
    doc.text('(Ký, họ tên)', margin + 20, storeKeeperY + 5, { align: 'center' });

    doc.text('Người giao hàng', pageWidth / 2, storeKeeperY, { align: 'center' });
    doc.text('(Ký, họ tên)', pageWidth / 2, storeKeeperY + 5, { align: 'center' });

    doc.text('Thủ kho', pageWidth - margin - 20, storeKeeperY, { align: 'center' });
    doc.text('(Ký, họ tên)', pageWidth - margin - 20, storeKeeperY + 5, { align: 'center' });


    // 7. Save
    doc.save(`PhieuNhap_${data.code}.pdf`);
};
