import { Card, Typography, Alert, Space, Button } from 'antd';

const { Title, Paragraph, Text, Link } = Typography as any;

export default function GoogleSheetsPage() {
  const docsUrl = 'https://github.com/daop-movie/docs/google-sheets'; // chỉnh lại nếu repo khác

  return (
    <>
      <Title level={1}>Google Sheets – Phim custom</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Google Sheets đang được dùng làm nơi nhập phim custom và tập phim (movies, episodes)."
          description="Build sẽ tự đọc dữ liệu từ Google Sheets (hoặc Excel fallback) theo cấu trúc trong docs/google-sheets/README.md."
        />

        <Card title="1. Mở file Google Sheets">
          <Paragraph>
            <Text>
              File Google Sheets dùng cho phim custom được cấu hình bằng các biến môi trường{' '}
              <Text code>GOOGLE_SHEETS_ID</Text> và <Text code>GOOGLE_SERVICE_ACCOUNT_KEY</Text> trong môi
              trường build (GitHub Actions / máy local).
            </Text>
          </Paragraph>
          <Paragraph>
            <Text>
              ID sheet nằm trong URL dạng <Text code>https://docs.google.com/spreadsheets/d/&lt;ID&gt;/edit</Text>. Hãy
              chắc chắn bạn đã chia sẻ sheet cho service account với quyền Editor.
            </Text>
          </Paragraph>
          <Paragraph>
            <Text>
              Để chỉnh sửa trực quan từng phim hoặc nhiều phim cùng lúc, hãy mở trực tiếp file Google Sheets và thao tác
              trên 2 tab <Text code>movies</Text> và <Text code>episodes</Text>.
            </Text>
          </Paragraph>
          <Paragraph>
            <Text type="secondary">
              Gợi ý: Lưu URL sheet trong phần &quot;Trang tĩnh&quot; hoặc ghi chú nội bộ để admin dễ truy cập.
            </Text>
          </Paragraph>
        </Card>

        <Card title="2. Cấu trúc sheet (movies, episodes)">
          <Paragraph>
            <Text strong>Tab movies</Text> dùng để nhập thông tin chính của phim (title, origin_name, năm, thể loại,
            quốc gia, chất lượng, status, showtimes, is_exclusive, tmdb_id,...).
          </Paragraph>
          <Paragraph>
            <Text strong>Tab episodes</Text> dùng để nhập tập phim và nguồn server. Cột{' '}
            <Text code>sources</Text> là chuỗi JSON chứa mảng các nguồn, ví dụ:
          </Paragraph>
          <Paragraph>
            <Text code>
              {`[{"name":"Tập 1","slug":"tap-1","link_m3u8":"https://.../index.m3u8","link_embed":"https://player..."}]`}
            </Text>
          </Paragraph>
          <Paragraph>
            <Text>
              Build sẽ parse JSON này thành <Text code>server_data</Text> để hiển thị danh sách tập và server trên
              website, tự nhận diện link <Text code>m3u8</Text> hoặc <Text code>embed</Text>.
            </Text>
          </Paragraph>
          <Paragraph>
            <Text>
              Bạn có thể thêm nhiều server cho cùng một tập bằng cách thêm nhiều phần tử trong mảng JSON (mỗi phần tử có{' '}
              <Text code>name</Text>, <Text code>slug</Text>, <Text code>link_m3u8</Text> /{' '}
              <Text code>link_embed</Text>).
            </Text>
          </Paragraph>
          <Paragraph>
            <Text>
              Chi tiết đầy đủ xem trong tài liệu{' '}
              <Link href={docsUrl} target="_blank" rel="noopener noreferrer">
                docs/google-sheets/README.md
              </Link>
              .
            </Text>
          </Paragraph>
        </Card>

        <Card title="3. Quy trình thêm / chỉnh sửa phim custom">
          <Paragraph>
            <ol>
              <li>
                Mở Google Sheets (tab <Text code>movies</Text>, <Text code>episodes</Text>).
              </li>
              <li>
                <Text strong>Thêm phim mới</Text>: thêm 1 dòng vào tab <Text code>movies</Text>, điền đủ các cột cần
                thiết (ít nhất là <Text code>title</Text>, <Text code>type</Text>, <Text code>year</Text>,{' '}
                <Text code>genre</Text>, <Text code>country</Text>).
              </li>
              <li>
                Ghi nhớ hoặc điền sẵn <Text code>id</Text> cho phim, sau đó sang tab <Text code>episodes</Text> điền{' '}
                <Text code>movie_id</Text> tương ứng và cột <Text code>sources</Text> (JSON mảng server / tập).
              </li>
              <li>
                <Text strong>Chỉnh sửa 1 hoặc nhiều phim</Text>: lọc / sort trên Google Sheets, sửa trực tiếp các dòng
                cần thay đổi (có thể copy/paste hàng loạt).
              </li>
              <li>
                Sau khi chỉnh sửa, vào mục <Text code>GitHub Actions</Text> trong Admin và chạy workflow{' '}
                <Text code>Update data daily</Text> hoặc <Text code>Build on demand</Text> để build lại dữ liệu ra
                website.
              </li>
            </ol>
          </Paragraph>
          <Paragraph>
            <Text type="secondary">
              Lưu ý: Build luôn đọc lại toàn bộ dữ liệu từ sheet, và merge với phim từ OPhim. Mỗi lần bạn thêm dòng mới
              trong sheet là thêm phim mới vào website; chỉnh sửa dòng cũ là cập nhật phim cũ.
            </Text>
          </Paragraph>
          <Paragraph>
            <Button type="link" href={docsUrl} target="_blank" rel="noopener noreferrer">
              Xem hướng dẫn chi tiết trong docs/google-sheets
            </Button>
          </Paragraph>
        </Card>
      </Space>
    </>
  );
}

