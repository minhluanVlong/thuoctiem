import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Building,
  Clock,
  Pill,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PendingCheckRecord, RawRoomRecord, ProcessedInjectionRecord } from '../types/hospital';
import { buildDrugFullName } from '../utils/matchingEngine';

interface ManualMatchModalProps {
  pendingItem: PendingCheckRecord | null;
  roomRecords: RawRoomRecord[];
  onClose: () => void;
  onConfirmMatch: (resolvedInjection: ProcessedInjectionRecord, pendingId: string) => void;
}

export const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
  pendingItem,
  roomRecords,
  onClose,
  onConfirmMatch,
}) => {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBed, setSelectedBed] = useState('');
  const [orderTime, setOrderTime] = useState('');
  const [route, setRoute] = useState('IV');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (pendingItem) {
      setOrderTime(pendingItem.orderTime && pendingItem.orderTime !== 'Chưa có' ? pendingItem.orderTime : '08:00');
      setRoute(pendingItem.route || 'Tiêm tĩnh mạch');
      setNotes('');

      // If possible matches exist, prefill first match
      if (pendingItem.possibleMatches && pendingItem.possibleMatches.length > 0) {
        setSelectedRoom(pendingItem.possibleMatches[0].room);
        setSelectedBed(pendingItem.possibleMatches[0].bed || '');
      } else {
        setSelectedRoom('');
        setSelectedBed('');
      }
    }
  }, [pendingItem]);

  if (!pendingItem) return null;

  const handleSave = () => {
    if (!selectedRoom.trim()) {
      alert('Vui lòng chọn hoặc nhập số phòng bệnh.');
      return;
    }
    if (!orderTime.trim()) {
      alert('Vui lòng nhập giờ y lệnh (định dạng HH:mm, ví dụ 08:00).');
      return;
    }

    const drugFullName = buildDrugFullName(pendingItem.rawDrugRecord);

    const resolved: ProcessedInjectionRecord = {
      id: `manual-${Date.now()}`,
      stt: 0, // Will be reindexed
      patientCode: pendingItem.patientCode || 'Gán thủ công',
      medicalRecordCode: pendingItem.medicalRecordCode,
      patientName: pendingItem.patientName,
      age: pendingItem.age || '',
      gender: pendingItem.gender || '',
      room: selectedRoom.trim(),
      bed: selectedBed.trim() || 'G01',
      drugFullName,
      originalDrugName: pendingItem.drugName,
      strength: pendingItem.strength || '',
      unit: pendingItem.rawDrugRecord.unit || 'Ống',
      quantity: pendingItem.rawDrugRecord.quantity || 1,
      route: route.trim(),
      orderTime: orderTime.trim(),
      orderDate: pendingItem.orderDate || new Date().toLocaleDateString('vi-VN'),
      matchType: 'MANUAL',
      isExecuted: false,
      notes: notes.trim() || 'Đã gán phòng thủ công bởi điều dưỡng',
    };

    onConfirmMatch(resolved, pendingItem.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-teal-200" />
            <div>
              <h2 className="text-base font-bold">XỬ LÝ THỦ CÔNG Y LỆNH TIÊM</h2>
              <p className="text-xs text-teal-100">
                Gán phòng giường và bổ sung thông tin để đưa vào Sổ Thuốc Tiêm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          {/* Reason Alert */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lý do kiểm tra:</strong> {pendingItem.reason}
            </div>
          </div>

          {/* Patient Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Bệnh nhân:</span>
              <span className="font-bold text-slate-900 text-sm">{pendingItem.patientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mã BN / Bệnh án:</span>
              <span className="font-mono font-medium">{pendingItem.patientCode || pendingItem.medicalRecordCode || 'Chưa có'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Thuốc chỉ định:</span>
              <span className="font-bold text-teal-800">{pendingItem.drugName} {pendingItem.strength || ''}</span>
            </div>
          </div>

          {/* Candidates from Room List if any */}
          {pendingItem.possibleMatches && pendingItem.possibleMatches.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Chọn người bệnh từ danh sách phòng đề xuất:
              </label>
              <div className="space-y-1.5">
                {pendingItem.possibleMatches.map((cand, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedRoom(cand.room);
                      setSelectedBed(cand.bed || '');
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedRoom === cand.room && selectedBed === (cand.bed || '')
                        ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {cand.patientName} (Mã: {cand.patientCode || '—'})
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Tuổi: {cand.age || '—'} • Giới: {cand.gender || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-teal-700 text-white rounded font-bold">
                        Phòng {cand.room}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">Giường {cand.bed || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room & Bed Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Phòng / Buồng điều trị <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                placeholder="Ví dụ: P101, P202..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Giường bệnh
              </label>
              <input
                type="text"
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
                placeholder="Ví dụ: G01, G02..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Time & Route Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Giờ y lệnh (24h) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={orderTime}
                onChange={(e) => setOrderTime(e.target.value)}
                placeholder="Ví dụ: 08:00, 19:30"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs font-mono font-bold text-indigo-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Đường dùng
              </label>
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="Ví dụ: IV, Tiêm bắp, Tiêm dưới da..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Ghi chú thêm
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Bác sĩ đã xác nhận bổ sung qua điện thoại"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 rounded-lg transition-all shadow-md active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            Xác Nhận & Đưa Vào Sổ Tiêm
          </button>
        </div>
      </div>
    </div>
  );
};
