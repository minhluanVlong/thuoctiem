/**
 * SỔ THUỐC TIÊM ĐIỆN TỬ - Electronic Inpatient Injection Record
 * Hospital medication reconciliation, room matching, and administration workbook.
 * Modeled accurately after the real hospital handwritten nurse injection book.
 */
import React, { useState, useCallback } from 'react';
import {
  Syringe,
  AlertTriangle,
  Droplets,
  Sparkles,
  GitCompare,
  FileSpreadsheet,
  BookOpen,
  LayoutGrid,
  ListOrdered
} from 'lucide-react';

import {
  RawDrugRecord,
  ProcessedInjectionRecord,
  PendingCheckRecord,
  ExcludedItemRecord,
  ProcessingReport,
  ColumnMappingPreview,
} from './types/hospital';

import {
  readWorkbookSheet,
  parseDrugOrderSheet,
} from './utils/excelParser';

import { processAndMatchHospitalData } from './utils/matchingEngine';
import { exportHospitalWorkbook } from './utils/excelExporter';
import {
  SAMPLE_DRUG_ORDERS_TODAY,
  SAMPLE_DRUG_ORDERS_YESTERDAY
} from './data/sampleHospitalData';

import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StatsCards } from './components/StatsCards';
import { NurseMatrixTable } from './components/NurseMatrixTable';
import { InjectionTable } from './components/InjectionTable';
import { PendingCheckTable } from './components/PendingCheckTable';
import { ExcludedItemsTable } from './components/ExcludedItemsTable';
import { PrintModal } from './components/PrintModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { MedicationReconciliationModal } from './components/MedicationReconciliationModal';

export default function App() {
  // Hospital Settings State
  const [hospitalName, setHospitalName] = useState<string>('BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH');
  const [departmentName, setDepartmentName] = useState<string>('KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM');
  const [selectedDate, setSelectedDate] = useState<string>(''); // Default blank as requested - user can input their custom date

  // Raw Loaded Data (Single HIS Excel file)
  const [rawDrugRecords, setRawDrugRecords] = useState<RawDrugRecord[]>([]);
  const [drugFilePreview, setDrugFilePreview] = useState<ColumnMappingPreview | null>(null);

  // Processed Output Data
  const [injections, setInjections] = useState<ProcessedInjectionRecord[]>([]);
  const [pendingChecks, setPendingChecks] = useState<PendingCheckRecord[]>([]);
  const [excludedItems, setExcludedItems] = useState<ExcludedItemRecord[]>([]);
  const [report, setReport] = useState<ProcessingReport | null>(null);

  // UI Flow State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'NURSE_MATRIX' | 'MAIN_INJECTIONS' | 'PENDING_CHECKS' | 'EXCLUDED_ITEMS'>('NURSE_MATRIX');

  // Modals State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);

  // Run Extraction & Matching Algorithm
  const executeProcessing = useCallback((
    drugRecs: RawDrugRecord[],
    dateOverride?: string,
    previousDayRecs?: RawDrugRecord[]
  ) => {
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const result = processAndMatchHospitalData({
          drugRecords: drugRecs,
          roomRecords: [], // Self-contained within drugRecords (Khoa Buồng - Giường)
          previousDayDrugRecords: previousDayRecs || SAMPLE_DRUG_ORDERS_YESTERDAY,
          selectedDate: dateOverride !== undefined ? dateOverride : selectedDate,
        });

        setInjections(result.injections);
        setPendingChecks(result.pendingChecks);
        setExcludedItems(result.excludedItems);
        setReport(result.report);

        if (result.report.departmentName) {
          setDepartmentName(result.report.departmentName);
        }
      } catch (err: any) {
        console.error('Processing error:', err);
        alert(`Lỗi trong quá trình xử lý dữ liệu: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 200);
  }, [selectedDate]);

  // Handle File Upload (Single Drug Orders File)
  const handleUploadDrugFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const sheetData = readWorkbookSheet(buffer);
      const { records, preview } = parseDrugOrderSheet(sheetData, file.name);

      setRawDrugRecords(records);
      setDrugFilePreview(preview);

      // Auto process upon upload
      executeProcessing(records);
    } catch (err: any) {
      console.error('Error reading Drug Order file:', err);
      alert(`Lỗi khi đọc file thuốc: ${err.message || 'File Excel không đúng định dạng'}`);
    }
  };

  // Load Realistic Hospital Demo Data (Matches exactly the real hospital nurse notebook)
  const handleLoadDemo = () => {
    setHospitalName('BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH');
    setDepartmentName('KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM');
    setRawDrugRecords(SAMPLE_DRUG_ORDERS_TODAY);
    setDrugFilePreview({
      fileName: 'thongke_truyendich_thuoc_tiem_19_05_2026.xlsx',
      detectedHeaders: {
        patientName: 'Họ tên người bệnh',
        gender: 'Giới tính',
        dob: 'Ngày sinh',
        patientAddress: 'Địa chỉ',
        departmentRoomBed: 'Khoa Buồng - Giường',
        drugName: 'Thuốc',
        notes: 'Ghi chú',
        treatmentSheet: 'Tờ điều trị',
        categoryType: 'Loại',
        orderTime: 'Thời gian y lệnh',
        doctor: 'Bác sĩ chỉ định'
      },
      missingRequired: [],
      totalRows: SAMPLE_DRUG_ORDERS_TODAY.length,
    });

    setSelectedDate('19/05/2026');
    executeProcessing(SAMPLE_DRUG_ORDERS_TODAY, '19/05/2026', SAMPLE_DRUG_ORDERS_YESTERDAY);
  };

  // Re-run when date selection changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (rawDrugRecords.length > 0) {
      executeProcessing(rawDrugRecords, newDate);
    }
  };

  // Toggle single injection administration check
  const handleToggleExecution = (id: string) => {
    setInjections((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = !item.isExecuted;
          const slotsCount = item.timeSlots?.length || 1;
          return {
            ...item,
            isExecuted: nextStatus,
            timeSlotsExecuted: new Array(slotsCount).fill(nextStatus),
          };
        }
        return item;
      })
    );
  };

  // Toggle specific dose/slot execution for an injection
  const handleToggleSlotExecution = (id: string, slotIndex: number) => {
    setInjections((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const currentSlots = item.timeSlotsExecuted && item.timeSlotsExecuted.length > 0
            ? [...item.timeSlotsExecuted]
            : new Array(item.timeSlots?.length || 1).fill(!!item.isExecuted);

          if (slotIndex >= 0 && slotIndex < currentSlots.length) {
            currentSlots[slotIndex] = !currentSlots[slotIndex];
          }

          const allExecuted = currentSlots.length > 0 && currentSlots.every(Boolean);

          return {
            ...item,
            timeSlotsExecuted: currentSlots,
            isExecuted: allExecuted,
          };
        }
        return item;
      })
    );
  };

  // Batch toggle injection administration
  const handleBatchToggleExecution = (ids: string[], status: boolean) => {
    const idSet = new Set(ids);
    setInjections((prev) =>
      prev.map((item) => {
        if (idSet.has(item.id)) {
          const slotsCount = item.timeSlots?.length || 1;
          return {
            ...item,
            isExecuted: status,
            timeSlotsExecuted: new Array(slotsCount).fill(status),
          };
        }
        return item;
      })
    );
  };

  // Update a single record (inline edit)
  const handleUpdateRecord = (updated: ProcessedInjectionRecord) => {
    setInjections((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  // Remove duplicate record
  const handleRemoveDuplicateRecord = (id: string) => {
    setInjections((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      return updated.map((item, idx) => ({ ...item, stt: idx + 1 }));
    });
  };

  // Keep all duplicates and clear warning status
  const handleKeepAllDuplicates = () => {
    setInjections((prev) =>
      prev.map((item) => ({ ...item, isDuplicate: false }))
    );
    setIsDuplicateModalOpen(false);
  };

  // Dismiss pending check
  const handleDismissPending = (id: string) => {
    setPendingChecks((prev) => prev.filter((p) => p.id !== id));
  };

  // Trigger Excel Export (Multi-sheet with Matrix + Details)
  const handleExportExcel = () => {
    if (!report || injections.length === 0) return;
    exportHospitalWorkbook({
      injections,
      pendingChecks,
      excludedItems,
      report,
      reconciliationReport: report.reconciliationReport,
      selectedDate,
      departmentName,
    });
  };

  // Reset all state
  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới và xóa dữ liệu hiện tại để tải file mới?')) {
      setRawDrugRecords([]);
      setDrugFilePreview(null);
      setInjections([]);
      setPendingChecks([]);
      setExcludedItems([]);
      setReport(null);
      setSelectedDate('');
    }
  };

  const hasData = injections.length > 0 || pendingChecks.length > 0;
  const reconciliationReport = report?.reconciliationReport || null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Hospital Top Navigation Header */}
      <Header
        hospitalName={hospitalName}
        setHospitalName={setHospitalName}
        departmentName={departmentName}
        setDepartmentName={setDepartmentName}
        selectedDate={selectedDate}
        setSelectedDate={handleDateChange}
        availableDates={report?.availableDates || []}
        onLoadDemo={handleLoadDemo}
        onExportExcel={handleExportExcel}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onReset={handleReset}
        hasData={hasData}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload File & Processing Card */}
        <UploadSection
          drugFilePreview={drugFilePreview}
          onUploadDrugFile={handleUploadDrugFile}
          onProcessData={() => executeProcessing(rawDrugRecords)}
          onLoadSampleData={handleLoadDemo}
          isProcessing={isProcessing}
          hasData={hasData}
          totalDrugRecords={rawDrugRecords.length}
        />

        {/* Statistical Overview Cards */}
        {report && (
          <StatsCards
            report={report}
            activeTab={activeTab === 'NURSE_MATRIX' ? 'MAIN_INJECTIONS' : activeTab}
            setActiveTab={(t) => setActiveTab(t as any)}
            onOpenDuplicates={() => setIsDuplicateModalOpen(true)}
          />
        )}

        {/* Primary Result Work Area */}
        {hasData && (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 rounded-t-xl shadow-2xs flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Nurse Matrix Tab (Primary Photo Layout) */}
                <button
                  id="tab-nurse-matrix"
                  onClick={() => setActiveTab('NURSE_MATRIX')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'NURSE_MATRIX'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>SỔ TIÊM MA TRẬN (MẪU SỔ TAY ĐIỀU DƯỠNG)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'NURSE_MATRIX' ? 'bg-teal-900 text-teal-100' : 'bg-teal-100 text-teal-800 font-bold'
                  }`}>
                    Mẫu ảnh
                  </span>
                </button>

                {/* 2. Main 7-Column Injections Tab */}
                <button
                  id="tab-main-injections"
                  onClick={() => setActiveTab('MAIN_INJECTIONS')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'MAIN_INJECTIONS'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>DANH SÁCH CHI TIẾT (7 CỘT)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'MAIN_INJECTIONS' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {injections.length}
                  </span>
                </button>

                {/* 3. Day Comparison Tab */}
                {reconciliationReport && (
                  <button
                    id="tab-reconciliation"
                    onClick={() => setIsReconciliationModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer"
                  >
                    <GitCompare className="w-4 h-4 text-teal-700" />
                    <span>ĐỐI CHIẾU VỚI HÔM TRƯỚC</span>
                    {reconciliationReport.newOrdersCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                        +{reconciliationReport.newOrdersCount} mới
                      </span>
                    )}
                  </button>
                )}

                {/* 4. Pending Checks Tab */}
                <button
                  id="tab-pending-checks"
                  onClick={() => setActiveTab('PENDING_CHECKS')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'PENDING_CHECKS'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>CẦN BỔ SUNG ĐƯỜNG DÙNG</span>
                  {pendingChecks.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === 'PENDING_CHECKS' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-800 font-bold'
                    }`}>
                      {pendingChecks.length}
                    </span>
                  )}
                </button>

                {/* 5. Excluded Items Tab */}
                <button
                  id="tab-excluded-items"
                  onClick={() => setActiveTab('EXCLUDED_ITEMS')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'EXCLUDED_ITEMS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                  <span>DỊCH TRUYỀN & VẬT TƯ ĐÃ LOẠI</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'EXCLUDED_ITEMS' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {excludedItems.length}
                  </span>
                </button>
              </div>

              {/* Quick Info in tab bar */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
                <span>Khoa: <strong className="text-slate-800">{departmentName}</strong></span>
                <span>•</span>
                <span>Ngày: <strong className="text-teal-800">{selectedDate || '19/05/2026'}</strong></span>
              </div>
            </div>

            {/* Tab 1: Nurse Matrix Table (Primary Photo Match) */}
            {activeTab === 'NURSE_MATRIX' && (
              <NurseMatrixTable
                injections={injections}
                hospitalName={hospitalName}
                departmentName={departmentName}
                selectedDate={selectedDate}
                onToggleExecution={handleToggleExecution}
                onToggleSlotExecution={handleToggleSlotExecution}
                onBatchToggleExecution={handleBatchToggleExecution}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
                onExportExcel={handleExportExcel}
              />
            )}

            {/* Tab 2: Detailed 7-column table */}
            {activeTab === 'MAIN_INJECTIONS' && (
              <InjectionTable
                injections={injections}
                onToggleExecution={handleToggleExecution}
                onBatchToggleExecution={handleBatchToggleExecution}
                onOpenDuplicateModal={() => setIsDuplicateModalOpen(true)}
                onUpdateRecord={handleUpdateRecord}
                onOpenReconciliationModal={() => setIsReconciliationModalOpen(true)}
                hasReconciliationData={!!reconciliationReport}
              />
            )}

            {/* Tab 3: Pending Checks */}
            {activeTab === 'PENDING_CHECKS' && (
              <PendingCheckTable
                pendingChecks={pendingChecks}
                roomRecords={[]}
                onManualMatch={() => {}}
                onDismissPending={handleDismissPending}
              />
            )}

            {/* Tab 4: Excluded Items */}
            {activeTab === 'EXCLUDED_ITEMS' && (
              <ExcludedItemsTable
                excludedItems={excludedItems}
              />
            )}
          </div>
        )}

        {/* Empty State / Welcome Guide when no files loaded */}
        {!hasData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto mb-4">
              <Syringe className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Chào mừng bạn đến với Sổ Thuốc Tiêm Điện Tử
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl mx-auto mt-1.5 leading-relaxed">
              Ứng dụng tự động xử lý file xuất thống kê truyền dịch / thuốc tiêm HIS, tự động tạo <strong>Sổ Tiêm Dạng Ma Trận (Bệnh nhân × Thuốc kèm cữ giờ 7-15-23)</strong> mô phỏng chính xác mẫu sổ tay điều dưỡng thực tế tại bệnh viện, hỗ trợ gạch chéo trực tiếp và in ấn A4.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8 text-left text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  Tải 1 file Thống kê truyền dịch
                </div>
                <p className="text-slate-500 text-[11px]">
                  Bao gồm tất cả danh sách thuốc. Tự động tính tuổi bệnh nhân và bóc tách Khu & Buồng từ cột Khoa Buồng - Giường.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  Sổ Tiêm Ma Trận Chuẩn Sổ Tay
                </div>
                <p className="text-slate-500 text-[11px]">
                  Tự động chia cột theo tên thuốc, hiển thị liều lượng (1x3, 1/2x2) và các cữ giờ (7-15-23), hỗ trợ gạch chéo khi tiêm.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                  Xuất Excel Ma Trận & In A4 Ngang
                </div>
                <p className="text-slate-500 text-[11px]">
                  Xuất Excel nhiều sheet kèm ma trận điều dưỡng, hoặc in A4 ngang kẹp bìa đi buồng bệnh.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-teal-200" />
                Dùng thử ngay với Dữ liệu mẫu Sổ Tiêm BV Chợ Lách
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        Sổ Thuốc Tiêm Điện Tử • Thiết kế phục vụ công tác điều dưỡng và quản lý chất lượng bệnh viện • Dữ liệu xử lý an toàn tại trình duyệt
      </footer>

      {/* Print Modal Dialog (A4 Landscape Matrix / Portrait List format) */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        injections={injections}
        hospitalName={hospitalName}
        departmentName={departmentName}
        selectedDate={selectedDate}
      />

      {/* Medication Reconciliation Modal (Day-to-day comparison) */}
      <MedicationReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        report={reconciliationReport}
      />

      {/* Duplicate Warnings Inspector Modal */}
      <DuplicateWarningModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        injections={injections}
        onRemoveRecord={handleRemoveDuplicateRecord}
        onKeepAll={handleKeepAllDuplicates}
      />
    </div>
  );
}
