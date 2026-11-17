# Bộ quân Việt Nam — Sân Cờ

Đây là 11 mô hình cách điệu dựng riêng cho trò chơi, tham chiếu hình dáng
khí tài và quân phục trong ảnh tư liệu công khai; không phải bản quét hay
mô hình kỹ thuật theo kích thước thực. Các ảnh nguồn không được sao chép
vào GLB. Chi tiết nguồn tham khảo cho từng quân có trong `manifest.json`.

| Quân | Hướng thể hiện |
| --- | --- |
| Tư lệnh | Quân phục ô liu, mũ kê pi, cổ áo đỏ, cầu vai |
| Bộ binh | Quân phục xanh, mũ cối, ba lô, súng dáng AK |
| Dân quân | Nữ dân quân mũ mềm, tóc dài, quân phục xanh |
| Xe tăng | Dáng T-54B, tháp pháo đúc tròn, 5 bánh chịu tải mỗi bên |
| Công binh | Xe cầu kiểu TMM, xe ba cầu với nhịp cầu gấp |
| Pháo | Pháo kéo ba càng, hai bánh, khiên pháo |
| Cao xạ | Dáng ZU-23-2, hai nòng, hai bánh và ghế pháo thủ |
| Tên lửa | Dáng SAM-2/S-75, bệ nghiêng và một tên lửa dài có cánh |
| Máy bay | Dáng Su-30MK2, hai động cơ, hai đuôi đứng, buồng lái nối tiếp |
| Hải quân | Dáng tàu Gepard 3.9, pháo trước, đài chỉ huy, cột radar, sàn đuôi |
| Sở chỉ huy | Hầm đất, bao cát, ăng ten và quốc kỳ |

Màu khí tài/quân phục giữ tự nhiên cho cả hai phe; màu đế Đỏ/Xanh phân biệt
người chơi. Các mô hình có thêm nhãn và huy hiệu anh hùng trong runtime.

Nguồn tạo hình: [vietnam-models.ts](../../../../src/three/vietnam-models.ts),
danh mục tham chiếu trong `fe/src/vietnam-profile.ts`. Tạo lại GLB bằng
`npm run models:vietnam` tại `fe/`. Không cần Blender hay dịch vụ trả phí.

Các GLB trong thư mục này là hình học gốc của dự án, ghi `Project-original`
trong manifest. Đây không phải các model nhập từ Kenney/3DAssets/Poly Pizza
ở thư mục cha; nguồn và giấy phép của các bản tải trước vẫn được giữ riêng.
