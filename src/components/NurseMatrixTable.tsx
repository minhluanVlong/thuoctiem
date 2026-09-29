import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
  Eye,
  CheckCheck,
  RotateCcw,
  Building,
  Syringe,
  Info,
  Calendar,
  Layers,
  Check,
  X
} from 'lucide-react';
import { ProcessedInjectionRecord } from '../types/hospital';
import {
  buildNurseMatrixData,
  MatrixPatientRow,
  MatrixDrugColumn,
  MatrixCellData
} from '../utils/matrixBuilder';

interface NurseMatrixTableProps {
  injections: ProcessedInjectionRecord[];
  hospitalName: string;
  departmentName: string;
  selectedDate: string;
  onToggleExecution: (id: string) => void;
  onToggleSlotExecution?: (id: string, slotIndex: number) => void;
  onBatchToggleExecution?: (ids: string[], status: boolean) => void;
  onOpenPrintModal?: () => void;
  onExportExcel?: () => void;
  onOpenAiModal?: () => void;
}

export const NurseMatrixTable: React.FC<NurseMatrixTableProps> = ({
  injections,
  hospitalName,
  departmentName,
  selectedDate,
  onToggleExecution,
  onToggleSlotExecution,
  onBatchToggleExecution,
  onOpenPrintModal,
  onExportExcel,
  onOpenAiModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState<'ALL' | 'ZONE_1' | 'ZONE_2'>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [notebookStyle, setNotebookStyle] = useState<boolean>(true); // true = Hong Ha notebook grid style, false = modern clean
  const [filterExecuted, setFilterExecuted] = useState<'ALL' | 'UNEXECUTED' | 'EXECUTED'>('ALL');

  // Build full matrix
  const matrixData = useMemo(() => {
    return buildNurseMatrixData(injections);
  }, [injections]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let list = matrixData.rows;

    if (selectedZone === 'ZONE_1') {
      list = list.filter((r) => r.wardZone === 'ZONE_1_NOI_NHI_STANDARD');
    } else if (selectedZone === 'ZONE_2') {
      list = list.filter((r) => r.wardZone === 'ZONE_2_LAO_KHOA_NHI_NHIEM');
    }

    if (selectedRoom !== 'ALL') {
      list = list.filter((r) => r.room === selectedRoom);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.room.toLowerCase().includes(q) ||
          r.patientCode.toLowerCase().includes(q) ||
          (Object.values(r.cells) as MatrixCellData[]).some((c) => c.drugFullName.toLowerCase().includes(q))
      );
    }

    if (filterExecuted === 'UNEXECUTED') {
      list = list.filter((r) => (Object.values(r.cells) as MatrixCellData[]).some((c) => !c.isExecuted));
    } else if (filterExecuted === 'EXECUTED') {
      list = list.filter((r) => (Object.values(r.cells) as MatrixCellData[]).every((c) => c.isExecuted));
    }

    return list;
  }, [matrixData.rows, selectedZone, selectedRoom, searchTerm, filterExecuted]);

  // Active columns (only columns that have at least 1 patient in current filter, or all columns)
  const activeColumns = useMemo(() => {
    if (selectedRoom === 'ALL' && !searchTerm.trim() && selectedZone === 'ALL') {
      return matrixData.columns;
    }
    // Only show columns that have at least one cell in the filtered rows
    const usedColIds = new Set<string>();
    filteredRows.forEach((r) => {
      Object.keys(r.cells).forEach((colId) => usedColIds.add(colId));
    });
    return matrixData.columns.filter((c) => usedColIds.has(c.id));
  }, [matrixData.columns, filteredRows, selectedZone, selectedRoom, searchTerm]);

  // Count executed vs unexecuted
  const executionStats = useMemo(() => {
    let executedCount = 0;
    let totalCells = 0;
    matrixData.rows.forEach((r) => {
      (Object.values(r.cells) as MatrixCellData[]).forEach((c) => {
        totalCells++;
        if (c.isExecuted) executedCount++;
      });
    });
    return {
      executedCount,
      totalCells,
      percent: totalCells > 0 ? Math.round((executedCount / totalCells) * 100) : 0,
    };
  }, [matrixData.rows]);

  // Quick toggle all for a specific patient
  const handleTogglePatientAll = (patientRow: MatrixPatientRow) => {
    const cells = Object.values(patientRow.cells) as MatrixCellData[];
    const allExecuted = cells.every((c) => c.isExecuted);
    const newStatus = !allExecuted;
    const ids = cells.map((c) => c.recordId);
    if (onBatchToggleExecution) {
      onBatchToggleExecution(ids, newStatus);
    } else {
      ids.forEach((id) => onToggleExecution(id));
    }
  };

  // Quick toggle all visible in filtered table
  const handleBatchToggleAllVisible = (status: boolean) => {
    const ids: string[] = [];
    filteredRows.forEach((r) => {
      (Object.values(r.cells) as MatrixCellData[]).forEach((c) => {
        ids.push(c.recordId);
      });
    });
    if (onBatchToggleExecution && ids.length > 0) {
      onBatchToggleExecution(ids, status);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  SỔ TIÊM DẠNG MA TRẬN (MÔ PHỎNG SỔ TAY ĐIỀU DƯỠNG)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  {filteredRows.length} Bệnh nhân • {activeColumns.length} Loại thuốc
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bảng kẻ ô trực quan: Bệnh nhân (Dòng) × Thuốc tiêm (Cột) kèm Liều lượng, Cữ giờ tiêm (7-15-23) & Gạch chéo thực hiện
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Vision & JSON Matrix Extraction */}
            {onOpenAiModal && (
              <button
                type="button"
                onClick={onOpenAiModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-800 hover:bg-teal-900 text-white transition-colors cursor-pointer shadow-xs border border-teal-700"
                title="Bóc tách dữ liệu từ hình ảnh báo cáo y lệnh hoặc dán JSON ma trận bằng AI Gemini"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Bóc tách Y lệnh</span>
              </button>
            )}

            {/* Toggle notebook grid paper theme */}
            <button
              type="button"
              onClick={() => setNotebookStyle(!notebookStyle)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                notebookStyle
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Chuyển đổi giao diện giấy ô ly Hồng Hà / Sổ tay điều dưỡng"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{notebookStyle ? 'Giao diện Sổ Tay Ô Ly' : 'Giao diện Hiện Đại'}</span>
            </button>

            {onOpenPrintModal && (
              <button
                type="button"
                onClick={onOpenPrintModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-teal-300" />
                <span>In Sổ A4 Ngang</span>
              </button>
            )}

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Xuất Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Zone Selector Tabs (Danh sách 1 & Danh sách 2) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-teal-700" />
            Phân vùng danh sách:
          </span>

          <button
            type="button"
            onClick={() => setSelectedZone('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedZone === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Tất cả</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedZone === 'ALL' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {matrixData.rows.length} BN
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedZone('ZONE_1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedZone === 'ZONE_1'
                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                : 'bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200'
            }`}
          >
            <span>📋 DS 1: Khu Nội - Nhi (Trừ Lão khoa, Nhi 1, 2)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedZone === 'ZONE_1' ? 'bg-blue-800 text-blue-100' : 'bg-blue-200/80 text-blue-900 font-bold'
            }`}>
              {matrixData.zone1Rows.length} BN
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedZone('ZONE_2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedZone === 'ZONE_2'
                ? 'bg-amber-700 text-white border-amber-800 shadow-xs'
                : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            <span>🏥 DS 2: Lão khoa, Nhi 1, Nhi 2 & Khu Nhiễm</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedZone === 'ZONE_2' ? 'bg-amber-800 text-amber-100' : 'bg-amber-200/80 text-amber-900 font-bold'
            }`}>
              {matrixData.zone2Rows.length} BN
            </span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên người bệnh, thuốc, phòng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-slate-800"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Room Filter */}
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs outline-none hover:border-slate-300"
              >
                <option value="ALL">Tất cả Buồng / Phòng ({matrixData.allRooms.length})</option>
                {matrixData.allRooms.map((room) => (
                  <option key={room} value={room}>
                    Phòng / Buồng: {room}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Executed Status */}
            <select
              value={filterExecuted}
              onChange={(e) => setFilterExecuted(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 text-xs outline-none hover:border-slate-300"
            >
              <option value="ALL">Tất cả trạng thái tiêm</option>
              <option value="UNEXECUTED">Chưa tiêm (còn cữ)</option>
              <option value="EXECUTED">Đã tiêm xong</option>
            </select>
          </div>

          {/* Quick Batch Execution buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Tiến độ: <strong>{executionStats.executedCount}/{executionStats.totalCells}</strong> ({executionStats.percent}%)
            </span>

            <button
              type="button"
              onClick={() => handleBatchToggleAllVisible(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 text-[11px] font-semibold cursor-pointer"
              title="Đánh dấu đã tiêm tất cả ô đang hiển thị"
            >
              <CheckCheck className="w-3 h-3 text-teal-600" />
              Gạch chéo đã tiêm hết
            </button>

            <button
              type="button"
              onClick={() => handleBatchToggleAllVisible(false)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-[11px] font-medium cursor-pointer"
              title="Bỏ gạch chéo"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX GRID WORKBOOK CONTAINER */}
      <div className={`rounded-xl border shadow-sm overflow-hidden ${
        notebookStyle ? 'bg-[#faf9f5] border-[#d8d0c0]' : 'bg-white border-slate-200'
      }`}>
        {/* Notebook Top Margin Header */}
        <div className={`px-5 py-2.5 border-b flex items-center justify-between text-xs font-semibold ${
          notebookStyle
            ? 'bg-[#f4efe4] border-[#d8d0c0] text-[#5a4838]'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>NGÀY Y LỆNH: <strong className="text-teal-900 underline decoration-teal-600">{selectedDate || '............................'}</strong></span>
            </div>
            <span className="hidden md:inline">•</span>
            <div className="hidden md:inline text-slate-600 font-medium">
              Khoa: <strong>{departmentName}</strong>
            </div>
          </div>

          <div className="text-[11px] italic text-slate-500">
            * Nhấp vào ô thuốc để gạch chéo xác nhận đã tiêm cho người bệnh
          </div>
        </div>

        {/* Scrollable Matrix Table */}
        <div className="overflow-x-auto max-h-[75vh]">
          <table className={`w-full border-collapse text-xs select-none ${
            notebookStyle ? 'font-sans' : 'font-sans'
          }`}>
            <thead>
              <tr className={`border-b ${
                notebookStyle
                  ? 'bg-[#ede5d4] border-[#bcae96] text-[#3d2f20]'
                  : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}>
                {/* 1. STT */}
                <th className={`sticky left-0 z-30 px-2.5 py-3 text-center font-bold w-10 border-r ${
                  notebookStyle ? 'bg-[#ede5d4] border-[#bcae96]' : 'bg-slate-100 border-slate-300'
                }`}>
                  STT
                </th>

                {/* 2. Họ và tên người bệnh */}
                <th className={`sticky left-10 z-30 px-3.5 py-3 text-left font-bold min-w-[190px] border-r ${
                  notebookStyle ? 'bg-[#ede5d4] border-[#bcae96]' : 'bg-slate-100 border-slate-300'
                }`}>
                  Họ và tên người bệnh
                </th>

                {/* 3. Tuổi / Tháng */}
                <th className={`sticky left-[230px] z-30 px-2 py-3 text-center font-bold w-16 border-r ${
                  notebookStyle ? 'bg-[#ede5d4] border-[#bcae96]' : 'bg-slate-100 border-slate-300'
                }`}>
                  Tuổi
                </th>

                {/* 4. Phòng / Buồng */}
                <th className={`sticky left-[294px] z-30 px-2.5 py-3 text-center font-bold w-20 border-r shadow-xs ${
                  notebookStyle ? 'bg-[#ede5d4] border-[#bcae96]' : 'bg-slate-100 border-slate-300'
                }`}>
                  Phòng
                </th>

                {/* 5..N. DRUG COLUMNS (Tên thuốc & Đường dùng) */}
                {activeColumns.map((col) => (
                  <th
                    key={col.id}
                    className={`px-3 py-2.5 text-center font-bold min-w-[135px] max-w-[170px] border-r align-top ${
                      notebookStyle
                        ? 'border-[#bcae96] bg-[#f2ebd9] hover:bg-[#eae0cb]'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <div className="text-[12px] font-bold text-slate-900 leading-tight line-clamp-2" title={col.drugName}>
                      {col.drugName}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                        col.route === 'TMC' ? 'bg-teal-700 text-white' :
                        col.route === 'PKD' ? 'bg-blue-700 text-white' :
                        col.route === 'TDD' ? 'bg-amber-700 text-white' :
                        col.route === 'IM' ? 'bg-purple-700 text-white' :
                        'bg-slate-700 text-white'
                      }`}>
                        {col.route}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`divide-y ${
              notebookStyle ? 'divide-[#ded5c2]' : 'divide-slate-200'
            }`}>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + activeColumns.length}
                    className="py-12 text-center text-slate-500 text-sm"
                  >
                    Không tìm thấy người bệnh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const showZoneHeader = selectedZone === 'ALL' && (idx === 0 || row.wardZone !== filteredRows[idx - 1]?.wardZone);
                  const isZone1 = row.wardZone === 'ZONE_1_NOI_NHI_STANDARD';
                  const zoneRowCount = isZone1 ? matrixData.zone1Rows.length : matrixData.zone2Rows.length;

                  return (
                    <React.Fragment key={row.patientKey}>
                      {showZoneHeader && (
                        <tr className="border-t-2 border-b">
                          <td
                            colSpan={4 + activeColumns.length}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                              isZone1
                                ? 'bg-blue-900 text-blue-50 border-blue-950'
                                : 'bg-amber-900 text-amber-50 border-amber-950'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className="text-sm">{isZone1 ? '📋' : '🏥'}</span>
                                <span>
                                  {isZone1
                                    ? 'DANH SÁCH 1: KHU NỘI - NHI (Trừ phòng Lão khoa, Nhi 1, Nhi 2)'
                                    : 'DANH SÁCH 2: PHÒNG LÃO KHOA, NHI 1, NHI 2 & KHU TRUYỀN NHIỄM'}
                                </span>
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-black/20 text-white font-mono">
                                {zoneRowCount} Người bệnh
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`transition-colors group ${
                          notebookStyle
                            ? idx % 2 === 0 ? 'bg-[#faf9f5] hover:bg-[#f3eedf]' : 'bg-[#f7f5ee] hover:bg-[#f3eedf]'
                            : idx % 2 === 0 ? 'bg-white hover:bg-teal-50/40' : 'bg-slate-50/50 hover:bg-teal-50/40'
                        }`}
                      >
                      {/* STT */}
                      <td className={`sticky left-0 z-20 px-2 py-2 text-center text-[11px] font-semibold border-r ${
                        notebookStyle
                          ? 'bg-[#faf9f5] group-hover:bg-[#f3eedf] border-[#ded5c2] text-[#6b5845]'
                          : 'bg-white group-hover:bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {idx + 1}
                      </td>

                      {/* Họ và tên người bệnh */}
                      <td className={`sticky left-10 z-20 px-3 py-2 border-r font-semibold ${
                        notebookStyle
                          ? 'bg-[#faf9f5] group-hover:bg-[#f3eedf] border-[#ded5c2] text-slate-900'
                          : 'bg-white group-hover:bg-slate-100 border-slate-200 text-slate-900'
                      }`}>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight">
                            {row.patientName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePatientAll(row)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-teal-700"
                            title="Đánh dấu đã tiêm tất cả thuốc của bệnh nhân này"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {row.bed && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Giường: {row.bed} {row.patientCode ? `• Mã: ${row.patientCode}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Tuổi / Tháng */}
                      <td className={`sticky left-[230px] z-20 px-1.5 py-2 text-center border-r ${
                        notebookStyle
                          ? 'bg-[#faf9f5] group-hover:bg-[#f3eedf] border-[#ded5c2]'
                          : 'bg-white group-hover:bg-slate-100 border-slate-200'
                      }`}>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[12px] font-bold ${
                          row.isPediatric
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 font-mono'
                            : 'text-slate-800 font-mono font-bold'
                        }`}>
                          {row.age || '—'}
                        </span>
                      </td>

                      {/* Phòng / Buồng */}
                      <td className={`sticky left-[294px] z-20 px-2 py-2 text-center border-r shadow-xs ${
                        notebookStyle
                          ? 'bg-[#faf9f5] group-hover:bg-[#f3eedf] border-[#ded5c2]'
                          : 'bg-white group-hover:bg-slate-100 border-slate-200'
                      }`}>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[12px] font-bold bg-teal-100 text-teal-900 border border-teal-300/80 font-mono">
                          {row.room || '—'}
                        </span>
                      </td>

                      {/* DRUG CELLS */}
                      {activeColumns.map((col) => {
                        const cell = row.cells[col.id];

                        if (!cell) {
                          return (
                            <td
                              key={col.id}
                              className={`px-2 py-2 text-center border-r ${
                                notebookStyle ? 'border-[#ded5c2]' : 'border-slate-200'
                              }`}
                            >
                              <span className="text-slate-400 font-bold select-none text-base">.</span>
                            </td>
                          );
                        }

                        const totalSlots = cell.timeSlots.length;
                        const executedCount = cell.timeSlotsExecuted.filter(Boolean).length;
                        const isPartial = executedCount > 0 && executedCount < totalSlots;

                        return (
                          <td
                            key={col.id}
                            onClick={() => onToggleExecution(cell.recordId)}
                            className={`px-2.5 py-2 text-center border-r relative cursor-pointer transition-all hover:ring-2 hover:ring-teal-500/50 ${
                              notebookStyle
                                ? cell.isExecuted
                                  ? 'bg-emerald-50/50 border-[#ded5c2]'
                                  : isPartial
                                    ? 'bg-amber-50/40 border-[#ded5c2]'
                                    : 'border-[#ded5c2] hover:bg-[#efe8d5]'
                                : cell.isExecuted
                                  ? 'bg-emerald-50/60 border-slate-200'
                                  : isPartial
                                    ? 'bg-amber-50/40 border-slate-200'
                                    : 'border-slate-200 hover:bg-slate-100/60'
                            }`}
                            title={`Nhấp để đổi trạng thái: ${
                              cell.isExecuted
                                ? 'Đã tiêm đủ các cữ (Nhấp để hủy)'
                                : isPartial
                                  ? `Đã tiêm ${executedCount}/${totalSlots} cữ`
                                  : 'Chưa tiêm (Nhấp để gạch chéo tất cả cữ)'
                            }`}
                          >
                            {/* Realistic Full-cell Hand-drawn Slash Overlay when all slots Executed */}
                            {cell.isExecuted && (
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
                                <svg
                                  className="w-full h-full text-emerald-700/80"
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="none"
                                >
                                  {/* Main diagonal pen mark across cell */}
                                  <line
                                    x1="10"
                                    y1="90"
                                    x2="90"
                                    y2="10"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                            )}

                            {/* Cell Content: Dose & Schedule */}
                            <div className={`relative z-0 space-y-1 ${cell.isExecuted ? 'opacity-70' : ''}`}>
                              {/* 1. Dose Text (1 x 3, 2/3 x 3, 1/2 x 2, 1, v.v.) */}
                              <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-tight">
                                {cell.doseText}
                              </div>

                              {/* 2. Interactive Scheduled Times (e.g. 7 - 15 - 23, 7 - 19) */}
                              <div className="flex items-center justify-center gap-1 flex-wrap text-[11px] font-bold text-slate-800 font-mono">
                                {cell.timeSlots.map((slot, sIdx) => {
                                  const isSlotExecuted = !!cell.timeSlotsExecuted[sIdx];

                                  return (
                                    <span
                                      key={`${cell.recordId}_slot_${sIdx}`}
                                      onClick={(e) => {
                                        if (onToggleSlotExecution) {
                                          e.stopPropagation();
                                          onToggleSlotExecution(cell.recordId, sIdx);
                                        }
                                      }}
                                      className={`relative inline-flex items-center justify-center px-1 py-0.2 rounded transition-colors ${
                                        isSlotExecuted
                                          ? 'text-emerald-900 font-black'
                                          : 'hover:bg-teal-100 hover:text-teal-900 text-slate-800'
                                      }`}
                                      title={`Cữ ${slot}h: ${isSlotExecuted ? 'Đã tiêm (Nhấp để bỏ gạch)' : 'Chưa tiêm (Nhấp để gạch cữ này)'}`}
                                    >
                                      <span>{slot}</span>

                                      {/* Individual Slash Mark across this specific slot number */}
                                      {isSlotExecuted && (
                                        <svg
                                          className="absolute inset-0 w-full h-full text-emerald-700 pointer-events-none"
                                          viewBox="0 0 20 20"
                                          preserveAspectRatio="none"
                                        >
                                          <line
                                            x1="3"
                                            y1="17"
                                            x2="17"
                                            y2="3"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                      )}

                                      {sIdx < cell.timeSlots.length - 1 && (
                                        <span className="text-slate-400 font-normal ml-1 select-none">-</span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* 3. Chi tiết nguyên văn tên thuốc, hàm lượng, dung môi pha từ cột Ghi chú & ghi chú kèm */}
                              <div className="pt-0.5 space-y-0.5 border-t border-slate-200/60">
                                {cell.notes && (
                                  <div className="text-[10px] font-bold text-rose-600 line-clamp-1 leading-tight" title={cell.notes}>
                                    {cell.notes}
                                  </div>
                                )}
                                {cell.detailVerbatim && cell.detailVerbatim !== cell.notes && (
                                  <div className="text-[9.5px] font-medium text-slate-600 line-clamp-2 leading-snug italic" title={cell.detailVerbatim}>
                                    {cell.detailVerbatim}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Legend & Ward Totals */}
        <div className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          notebookStyle
            ? 'bg-[#ede5d4] border-[#d8d0c0] text-[#5a4838]'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap font-medium">
            <span className="font-bold text-slate-800">Ghi chú ký hiệu:</span>
            <span className="flex items-center gap-1 text-slate-700">
              <span className="font-mono font-bold text-slate-900">1 x 3</span> = 1 đơn vị × 3 cữ
            </span>
            <span className="flex items-center gap-1 text-slate-700">
              <span className="font-mono font-bold text-slate-900">7 - 15 - 23</span> = Khung giờ tiêm
            </span>
            <span className="flex items-center gap-1 text-emerald-800 font-bold">
              <span className="w-4 h-4 rounded border border-emerald-600 bg-emerald-100 flex items-center justify-center text-[10px]">/</span>
              Đã gạch chéo = Đã thực hiện tiêm
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-bold">
              <span className="font-mono">4 th</span> = Trẻ nhi 4 tháng tuổi
            </span>
          </div>

          <div className="font-bold text-slate-800">
            Tổng cộng ca trực: <span className="text-teal-800 text-sm font-black">{matrixData.totalInjections}</span> lượt tiêm thuốc
          </div>
        </div>
      </div>

      {/* DRUG PREPARATION TOTALS (Bảng tổng hợp dự trù số lượng thuốc chuẩn bị trong ca) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              TỔNG HỢP DỰ TRÙ THUỐC CẦN CHUẨN BỊ TRONG CA TRỰC
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Tổng {activeColumns.length} danh mục thuốc tiêm & khí dung
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {activeColumns.map((col) => (
            <div
              key={col.id}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-teal-50/50 hover:border-teal-300 transition-colors"
            >
              <div className="text-[12px] font-bold text-slate-900 truncate" title={col.drugName}>
                {col.drugName}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                  {col.route}
                </span>
                <span className="font-bold text-teal-800">
                  {col.totalPrescriptions} người bệnh
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
