import React, { useState, useMemo } from 'react';
import {
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Layers,
  Sparkles,
  Building,
  Syringe,
  Filter,
  CheckCheck,
  RotateCcw,
  Wind,
  Droplet
} from 'lucide-react';
import { ProcessedInjectionRecord } from '../types/hospital';
import {
  buildGroupedInjectionBook,
  PatientBookEntry,
  PatientMedicationItem,
  WardListType
} from '../utils/patientBookBuilder';

interface FourColumnInjectionBookProps {
  injections: ProcessedInjectionRecord[];
  hospitalName: string;
  departmentName: string;
  selectedDate: string;
  selectedWard?: WardListType | 'ALL';
  onSelectWard?: (ward: WardListType | 'ALL') => void;
  onToggleExecution: (id: string) => void;
  onToggleSlotExecution?: (id: string, slotIndex: number) => void;
  onBatchToggleExecution?: (ids: string[], status: boolean) => void;
  onOpenPrintModal?: (zone?: WardListType | 'ALL') => void;
  onExportExcel?: () => void;
  onSwitchToMatrixView?: () => void;
}

export const FourColumnInjectionBook: React.FC<FourColumnInjectionBookProps> = ({
  injections,
  hospitalName,
  departmentName,
  selectedDate,
  selectedWard: controlledWard,
  onSelectWard,
  onToggleExecution,
  onToggleSlotExecution,
  onBatchToggleExecution,
  onOpenPrintModal,
  onExportExcel,
  onSwitchToMatrixView,
}) => {
  // Tab state: 'KHU_NOI_NHI' | 'KHU_NHIEM' | 'ALL'
  const [internalWard, setInternalWard] = useState<WardListType | 'ALL'>('KHU_NOI_NHI');
  const activeWard = controlledWard !== undefined ? controlledWard : internalWard;
  const setActiveWard = (w: WardListType | 'ALL') => {
    if (onSelectWard) onSelectWard(w);
    setInternalWard(w);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [filterExecuted, setFilterExecuted] = useState<'ALL' | 'UNEXECUTED' | 'EXECUTED'>('ALL');

  // Build the grouped book data
  const bookData = useMemo(() => {
    return buildGroupedInjectionBook(injections);
  }, [injections]);

  // Current list based on active ward
  const currentWardList = useMemo(() => {
    if (!bookData) return [];
    if (activeWard === 'KHU_NOI_NHI') {
      return bookData.khuNoiNhiPatients || [];
    } else if (activeWard === 'KHU_NHIEM') {
      return bookData.khuNhiemPatients || [];
    }
    return bookData.allPatients || [];
  }, [activeWard, bookData]);

  // Distinct rooms in current ward
  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    (currentWardList || []).forEach((p) => {
      if (p.shortRoom) set.add(p.shortRoom);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [currentWardList]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    let list = currentWardList || [];

    if (selectedRoom !== 'ALL') {
      list = list.filter((p) => p.shortRoom === selectedRoom);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.shortRoom.toLowerCase().includes(q) ||
          p.bed.toLowerCase().includes(q) ||
          (p.medications || []).some(
            (m) =>
              m.originalDrugName.toLowerCase().includes(q) ||
              m.drugFullName.toLowerCase().includes(q) ||
              (m.rawNotes && m.rawNotes.toLowerCase().includes(q))
          )
      );
    }

    if (filterExecuted === 'UNEXECUTED') {
      list = list.filter((p) => (p.medications || []).some((m) => !m.isExecuted));
    } else if (filterExecuted === 'EXECUTED') {
      list = list.filter((p) => (p.medications || []).every((m) => m.isExecuted));
    }

    return list;
  }, [currentWardList, selectedRoom, searchTerm, filterExecuted]);

  // Execution stats in current active ward
  const wardStats = useMemo(() => {
    let totalMeds = 0;
    let executedMeds = 0;
    (currentWardList || []).forEach((p) => {
      (p.medications || []).forEach((m) => {
        totalMeds++;
        if (m.isExecuted) executedMeds++;
      });
    });
    return {
      totalPatients: (currentWardList || []).length,
      totalMeds,
      executedMeds,
      percent: totalMeds > 0 ? Math.round((executedMeds / totalMeds) * 100) : 0,
    };
  }, [currentWardList]);

  // Toggle all medications for a single patient
  const handleTogglePatient = (patient: PatientBookEntry) => {
    const allDone = (patient.medications || []).every((m) => m.isExecuted);
    const newStatus = !allDone;
    const ids = (patient.medications || []).map((m) => m.id);

    if (onBatchToggleExecution) {
      onBatchToggleExecution(ids, newStatus);
    } else {
      ids.forEach((id) => onToggleExecution(id));
    }
  };

  // Batch toggle all visible in current filter
  const handleToggleAllVisible = (status: boolean) => {
    const ids: string[] = [];
    (filteredPatients || []).forEach((p) => {
      (p.medications || []).forEach((m) => {
        ids.push(m.id);
      });
    });
    if (onBatchToggleExecution && ids.length > 0) {
      onBatchToggleExecution(ids, status);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Main 2 Ward Tabs (Section 3 & 14) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="tab-khu-noi-nhi"
              onClick={() => {
                setActiveWard('KHU_NOI_NHI');
                setSelectedRoom('ALL');
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeWard === 'KHU_NOI_NHI'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>DANH SÁCH 1: KHU NỘI NHI</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeWard === 'KHU_NOI_NHI' ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800'
              }`}>
                {bookData.totalKhuNoiNhi} người bệnh
              </span>
            </button>

            <button
              id="tab-khu-nhiem"
              onClick={() => {
                setActiveWard('KHU_NHIEM');
                setSelectedRoom('ALL');
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeWard === 'KHU_NHIEM'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>DANH SÁCH 2: KHU NHIỄM</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeWard === 'KHU_NHIEM' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-800'
              }`}>
                {bookData.totalKhuNhiem} người bệnh
              </span>
            </button>

            <button
              id="tab-all-wards"
              onClick={() => {
                setActiveWard('ALL');
                setSelectedRoom('ALL');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                activeWard === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Tất cả khu ({bookData.totalPatients})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchToMatrixView && (
              <button
                id="btn-switch-matrix"
                onClick={onSwitchToMatrixView}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                title="Chuyển sang chế độ sổ ma trận ô ly từng thuốc giống như 2 ảnh chụp sổ tay"
              >
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span>Xem Sổ Ma Trận Ô Ly (Ảnh Mẫu)</span>
              </button>
            )}

            {onExportExcel && (
              <button
                id="btn-export-excel-book"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Xuất Excel 2 Sheet</span>
              </button>
            )}

            {onOpenPrintModal && (
              <button
                id="btn-print-injection-book"
                onClick={() => onOpenPrintModal(activeWard)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>IN SỔ THUỐC TIÊM (A4 NGANG)</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-filters & Quick search */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-patient-book"
                type="text"
                placeholder="Tìm người bệnh, số phòng, tên thuốc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Room Filter */}
            <select
              id="filter-room-select"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Tất cả phòng ({availableRooms.length} phòng)</option>
              {availableRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="filter-execution-status"
              value={filterExecuted}
              onChange={(e) => setFilterExecuted(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="UNEXECUTED">Chưa tiêm đủ cữ</option>
              <option value="EXECUTED">Đã tiêm hoàn tất</option>
            </select>
          </div>

          {/* Quick Batch Actions & Progress */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span>Đã thực hiện:</span>
              <strong className="text-blue-800">
                {wardStats.executedMeds}/{wardStats.totalMeds} liều ({wardStats.percent}%)
              </strong>
            </div>

            <button
              onClick={() => handleToggleAllVisible(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
              title="Đánh dấu đã tiêm cho tất cả bệnh nhân đang lọc"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Đánh dấu tất cả</span>
            </button>

            <button
              onClick={() => handleToggleAllVisible(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
              title="Bỏ đánh dấu toàn bộ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bỏ chọn</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary 4-Column Table (Notebook Style) */}
      <div className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden">
        {/* Banner Header imitating Hospital Notebook */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
              {hospitalName}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide flex items-center gap-2">
              <span>SỔ THUỐC TIÊM – {activeWard === 'KHU_NHIEM' ? 'KHU NHIỄM' : activeWard === 'KHU_NOI_NHI' ? 'KHU NỘI NHI' : 'TOÀN KHOA'}</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-blue-800 text-blue-100 border border-blue-700">
                Biểu mẫu 4 cột chuẩn điều dưỡng
              </span>
            </h2>
            <div className="text-xs text-blue-200 mt-0.5 flex items-center gap-3">
              <span>Ngày y lệnh: <strong className="text-white font-mono">{selectedDate || 'Dữ liệu Excel'}</strong></span>
              <span>•</span>
              <span>Tổng số: <strong className="text-white">{filteredPatients.length} người bệnh</strong></span>
            </div>
          </div>

          <div className="text-right text-[11px] text-blue-200 hidden sm:block">
            <div className="font-semibold text-white">Quy chuẩn ghi sổ:</div>
            <div>Mỗi người bệnh 1 dòng • Gom toàn bộ thuốc tiêm</div>
            <div>Xếp theo phòng tăng dần • Trong phòng xếp theo giường</div>
          </div>
        </div>

        {/* Warning Banner if any duplicates or ambiguities detected (Section 11 & 12) */}
        {bookData.validationWarnings.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">CẢNH BÁO AN TOÀN Y LỆNH:</span> Phát hiện {bookData.validationWarnings.length} trường hợp cần kiểm tra dữ liệu gốc (trùng tên hoặc mâu thuẫn ghi chú). Hệ thống đã đánh dấu thẻ cảnh báo để tránh nhầm thuốc.
            </div>
          </div>
        )}

        {/* Main 4-Column Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }}>
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-xs font-extrabold uppercase tracking-wider divide-x divide-slate-300">
                <th className="py-3 px-3 text-center w-12 bg-slate-200/80">STT</th>
                <th className="py-3 px-4 w-[24%] min-w-[200px]">TÊN</th>
                <th className="py-3 px-3 text-center w-20 min-w-[70px]">TUỔI</th>
                <th className="py-3 px-4 w-[22%] min-w-[170px]">SỐ PHÒNG</th>
                <th className="py-3 px-5 min-w-[380px]">THUỐC TIÊM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-xs">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">Không tìm thấy người bệnh nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chọn phòng khác.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, pIdx) => {
                  const isAllDone = patient.isAllExecuted;

                  return (
                    <tr
                      key={patient.patientKey}
                      className={`hover:bg-blue-50/30 transition-colors divide-x divide-slate-200 ${
                        patient.hasWarning ? 'bg-amber-50/30' : pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* 0. STT */}
                      <td className="py-3 px-2.5 text-center text-slate-500 font-medium align-top">
                        <div className="font-mono text-xs text-slate-600 font-bold">{pIdx + 1}</div>
                        <button
                          onClick={() => handleTogglePatient(patient)}
                          className="mt-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title={isAllDone ? 'Đánh dấu chưa tiêm' : 'Đánh dấu đã tiêm hết thuốc'}
                        >
                          {isAllDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* 1. CỘT: TÊN */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`font-bold text-sm tracking-tight cursor-pointer ${
                              isAllDone
                                ? 'text-slate-500 line-through decoration-emerald-600 decoration-2'
                                : 'text-slate-900'
                            }`}
                            onClick={() => handleTogglePatient(patient)}
                            title="Bấm để đánh dấu hoàn thành tiêm"
                          >
                            {patient.patientName}
                          </span>
                        </div>

                        {patient.isPediatric && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 text-[10px] font-bold bg-pink-100 text-pink-700 rounded border border-pink-200">
                            Bệnh nhi
                          </span>
                        )}

                        {patient.gender && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Giới tính: {patient.gender}
                          </div>
                        )}

                        {patient.hasWarning && (
                          <div className="mt-1.5 p-1 bg-amber-100 border border-amber-300 rounded text-[10px] text-amber-900 font-medium">
                            {patient.warningMessage}
                          </div>
                        )}
                      </td>

                      {/* 2. CỘT: TUỔI */}
                      <td className="py-3 px-3 text-center align-top">
                        <div className="font-bold text-sm text-slate-800">
                          {patient.age || '—'}
                        </div>
                        {patient.dob && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {patient.dob}
                          </div>
                        )}
                      </td>

                      {/* 3. CỘT: SỐ PHÒNG */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{patient.shortRoom}</span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1">
                          {patient.wardListTitle === 'KHU_NHIEM' ? (
                            <span className="text-amber-800 font-semibold">Khu Truyền Nhiễm</span>
                          ) : (
                            <span className="text-blue-800 font-semibold">Khu Nội - Nhi</span>
                          )}
                        </div>

                        {/* Internal Bed (Section 2 & 15: Bed used for sorting & preventing confusion) */}
                        <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                          {patient.bed}
                        </div>
                      </td>

                      {/* 4. CỘT: THUỐC TIÊM (Gom toàn bộ thuốc của bệnh nhân) */}
                      <td className="py-3 px-5 align-top">
                        <div className="space-y-3">
                          {patient.medications.map((med, mIdx) => {
                            const isDone = !!med.isExecuted;

                            return (
                              <div
                                key={med.id}
                                className={`p-2.5 rounded-lg border transition-all ${
                                  isDone
                                    ? 'bg-slate-50 border-slate-200 opacity-75'
                                    : med.isAerosol
                                    ? 'bg-teal-50/50 border-teal-200'
                                    : med.isInsulin
                                    ? 'bg-purple-50/50 border-purple-200'
                                    : 'bg-white border-slate-200 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {/* Drug Info Lines */}
                                  <div className="flex-1">
                                    {/* Line 1: Tên thuốc gốc chính xác từ Excel (Section 5) */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`font-bold text-xs ${
                                          isDone
                                            ? 'text-slate-500 line-through'
                                            : 'text-slate-900'
                                        }`}
                                      >
                                        {med.originalDrugName}
                                      </span>

                                      {/* Category Badge */}
                                      {med.isAerosol ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                          <Wind className="w-3 h-3" />
                                          PKD
                                        </span>
                                      ) : med.isInsulin ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                          <Droplet className="w-3 h-3" />
                                          Insulin
                                        </span>
                                      ) : med.priorityOrder === 1 ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                          Kháng sinh
                                        </span>
                                      ) : null}
                                    </div>

                                    {/* Line 2: Dung môi pha / Liều lượng & Đường dùng (Section 6 & 22) */}
                                    <div className="text-xs font-semibold text-slate-800 mt-1">
                                      {med.dosageAndSolventText}
                                    </div>

                                    {/* Line 3: Số lần dùng trong ngày (1 x 2, 1 x 3, 1 x 1) (Section 7 & 21) */}
                                    {!med.isInsulin && (
                                      <div className="text-xs font-bold text-blue-900 mt-0.5">
                                        {med.frequencyText}
                                      </div>
                                    )}

                                    {/* Line 4: Giờ y lệnh thực tế (Mực đỏ nổi bật giống sổ tay) (Section 7 & 8) */}
                                    <div className="text-xs font-extrabold font-mono text-rose-600 mt-0.5 flex items-center gap-1.5">
                                      <span>{med.timeScheduleText}</span>
                                    </div>

                                    {/* Warning if review needed */}
                                    {med.needsReview && (
                                      <div className="mt-1 text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        <span>{med.reviewReason}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Execution Checkbox for this specific drug */}
                                  <div className="shrink-0 flex items-center gap-1">
                                    <button
                                      onClick={() => onToggleExecution(med.id)}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                      title={isDone ? 'Đánh dấu chưa tiêm' : 'Đánh dấu đã tiêm thuốc này'}
                                    >
                                      {isDone ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div>
            Hiển thị <strong>{filteredPatients.length}</strong> / {currentWardList.length} người bệnh ({activeWard === 'KHU_NHIEM' ? 'Khu Nhiễm' : activeWard === 'KHU_NOI_NHI' ? 'Khu Nội Nhi' : 'Toàn khoa'}).
          </div>
          <div className="flex items-center gap-3">
            <span>Tiêu chuẩn an toàn: <strong>Khóa người bệnh theo Họ tên + Ngày sinh + Phòng + Giường</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
