/**
 * Types and interfaces for SỔ THUỐC TIÊM ĐIỆN TỬ (Electronic Injection Drug Record)
 */

export interface RawDrugRecord {
  patientCode?: string;       // Mã người bệnh / Mã BN
  medicalRecordCode?: string; // Mã bệnh án / Số BA
  linkCode?: string;          // Mã liên kết / Mã vào viện
  patientName: string;        // Họ và tên người bệnh
  age?: number | string;      // Tuổi
  dob?: string;               // Ngày sinh / Năm sinh
  birthYear?: number;         // Năm sinh
  gender?: string;            // Giới tính (Nam/Nữ)
  patientAddress?: string;    // Địa chỉ bệnh nhân
  departmentRoomBed?: string; // Cột "Khoa Buồng - Giường" hoặc "Khoa/Phòng/Giường"
  area?: string;              // Khu (Khu A, Khu B, Khu Ngoại,...)
  roomNumber?: string;        // Buồng số mấy
  drugName: string;           // Tên thuốc gốc
  activeIngredient?: string;  // Hoạt chất
  strength?: string;          // Hàm lượng / nồng độ
  unit?: string;              // Đơn vị tính (ống, lọ, chai,...)
  quantity?: number | string; // Số lượng
  route?: string;             // Đường dùng (IV, IM, SC, Tiêm bắp,...)
  notes?: string;             // Ghi chú / Dặn dò y lệnh
  orderTime?: string;         // Giờ y lệnh (07:00, 19:30)
  orderDate?: string;         // Ngày y lệnh (YYYY-MM-DD hoặc DD/MM/YYYY)
  dosageForm?: string;        // Dạng bào chế
  treatmentSheet?: string | number; // Tờ điều trị
  categoryType?: string;      // Loại (Thuốc tiêm, Insulin,...)
  doctor?: string;            // Bác sĩ chỉ định
  rawRowData?: Record<string, any>;
  rowIndex: number;
}

export interface RawRoomRecord {
  patientCode?: string;       // Mã người bệnh
  medicalRecordCode?: string; // Mã bệnh án
  linkCode?: string;          // Mã liên kết
  patientName: string;        // Họ tên bệnh nhân
  age?: number | string;      // Tuổi
  dob?: string;               // Ngày sinh / Năm sinh
  birthYear?: number;
  gender?: string;            // Giới tính
  departmentRoomBed?: string; // Cột "Khoa Buồng - Giường"
  area?: string;              // Khu
  room: string;               // Phòng / Buồng
  bed: string;                // Giường
  department?: string;        // Khoa
  rawRowData?: Record<string, any>;
  rowIndex: number;
}

export type ItemClassification = 'INJECTION' | 'INFUSION' | 'MEDICAL_SUPPLY' | 'ORAL_OR_OTHER' | 'UNCERTAIN';

export type MedicationChangeStatus = 'NEW' | 'CHANGED_DOSE' | 'CHANGED_TIME' | 'UNCHANGED' | 'DISCONTINUED' | 'NONE';

export interface ProcessedInjectionRecord {
  id: string;
  stt: number;
  patientCode: string;
  medicalRecordCode?: string;
  patientName: string;        // 1. Tên bệnh nhân
  age: string;                // 2. Tuổi (năm hiện tại - năm sinh, hoặc X tháng nếu là nhi)
  isPediatric?: boolean;      // Đánh dấu bệnh nhân nhi
  gender: string;
  dob?: string;
  birthYear?: number;
  room: string;               // 3. Phòng (Khu nào - Buồng số mấy)
  area?: string;              // Khu
  roomNumber?: string;        // Buồng
  bed: string;                // Giường
  drugFullName: string;       // 4. Tên thuốc & Hàm lượng đầy đủ
  originalDrugName: string;
  strength: string;
  unit: string;
  quantity: string | number;
  route: string;              // Đường dùng
  notes?: string;             // 5. Ghi chú (đường dùng, dặn dò, lưu ý)
  orderTime: string;          // 6. Thời gian y lệnh (cột cuối cùng)
  orderDate: string;
  treatmentSheet?: string | number; // Tờ điều trị
  categoryType?: string;      // Loại (Thuốc tiêm, Insulin,...)
  doctor?: string;            // Bác sĩ chỉ định
  patientAddress?: string;    // Địa chỉ
  activeIngredient?: string;
  matchType: 'CODE' | 'NAME_STRICT' | 'MANUAL';
  isDuplicate?: boolean;
  duplicateGroupKey?: string;
  isExecuted?: boolean;       // Trạng thái điều dưỡng đã tiêm / chưa tiêm
  executedBy?: string;

  // Day Reconciliation / Comparison fields
  changeStatus?: MedicationChangeStatus;
  previousDayDetails?: {
    orderDate?: string;
    quantity?: string | number;
    orderTime?: string;
    route?: string;
    notes?: string;
  };
}

export interface PendingCheckRecord {
  id: string;
  stt: number;
  patientCode?: string;
  medicalRecordCode?: string;
  patientName: string;
  age?: string;
  gender?: string;
  room?: string;
  drugName: string;
  strength?: string;
  route?: string;
  notes?: string;
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

export interface PatientReconciliationSummary {
  patientName: string;
  patientCode?: string;
  room: string;
  newOrders: ProcessedInjectionRecord[];
  discontinuedOrders: ProcessedInjectionRecord[];
  modifiedOrders: ProcessedInjectionRecord[];
  unchangedOrders: ProcessedInjectionRecord[];
}

export interface DayComparisonReport {
  currentDate: string;
  previousDate: string;
  totalToday: number;
  totalYesterday: number;
  newOrdersCount: number;
  discontinuedOrdersCount: number;
  changedOrdersCount: number;
  unchangedOrdersCount: number;
  patientSummaries: PatientReconciliationSummary[];
  discontinuedList: ProcessedInjectionRecord[];
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
