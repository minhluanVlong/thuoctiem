/**
 * Excel Parser with Intelligent Vietnamese Hospital Column Detection & Standard Extraction
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
    'ho ten nguoi benh', 'ho va ten nguoi benh', 'ho va ten', 'ho ten', 'ten bn', 'ten benh nhan', 'nguoi benh',
    'hovaten', 'tenbn', 'patientname', 'benh nhan', 'ho ten benh nhan', 'ho va ten bn', 'ho_ten',
    'ho_va_ten', 'ten_benh_nhan', 'nguoi_benh', 'ten'
  ],
  patientAddress: [
    'dia chi', 'diachi', 'dia_chi', 'address', 'noi o', 'que quan', 'dia chi nguoi benh'
  ],
  // Cột Khoa Buồng - Giường (HIS tổng hợp)
  departmentRoomBed: [
    'khoa buong - giuong', 'khoa buong giuong', 'khoa - buong - giuong', 'khoa/buong/giuong',
    'khoa - buong', 'khoa buong', 'khoa_buong_giuong', 'khoa phong giuong', 'buong - giuong',
    'buong giuong', 'khoa/phong', 'khoa phong', 'khoa dieu tri - buong - giuong',
    'khoa dieu tri - buong', 'khoa - phong - giuong', 'khoa, buong, giuong', 'khoa/buong'
  ],
  age: [
    'tuoi', 'tuổi', 'age', 'so tuoi', 'tuoi bn', 'nam tuoi', 'tuoi/ns', 'tuoi/gt', 'sotuoi',
    'tuoibn', 'tuoi_bn', 'so_tuoi', 'tuoi (nam)', 'tuoi(nam)'
  ],
  dob: [
    'ngay sinh', 'ngaysinh', 'nam sinh', 'namsinh', 'dob', 'birthdate', 'ngay thang nam sinh',
    'ngay_sinh', 'nam_sinh', 'ns', 'n.sinh', 'sinh nam', 'sinhnam', 'sinh_nam', 'yob', 'birth_date',
    'nam_sinh_bn', 'nam sinh bn'
  ],
  gender: [
    'gioi tinh', 'gioitinh', 'gioi', 'phai', 'gender', 'sex', 'nam/nu', 'gioi_tinh', 'nam_nu'
  ],
  room: [
    'phong', 'buong', 'ten phong', 'ma phong', 'room', 'buong dieu tri', 'tenphong', 'phong benh',
    'so phong', 'buong_dieu_tri', 'phong_benh', 'ma_phong', 'ten_phong', 'khu buong', 'khu phong'
  ],
  bed: [
    'giuong', 'giuong benh', 'so giuong', 'ten giuong', 'bed', 'sogiuong', 'tengiuong', 'giuong nam',
    'giuong_benh', 'so_giuong'
  ],
  drugName: [
    'thuoc', 'ten thuoc', 'tenthuoc', 'ten biet duoc', 'ten y lenh', 'drugname',
    'ten thuoc/ham luong', 'ten vat tu - thuoc', 'ten thuoc ham luong', 'ten_thuoc', 'ten hang hoa',
    'ten_biet_duoc', 'ten dich truyen', 'ten y lenh / thuoc', 'ten thuoc - ham luong'
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
  notes: [
    'ghi chu', 'ghichu', 'ghi_chu', 'luu y', 'note', 'notes', 'dan do', 'ghi chu y lenh',
    'chi dan', 'chu thich', 'huong dan'
  ],
  treatmentSheet: [
    'to dieu tri', 'todieutri', 'to_dieu_tri', 'so to dieu tri', 'so to ba', 'to ba'
  ],
  categoryType: [
    'loai', 'loai thuoc', 'loai y lenh', 'phan loai', 'category'
  ],
  doctor: [
    'bac si chi dinh', 'bac si', 'bs chi dinh', 'bschidinh', 'doctor', 'nguoi chi dinh', 'bac_si_chi_dinh', 'bac_si'
  ],
  orderTime: [
    'thoi gian y lenh', 'gio y lenh', 'gio chi dinh', 'thoi gian chi dinh', 'gio dung',
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

  // First exact checks
  for (const [fieldKey, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pat of patterns) {
      if (norm === pat) return fieldKey;
    }
  }

  // Prefix / Suffix / Substring checks
  for (const [fieldKey, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pat of patterns) {
      if (norm.startsWith(pat + ' ') || norm.endsWith(' ' + pat) || (norm.includes(pat) && pat.length >= 4)) {
        return fieldKey;
      }
    }
  }
  return null;
}

/**
 * Extract Khu & Buồng strictly from text (e.g. from "Khoa Buồng - Giường" column)
 * Examples:
 * - "Khoa: KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM\nBuồng: Khu Nội - Nhi: Buồng bệnh 1" -> "Khu Nội - Nhi: Buồng bệnh 1"
 * - "Khoa: KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM\nBuồng: Khu Nội - Nhi: Hồi sức 2\nGiường: 6" -> "Khu Nội - Nhi: Hồi sức 2", Bed: "6"
 * - "Khoa: KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM\nBuồng: Khu Nhiễm: Buồng bệnh 4" -> "Khu Nhiễm: Buồng bệnh 4"
 * - "Khoa: KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM\nBuồng: Khu Nội - Nhi: Buồng Lão khoa\nGiường: 31" -> "Khu Nội - Nhi: Buồng Lão khoa", Bed: "31"
 * - "Khoa: KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM\nBuồng: Khu Nhiễm: Chờ xuất viện 2" -> "Khu Nhiễm: Chờ xuất viện 2"
 */
export function extractHospitalAreaAndRoom(rawText?: string): {
  roomDisplay: string;
  area: string;
  roomNumber: string;
  bed: string;
  department?: string;
} {
  if (!rawText || typeof rawText !== 'string') {
    return { roomDisplay: 'Chưa xếp phòng', area: '', roomNumber: '', bed: '' };
  }

  const str = rawText.trim();
  if (!str) return { roomDisplay: 'Chưa xếp phòng', area: '', roomNumber: '', bed: '' };

  let area = '';
  let roomNumber = '';
  let bed = '';
  let department = '';

  // Check structured "Khoa: ... \n Buồng: ... \n Giường: ..."
  const lines = str.split(/[\r\n]+/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 1. Khoa: ...
    const deptMatch = trimmedLine.match(/^khoa\s*:\s*(.*)/i);
    if (deptMatch) {
      department = deptMatch[1].trim();
    }

    // 2. Buồng: Khu X: Buồng Y / Buồng: Khu X - Nhi: Hồi sức 2 / Buồng: ...
    const buongMatch = trimmedLine.match(/^buồng\s*:\s*(.*)/i);
    if (buongMatch) {
      const buongContent = buongMatch[1].trim();
      // Look for "Khu ...: ..."
      const colonSplit = buongContent.split(':');
      if (colonSplit.length >= 2) {
        area = colonSplit[0].trim();
        roomNumber = colonSplit.slice(1).join(':').trim();
      } else {
        // Match "Khu ..."
        const areaM = buongContent.match(/(Khu\s+[^\-]+)/i);
        if (areaM) {
          area = areaM[1].trim();
          roomNumber = buongContent.replace(areaM[0], '').replace(/^[\s\-:]+/, '').trim();
        } else {
          roomNumber = buongContent;
        }
      }
    }

    // 3. Giường: ...
    const giuongMatch = trimmedLine.match(/^giường\s*:\s*(.*)/i);
    if (giuongMatch) {
      bed = giuongMatch[1].trim();
    }
  }

  // If parsed through multiline structure:
  if (roomNumber || area) {
    let roomDisplay = '';
    if (area && roomNumber) {
      roomDisplay = `${area}: ${roomNumber}`;
    } else {
      roomDisplay = area || roomNumber;
    }
    return { roomDisplay, area, roomNumber, bed: bed ? `Giường ${bed.replace(/^giường\s*/i, '')}` : '', department };
  }

  // Fallback single line parsing
  // 1. Extract Giường
  const bedMatch = str.match(/(?:giường|giuong|g\b|g[\.\-])\s*([A-Za-z0-9\-_]+)/i);
  if (bedMatch) {
    bed = `Giường ${bedMatch[1].trim()}`;
  }

  // 2. Extract Khu
  const areaMatch = str.match(/\b(Khu\s+[A-Za-z0-9\u00C0-\u1EF9]+(?:\s*[\-:]\s*[A-Za-z0-9\u00C0-\u1EF9]+)?)/i);
  if (areaMatch) {
    area = areaMatch[1].trim();
  }

  // 3. Extract Buồng / Phòng
  const roomMatch = str.match(/(?:buồng|buong|phòng|phong|p\.)\s*([A-Za-z0-9\u00C0-\u1EF9\-_]+(?:\s+[A-Za-z0-9\u00C0-\u1EF9]+)?)/i);
  if (roomMatch) {
    const rawR = roomMatch[1].trim();
    roomNumber = rawR.replace(/^(?:buồng|phòng|p\.|p)\s*/i, '').trim();
    if (!roomNumber.toLowerCase().startsWith('buồng') && !roomNumber.toLowerCase().startsWith('phòng')) {
      roomNumber = `Buồng ${roomNumber}`;
    }
  }

  let roomDisplay = '';
  if (area && roomNumber) {
    roomDisplay = `${area} - ${roomNumber}`;
  } else if (roomNumber) {
    roomDisplay = roomNumber;
  } else if (area) {
    roomDisplay = area;
  } else {
    roomDisplay = str;
  }

  return { roomDisplay, area, roomNumber, bed, department };
}

/**
 * Intelligent Age & Pediatric Month Extractor
 * - Tuổi = Năm hiện tại - Năm sinh của bệnh nhân
 * - Nếu là bé nhi: hiển thị số tháng (ví dụ: "8 tháng", "18 tháng")
 */
export function calculatePatientAgeAndPediatric(rawAge: any, rawDob: any): {
  age: string;
  isPediatric: boolean;
  birthYear?: number;
  dobFormatted?: string;
} {
  const currentYear = new Date().getFullYear();
  let calculatedAge = '';
  let isPediatric = false;
  let birthYear: number | undefined = undefined;
  let dobFormatted: string | undefined = undefined;

  // Case A: Explicit string with months e.g. "8 tháng", "18 thang", "6 thg"
  if (rawAge !== undefined && rawAge !== null) {
    const strAge = String(rawAge).trim();
    const monthMatch = strAge.match(/(\d{1,2})\s*(?:tháng|thang|thg|m\b)/i);
    if (monthMatch) {
      return {
        age: `${monthMatch[1]} tháng`,
        isPediatric: true,
      };
    }
  }

  if (rawDob !== undefined && rawDob !== null) {
    const strDob = String(rawDob).trim();
    const monthMatch = strDob.match(/(\d{1,2})\s*(?:tháng|thang|thg|m\b)/i);
    if (monthMatch) {
      return {
        age: `${monthMatch[1]} tháng`,
        isPediatric: true,
      };
    }
  }

  // Case B: Parse DOB if it's a Date object
  if (rawDob instanceof Date) {
    const y = rawDob.getFullYear();
    const m = rawDob.getMonth() + 1;
    const d = rawDob.getDate();
    birthYear = y;
    dobFormatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

    const diffYears = currentYear - y;
    if (diffYears < 1) {
      // Less than 1 year old -> calculate exact months
      const currentMonth = new Date().getMonth() + 1;
      let months = (currentYear - y) * 12 + (currentMonth - m);
      if (months <= 0) months = 1;
      calculatedAge = `${months} tháng`;
      isPediatric = true;
    } else if (diffYears <= 2) {
      // Under 2 years -> show months e.g. 18 tháng
      const currentMonth = new Date().getMonth() + 1;
      const months = diffYears * 12 + (currentMonth - m);
      if (months < 24) {
        calculatedAge = `${months} tháng`;
        isPediatric = true;
      } else {
        calculatedAge = `${diffYears} tuổi`;
      }
    } else {
      calculatedAge = `${diffYears} tuổi`;
    }
  }
  // Case C: Numeric DOB (4-digit birth year or Excel serial date)
  else if (typeof rawDob === 'number') {
    if (rawDob >= 1900 && rawDob <= currentYear) {
      birthYear = rawDob;
      dobFormatted = String(rawDob);
      const diffYears = currentYear - rawDob;
      if (diffYears === 0) {
        calculatedAge = '< 1 tuổi (sơ sinh)';
        isPediatric = true;
      } else if (diffYears < 6) {
        calculatedAge = `${diffYears} tuổi`;
        isPediatric = true;
      } else {
        calculatedAge = `${diffYears} tuổi`;
      }
    } else {
      const parsedDate = XLSX.SSF.parse_date_code(rawDob);
      if (parsedDate && parsedDate.y) {
        birthYear = parsedDate.y;
        dobFormatted = `${String(parsedDate.d).padStart(2, '0')}/${String(parsedDate.m).padStart(2, '0')}/${parsedDate.y}`;
        const diffYears = currentYear - parsedDate.y;
        if (diffYears < 1) {
          const currentMonth = new Date().getMonth() + 1;
          let months = (currentYear - parsedDate.y) * 12 + (currentMonth - (parsedDate.m || 1));
          if (months <= 0) months = 1;
          calculatedAge = `${months} tháng`;
          isPediatric = true;
        } else {
          calculatedAge = `${diffYears} tuổi`;
          if (diffYears < 16) isPediatric = true;
        }
      }
    }
  }
  // Case D: String DOB (e.g. "1985", "15/08/1990", "20/11/2024", "2024")
  else if (rawDob) {
    const strDob = String(rawDob).trim();
    dobFormatted = strDob;

    // Check full DD/MM/YYYY or YYYY-MM-DD
    const fullDateMatch = strDob.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (fullDateMatch) {
      const d = parseInt(fullDateMatch[1], 10);
      const m = parseInt(fullDateMatch[2], 10);
      const y = parseInt(fullDateMatch[3], 10);
      if (y >= 1900 && y <= currentYear) {
        birthYear = y;
        const diffYears = currentYear - y;
        if (diffYears < 1) {
          const currentMonth = new Date().getMonth() + 1;
          let months = (currentYear - y) * 12 + (currentMonth - m);
          if (months <= 0) months = 1;
          calculatedAge = `${months} tháng`;
          isPediatric = true;
        } else if (diffYears <= 2) {
          const currentMonth = new Date().getMonth() + 1;
          const months = diffYears * 12 + (currentMonth - m);
          if (months < 24) {
            calculatedAge = `${months} tháng`;
            isPediatric = true;
          } else {
            calculatedAge = `${diffYears} tuổi`;
          }
        } else {
          calculatedAge = `${diffYears} tuổi`;
          if (diffYears < 16) isPediatric = true;
        }
      }
    } else {
      // Check 4-digit year in DOB string
      const yMatch = strDob.match(/\b(19\d{2}|20\d{2})\b/);
      if (yMatch) {
        const y = parseInt(yMatch[1], 10);
        if (y >= 1900 && y <= currentYear) {
          birthYear = y;
          const diffYears = currentYear - y;
          if (diffYears === 0) {
            calculatedAge = '< 1 tuổi (sơ sinh)';
            isPediatric = true;
          } else {
            calculatedAge = `${diffYears} tuổi`;
            if (diffYears < 16) isPediatric = true;
          }
        }
      }
    }
  }

  // Case E: If calculatedAge is still empty, process rawAge directly
  if (!calculatedAge && rawAge !== undefined && rawAge !== null && rawAge !== '') {
    if (typeof rawAge === 'number') {
      if (rawAge >= 1900 && rawAge <= currentYear) {
        // The age column actually has birth year
        birthYear = rawAge;
        const diffYears = currentYear - rawAge;
        calculatedAge = `${diffYears} tuổi`;
        if (diffYears < 16) isPediatric = true;
      } else if (rawAge >= 0 && rawAge < 150) {
        calculatedAge = `${Math.floor(rawAge)} tuổi`;
        if (rawAge < 16) isPediatric = true;
      }
    } else {
      const strAge = String(rawAge).trim();
      const yMatch = strAge.match(/\b(19\d{2}|20\d{2})\b/);
      if (yMatch && !strAge.match(/\d+\s*(?:tuổi|t\b)/i)) {
        const y = parseInt(yMatch[1], 10);
        birthYear = y;
        const diffYears = currentYear - y;
        calculatedAge = `${diffYears} tuổi`;
        if (diffYears < 16) isPediatric = true;
      } else {
        const numMatch = strAge.match(/(\d{1,3})/);
        if (numMatch) {
          const val = parseInt(numMatch[1], 10);
          if (val >= 1900 && val <= currentYear) {
            birthYear = val;
            calculatedAge = `${currentYear - val} tuổi`;
          } else {
            calculatedAge = `${val} tuổi`;
          }
          if (val < 16) isPediatric = true;
        } else {
          calculatedAge = strAge;
        }
      }
    }
  }

  return {
    age: calculatedAge || '',
    isPediatric,
    birthYear,
    dobFormatted,
  };
}

/**
 * Format Excel Time to strict 24-hour HH:mm
 */
export function formatOrderTime(value: any): string {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number') {
    if (value >= 0 && value < 1) {
      const totalSeconds = Math.round(value * 86400);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    if (value > 100 && value <= 2400) {
      const strVal = String(value).padStart(4, '0');
      return `${strVal.slice(0, 2)}:${strVal.slice(2, 4)}`;
    }
    if (value >= 0 && value <= 24) {
      return `${String(Math.floor(value)).padStart(2, '0')}:00`;
    }
  }

  if (value instanceof Date) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const str = String(value).trim();
  if (!str) return '';

  // DateTime string like "2026-08-14 08:30:00"
  const dateTimeMatch = str.match(/(?:T|\s)(\d{1,2})[:h](\d{1,2})(?::(\d{1,2}))?/i);
  if (dateTimeMatch) {
    const hours = parseInt(dateTimeMatch[1], 10);
    const minutes = parseInt(dateTimeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours < 24 && minutes < 60) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // Time like "07:00:00" or "19:30"
  const timeMatch = str.match(/^(\d{1,2})[:h](\d{1,2})(?::(\d{1,2}))?$/i);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours < 24 && minutes < 60) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return str;
}

/**
 * Format Date to DD/MM/YYYY
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
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (parsedDate) {
      const y = parsedDate.y;
      const m = String(parsedDate.m).padStart(2, '0');
      const d = String(parsedDate.d).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
  }

  const str = String(value).trim();
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

  const scanLimit = Math.min(rows.length, 15);

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
 * Parse File 1: Thống kê truyền dịch & thuốc tiêm xuất từ phần mềm
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

    if (!patientName && !drugName && !patientCode) continue;

    const medicalRecordCode = 'medicalRecordCode' in mapping ? String(row[mapping.medicalRecordCode] || '').trim() : undefined;
    const linkCode = 'linkCode' in mapping ? String(row[mapping.linkCode] || '').trim() : undefined;

    // Age & DOB Calculation
    const rawAge = 'age' in mapping ? row[mapping.age] : undefined;
    const rawDob = 'dob' in mapping ? row[mapping.dob] : undefined;
    const { age, isPediatric, birthYear, dobFormatted } = calculatePatientAgeAndPediatric(rawAge, rawDob);

    const gender = 'gender' in mapping ? String(row[mapping.gender] || '').trim() : undefined;

    // Khoa Buồng - Giường column
    const departmentRoomBed = 'departmentRoomBed' in mapping
      ? String(row[mapping.departmentRoomBed] || '').trim()
      : undefined;

    // Extract Khu & Buồng if departmentRoomBed exists
    const extractedRoomInfo = departmentRoomBed ? extractHospitalAreaAndRoom(departmentRoomBed) : undefined;

    const activeIngredient = 'activeIngredient' in mapping ? String(row[mapping.activeIngredient] || '').trim() : undefined;
    const strength = 'strength' in mapping ? String(row[mapping.strength] || '').trim() : undefined;
    const unit = 'unit' in mapping ? String(row[mapping.unit] || '').trim() : undefined;
    const quantity = 'quantity' in mapping ? row[mapping.quantity] : undefined;
    let route = 'route' in mapping ? String(row[mapping.route] || '').trim() : undefined;
    const notes = 'notes' in mapping ? String(row[mapping.notes] || '').trim() : undefined;
    const patientAddress = 'patientAddress' in mapping ? String(row[mapping.patientAddress] || '').trim() : undefined;
    const treatmentSheet = 'treatmentSheet' in mapping ? String(row[mapping.treatmentSheet] || '').trim() : undefined;
    const categoryType = 'categoryType' in mapping ? String(row[mapping.categoryType] || '').trim() : undefined;
    const doctor = 'doctor' in mapping ? String(row[mapping.doctor] || '').trim() : undefined;
    const orderTime = 'orderTime' in mapping ? formatOrderTime(row[mapping.orderTime]) : undefined;
    const orderDate = 'orderDate' in mapping ? formatOrderDate(row[mapping.orderDate]) : undefined;
    const dosageForm = 'dosageForm' in mapping ? String(row[mapping.dosageForm] || '').trim() : undefined;

    // Auto extract route from notes/drug if route is missing
    if (!route && notes) {
      if (/\b(?:tmc|tm)\b|\(tmc\)/i.test(notes)) {
        route = 'Tiêm TMC';
      } else if (/\b(?:tb|im)\b|\(tb\)/i.test(notes)) {
        route = 'Tiêm TB';
      } else if (/\b(?:tdd|sc)\b|\(tdd\)/i.test(notes)) {
        route = 'Tiêm TDD';
      } else if (/\bpkd\b|\(pkd\)/i.test(notes)) {
        route = 'Khí dung (PKD)';
      } else if (/\b(?:u|uống)\b|\(u\)/i.test(notes)) {
        route = 'Uống';
      }
    }

    records.push({
      patientCode,
      medicalRecordCode,
      linkCode,
      patientName,
      age: age || undefined,
      dob: dobFormatted || undefined,
      birthYear,
      gender,
      patientAddress,
      departmentRoomBed,
      area: extractedRoomInfo?.area,
      roomNumber: extractedRoomInfo?.roomNumber,
      drugName,
      activeIngredient,
      strength,
      unit,
      quantity,
      route,
      notes,
      treatmentSheet,
      categoryType,
      doctor,
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
 * Parse File 2: Inpatient Room & Bed List (Danh sách phòng bệnh nhân)
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

  const records: RawRoomRecord[] = [];

  for (let r = headerIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row || row.length === 0) continue;

    const patientName = 'patientName' in mapping ? String(row[mapping.patientName] || '').trim() : '';
    const patientCode = 'patientCode' in mapping ? String(row[mapping.patientCode] || '').trim() : undefined;

    // Room info
    const rawDepartmentRoomBed = 'departmentRoomBed' in mapping ? String(row[mapping.departmentRoomBed] || '').trim() : '';
    const rawRoom = 'room' in mapping ? String(row[mapping.room] || '').trim() : '';
    const rawBed = 'bed' in mapping ? String(row[mapping.bed] || '').trim() : '';

    if (!patientName && !patientCode && !rawRoom && !rawDepartmentRoomBed) continue;

    const medicalRecordCode = 'medicalRecordCode' in mapping ? String(row[mapping.medicalRecordCode] || '').trim() : undefined;
    const linkCode = 'linkCode' in mapping ? String(row[mapping.linkCode] || '').trim() : undefined;

    const rawAge = 'age' in mapping ? row[mapping.age] : undefined;
    const rawDob = 'dob' in mapping ? row[mapping.dob] : undefined;
    const { age, birthYear, dobFormatted } = calculatePatientAgeAndPediatric(rawAge, rawDob);

    const gender = 'gender' in mapping ? String(row[mapping.gender] || '').trim() : undefined;
    const department = 'department' in mapping ? String(row[mapping.department] || '').trim() : undefined;

    // Extract Khu & Buồng
    const combinedRoomText = rawDepartmentRoomBed || rawRoom;
    const { roomDisplay, area, roomNumber, bed: extractedBed } = extractHospitalAreaAndRoom(combinedRoomText);

    records.push({
      patientCode,
      medicalRecordCode,
      linkCode,
      patientName,
      age: age || undefined,
      dob: dobFormatted || undefined,
      birthYear,
      gender,
      departmentRoomBed: rawDepartmentRoomBed,
      area,
      room: roomDisplay || rawRoom || 'Buồng 01',
      bed: rawBed || extractedBed || '',
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
