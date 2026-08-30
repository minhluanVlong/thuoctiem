/**
 * Multi-sheet Excel Exporter for SỔ THUỐC TIÊM ĐIỆN TỬ
 * Formats columns strictly to nursing specifications:
 * 1. STT
 * 2. Tên người bệnh
 * 3. Tuổi (Năm hiện tại - Năm sinh / X tháng nếu bé nhi)
 * 4. Phòng (Khu nào - Buồng số mấy)
 * 5. Tên thuốc & Hàm lượng đầy đủ
 * 6. Ghi chú (Đường dùng / Dặn dò)
 * 7. Thời gian y lệnh (Cột cuối cùng)
 */
import * as XLSX from 'xlsx';
import {
  ProcessedInjectionRecord,
  PendingCheckRecord,
  ExcludedItemRecord,
  ProcessingReport,
  DayComparisonReport,
} from '../types/hospital';

export function exportHospitalWorkbook(params: {
  injections: ProcessedInjectionRecord[];
  pendingChecks: PendingCheckRecord[];
  excludedItems: ExcludedItemRecord[];
  report: ProcessingReport;
  reconciliationReport?: DayComparisonReport;
  selectedDate?: string;
  departmentName?: string;
}) {
  const {
    injections,
    pendingChecks,
    excludedItems,
    report,
    reconciliationReport,
    selectedDate,
    departmentName = 'Khoa Nội Tổng Hợp',
  } = params;

  const workbook = XLSX.utils.book_new();

  // ==========================================
  // --- SHEET 1: SỔ THUỐC TIÊM CHUẨN Y KHOA ---
  // ==========================================
  const sheet1Data: any[][] = [
    [`SỔ THUỐC TIÊM ĐIỆN TỬ HẰNG NGÀY - ${departmentName.toUpperCase()}`],
    [`Ngày thực hiện: ${selectedDate || 'Toàn bộ danh sách'} | Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
    [],
    [
      'STT',
      'Tên người bệnh',
      'Tuổi',
      'Phòng (Khu - Buồng)',
      'Tên thuốc & Hàm lượng',
      'Số lượng / ĐVT',
      'Ghi chú (Đường dùng / Dặn dò)',
      'Thời gian y lệnh',
      'Trạng thái thực hiện'
    ]
  ];

  injections.forEach((item, idx) => {
    sheet1Data.push([
      idx + 1,
      item.patientName,
      item.age || '',
      item.room || 'Chưa xếp phòng',
      item.drugFullName,
      `${item.quantity || 1} ${item.unit || 'Ống'}`,
      item.notes || (item.route ? `Đường dùng: ${item.route}` : ''),
      item.orderTime,
      item.isExecuted ? 'Đã tiêm' : 'Chưa tiêm'
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Column widths for optimal printing & viewing
  ws1['!cols'] = [
    { wch: 6 },  // 1. STT
    { wch: 28 }, // 2. Tên người bệnh
    { wch: 12 }, // 3. Tuổi
    { wch: 22 }, // 4. Phòng (Khu - Buồng)
    { wch: 36 }, // 5. Tên thuốc & Hàm lượng
    { wch: 16 }, // 6. Số lượng / ĐVT
    { wch: 32 }, // 7. Ghi chú
    { wch: 18 }, // 8. Thời gian y lệnh
    { wch: 18 }, // 9. Trạng thái
  ];

  XLSX.utils.book_append_sheet(workbook, ws1, 'SỔ THUỐC TIÊM');

  // =======================================================
  // --- SHEET 2: SO SÁNH ĐỐI CHIẾU VỚI NGÀY HÔM TRƯỚC ---
  // =======================================================
  if (reconciliationReport) {
    const sheetCompData: any[][] = [
      ['BẢNG ĐỐI SOÁT Y LỆNH THUỐC VỚI NGÀY HÔM TRƯỚC (MEDICATION RECONCILIATION)'],
      [
        `Đối chiếu: Ngày ${reconciliationReport.currentDate} so với Ngày ${reconciliationReport.previousDate} | ` +
        `Thuốc mới: ${reconciliationReport.newOrdersCount} | Đổi liều/giờ: ${reconciliationReport.changedOrdersCount} | Đã ngưng: ${reconciliationReport.discontinuedOrdersCount}`
      ],
      [],
      [
        'STT',
        'Tên người bệnh',
        'Phòng (Khu - Buồng)',
        'Tên thuốc & Hàm lượng',
        'Phân loại thay đổi',
        'Y lệnh hôm nay',
        'Y lệnh hôm trước',
        'Ghi chú đối chiếu'
      ]
    ];

    let compIdx = 1;

    // 1. New Orders
    injections.filter(i => i.changeStatus === 'NEW').forEach(item => {
      sheetCompData.push([
        compIdx++,
        item.patientName,
        item.room,
        item.drugFullName,
        'THUỐC MỚI THÊM (+)',
        `${item.quantity} ${item.unit} (${item.orderTime})`,
        '— (Chưa dùng hôm qua)',
        item.notes || 'Chỉ định mới hôm nay'
      ]);
    });

    // 2. Changed Orders
    injections.filter(i => i.changeStatus === 'CHANGED_DOSE' || i.changeStatus === 'CHANGED_TIME').forEach(item => {
      sheetCompData.push([
        compIdx++,
        item.patientName,
        item.room,
        item.drugFullName,
        item.changeStatus === 'CHANGED_DOSE' ? 'THAY ĐỔI LIỀU LƯỢNG (⟳)' : 'THAY ĐỔI GIỜ DÙNG (⟳)',
        `${item.quantity} ${item.unit} (${item.orderTime})`,
        `${item.previousDayDetails?.quantity || ''} ${item.unit} (${item.previousDayDetails?.orderTime || ''})`,
        item.notes || 'Cần lưu ý liều mới'
      ]);
    });

    // 3. Discontinued Orders
    reconciliationReport.discontinuedList.forEach(item => {
      sheetCompData.push([
        compIdx++,
        item.patientName,
        item.room,
        item.drugFullName,
        'ĐÃ DỪNG / NGƯNG THUỐC (✕)',
        '— (Đã ngưng hôm nay)',
        `${item.quantity} ${item.unit} (${item.orderTime})`,
        'Bác sĩ đã cho dừng thuốc'
      ]);
    });

    const wsComp = XLSX.utils.aoa_to_sheet(sheetCompData);
    wsComp['!cols'] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 20 },
      { wch: 32 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsComp, 'ĐỐI CHIẾU HÔM TRƯỚC');
  }

  // ==========================================
  // --- SHEET 3: BÁO CÁO THỐNG KÊ TỔNG HỢP ---
  // ==========================================
  const sheet3Data: any[][] = [
    ['BÁO CÁO THỐNG KÊ VÀ ĐỐI SOÁT DỮ LIỆU SỔ THUỐC TIÊM'],
    [`Khoa/Đơn vị: ${departmentName} | Ngày: ${selectedDate || 'Toàn bộ'}`],
    [],
    ['Chỉ số thống kê', 'Số lượng', 'Đơn vị tính', 'Ghi chú / Tỷ lệ'],
    ['1. Tổng số dòng dữ liệu file thuốc gốc', report.totalDrugRows, 'Dòng', 'Dữ liệu xuất từ phần mềm HIS'],
    ['2. Tổng số lượt thuốc tiêm hợp lệ đã vào sổ', report.totalValidInjections, 'Lượt tiêm', 'Đã phân bổ khu, buồng, giờ tiêm'],
    ['3. Số bệnh nhân nội trú có chỉ định tiêm', report.patientsWithRoom, 'Bệnh nhân', 'Đã xác định khu/buồng'],
    ['4. Số y lệnh dịch truyền đã phân loại', report.totalExcludedInfusions, 'Dòng', 'Dịch truyền NaCl, Glucose, Ringer...'],
    ['5. Số y lệnh vật tư y tế đã lọc ra', report.totalExcludedSupplies, 'Dòng', 'Bơm tiêm, kim tiêm, dây truyền, găng...'],
    ['6. Số cảnh báo khả năng trùng y lệnh tiêm', report.duplicateWarningCount, 'Lượt', 'Cùng người bệnh, thuốc, hàm lượng, giờ'],
    [],
    ['Điều dưỡng thực hiện', '', '', 'Điều dưỡng trưởng khoa']
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 45 },
    { wch: 14 },
    { wch: 16 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, ws3, 'THỐNG KÊ');

  // ====================================================
  // --- SHEET 4: VẬT TƯ Y TẾ & DỊCH TRUYỀN ĐÃ LOẠI TRỪ ---
  // ====================================================
  if (excludedItems.length > 0) {
    const sheet4Data: any[][] = [
      ['DANH MỤC VẬT TƯ VÀ DỊCH TRUYỀN ĐÃ ĐƯỢC HỆ THỐNG LỌC BỎ'],
      [`Tổng số dòng đã lọc ra: ${excludedItems.length} dòng`],
      [],
      [
        'STT',
        'Tên bệnh nhân',
        'Tên mục / Dịch / Vật tư',
        'Phân loại',
        'Đường dùng',
        'Đơn vị',
        'Giờ y lệnh',
        'Lý do loại bỏ'
      ]
    ];

    excludedItems.forEach((item, idx) => {
      sheet4Data.push([
        idx + 1,
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
      { wch: 25 },
      { wch: 32 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(workbook, ws4, 'VẬT TƯ ĐÃ LOẠI');
  }

  // Trigger Excel Download
  const dateStr = selectedDate ? selectedDate.replace(/\//g, '-') : new Date().toISOString().slice(0, 10);
  const fileName = `So_Thuoc_Tiem_${departmentName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
