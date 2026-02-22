-- Seed nội dung mặc định cho các trang tĩnh (GoTV)
-- Chạy trong SQL Editor của Supabase Admin
-- Dùng ON CONFLICT (page_key) DO UPDATE để ghi đè nếu đã có (hoặc bỏ qua nếu muốn giữ dữ liệu cũ)

-- Liên hệ
INSERT INTO public.static_pages (page_key, content, updated_at) VALUES ('contact', $$
<h2>Liên Hệ GoTV - Hỗ Trợ Khi Xem Phim Online</h2>
<h3>Liên hệ</h3>
<p>Chào mừng bạn đến với trang <strong>Liên Hệ</strong> của GoTV! Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn để mang lại trải nghiệm tốt nhất khi sử dụng dịch vụ.</p>
<h3>1. Thông Tin Liên Hệ Chính</h3>
<p>Email hỗ trợ khách hàng: <strong>support@gotv.top</strong></p>
<ul>
<li><strong>Vấn đề tài khoản:</strong> Quên mật khẩu, không thể truy cập, và các vấn đề liên quan đến tài khoản.</li>
<li><strong>Hỗ trợ kỹ thuật:</strong> Sự cố khi xem phim, chất lượng video hoặc các lỗi khác khi sử dụng trang web.</li>
<li><strong>Đóng góp ý kiến:</strong> Chúng tôi trân trọng mọi ý kiến đóng góp từ bạn để nâng cao chất lượng dịch vụ.</li>
</ul>
<p>Email liên hệ về Chính Sách Riêng Tư: <strong>privacy@gotv.top</strong></p>
<p>Mọi thắc mắc liên quan đến bảo mật thông tin và chính sách riêng tư của GoTV.</p>
<h3>2. Liên Hệ Qua Mạng Xã Hội</h3>
<p>Ngoài email, bạn cũng có thể liên hệ và cập nhật thông tin mới nhất từ GoTV qua các kênh mạng xã hội của chúng tôi.</p>
<h3>3. Câu Hỏi Thường Gặp (F.A.Q)</h3>
<p>Trước khi gửi yêu cầu hỗ trợ, bạn có thể tham khảo trang <a href="/hoi-dap.html">Câu Hỏi Thường Gặp (F.A.Q)</a> để tìm câu trả lời nhanh cho các vấn đề phổ biến.</p>
<p>Chúng tôi rất vui khi được hỗ trợ bạn và mong muốn mang đến trải nghiệm xem phim trực tuyến tốt nhất! <strong>GoTV - Cùng bạn khám phá thế giới giải trí đa dạng, an toàn và miễn phí!</strong></p>
$$, now())
ON CONFLICT (page_key) DO UPDATE SET content = EXCLUDED.content, updated_at = now();

-- Hỏi đáp
INSERT INTO public.static_pages (page_key, content, updated_at) VALUES ('faq', $$
<h2>Hỏi Đáp - GoTV</h2>
<h3>Một số câu hỏi được người dùng quan tâm nhất tại GoTV</h3>
<h4>1. GoTV là gì và có những đặc điểm nổi bật nào?</h4>
<p>GoTV là một trang web xem phim online miễn phí tại Việt Nam, cung cấp kho phim chất lượng HD và 4K, có tốc độ tải mượt mà. Trang web có giao diện thân thiện và thường xuyên cập nhật các bộ phim mới nhất từ nhiều quốc gia.</p>
<h4>2. GoTV có miễn phí hoàn toàn không?</h4>
<p>GoTV hoàn toàn miễn phí. Người dùng không cần trả phí hay đăng ký tài khoản để xem phim.</p>
<h4>3. GoTV có bao gồm các bộ phim chiếu rạp không?</h4>
<p>GoTV cung cấp nhiều bộ phim chiếu rạp đình đám từ Việt Nam và quốc tế, được cập nhật nhanh chóng.</p>
<h4>4. Tốc độ tải phim trên GoTV như thế nào?</h4>
<p>GoTV có tốc độ tải nhanh, ổn định nhờ hệ thống máy chủ hiện đại.</p>
<h4>5. Chất lượng phim trên GoTV có tốt không?</h4>
<p>GoTV cung cấp chất lượng phim từ HD đến 4K.</p>
<h4>6. GoTV có thể xem trên các thiết bị nào?</h4>
<p>GoTV có thể truy cập trên máy tính, điện thoại di động và máy tính bảng.</p>
<h4>7. GoTV có hỗ trợ thuyết minh và phụ đề không?</h4>
<p>Có, GoTV hỗ trợ nhiều tùy chọn thuyết minh và phụ đề đa ngôn ngữ.</p>
<h4>8. GoTV có phim lẻ và phim bộ không?</h4>
<p>Đúng vậy, GoTV cung cấp cả phim lẻ và phim bộ.</p>
<h4>9. GoTV có hỗ trợ phim hoạt hình không?</h4>
<p>Có, GoTV có kho phim hoạt hình phong phú.</p>
<h4>10. Có thể tìm kiếm phim dễ dàng trên GoTV không?</h4>
<p>Giao diện GoTV được thiết kế thân thiện, giúp tìm kiếm phim theo tên, thể loại, quốc gia.</p>
<h4>11. Có cần đăng ký tài khoản để xem phim trên GoTV không?</h4>
<p>Người dùng không cần đăng ký tài khoản mà vẫn có thể xem phim thoải mái.</p>
<h4>12. GoTV có bảo vệ quyền riêng tư cho người dùng không?</h4>
<p>GoTV đảm bảo quyền riêng tư của người dùng, không sử dụng dữ liệu cho mục đích quảng cáo.</p>
$$, now())
ON CONFLICT (page_key) DO UPDATE SET content = EXCLUDED.content, updated_at = now();

-- Chính sách bảo mật
INSERT INTO public.static_pages (page_key, content, updated_at) VALUES ('privacy', $$
<h2>Bảo Mật - Chính Sách Riêng Tư của GoTV</h2>
<p>Tại GoTV, chúng tôi cam kết bảo vệ quyền riêng tư và thông tin cá nhân của bạn khi truy cập và sử dụng trang web.</p>
<h3>Thông Tin Chúng Tôi Thu Thập</h3>
<p>Khi bạn đăng ký tài khoản, nhận bản tin, hoặc liên hệ với chúng tôi, chúng tôi có thể thu thập: tên, địa chỉ email, số điện thoại và các thông tin khác mà bạn cung cấp.</p>
<h3>Mục Đích Sử Dụng Thông Tin</h3>
<ul><li>Cung cấp và duy trì dịch vụ</li><li>Giao tiếp với người dùng</li><li>Phân tích và cải thiện</li><li>Bảo mật và tuân thủ pháp luật</li></ul>
<h3>Chia Sẻ Thông Tin</h3>
<p>GoTV cam kết không bán hoặc chia sẻ thông tin cá nhân với bên thứ ba, ngoại trừ khi có sự đồng ý của bạn hoặc theo yêu cầu pháp luật.</p>
<h3>Bảo Mật Thông Tin Cá Nhân</h3>
<p>Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức để bảo vệ thông tin của bạn.</p>
<h3>Quyền Riêng Tư của Người Dùng</h3>
<p>Bạn có quyền truy cập, chỉnh sửa và xóa thông tin cá nhân. Liên hệ: <strong>privacy@gotv.top</strong></p>
<h3>Cookies</h3>
<p>GoTV sử dụng cookies để cải thiện trải nghiệm người dùng. Bạn có thể điều chỉnh cài đặt cookies qua trình duyệt.</p>
<h3>Liên Hệ</h3>
<p>Mọi câu hỏi về Chính Sách Riêng Tư: <strong>privacy@gotv.top</strong></p>
$$, now())
ON CONFLICT (page_key) DO UPDATE SET content = EXCLUDED.content, updated_at = now();

-- Điều khoản sử dụng
INSERT INTO public.static_pages (page_key, content, updated_at) VALUES ('terms', $$
<h2>Điều Khoản Sử Dụng - GoTV</h2>
<p>Chào mừng bạn đến với GoTV, nền tảng xem phim trực tuyến miễn phí. Bằng việc truy cập và sử dụng dịch vụ, bạn đồng ý tuân thủ các điều khoản này.</p>
<h3>1. Chấp Nhận Điều Khoản</h3>
<p>Bạn đã đọc, hiểu và đồng ý với các điều khoản sử dụng. Nếu không đồng ý, vui lòng không tiếp tục sử dụng GoTV.</p>
<h3>2. Đăng Ký Tài Khoản</h3>
<p>Khi đăng ký, bạn cam kết: cung cấp thông tin chính xác; bảo mật thông tin đăng nhập; không sử dụng tài khoản cho hành vi vi phạm pháp luật.</p>
<h3>3. Hành Vi Bị Cấm</h3>
<p>Không đăng tải nội dung vi phạm bản quyền; không thực hiện hành vi gây hại hệ thống; không sử dụng thương mại mà không có sự đồng ý.</p>
<h3>4. Bảo Mật Thông Tin</h3>
<p>Vui lòng tham khảo <a href="/chinh-sach-bao-mat.html">Chính Sách Riêng Tư</a> để hiểu cách chúng tôi thu thập và bảo mật thông tin.</p>
<h3>5. Quyền Thay Đổi Dịch Vụ</h3>
<p>GoTV có quyền thay đổi, cập nhật hoặc ngừng cung cấp nội dung/dịch vụ; xóa hoặc tạm ngừng tài khoản nếu vi phạm.</p>
<h3>6. Miễn Trừ Trách Nhiệm</h3>
<p>GoTV không chịu trách nhiệm về gián đoạn truy cập, sự cố kỹ thuật, nội dung do bên thứ ba cung cấp.</p>
<h3>7. Thay Đổi Điều Khoản</h3>
<p>Chúng tôi có thể cập nhật điều khoản theo thời gian. Việc tiếp tục sử dụng đồng nghĩa chấp nhận điều khoản mới.</p>
<h3>8. Liên Hệ</h3>
<p>Mọi câu hỏi: <strong>support@gotv.top</strong></p>
$$, now())
ON CONFLICT (page_key) DO UPDATE SET content = EXCLUDED.content, updated_at = now();

-- Giới thiệu (nếu chưa có)
INSERT INTO public.static_pages (page_key, content, updated_at) VALUES ('about', $$
<h2>Giới Thiệu GoTV</h2>
<h3>GoTV - Nền Tảng Xem Phim Trực Tuyến Miễn Phí</h3>
<p>GoTV là nền tảng xem phim trực tuyến miễn phí, cung cấp không gian giải trí cho hàng triệu người dùng với tiêu chí chất lượng, tiện lợi và phong phú.</p>
<h3>Giao Diện Thân Thiện, Dễ Sử Dụng</h3>
<p>GoTV thiết kế giao diện tối giản, thân thiện để bạn dễ dàng khám phá và tìm kiếm những bộ phim yêu thích.</p>
<h3>Kho Phim Phong Phú</h3>
<p>GoTV mang đến hàng ngàn bộ phim thuộc nhiều thể loại: Phim Bộ, Phim Lẻ, Phim Việt Nam, từ nhiều quốc gia.</p>
<h3>Chất Lượng Video Đỉnh Cao - Từ HD đến 4K</h3>
<p>GoTV cung cấp phim với nhiều độ phân giải từ HD đến 4K.</p>
<h3>Tính Năng Nổi Bật</h3>
<ul><li>Xem Phim Miễn Phí Hoàn Toàn</li><li>Cập Nhật Phim Nhanh Chóng</li><li>Xem Phim Mọi Lúc, Mọi Nơi</li></ul>
<h3>Cam Kết</h3>
<p>Chúng tôi cam kết bảo vệ quyền lợi người dùng, bảo mật thông tin cá nhân tuyệt đối.</p>
<h3>Liên Hệ</h3>
<p>Liên hệ qua <a href="/lien-he.html">trang Liên Hệ</a> hoặc email support@gotv.top</p>
$$, now())
ON CONFLICT (page_key) DO NOTHING;
