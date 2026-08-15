/**
 * Types and interfaces for Sổ Thuốc Tiêm Điện Tử (Electronic Injection Drug Record)
 */

export interface RawDrugRecord {
  patientCode?: string;       // Mã người bệnh / Mã BN
  medicalRecordCode?: string; // Mã bệnh án / Số BA
  linkCode?: string;          // Mã liên kết / Mã vào viện
  patientName: string;        // Họ và tên người bệnh
  age?: number | string;      // Tuổi
  dob?: string;               // Ngày sinh / Năm sinh
  gender?: string;            // Giới tính (Nam/Nữ)
  drugName: string;           // Tên thuốc gốc
  activeIngredient?: string;  // Hoạt chất
  strength?: string;          // Hàm lượng / nồng độ
  unit?: string;              // Đơn vị tính (ống, lọ,...)
  quantity?: number | string; // Số lượng
  route?: string;             // Đường dùng (IV, IM, SC, Tiêm bắp,...)
  orderTime?: string;         // Giờ y lệnh (07:00, 19:30)
  orderDate?: string;         // Ngày y lệnh (YYYY-MM-DD hoặc DD/MM/YYYY)
  dosageForm?: string;        // Dạng bào chế
  rawRowData?: Record<string, any>;
  rowIndex: number;
}

export interface RawRoomRecord {
  patientCode?: string;       // Mã người bệnh
  medicalRecordCode?: string; // Mã bệnh án
  linkCode?: string;          // Mã liên kết
  patientName: string;        // Họ tên bệnh nhân
  age?: number | string;      // Tuổi
  dob?: string;               // Ngày sinh
  gender?: string;            // Giới tính
  room: string;               // Phòng / Buồng
  bed: string;                // Giường
  department?: string;        // Khoa
  rawRowData?: Record<string, any>;
  rowIndex: number;
}

export type ItemClassification = 'INJECTION' | 'INFUSION' | 'MEDICAL_SUPPLY' | 'ORAL_OR_OTHER' | 'UNCERTAIN';

export interface ProcessedInjectionRecord {
  id: string;
  stt: number;
  patientCode: string;
  medicalRecordCode?: string;
  patientName: string;
  age: string;
  gender: string;
  dob?: string;
  room: string;
  bed: string;
  drugFullName: string;       // Tên thuốc gốc kèm hàm lượng đầy đủ
  originalDrugName: string;
  strength: string;
  unit: string;
  quantity: string | number;
  route: string;
  orderTime: string;          // Chuẩn hóa định dạng HH:mm
  orderDate: string;
  activeIngredient?: string;
  matchType: 'CODE' | 'NAME_STRICT' | 'MANUAL';
  isDuplicate?: boolean;
  duplicateGroupKey?: string;
  isExecuted?: boolean;       // Trạng thái điều dưỡng đã tiêm / chưa tiêm
  executedBy?: string;
  notes?: string;
}

export interface PendingCheckRecord {
  id: string;
  stt: number;
  patientCode?: string;
  medicalRecordCode?: string;
  patientName: string;
  age?: string;
  gender?: string;
  drugName: string;
  strength?: string;
  route?: string;
  orderTime?: string;
  orderDate?: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  possibleMatches?: RawRoomRecord[];
  rawDrugRecord: RawDrugRecord;
}

export interface ExcludedItemRecord {
  id: string;
  stt: number;
  patientName: string;
  patientCode?: string;
  itemName: string;
  category: 'INFUSION' | 'MEDICAL_SUPPLY' | 'ORAL_OR_OTHER';
  route?: string;
  unit?: string;
  orderTime?: string;
  reason: string;
}

export interface ProcessingReport {
  totalDrugRows: number;
  totalRoomRows: number;
  identifiedPatientRows: number;
  unidentifiedPatientRows: number;
  patientsWithRoom: number;
  patientsWithoutRoom: number;
  totalValidInjections: number;
  totalExcludedInfusions: number;
  totalExcludedSupplies: number;
  totalExcludedOther: number;
  totalPendingChecks: number;
  duplicateWarningCount: number;
  availableDates: string[];
  departmentName?: string;
}

export type SortMode = 'ROOM_PATIENT_TIME' | 'TIME' | 'PATIENT_NAME' | 'BED';

export interface ColumnMappingPreview {
  fileName: string;
  detectedHeaders: { [key: string]: string };
  missingRequired: string[];
  totalRows: number;
}
