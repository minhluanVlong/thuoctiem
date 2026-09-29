import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // AI Matrix Extraction Endpoint
  app.post('/api/extract-matrix', async (req, res) => {
    try {
      const { images, text } = req.body;

      if (!ai) {
        return res.status(400).json({
          success: false,
          error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng cấu hình API Key trong Settings > Secrets hoặc dùng tính năng Nạp Dữ Liệu Mẫu.',
        });
      }

      const promptParts: any[] = [];

      if (images && Array.isArray(images) && images.length > 0) {
        for (const img of images) {
          promptParts.push({
            inlineData: {
              data: img.data,
              mimeType: img.mimeType || 'image/jpeg',
            },
          });
        }
      }

      const userTextPrompt = `Bạn là trợ lý y tế chuyên bóc tách dữ liệu từ hình ảnh báo cáo y lệnh, chuyển đổi thành bảng dữ liệu ma trận "SỔ THUỐC TIÊM & KHÍ DUNG (MA TRẬN Ô LY)" với độ chính xác tuyệt đối 100%.

### 1. QUY TẮC CỘT ĐỘNG (DYNAMIC COLUMNS) - KHÔNG ĐƯỢC BỎ SÓT THUỐC:
- Quét toàn bộ hình ảnh để lấy TẤT CẢ các loại thuốc thực tế có y lệnh trong ngày.
- BẮT BUỘC hiển thị thuốc ESOGAS (hoặc bất kỳ thuốc tiêm/uống/khí dung nào khác xuất hiện) thành cột riêng biệt nếu bệnh nhân có dùng. Không giới hạn cứng danh mục thuốc.
- Thứ tự các cột thông tin cố định ban đầu:
  1. STT
  2. Họ và tên người bệnh (kèm số giường nếu có)
  3. Tuổi
  4. Phòng / Buồng (HS, HSCC, Buồng 1,...)
- Tiếp theo là các cột thuốc tiêm và thuốc khí dung phát sinh theo dữ liệu.

### 2. QUY TẮC ĐẶC BIỆT CHO THUỐC PHUN KHÍ DUNG (VINSAMOL & ZENSONIDE):
- Số lần phun khí dung KHÔNG CỐ ĐỊNH, phụ thuộc hoàn toàn vào số lượt y lệnh thực tế của bác sĩ (có thể là 1 lần, 2 lần, 3 lần hoặc hơn).
- Bắt buộc kiểm tra và đếm đủ số lượt y lệnh trong ngày của bệnh nhân:
  + Ghi rõ tổng số lần thực hiện (Ví dụ: 1 lần, 2 lần, 3 lần).
  + Ghi rõ các mốc thời gian thực hiện (Ví dụ: "07:00 - 15:00", "08:00 - 14:00 - 20:00",...).
  + Nếu bệnh nhân dùng cả Vinsamol và Zensonide: Phải phân biệt rõ số lần/thời gian của Vinsamol và Zensonide (ghi chú rõ nếu có dùng kèm "+ có Zensonide [số lần]").

### 3. NGUYÊN TẮC ĐIỀN DỮ LIỆU TẠI CÁC Ô GIAO NHAU (BỆNH NHÂN x THUỐC):
- Nếu bệnh nhân CÓ y lệnh dùng thuốc đó:
  + Dòng 1: Liều lượng / Số lần y lệnh thực tế (ví dụ: 1 x 3, 2/3, 1, 2, 3).
  + Dòng 2: Mốc thời gian thực hiện y lệnh (ví dụ: 7:15 - 15:15 - 23:15, 08:00 - 16:00).
  + Dòng 3: Chi tiết nguyên văn tên thuốc, hàm lượng, dung môi pha từ cột "Ghi chú" (chính xác 100%, không viết tắt, không sửa chữ).
- Nếu bệnh nhân KHÔNG có y lệnh dùng thuốc đó: Điền dấu chấm . hoặc để trống.

### 4. LƯU Ý ĐẶC BIỆT VỀ ĐỘ CHÍNH XÁC (ĐÚNG TUYỆT ĐỐI 100%):
- Số lần y lệnh của Vinsamol và Zensonide: Đếm đủ số lần y lệnh thực tế của bác sĩ trong ngày (ví dụ: bác sĩ kê 3 lần thì BẮT BUỘC ghi nhận 3 lần và đủ 3 mốc giờ như "07:00 - 13:00 - 19:00", TUYỆT ĐỐI KHÔNG ĐƯỢC gộp giảm thành 2 lần).
- Liều lượng thuốc tiêm và thuốc kháng sinh: Người bệnh tiêm 1 lọ thì BẮT BUỘC ghi 1 (hoặc "1 x 3", "1 x 2" tùy số lần tiêm), KHÔNG ĐƯỢC nhầm lẫn ngày tháng (ví dụ: ngày 2/3, 02/03) thành phân số liều "2/3 lọ". Chỉ ghi phân số (2/3, 1/2) khi có chỉ định liều lượng cụ thể của bác sĩ (ví dụ liều cho bệnh nhi).
- Cần đúng tuyệt đối tên thuốc, hàm lượng, dung môi pha, liều lượng tiêm cũng như số lần thực hiện.

### 5. ĐỊNH DẠNG ĐẦU RA (JSON CHUẨN MA TRẬN):
Trả về JSON thuần túy theo cấu trúc:
{
  "danh_sach_cot_thuoc": [
    {"ma": "acetyl_leucin", "ten_hien_thi": "Acetyl leucin 500mg", "duong_dung": "TMC"},
    {"ma": "cefotaxim", "ten_hien_thi": "Cefotaxim 1g", "duong_dung": "TMC"},
    {"ma": "ceftazidim", "ten_hien_thi": "Ceftazidim 1g", "duong_dung": "TMC"},
    {"ma": "hydrocortison", "ten_hien_thi": "Hydrocortison 100mg", "duong_dung": "TMC"},
    {"ma": "omevin", "ten_hien_thi": "Omevin 40mg", "duong_dung": "TMC"},
    {"ma": "esogas", "ten_hien_thi": "Esogas 40mg", "duong_dung": "TMC"},
    {"ma": "vinsamol", "ten_hien_thi": "Vinsamol 5.0", "duong_dung": "PKD"},
    {"ma": "zensonide", "ten_hien_thi": "Zensonide", "duong_dung": "PKD"}
  ],
  "du_lieu_benh_nhan": [
    {
      "stt": 1,
      "ho_ten": "Họ và tên bệnh nhân",
      "giuong": "Giường...",
      "tuoi": "...",
      "phong": "HSCC",
      "y_lenh": {
        "vinsamol": {
          "tong_so_lan": 3,
          "thoi_gian": "07:00 - 13:00 - 19:00",
          "ghi_chu_kem": "+ có Zensonide 2 lần (07:00 - 19:00)",
          "chi_tiet": "Vinsamol 5.0mg/2.5ml PKD"
        },
        "esogas": {
          "tong_so_lan": 1,
          "thoi_gian": "07:00",
          "chi_tiet": "Esogas 40mg pha tiêm TMC"
        }
      }
    }
  ]
}
${text ? `\nThông tin văn bản bổ sung:\n${text}` : ''}`;

      promptParts.push({ text: userTextPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptParts,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim());
      } catch (e) {
        const cleaned = responseText.replace(/```(?:json)?/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error('Error in /api/extract-matrix:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Lỗi xử lý bóc tách y lệnh',
      });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
