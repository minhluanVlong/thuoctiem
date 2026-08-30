/**
 * SỔ THUỐC TIÊM ĐIỆN TỬ - Electronic Inpatient Injection Record
 * Hospital medication reconciliation, room matching, and administration workbook.
 */
import React, { useState, useCallback } from 'react';
import {
  Syringe,
  AlertTriangle,
  Droplets,
  Sparkles,
  GitCompare,
  FileSpreadsheet
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

import { processAndMatchHospitalData, sortInjectionRecords } from './utils/matchingEngine';
import { exportHospitalWorkbook } from './utils/excelExporter';
import {
  SAMPLE_DRUG_ORDERS_TODAY,
  SAMPLE_DRUG_ORDERS_YESTERDAY
} from './data/sampleHospitalData';

import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StatsCards } from './components/StatsCards';
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
  const [selectedDate, setSelectedDate] = useState<string>('31/08/2026');

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
  const [activeTab, setActiveTab] = useState<'MAIN_INJECTIONS' | 'PENDING_CHECKS' | 'EXCLUDED_ITEMS'>('MAIN_INJECTIONS');

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

        if (!selectedDate && result.report.availableDates.length > 0) {
          setSelectedDate(result.report.availableDates[0]);
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

  // Load Realistic Hospital Demo Data (90 records from BV Đa Khoa KV Chợ Lách)
  const handleLoadDemo = () => {
    setHospitalName('BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH');
    setDepartmentName('KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM');
    setRawDrugRecords(SAMPLE_DRUG_ORDERS_TODAY);
    setDrugFilePreview({
      fileName: 'thongke_truyendich_thuoc_tiem_31_08_2026.xlsx',
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

    setSelectedDate('31/08/2026');
    executeProcessing(SAMPLE_DRUG_ORDERS_TODAY, '31/08/2026', SAMPLE_DRUG_ORDERS_YESTERDAY);
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
      prev.map((item) =>
        item.id === id ? { ...item, isExecuted: !item.isExecuted } : item
      )
    );
  };

  // Batch toggle injection administration
  const handleBatchToggleExecution = (ids: string[], status: boolean) => {
    const idSet = new Set(ids);
    setInjections((prev) =>
      prev.map((item) =>
        idSet.has(item.id) ? { ...item, isExecuted: status } : item
      )
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

  // Trigger Excel Export (Multi-sheet)
  const handleExportExcel = () => {
    if (!report || injections.length === 0) return;
    exportHospitalWorkbook({
      injections,
      pendingChecks,
      excludedItems,
      report,
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
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenDuplicates={() => setIsDuplicateModalOpen(true)}
          />
        )}

        {/* Primary Result Work Area */}
        {hasData && (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 rounded-t-xl shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Main Injections Tab */}
                <button
                  id="tab-main-injections"
                  onClick={() => setActiveTab('MAIN_INJECTIONS')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'MAIN_INJECTIONS'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Syringe className="w-4 h-4" />
                  <span>SỔ THUỐC TIÊM (CHUẨN 7 CỘT)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'MAIN_INJECTIONS' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {injections.length}
                  </span>
                </button>

                {/* Day Comparison Tab */}
                {reconciliationReport && (
                  <button
                    id="tab-reconciliation"
                    onClick={() => setIsReconciliationModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer"
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

                {/* Pending Checks Tab */}
                <button
                  id="tab-pending-checks"
                  onClick={() => setActiveTab('PENDING_CHECKS')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
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

                {/* Excluded Items Tab */}
                <button
                  id="tab-excluded-items"
                  onClick={() => setActiveTab('EXCLUDED_ITEMS')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
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
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span>Khoa: <strong className="text-slate-800">{departmentName}</strong></span>
                <span>•</span>
                <span>Ngày: <strong className="text-teal-800">{selectedDate || 'Hôm nay'}</strong></span>
              </div>
            </div>

            {/* Tab Contents */}
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

            {activeTab === 'PENDING_CHECKS' && (
              <PendingCheckTable
                pendingChecks={pendingChecks}
                roomRecords={[]}
                onManualMatch={() => {}}
                onDismissPending={handleDismissPending}
              />
            )}

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
              Ứng dụng tự động xử lý file xuất thống kê truyền dịch / thuốc tiêm HIS, tự động tính tuổi (năm hiện tại - năm sinh, số tháng cho bé nhi), bóc tách Khu và Buồng, nhận diện thuốc mới & đổi liều so với ngày hôm trước và tạo sổ thuốc tiêm chuẩn 7 cột cho điều dưỡng.
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
                  Đối chiếu ngày hôm trước
                </div>
                <p className="text-slate-500 text-[11px]">
                  Tự động so sánh hôm qua vs hôm nay, phát hiện thuốc mới (+), đổi liều (⟳) và thuốc ngưng (✕).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                  Xuất Excel 4 Sheet & In A4
                </div>
                <p className="text-slate-500 text-[11px]">
                  Xuất Excel chuẩn 7 cột kèm sheet đối chiếu hoặc in theo buồng/phòng/ca trực.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-teal-200" />
                Dùng thử ngay với Dữ liệu mẫu 90 dòng BV Chợ Lách
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        Sổ Thuốc Tiêm Điện Tử • Thiết kế phục vụ công tác điều dưỡng và quản lý chất lượng bệnh viện • Dữ liệu xử lý an toàn tại trình duyệt
      </footer>

      {/* Print Modal Dialog (A4 format) */}
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
