# Sân Cờ — Frontend React + Three.js

```sh
npm install
npm run dev
```

Mở `http://127.0.0.1:5173/`. Chạy backend trong `../be/` ở cổng 3001. Vite chuyển tiếp `/api` và `/socket.io`, nên cookie phiên hoạt động qua cùng origin.

```sh
npm run build
npm run typecheck
npm test
```

## Chọn bàn và tạo phòng

Sảnh có 10 môn: Caro, Cờ vua, Cờ tướng, Cờ lật, Nối bốn, Cờ vây 9×9, Cá ngựa (Ludo), Tỷ phú mini, Cờ đam Anh và Cờ ba quân. Bấm thẻ môn để chọn **Chơi với bạn** hoặc **Luyện tập với máy**. Tạo phòng cho phép chọn lại môn, thời gian 3/5/10/15 phút mỗi người và bên quân. Cá ngựa/Tỷ phú mini chọn 2–4 ghế; các môn khác 2 ghế. Đủ người và tất cả sẵn sàng mới bắt đầu. Có đầu hàng, đổi bên đấu lại và xem lại; xin hòa chỉ áp dụng phòng hai bên, không áp dụng hai trò xúc xắc.

Phòng của tôi và lịch sử hiển thị đúng môn. `?room=<id>` mở phòng đã tham gia; người mới cần liên kết có token mời. `?replay=<match-id>` mở lại ván đã lưu. Bàn online dùng cùng 2D/3D, gợi ý nước hợp lệ và animation như luyện tập. Cờ tướng có ghi rõ quy ước luật tại Sân Cờ.

## Luyện tập

Chọn **Luyện tập với máy** hoặc một thẻ môn cờ. Cả 10 môn có bot nội bộ; chọn mức Dễ/Vừa/Khá và bên quân, sau đó bắt đầu. Ván được lưu ở backend và xuất hiện trong **Luyện tập gần đây**. URL `?practice=<id>` mở lại ván thuộc phiên/tài khoản hiện tại.

- Mặc định là bàn 2D đúng tỉ lệ. 3D là tùy chọn cho tám môn trên lưới, khởi đầu từ góc nhìn vuông góc; dùng camera orthographic để các cạnh đối luôn song song. Kéo để xoay tự do, góc nghiêng thấp nhất 30° so với mặt bàn để tránh quân che kín ô. Chế độ 3D chỉ tải khi bật; Cá ngựa/Tỷ phú mini dùng bảng SVG vuông chuẩn.
- Chạm quân rồi chạm ô đích được đánh dấu. Bật **Xác nhận nước đi** để kiểm tra trước khi gửi; mặc định bật trên màn hình cảm ứng.
- **Cân bàn** trả camera về vuông góc để ô hiện vuông; vẫn có thể kéo xoay sau đó. Không dùng CSS kéo giãn hoặc sửa hình thang giả. Góc 3D nghiêng tự nhiên làm ngắn chiều sâu, nên chọn 2D hoặc Cân bàn khi cần lưới vuông.
- Cờ vua có hộp chọn bốn loại quân phong cấp.
- Cờ lật đánh dấu các ô kẹp được quân, hiển thị số quân và tự bỏ lượt nếu hết nước. Nối bốn cho phép bấm vào cột, tự chọn ô thấp nhất còn trống; bàn 2D giữ hướng rơi khi chọn bên đi sau.
- **Đi lại** hoàn tác lượt của bạn và nước bot; các trò xúc xắc không hỗ trợ đi lại.
- Chọn một nước trong lịch sử để xem lại; **Về ván hiện tại** tiếp tục chơi.
- Nút **2D** dùng cùng dữ liệu và luật với bàn 3D. Thiết bị không có WebGL tự chuyển sang 2D. Bàn 2D hỗ trợ phím mũi tên và Enter.
- Chọn quân sẽ nhấc nhẹ quân tại chỗ. Chỉ nước được máy chủ xác nhận mới có chuyển động nhấc → di chuyển → đặt xuống. Mã đi theo đường chữ L; nhập thành chuyển cả Vua và Xe; bắt tốt qua đường bỏ đúng Tốt bị ăn; phong cấp đổi model sau khi đặt Tốt xuống.
- Nước bot đến sớm được xếp sau animation đang chạy. Đồng bộ lại cùng thế cờ không phát lại nước cũ; thao tác được khóa cho đến khi chuỗi chuyển động hoàn tất.

## Các môn mới và giới hạn luật

- Cờ vây 9×9: bắt quân, khí, cấm tự sát và superko; hai lượt bỏ kết thúc, diện tích + komi 6,5. Chưa đánh dấu quân chết/thỏa thuận điểm; cần dọn quân chết trước khi bỏ lượt.
- Cá ngựa dùng biến thể Ludo, 4 quân/người, xuất chuồng bằng 6, ô an toàn, về đích đủ số. Không chặn đường/ba lần 6.
- Tỷ phú là bản **mini riêng**, 20 ô, 1 xúc xắc, vốn 1.500, tối đa 3 nhà, bán tài sản, trả nợ và phá sản; 30 vòng so tài sản. Không có đấu giá, trao đổi, thế chấp, khách sạn.
- Cờ đam Anh: bắt buộc ăn, ăn liên tiếp, phong Vua và dừng lượt khi phong. Cờ ba quân 3×3 có bot minimax.

## Kết nối

WebSocket có ack và HTTP fallback dùng cùng actionId; gói delta có moveCount/version, thiếu gói tải lại snapshot. Ít polling khi online (30 giây kiểm tra nền), resync khi reconnect. Chỉ số ms là RTT ping. Three.js nằm trong chunk riêng, không nằm trong đường tải 2D. Cấu hình chuẩn bị deploy tại [deploy/README.md](../deploy/README.md).

## Mã giao diện

- `src/compact.css`: bố cục ít chữ, hành động chính rõ ràng, luật và lịch sử mở khi cần. Trên điện thoại, thiết lập luyện tập xuất hiện trước bàn. Form tạo phòng thu gọn phần đổi tên và luật.
- `src/start.ts` và `src/AppErrorBoundary.tsx`: màn hình tải/khôi phục khi import hoặc render lỗi, thay vì để nền trống. `dev-diagnostics.ts` chỉ ghi lỗi khởi động vào bộ nhớ máy phát triển; không được đưa vào production.
- `src/GameCatalog.tsx`: danh sách môn có lọc và bộ chọn môn trong form tạo phòng.
- `src/RoomView.tsx`: phòng chờ, đồng hồ, bàn nhiều môn, hành động ván và xem lại.
- `src/FlatBoard.tsx`: bàn 2D có tọa độ và hỗ trợ bàn phím, dùng chung online/luyện tập.
- `src/collection.css`: sảnh chọn cờ, form tạo phòng và giao diện online.
- `src/Practice.tsx`: thiết lập, điều khiển và lịch sử luyện tập.
- `src/SceneBoard.tsx`: bàn Three.js, ánh sáng, tương tác raycast, góc nhìn và chuyển động quân.
- `src/three/pieces.ts`: quân Cờ vua từ hình khối/đường tiện, quân Cờ tướng với texture chữ; tất cả dựng bằng mã, không tải model ngoài.
- `src/three/board-layout.ts`: tọa độ chuẩn và camera giữ đồng nhất tỉ lệ pixel/đơn vị.
- `src/three/board-motion.ts`: kiểm tra chuyển trạng thái đã xác nhận và đường đi của animation.
- `src/practice-types.ts`: kiểu dữ liệu và nhãn theo môn.
- `src/practice.css`: bố cục luyện tập và bàn 2D.
- `src/theme.css`: tông xanh rừng tối và các màu tương phản.

Scene giới hạn mật độ điểm ảnh và tốc độ khung hình, dừng vẽ khi ngoài màn hình hoặc tab bị ẩn, giải phóng geometry/material/texture khi rời trang, và tôn trọng lựa chọn giảm chuyển động.

`npm test` kiểm tra tỉ lệ chiếu, chọn ô sau resize/zoom/đổi bên, các pha chuyển động, Mã, nhập thành, bắt tốt qua đường, phong cấp và đồng bộ liên tiếp từ bot.

Kiểm tra `startup.test.mjs` mount React trong DOM giả lập, tải phiên khách, mở form tạo phòng và xác nhận bàn Cờ vua/luyện tập có 64 ô. Test dùng cache Vite riêng trong thư mục tạm, không đụng cache của dev server. Nếu cần chạy lại server khác để thử, luôn tách cache; dev server chính dùng `node_modules/.vite-sanco`.
