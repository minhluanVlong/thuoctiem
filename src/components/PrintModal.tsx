import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  Building,
  Clock,
  User,
  Layers,
  FileText,
  Check
} from 'lucide-react';
import { ProcessedInjectionRecord } from '../types/hospital';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  injections: ProcessedInjectionRecord[];
  hospitalName: string;
  departmentName: string;
  selectedDate: string;
}

export type PrintScope = 'ALL' | 'BY_ROOM' | 'BY_PATIENT' | 'BY_SHIFT';

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  injections,
  hospitalName,
  departmentName,
  selectedDate,
}) => {
  const [printScope, setPrintScope] = useState<PrintScope>('ALL');
  const [targetRoom, setTargetRoom] = useState<string>('ALL');
  const [targetShift, setTargetShift] = useState<string>('ALL');
  const [targetPatient, setTargetPatient] = useState<string>('ALL');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

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

  // Filtered List for Printing
  const printableList = useMemo(() => {
    let list = [...injections];

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

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold">IN SỔ THUỐC TIÊM (CHUẨN KHỔ A4)</h2>
              <p className="text-xs text-slate-300">
                Tùy chọn in toàn khoa, từng buồng phòng, từng bệnh nhân hoặc theo ca trực
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Config Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Print Scope Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700 mr-1">Chế độ in:</span>
            <button
              onClick={() => setPrintScope('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                printScope === 'ALL'
                  ? 'bg-teal-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Toàn bộ khoa ({injections.length})
            </button>
            <button
              onClick={() => setPrintScope('BY_ROOM')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                printScope === 'BY_ROOM'
                  ? 'bg-teal-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo từng phòng
            </button>
            <button
              onClick={() => setPrintScope('BY_SHIFT')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                printScope === 'BY_SHIFT'
                  ? 'bg-teal-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo ca trực
            </button>
            <button
              onClick={() => setPrintScope('BY_PATIENT')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                printScope === 'BY_PATIENT'
                  ? 'bg-teal-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Theo bệnh nhân
            </button>
          </div>

          {/* Conditional Dropdown for Selected Scope */}
          <div className="flex items-center gap-2">
            {printScope === 'BY_ROOM' && (
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none"
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
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none"
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
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none max-w-[200px]"
              >
                <option value="ALL">Tất cả bệnh nhân</option>
                {patientList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
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
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/60">
          <div
            id="printable-area"
            className="bg-white max-w-4xl mx-auto p-8 sm:p-10 shadow-lg text-slate-900 print:shadow-none print:p-0 print:m-0 print:max-w-full font-serif"
          >
            {/* Hospital Print Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <div className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                  {hospitalName || 'SỞ Y TẾ / BỆNH VIỆN ĐA KHOA'}
                </div>
                <div className="text-xs font-bold text-slate-900 uppercase">
                  {departmentName || 'KHOA NỘI TỔNG HỢP'}
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-600">
                <div>Mẫu số: <strong>STT-01/YT</strong></div>
                <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-5">
              <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900 font-sans">
                SỔ THUỐC TIÊM HẰNG NGÀY
              </h1>
              <p className="text-xs font-serif text-slate-600 mt-1 italic">
                Ngày thực hiện y lệnh: <strong>{selectedDate || new Date().toLocaleDateString('vi-VN')}</strong>
                {printScope === 'BY_ROOM' && targetRoom !== 'ALL' && ` • Buồng phòng: ${targetRoom}`}
                {printScope === 'BY_SHIFT' && targetShift !== 'ALL' && ` • Khung giờ: ${targetShift}`}
              </p>
            </div>

            {/* Printable Table: 7 exact user columns */}
            <div className="overflow-hidden border border-slate-900 mt-4">
              <table className="w-full text-left text-xs border-collapse border border-slate-900 font-sans">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold uppercase text-[11px] border-b border-slate-900">
                    <th className="py-2 px-2 text-center border-r border-slate-900 w-10">STT</th>
                    <th className="py-2 px-3 border-r border-slate-900">Tên Người Bệnh</th>
                    <th className="py-2 px-2 text-center border-r border-slate-900 w-14">Tuổi</th>
                    <th className="py-2 px-2 text-center border-r border-slate-900 w-28">Phòng (Khu - Buồng)</th>
                    <th className="py-2 px-3 border-r border-slate-900">Tên Thuốc & Hàm Lượng</th>
                    <th className="py-2 px-3 border-r border-slate-900">Ghi Chú (Đường dùng / Dặn dò)</th>
                    <th className="py-2 px-2 text-center border-r border-slate-900 w-20">Thời Gian Y Lệnh</th>
                    <th className="py-2 px-2 text-center w-20">ĐD Ký Thực Hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {printableList.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-400">
                      <td className="py-2 px-2 text-center border-r border-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-slate-400 font-bold text-slate-900">
                        {item.patientName}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-400 font-medium">
                        {item.age || '—'}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-400 font-bold text-slate-800">
                        {item.room}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-400 font-medium">
                        {item.drugFullName}
                        {item.quantity && (
                          <span className="text-slate-700 text-[10px] ml-1 font-semibold">
                            ({item.quantity} {item.unit})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-400 text-slate-700 text-[11px]">
                        {item.notes || (item.route ? `Đường dùng: ${item.route}` : '—')}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-400 font-mono font-bold text-slate-900">
                        {item.orderTime}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-[10px]">
                        {item.isExecuted ? '✓ Đã tiêm' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total count summary */}
            <div className="mt-3 text-xs text-slate-600 font-sans flex justify-between">
              <span>Tổng số lượt tiêm: <strong>{printableList.length}</strong> lượt</span>
              <span>Tổng số người bệnh: <strong>{new Set(printableList.map(i => i.patientName)).size}</strong> người</span>
            </div>

            {/* Signatures */}
            {includeSignatures && (
              <div className="mt-12 grid grid-cols-3 text-center text-xs font-serif pt-4 gap-4">
                <div>
                  <div className="font-bold uppercase text-slate-800">ĐIỀU DƯỠNG TRƯỞNG KHOA</div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-800">ĐIỀU DƯỠNG HÀNH CHÍNH</div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-600 italic mb-1">
                    Ngày ..... tháng ..... năm 2026
                  </div>
                  <div className="font-bold uppercase text-slate-800">ĐIỀU DƯỠNG THỰC HIỆN TIÊM</div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Khuyến nghị: Chọn máy in khổ <strong>A4</strong>, định dạng <strong>Dọc (Portrait)</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 rounded-lg transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" />
              In Bản Này (A4 / PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
