/**
 * SỔ THUỐC TIÊM ĐIỆN TỬ - Electronic Inpatient Injection Record
 * Hospital medication reconciliation, room matching, and administration workbook.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Syringe,
  AlertTriangle,
  Droplets,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Printer,
  ShieldCheck,
  Building,
  Info
} from 'lucide-react';

import {
  RawDrugRecord,
  RawRoomRecord,
  ProcessedInjectionRecord,
  PendingCheckRecord,
  ExcludedItemRecord,
  ProcessingReport,
  ColumnMappingPreview,
} from './types/hospital';

import {
  readWorkbookSheet,
  parseDrugOrderSheet,
  parseInpatientRoomSheet,
  formatOrderDate,
} from './utils/excelParser';

import { processAndMatchHospitalData, sortInjectionRecords } from './utils/matchingEngine';
import { exportHospitalWorkbook } from './utils/excelExporter';
import { SAMPLE_DRUG_ORDERS, SAMPLE_ROOM_LIST } from './data/sampleHospitalData';

import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StatsCards } from './components/StatsCards';
import { InjectionTable } from './components/InjectionTable';
import { PendingCheckTable } from './components/PendingCheckTable';
import { ExcludedItemsTable } from './components/ExcludedItemsTable';
import { PrintModal } from './components/PrintModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { ManualMatchModal } from './components/ManualMatchModal';

export default function App() {
  // Hospital Settings State
  const [hospitalName, setHospitalName] = useState<string>('Bệnh Viện Đa Khoa / Trung Tâm Y Tế');
  const [departmentName, setDepartmentName] = useState<string>('Khoa Nội Tổng Hợp');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Raw Loaded Data
  const [rawDrugRecords, setRawDrugRecords] = useState<RawDrugRecord[]>([]);
  const [rawRoomRecords, setRawRoomRecords] = useState<RawRoomRecord[]>([]);
  const [drugFilePreview, setDrugFilePreview] = useState<ColumnMappingPreview | null>(null);
  const [roomFilePreview, setRoomFilePreview] = useState<ColumnMappingPreview | null>(null);

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
  const [selectedPendingForManualMatch, setSelectedPendingForManualMatch] = useState<PendingCheckRecord | null>(null);

  // Handle File 1 Upload (Drug Orders)
  const handleUploadDrugFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const sheetData = readWorkbookSheet(buffer);
      const { records, preview } = parseDrugOrderSheet(sheetData, file.name);

      setRawDrugRecords(records);
      setDrugFilePreview(preview);
    } catch (err: any) {
      console.error('Error reading Drug Order file:', err);
      alert(`Lỗi khi đọc file thuốc: ${err.message || 'File Excel không đúng định dạng'}`);
    }
  };

  // Handle File 2 Upload (Inpatient Rooms)
  const handleUploadRoomFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const sheetData = readWorkbookSheet(buffer);
      const { records, preview } = parseInpatientRoomSheet(sheetData, file.name);

      setRawRoomRecords(records);
      setRoomFilePreview(preview);
    } catch (err: any) {
      console.error('Error reading Room file:', err);
      alert(`Lỗi khi đọc file danh sách phòng: ${err.message || 'File Excel không đúng định dạng'}`);
    }
  };

  // Run Matching Algorithm
  const executeProcessing = useCallback((
    drugRecs: RawDrugRecord[],
    roomRecs: RawRoomRecord[],
    dateOverride?: string
  ) => {
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const result = processAndMatchHospitalData({
          drugRecords: drugRecs,
          roomRecords: roomRecs,
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
        alert(`Lỗi trong quá trình đối chiếu dữ liệu: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 200);
  }, [selectedDate]);

  // Load Realistic Hospital Demo Data
  const handleLoadDemo = () => {
    setRawDrugRecords(SAMPLE_DRUG_ORDERS);
    setDrugFilePreview({
      fileName: 'FILE_1_HIS_Thong_Ke_Thuoc_Demo.xlsx',
      detectedHeaders: {
        patientName: 'Họ và tên người bệnh',
        drugName: 'Tên thuốc',
        strength: 'Hàm lượng',
        unit: 'Đơn vị',
        quantity: 'Số lượng',
        route: 'Đường dùng',
        orderTime: 'Thời gian y lệnh',
        orderDate: 'Ngày y lệnh',
        patientCode: 'Mã người bệnh',
        medicalRecordCode: 'Mã bệnh án',
      },
      missingRequired: [],
      totalRows: SAMPLE_DRUG_ORDERS.length,
    });

    setRawRoomRecords(SAMPLE_ROOM_LIST);
    setRoomFilePreview({
      fileName: 'FILE_2_Danh_Sach_Phong_Giuong_Demo.xlsx',
      detectedHeaders: {
        patientName: 'Họ và tên bệnh nhân',
        room: 'Phòng',
        bed: 'Giường',
        patientCode: 'Mã người bệnh',
        medicalRecordCode: 'Mã bệnh án',
        department: 'Khoa điều trị',
      },
      missingRequired: [],
      totalRows: SAMPLE_ROOM_LIST.length,
    });

    setSelectedDate('15/08/2026');
    executeProcessing(SAMPLE_DRUG_ORDERS, SAMPLE_ROOM_LIST, '15/08/2026');
  };

  // Re-run when date selection changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (rawDrugRecords.length > 0 && rawRoomRecords.length > 0) {
      executeProcessing(rawDrugRecords, rawRoomRecords, newDate);
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

  // Remove duplicate record
  const handleRemoveDuplicateRecord = (id: string) => {
    setInjections((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      // Reindex STT
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

  // Resolve pending check manually
  const handleConfirmManualMatch = (
    resolvedInjection: ProcessedInjectionRecord,
    pendingId: string
  ) => {
    // Remove from pending
    setPendingChecks((prev) => prev.filter((p) => p.id !== pendingId));

    // Add to injections list
    setInjections((prev) => {
      const updated = [...prev, resolvedInjection];
      sortInjectionRecords(updated, 'ROOM_PATIENT_TIME');
      return updated.map((item, idx) => ({ ...item, stt: idx + 1 }));
    });

    // Update report count
    if (report) {
      setReport({
        ...report,
        totalValidInjections: report.totalValidInjections + 1,
        totalPendingChecks: Math.max(0, report.totalPendingChecks - 1),
      });
    }

    setSelectedPendingForManualMatch(null);
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
    if (window.confirm('Bạn có chắc chắn muốn làm mới và xóa dữ liệu hiện tại để tải bộ file mới?')) {
      setRawDrugRecords([]);
      setRawRoomRecords([]);
      setDrugFilePreview(null);
      setRoomFilePreview(null);
      setInjections([]);
      setPendingChecks([]);
      setExcludedItems([]);
      setReport(null);
      setSelectedDate('');
    }
  };

  const hasData = injections.length > 0 || pendingChecks.length > 0;

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
        {/* Step 1 & 2: Upload Files & Processing Card */}
        <UploadSection
          drugFilePreview={drugFilePreview}
          roomFilePreview={roomFilePreview}
          onUploadDrugFile={handleUploadDrugFile}
          onUploadRoomFile={handleUploadRoomFile}
          onProcessData={() => executeProcessing(rawDrugRecords, rawRoomRecords)}
          isProcessing={isProcessing}
          hasData={hasData}
          totalDrugRecords={rawDrugRecords.length}
          totalRoomRecords={rawRoomRecords.length}
        />

        {/* Step 3: Statistical Overview Cards */}
        {report && (
          <StatsCards
            report={report}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenDuplicates={() => setIsDuplicateModalOpen(true)}
          />
        )}

        {/* Step 4: Primary Result Work Area */}
        {hasData && (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 rounded-t-xl shadow-2xs">
              <div className="flex items-center gap-2">
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
                  <span>SỔ THUỐC TIÊM CHÍNH</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'MAIN_INJECTIONS' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {injections.length}
                  </span>
                </button>

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
                  <span>CẦN KIỂM TRA</span>
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

              {/* Quick Actions in tab bar */}
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
              />
            )}

            {activeTab === 'PENDING_CHECKS' && (
              <PendingCheckTable
                pendingChecks={pendingChecks}
                roomRecords={rawRoomRecords}
                onManualMatch={(item) => setSelectedPendingForManualMatch(item)}
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
              Ứng dụng tự động đối chiếu mã bệnh nhân và họ tên giữa file xuất y lệnh HIS và danh sách phòng nội trú, tự động nhận diện thuốc tiêm, loại bỏ dịch truyền và vật tư y tế, giúp điều dưỡng tạo sổ thuốc tiêm chuẩn xác trong 3 giây.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8 text-left text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  Tải 2 file Excel
                </div>
                <p className="text-slate-500 text-[11px]">
                  File 1 xuất từ phần mềm bệnh viện và File 2 danh sách bệnh nhân theo buồng phòng.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  Đối chiếu an toàn
                </div>
                <p className="text-slate-500 text-[11px]">
                  Ưu tiên mã người bệnh, chuẩn hóa tiếng Việt, phát hiện trùng tên và cảnh báo y lệnh trùng.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                  Xuất & In A4
                </div>
                <p className="text-slate-500 text-[11px]">
                  Xuất file Excel 3 sheet hoàn chỉnh hoặc in trực tiếp theo phòng / ca trực.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-teal-200" />
                Dùng thử ngay với Dữ liệu mẫu (1 Click Demo)
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

      {/* Duplicate Warnings Inspector Modal */}
      <DuplicateWarningModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        injections={injections}
        onRemoveRecord={handleRemoveDuplicateRecord}
        onKeepAll={handleKeepAllDuplicates}
      />

      {/* Manual Patient-Room Matching Modal */}
      <ManualMatchModal
        pendingItem={selectedPendingForManualMatch}
        roomRecords={rawRoomRecords}
        onClose={() => setSelectedPendingForManualMatch(null)}
        onConfirmMatch={handleConfirmManualMatch}
      />
    </div>
  );
}
