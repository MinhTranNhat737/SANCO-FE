# Audit mạng và request storm ngày 24 tháng 11 năm 2026

Phạm vi: SANCO-FE và SANCO-BE, sự cố 4.861.075 CDN Requests được báo cáo tập trung ngày 20–21/11/2026. Đã chứng minh và sửa một đường gọi HTTP đệ quy, polling chồng request và các khoảng trống giới hạn tải. Chưa thể kết luận chúng đã tạo ra số request production nói trên: không có log theo path/status/IP/user-agent hoặc biến build của deployment cũ. Trang chủ hợp lệ không tái hiện request storm trong phép đo trình duyệt 5 phút.

## Đối chiếu lịch sử

| Repo | Mốc trước 20/11 theo giờ Việt Nam | Mốc triển khai hoặc HEAD lúc bắt đầu | Kết quả |
| --- | --- | --- | --- |
| FE | `bf59ae6`, 19/11 23:37:26 | `4815172`, 20/11 13:16:38 | `acceptRoom`, merge delta, nhịp polling và reconnect đã tồn tại trước 20/11. Thay đổi `api.ts` chủ yếu là bản dịch. |
| BE | `1f35d6b`, 19/11 23:37:26 | `4b7c577`, 20/11 12:24:44 | Diff đổi thời lượng Monopoly và đồng hồ lượt; không đổi `app.js`, `wire.js`, rate limit hay tuyến API. |

FE HEAD lúc bắt đầu chính là `4815172`; hai sửa dở trong `VietnamEstateBoard.tsx` và `three/party-models.ts` được giữ nguyên, không đưa vào commit audit. `a675f73` ngày 20/11 thêm Analytics vào `src/main.tsx:3,17`. Không có thay đổi `vercel.json` giữa mốc trước 20/11 và deployment. Sự trùng ngày của Analytics và sự cố chưa chứng minh quan hệ nhân quả.

## Lỗi đã chứng minh và bản sửa

Vị trí dưới đây thuộc bản sửa audit; vị trí cũ quan trọng được nêu trong mô tả. Phép thử dữ liệu lỗi là dữ liệu chủ động gây lỗi trong môi trường cục bộ, không phải log thu được từ production.

| Mức độ | File và dòng | Nguyên nhân và kết quả |
| --- | --- | --- |
| Nghiêm trọng | `src/App.tsx:90`, `src/live-state.ts:25` | `acceptRoom` cũ dòng 89 tải `/rooms/:id` rồi gọi lại chính nó nếu merge thất bại. Test chạy chính code `4815172`: 1 packet lỗi gây 1.000 HTTP GET liên tiếp, test chủ động cắt tại 1.000. Receiver mới chỉ có 1 recovery đang chạy, cooldown 30 giây, tối đa 3 recovery cho cùng tài nguyên khi snapshot tiếp tục sai; snapshot lỗi không vào lại recovery. |
| Cao | `src/live-state.ts:1` | Packet null, thiếu version/game hoặc `base.moves` có thể làm merge ném lỗi. Đã kiểm tra envelope, version, board/phase khi state hiện có yêu cầu chúng, moveCount và movesAppend; giữ state mới hơn khi HTTP trả chậm. Bản ghi phòng khác không được thay thế state hiện tại. |
| Cao | `src/Practice.tsx:46` | Mỗi delta lỗi trước đây tạo một GET riêng; kết quả snapshot ghi thẳng, có thể khôi phục nhầm ván đã rời hoặc ghi đè state mới. Dùng cùng receiver có giới hạn, kiểm tra lại tài nguyên đang mở và merge theo version; cleanup bỏ tham chiếu khi unmount. |
| Cao | `src/network-policy.ts:11`, `src/App.tsx:162`, `src/Practice.tsx:63` | Interval 1,5/5 giây ngắn hơn fetch timeout 12 giây. Timer cũ có thể khởi phát request mới khi request trước chưa xong. Scheduler mới đợi hoàn tất, một tick đang chạy, pause khi hidden/offline; 401/403/404/410 dừng, lỗi tạm thời dùng backoff+jitter, tôn trọng Retry-After. |
| Trung bình | `src/Matchmaking.tsx:81` | Đã có cờ chống chồng poll, nhưng interval 1,8 giây tiếp tục cố định khi lỗi. Chuyển sang scheduler chung, giữ nhịp khỏe mạnh và hủy tìm trận khi rời trang; không thay lease 20 giây hoặc thuật toán ghép trận. |
| Trung bình | `src/network-policy.ts:1`, `src/App.tsx:133` | Socket.IO vốn đã có exponential backoff và jitter mặc định, nhưng cấu hình cũ trần 3 giây, retry vô hạn. Đổi thành 1–30 giây, jitter 0,5, tối đa 8 reconnect mỗi đợt; đợt tiếp theo phải chờ ít nhất 60 giây và tab khả dụng. 401 hoặc server thu hồi phiên không tự reconnect. HTTP fallback vẫn đồng bộ khi mất socket. |
| Trung bình | `src/App.tsx:96` | Connect và effect phòng từng có thể gửi trùng `watch-room`. Dùng khóa socket-id/room-id cho một subscription snapshot. Không phát watch vào bộ đệm khi socket đang ngắt. |
| Trung bình | `src/api.ts:6`, `src/live.ts:4`, `src/App.tsx:252`, `src/Practice.tsx:81` | Gộp GET cùng URL đang chạy, không cache response dài hạn; mutation vô hiệu nhóm đọc đang chia sẻ. Bỏ retry HTTP tức thì thứ hai sau TypeError. Cùng actionId được giữ khi socket mất ACK rồi fallback HTTP; cờ đồng bộ ngăn hai click trước lần render tiếp theo tạo hai actionId. SQL receipts và kiểm tra version được giữ nguyên. |
| Cao khi cấu hình sai | `src/api-origin.ts:1`, `vite.config.ts:11` | URL có `/api` gây `/api/api`; URL trống trên Vercel nhắm frontend không có backend proxy. Kiểm tra HTTP(S) origin, bỏ slash/space, từ chối path/query/credentials; build Vercel dừng rõ lỗi khi thiếu HTTPS backend hoặc trỏ ngược frontend đã biết. Đã thử build thiếu biến và xác nhận bị chặn. Giá trị deployment cũ chưa xác minh được. |
| Cao về tải backend | BE `src/app.js:69`, `src/traffic-guard.js:3` | Trước đây nhiều GET công khai/xác thực và watch-room không có ngân sách tải. Thêm 1.200 API request/IP/phút trước session/SQL; tối đa 128 HTTP đang xử lý, 16/IP; giới hạn hash mật khẩu thực tế 4 toàn tiến trình, 2/IP, kể cả khi client bỏ kết nối. Socket handshake/auth 120/IP/phút, event 360/user/phút và watch 60/user/phút. Giữ các hạn mức action/login/register sẵn có. |
| Trung bình | BE `src/app.js:206,231`, `src/traffic-guard.js:9` | Socket trả status 401 cho phiên sai, watch kiểm tra lại phiên. IP handshake dùng cùng chính sách trusted proxy với Express; không gom tất cả người dùng sau Heroku/nginx vào IP proxy. Map giới hạn có trần 20.000 mục. |
| Trung bình | BE `src/oauth.js:27` | Bốn fetch tới nhà cung cấp OAuth trước đây không có deadline. Thêm timeout 10 giây, không tự retry. Luồng state ký, nonce cookie và return-origin allowlist được giữ nguyên. |
| Cao theo advisory | Hai `package-lock.json`, FE `package.json` | Cập nhật Vite 8.0.13 lên 8.3.8 và dependency tương thích; BE cập nhật body-parser/qs qua lockfile, bỏ zod không được import. Cả hai `npm audit` hiện báo 0. Đây là phát hiện dependency, không phải bằng chứng lỗ hổng đã bị khai thác. |

Polling khỏe mạnh vẫn dùng 30 giây khi socket kết nối; fallback phòng 5 giây và AI đang nghĩ 1,5 giây. Thêm jitter tối đa 10% và thời gian hoàn tất request. Backoff lỗi trần cơ sở 60 giây, sau jitter tối đa 72 giây. Socket tiếp tục gửi nước đi ngay, không đi qua timer polling. Không sửa luật, SQL dữ liệu, Elo, bộ máy cờ hoặc giao diện.

## Request nào đi qua Vercel

| Request | Đích do mã nguồn quyết định | Tính vào CDN của frontend Vercel |
| --- | --- | --- |
| HTML, `/assets/*`, `/thumbs/*`, `/models/*`, CSS public, favicon, trang `/choi/*` | Origin của website | Có, nếu origin đó được Vercel phục vụ; cache hit ở CDN vẫn là request. |
| `/api/*`, gồm room/practice/matchmaking/ratings/auth | `${VITE_API_URL}/api/*` | Không nếu URL là backend độc lập không qua Vercel; có nếu đi vào host Vercel hoặc proxy qua Vercel. |
| `/socket.io/*`, handshake và long-polling fallback | `io(VITE_API_URL || location.origin)` | Cùng quy tắc origin như API. Frame trên WebSocket đang mở không phải một HTTP request riêng cho mỗi frame. |
| `/_vercel/insights/script.js`, sự kiện Analytics khi script hoạt động | Origin website | Đi vào Vercel nếu website ở đó. Local backend không cung cấp script này nên test local chỉ đo lần tải script, không đại diện số sự kiện Analytics production. |
| Google Fonts CSS/woff2 | `fonts.googleapis.com`, `fonts.gstatic.com` | Không đi qua CDN frontend. |
| OAuth token/profile | Backend gọi Google/Facebook | Không đi qua Vercel frontend. Redirect trình duyệt về trang sau đăng nhập vẫn tải HTML từ origin website. |

`vercel.json` chỉ có cleanUrls, trailingSlash và header noindex theo query; không có redirect/rewrite API, SPA catch-all hoặc vòng rewrite. Vite proxy `/api` và `/socket.io` chỉ áp dụng máy chủ phát triển. Docker/nginx phục vụ frontend và backend cùng origin, khác cách triển khai Vercel tĩnh. Muốn xác định tuyến production ngày 20–21/11 cần biến **build** VITE_API_URL hoặc bundle đúng deployment; biến đặt sau build không đổi bundle cũ.

Vercel xác nhận static assets và functions đều tạo CDN Requests; tối ưu CDN cache không có nghĩa request từ trình duyệt biến mất: [CDN usage](https://vercel.com/docs/manage-cdn-usage). Không thể dùng số nước đi hay WebSocket ping để suy ra trực tiếp CDN Requests.

## Tải lại trang và tài nguyên

Đã quét toàn bộ source, build config, public-page generator, scripts và manifest được Git theo dõi. Không có axios, service worker, auto-refresh trang, hoặc prefetch theo viewport của router. `location.reload()` trong `AppErrorBoundary.tsx` và `start.ts` chỉ chạy khi bấm nút. Các timer trong board/RoomView/PartyRoom cập nhật animation, dice hoặc đồng hồ cục bộ, không gọi mạng.

`index.html:11` preload ảnh caro một lần; lazy component và modulepreload tải chunk lúc cần. `three/commander-models.ts:9` chia sẻ Promise tải 11 GLB giữa các instance; xóa entry lỗi để lần mount do người dùng có thể thử lại, không có retry timer. Không thay logic này thành cache lỗi vĩnh viễn. `GameCatalog.tsx` dùng lazy ảnh; không tự tải lặp vô hạn.

BE `app.js` phục vụ assets có hash với cache immutable một năm, HTML no-cache, ảnh public một giờ; API no-store. API sai đường dẫn và file thiếu trả 404, không trả index.html giả JSON. Phía FE giữ nguyên HTTP status khi body không phải JSON, giúp poll dừng ở 404 thay vì biến mọi lỗi thành 503. Header/cache thực tế trên Vercel cũ chưa có bản ghi để đối chiếu; không gán cache localhost cho production.

## Bot và tác vụ tự động

Rate limit bảo vệ việc xử lý ở backend, không xóa CDN request đã tới Vercel; bot đánh HTML/ảnh cần được chặn ở hosting/CDN. CORS và robots.txt không phải cơ chế xác thực bot. Không thêm CAPTCHA vào nước đi hoặc làm chậm realtime. Hạn mức hiện tại là trong từng tiến trình; nhiều replica cần ngân sách chung ở edge/store dùng chung. Chưa có bằng chứng xác định bot nào gây sự cố.

Hai repo không có workflow `.github` hoặc cron lịch chạy trong Git. Scripts bench/test chỉ chạy khi gọi, tạo ứng dụng cục bộ; engine installer tải GitHub lúc cài/build backend. Timer dọn session/rank queue chạy SQL mỗi phút; room expiry/inactivity và AI workers không gọi frontend HTTP. Cấu hình workspace ngoài Git có Docker HEALTHCHECK gọi **localhost `/api/ready` mỗi 30 giây**, PostgreSQL healthcheck mỗi 10 giây; chúng không gọi CDN Vercel. Không có cấu hình monitor bên ngoài để xác minh UptimeRobot hoặc dịch vụ tương tự. Không thay hoặc tuyên bố push các file workspace ngoài repo.

## Logging có giới hạn

FE `src/request-diagnostics.ts:1` đếm theo nhóm endpoint, xóa query và ID phòng, tối đa 64 nhóm; cảnh báo console một lần/nhóm/phút khi vượt 60 request. BE `src/traffic-guard.js:3` tổng hợp request bị chặn, log tối đa một dòng/phút cho guard, chỉ gồm event/scope/số lượng, không IP/cookie/token. Không có request telemetry, interval gửi log, hoặc tài khoản giám sát mới. Các log lỗi API sẵn có không bị thay thành dịch vụ bên ngoài.

## Số đo và kiểm thử

Môi trường: Windows, Node 24.20.0, Chrome headless, production build, backend HTTP + Socket.IO với PGlite tách biệt. Cùng toolchain build cho các mốc Git để so sánh code ứng dụng. Dữ liệu chỉ là tài khoản/ván test; không kết nối DB production. HTTP dưới đây là request trình duyệt quan sát, không cộng frame WebSocket. Chi tiết: [browser.json](docs/audit-2026-11-24/browser.json), [scenarios.json](docs/audit-2026-11-24/scenarios.json).

| Kịch bản | Trước sửa | Sau sửa hoặc kết quả đo |
| --- | --- | --- |
| Tải home, viewport 1440×1000, cache mới | `bf59ae6`: 50 HTTP; `4815172`: 50 HTTP | 50 HTTP. Mỗi bản có 4 API, 15 request font ngoài origin, 35 request cùng origin; handshake WebSocket được theo dõi riêng, không nằm trong 50. |
| Home để yên ít nhất 300 giây thực | Cả hai mốc: 0 HTTP mới | 0 HTTP mới; thời gian đo bản sửa 300.011 ms. Không tái hiện storm từ home. |
| Một stream thiếu move history | Code `4815172`: 1.000 GET rồi test cắt | Test hồi quy: một recovery đang chạy; snapshot liên tục lỗi chỉ được tối đa 3 lần tự phục hồi. |
| 100 packet lỗi liên tiếp trong Chrome | Chưa đo bản cũ trong Chrome | Số GET thực tế và poll trùng thời điểm nằm trong scenarios.json; không tăng theo số packet. Unit test xác nhận một recovery. |
| Backend chậm 12 giây | Interval có thể phát tick mới khi request cũ còn chờ | Test fake timer tiến 12 giây: chỉ một lần gọi trong khi Promise chưa hoàn tất. |
| Outage 300 giây mô phỏng | Nhịp phòng 5 giây: khoảng 60 tick, tính từ cấu hình, không phải số đo production | Test backoff: tối đa 10 lần gọi, không overlap; Retry-After 120 giây không sinh thêm timer thứ hai. |
| Chơi online thực | Nhịp khỏe mạnh vốn là 30 giây | Browser thực hiện hai nước đi, không POST action HTTP khi socket khỏe; counts theo path ở scenarios.json. Bộ test online chạy 16 loại, 127 nước đi, 0 lỗi. |
| Mất mạng 20 giây rồi bật lại | Chưa có benchmark browser cũ tương đương | Browser cắt transport và offline context, tự kết nối lại sau phục hồi; count riêng tab ảnh hưởng nằm trong scenarios.json. |
| Chuyển/mở nhiều tab | Mỗi tab có socket và poll riêng | Ba tab, hai lần chuyển; đo request và document.hidden trong scenarios.json. Unit test riêng xác nhận hidden dừng poll. Giữ socket ở các tab để không mất cập nhật nước đi. |
| Rời phòng | Response về muộn từng có thể thay state practice | Không mở lại bởi packet muộn; tab đã rời không GET phòng trong 33 giây. |
| Logout/hết hạn | Poll 401 vẫn tiếp tục | 401 dừng scheduler, Socket.IO báo terminal 401; logout thực trả 401 khi đọc phòng bằng phiên đã thu hồi. |
| ACK bị mất, retry nước đi | SQL đã có receipts và version | Test socket→HTTP giữ actionId, chỉ một HTTP fallback; test online gửi lại 127 hành động qua HTTP, không tăng số nước đi/version. |

FE: `npm test` **137 pass**, `npm run lint`, `npm run typecheck`, `npm run build` pass trên worktree audit không gồm sửa dở. BE: `npm test` **147 pass**, `npm run lint`, `npm run test:online` pass; native engine suite **3 pass**, gồm Stockfish/Fairy-Stockfish thực. `npm audit` toàn dependency hai repo: **0 vulnerabilities**. Lint kiểm tra các lỗi cú pháp/luồng cơ bản, không được hiểu là một chứng minh toàn bộ bảo mật. Build còn cảnh báo chunk Three.js lớn đã có sẵn.

Bộ UI test bao phủ tạo phòng, board và AI setup của tất cả: caro, chess, xiangqi, reversi, connect4, go, ludo, monopoly, checkers, tictactoe, coganh, ataxx, breakthrough, loa, isolation, commander. Các test BE còn kiểm tra quyền phòng, chờ/ready, nước hợp lệ, lưu/khôi phục, replay, rematch, inactivity, Elo và matchmaking. Practice/AI là chế độ dựa vào backend; không có service worker hay chế độ chơi offline hoàn chỉnh để tuyên bố ván AI vẫn tiếp tục khi mất mạng. Offline trong phép thử là tình huống mất kết nối và phục hồi.

## Chạy lại

Trong FE: `npm ci`, `npm run lint`, `npm test`, `npm run typecheck`, `npm run build`. Test UI cần repo BE nằm cạnh FE như workspace hiện tại. Khi có sửa dở không liên quan, tạo worktree audit từ HEAD, chép riêng source/test/config audit sang, dùng dependency cùng lockfile; không chép hai file 3D đang sửa dở. Typecheck trực tiếp ở working tree ban đầu vẫn có thể lỗi `party-models.ts:115` do union thiếu depth/unit; audit không sửa hoặc commit phần đó.

Browser harness giả định ba thư mục cạnh FE: `.audit-before` tại `bf59ae6`, `.audit-deployed` tại `4815172`, `.audit-fe` chứa bản sửa và đã build. Trong FE chạy `node --import ../be/test/environment.mjs scripts/audit-browser.mjs` và `node --import ../be/test/environment.mjs scripts/audit-scenarios.mjs`. Mặc định cần Chrome hệ thống; có thể đặt CHROME_PATH. Không chạy đồng thời hai instance của cùng harness vì dùng cổng 31991–31994. Để trống AUDIT_IDLE_MS để đo đủ 5 phút. Harness chỉ dùng localhost và DB tạm/memory, không dùng backend production.

Trong BE: `npm ci`, `npm run lint`, `npm test`, `npm run test:online`; `npm run test:engines` yêu cầu engine cục bộ đã cài, không commit binary. Các output test và dependency audit nằm ngoài staging, chỉ lưu JSON đo trình duyệt đã loại dữ liệu riêng tư trong docs.

## Điều kiện production còn cần kiểm chứng

Nguồn gốc con số 4.861.075 vẫn chưa xác định: cần phân bố path/status, traffic theo giờ, user-agent/IP đã ẩn danh, HTTP transport, domain và VITE_API_URL được nhúng ở deployment `4815172`. Các giả thuyết còn mở là bot/crawler, tài nguyên bị gọi ngoài ứng dụng, traffic người dùng, monitor sai tuyến, hoặc client lỗi gặp schema không tương thích. Không có bằng chứng hiện tại để chọn một giả thuyết làm nguyên nhân production.

Trước lần deploy Vercel tiếp theo phải đặt VITE_API_URL thành HTTPS origin backend thật, FRONTEND_ORIGIN của BE chứa frontend domain, cookie Secure/SameSite phù hợp và OAuth callback khớp topology. Build mới cố tình từ chối cấu hình Vercel thiếu API để tránh phát hành ứng dụng lỗi tuyến. Chưa sửa giá trị cloud vì không có cấu hình deployment được kết nối. Git push không đồng nghĩa đã mở khóa hạn mức hoặc xác nhận deploy thành công.

Một rủi ro bảo mật độc lập được ghi nhận tại BE `src/database.js:14`: kết nối PostgreSQL từ xa hiện dùng `rejectUnauthorized:false`. Cần CA/chính sách TLS của nhà cung cấp để chuyển sang xác minh chứng thư mà không làm ngừng kết nối DB hiện có. Audit này không đổi mặc định TLS hoặc tuyên bố đã xác minh PostgreSQL production. Cũng chưa thực hiện DDoS phân tán hay pentest dịch vụ production.

Nguồn kỹ thuật: [Socket.IO client options](https://socket.io/docs/v4/client-options/) cho backoff/reconnect, [body-parser advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Các advisory là kết quả registry ngày audit, không phải kết luận về khả năng khai thác của mọi đường code trong ứng dụng.
