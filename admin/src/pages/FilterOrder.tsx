import { useEffect, useState } from 'react';
import { Card, Button, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const ROW_IDS = ['year', 'genre', 'country', 'videoType', 'lang'] as const;
const ROW_LABELS: Record<string, string> = {
  year: 'Năm phát hành',
  genre: 'Thể loại',
  country: 'Quốc gia',
  videoType: 'Loại video',
  lang: 'Kiểu ngôn ngữ',
};

/** Danh sách đầy đủ thể loại (slug -> tên), đồng bộ với build OPhim fallback */
const GENRE_OPTIONS: Record<string, string> = {
  'hanh-dong': 'Hành Động', 'tinh-cam': 'Tình Cảm', 'hai-huoc': 'Hài Hước', 'co-trang': 'Cổ Trang',
  'tam-ly': 'Tâm Lý', 'hinh-su': 'Hình Sự', 'chien-tranh': 'Chiến Tranh', 'the-thao': 'Thể Thao',
  'vo-thuat': 'Võ Thuật', 'vien-tuong': 'Viễn Tưởng', 'phieu-luu': 'Phiêu Lưu', 'khoa-hoc': 'Khoa Học',
  'kinh-di': 'Kinh Dị', 'am-nhac': 'Âm Nhạc', 'than-thoai': 'Thần Thoại', 'tai-lieu': 'Tài Liệu',
  'gia-dinh': 'Gia Đình', 'chinh-kich': 'Chính kịch', 'bi-an': 'Bí ẩn', 'hoc-duong': 'Học Đường',
  'kinh-dien': 'Kinh Điển', 'phim-18': 'Phim 18+', 'short-drama': 'Short Drama',
};

/** Danh sách đầy đủ quốc gia (slug -> tên) */
const COUNTRY_OPTIONS: Record<string, string> = {
  'trung-quoc': 'Trung Quốc', 'han-quoc': 'Hàn Quốc', 'nhat-ban': 'Nhật Bản', 'thai-lan': 'Thái Lan',
  'au-my': 'Âu Mỹ', 'dai-loan': 'Đài Loan', 'hong-kong': 'Hồng Kông', 'an-do': 'Ấn Độ', 'anh': 'Anh',
  'phap': 'Pháp', 'canada': 'Canada', 'quoc-gia-khac': 'Quốc Gia Khác', 'duc': 'Đức',
  'tay-ban-nha': 'Tây Ban Nha', 'tho-nhi-ky': 'Thổ Nhĩ Kỳ', 'ha-lan': 'Hà Lan', 'indonesia': 'Indonesia',
  'nga': 'Nga', 'mexico': 'Mexico', 'ba-lan': 'Ba lan', 'uc': 'Úc', 'thuy-dien': 'Thụy Điển',
  'malaysia': 'Malaysia', 'brazil': 'Brazil', 'philippines': 'Philippines', 'bo-dao-nha': 'Bồ Đào Nha',
  'y': 'Ý', 'dan-mach': 'Đan Mạch', 'uae': 'UAE', 'na-uy': 'Na Uy', 'thuy-si': 'Thụy Sĩ',
  'chau-phi': 'Châu Phi', 'nam-phi': 'Nam Phi', 'ukraina': 'Ukraina', 'a-rap-xe-ut': 'Ả Rập Xê Út',
  'bi': 'Bỉ', 'ireland': 'Ireland', 'colombia': 'Colombia', 'phan-lan': 'Phần Lan', 'viet-nam': 'Việt Nam',
  'chile': 'Chile', 'hy-lap': 'Hy Lạp', 'nigeria': 'Nigeria', 'argentina': 'Argentina', 'singapore': 'Singapore',
};

const VIDEO_TYPE_OPTIONS: Record<string, string> = {
  tvshows: 'TV Shows',
  hoathinh: 'Hoạt hình',
  '4k': '4K',
  exclusive: 'Độc quyền',
};

const LANG_OPTIONS: Record<string, string> = {
  vietsub: 'Vietsub',
  thuyetminh: 'Thuyết minh',
  longtieng: 'Lồng tiếng',
  khac: 'Khác',
};

/** Mục trang Danh sách: id -> { label, href, icon } */
const LIST_OPTIONS: Record<string, { label: string; href: string; icon: string }> = {
  'phim-4k': { label: 'Phim 4K', href: '/danh-sach/phim-4k.html', icon: '📺' },
  'shows': { label: 'TV Shows', href: '/shows.html', icon: '📺' },
  'hoat-hinh': { label: 'Hoạt hình', href: '/hoat-hinh.html', icon: '🎬' },
  'phim-vietsub': { label: 'Phim Vietsub', href: '/danh-sach/phim-vietsub.html', icon: '🇻🇳' },
  'phim-thuyet-minh': { label: 'Phim Thuyết minh', href: '/danh-sach/phim-thuyet-minh.html', icon: '🎙️' },
  'phim-long-tieng': { label: 'Phim Lồng tiếng', href: '/danh-sach/phim-long-tieng.html', icon: '🔊' },
  'phim-doc-quyen': { label: 'Phim Độc quyền', href: '/danh-sach/phim-doc-quyen.html', icon: '⭐' },
  'phim-dang-chieu': { label: 'Phim đang chiếu', href: '/danh-sach/phim-dang-chieu.html', icon: '🎞️' },
  'phim-sap-chieu': { label: 'Phim sắp chiếu', href: '/danh-sach/phim-sap-chieu.html', icon: '📅' },
  'phim-chieu-rap': { label: 'Phim chiếu rạp', href: '/danh-sach/phim-chieu-rap.html', icon: '🎭' },
  'the-loai': { label: 'Thể loại', href: '/the-loai/', icon: '🎬' },
  'quoc-gia': { label: 'Quốc gia', href: '/quoc-gia/', icon: '🌐' },
  'nam-phat-hanh': { label: 'Năm phát hành', href: '/nam-phat-hanh/', icon: '📅' },
  'dien-vien': { label: 'Diễn viên', href: '/dien-vien/', icon: '👤' },
};

const DEFAULT_VIDEO_TYPE_ORDER = Object.keys(VIDEO_TYPE_OPTIONS);
const DEFAULT_LANG_ORDER = Object.keys(LANG_OPTIONS);

const FILTER_ROW_ORDER_KEY = 'filter_row_order';
const FILTER_GENRE_ORDER_KEY = 'filter_genre_order';
const FILTER_COUNTRY_ORDER_KEY = 'filter_country_order';
const FILTER_VIDEO_TYPE_ORDER_KEY = 'filter_video_type_order';
const FILTER_LANG_ORDER_KEY = 'filter_lang_order';
const FILTER_LIST_ORDER_KEY = 'filter_list_order';

const SETTING_KEYS = [
  FILTER_ROW_ORDER_KEY,
  FILTER_GENRE_ORDER_KEY,
  FILTER_COUNTRY_ORDER_KEY,
  FILTER_VIDEO_TYPE_ORDER_KEY,
  FILTER_LANG_ORDER_KEY,
  FILTER_LIST_ORDER_KEY,
] as const;

function parseJsonArray(value: string | null | undefined): string[] {
  if (value == null || value === '') return [];
  if (typeof value !== 'string') return [];
  try {
    const a = JSON.parse(value);
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }
}

function mergeDisplayOrder(savedOrder: string[], allIds: string[]): string[] {
  const valid = savedOrder.filter((id) => allIds.includes(id));
  const missing = allIds.filter((id) => !savedOrder.includes(id));
  return [...valid, ...missing];
}

function moveInList(list: string[], index: number, dir: number): string[] {
  const next = [...list];
  const target = index + dir;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function FilterOrder() {
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [genreOrder, setGenreOrder] = useState<string[]>([]);
  const [countryOrder, setCountryOrder] = useState<string[]>([]);
  const [videoTypeOrder, setVideoTypeOrder] = useState<string[]>([]);
  const [langOrder, setLangOrder] = useState<string[]>([]);
  const [listOrder, setListOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_settings').select('key, value').in('key', [...SETTING_KEYS]);
      const map = (data ?? []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.key] = row.value ?? '';
        return acc;
      }, {});
      setRowOrder(parseJsonArray(map[FILTER_ROW_ORDER_KEY]).length ? parseJsonArray(map[FILTER_ROW_ORDER_KEY]) : [...ROW_IDS]);
      setGenreOrder(parseJsonArray(map[FILTER_GENRE_ORDER_KEY]));
      setCountryOrder(parseJsonArray(map[FILTER_COUNTRY_ORDER_KEY]));
      setVideoTypeOrder(parseJsonArray(map[FILTER_VIDEO_TYPE_ORDER_KEY]).length ? parseJsonArray(map[FILTER_VIDEO_TYPE_ORDER_KEY]) : DEFAULT_VIDEO_TYPE_ORDER);
      setLangOrder(parseJsonArray(map[FILTER_LANG_ORDER_KEY]).length ? parseJsonArray(map[FILTER_LANG_ORDER_KEY]) : DEFAULT_LANG_ORDER);
      setListOrder(parseJsonArray(map[FILTER_LIST_ORDER_KEY]));
      setLoading(false);
    })();
  }, []);

  const moveRow = (index: number, dir: number) => {
    const list = moveInList(displayRowOrder, index, dir);
    setRowOrder(list);
  };

  const genreIds = Object.keys(GENRE_OPTIONS);
  const countryIds = Object.keys(COUNTRY_OPTIONS);
  const listIds = Object.keys(LIST_OPTIONS);
  const displayGenreOrder = mergeDisplayOrder(genreOrder, genreIds);
  const displayCountryOrder = mergeDisplayOrder(countryOrder, countryIds);
  const displayVideoTypeOrder = mergeDisplayOrder(videoTypeOrder, DEFAULT_VIDEO_TYPE_ORDER);
  const displayLangOrder = mergeDisplayOrder(langOrder, DEFAULT_LANG_ORDER);
  const displayListOrder = mergeDisplayOrder(listOrder, listIds);

  const moveGenre = (index: number, dir: number) => setGenreOrder(moveInList(displayGenreOrder, index, dir));
  const moveCountry = (index: number, dir: number) => setCountryOrder(moveInList(displayCountryOrder, index, dir));
  const moveVideoType = (index: number, dir: number) => setVideoTypeOrder(moveInList(displayVideoTypeOrder, index, dir));
  const moveLang = (index: number, dir: number) => setLangOrder(moveInList(displayLangOrder, index, dir));
  const moveList = (index: number, dir: number) => setListOrder(moveInList(displayListOrder, index, dir));

  const currentRows = rowOrder.length ? rowOrder : [...ROW_IDS];
  const validRows = currentRows.filter((id) => ROW_IDS.includes(id as any));
  const missingRows = ROW_IDS.filter((id) => !currentRows.includes(id));
  const displayRowOrder = [...validRows, ...missingRows];

  const onSave = async () => {
    setSaving(true);
    try {
      await supabase.from('site_settings').upsert(
        [
          { key: FILTER_ROW_ORDER_KEY, value: JSON.stringify(displayRowOrder), updated_at: new Date().toISOString() },
          { key: FILTER_GENRE_ORDER_KEY, value: JSON.stringify(displayGenreOrder), updated_at: new Date().toISOString() },
          { key: FILTER_COUNTRY_ORDER_KEY, value: JSON.stringify(displayCountryOrder), updated_at: new Date().toISOString() },
          { key: FILTER_VIDEO_TYPE_ORDER_KEY, value: JSON.stringify(displayVideoTypeOrder), updated_at: new Date().toISOString() },
          { key: FILTER_LANG_ORDER_KEY, value: JSON.stringify(displayLangOrder), updated_at: new Date().toISOString() },
          { key: FILTER_LIST_ORDER_KEY, value: JSON.stringify(displayListOrder), updated_at: new Date().toISOString() },
        ],
        { onConflict: 'key' }
      );
      message.success('Đã lưu. Chạy Build website để áp dụng lên bộ lọc.');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const renderOrderList = (
    title: string,
    displayOrder: string[],
    labels: Record<string, string>,
    onMove: (index: number, dir: number) => void
  ) => (
    <>
      <h3 style={{ marginBottom: 12 }}>{title}</h3>
      <p style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>Dùng nút mũi tên để đổi vị trí. Thứ tự hiển thị trên trang từ trên xuống.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24, maxHeight: 320, overflow: 'auto' }}>
        {displayOrder.map((id, index) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#fafafa', borderRadius: 8 }}>
            <Button type="text" size="small" icon={<ArrowUpOutlined />} onClick={() => onMove(index, -1)} disabled={index === 0} />
            <Button type="text" size="small" icon={<ArrowDownOutlined />} onClick={() => onMove(index, 1)} disabled={index === displayOrder.length - 1} />
            <span style={{ flex: 1, fontWeight: 500 }}>{labels[id] || id}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <h1>Sắp xếp bộ lọc</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Thay đổi thứ tự các hàng lọc và thứ tự từng mục trong mỗi bộ lọc (Thể loại, Quốc gia, Loại video, Kiểu ngôn ngữ). Sau khi lưu, cần chạy <strong>Build website</strong> để áp dụng.
      </p>
      <Card loading={loading}>
        {renderOrderList('Thứ tự các hàng lọc', displayRowOrder, ROW_LABELS, moveRow)}

        {renderOrderList('Thứ tự Thể loại', displayGenreOrder, GENRE_OPTIONS, moveGenre)}

        {renderOrderList('Thứ tự Quốc gia', displayCountryOrder, COUNTRY_OPTIONS, moveCountry)}

        {renderOrderList('Thứ tự Loại video', displayVideoTypeOrder, VIDEO_TYPE_OPTIONS, moveVideoType)}

        {renderOrderList('Thứ tự Kiểu ngôn ngữ', displayLangOrder, LANG_OPTIONS, moveLang)}

        {renderOrderList('Thứ tự trang Danh sách', displayListOrder, Object.fromEntries(listIds.map(id => [id, LIST_OPTIONS[id].label])), moveList)}

        <Button type="primary" onClick={onSave} loading={saving}>
          Lưu
        </Button>
      </Card>
    </>
  );
}
