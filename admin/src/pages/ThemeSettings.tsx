import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

const THEME_KEYS = [
  'theme_primary', 'theme_bg', 'theme_card', 'theme_accent',
  'theme_text', 'theme_muted',
  'theme_header_logo', 'theme_header_link',
  'theme_footer_text', 'theme_section_title', 'theme_filter_label',
  'theme_pagination', 'theme_link',
  'theme_slider_title', 'theme_slider_meta', 'theme_slider_desc',
  'theme_movie_card_title', 'theme_movie_card_meta',
] as const;

const DEFAULTS: Record<string, string> = {
  theme_primary: '#58a6ff',
  theme_bg: '#0d1117',
  theme_card: '#161b22',
  theme_accent: '#58a6ff',
  theme_text: '#e6edf3',
  theme_muted: '#8b949e',
  theme_header_logo: '#e6edf3',
  theme_header_link: '#e6edf3',
  theme_footer_text: '#8b949e',
  theme_section_title: '#e6edf3',
  theme_filter_label: '#8b949e',
  theme_pagination: '#e6edf3',
  theme_link: '#58a6ff',
  theme_slider_title: '#ffffff',
  theme_slider_meta: 'rgba(255,255,255,0.75)',
  theme_slider_desc: 'rgba(255,255,255,0.7)',
  theme_movie_card_title: '#f85149',
  theme_movie_card_meta: '#8b949e',
};

const LABELS: Record<string, string> = {
  theme_primary: 'Màu chủ đạo (nút)',
  theme_bg: 'Màu nền trang',
  theme_card: 'Màu thẻ / header',
  theme_accent: 'Màu nhấn (hover)',
  theme_text: 'Chữ chính (body)',
  theme_muted: 'Chữ phụ (mờ, nhạt)',
  theme_header_logo: 'Header: màu logo/tên site',
  theme_header_link: 'Header: màu link menu',
  theme_footer_text: 'Footer: màu chữ',
  theme_section_title: 'Section: màu tiêu đề block (VD Phim bộ, Phim lẻ)',
  theme_filter_label: 'Bộ lọc: màu nhãn (năm, thể loại...)',
  theme_pagination: 'Phân trang: màu chữ',
  theme_link: 'Link (trong nội dung)',
  theme_slider_title: 'Slider trang chủ: tiêu đề',
  theme_slider_meta: 'Slider: dòng 2 (năm | quốc gia)',
  theme_slider_desc: 'Slider: mô tả',
  theme_movie_card_title: 'Thẻ phim: tên phim',
  theme_movie_card_meta: 'Thẻ phim: dòng phụ (năm, tập)',
};

export default function ThemeSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  const toHex = (v: string) => {
    if (!v) return '';
    if (v.startsWith('rgba') || v.startsWith('rgb(')) return v;
    return v.startsWith('#') ? v : '#' + v;
  };

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', [...THEME_KEYS]).then((r) => {
      const data = (r.data ?? []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.key] = row.value ?? '';
        return acc;
      }, {});
      const fields: Record<string, string> = {};
      THEME_KEYS.forEach((key) => {
        fields[key] = toHex(data[key]) || DEFAULTS[key] || '';
      });
      form.setFieldsValue(fields);
      setLoading(false);
    });
  }, [form]);

  const onFinish = async (values: Record<string, string>) => {
    try {
      for (const key of THEME_KEYS) {
        const { error } = await supabase.from('site_settings').upsert(
          { key, value: values[key] || DEFAULTS[key] || '', updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
        if (error) throw error;
      }
      message.success('Đã lưu theme. Chạy Build website để áp dụng lên site.');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
    }
  };

  const values = Form.useWatch([], form) || {};
  const previewBg = values.theme_bg || DEFAULTS.theme_bg;
  const previewCard = values.theme_card || DEFAULTS.theme_card;
  const previewAccent = values.theme_primary || DEFAULTS.theme_primary;
  const previewText = values.theme_text || DEFAULTS.theme_text;

  return (
    <>
      <h1>Theme (màu sắc)</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Màu nền, màu chữ và màu từng loại chữ trên website. Sau khi lưu, cần chạy Build website để xuất ra site.
      </p>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Nền &amp; chung</h3>
          <Form.Item name="theme_primary" label={LABELS.theme_primary}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_bg" label={LABELS.theme_bg}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_card" label={LABELS.theme_card}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_accent" label={LABELS.theme_accent}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Màu chữ toàn site</h3>
          <Form.Item name="theme_text" label={LABELS.theme_text}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_muted" label={LABELS.theme_muted}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_link" label={LABELS.theme_link}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Header (menu)</h3>
          <Form.Item name="theme_header_logo" label={LABELS.theme_header_logo}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_header_link" label={LABELS.theme_header_link}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Footer</h3>
          <Form.Item name="theme_footer_text" label={LABELS.theme_footer_text}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Section &amp; Bộ lọc &amp; Phân trang</h3>
          <Form.Item name="theme_section_title" label={LABELS.theme_section_title}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_filter_label" label={LABELS.theme_filter_label}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_pagination" label={LABELS.theme_pagination}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Slider trang chủ</h3>
          <Form.Item name="theme_slider_title" label={LABELS.theme_slider_title}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_slider_meta" label={LABELS.theme_slider_meta}>
            <Input placeholder="vd: rgba(255,255,255,0.75) hoặc #ccc" style={{ width: 280 }} />
          </Form.Item>
          <Form.Item name="theme_slider_desc" label={LABELS.theme_slider_desc}>
            <Input placeholder="vd: rgba(255,255,255,0.7) hoặc #aaa" style={{ width: 280 }} />
          </Form.Item>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Thẻ phim (danh sách)</h3>
          <Form.Item name="theme_movie_card_title" label={LABELS.theme_movie_card_title}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_movie_card_meta" label={LABELS.theme_movie_card_meta}>
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item label="Xem trước">
            <div
              style={{
                background: previewBg,
                color: previewText,
                padding: 16,
                borderRadius: 8,
                border: '1px solid #30363d',
              }}
            >
              <div style={{ background: previewCard, padding: 12, borderRadius: 6, marginBottom: 8 }}>
                Header / Card
              </div>
              <a href="#" style={{ color: previewAccent }}>Link mẫu</a>
            </div>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
