/**
 * Excel Parser with Intelligent Vietnamese Column Detection
 */
import * as XLSX from 'xlsx';
import { RawDrugRecord, RawRoomRecord, ColumnMappingPreview } from '../types/hospital';
import { normalizeKeyword } from './drugClassifier';

// Header dictionary patterns with extensive Vietnamese hospital variations
const HEADER_PATTERNS = {
  patientCode: [
    'ma nguoi benh', 'ma bn', 'mabn', 'ma bn noi tru', 'ma y te', 'patientcode', 'pid',
    'ma ho so', 'ma_bn', 'id_bn', 'ma benh nhan', 'mabenhnhan', 'so the', 'sothe', 'ma_nguoi_benh'
  ],
  medicalRecordCode: [
    'ma benh an', 'maba', 'so benh an', 'soba', 'so_ba', 'so ba', 'medicalrecordno',
    'ma ba noi tru', 'mabanoitru', 'so ho so ba', 'ma_benh_an'
  ],
  linkCode: [
    'ma lien ket', 'malk', 'ma vao vien', 'ma_lk', 'mavaovien', 'id lien ket', 'id_lk'
  ],
  patientName: [
    'ho va ten nguoi benh', 'ho va ten', 'ho ten', 'ten bn', 'ten benh nhan', 'nguoi benh',
    'hovaten', 'tenbn', 'patientname', 'benh nhan', 'ho ten benh nhan', 'ho va ten bn', 'ho_ten',
    'ho_va_ten', 'ten_benh_nhan', 'nguoi_benh'
  ],
  age: [
    'tuoi', 'tuổi', 'age', 'so tuoi', 'tuoi bn', 'nam tuoi', 'tuoi/ns', 'tuoi/gt', 'sotuoi',
    'tuoibn', 'tuoi_bn', 'so_tuoi', 'tuoi (nam)', 'tuoi(nam)'
  ],
  dob: [
    'ngay sinh', 'nam sinh', 'ngaysinh', 'namsinh', 'dob', 'birthdate', 'ngay thang nam sinh',
    'ngay_sinh', 'nam_sinh', 'ns', 'n.sinh', 'sinh nam', 'sinhnam', 'sinh_nam', 'yob', 'birth_date'
  ],
  gender: [
    'gioi tinh', 'gioitinh', 'gioi', 'phai', 'gender', 'sex', 'nam/nu', 'gioi_tinh', 'nam_nu'
  ],
  room: [
    'phong', 'buong', 'ten phong', 'ma phong', 'room', 'buong dieu tri', 'tenphong', 'phong benh',
    'so phong', 'buong_dieu_tri', 'phong_benh', 'ma_phong', 'ten_phong'
  ],
  bed: [
    'giuong', 'giuong benh', 'so giuong', 'ten giuong', 'bed', 'sogiuong', 'tengiuong', 'giuong nam',
    'giuong_benh', 'so_giuong'
  ],
  drugName: [
    'ten thuoc', 'tenthuoc', 'ten biet duoc', 'ten y lenh', 'thuoc', 'drugname',
    'ten thuoc/ham luong', 'ten vat tu - thuoc', 'ten thuoc ham luong', 'ten_thuoc', 'ten hang hoa',
    'ten_biet_duoc', 'ten dich truyen', 'ten y lenh / thuoc'
  ],
  activeIngredient: [
    'hoat chat', 'hoatchat', 'ten hoat chat', 'activeingredient', 'hoat_chat', 'ten_hoat_chat'
  ],
  strength: [
    'ham luong', 'hamluong', 'nong do', 'nong do/ham luong', 'strength', 'quy cach', 'ham_luong', 'nong_do'
  ],
  unit: [
    'don vi', 'don vi tinh', 'dvt', 'donvi', 'donvitinh', 'unit', 'don_vi', 'dvtinh', 'don_vi_tinh'
  ],
  quantity: [
    'so luong', 'soluong', 'sl', 'qty', 'quantity', 'so_luong'
  ],
  route: [
    'duong dung', 'duongdung', 'duong dung thuoc', 'cach dung', 'route', 'cachdung', 'duong_dung',
    'duong_dung_thuoc', 'cach_dung'
  ],
  orderTime: [
    'gio y lenh', 'thoi gian y lenh', 'gio chi dinh', 'thoi gian chi dinh', 'gio dung',
    'gio dung thuoc', 'thoigianylenh', 'gioylenh', 'giodung', 'time', 'gio', 'thoi gian',
    'gio tiem', 'thoi gian thuc hien', 'gio_y_lenh', 'thoi_gian_y_lenh', 'gio_chi_dinh', 'gio_dung'
  ],
  orderDate: [
    'ngay y lenh', 'ngay chi dinh', 'ngay dung', 'ngay thuc hien', 'ngayylenh', 'ngaychidinh',
    'date', 'ngay', 'ngay_y_lenh', 'ngay_chi_dinh', 'ngay_dung'
  ],
  dosageForm: [
    'dang bao che', 'dangbaoche', 'dang dung', 'dosageform', 'dang_bao_che', 'dang_dung'
  ],
  department: [
    'khoa', 'ten khoa', 'khoa dieu tri', 'department', 'khoa_phong', 'ten_khoa', 'khoa_dieu_tri'
  ]
};

/**
 * Find best matching column key from header text
 */
export function matchHeaderField(headerText: string): string | null {
  if (!headerText || typeof headerText !== 'string') return null;
  const norm = normalizeKeyword(headerText);
  if (!norm) return null;

  for (const [fieldKey, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pat of patterns) {
      if (norm === pat || norm.startsWith(pat + ' ') || norm.endsWith(' ' + pat) || (norm.includes(pat) && pat.length > 4)) {
        return fieldKey;
      }
    }
  }
  return null;
}

/**
 * Format Excel Time to strict 24-hour HH:mm
 */
export function formatOrderTime(value: any): string {
  if (value === null || value === undefined || value === '') return '';

  // 1. If numeric (Excel fraction of a day or timestamp)
  if (typeof value === 'number') {
    // If it's a fraction between 0 and 1 (Excel time representation)
    if (value >= 0 && value < 1) {
      const totalSeconds = Math.round(value * 86400);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    // If integer like 700 (07:00) or 1930 (19:30)
    if (value > 100 && value <= 2400) {
      const strVal = String(value).padStart(4, '0');
      return `${strVal.slice(0, 2)}:${strVal.slice(2, 4)}`;
    }
    // If integer like 7, 8, 19
    if (value >= 0 && value <= 24) {
      return `${String(Math.floor(value)).padStart(2, '0')}:00`;
    }
  }

  // 2. If Date object
  if (value instanceof Date) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const str = String(value).trim();
  if (!str) return '';

  // If "2026-08-14 08:30:00" or "14/08/2026 08:30"
  const dateTimeMatch = str.match(/(?:T|\s)(\d{1,2})[:h](\d{1,2})(?::(\d{1,2}))?/i);
  if (dateTimeMatch) {
    const hours = parseInt(dateTimeMatch[1], 10);
    const minutes = parseInt(dateTimeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours < 24 && minutes < 60) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // If "07:00:00" or "19:30:00" or "07:00" or "7:30"
  const timeMatch = str.match(/^(\d{1,2})[:h](\d{1,2})(?::(\d{1,2}))?$/i);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours < 24 && minutes < 60) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // If "7h" or "8h30"
  const hMatch = str.match(/^(\d{1,2})\s*h\s*(\d{1,2})?$/i);
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    const minutes = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    if (!isNaN(hours) && hours < 24 && minutes < 60) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return str;
}

/**
 * Intelligent Age & Date-of-Birth Extractor
 * Handles numbers, birth years (e.g. 1985 -> calculated age), date strings (DD/MM/YYYY),
 * strings like "54 tuổi", "54T", "18 tháng", "1980 (46 tuổi)"
 */
export function parseAgeAndDob(rawAge: any, rawDob: any): { age: string; dob: string } {
  const currentYear = new Date().getFullYear();
  let finalAge = '';
  let finalDob = '';

  // 1. Process DOB first if available
  if (rawDob !== undefined && rawDob !== null && rawDob !== '') {
    if (rawDob instanceof Date) {
      const y = rawDob.getFullYear();
      const m = String(rawDob.getMonth() + 1).padStart(2, '0');
      const d = String(rawDob.getDate()).padStart(2, '0');
      finalDob = `${d}/${m}/${y}`;
      if (y > 1900 && y <= currentYear) {
        finalAge = String(currentYear - y);
      }
    } else if (typeof rawDob === 'number') {
      // If it's a 4-digit year like 1985
      if (rawDob >= 1900 && rawDob <= currentYear) {
        finalDob = String(rawDob);
        finalAge = String(currentYear - rawDob);
      } else {
        // Excel serial date
        const parsedDate = XLSX.SSF.parse_date_code(rawDob);
        if (parsedDate && parsedDate.y) {
          const y = parsedDate.y;
          const m = String(parsedDate.m).padStart(2, '0');
          const d = String(parsedDate.d).padStart(2, '0');
          finalDob = `${d}/${m}/${y}`;
          if (y > 1900 && y <= currentYear) {
            finalAge = String(currentYear - y);
          }
        }
      }
    } else {
      const strDob = String(rawDob).trim();
      finalDob = strDob;
      // Check 4-digit year in DOB
      const yearMatch = strDob.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) {
        const y = parseInt(yearMatch[1], 10);
        if (y > 1900 && y <= currentYear) {
          finalAge = String(currentYear - y);
        }
      }
    }
  }

  // 2. Process Age if available (overrides or supplements DOB)
  if (rawAge !== undefined && rawAge !== null && rawAge !== '') {
    if (typeof rawAge === 'number') {
      // If the "Age" column actually has a 4-digit birth year (e.g. 1978)
      if (rawAge >= 1900 && rawAge <= currentYear) {
        if (!finalDob) finalDob = String(rawAge);
        finalAge = String(currentYear - rawAge);
      } else if (rawAge >= 0 && rawAge < 150) {
        finalAge = String(Math.floor(rawAge));
      }
    } else {
      const strAge = String(rawAge).trim();

      // If it has month for babies like "18 tháng", "6 tháng"
      const monthMatch = strAge.match(/(\d{1,2})\s*th[aá]ng/i);
      if (monthMatch) {
        finalAge = `${monthMatch[1]} tháng`;
      } else {
        // If it's a 4-digit birth year like "1980"
        const yearMatch = strAge.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch && !strAge.match(/\d+\s*(tuổi|t\b)/i)) {
          const y = parseInt(yearMatch[1], 10);
          if (y > 1900 && y <= currentYear) {
            if (!finalDob) finalDob = String(y);
            finalAge = String(currentYear - y);
          }
        } else {
          // Extract numeric age e.g. "45 tuổi", "45t", "45"
          const numMatch = strAge.match(/(\d{1,3})/);
          if (numMatch) {
            const val = parseInt(numMatch[1], 10);
            if (val > 1900 && val <= currentYear) {
              finalAge = String(currentYear - val);
            } else if (val >= 0 && val < 150) {
              finalAge = String(val);
            }
          }
        }
      }
    }
  }

  return { age: finalAge, dob: finalDob };
}

/**
 * Format Date to YYYY-MM-DD or DD/MM/YYYY
 */
export function formatOrderDate(value: any): string {
  if (!value) return '';

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  if (typeof value === 'number') {
    // Excel serial date conversion
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (parsedDate) {
      const y = parsedDate.y;
      const m = String(parsedDate.m).padStart(2, '0');
      const d = String(parsedDate.d).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
  }

  const str = String(value).trim();
  // If ISO 2026-08-14T... or 2026-08-14
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${String(isoMatch[3]).padStart(2, '0')}/${String(isoMatch[2]).padStart(2, '0')}/${isoMatch[1]}`;
  }

  return str.split(' ')[0];
}

/**
 * Find the table header row automatically in messy hospital Excel files
 */
export function findHeaderRowAndMapping(rows: any[][]): { headerIndex: number; mapping: Record<string, number> } {
  let bestRowIndex = 0;
  let maxMatchedFields = 0;
  let bestMapping: Record<string, number> = {};

  const scanLimit = Math.min(rows.length, 15); // Scan first 15 rows

  for (let r = 0; r < scanLimit; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    const currentMapping: Record<string, number> = {};
    let matchedCount = 0;

    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      if (cellVal !== undefined && cellVal !== null) {
        const fieldKey = matchHeaderField(String(cellVal));
        if (fieldKey && !(fieldKey in currentMapping)) {
          currentMapping[fieldKey] = c;
          matchedCount++;
        }
      }
    }

    if (matchedCount > maxMatchedFields) {
      maxMatchedFields = matchedCount;
      bestRowIndex = r;
      bestMapping = currentMapping;
    }
  }

  return { headerIndex: bestRowIndex, mapping: bestMapping };
}

/**
 * Parse Excel File Buffer / ArrayBuffer into 2D Array
 */
export function readWorkbookSheet(buffer: ArrayBuffer): any[][] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: false, cellText: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
}

/**
 * Parse File 1: Drug & Infusion Order List
 */
export function parseDrugOrderSheet(sheetData: any[][], fileName: string): {
  records: RawDrugRecord[];
  preview: ColumnMappingPreview;
} {
  const { headerIndex, mapping } = findHeaderRowAndMapping(sheetData);
  const detectedHeaders: Record<string, string> = {};
  const headerRow = sheetData[headerIndex] || [];

  for (const [key, colIdx] of Object.entries(mapping)) {
    detectedHeaders[key] = String(headerRow[colIdx] || `Cột ${colIdx + 1}`);
  }

  const missingRequired: string[] = [];
  if (!('patientName' in mapping) && !('patientCode' in mapping)) {
    missingRequired.push('Họ tên người bệnh hoặc Mã BN');
  }
  if (!('drugName' in mapping)) {
    missingRequired.push('Tên thuốc');
  }

  const records: RawDrugRecord[] = [];

  for (let r = headerIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row || row.length === 0) continue;

    const patientName = 'patientName' in mapping ? String(row[mapping.patientName] || '').trim() : '';
    const drugName = 'drugName' in mapping ? String(row[mapping.drugName] || '').trim() : '';
    const patientCode = 'patientCode' in mapping ? String(row[mapping.patientCode] || '').trim() : undefined;

    // Skip empty filler rows
    if (!patientName && !drugName && !patientCode) continue;

    const medicalRecordCode = 'medicalRecordCode' in mapping ? String(row[mapping.medicalRecordCode] || '').trim() : undefined;
    const linkCode = 'linkCode' in mapping ? String(row[mapping.linkCode] || '').trim() : undefined;
    const rawAge = 'age' in mapping ? row[mapping.age] : undefined;
    const rawDob = 'dob' in mapping ? row[mapping.dob] : undefined;
    const { age, dob } = parseAgeAndDob(rawAge, rawDob);
    const gender = 'gender' in mapping ? String(row[mapping.gender] || '').trim() : undefined;
    const activeIngredient = 'activeIngredient' in mapping ? String(row[mapping.activeIngredient] || '').trim() : undefined;
    const strength = 'strength' in mapping ? String(row[mapping.strength] || '').trim() : undefined;
    const unit = 'unit' in mapping ? String(row[mapping.unit] || '').trim() : undefined;
    const quantity = 'quantity' in mapping ? row[mapping.quantity] : undefined;
    const route = 'route' in mapping ? String(row[mapping.route] || '').trim() : undefined;
    const orderTime = 'orderTime' in mapping ? formatOrderTime(row[mapping.orderTime]) : undefined;
    const orderDate = 'orderDate' in mapping ? formatOrderDate(row[mapping.orderDate]) : undefined;
    const dosageForm = 'dosageForm' in mapping ? String(row[mapping.dosageForm] || '').trim() : undefined;

    records.push({
      patientCode,
      medicalRecordCode,
      linkCode,
      patientName,
      age: age || undefined,
      dob: dob || undefined,
      gender,
      drugName,
      activeIngredient,
      strength,
      unit,
      quantity,
      route,
      orderTime,
      orderDate,
      dosageForm,
      rowIndex: r + 1,
    });
  }

  return {
    records,
    preview: {
      fileName,
      detectedHeaders,
      missingRequired,
      totalRows: records.length,
    },
  };
}

/**
 * Parse File 2: Inpatient Room & Bed List
 */
export function parseInpatientRoomSheet(sheetData: any[][], fileName: string): {
  records: RawRoomRecord[];
  preview: ColumnMappingPreview;
} {
  const { headerIndex, mapping } = findHeaderRowAndMapping(sheetData);
  const detectedHeaders: Record<string, string> = {};
  const headerRow = sheetData[headerIndex] || [];

  for (const [key, colIdx] of Object.entries(mapping)) {
    detectedHeaders[key] = String(headerRow[colIdx] || `Cột ${colIdx + 1}`);
  }

  const missingRequired: string[] = [];
  if (!('patientName' in mapping) && !('patientCode' in mapping)) {
    missingRequired.push('Họ tên người bệnh hoặc Mã BN');
  }
  if (!('room' in mapping)) {
    missingRequired.push('Phòng / Buồng điều trị');
  }

  const records: RawRoomRecord[] = [];

  for (let r = headerIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row || row.length === 0) continue;

    const patientName = 'patientName' in mapping ? String(row[mapping.patientName] || '').trim() : '';
    const patientCode = 'patientCode' in mapping ? String(row[mapping.patientCode] || '').trim() : undefined;
    const room = 'room' in mapping ? String(row[mapping.room] || '').trim() : '';
    const bed = 'bed' in mapping ? String(row[mapping.bed] || '').trim() : '';

    if (!patientName && !patientCode && !room) continue;

    const medicalRecordCode = 'medicalRecordCode' in mapping ? String(row[mapping.medicalRecordCode] || '').trim() : undefined;
    const linkCode = 'linkCode' in mapping ? String(row[mapping.linkCode] || '').trim() : undefined;
    const rawAge = 'age' in mapping ? row[mapping.age] : undefined;
    const rawDob = 'dob' in mapping ? row[mapping.dob] : undefined;
    const { age, dob } = parseAgeAndDob(rawAge, rawDob);
    const gender = 'gender' in mapping ? String(row[mapping.gender] || '').trim() : undefined;
    const department = 'department' in mapping ? String(row[mapping.department] || '').trim() : undefined;

    records.push({
      patientCode,
      medicalRecordCode,
      linkCode,
      patientName,
      age: age || undefined,
      dob: dob || undefined,
      gender,
      room,
      bed,
      department,
      rowIndex: r + 1,
    });
  }

  return {
    records,
    preview: {
      fileName,
      detectedHeaders,
      missingRequired,
      totalRows: records.length,
    },
  };
}
