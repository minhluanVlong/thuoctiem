/**
 * Multi-sheet Excel Exporter for Sổ Thuốc Tiêm Điện Tử
 */
import * as XLSX from 'xlsx';
import { ProcessedInjectionRecord, PendingCheckRecord, ExcludedItemRecord, ProcessingReport } from '../types/hospital';

export function exportHospitalWorkbook(params: {
  injections: ProcessedInjectionRecord[];
  pendingChecks: PendingCheckRecord[];
  excludedItems: ExcludedItemRecord[];
  report: ProcessingReport;
  selectedDate?: string;
  departmentName?: string;
}) {
  const { injections, pendingChecks, excludedItems, report, selectedDate, departmentName = 'Khoa Nội Tổng Hợp' } = params;

  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: SỔ THUỐC TIÊM ---
  const sheet1Data: any[][] = [
    [`SỔ THUỐC TIÊM HẰNG NGÀY - ${departmentName.toUpperCase()}`],
    [`Ngày thực hiện: ${selectedDate || 'Tất cả các ngày'} | Thời gian xuất file: ${new Date().toLocaleString('vi-VN')}`],
    [],
    [
      'STT',
      'Mã người bệnh',
      'Họ và tên bệnh nhân',
      'Tuổi',
      'Giới tính',
      'Phòng',
      'Giường',
      'Thuốc tiêm',
      'Hàm lượng',
      'Đơn vị tính',
      'Số lượng',
      'Đường dùng',
      'Thời gian y lệnh',
      'Ngày y lệnh',
      'Trạng thái thực hiện',
      'Cảnh báo trùng',
      'Ghi chú'
    ]
  ];

  injections.forEach((item, idx) => {
    sheet1Data.push([
      idx + 1,
      item.patientCode || '',
      item.patientName,
      item.age || '',
      item.gender || '',
      item.room,
      item.bed || '',
      item.drugFullName,
      item.strength || '',
      item.unit || '',
      item.quantity || 1,
      item.route || '',
      item.orderTime,
      item.orderDate,
      item.isExecuted ? 'Đã tiêm' : 'Chưa tiêm',
      item.isDuplicate ? 'CÓ KHẢ NĂNG TRÙNG LỆNH' : 'Bình thường',
      item.notes || ''
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Column widths
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // MaBN
    { wch: 25 }, // HoTen
    { wch: 8 },  // Tuoi
    { wch: 10 }, // Gioi
    { wch: 12 }, // Phong
    { wch: 12 }, // Giuong
    { wch: 32 }, // Thuoc
    { wch: 14 }, // HamLuong
    { wch: 12 }, // DVT
    { wch: 10 }, // SoLuong
    { wch: 14 }, // DuongDung
    { wch: 18 }, // GioYLenh
    { wch: 14 }, // NgayYLenh
    { wch: 18 }, // TrangThai
    { wch: 24 }, // CanhBao
    { wch: 20 }, // GhiChu
  ];

  XLSX.utils.book_append_sheet(workbook, ws1, 'SỔ THUỐC TIÊM');

  // --- SHEET 2: CẦN KIỂM TRA ---
  const sheet2Data: any[][] = [
    ['DANH SÁCH DỮ LIỆU CẦN KIỂM TRA (CHƯA ĐỦ THÔNG TIN / CHƯA GHÉP ĐƯỢC)'],
    [`Tổng số ca cần kiểm tra: ${pendingChecks.length} dòng`],
    [],
    [
      'STT',
      'Mã người bệnh',
      'Họ và tên bệnh nhân',
      'Tuổi',
      'Giới tính',
      'Tên thuốc / Y lệnh',
      'Hàm lượng',
      'Đường dùng',
      'Thời gian y lệnh',
      'Lý do cần kiểm tra',
      'Mức độ ưu tiên'
    ]
  ];

  pendingChecks.forEach((item, idx) => {
    sheet2Data.push([
      idx + 1,
      item.patientCode || '',
      item.patientName,
      item.age || '',
      item.gender || '',
      item.drugName,
      item.strength || '',
      item.route || '',
      item.orderTime || '',
      item.reason,
      item.severity === 'HIGH' ? 'ƯU TIÊN CAO' : 'CẦN XÁC NHẬN'
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 25 },
    { wch: 8 },
    { wch: 10 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 45 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, ws2, 'CẦN KIỂM TRA');

  // --- SHEET 3: THỐNG KÊ ---
  const sheet3Data: any[][] = [
    ['BÁO CÁO THỐNG KÊ VÀ ĐỐI SOÁT DỮ LIỆU SỔ THUỐC TIÊM'],
    [`Đơn vị: ${departmentName} | Ngày: ${selectedDate || 'Toàn bộ'}`],
    [],
    ['Chỉ số thống kê', 'Số lượng', 'Đơn vị tính', 'Ghi chú / Tỷ lệ'],
    ['1. Tổng số dòng dữ liệu file thuốc gốc', report.totalDrugRows, 'Dòng', 'Dữ liệu xuất từ phần mềm HIS'],
    ['2. Tổng số lượt thuốc tiêm hợp lệ đã ghép phòng', report.totalValidInjections, 'Lượt tiêm', 'Đã xác định phòng, giường, giờ tiêm'],
    ['3. Số bệnh nhân nội trú có chỉ định tiêm', report.patientsWithRoom, 'Bệnh nhân', 'Đã phân bổ phòng'],
    ['4. Số y lệnh cần kiểm tra lại (chưa đưa vào sổ chính)', report.totalPendingChecks, 'Dòng', 'Chưa rõ phòng hoặc thiếu thông tin'],
    ['5. Số bệnh nhân chưa xác định được phòng', report.patientsWithoutRoom, 'Bệnh nhân', 'Không khớp danh sách phòng'],
    ['6. Số y lệnh dịch truyền đã loại khỏi sổ tiêm', report.totalExcludedInfusions, 'Dòng', 'NaCl, Glucose, Ringer, dung dịch thay thế...'],
    ['7. Số y lệnh vật tư y tế đã loại khỏi sổ tiêm', report.totalExcludedSupplies, 'Dòng', 'Bơm tiêm, kim tiêm, dây truyền, găng tay, gạc...'],
    ['8. Số y lệnh khác (uống, bôi, ngoài da) đã loại', report.totalExcludedOther, 'Dòng', 'Đường dùng không phải tiêm'],
    ['9. Số cảnh báo khả năng trùng y lệnh tiêm', report.duplicateWarningCount, 'Lượt', 'Cùng người bệnh, thuốc, hàm lượng, giờ'],
    [],
    ['Người lập báo cáo (Điều dưỡng)', '', '', 'Điều dưỡng trưởng khoa']
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 45 },
    { wch: 14 },
    { wch: 16 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, ws3, 'THỐNG KÊ');

  // --- SHEET 4: DỊCH TRUYỀN & VẬT TƯ ĐÃ LOẠI ---
  const sheet4Data: any[][] = [
    ['DANH MỤC DỊCH TRUYỀN VÀ VẬT TƯ Y TẾ ĐÃ ĐƯỢC HỆ THỐNG LOẠI BỎ'],
    [`Tổng số dòng đã lọc ra: ${excludedItems.length} dòng`],
    [],
    [
      'STT',
      'Mã người bệnh',
      'Họ và tên bệnh nhân',
      'Tên mục / Dịch / Vật tư',
      'Phân loại',
      'Đường dùng',
      'Đơn vị tính',
      'Giờ y lệnh',
      'Lý do loại bỏ'
    ]
  ];

  excludedItems.forEach((item, idx) => {
    sheet4Data.push([
      idx + 1,
      item.patientCode || '',
      item.patientName,
      item.itemName,
      item.category === 'INFUSION' ? 'DỊCH TRUYỀN' : (item.category === 'MEDICAL_SUPPLY' ? 'VẬT TƯ Y TẾ' : 'KHÁC'),
      item.route || '',
      item.unit || '',
      item.orderTime || '',
      item.reason
    ]);
  });

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  ws4['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 25 },
    { wch: 32 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, ws4, 'DỊCH TRUYỀN & VẬT TƯ ĐÃ LOẠI');

  // Generate and trigger download
  const dateStr = selectedDate ? selectedDate.replace(/\//g, '-') : new Date().toISOString().slice(0, 10);
  const fileName = `So_Thuoc_Tiem_${departmentName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
