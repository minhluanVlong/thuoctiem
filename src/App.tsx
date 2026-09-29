/**
 * SỔ THUỐC TIÊM ĐIỆN TỬ - Electronic Inpatient Injection Record
 * "SỔ THUỐC TIÊM – KHOA NỘI TỔNG HỢP NHI TRUYỀN NHIỄM"
 * Hospital medication reconciliation, room matching, and administration workbook.
 * Modeled accurately after the real hospital handwritten nurse injection book with 4 columns:
 * TÊN | TUỔI | SỐ PHÒNG | THUỐC TIÊM
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Syringe,
  AlertTriangle,
  Droplets,
  Sparkles,
  GitCompare,
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

import { buildGroupedInjectionBook, WardListType } from './utils/patientBookBuilder';

import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StatsCards } from './components/StatsCards';
import { FourColumnInjectionBook } from './components/FourColumnInjectionBook';
import { NurseMatrixTable } from './components/NurseMatrixTable';
import { InjectionTable } from './components/InjectionTable';
import { PendingCheckTable } from './components/PendingCheckTable';
import { ExcludedItemsTable } from './components/ExcludedItemsTable';
import { PrintModal } from './components/PrintModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { MedicationReconciliationModal } from './components/MedicationReconciliationModal';
import { AiOrderExtractionModal } from './components/AiOrderExtractionModal';
import { MatrixJsonFormat, convertMatrixJsonToInjections } from './types/matrixJson';

export default function App() {
  // Hospital Settings State
  const [hospitalName, setHospitalName] = useState<string>('BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH');
  const [departmentName, setDepartmentName] = useState<string>('KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM');
  const [selectedDate, setSelectedDate] = useState<string>(''); // Default blank as requested - user can input custom date

  // Raw Loaded Data (Single HIS Excel file)
  const [rawDrugRecords, setRawDrugRecords] = useState<RawDrugRecord[]>([]);
  const [drugFilePreview, setDrugFilePreview] = useState<ColumnMappingPreview | null>(null);

  // Processed Output Data
  const [injections, setInjections] = useState<ProcessedInjectionRecord[]>([]);
  const [pendingChecks, setPendingChecks] = useState<PendingCheckRecord[]>([]);
  const [excludedItems, setExcludedItems] = useState<ExcludedItemRecord[]>([]);
  const [report, setReport] = useState<ProcessingReport | null>(null);

  // UI Flow State - Default to the 4-column handwritten notebook format!
  const [activeTab, setActiveTab] = useState<
    'FOUR_COLUMN_BOOK' | 'NURSE_MATRIX' | 'MAIN_INJECTIONS' | 'PENDING_CHECKS' | 'EXCLUDED_ITEMS'
  >('FOUR_COLUMN_BOOK');

  const [selectedWard, setSelectedWard] = useState<WardListType | 'ALL'>('KHU_NOI_NHI');

  // Modals State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Apply parsed Matrix JSON data
  const handleApplyMatrixJson = useCallback((jsonData: MatrixJsonFormat) => {
    const converted = convertMatrixJsonToInjections(
      jsonData,
      selectedDate || new Date().toLocaleDateString('vi-VN')
    );
    setInjections(converted);
    setPendingChecks([]);
    setExcludedItems([]);
    setActiveTab('NURSE_MATRIX');
    setSelectedWard('ALL');
  }, [selectedDate]);

  // Derived Book Data for dynamic counts
  const bookData = useMemo(() => {
    return buildGroupedInjectionBook(injections);
  }, [injections]);

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
    }, 150);
  }, [selectedDate]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

  // Load Realistic Hospital Demo Data
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

  // Trigger Excel Export (Multi-sheet with Ward sheets + Matrix + Details)
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
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu hiện tại để tải file Excel mới?')) {
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
        onViewBook={() => setActiveTab('FOUR_COLUMN_BOOK')}
        onOpenAiModal={() => setIsAiModalOpen(true)}
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
          onOpenAiModal={() => setIsAiModalOpen(true)}
          isProcessing={isProcessing}
          hasData={hasData}
          totalDrugRecords={rawDrugRecords.length}
        />

        {/* Statistical Overview Cards (Section 14 Mandate) */}
        {report && (
          <StatsCards
            report={report}
            totalPatientsCount={bookData.allPatients.length}
            totalKhuNoiNhiCount={bookData.khuNoiNhiPatients.length}
            totalKhuNhiemCount={bookData.khuNhiemPatients.length}
            activeTab={activeTab}
            setActiveTab={(t) => setActiveTab(t as any)}
            onOpenDuplicates={() => setIsDuplicateModalOpen(true)}
            onSelectWard={(ward) => {
              setSelectedWard(ward);
              setActiveTab('FOUR_COLUMN_BOOK');
            }}
          />
        )}

        {/* Primary Result Work Area */}
        {hasData && (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 rounded-t-xl shadow-2xs flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. SỔ THUỐC TIÊM (4 CỘT CHUẨN) - Primary View */}
                <button
                  id="tab-four-column-book"
                  onClick={() => setActiveTab('FOUR_COLUMN_BOOK')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    activeTab === 'FOUR_COLUMN_BOOK'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-300" />
                  <span>SỔ THUỐC TIÊM (4 CỘT CHUẨN)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'FOUR_COLUMN_BOOK' ? 'bg-blue-950 text-blue-100' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {bookData.allPatients.length} BN
                  </span>
                </button>

                {/* 2. SỔ TIÊM MA TRẬN Ô LY (Mẫu ảnh sổ tay) */}
                <button
                  id="tab-nurse-matrix"
                  onClick={() => setActiveTab('NURSE_MATRIX')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'NURSE_MATRIX'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>SỔ TIÊM MA TRẬN Ô LY</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'NURSE_MATRIX' ? 'bg-blue-950 text-blue-100' : 'bg-slate-200 text-slate-700 font-bold'
                  }`}>
                    Mẫu ảnh
                  </span>
                </button>

                {/* 3. Danh sách chi tiết 7 cột */}
                <button
                  id="tab-main-injections"
                  onClick={() => setActiveTab('MAIN_INJECTIONS')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'MAIN_INJECTIONS'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>DANH SÁCH CHI TIẾT (7 CỘT)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'MAIN_INJECTIONS' ? 'bg-blue-950 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {injections.length}
                  </span>
                </button>

                {/* 4. CÁC DÒNG CẦN KIỂM TRA (Section 19) */}
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
                  <span>CÁC DÒNG CẦN KIỂM TRA</span>
                  {pendingChecks.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'PENDING_CHECKS' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {pendingChecks.length}
                    </span>
                  )}
                </button>

                {/* 5. DỊCH TRUYỀN & VẬT TƯ ĐÃ TÁCH */}
                <button
                  id="tab-excluded-items"
                  onClick={() => setActiveTab('EXCLUDED_ITEMS')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'EXCLUDED_ITEMS'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                  <span>DỊCH TRUYỀN & VẬT TƯ ĐÃ TÁCH</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'EXCLUDED_ITEMS' ? 'bg-slate-900 text-slate-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {excludedItems.length}
                  </span>
                </button>

                {/* 6. ĐỐI CHIẾU HÔM TRƯỚC */}
                {reconciliationReport && (
                  <button
                    id="tab-reconciliation"
                    onClick={() => setIsReconciliationModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-blue-700" />
                    <span>ĐỐI CHIẾU HÔM TRƯỚC</span>
                    {reconciliationReport.newOrdersCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                        +{reconciliationReport.newOrdersCount} mới
                      </span>
                    )}
                  </button>
                )}

                {/* AI Bóc tách Y lệnh (Ảnh / JSON) Button */}
                <button
                  id="tab-btn-ai-extract"
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 shadow-2xs cursor-pointer"
                  title="Bóc tách dữ liệu từ hình ảnh báo cáo y lệnh hoặc nhập JSON ma trận bằng AI Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Bóc tách Ma trận</span>
                </button>
              </div>

              {/* Quick Info in tab bar */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
                <span>Khoa: <strong className="text-slate-800">{departmentName}</strong></span>
                <span>•</span>
                <span>Ngày y lệnh: <strong className="text-blue-900">{selectedDate || '19/05/2026'}</strong></span>
              </div>
            </div>

            {/* TAB 1: SỔ THUỐC TIÊM (4 CỘT CHUẨN) */}
            {activeTab === 'FOUR_COLUMN_BOOK' && (
              <FourColumnInjectionBook
                injections={injections}
                hospitalName={hospitalName}
                departmentName={departmentName}
                selectedDate={selectedDate}
                selectedWard={selectedWard}
                onSelectWard={(w) => setSelectedWard(w)}
                onToggleExecution={handleToggleExecution}
                onToggleSlotExecution={handleToggleSlotExecution}
                onBatchToggleExecution={handleBatchToggleExecution}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
                onExportExcel={handleExportExcel}
                onSwitchToMatrixView={() => setActiveTab('NURSE_MATRIX')}
              />
            )}

            {/* TAB 2: SỔ TIÊM MA TRẬN Ô LY */}
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
                onOpenAiModal={() => setIsAiModalOpen(true)}
              />
            )}

            {/* TAB 3: DANH SÁCH CHI TIẾT (7 CỘT) */}
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

            {/* TAB 4: CÁC DÒNG CẦN KIỂM TRA (Section 19) */}
            {activeTab === 'PENDING_CHECKS' && (
              <PendingCheckTable
                pendingChecks={pendingChecks}
                onDismissPending={handleDismissPending}
              />
            )}

            {/* TAB 5: DỊCH TRUYỀN & VẬT TƯ ĐÃ TÁCH */}
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
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto mb-4">
              <Syringe className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              SỔ THUỐC TIÊM – KHOA NỘI TỔNG HỢP NHI TRUYỀN NHIỄM
            </h3>
            <p className="text-xs text-slate-600 max-w-2xl mx-auto mt-2 leading-relaxed">
              Ứng dụng tự động xử lý file xuất thống kê truyền dịch / thuốc tiêm HIS, tự động phân loại người bệnh theo <strong>KHU NỘI NHI</strong> và <strong>KHU NHIỄM</strong>, tổng hợp thuốc tiêm từng người bệnh theo biểu mẫu sổ tay 4 cột chuẩn: <strong>TÊN | TUỔI | SỐ PHÒNG | THUỐC TIÊM</strong>, hỗ trợ in A4 Landscape và xuất Excel đa sheet.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8 text-left text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  Tải file Excel từ HIS
                </div>
                <p className="text-slate-500 text-[11px]">
                  Bao gồm cột Khoa Buồng - Giường, Thuốc, Ghi chú, Thời gian y lệnh. Tự động bóc tách khu vực, phòng và giường.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  Sổ 4 Cột & Ma Trận Ô Ly
                </div>
                <p className="text-slate-500 text-[11px]">
                  Mỗi người bệnh 1 dòng, gom tất cả thuốc theo thứ tự ưu tiên (Kháng sinh → Điều trị chính → Dạ dày → Khí dung). Giờ y lệnh thực tế in nổi bật.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                  In A4 Landscape & Xuất Excel
                </div>
                <p className="text-slate-500 text-[11px]">
                  In trực tiếp biểu mẫu giấy A4 Landscape vừa trang, hoặc xuất file Excel chứa cả 2 sheet &quot;KHU NỘI NHI&quot; và &quot;KHU NHIỄM&quot;.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                NẠP DỮ LIỆU MẪU BV ĐA KHOA KV CHỢ LÁCH
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Print Preview & Configuration Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        injections={injections}
        hospitalName={hospitalName}
        departmentName={departmentName}
        selectedDate={selectedDate}
      />

      {/* Duplicate Medication Warning Modal */}
      <DuplicateWarningModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        duplicates={injections.filter((i) => i.isDuplicate)}
        onRemoveDuplicate={handleRemoveDuplicateRecord}
        onKeepAll={handleKeepAllDuplicates}
      />

      {/* Medication Reconciliation (Today vs Yesterday) Modal */}
      {reconciliationReport && (
        <MedicationReconciliationModal
          isOpen={isReconciliationModalOpen}
          onClose={() => setIsReconciliationModalOpen(false)}
          report={reconciliationReport}
        />
      )}

      {/* AI Vision & JSON Matrix Extraction Modal */}
      <AiOrderExtractionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyMatrixJson={handleApplyMatrixJson}
        currentInjections={injections}
      />
    </div>
  );
}
