import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  LayoutGrid,
  ChevronRight,
  Columns,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { ProcessedInjectionRecord } from '../types/hospital';
import { buildNurseMatrixData, classifyRoomToWardZone } from '../utils/matrixBuilder';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  injections: ProcessedInjectionRecord[];
  hospitalName: string;
  departmentName: string;
  selectedDate: string;
}

export type PrintScope = 'ALL' | 'ZONE_1' | 'ZONE_2' | 'BY_ROOM' | 'BY_PATIENT' | 'BY_SHIFT';
export type PrintTemplateType = 'MATRIX_NOTEBOOK' | 'DETAILED_LIST';
export type PaperOrientation = 'PORTRAIT' | 'LANDSCAPE';

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  injections,
  hospitalName,
  departmentName,
  selectedDate,
}) => {
  const [templateType, setTemplateType] = useState<PrintTemplateType>('MATRIX_NOTEBOOK');
  const [paperOrientation, setPaperOrientation] = useState<PaperOrientation>('PORTRAIT');
  const [colsPerPageOption, setColsPerPageOption] = useState<number>(5); // 5 columns fit nicely in A4 portrait
  const [printScope, setPrintScope] = useState<PrintScope>('ALL');
  const [targetRoom, setTargetRoom] = useState<string>('ALL');
  const [targetShift, setTargetShift] = useState<string>('ALL');
  const [targetPatient, setTargetPatient] = useState<string>('ALL');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeSlashes, setIncludeSlashes] = useState<boolean>(true);

  // Distinct Rooms & Patients
  const roomList = useMemo(() => {
    const s = new Set<string>();
    injections.forEach((i) => i.room && s.add(i.room));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [injections]);

  const patientList = useMemo(() => {
    const s = new Set<string>();
    injections.forEach((i) => i.patientName && s.add(i.patientName));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [injections]);

  // Zone patient counts for badges
  const zoneStats = useMemo(() => {
    const z1Patients = new Set<string>();
    const z2Patients = new Set<string>();

    injections.forEach((i) => {
      const z = classifyRoomToWardZone(i.room, i.area, i.departmentRoomBed);
      const pName = i.patientName || '';
      if (z === 'ZONE_1_NOI_NHI_STANDARD') {
        z1Patients.add(pName);
      } else {
        z2Patients.add(pName);
      }
    });

    return {
      z1Patients: z1Patients.size,
      z2Patients: z2Patients.size,
    };
  }, [injections]);

  // Filtered List for Printing
  const printableList = useMemo(() => {
    let list = [...injections];

    if (printScope === 'ZONE_1') {
      list = list.filter((i) => classifyRoomToWardZone(i.room, i.area, i.departmentRoomBed) === 'ZONE_1_NOI_NHI_STANDARD');
    } else if (printScope === 'ZONE_2') {
      list = list.filter((i) => classifyRoomToWardZone(i.room, i.area, i.departmentRoomBed) === 'ZONE_2_LAO_KHOA_NHI_NHIEM');
    }

    if (printScope === 'BY_ROOM' && targetRoom !== 'ALL') {
      list = list.filter((i) => i.room === targetRoom);
    }

    if (printScope === 'BY_PATIENT' && targetPatient !== 'ALL') {
      list = list.filter((i) => i.patientName === targetPatient);
    }

    if (printScope === 'BY_SHIFT' && targetShift !== 'ALL') {
      list = list.filter((item) => {
        const hour = parseInt(item.orderTime.split(':')[0], 10);
        if (isNaN(hour)) return true;
        if (targetShift === 'MORNING') return hour >= 6 && hour < 12;
        if (targetShift === 'AFTERNOON') return hour >= 12 && hour < 18;
        if (targetShift === 'EVENING') return hour >= 18 && hour < 24;
        if (targetShift === 'NIGHT') return hour >= 0 && hour < 6;
        return true;
      });
    }

    return list;
  }, [injections, printScope, targetRoom, targetPatient, targetShift]);

  // Matrix data for printing
  const matrixData = useMemo(() => {
    return buildNurseMatrixData(printableList);
  }, [printableList]);

  // Column chunks for A4 Portrait pagination
  const columnChunks = useMemo(() => {
    const allCols = matrixData.columns;
    if (allCols.length === 0) return [[]];

    // If landscape or user chose 'all', single page of columns
    if (paperOrientation === 'LANDSCAPE' || colsPerPageOption === 0) {
      return [allCols];
    }

    const chunks = [];
    const chunkSize = colsPerPageOption || 5;
    for (let i = 0; i < allCols.length; i += chunkSize) {
      chunks.push(allCols.slice(i, i + chunkSize));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [matrixData.columns, colsPerPageOption, paperOrientation]);

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  const totalPages = columnChunks.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold">IN SỔ THUỐC TIÊM (CHUẨN KHỔ IN A4 ĐỨNG)</h2>
              <p className="text-xs text-slate-300">
                Tự động chia cột thuốc vừa vặn khổ A4 nằm đứng (Tự động sang trang 2 nếu nhiều cột thuốc)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template & Paper Orientation Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mẫu in */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Mẫu in:</span>
            <button
              type="button"
              onClick={() => setTemplateType('MATRIX_NOTEBOOK')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                templateType === 'MATRIX_NOTEBOOK'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Sổ Tiêm Ma Trận (Sổ Tay Điều Dưỡng)
            </button>
            <button
              type="button"
              onClick={() => setTemplateType('DETAILED_LIST')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                templateType === 'DETAILED_LIST'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Danh Sách Chi Tiết (Mẫu 7 Cột)
            </button>
          </div>

          {/* Orientation and Pagination Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPaperOrientation('PORTRAIT')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  paperOrientation === 'PORTRAIT'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Khổ giấy in A4 nằm đứng (Portrait)"
              >
                📄 A4 Đứng (Mặc định)
              </button>
              <button
                type="button"
                onClick={() => setPaperOrientation('LANDSCAPE')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  paperOrientation === 'LANDSCAPE'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Khổ giấy in A4 nằm ngang (Landscape)"
              >
                📑 A4 Ngang
              </button>
            </div>

            {templateType === 'MATRIX_NOTEBOOK' && paperOrientation === 'PORTRAIT' && (
              <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                <Columns className="w-3.5 h-3.5 text-teal-700" />
                <span className="text-teal-900 font-semibold">Cột/Trang A4:</span>
                <select
                  value={colsPerPageOption}
                  onChange={(e) => setColsPerPageOption(Number(e.target.value))}
                  className="bg-white border border-teal-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-teal-900 outline-none"
                >
                  <option value={4}>4 cột/trang (Chữ rất to)</option>
                  <option value={5}>5 cột/trang (Chuẩn A4 đẹp)</option>
                  <option value={6}>6 cột/trang (Nhiều cột)</option>
                  <option value={0}>Tất cả trên 1 trang</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Modal Config Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Print Scope Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700 mr-1">Phạm vi in:</span>
            <button
              onClick={() => setPrintScope('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                printScope === 'ALL'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Toàn bộ khoa
            </button>
            <button
              onClick={() => setPrintScope('ZONE_1')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                printScope === 'ZONE_1'
                  ? 'bg-blue-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-blue-300 text-blue-800 hover:bg-blue-50'
              }`}
            >
              <span>🏥 DS 1: Khu Nội - Nhi</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-900 font-bold">
                {zoneStats.z1Patients} BN
              </span>
            </button>
            <button
              onClick={() => setPrintScope('ZONE_2')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                printScope === 'ZONE_2'
                  ? 'bg-amber-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span>🩺 DS 2: Lão khoa, Nhi 1,2 & Nhiễm</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
                {zoneStats.z2Patients} BN
              </span>
            </button>
            <button
              onClick={() => setPrintScope('BY_ROOM')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                printScope === 'BY_ROOM'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo từng phòng
            </button>
            <button
              onClick={() => setPrintScope('BY_SHIFT')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                printScope === 'BY_SHIFT'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo ca trực
            </button>
            <button
              onClick={() => setPrintScope('BY_PATIENT')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                printScope === 'BY_PATIENT'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo bệnh nhân
            </button>
          </div>

          {/* Conditional Dropdowns & Options */}
          <div className="flex items-center gap-3 flex-wrap">
            {printScope === 'BY_ROOM' && (
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">Tất cả các phòng</option>
                {roomList.map((r) => (
                  <option key={r} value={r}>
                    Phòng {r}
                  </option>
                ))}
              </select>
            )}

            {printScope === 'BY_SHIFT' && (
              <select
                value={targetShift}
                onChange={(e) => setTargetShift(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">Tất cả ca trực</option>
                <option value="MORNING">Ca Sáng (06:00 - 11:59)</option>
                <option value="AFTERNOON">Ca Chiều (12:00 - 17:59)</option>
                <option value="EVENING">Ca Tối (18:00 - 23:59)</option>
                <option value="NIGHT">Ca Đêm (00:00 - 05:59)</option>
              </select>
            )}

            {printScope === 'BY_PATIENT' && (
              <select
                value={targetPatient}
                onChange={(e) => setTargetPatient(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-800 outline-none max-w-[200px]"
              >
                <option value="ALL">Tất cả bệnh nhân</option>
                {patientList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}

            {/* In slashes */}
            {templateType === 'MATRIX_NOTEBOOK' && (
              <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSlashes}
                  onChange={(e) => setIncludeSlashes(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>In nét gạch đã tiêm</span>
              </label>
            )}

            {/* Signature toggle */}
            <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Khung chữ ký</span>
            </label>
          </div>
        </div>

        {/* Paper Print Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 space-y-6">
          <div id="printable-area" className="w-full">
            {templateType === 'MATRIX_NOTEBOOK' ? (
              /* RENDER MATRIX NOTEBOOK (Multi-page Chunked for A4 Portrait) */
              columnChunks.map((chunkCols, pageIdx) => {
                const isLastPage = pageIdx === totalPages - 1;

                return (
                  <div
                    key={`page_${pageIdx}`}
                    className={`bg-white max-w-[210mm] mx-auto p-6 sm:p-7 shadow-lg text-slate-900 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-full ${
                      pageIdx > 0 ? 'mt-6 print:mt-0 print-page-break' : ''
                    }`}
                    style={{ minHeight: paperOrientation === 'PORTRAIT' ? '280mm' : '190mm' }}
                  >
                    {/* Hospital Print Header */}
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2">
                      <div>
                        <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider leading-tight">
                          {hospitalName || 'BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH'}
                        </div>
                        <div className="text-xs font-black text-slate-900 uppercase leading-tight">
                          {departmentName || 'KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM'}
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-slate-700 leading-tight">
                        <div>
                          Mẫu: <strong>SỔ TIÊM MA TRẬN ({paperOrientation === 'PORTRAIT' ? 'A4 ĐỨNG' : 'A4 NGANG'})</strong>
                        </div>
                        <div>
                          Trang: <strong className="text-teal-900 font-bold">{pageIdx + 1} / {totalPages}</strong>
                          {totalPages > 1 && ` (Cột ${pageIdx * (colsPerPageOption || 5) + 1} - ${pageIdx * (colsPerPageOption || 5) + chunkCols.length})`}
                        </div>
                        <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>

                    {/* Document Title */}
                    <div className="text-center my-2.5">
                      <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 leading-snug">
                        SỔ THUỐC TIÊM & KHÍ DUNG (THEO DÕI THỰC HIỆN)
                      </h1>
                      <p className="text-[11px] text-slate-600 mt-0.5 italic">
                        Ngày thực hiện: <strong>{selectedDate || '........................................'}</strong>
                        {printScope === 'ZONE_1' && ` • DS 1: KHU NỘI - NHI (Trừ Lão khoa, Nhi 1, 2)`}
                        {printScope === 'ZONE_2' && ` • DS 2: LÃO KHOA, NHI 1, 2 & KHU NHIỄM`}
                        {printScope === 'BY_ROOM' && targetRoom !== 'ALL' && ` • Buồng: Phòng ${targetRoom}`}
                        {printScope === 'BY_SHIFT' && targetShift !== 'ALL' && ` • Ca trực: ${targetShift}`}
                        {totalPages > 1 && (
                          <span className="font-semibold text-teal-800 ml-1.5">
                            [Phần {pageIdx + 1}/{totalPages}: Gồm {chunkCols.map(c => c.drugName).join(', ')}]
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Matrix Table for this page */}
                    <div className="overflow-hidden border border-slate-900 mt-2">
                      <table className="w-full text-left text-[11px] border-collapse border border-slate-900">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                            <th className="py-2 px-1 text-center border-r border-slate-900 w-7">STT</th>
                            <th className="py-2 px-2 border-r border-slate-900 min-w-[120px]">Họ và tên người bệnh</th>
                            <th className="py-2 px-1 text-center border-r border-slate-900 w-11">Tuổi</th>
                            <th className="py-2 px-1 text-center border-r border-slate-900 w-12">Phòng</th>
                            {chunkCols.map((col) => (
                              <th
                                key={col.id}
                                className="py-2 px-1.5 text-center border-r border-slate-900 align-top"
                                style={{ width: `${Math.floor(100 / (chunkCols.length + 3))}%` }}
                              >
                                <div className="font-black text-[11px] leading-tight text-slate-900">{col.drugName}</div>
                                <div className="text-[9px] font-bold text-slate-700 uppercase mt-0.5">{col.route}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixData.rows.map((row, idx) => {
                            const isFirstOfZone2 =
                              printScope === 'ALL' &&
                              row.wardZone === 'ZONE_2_LAO_KHOA_NHI_NHIEM' &&
                              (idx === 0 || matrixData.rows[idx - 1]?.wardZone === 'ZONE_1_NOI_NHI_STANDARD');

                            const isFirstOfZone1 =
                              printScope === 'ALL' &&
                              idx === 0 &&
                              row.wardZone === 'ZONE_1_NOI_NHI_STANDARD';

                            return (
                              <React.Fragment key={row.patientKey}>
                                {isFirstOfZone1 && (
                                  <tr className="bg-blue-50 border-b border-slate-900 font-bold text-blue-900 text-[10px]">
                                    <td colSpan={4 + chunkCols.length} className="py-1 px-2 uppercase tracking-wide">
                                      🏥 DANH SÁCH 1: KHU NỘI - NHI (TRỪ LÃO KHOA, NHI 1, NHI 2)
                                    </td>
                                  </tr>
                                )}

                                {isFirstOfZone2 && (
                                  <tr className="bg-amber-50 border-y border-slate-900 font-bold text-amber-900 text-[10px]">
                                    <td colSpan={4 + chunkCols.length} className="py-1 px-2 uppercase tracking-wide">
                                      🩺 DANH SÁCH 2: PHÒNG LÃO KHOA, NHI 1, NHI 2 & KHU NHIỄM
                                    </td>
                                  </tr>
                                )}

                                <tr className="border-b border-slate-400">
                                  <td className="py-1 px-1 text-center border-r border-slate-400 font-medium">{idx + 1}</td>
                                  <td className="py-1 px-2 border-r border-slate-400 font-bold text-slate-900">
                                    {row.patientName}
                                    {row.bed && <span className="text-[9px] text-slate-500 font-normal ml-1">({row.bed})</span>}
                                  </td>
                                  <td className="py-1 px-1 text-center border-r border-slate-400 font-bold font-mono text-[10px]">
                                    {row.age}
                                  </td>
                                  <td className="py-1 px-1 text-center border-r border-slate-400 font-bold text-slate-800 text-[10px]">
                                    {row.room}
                                  </td>
                                  {chunkCols.map((col) => {
                                    const cell = row.cells[col.id];
                                    if (!cell) {
                                      return (
                                        <td key={col.id} className="py-1 px-1 text-center border-r border-slate-400 text-slate-300">
                                          •
                                        </td>
                                      );
                                    }

                                    return (
                                      <td key={col.id} className="py-1 px-1 text-center border-r border-slate-400 relative">
                                        {/* Full cell diagonal slash if completely executed and enabled */}
                                        {includeSlashes && cell.isExecuted && (
                                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" preserveAspectRatio="none">
                                              <line x1="8" y1="92" x2="92" y2="8" stroke="currentColor" strokeWidth="2.2" />
                                            </svg>
                                          </div>
                                        )}
                                        <div className="relative z-0 space-y-0.5">
                                          <div className="font-black text-slate-900 font-mono text-[11px] leading-none">
                                            {cell.doseText}
                                          </div>
                                          <div className="flex items-center justify-center gap-1 font-bold text-slate-800 font-mono text-[9px] leading-tight">
                                            {cell.timeSlots.map((slot, sIdx) => {
                                              const isSlotExecuted = !!cell.timeSlotsExecuted[sIdx];
                                              return (
                                                <span key={sIdx} className="relative inline-block">
                                                  <span>{slot}</span>
                                                  {includeSlashes && isSlotExecuted && !cell.isExecuted && (
                                                    <svg
                                                      className="absolute inset-0 w-full h-full text-slate-900"
                                                      viewBox="0 0 20 20"
                                                      preserveAspectRatio="none"
                                                    >
                                                      <line x1="2" y1="18" x2="18" y2="2" stroke="currentColor" strokeWidth="2" />
                                                    </svg>
                                                  )}
                                                  {sIdx < cell.timeSlots.length - 1 && (
                                                    <span className="text-slate-400 ml-0.5 select-none">-</span>
                                                  )}
                                                </span>
                                              );
                                            })}
                                          </div>
                                          {cell.notes && (
                                            <div className="text-[8px] text-rose-700 font-bold leading-none">{cell.notes}</div>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary row */}
                    <div className="mt-2 text-[10px] text-slate-600 flex justify-between">
                      <span>Tổng số bệnh nhân: <strong>{matrixData.rows.length}</strong> người</span>
                      <span>
                        Thuốc hiển thị trang này: <strong>{chunkCols.length}</strong> / {matrixData.columns.length} loại
                      </span>
                    </div>

                    {/* Nurse Signatures (Rendered on the last page or if single page) */}
                    {includeSignatures && (isLastPage || totalPages === 1) && (
                      <div className="mt-6 grid grid-cols-3 text-center text-xs pt-2 gap-4 print-avoid-break">
                        <div>
                          <div className="font-bold uppercase text-slate-800 text-[11px]">ĐIỀU DƯỠNG TRƯỞNG KHOA</div>
                          <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                          <div className="h-12"></div>
                        </div>

                        <div>
                          <div className="font-bold uppercase text-slate-800 text-[11px]">ĐIỀU DƯỠNG HÀNH CHÍNH</div>
                          <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                          <div className="h-12"></div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-600 italic mb-0.5">
                            Ngày ..... tháng ..... năm 2026
                          </div>
                          <div className="font-bold uppercase text-slate-800 text-[11px]">ĐIỀU DƯỠNG THỰC HIỆN TIÊM</div>
                          <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                          <div className="h-12"></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* RENDER DETAILED 7-COLUMN LIST (A4 Portrait) */
              <div
                className="bg-white max-w-[210mm] mx-auto p-6 sm:p-8 shadow-lg text-slate-900 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-full"
                style={{ minHeight: '280mm' }}
              >
                {/* Hospital Print Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
                  <div>
                    <div className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                      {hospitalName || 'BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH'}
                    </div>
                    <div className="text-xs font-black text-slate-900 uppercase">
                      {departmentName || 'KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM'}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-600">
                    <div>Mẫu sổ: <strong>STT-01/YT (A4 ĐỨNG)</strong></div>
                    <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center my-3">
                  <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    SỔ THUỐC TIÊM HẰNG NGÀY
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 italic">
                    Ngày thực hiện: <strong>{selectedDate || '........................................'}</strong>
                    {printScope === 'BY_ROOM' && targetRoom !== 'ALL' && ` • Buồng: Phòng ${targetRoom}`}
                    {printScope === 'BY_SHIFT' && targetShift !== 'ALL' && ` • Ca: ${targetShift}`}
                  </p>
                </div>

                <div className="overflow-hidden border border-slate-900 mt-3">
                  <table className="w-full text-left text-xs border-collapse border border-slate-900">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold uppercase text-[11px] border-b border-slate-900">
                        <th className="py-2 px-2 text-center border-r border-slate-900 w-10">STT</th>
                        <th className="py-2 px-3 border-r border-slate-900">Tên Người Bệnh</th>
                        <th className="py-2 px-2 text-center border-r border-slate-900 w-14">Tuổi</th>
                        <th className="py-2 px-2 text-center border-r border-slate-900 w-24">Phòng</th>
                        <th className="py-2 px-3 border-r border-slate-900">Tên Thuốc & Hàm Lượng</th>
                        <th className="py-2 px-3 border-r border-slate-900">Ghi Chú</th>
                        <th className="py-2 px-2 text-center border-r border-slate-900 w-20">Giờ Y Lệnh</th>
                        <th className="py-2 px-2 text-center w-20">ĐD Ký</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400">
                      {printableList.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-400">
                          <td className="py-1.5 px-2 text-center border-r border-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-1.5 px-3 border-r border-slate-400 font-bold text-slate-900">{item.patientName}</td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-400 font-mono font-bold">{item.age || '—'}</td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-400 font-bold text-slate-800">{item.room}</td>
                          <td className="py-1.5 px-3 border-r border-slate-400 font-medium">
                            {item.drugFullName}
                            {item.quantity && <span className="text-slate-600 text-[10px] ml-1">({item.quantity} {item.unit})</span>}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-400 text-slate-700 text-[11px]">
                            {item.notes || item.route || '—'}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-400 font-mono font-bold text-slate-900">{item.orderTime}</td>
                          <td className="py-1.5 px-2 text-center text-slate-500 text-[10px]">
                            {item.isExecuted ? '✓ Đã tiêm' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-xs text-slate-600 flex justify-between">
                  <span>Tổng số lượt tiêm: <strong>{printableList.length}</strong> lượt</span>
                  <span>Tổng số người bệnh: <strong>{new Set(printableList.map(i => i.patientName)).size}</strong> người</span>
                </div>

                {includeSignatures && (
                  <div className="mt-8 grid grid-cols-3 text-center text-xs pt-4 gap-4 print-avoid-break">
                    <div>
                      <div className="font-bold uppercase text-slate-800">ĐIỀU DƯỠNG TRƯỞNG KHOA</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-14"></div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-slate-800">ĐIỀU DƯỠNG HÀNH CHÍNH</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-14"></div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-600 italic mb-1">
                        Ngày ..... tháng ..... năm 2026
                      </div>
                      <div className="font-bold uppercase text-slate-800">ĐIỀU DƯỠNG THỰC HIỆN TIÊM</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-14"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
              ✓ Khổ in: A4 Đứng ({totalPages} trang)
            </span>
            <span>Cữ giờ: 7-15-23, 7-19, 9-21 chuẩn lâm sàng</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In Ngay (Khổ A4 Đứng / PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

