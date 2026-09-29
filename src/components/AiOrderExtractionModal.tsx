import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  FileCode,
  Copy,
  Check,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import {
  MatrixJsonFormat,
  SAMPLE_MATRIX_JSON,
  convertMatrixJsonToInjections,
  convertInjectionsToMatrixJson
} from '../types/matrixJson';
import { ProcessedInjectionRecord } from '../types/hospital';

interface AiOrderExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMatrixJson: (matrixJson: MatrixJsonFormat) => void;
  currentInjections: ProcessedInjectionRecord[];
}

export const AiOrderExtractionModal: React.FC<AiOrderExtractionModalProps> = ({
  isOpen,
  onClose,
  onApplyMatrixJson,
  currentInjections
}) => {
  const [activeTab, setActiveTab] = useState<'IMAGE_OCR' | 'JSON_INPUT' | 'JSON_EXPORT'>('IMAGE_OCR');
  
  // Image Upload State
  const [selectedImages, setSelectedImages] = useState<{ id: string; name: string; dataUrl: string; mimeType: string }[]>([]);
  const [supplementalText, setSupplementalText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<MatrixJsonFormat | null>(null);

  // JSON Input State
  const [jsonInputText, setJsonInputText] = useState<string>(() => JSON.stringify(SAMPLE_MATRIX_JSON, null, 2));
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard paste listener for images
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setSelectedImages((prev) => [
                  ...prev,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    name: `Ảnh dán clipboard (${new Date().toLocaleTimeString()})`,
                    dataUrl,
                    mimeType: blob.type || 'image/png',
                  },
                ]);
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle files selected via file dialog or drop
  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setSelectedImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            dataUrl,
            mimeType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Run AI Extraction via backend proxy `/api/extract-matrix`
  const handleRunAiExtraction = async () => {
    if (selectedImages.length === 0 && !supplementalText.trim()) {
      setExtractionError('Vui lòng chọn ít nhất 1 ảnh y lệnh hoặc dán nội dung báo cáo y lệnh.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const payloadImages = selectedImages.map((img) => ({
        data: img.dataUrl.includes('base64,') ? img.dataUrl.split('base64,')[1] : img.dataUrl,
        mimeType: img.mimeType || 'image/jpeg',
      }));

      const response = await fetch('/api/extract-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: payloadImages,
          text: supplementalText,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Máy chủ không thể bóc tách dữ liệu');
      }

      setExtractedPreview(result.data);
      setJsonInputText(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      console.warn('AI Extraction server request failed, offering fallback demo data:', err);
      setExtractionError(`Chưa thể gọi AI trích xuất: ${err.message}. Bạn có thể bấm "Nạp Dữ Liệu Mẫu Chuẩn" bên dưới để xem thử ma trận.`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Apply JSON to App
  const handleApplyJson = () => {
    try {
      const parsed: MatrixJsonFormat = JSON.parse(jsonInputText);
      if (!parsed.du_lieu_benh_nhan || !Array.isArray(parsed.du_lieu_benh_nhan)) {
        throw new Error('Dữ liệu JSON thiếu mảng "du_lieu_benh_nhan"');
      }
      onApplyMatrixJson(parsed);
      onClose();
    } catch (err: any) {
      setJsonParseError(`Lỗi cú pháp JSON: ${err.message}`);
    }
  };

  // Apply Extracted Preview to App
  const handleApplyExtractedPreview = () => {
    if (extractedPreview) {
      onApplyMatrixJson(extractedPreview);
      onClose();
    }
  };

  // Load standard Sample Demo Dataset
  const handleLoadSampleDemo = () => {
    setExtractedPreview(SAMPLE_MATRIX_JSON);
    setJsonInputText(JSON.stringify(SAMPLE_MATRIX_JSON, null, 2));
    setExtractionError(null);
  };

  // Current Injections as JSON
  const currentJsonData = convertInjectionsToMatrixJson(currentInjections);
  const currentJsonString = JSON.stringify(currentJsonData, null, 2);

  const handleCopyCurrentJson = () => {
    navigator.clipboard.writeText(currentJsonString);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleDownloadCurrentJson = () => {
    const blob = new Blob([currentJsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `so_thuoc_tiem_ma_tran_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600/60 border border-teal-400/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                TRỢ LÝ AI: BÓC TÁCH MA TRẬN Y LỆNH TỪ HÌNH ẢNH (GEMINI VISION)
              </h2>
              <p className="text-xs text-teal-200">
                Chuyển đổi hình ảnh báo cáo y lệnh thành "SỔ THUỐC TIÊM & KHÍ DUNG (MA TRẬN Ô LY)" chuẩn xác 100%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('IMAGE_OCR')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'IMAGE_OCR'
                ? 'border-teal-700 text-teal-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>1. Tải ảnh y lệnh / Chụp ảnh</span>
            {selectedImages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px]">
                {selectedImages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('JSON_INPUT')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'JSON_INPUT'
                ? 'border-teal-700 text-teal-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>2. Nhập / Dán JSON Ma trận</span>
          </button>

          <button
            onClick={() => setActiveTab('JSON_EXPORT')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'JSON_EXPORT'
                ? 'border-teal-700 text-teal-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>3. Xuất JSON Ma trận hiện tại</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: IMAGE OCR & GEMINI VISION */}
          {activeTab === 'IMAGE_OCR' && (
            <div className="space-y-4">
              {/* Guidelines reminder card */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  Quy tắc bóc tách y lệnh ma trận tự động:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-teal-900/90">
                  <li><strong>Cột động không giới hạn:</strong> Tự động quét và tạo cột riêng cho mọi loại thuốc (kể cả Esogas, Omevin, Vinsamol, Zensonide,...).</li>
                  <li><strong>Thuốc Phun khí dung (Vinsamol & Zensonide):</strong> Kiểm tra đếm đủ số lượt trong ngày (1 lần, 2 lần, 3 lần hoặc hơn), mốc giờ thực hiện, ghi chú rõ nếu dùng kèm.</li>
                  <li><strong>3 Dòng ô giao nhau:</strong> Dòng 1: Liều lượng / Số lần (1 x 3, 2/3,...), Dòng 2: Mốc giờ (07:15 - 15:15 - 23:15), Dòng 3: Chi tiết nguyên văn tên thuốc & dung môi.</li>
                </ul>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 hover:border-teal-600 bg-teal-50/30 hover:bg-teal-50/60 rounded-xl p-6 text-center cursor-pointer transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  className="hidden"
                />
                <div className="flex justify-center items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Kéo thả ảnh y lệnh vào đây hoặc nhấp để chọn tệp từ máy
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  💡 <strong>Mẹo:</strong> Bạn cũng có thể bấm <strong>Ctrl + V</strong> để dán ảnh chụp màn hình trực tiếp từ clipboard!
                </p>
              </div>

              {/* Thumbnails of selected images */}
              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Đã chọn ({selectedImages.length} ảnh):</span>
                    <button
                      type="button"
                      onClick={() => setSelectedImages([])}
                      className="text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 group shadow-xs"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                          title="Xóa ảnh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="p-1 text-[10px] text-slate-700 truncate font-mono bg-white">
                          {img.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplemental text input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú hoặc văn bản kèm theo (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={supplementalText}
                  onChange={(e) => setSupplementalText(e.target.value)}
                  placeholder="Nhập bổ sung thông tin phòng buồng, dặn dò hoặc nội dung y lệnh nếu ảnh bị mờ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-600 focus:bg-white text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLoadSampleDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Nạp dữ liệu mẫu y lệnh chuẩn (Test ngay)
                </button>

                <button
                  type="button"
                  disabled={isExtracting || (selectedImages.length === 0 && !supplementalText.trim())}
                  onClick={handleRunAiExtraction}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isExtracting || (selectedImages.length === 0 && !supplementalText.trim())
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20'
                  }`}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang bóc tách bằng AI Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Bóc tách Ma Trận bằng AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error display */}
              {extractionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div>{extractionError}</div>
                  </div>
                </div>
              )}

              {/* Extracted Preview Card */}
              {extractedPreview && (
                <div className="border border-emerald-300 bg-emerald-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Đã bóc tách thành công: {extractedPreview.du_lieu_benh_nhan.length} người bệnh, {extractedPreview.danh_sach_cot_thuoc.length} cột thuốc</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyExtractedPreview}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <span>Nạp vào Sổ Ma trận</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary of columns */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {extractedPreview.danh_sach_cot_thuoc.map((col) => (
                      <span
                        key={col.ma}
                        className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-slate-800 font-semibold"
                      >
                        {col.ten_hien_thi} ({col.duong_dung})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: JSON INPUT / PASTE */}
          {activeTab === 'JSON_INPUT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    DÁN HOẶC CHỈNH SỬA JSON MA TRẬN Y LỆNH:
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Định dạng bao gồm <code>danh_sach_cot_thuoc</code> và <code>du_lieu_benh_nhan</code> với các mốc giờ và chi tiết y lệnh
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setJsonInputText(JSON.stringify(SAMPLE_MATRIX_JSON, null, 2))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Mẫu chuẩn
                </button>
              </div>

              <textarea
                rows={14}
                value={jsonInputText}
                onChange={(e) => {
                  setJsonInputText(e.target.value);
                  setJsonParseError(null);
                }}
                className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
              />

              {jsonParseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{jsonParseError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Nạp vào Bảng Ma trận & Sổ 4 Cột
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: JSON EXPORT */}
          {activeTab === 'JSON_EXPORT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    DỮ LIỆU HIỆN TẠI DƯỚI ĐỊNH DẠNG JSON CHUẨN MA TRẬN:
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bao gồm {currentInjections.length} y lệnh đang có trên ứng dụng
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCurrentJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {copiedStatus ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Sao chép JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCurrentJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-700" />
                    <span>Tải file .json</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={14}
                value={currentJsonString}
                className="w-full p-3 font-mono text-[11px] bg-slate-900 text-teal-300 rounded-xl border border-slate-700 outline-none select-all"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
