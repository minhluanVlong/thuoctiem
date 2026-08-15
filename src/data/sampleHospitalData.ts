/**
 * Realistic Sample Hospital Datasets for Testing & Demonstration
 */
import * as XLSX from 'xlsx';
import { RawDrugRecord, RawRoomRecord } from '../types/hospital';

export const SAMPLE_DRUG_ORDERS: RawDrugRecord[] = [
  // Patient 1: Nguyễn Văn A (P101 - G01)
  {
    patientCode: 'BN001089',
    medicalRecordCode: 'BA2026/0412',
    patientName: 'Nguyễn Văn A',
    age: 65,
    gender: 'Nam',
    drugName: 'Ceftriaxone',
    strength: '1 g',
    unit: 'Lọ',
    quantity: 1,
    route: 'Tiêm tĩnh mạch',
    orderTime: '07:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột pha tiêm',
    rowIndex: 2,
  },
  {
    patientCode: 'BN001089',
    medicalRecordCode: 'BA2026/0412',
    patientName: 'Nguyễn Văn A',
    age: 65,
    gender: 'Nam',
    drugName: 'Ceftriaxone',
    strength: '1 g',
    unit: 'Lọ',
    quantity: 1,
    route: 'Tiêm tĩnh mạch',
    orderTime: '19:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột pha tiêm',
    rowIndex: 3,
  },
  {
    patientCode: 'BN001089',
    medicalRecordCode: 'BA2026/0412',
    patientName: 'Nguyễn Văn A',
    age: 65,
    gender: 'Nam',
    drugName: 'Furosemide',
    strength: '20 mg/2ml',
    unit: 'Ống',
    quantity: 2,
    route: 'Tiêm tĩnh mạch chậm',
    orderTime: '08:00',
    orderDate: '15/08/2026',
    dosageForm: 'Dung dịch tiêm',
    rowIndex: 4,
  },
  // Excluded Infusion for Patient 1
  {
    patientCode: 'BN001089',
    medicalRecordCode: 'BA2026/0412',
    patientName: 'Nguyễn Văn A',
    age: 65,
    gender: 'Nam',
    drugName: 'Natri clorid 0,9%',
    strength: '500 ml',
    unit: 'Chai',
    quantity: 1,
    route: 'Truyền tĩnh mạch',
    orderTime: '08:30',
    orderDate: '15/08/2026',
    dosageForm: 'Dịch truyền',
    rowIndex: 5,
  },
  // Excluded Medical Supply for Patient 1
  {
    patientCode: 'BN001089',
    medicalRecordCode: 'BA2026/0412',
    patientName: 'Nguyễn Văn A',
    age: 65,
    gender: 'Nam',
    drugName: 'Bơm tiêm 10ml Vinahankook',
    strength: '',
    unit: 'Cái',
    quantity: 2,
    route: '',
    orderTime: '07:00',
    orderDate: '15/08/2026',
    dosageForm: '',
    rowIndex: 6,
  },

  // Patient 2: Trần Thị B (P102 - G02)
  {
    patientCode: 'BN001142',
    medicalRecordCode: 'BA2026/0430',
    patientName: 'Trần Thị B',
    age: 42,
    gender: 'Nữ',
    drugName: 'Ampicillin',
    strength: '500 mg',
    unit: 'Lọ',
    quantity: 2,
    route: 'Tiêm bắp',
    orderTime: '08:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột pha tiêm',
    rowIndex: 7,
  },
  {
    patientCode: 'BN001142',
    medicalRecordCode: 'BA2026/0430',
    patientName: 'Trần Thị B',
    age: 42,
    gender: 'Nữ',
    drugName: 'Ampicillin',
    strength: '500 mg',
    unit: 'Lọ',
    quantity: 2,
    route: 'Tiêm bắp',
    orderTime: '16:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột pha tiêm',
    rowIndex: 8,
  },
  {
    patientCode: 'BN001142',
    medicalRecordCode: 'BA2026/0430',
    patientName: 'Trần Thị B',
    age: 42,
    gender: 'Nữ',
    drugName: 'Metronidazole',
    strength: '500 mg/100ml',
    unit: 'Chai',
    quantity: 1,
    route: 'Tiêm truyền tĩnh mạch',
    orderTime: '09:00',
    orderDate: '15/08/2026',
    dosageForm: 'Dung dịch tiêm truyền',
    rowIndex: 9,
  },
  // Excluded Supply for Patient 2
  {
    patientCode: 'BN001142',
    medicalRecordCode: 'BA2026/0430',
    patientName: 'Trần Thị B',
    age: 42,
    gender: 'Nữ',
    drugName: 'Dây truyền dịch có bầu đếm giọt',
    strength: '',
    unit: 'Bộ',
    quantity: 1,
    route: '',
    orderTime: '09:00',
    orderDate: '15/08/2026',
    dosageForm: '',
    rowIndex: 10,
  },

  // Patient 3: Lê Văn C (P103 - G01) - Pediatric
  {
    patientCode: 'BN002015',
    medicalRecordCode: 'BA2026/0501',
    patientName: 'Lê Văn C',
    age: 8,
    gender: 'Nam',
    drugName: 'Cefotaxime',
    strength: '1 g',
    unit: 'Lọ',
    quantity: 1,
    route: 'IV',
    orderTime: '07:30',
    orderDate: '15/08/2026',
    dosageForm: 'Bột pha tiêm',
    rowIndex: 11,
  },
  {
    patientCode: 'BN002015',
    medicalRecordCode: 'BA2026/0501',
    patientName: 'Lê Văn C',
    age: 8,
    gender: 'Nam',
    drugName: 'Solu-Medrol',
    strength: '40 mg',
    unit: 'Lọ',
    quantity: 1,
    route: 'IV push',
    orderTime: '08:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột đông khô pha tiêm',
    rowIndex: 12,
  },

  // Patient 4: Phạm Thị D (P101 - G02)
  {
    patientCode: 'BN003204',
    medicalRecordCode: 'BA2026/0518',
    patientName: 'Phạm Thị D',
    age: 58,
    gender: 'Nữ',
    drugName: 'Enoxaparin (Lovenox)',
    strength: '4000 UI/0.4ml',
    unit: 'Bơm tiêm đóng sẵn',
    quantity: 1,
    route: 'Tiêm dưới da',
    orderTime: '08:00',
    orderDate: '15/08/2026',
    dosageForm: 'Dung dịch tiêm',
    rowIndex: 13,
  },
  {
    patientCode: 'BN003204',
    medicalRecordCode: 'BA2026/0518',
    patientName: 'Phạm Thị D',
    age: 58,
    gender: 'Nữ',
    drugName: 'Insulin Mixtard 30',
    strength: '100 IU/ml',
    unit: 'Bút tiêm',
    quantity: 12,
    route: 'Tiêm dưới da',
    orderTime: '06:30',
    orderDate: '15/08/2026',
    dosageForm: 'Hỗn dịch tiêm',
    rowIndex: 14,
  },
  {
    patientCode: 'BN003204',
    medicalRecordCode: 'BA2026/0518',
    patientName: 'Phạm Thị D',
    age: 58,
    gender: 'Nữ',
    drugName: 'Insulin Mixtard 30',
    strength: '100 IU/ml',
    unit: 'Bút tiêm',
    quantity: 8,
    route: 'Tiêm dưới da',
    orderTime: '17:30',
    orderDate: '15/08/2026',
    dosageForm: 'Hỗn dịch tiêm',
    rowIndex: 15,
  },

  // Patient 5: Hoàng Văn E (P201 - G01)
  {
    patientCode: 'BN004112',
    medicalRecordCode: 'BA2026/0600',
    patientName: 'Hoàng Văn E',
    age: 72,
    gender: 'Nam',
    drugName: 'Morphin hydroclorid',
    strength: '10 mg/ml',
    unit: 'Ống',
    quantity: 1,
    route: 'Tiêm bắp',
    orderTime: '09:00',
    orderDate: '15/08/2026',
    dosageForm: 'Dung dịch tiêm',
    rowIndex: 16,
  },
  {
    patientCode: 'BN004112',
    medicalRecordCode: 'BA2026/0600',
    patientName: 'Hoàng Văn E',
    age: 72,
    gender: 'Nam',
    drugName: 'Ondansetron',
    strength: '4 mg/2ml',
    unit: 'Ống',
    quantity: 1,
    route: 'Tiêm tĩnh mạch',
    orderTime: '08:30',
    orderDate: '15/08/2026',
    dosageForm: 'Dung dịch tiêm',
    rowIndex: 17,
  },
  // Excluded Infusion for Patient 5
  {
    patientCode: 'BN004112',
    medicalRecordCode: 'BA2026/0600',
    patientName: 'Hoàng Văn E',
    age: 72,
    gender: 'Nam',
    drugName: 'Ringer Lactate',
    strength: '500 ml',
    unit: 'Chai',
    quantity: 2,
    route: 'Truyền tĩnh mạch',
    orderTime: '09:30',
    orderDate: '15/08/2026',
    dosageForm: 'Dịch truyền',
    rowIndex: 18,
  },

  // Patient 6: Đỗ Thị Mai (P202 - G01)
  {
    patientCode: 'BN005290',
    medicalRecordCode: 'BA2026/0655',
    patientName: 'Đỗ Thị Mai',
    age: 35,
    gender: 'Nữ',
    drugName: 'Pantoprazol',
    strength: '40 mg',
    unit: 'Lọ',
    quantity: 1,
    route: 'IV',
    orderTime: '06:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột đông khô pha tiêm',
    rowIndex: 19,
  },
  {
    patientCode: 'BN005290',
    medicalRecordCode: 'BA2026/0655',
    patientName: 'Đỗ Thị Mai',
    age: 35,
    gender: 'Nữ',
    drugName: 'Tranexamic acid (Transamin)',
    strength: '250 mg/5ml',
    unit: 'Ống',
    quantity: 2,
    route: 'Tiêm tĩnh mạch chậm',
    orderTime: '10:00',
    orderDate: '15/08/2026',
    dosageForm: 'Dung dịch tiêm',
    rowIndex: 20,
  },

  // Test Case: Duplicate Warning for Đỗ Thị Mai at 06:00 (Simulated duplicate in HIS export)
  {
    patientCode: 'BN005290',
    medicalRecordCode: 'BA2026/0655',
    patientName: 'Đỗ Thị Mai',
    age: 35,
    gender: 'Nữ',
    drugName: 'Pantoprazol',
    strength: '40 mg',
    unit: 'Lọ',
    quantity: 1,
    route: 'IV',
    orderTime: '06:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột đông khô pha tiêm',
    rowIndex: 21,
  },

  // Test Case: Unmatched Patient (Not in Room List) -> Should go to CẦN KIỂM TRA
  {
    patientCode: 'BN009999',
    medicalRecordCode: 'BA2026/0999',
    patientName: 'Vũ Quốc Huy',
    age: 50,
    gender: 'Nam',
    drugName: 'Meropenem',
    strength: '1 g',
    unit: 'Lọ',
    quantity: 1,
    route: 'Tiêm truyền tĩnh mạch',
    orderTime: '08:00',
    orderDate: '15/08/2026',
    dosageForm: 'Bột pha tiêm',
    rowIndex: 22,
  },

  // Test Case: Ambiguous Homonym (Two 'Nguyễn Văn Hải' in Room List without clear ID)
  {
    patientName: 'Nguyễn Văn Hải',
    drugName: 'Ciprofloxacin',
    strength: '200 mg/100ml',
    unit: 'Chai',
    quantity: 1,
    route: 'IV',
    orderTime: '10:00',
    orderDate: '15/08/2026',
    rowIndex: 23,
  },

  // Excluded Supplies Test Items
  {
    patientName: 'Đỗ Thị Mai',
    drugName: 'Găng tay khám y tế Vglove',
    unit: 'Đôi',
    quantity: 4,
    orderTime: '06:00',
    orderDate: '15/08/2026',
    rowIndex: 24,
  },
  {
    patientName: 'Hoàng Văn E',
    drugName: 'Kim luồn tĩnh mạch 20G BD Insyte',
    unit: 'Cái',
    quantity: 1,
    orderTime: '08:30',
    orderDate: '15/08/2026',
    rowIndex: 25,
  }
];

export const SAMPLE_ROOM_LIST: RawRoomRecord[] = [
  {
    patientCode: 'BN001089',
    medicalRecordCode: 'BA2026/0412',
    patientName: 'Nguyễn Văn A',
    age: 65,
    gender: 'Nam',
    room: 'P101',
    bed: 'G01',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 2,
  },
  {
    patientCode: 'BN003204',
    medicalRecordCode: 'BA2026/0518',
    patientName: 'Phạm Thị D',
    age: 58,
    gender: 'Nữ',
    room: 'P101',
    bed: 'G02',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 3,
  },
  {
    patientCode: 'BN001142',
    medicalRecordCode: 'BA2026/0430',
    patientName: 'Trần Thị B',
    age: 42,
    gender: 'Nữ',
    room: 'P102',
    bed: 'G02',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 4,
  },
  {
    patientCode: 'BN002015',
    medicalRecordCode: 'BA2026/0501',
    patientName: 'Lê Văn C',
    age: 8,
    gender: 'Nam',
    room: 'P103',
    bed: 'G01',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 5,
  },
  {
    patientCode: 'BN004112',
    medicalRecordCode: 'BA2026/0600',
    patientName: 'Hoàng Văn E',
    age: 72,
    gender: 'Nam',
    room: 'P201',
    bed: 'G01',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 6,
  },
  {
    patientCode: 'BN005290',
    medicalRecordCode: 'BA2026/0655',
    patientName: 'Đỗ Thị Mai',
    age: 35,
    gender: 'Nữ',
    room: 'P202',
    bed: 'G01',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 7,
  },

  // Homonym 1
  {
    patientCode: 'BN007101',
    medicalRecordCode: 'BA2026/0701',
    patientName: 'Nguyễn Văn Hải',
    age: 48,
    gender: 'Nam',
    room: 'P203',
    bed: 'G01',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 8,
  },
  // Homonym 2
  {
    patientCode: 'BN007102',
    medicalRecordCode: 'BA2026/0702',
    patientName: 'Nguyễn Văn Hải',
    age: 62,
    gender: 'Nam',
    room: 'P204',
    bed: 'G03',
    department: 'Khoa Nội Tổng Hợp',
    rowIndex: 9,
  }
];

/**
 * Generate Sample Excel File 1: Drug Orders
 */
export function downloadSampleDrugExcel(): void {
  const data: any[][] = [
    ['Mã người bệnh', 'Mã bệnh án', 'Họ và tên người bệnh', 'Tuổi', 'Giới tính', 'Tên thuốc', 'Hàm lượng', 'Đơn vị', 'Số lượng', 'Đường dùng', 'Thời gian y lệnh', 'Ngày y lệnh', 'Dạng bào chế']
  ];

  SAMPLE_DRUG_ORDERS.forEach(r => {
    data.push([
      r.patientCode || '',
      r.medicalRecordCode || '',
      r.patientName,
      r.age || '',
      r.gender || '',
      r.drugName,
      r.strength || '',
      r.unit || '',
      r.quantity || '',
      r.route || '',
      r.orderTime || '',
      r.orderDate || '',
      r.dosageForm || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ThongKeThuoc_TruyenDich');
  XLSX.writeFile(wb, 'FILE_1_Thong_Ke_Thuoc_Truyen_Dich_HIS_Mau.xlsx');
}

/**
 * Generate Sample Excel File 2: Inpatient Room List
 */
export function downloadSampleRoomExcel(): void {
  const data: any[][] = [
    ['Mã người bệnh', 'Mã bệnh án', 'Họ và tên bệnh nhân', 'Tuổi', 'Giới tính', 'Phòng', 'Giường', 'Khoa điều trị']
  ];

  SAMPLE_ROOM_LIST.forEach(r => {
    data.push([
      r.patientCode || '',
      r.medicalRecordCode || '',
      r.patientName,
      r.age || '',
      r.gender || '',
      r.room,
      r.bed || '',
      r.department || 'Khoa Nội Tổng Hợp'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachPhongGiuong');
  XLSX.writeFile(wb, 'FILE_2_Danh_Sach_Benh_Nhan_Theo_Phong_Mau.xlsx');
}
