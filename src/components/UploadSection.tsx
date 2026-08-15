import React, { useRef } from 'react';
import {
  Upload,
  FileCheck,
  FileSpreadsheet,
  Download,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ListFilter,
  Users,
  Pill
} from 'lucide-react';
import { ColumnMappingPreview, RawDrugRecord, RawRoomRecord } from '../types/hospital';
import { downloadSampleDrugExcel, downloadSampleRoomExcel } from '../data/sampleHospitalData';

interface UploadSectionProps {
  drugFilePreview: ColumnMappingPreview | null;
  roomFilePreview: ColumnMappingPreview | null;
  onUploadDrugFile: (file: File) => void;
  onUploadRoomFile: (file: File) => void;
  onProcessData: () => void;
  isProcessing: boolean;
  hasData: boolean;
  totalDrugRecords: number;
  totalRoomRecords: number;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  drugFilePreview,
  roomFilePreview,
  onUploadDrugFile,
  onUploadRoomFile,
  onProcessData,
  isProcessing,
  hasData,
  totalDrugRecords,
  totalRoomRecords,
}) => {
  const drugInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);

  const handleDrugDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadDrugFile(e.dataTransfer.files[0]);
    }
  };

  const handleRoomDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadRoomFile(e.dataTransfer.files[0]);
    }
  };

  const isReadyToProcess = totalDrugRecords > 0 && totalRoomRecords > 0;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
      {/* Step Guide Header */}
      <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
            1
          </span>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            KHU VỰC TẢI DỮ LIỆU EXCEL TỪ PHẦN MỀM BỆNH VIỆN
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tự động nhận diện cột gần đúng • Xử lý an toàn 100% trên trình duyệt</span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FILE 1: Drug & Infusion Order List */}
          <div
            id="dropzone-drug-file"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrugDrop}
            className={`relative rounded-xl border-2 border-dashed transition-all p-5 flex flex-col justify-between ${
              drugFilePreview
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-300 hover:border-teal-400 bg-slate-50/40 hover:bg-slate-50/80'
            }`}
          >
            <div>
              {/* Card Title & Icon */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${drugFilePreview ? 'bg-emerald-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      FILE 1 – THỐNG KÊ THUỐC TIÊM / TRUYỀN DỊCH
                    </h3>
                    <p className="text-xs text-slate-500">
                      Xuất từ phần mềm quản lý bệnh viện (HIS / EMR)
                    </p>
                  </div>
                </div>

                {drugFilePreview && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã tải {totalDrugRecords} dòng
                  </span>
                )}
              </div>

              {/* Status or Upload Prompt */}
              {drugFilePreview ? (
                <div className="bg-white rounded-lg p-3.5 border border-emerald-200 text-xs mb-3 space-y-2">
                  <div className="flex items-center justify-between font-medium text-slate-700 border-b border-slate-100 pb-1.5">
                    <span className="truncate max-w-[200px]" title={drugFilePreview.fileName}>
                      📄 {drugFilePreview.fileName}
                    </span>
                    <span className="text-emerald-700 font-bold">{totalDrugRecords} y lệnh</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Cột nhận diện tự động:</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(drugFilePreview.detectedHeaders).map(([key, colName]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px]"
                          title={`Khớp cột "${colName}" cho trường ${key}`}
                        >
                          ✓ {colName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {drugFilePreview.missingRequired.length > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 p-2 rounded">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cảnh báo: Chưa tìm thấy {drugFilePreview.missingRequired.join(', ')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">
                    Kéo thả file Excel vào đây hoặc bấm để chọn file
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Định dạng hỗ trợ: .xlsx, .xls (Không cần đổi tên cột)
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-2">
              <input
                ref={drugInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUploadDrugFile(e.target.files[0]);
                  }
                }}
              />

              <button
                id="btn-select-drug-file"
                type="button"
                onClick={() => drugInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                {drugFilePreview ? 'Chọn file khác' : '+ Tải file thuốc tiêm/truyền'}
              </button>

              <button
                id="btn-download-sample-drug"
                type="button"
                onClick={downloadSampleDrugExcel}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-700 underline decoration-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file mẫu HIS (.xlsx)
              </button>
            </div>
          </div>

          {/* FILE 2: Inpatient Room & Bed List */}
          <div
            id="dropzone-room-file"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleRoomDrop}
            className={`relative rounded-xl border-2 border-dashed transition-all p-5 flex flex-col justify-between ${
              roomFilePreview
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-300 hover:border-teal-400 bg-slate-50/40 hover:bg-slate-50/80'
            }`}
          >
            <div>
              {/* Card Title & Icon */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${roomFilePreview ? 'bg-emerald-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      FILE 2 – DANH SÁCH BỆNH NHÂN THEO PHÒNG
                    </h3>
                    <p className="text-xs text-slate-500">
                      Danh sách người bệnh đang điều trị nội trú (Phòng, Giường)
                    </p>
                  </div>
                </div>

                {roomFilePreview && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã tải {totalRoomRecords} bệnh nhân
                  </span>
                )}
              </div>

              {/* Status or Upload Prompt */}
              {roomFilePreview ? (
                <div className="bg-white rounded-lg p-3.5 border border-emerald-200 text-xs mb-3 space-y-2">
                  <div className="flex items-center justify-between font-medium text-slate-700 border-b border-slate-100 pb-1.5">
                    <span className="truncate max-w-[200px]" title={roomFilePreview.fileName}>
                      📄 {roomFilePreview.fileName}
                    </span>
                    <span className="text-emerald-700 font-bold">{totalRoomRecords} người bệnh</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Cột nhận diện tự động:</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(roomFilePreview.detectedHeaders).map(([key, colName]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px]"
                          title={`Khớp cột "${colName}" cho trường ${key}`}
                        >
                          ✓ {colName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {roomFilePreview.missingRequired.length > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 p-2 rounded">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cảnh báo: Chưa tìm thấy {roomFilePreview.missingRequired.join(', ')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">
                    Kéo thả file danh sách phòng vào đây hoặc bấm để chọn
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Cần các cột: Họ tên/Mã BN, Phòng, Giường, Tuổi,...
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-2">
              <input
                ref={roomInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUploadRoomFile(e.target.files[0]);
                  }
                }}
              />

              <button
                id="btn-select-room-file"
                type="button"
                onClick={() => roomInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                {roomFilePreview ? 'Chọn file khác' : '+ Tải danh sách phòng/giường'}
              </button>

              <button
                id="btn-download-sample-room"
                type="button"
                onClick={downloadSampleRoomExcel}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-700 underline decoration-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file mẫu Phòng (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* Process Button Bar (Khu vực 2: Xử lý dữ liệu) */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Quy trình tự động:</span> Đối chiếu mã BN / Tên chính xác → Ghép Phòng Giường → Lọc thuốc tiêm → Loại dịch truyền & vật tư y tế → Giữ nguyên 24h & tên thuốc gốc.
          </div>

          <button
            id="btn-process-data"
            disabled={!isReadyToProcess || isProcessing}
            onClick={onProcessData}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md ${
              isReadyToProcess
                ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer active:scale-98 animate-pulse hover:animate-none ring-4 ring-teal-500/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ĐANG ĐỐI CHIẾU DỮ LIỆU...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-5 h-5" />
                <span>XỬ LÝ DỮ LIỆU & TẠO SỔ TIÊM</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
