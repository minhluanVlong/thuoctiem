/**
 * Multi-sheet Excel Exporter for SỔ THUỐC TIÊM ĐIỆN TỬ
 * Includes:
 * Sheet 1: SỔ TIÊM MA TRẬN (Mẫu Sổ Tay Điều Dưỡng - Bệnh nhân × Thuốc kèm liều & cữ giờ 7-15-23)
 * Sheet 2: SỔ THUỐC TIÊM CHI TIẾT (7 Cột Chuẩn Y Khoa)
 * Sheet 3: BẢNG ĐỐI SOÁT Y LỆNH HÔM TRƯỚC (Medication Reconciliation)
 * Sheet 4: DANH SÁCH CẦN BỔ SUNG ĐƯỜNG DÙNG
 * Sheet 5: DỊCH TRUYỀN & VẬT TƯ ĐÃ TÁCH
 */
import * as XLSX from 'xlsx';
import {
  ProcessedInjectionRecord,
  PendingCheckRecord,
  ExcludedItemRecord,
  ProcessingReport,
  DayComparisonReport,
} from '../types/hospital';
import { buildNurseMatrixData } from './matrixBuilder';
import { buildGroupedInjectionBook } from './patientBookBuilder';

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

  // Build the grouped book data for 2 Zones (Section 18)
  const bookData = buildGroupedInjectionBook(injections);

  // =========================================================================
  // --- HELPER TO BUILD 4-COLUMN SHEET FOR A WARD ---
  // =========================================================================
  const buildWardSheet = (patients: typeof bookData.khuNoiNhiPatients, wardTitle: string) => {
    const sheetData: any[][] = [
      [`SỔ THUỐC TIÊM – ${wardTitle.toUpperCase()}`],
      [`Khoa: ${departmentName.toUpperCase()} | Ngày y lệnh: ${selectedDate || 'Dữ liệu Excel'} | Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
      [],
      ['STT', 'Tên', 'Tuổi', 'Số phòng', 'Thuốc tiêm'],
    ];

    patients.forEach((p, idx) => {
      // Format multiline injection orders inside the cell
      const medsCell = p.medications
        .map((m) => {
          const lines = [
            m.originalDrugName,
            m.dosageAndSolventText,
            m.isInsulin ? '' : m.frequencyText,
            m.timeScheduleText,
          ].filter(Boolean);
          return lines.join('\n');
        })
        .join('\n\n');

      sheetData.push([idx + 1, p.patientName, p.age || '', p.shortRoom, medsCell]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 6 },   // STT
      { wch: 28 },  // Tên
      { wch: 10 },  // Tuổi
      { wch: 18 },  // Số phòng
      { wch: 55 },  // Thuốc tiêm (multiline)
    ];

    return ws;
  };

  // ---------------- SHEET 1: KHU NỘI NHI (Section 18) ----------------
  const wsKhuNoiNhi = buildWardSheet(bookData.khuNoiNhiPatients, 'KHU NỘI NHI');
  XLSX.utils.book_append_sheet(workbook, wsKhuNoiNhi, 'KHU NỘI NHI');

  // ---------------- SHEET 2: KHU NHIỄM (Section 18) ----------------
  const wsKhuNhiem = buildWardSheet(bookData.khuNhiemPatients, 'KHU NHIỄM');
  XLSX.utils.book_append_sheet(workbook, wsKhuNhiem, 'KHU NHIỄM');

  // =========================================================================
  // --- SHEET 3: SỔ TIÊM MA TRẬN ĐIỀU DƯỠNG (MÔ PHỎNG SỔ TAY THỰC TẾ) ---
  // =========================================================================
  const matrixData = buildNurseMatrixData(injections);

  const matrixSheetData: any[][] = [
    [`SỔ THUỐC TIÊM & KHÍ DUNG (MA TRẬN ĐIỀU DƯỠNG) - ${departmentName.toUpperCase()}`],
    [`Ngày y lệnh: ${selectedDate || '19/05/2026'} | Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
    [],
  ];

  // Header Row 1: STT, Họ và tên, Tuổi, Phòng, [Tên các loại thuốc]
  const matrixHeaderRow = [
    'STT',
    'Họ và tên người bệnh',
    'Tuổi',
    'Phòng',
    ...matrixData.columns.map((c) => `${c.drugName} (${c.route})`),
  ];
  matrixSheetData.push(matrixHeaderRow);

  // Data Rows
  matrixData.rows.forEach((row, idx) => {
    const rowValues = [
      idx + 1,
      row.patientName,
      row.age,
      row.room,
      ...matrixData.columns.map((col) => {
        const cell = row.cells[col.id];
        if (!cell) return '';
        // Format as: "1 x 3 [7-15-23]" + (notes ? " (+ Mới)" : "")
        let text = `${cell.doseText}\n${cell.timeSchedule}`;
        if (cell.notes) text += `\n(${cell.notes})`;
        if (cell.isExecuted) text += ' [Đã tiêm]';
        return text;
      }),
    ];
    matrixSheetData.push(rowValues);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixSheetData);

  // Column widths
  wsMatrix['!cols'] = [
    { wch: 6 },   // STT
    { wch: 28 },  // Họ tên
    { wch: 10 },  // Tuổi
    { wch: 12 },  // Phòng
    ...matrixData.columns.map(() => ({ wch: 22 })),
  ];

  XLSX.utils.book_append_sheet(workbook, wsMatrix, 'SỔ TIÊM MA TRẬN');

  // =========================================================================
  // --- SHEET 2: SỔ THUỐC TIÊM CHI TIẾT (CHUẨN 7 CỘT Y KHOA) ---
  // =========================================================================
  const sheetDetailData: any[][] = [
    [`SỔ THUỐC TIÊM ĐIỆN TỬ CHI TIẾT - ${departmentName.toUpperCase()}`],
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
    sheetDetailData.push([
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

  const wsDetail = XLSX.utils.aoa_to_sheet(sheetDetailData);
  wsDetail['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 12 },
    { wch: 22 },
    { wch: 36 },
    { wch: 16 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, wsDetail, 'DANH SÁCH CHI TIẾT');

  // =======================================================
  // --- SHEET 3: SO SÁNH ĐỐI CHIẾU VỚI NGÀY HÔM TRƯỚC ---
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
      { wch: 28 },
      { wch: 20 },
      { wch: 34 },
      { wch: 26 },
      { wch: 24 },
      { wch: 24 },
      { wch: 28 }
    ];

    XLSX.utils.book_append_sheet(workbook, wsComp, 'ĐỐI CHIẾU HÔM TRƯỚC');
  }

  // ========================================================
  // --- SHEET 4: CẦN BỔ SUNG ĐƯỜNG DÙNG ---
  // ========================================================
  if (pendingChecks.length > 0) {
    const sheetPendingData: any[][] = [
      ['DANH SÁCH Y LỆNH CẦN BỔ SUNG ĐƯỜNG DÙNG'],
      ['Vui lòng kiểm tra lại đường dùng hoặc dặn dò của bác sĩ điều trị'],
      [],
      ['STT', 'Tên người bệnh', 'Phòng', 'Tên thuốc', 'Ghi chú ban đầu', 'Lý do cần kiểm tra']
    ];

    pendingChecks.forEach((p, idx) => {
      sheetPendingData.push([
        idx + 1,
        p.patientName,
        p.room || 'Chưa rõ',
        p.drugName,
        p.notes || '',
        p.reason,
      ]);
    });

    const wsPending = XLSX.utils.aoa_to_sheet(sheetPendingData);
    wsPending['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 20 },
      { wch: 34 },
      { wch: 26 },
      { wch: 36 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsPending, 'CẦN KIỂM TRA');
  }

  // ========================================================
  // --- SHEET 5: DỊCH TRUYỀN & VẬT TƯ ĐÃ LOẠI ---
  // ========================================================
  if (excludedItems.length > 0) {
    const sheetExcludedData: any[][] = [
      ['DANH SÁCH DỊCH TRUYỀN & VẬT TƯ ĐÃ TÁCH KHỎI SỔ THUỐC TIÊM'],
      ['(Chỉ đưa thuốc tiêm, thuốc khí dung và insulin vào sổ tiêm)'],
      [],
      ['STT', 'Tên người bệnh', 'Tên vật tư / dịch truyền', 'Phân loại', 'Lý do loại']
    ];

    excludedItems.forEach((ex, idx) => {
      sheetExcludedData.push([
        idx + 1,
        ex.patientName,
        ex.itemName,
        ex.category === 'INFUSION' ? 'Dịch truyền' : ex.category === 'MEDICAL_SUPPLY' ? 'Vật tư y tế' : 'Khác',
        ex.reason,
      ]);
    });

    const wsExcluded = XLSX.utils.aoa_to_sheet(sheetExcludedData);
    wsExcluded['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 36 },
      { wch: 20 },
      { wch: 36 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsExcluded, 'VẬT TƯ & DỊCH TRUYỀN');
  }

  // Trigger Excel File Download
  const cleanDate = (selectedDate || 'so_tiem').replace(/[\/\\]/g, '_');
  const fileName = `So_Thuoc_Tiem_Ma_Tran_${cleanDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
