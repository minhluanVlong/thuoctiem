import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  LayoutGrid,
  BookOpen,
  Columns
} from 'lucide-react';
import { ProcessedInjectionRecord } from '../types/hospital';
import { buildNurseMatrixData, classifyRoomToWardZone } from '../utils/matrixBuilder';
import { buildGroupedInjectionBook } from '../utils/patientBookBuilder';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  injections: ProcessedInjectionRecord[];
  hospitalName: string;
  departmentName: string;
  selectedDate: string;
}

export type PrintScope = 'ALL' | 'ZONE_1' | 'ZONE_2' | 'BY_ROOM' | 'BY_SHIFT';
export type PrintTemplateType = 'FOUR_COLUMN_BOOK' | 'MATRIX_NOTEBOOK' | 'DETAILED_LIST';
export type PaperOrientation = 'PORTRAIT' | 'LANDSCAPE';

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  injections,
  hospitalName,
  departmentName,
  selectedDate,
}) => {
  // Section 17: Default to FOUR_COLUMN_BOOK and LANDSCAPE
  const [templateType, setTemplateType] = useState<PrintTemplateType>('FOUR_COLUMN_BOOK');
  const [paperOrientation, setPaperOrientation] = useState<PaperOrientation>('LANDSCAPE');
  const [colsPerPageOption, setColsPerPageOption] = useState<number>(5);
  const [printScope, setPrintScope] = useState<PrintScope>('ALL');
  const [targetRoom, setTargetRoom] = useState<string>('ALL');
  const [targetShift, setTargetShift] = useState<string>('ALL');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeSlashes, setIncludeSlashes] = useState<boolean>(true);

  // Distinct Rooms
  const roomList = useMemo(() => {
    const s = new Set<string>();
    (injections || []).forEach((i) => i.room && s.add(i.room));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [injections]);

  // Zone counts for badges
  const zoneStats = useMemo(() => {
    const z1Patients = new Set<string>();
    const z2Patients = new Set<string>();

    (injections || []).forEach((i) => {
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
    let list = Array.isArray(injections) ? [...injections] : [];

    if (printScope === 'ZONE_1') {
      list = list.filter((i) => classifyRoomToWardZone(i.room, i.area, i.departmentRoomBed) === 'ZONE_1_NOI_NHI_STANDARD');
    } else if (printScope === 'ZONE_2') {
      list = list.filter((i) => classifyRoomToWardZone(i.room, i.area, i.departmentRoomBed) === 'ZONE_2_LAO_KHOA_NHI_NHIEM');
    }

    if (printScope === 'BY_ROOM' && targetRoom !== 'ALL') {
      list = list.filter((i) => i.room === targetRoom);
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
  }, [injections, printScope, targetRoom, targetShift]);

  // Grouped Patients for 4-column Book
  const groupedBook = useMemo(() => {
    return buildGroupedInjectionBook(printableList);
  }, [printableList]);

  // Matrix data for printing
  const matrixData = useMemo(() => {
    return buildNurseMatrixData(printableList);
  }, [printableList]);

  // Column chunks for A4 pagination in Matrix mode
  const columnChunks = useMemo(() => {
    const allCols = matrixData.columns;
    if (allCols.length === 0) return [[]];

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

  const totalMatrixPages = columnChunks.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-black tracking-wide">
                IN SỔ THUỐC TIÊM – BIỂU MẪU IN ẤN ĐIỀU DƯỠNG
              </h2>
              <p className="text-xs text-slate-300">
                Tùy chỉnh định dạng in theo khổ A4 Landscape (Khổ ngang) hoặc A4 Portrait (Khổ đứng)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template & Orientation Control Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mẫu in */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Mẫu in:</span>
            <button
              type="button"
              onClick={() => {
                setTemplateType('FOUR_COLUMN_BOOK');
                setPaperOrientation('LANDSCAPE');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                templateType === 'FOUR_COLUMN_BOOK'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Sổ 4 Cột Chuẩn Y Khoa (Tên | Tuổi | Phòng | Thuốc)
            </button>
            <button
              type="button"
              onClick={() => {
                setTemplateType('MATRIX_NOTEBOOK');
                setPaperOrientation('LANDSCAPE');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                templateType === 'MATRIX_NOTEBOOK'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Sổ Tiêm Ma Trận Ô Ly
            </button>
            <button
              type="button"
              onClick={() => setTemplateType('DETAILED_LIST')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                templateType === 'DETAILED_LIST'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Danh Sách Chi Tiết (7 Cột)
            </button>
          </div>

          {/* Orientation Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPaperOrientation('LANDSCAPE')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  paperOrientation === 'LANDSCAPE'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Khổ giấy in A4 nằm ngang (Landscape - Khuyên dùng)"
              >
                📑 A4 Ngang (Khuyên dùng)
              </button>
              <button
                type="button"
                onClick={() => setPaperOrientation('PORTRAIT')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  paperOrientation === 'PORTRAIT'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Khổ giấy in A4 nằm đứng (Portrait)"
              >
                📄 A4 Đứng
              </button>
            </div>

            {templateType === 'MATRIX_NOTEBOOK' && paperOrientation === 'PORTRAIT' && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                <Columns className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-blue-900 font-semibold">Cột/Trang:</span>
                <select
                  value={colsPerPageOption}
                  onChange={(e) => setColsPerPageOption(Number(e.target.value))}
                  className="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-blue-900 outline-none"
                >
                  <option value={4}>4 cột/trang</option>
                  <option value={5}>5 cột/trang</option>
                  <option value={6}>6 cột/trang</option>
                  <option value={0}>Tất cả trên 1 trang</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Modal Scope Controls */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Scope selection mandated by Section 17 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 mr-1">Phạm vi in:</span>
            <button
              onClick={() => setPrintScope('ALL')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                printScope === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Toàn bộ khoa ({injections.length} y lệnh)
            </button>
            <button
              onClick={() => setPrintScope('ZONE_1')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                printScope === 'ZONE_1'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white border border-blue-300 text-blue-800 hover:bg-blue-50'
              }`}
            >
              <span>🏥 In Khu Nội Nhi</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-900 font-bold">
                {zoneStats.z1Patients} BN
              </span>
            </button>
            <button
              onClick={() => setPrintScope('ZONE_2')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                printScope === 'ZONE_2'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span>🩺 In Khu Nhiễm</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
                {zoneStats.z2Patients} BN
              </span>
            </button>
            <button
              onClick={() => setPrintScope('BY_ROOM')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                printScope === 'BY_ROOM'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo từng phòng
            </button>
            <button
              onClick={() => setPrintScope('BY_SHIFT')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                printScope === 'BY_SHIFT'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo ca trực
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

            {templateType === 'MATRIX_NOTEBOOK' && (
              <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSlashes}
                  onChange={(e) => setIncludeSlashes(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>In nét gạch đã tiêm</span>
              </label>
            )}

            <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Khung chữ ký điều dưỡng</span>
            </label>
          </div>
        </div>

        {/* Paper Print Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 space-y-6">
          <div id="printable-area" className="w-full">
            {/* TEMPLATE 1: FOUR COLUMN BOOK (Standard Section 17 & 4-Column Rule) */}
            {templateType === 'FOUR_COLUMN_BOOK' && (
              <div
                className="bg-white max-w-[297mm] mx-auto p-6 sm:p-8 shadow-lg text-slate-900 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-full"
                style={{ minHeight: paperOrientation === 'LANDSCAPE' ? '195mm' : '275mm' }}
              >
                {/* Hospital Print Header - Section 17 Mandate */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-3">
                  <div>
                    <div className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                      {hospitalName || 'BỆNH VIỆN ĐA KHOA KV CHỢ LÁCH'}
                    </div>
                    <div className="text-sm font-black text-slate-900 uppercase">
                      {departmentName || 'KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM'}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-700 leading-tight">
                    <div>Mẫu: <strong>SỔ THUỐC TIÊM (4 CỘT CHUẨN A4)</strong></div>
                    <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center my-3">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
                    SỔ THUỐC TIÊM
                  </h1>
                  <p className="text-xs text-slate-700 mt-0.5">
                    <strong>KHOA NỘI TỔNG HỢP – NHI – TRUYỀN NHIỄM</strong>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 italic">
                    Ngày: <strong>{selectedDate || '........................................'}</strong>
                    {printScope === 'ZONE_1' && ` • KHU NỘI NHI`}
                    {printScope === 'ZONE_2' && ` • KHU NHIỄM`}
                    {printScope === 'BY_ROOM' && targetRoom !== 'ALL' && ` • Phòng ${targetRoom}`}
                  </p>
                </div>

                {/* 4-Column Table */}
                <div className="overflow-hidden border border-slate-900 mt-3">
                  <table className="w-full text-left text-xs border-collapse border border-slate-900">
                    <thead>
                      <tr className="bg-slate-200 text-slate-950 font-black uppercase text-[11px] border-b-2 border-slate-900">
                        <th className="py-2 px-1 text-center border-r border-slate-900 w-9">STT</th>
                        <th className="py-2 px-3 border-r border-slate-900 w-44">TÊN</th>
                        <th className="py-2 px-1 text-center border-r border-slate-900 w-12">TUỔI</th>
                        <th className="py-2 px-2 text-center border-r border-slate-900 w-28">SỐ PHÒNG</th>
                        <th className="py-2 px-3 border-r border-slate-900">THUỐC TIÊM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400">
                      {/* Section: KHU NỘI NHI */}
                      {(printScope === 'ALL' || printScope === 'ZONE_1') && (groupedBook?.khuNoiNhi || groupedBook?.khuNoiNhiPatients || []).length > 0 && (
                        <>
                          <tr className="bg-blue-100 font-black text-blue-950 text-xs border-y border-slate-900">
                            <td colSpan={5} className="py-1.5 px-3 uppercase tracking-wider">
                              🏥 KHU NỘI NHI ({(groupedBook?.khuNoiNhi || groupedBook?.khuNoiNhiPatients || []).length} người bệnh)
                            </td>
                          </tr>
                          {(groupedBook?.khuNoiNhi || groupedBook?.khuNoiNhiPatients || []).map((patient, pIdx) => (
                            <tr key={patient.patientKey} className="border-b border-slate-400">
                              <td className="py-2 px-1 text-center border-r border-slate-400 font-bold align-top">
                                {pIdx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-400 font-black text-slate-950 text-[13px] align-top">
                                {patient.patientName}
                                {patient.bed && (
                                  <div className="text-[10px] text-slate-600 font-normal">
                                    Giường: {patient.bed}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-1 text-center border-r border-slate-400 font-bold text-slate-900 align-top">
                                {patient.age || '—'}
                              </td>
                              <td className="py-2 px-2 text-center border-r border-slate-400 font-bold text-slate-900 align-top">
                                {patient.room}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-400 align-top">
                                <div className="space-y-1.5">
                                  {(patient.medications || []).map((med, mIdx) => (
                                    <div key={mIdx} className="border-b border-slate-200 pb-1.5 last:border-b-0 last:pb-0">
                                      <div className="font-black text-slate-950 text-[12px] flex items-center justify-between">
                                        <span>• {med.drugName}</span>
                                        <span className="font-mono text-blue-900 font-bold ml-2">
                                          {med.frequency}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-700 pl-3">
                                        Liều: <span className="font-semibold text-slate-900">{med.doseFormatted}</span>
                                      </div>
                                      <div className="text-[11px] text-red-700 pl-3 font-bold font-mono">
                                        Giờ y lệnh: {med.hoursText}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Section: KHU NHIỄM */}
                      {(printScope === 'ALL' || printScope === 'ZONE_2') && (groupedBook?.khuNhiem || groupedBook?.khuNhiemPatients || []).length > 0 && (
                        <>
                          <tr className="bg-amber-100 font-black text-amber-950 text-xs border-y border-slate-900">
                            <td colSpan={5} className="py-1.5 px-3 uppercase tracking-wider">
                              🩺 KHU NHIỄM ({(groupedBook?.khuNhiem || groupedBook?.khuNhiemPatients || []).length} người bệnh)
                            </td>
                          </tr>
                          {(groupedBook?.khuNhiem || groupedBook?.khuNhiemPatients || []).map((patient, pIdx) => (
                            <tr key={patient.patientKey} className="border-b border-slate-400">
                              <td className="py-2 px-1 text-center border-r border-slate-400 font-bold align-top">
                                {pIdx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-400 font-black text-slate-950 text-[13px] align-top">
                                {patient.patientName}
                                {patient.bed && (
                                  <div className="text-[10px] text-slate-600 font-normal">
                                    Giường: {patient.bed}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-1 text-center border-r border-slate-400 font-bold text-slate-900 align-top">
                                {patient.age || '—'}
                              </td>
                              <td className="py-2 px-2 text-center border-r border-slate-400 font-bold text-slate-900 align-top">
                                {patient.room}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-400 align-top">
                                <div className="space-y-1.5">
                                  {(patient.medications || []).map((med, mIdx) => (
                                    <div key={mIdx} className="border-b border-slate-200 pb-1.5 last:border-b-0 last:pb-0">
                                      <div className="font-black text-slate-950 text-[12px] flex items-center justify-between">
                                        <span>• {med.drugName}</span>
                                        <span className="font-mono text-blue-900 font-bold ml-2">
                                          {med.frequency}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-700 pl-3">
                                        Liều: <span className="font-semibold text-slate-900">{med.doseFormatted}</span>
                                      </div>
                                      <div className="text-[11px] text-red-700 pl-3 font-bold font-mono">
                                        Giờ y lệnh: {med.hoursText}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signatures */}
                {includeSignatures && (
                  <div className="mt-8 grid grid-cols-3 text-center text-xs pt-4 gap-4 print-avoid-break">
                    <div>
                      <div className="font-bold uppercase text-slate-900">ĐIỀU DƯỠNG TRƯỞNG KHOA</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-14"></div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-slate-900">ĐIỀU DƯỠNG HÀNH CHÍNH</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-14"></div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-600 italic mb-1">
                        Ngày ..... tháng ..... năm 2026
                      </div>
                      <div className="font-bold uppercase text-slate-900">ĐIỀU DƯỠNG THỰC HIỆN TIÊM</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-14"></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE 2: MATRIX NOTEBOOK */}
            {templateType === 'MATRIX_NOTEBOOK' && (
              columnChunks.map((chunkCols, pageIdx) => {
                const isLastPage = pageIdx === totalMatrixPages - 1;

                return (
                  <div
                    key={`matrix_page_${pageIdx}`}
                    className={`bg-white max-w-[297mm] mx-auto p-6 sm:p-7 shadow-lg text-slate-900 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-full ${
                      pageIdx > 0 ? 'mt-6 print:mt-0 print-page-break' : ''
                    }`}
                    style={{ minHeight: paperOrientation === 'PORTRAIT' ? '280mm' : '190mm' }}
                  >
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
                        <div>Mẫu: <strong>SỔ TIÊM MA TRẬN Ô LY</strong></div>
                        <div>
                          Trang: <strong className="text-blue-900 font-bold">{pageIdx + 1} / {totalMatrixPages}</strong>
                        </div>
                        <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>

                    <div className="text-center my-2.5">
                      <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 leading-snug">
                        SỔ THUỐC TIÊM & KHÍ DUNG (MA TRẬN Ô LY)
                      </h1>
                      <p className="text-[11px] text-slate-600 mt-0.5 italic">
                        Ngày: <strong>{selectedDate || '........................................'}</strong>
                        {printScope === 'ZONE_1' && ` • KHU NỘI NHI`}
                        {printScope === 'ZONE_2' && ` • KHU NHIỄM`}
                      </p>
                    </div>

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
                          {matrixData.rows.map((row, idx) => (
                            <tr key={row.patientKey} className="border-b border-slate-400">
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
                                      <div className="flex items-center justify-center gap-1 font-bold text-red-700 font-mono text-[9px] leading-tight">
                                        {cell.timeSlots.map((slot, sIdx) => (
                                          <span key={sIdx}>
                                            {slot}
                                            {sIdx < cell.timeSlots.length - 1 && <span className="text-slate-400 ml-0.5">-</span>}
                                          </span>
                                        ))}
                                      </div>
                                      {cell.notes && (
                                        <div className="text-[8px] text-slate-700 font-semibold leading-none">{cell.notes}</div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {includeSignatures && (isLastPage || totalMatrixPages === 1) && (
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
            )}

            {/* TEMPLATE 3: DETAILED 7-COLUMN LIST */}
            {templateType === 'DETAILED_LIST' && (
              <div
                className="bg-white max-w-[210mm] mx-auto p-6 sm:p-8 shadow-lg text-slate-900 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-full"
                style={{ minHeight: '280mm' }}
              >
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
                    <div>Mẫu: <strong>STT-01/YT (A4 ĐỨNG)</strong></div>
                    <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>

                <div className="text-center my-3">
                  <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    SỔ THUỐC TIÊM HẰNG NGÀY (CHI TIẾT 7 CỘT)
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 italic">
                    Ngày thực hiện: <strong>{selectedDate || '........................................'}</strong>
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
                          <td className="py-1.5 px-2 text-center border-r border-slate-400 font-mono font-bold text-red-700">{item.orderTime}</td>
                          <td className="py-1.5 px-2 text-center text-slate-500 text-[10px]">
                            {item.isExecuted ? '✓ Đã tiêm' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

        {/* Modal Footer Controls - Section 17 mandated button name */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded">
              ✓ Khổ in: {paperOrientation === 'LANDSCAPE' ? 'A4 Landscape (Khổ ngang)' : 'A4 Portrait (Khổ đứng)'}
            </span>
            <span>Không in menu hay thanh công cụ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              id="btn-trigger-browser-print"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              IN SỔ THUỐC TIÊM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
