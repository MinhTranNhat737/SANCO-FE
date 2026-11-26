# Dashboard quản trị

Mở `/admin` (Vite local: `http://127.0.0.1:5173/admin`). Trang được build thành `admin.html`, dùng cấu hình `VITE_API_URL` và cookie đăng nhập chung với website. Vercel `cleanUrls` và backend phục vụ frontend đều hỗ trợ `/admin`.

Đăng nhập bằng tên tài khoản được cấp hoặc email, cùng mật khẩu. Trang có màn hình tải và nút khôi phục khi tải mã thất bại; không để người dùng kẹt ở màn hình trống. Sau `npm run build`, chạy `npm run test:admin-build` để kiểm tra mã đã đóng gói thực sự hiển thị thống kê và danh sách người dùng.

Tài khoản cần được cấp admin từ backend trước khi dùng. Trên máy chủ backend, sau khi tài khoản chủ website đã đăng ký, chạy:

```sh
npm run admin:grant -- owner@example.com
```

Đổi email cho đúng tài khoản và dùng đúng database của website. Nếu backend dùng PGlite, dừng backend trước khi cấp quyền rồi khởi động lại. Quy trình và giới hạn vận hành đầy đủ nằm trong `ADMIN.md` của SANCO-BE.

Dashboard có các mục Tổng quan, Người dùng, Phòng chơi, Lịch sử ván đấu, Luyện tập, Góp ý & báo cáo, Cấu hình website và Nhật ký quản trị. Danh sách hỗ trợ tìm kiếm, bộ lọc phù hợp, phân trang 20 bản ghi và xuất CSV của trang hiện tại. Nút Làm mới tải dữ liệu mới nhất. Hủy phòng và thu hồi phiên có hộp xác nhận; khóa tài khoản yêu cầu lý do. Giao diện dùng được trên desktop và điện thoại; bảng rộng có thanh cuộn ngang.

Mục Người dùng, tổng số người dùng và số trực tuyến chỉ tính tài khoản đã đăng ký. Guest là phiên chơi tạm, không nằm trong danh sách này và được backend tự dọn khi hết phiên; khách vẫn có thể chơi và đăng ký từ phiên đang dùng.

Thông báo do admin lưu xuất hiện ở trang chơi cờ khi người dùng tải lại trang. Việc tạm dừng đăng ký mới và tạo phòng/tìm trận mới được backend thực thi. Không có tài khoản/mật khẩu admin mặc định. Liên kết quản trị ở thanh bên chỉ xuất hiện khi API trả về `user.admin=true`; API tiếp tục kiểm tra quyền độc lập.

Kiểm tra:

```sh
npm run build
npm test
```

`test/admin.test.mjs` kiểm tra màn hình chặn tài khoản thường, dữ liệu thống kê, điều hướng/phân trang/bộ lọc, bảo vệ tự khóa/gỡ quyền, giữ nội dung khi lưu báo cáo thất bại, thử lại thành công, cấu hình bật/tắt và mất quyền admin.
