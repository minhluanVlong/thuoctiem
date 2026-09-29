/**
 * SỔ THUỐC TIÊM & KHÍ DUNG (MA TRẬN Ô LY)
 * Matrix JSON format definitions, converters, and sample datasets.
 */
import { ProcessedInjectionRecord } from './hospital';
import { formatDoseAndTimeSchedule } from '../utils/matrixBuilder';

export interface MatrixColumnDefinition {
  ma: string;             // e.g. "acetyl_leucin", "cefotaxim", "esogas", "vinsamol", "zensonide"
  ten_hien_thi: string;   // e.g. "Acetyl leucin 500mg", "Esogas 40mg", "Vinsamol 5.0"
  duong_dung: string;     // e.g. "TMC", "IM", "TDD", "PKD"
}

export interface PatientMedicationOrder {
  tong_so_lan: number;    // e.g. 1, 2, 3
  thoi_gian: string;      // e.g. "07:00", "07:00 - 15:00", "07:00 - 13:00 - 19:00"
  ghi_chu_kem?: string;   // e.g. "+ có Zensonide 2 lần (07:00 - 19:00)"
  chi_tiet: string;       // e.g. "Esogas 40mg pha tiêm TMC", "Vinsamol 5.0mg/2.5ml PKD"
  lieu_luong?: string;    // e.g. "1", "1 x 3", "2/3 x 3", "1/2 x 2"
}

export interface PatientMatrixRow {
  stt: number;
  ho_ten: string;
  giuong?: string;        // e.g. "Giường 01", "05"
  tuoi?: string;          // e.g. "64", "4 th", "83"
  phong?: string;         // e.g. "HSCC", "HS1", "Buồng 1", "Nhi 1"
  y_lenh: Record<string, PatientMedicationOrder>;
}

export interface MatrixJsonFormat {
  danh_sach_cot_thuoc: MatrixColumnDefinition[];
  du_lieu_benh_nhan: PatientMatrixRow[];
}

/**
 * Standard Demo Dataset matching user specifications exactly:
 * Includes Esogas, Vinsamol, Zensonide, Cefotaxim, Ceftazidim, Hydrocortison, Omevin, Acetyl leucin
 */
export const SAMPLE_MATRIX_JSON: MatrixJsonFormat = {
  danh_sach_cot_thuoc: [
    { ma: 'acetyl_leucin', ten_hien_thi: 'Acetyl leucin 500mg', duong_dung: 'TMC' },
    { ma: 'cefotaxim', ten_hien_thi: 'Cefotaxim 1g', duong_dung: 'TMC' },
    { ma: 'ceftazidim', ten_hien_thi: 'Ceftazidim 1g', duong_dung: 'TMC' },
    { ma: 'hydrocortison', ten_hien_thi: 'Hydrocortison 100mg', duong_dung: 'TMC' },
    { ma: 'omevin', ten_hien_thi: 'Omevin 40mg', duong_dung: 'TMC' },
    { ma: 'esogas', ten_hien_thi: 'Esogas 40mg', duong_dung: 'TMC' },
    { ma: 'vinsamol', ten_hien_thi: 'Vinsamol 5.0', duong_dung: 'PKD' },
    { ma: 'zensonide', ten_hien_thi: 'Zensonide', duong_dung: 'PKD' }
  ],
  du_lieu_benh_nhan: [
    {
      stt: 1,
      ho_ten: 'NGUYỄN VĂN AN',
      giuong: 'Giường 01',
      tuoi: '68',
      phong: 'HSCC',
      y_lenh: {
        vinsamol: {
          tong_so_lan: 3,
          thoi_gian: '07:00 - 13:00 - 19:00',
          ghi_chu_kem: '+ có Zensonide 2 lần (07:00 - 19:00)',
          chi_tiet: 'Vinsamol 5.0mg/2.5ml PKD',
          lieu_luong: '1 x 3'
        },
        esogas: {
          tong_so_lan: 1,
          thoi_gian: '07:00',
          chi_tiet: 'Esogas 40mg pha tiêm TMC',
          lieu_luong: '1'
        },
        ceftazidim: {
          tong_so_lan: 3,
          thoi_gian: '07:15 - 15:15 - 23:15',
          chi_tiet: 'Ceftazidim 1g pha 5ml nước cất TMC',
          lieu_luong: '1 x 3'
        }
      }
    },
    {
      stt: 2,
      ho_ten: 'TRẦN THỊ BÍCH',
      giuong: 'Giường 03',
      tuoi: '72',
      phong: 'HSCC',
      y_lenh: {
        esogas: {
          tong_so_lan: 1,
          thoi_gian: '07:00',
          chi_tiet: 'Esogas 40mg pha 10ml NaCl tiêm TMC chậm',
          lieu_luong: '1'
        },
        omevin: {
          tong_so_lan: 1,
          thoi_gian: '19:00',
          chi_tiet: 'Omevin 40mg tiêm TMC',
          lieu_luong: '1'
        },
        acetyl_leucin: {
          tong_so_lan: 2,
          thoi_gian: '08:00 - 16:00',
          chi_tiet: 'Acetyl leucin 500mg/5ml tiêm TMC',
          lieu_luong: '1 x 2'
        }
      }
    },
    {
      stt: 3,
      ho_ten: 'LÊ BẢO NAM',
      giuong: 'Giường 02',
      tuoi: '14 th',
      phong: 'Nhi 1',
      y_lenh: {
        cefotaxim: {
          tong_so_lan: 3,
          thoi_gian: '07:00 - 15:00 - 23:00',
          chi_tiet: 'Cefotaxim 1g (dùng 2/3 lọ) pha tiêm TMC',
          lieu_luong: '2/3 x 3'
        },
        vinsamol: {
          tong_so_lan: 2,
          thoi_gian: '08:00 - 16:00',
          ghi_chu_kem: '+ có Zensonide 1 lần (08:00)',
          chi_tiet: 'Vinsamol 5.0mg/2.5ml PKD 1/2 tép',
          lieu_luong: '1/2 x 2'
        },
        hydrocortison: {
          tong_so_lan: 2,
          thoi_gian: '08:00 - 16:00',
          chi_tiet: 'Hydrocortison 100mg pha 5ml cất tiêm TMC',
          lieu_luong: '1/2 x 2'
        }
      }
    },
    {
      stt: 4,
      ho_ten: 'PHẠM VĂN ĐỨC',
      giuong: 'Giường 05',
      tuoi: '59',
      phong: 'Buồng 2',
      y_lenh: {
        ceftazidim: {
          tong_so_lan: 2,
          thoi_gian: '07:30 - 19:30',
          chi_tiet: 'Ceftazidim 1g tiêm TMC',
          lieu_luong: '1 x 2'
        },
        esogas: {
          tong_so_lan: 1,
          thoi_gian: '07:30',
          chi_tiet: 'Esogas 40mg tiêm TMC',
          lieu_luong: '1'
        }
      }
    }
  ]
};

/**
 * Converts MatrixJsonFormat to ProcessedInjectionRecord array so all
 * views (Nurse Matrix, 4-Column Book, Reconciliation, Print) function seamlessly.
 */
export function convertMatrixJsonToInjections(
  matrixJson: MatrixJsonFormat,
  orderDate: string = new Date().toLocaleDateString('vi-VN')
): ProcessedInjectionRecord[] {
  if (!matrixJson || !Array.isArray(matrixJson.du_lieu_benh_nhan)) {
    return [];
  }

  const columnsMap = new Map<string, MatrixColumnDefinition>();
  if (Array.isArray(matrixJson.danh_sach_cot_thuoc)) {
    matrixJson.danh_sach_cot_thuoc.forEach((col) => {
      columnsMap.set(col.ma.toLowerCase().trim(), col);
    });
  }

  const records: ProcessedInjectionRecord[] = [];
  let recordCounter = 1;

  matrixJson.du_lieu_benh_nhan.forEach((patient, pIdx) => {
    const pName = (patient.ho_ten || `Bệnh nhân ${patient.stt || pIdx + 1}`).trim().toUpperCase();
    const pAge = (patient.tuoi || '').trim();
    const isPediatric = pAge.toLowerCase().includes('th') || (parseInt(pAge, 10) < 16 && !isNaN(parseInt(pAge, 10)));
    const pRoom = (patient.phong || 'HSCC').trim();
    const pBed = (patient.giuong || '').replace(/^giường\s*/i, '').trim();
    const pCode = `BN${String(patient.stt || pIdx + 1).padStart(3, '0')}`;

    const orders = patient.y_lenh || {};

    Object.entries(orders).forEach(([drugCode, order]) => {
      if (!order) return;

      const normCode = drugCode.toLowerCase().trim();
      const colDef = columnsMap.get(normCode);
      const drugTitle = colDef?.ten_hien_thi || drugCode;
      const route = (colDef?.duong_dung || (normCode.includes('vinsamol') || normCode.includes('zensonid') ? 'PKD' : 'TMC')).toUpperCase();

      const timeStr = order.thoi_gian || '07:00';
      const timeSlots = timeStr
        .split(/[-–,;/]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const requestedCount = order.tong_so_lan || 1;
      let finalSlots = timeSlots;

      if (requestedCount === 3 && finalSlots.length < 3) {
        finalSlots = route === 'PKD' ? ['07:00', '13:00', '19:00'] : ['07:00', '15:00', '23:00'];
      } else if (requestedCount === 2 && finalSlots.length < 2) {
        finalSlots = ['07:00', '19:00'];
      } else if (requestedCount === 4 && finalSlots.length < 4) {
        finalSlots = ['07:00', '13:00', '19:00', '01:00'];
      } else if (finalSlots.length === 0) {
        finalSlots = ['07:00'];
      }

      const firstTime = finalSlots[0] || '07:00';

      let fullNotes = [
        order.chi_tiet || drugTitle,
        order.ghi_chu_kem || ''
      ].filter(Boolean).join(' | ');

      if (order.lieu_luong && order.lieu_luong.includes('/')) {
        const frac = order.lieu_luong.split(' x ')[0].trim();
        if (!fullNotes.includes(frac)) {
          fullNotes = `(Dùng ${frac} lọ) | ` + fullNotes;
        }
      }

      const qty = requestedCount;

      records.push({
        id: `ai_${patient.stt || pIdx + 1}_${normCode}_${recordCounter++}`,
        stt: recordCounter,
        patientCode: pCode,
        patientName: pName,
        age: pAge,
        isPediatric,
        gender: 'Không rõ',
        room: pRoom,
        area: pRoom.includes('Nhi') || pRoom.includes('Lão') ? 'Khu 2' : 'Khu Nội Nhi',
        bed: pBed,
        departmentRoomBed: `Khoa Nội Tổng Hợp - Buồng: ${pRoom} - Giường: ${pBed}`,
        drugFullName: order.chi_tiet || drugTitle,
        originalDrugName: drugTitle,
        strength: '',
        unit: route === 'PKD' ? 'tép' : 'lọ/ống',
        quantity: qty,
        route,
        notes: fullNotes,
        orderTime: firstTime,
        orderDate,
        treatmentSheet: '1',
        categoryType: route === 'PKD' ? 'Khí dung' : 'Thuốc tiêm',
        matchType: 'NAME_STRICT',
        timeSlots: finalSlots,
        timeSlotsExecuted: new Array(finalSlots.length).fill(false),
        isExecuted: false,
      });
    });
  });

  return records;
}

/**
 * Exports current processed injections to the pure Matrix JSON format
 */
export function convertInjectionsToMatrixJson(injections: ProcessedInjectionRecord[]): MatrixJsonFormat {
  const safeInjections = Array.isArray(injections) ? injections : [];
  const colMap = new Map<string, MatrixColumnDefinition>();
  const patientMap = new Map<string, PatientMatrixRow>();

  // Helper to generate a clean slug code
  const getDrugCode = (name: string, route: string): string => {
    const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes('acetyl') && n.includes('leucin')) return 'acetyl_leucin';
    if (n.includes('cefotaxim')) return 'cefotaxim';
    if (n.includes('ceftazidim') || n.includes('catachit')) return 'ceftazidim';
    if (n.includes('hydrocortison')) return 'hydrocortison';
    if (n.includes('omevin') || n.includes('omeprazol')) return 'omevin';
    if (n.includes('esogas') || n.includes('esomeprazol')) return 'esogas';
    if (n.includes('vinsamol') || n.includes('vinsalmol') || n.includes('salbutamol')) return 'vinsamol';
    if (n.includes('zensonid') || n.includes('budesonid')) return 'zensonide';
    if (n.includes('gentamicin') || n.includes('zentamil')) return 'gentamicin';
    if (n.includes('medivernol') || n.includes('ceftriaxon')) return 'ceftriaxon';

    // fallback slug
    return n.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20);
  };

  safeInjections.forEach((item) => {
    const rawName = item.originalDrugName || item.drugFullName || 'Thuốc';
    const route = (item.route || 'TMC').toUpperCase().trim();
    const code = getDrugCode(rawName, route);

    if (!colMap.has(code)) {
      // Clean display name
      let cleanDisplay = rawName;
      if (code === 'esogas') cleanDisplay = 'Esogas 40mg';
      else if (code === 'vinsamol') cleanDisplay = 'Vinsamol 5.0';
      else if (code === 'zensonide') cleanDisplay = 'Zensonide';
      else if (code === 'cefotaxim') cleanDisplay = 'Cefotaxim 1g';
      else if (code === 'ceftazidim') cleanDisplay = 'Ceftazidim 1g';
      else if (code === 'hydrocortison') cleanDisplay = 'Hydrocortison 100mg';
      else if (code === 'omevin') cleanDisplay = 'Omevin 40mg';
      else if (code === 'acetyl_leucin') cleanDisplay = 'Acetyl leucin 500mg';

      colMap.set(code, {
        ma: code,
        ten_hien_thi: cleanDisplay,
        duong_dung: route.includes('PKD') ? 'PKD' : route.includes('TDD') ? 'TDD' : 'TMC',
      });
    }

    const pKey = (item.patientCode || item.patientName || '').trim();
    if (!patientMap.has(pKey)) {
      patientMap.set(pKey, {
        stt: patientMap.size + 1,
        ho_ten: item.patientName,
        giuong: item.bed ? `Giường ${item.bed}` : undefined,
        tuoi: item.age,
        phong: item.room,
        y_lenh: {},
      });
    }

    const pRow = patientMap.get(pKey)!;
    const timeInfo = formatDoseAndTimeSchedule(item);
    const timeSlots = item.timeSlots && item.timeSlots.length > 0 ? item.timeSlots : timeInfo.timeSlots;
    const timeSchedule = timeInfo.timeSchedule || timeSlots.join(' - ');
    const qty = timeInfo.frequency || Number(item.quantity) || timeSlots.length || 1;

    let ghiChuKem: string | undefined = undefined;
    const notesLower = (item.notes || '').toLowerCase();
    if (code === 'vinsamol' && (notesLower.includes('zensonid') || notesLower.includes('budesonid'))) {
      const zMatch = notesLower.match(/zensonid[^\d]*(\d+)\s*lần/i);
      const zTimes = zMatch ? `${zMatch[1]} lần` : '2 lần';
      ghiChuKem = `+ có Zensonide ${zTimes} (${timeSchedule})`;
    }

    pRow.y_lenh[code] = {
      tong_so_lan: qty,
      thoi_gian: timeSchedule,
      ghi_chu_kem: ghiChuKem,
      chi_tiet: item.notes || item.drugFullName,
      lieu_luong: timeInfo.doseText || (qty > 1 ? `1 x ${qty}` : '1'),
    };
  });

  return {
    danh_sach_cot_thuoc: Array.from(colMap.values()),
    du_lieu_benh_nhan: Array.from(patientMap.values()),
  };
}
