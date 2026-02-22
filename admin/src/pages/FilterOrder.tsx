import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
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

const FILTER_ROW_ORDER_KEY = 'filter_row_order';
const FILTER_GENRE_ORDER_KEY = 'filter_genre_order';
const FILTER_COUNTRY_ORDER_KEY = 'filter_country_order';

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

export default function FilterOrder() {
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [genreOrderText, setGenreOrderText] = useState('');
  const [countryOrderText, setCountryOrderText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_settings').select('key, value').in('key', [FILTER_ROW_ORDER_KEY, FILTER_GENRE_ORDER_KEY, FILTER_COUNTRY_ORDER_KEY]);
      const map = (data ?? []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.key] = row.value ?? '';
        return acc;
      }, {});
      const rowArr = parseJsonArray(map[FILTER_ROW_ORDER_KEY]);
      setRowOrder(rowArr.length ? rowArr : [...ROW_IDS]);
      const genreArr = parseJsonArray(map[FILTER_GENRE_ORDER_KEY]);
      setGenreOrderText(Array.isArray(genreArr) ? genreArr.join('\n') : '');
      const countryArr = parseJsonArray(map[FILTER_COUNTRY_ORDER_KEY]);
      setCountryOrderText(Array.isArray(countryArr) ? countryArr.join('\n') : '');
      setLoading(false);
    })();
  }, []);

  const moveRow = (index: number, dir: number) => {
    const list = [...displayOrder];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setRowOrder(list);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const genreOrder = genreOrderText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const countryOrder = countryOrderText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      await supabase.from('site_settings').upsert(
        [
          { key: FILTER_ROW_ORDER_KEY, value: JSON.stringify(rowOrder), updated_at: new Date().toISOString() },
          { key: FILTER_GENRE_ORDER_KEY, value: JSON.stringify(genreOrder), updated_at: new Date().toISOString() },
          { key: FILTER_COUNTRY_ORDER_KEY, value: JSON.stringify(countryOrder), updated_at: new Date().toISOString() },
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

  const currentRows = rowOrder.length ? rowOrder : [...ROW_IDS];
  const validRows = currentRows.filter((id) => ROW_IDS.includes(id as any));
  const missingRows = ROW_IDS.filter((id) => !currentRows.includes(id));
  const displayOrder = [...validRows, ...missingRows];

  return (
    <>
      <h1>Sắp xếp bộ lọc</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Thay đổi thứ tự các hàng lọc (ví dụ đưa Quốc gia lên trước Thể loại) và thứ tự từng mục Thể loại / Quốc gia (ví dụ Trung Quốc trước Hàn Quốc). Sau khi lưu, cần chạy <strong>Build website</strong> để áp dụng.
      </p>
      <Card loading={loading}>
        <h3 style={{ marginBottom: 12 }}>Thứ tự các hàng lọc</h3>
        <p style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>Dùng nút mũi tên để đổi vị trí. Hàng hiển thị trên trang theo thứ tự từ trên xuống.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {displayOrder.map((id, index) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 8 }}>
              <Button type="text" size="small" icon={<ArrowUpOutlined />} onClick={() => moveRow(index, -1)} disabled={index === 0} />
              <Button type="text" size="small" icon={<ArrowDownOutlined />} onClick={() => moveRow(index, 1)} disabled={index === displayOrder.length - 1} />
              <span style={{ flex: 1, fontWeight: 500 }}>{ROW_LABELS[id] || id}</span>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 12 }}>Thứ tự Thể loại</h3>
        <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
          Mỗi dòng một slug thể loại (ví dụ: hanh-dong, tinh-cam, co-trang). Để trống = giữ thứ tự mặc định (A–Z). Chỉ cần liệt kê các slug muốn ưu tiên lên trước.
        </p>
        <Input.TextArea
          rows={6}
          value={genreOrderText}
          onChange={(e) => setGenreOrderText(e.target.value)}
          placeholder={'hanh-dong\ntinh-cam\nco-trang\nhai-huoc\n...'}
          style={{ marginBottom: 24 }}
        />

        <h3 style={{ marginBottom: 12 }}>Thứ tự Quốc gia</h3>
        <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
          Mỗi dòng một slug quốc gia (ví dụ: trung-quoc, han-quoc, au-my). Để trống = thứ tự mặc định. Liệt kê slug muốn hiển thị lên trước.
        </p>
        <Input.TextArea
          rows={6}
          value={countryOrderText}
          onChange={(e) => setCountryOrderText(e.target.value)}
          placeholder={'trung-quoc\nhan-quoc\nau-my\nnhat-ban\n...'}
          style={{ marginBottom: 24 }}
        />

        <Button type="primary" onClick={onSave} loading={saving}>
          Lưu
        </Button>
      </Card>
    </>
  );
}
