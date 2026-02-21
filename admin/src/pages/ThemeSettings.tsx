import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

const THEME_KEYS = ['theme_primary', 'theme_bg', 'theme_card', 'theme_accent'] as const;
const DEFAULTS: Record<string, string> = {
  theme_primary: '#58a6ff',
  theme_bg: '#0d1117',
  theme_card: '#161b22',
  theme_accent: '#58a6ff',
};

export default function ThemeSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', THEME_KEYS).then((r) => {
      const data = (r.data ?? []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.key] = row.value ?? '';
        return acc;
      }, {});
      const toHex = (v: string) => (v && !v.startsWith('#') ? '#' + v : v) || '';
      form.setFieldsValue({
        theme_primary: toHex(data.theme_primary) || DEFAULTS.theme_primary,
        theme_bg: toHex(data.theme_bg) || DEFAULTS.theme_bg,
        theme_card: toHex(data.theme_card) || DEFAULTS.theme_card,
        theme_accent: toHex(data.theme_accent) || DEFAULTS.theme_accent,
      });
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

  return (
    <>
      <h1>Theme (màu sắc)</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Màu áp dụng cho website (biến CSS). Sau khi lưu, cần chạy Build website để xuất ra site.
      </p>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="theme_primary" label="Màu chủ đạo (link, nút)">
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_bg" label="Màu nền">
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_card" label="Màu thẻ / header">
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item name="theme_accent" label="Màu nhấn (hover)">
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
          <Form.Item label="Xem trước">
            <div
              style={{
                background: previewBg,
                color: '#e6edf3',
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
