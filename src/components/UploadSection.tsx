import React, { useRef } from 'react';
import {
  Upload,
  FileCheck,
  Download,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Pill,
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { ColumnMappingPreview } from '../types/hospital';
import { downloadSampleDrugExcel } from '../data/sampleHospitalData';

interface UploadSectionProps {
  drugFilePreview: ColumnMappingPreview | null;
  onUploadDrugFile: (file: File) => void;
  onProcessData: () => void;
  onLoadSampleData: () => void;
  isProcessing: boolean;
  hasData: boolean;
  totalDrugRecords: number;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  drugFilePreview,
  onUploadDrugFile,
  onProcessData,
  onLoadSampleData,
  isProcessing,
  hasData,
  totalDrugRecords,
}) => {
  const drugInputRef = useRef<HTMLInputElement>(null);

  const handleDrugDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadDrugFile(e.dataTransfer.files[0]);
    }
  };

  const isReadyToProcess = totalDrugRecords > 0;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-slate-50/90 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              NHẬP FILE EXCEL THỐNG KÊ TRUYỀN DỊCH, THUỐC TIÊM & INSULIN
            </h2>
            <p className="text-xs text-slate-500">
              Hệ thống tự động bóc tách Buồng, Giường, Tuổi/Tháng tuổi, Tên thuốc, Ghi chú & Giờ y lệnh trực tiếp từ file HIS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <button
            type="button"
            onClick={onLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-medium transition-colors cursor-pointer"
            title="Nạp dữ liệu thực tế mẫu 90 dòng BV Đa Khoa KV Chợ Lách để xem thử"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Nạp dữ liệu mẫu BV Chợ Lách
          </button>
          <div className="hidden sm:flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Xử lý 100% nội bộ trên trình duyệt</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* SINGLE FOCUSED DROPZONE */}
        <div
          id="dropzone-drug-file"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrugDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all p-6 ${
            drugFilePreview
              ? 'border-emerald-400 bg-emerald-50/20'
              : 'border-slate-300 hover:border-teal-500 bg-slate-50/40 hover:bg-slate-50/80'
          }`}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 w-full">
              {/* Card Title & Icon */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${drugFilePreview ? 'bg-emerald-600 text-white shadow-xs' : 'bg-teal-100 text-teal-800'}`}>
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      FILE EXCEL XUẤT TỪ PHẦN MỀM BỆNH VIỆN (HIS)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bao gồm các cột: Họ tên người bệnh, Giới tính, Ngày sinh, Địa chỉ, Khoa Buồng - Giường, Thuốc, Ghi chú, Tờ điều trị, Loại, Thời gian y lệnh,...
                    </p>
                  </div>
                </div>

                {drugFilePreview && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã đọc {totalDrugRecords} y lệnh
                  </span>
                )}
              </div>

              {/* Status & Preview Details */}
              {drugFilePreview ? (
                <div className="bg-white rounded-lg p-4 border border-emerald-200 text-xs space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between font-medium text-slate-800 border-b border-slate-100 pb-2">
                    <span className="truncate max-w-[320px] font-semibold text-slate-900 flex items-center gap-1.5" title={drugFilePreview.fileName}>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      {drugFilePreview.fileName}
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {totalDrugRecords} dòng dữ liệu
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Các cột đã tự động nhận diện:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(drugFilePreview.detectedHeaders).map(([key, colName]) => (
                        <span
                          key={key}
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-md text-[11px] font-medium"
                          title={`Trường "${key}" khớp với cột "${colName}" trong file`}
                        >
                          ✓ {colName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {drugFilePreview.missingRequired.length > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 p-2.5 rounded-md border border-amber-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Lưu ý: Chưa tìm thấy cột {drugFilePreview.missingRequired.join(', ')} (Hệ thống sẽ thử quét tự động)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5 border border-dashed border-slate-200 rounded-lg bg-white/60">
                  <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Kéo thả file Excel (.xlsx / .xls) vào đây hoặc bấm nút bên dưới
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Không cần chỉnh sửa hay đổi tên cột, hệ thống hỗ trợ định dạng xuất trực tiếp từ HIS
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions inside dropzone */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/80 mt-4">
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

            <div className="flex items-center gap-2.5">
              <button
                id="btn-select-drug-file"
                type="button"
                onClick={() => drugInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {drugFilePreview ? 'Chọn file Excel khác' : 'Tải file Excel thống kê'}
              </button>

              <button
                id="btn-download-sample-drug"
                type="button"
                onClick={downloadSampleDrugExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                Tải file mẫu Excel (.xlsx)
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1">
              <span>Định dạng hỗ trợ:</span>
              <span className="font-semibold text-slate-700">.xlsx, .xls</span>
            </div>
          </div>
        </div>

        {/* Process Button Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">Quy tắc tự động:</span>
            {' '}Trích xuất Buồng - Giường → Lấy Tuổi/Tháng tuổi → Lọc thuốc tiêm & Insulin → So sánh đối chiếu y lệnh hôm qua → Xuất sổ tiêm theo chuẩn mẫu Bộ Y Tế.
          </div>

          <button
            id="btn-process-data"
            disabled={!isReadyToProcess || isProcessing}
            onClick={onProcessData}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md ${
              isReadyToProcess
                ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer active:scale-98 ring-4 ring-teal-500/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>ĐANG XỬ LÝ & BÓC TÁCH DỮ LIỆU...</span>
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
