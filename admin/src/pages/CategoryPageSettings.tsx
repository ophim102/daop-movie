import { useEffect, useState } from 'react';
import { Card, Form, Select, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

const KEYS = [
  'category_grid_cols_xs',
  'category_grid_cols_sm',
  'category_grid_cols_md',
  'category_grid_cols_lg',
  'category_grid_columns_extra',
  'category_use_poster',
] as const;

const COLUMN_OPTIONS = [2, 3, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) }));
const COLUMN_EXTRA_OPTIONS = [6, 8, 10, 12, 14, 16].map((n) => ({ value: String(n), label: String(n) }));
const IMAGE_TYPE_OPTIONS = [
  { value: 'thumb', label: 'Thumb (ảnh ngang)' },
  { value: 'poster', label: 'Poster (ảnh dọc)' },
];

export default function CategoryPageSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [...KEYS])
      .then((r) => {
        const data = (r.data ?? []).reduce((acc: Record<string, string>, row: { key: string; value: string }) => {
          acc[row.key] = row.value ?? '';
          return acc;
        }, {});
        form.setFieldsValue({
          category_grid_cols_xs: data.category_grid_cols_xs || '2',
          category_grid_cols_sm: data.category_grid_cols_sm || '3',
          category_grid_cols_md: data.category_grid_cols_md || '4',
          category_grid_cols_lg: data.category_grid_cols_lg || '6',
          category_grid_columns_extra: data.category_grid_columns_extra || '8',
          category_use_poster: data.category_use_poster || 'thumb',
        });
        setLoading(false);
      });
  }, [form]);

  const onFinish = async (values: Record<string, string>) => {
    try {
      for (const key of KEYS) {
        const value = values[key] ?? (key === 'category_use_poster' ? 'thumb' : '4');
        const { error } = await supabase
          .from('site_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      message.success('Đã lưu. Chạy Build website để áp dụng lên các trang Phim bộ, Phim lẻ, Thể loại, Quốc gia, Danh sách, Tìm kiếm.');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
    }
  };

  return (
    <>
      <h1>Cài đặt trang danh mục</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Áp dụng cho các trang: Phim bộ, Phim lẻ, Thể loại, Quốc gia, Danh sách, Tìm kiếm. Sau khi lưu cần chạy Build website.
      </p>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="category_grid_cols_xs" label="Số cột mặc định - Mobile nhỏ (&lt;480px)">
            <Select options={COLUMN_OPTIONS} />
          </Form.Item>
          <Form.Item name="category_grid_cols_sm" label="Số cột mặc định - Mobile lớn (480–767px)">
            <Select options={COLUMN_OPTIONS} />
          </Form.Item>
          <Form.Item name="category_grid_cols_md" label="Số cột mặc định - Tablet (768–1023px)">
            <Select options={COLUMN_OPTIONS} />
          </Form.Item>
          <Form.Item name="category_grid_cols_lg" label="Số cột mặc định - Desktop (1024px+)">
            <Select options={COLUMN_OPTIONS} />
          </Form.Item>
          <Form.Item name="category_grid_columns_extra" label="Lựa chọn cột thứ 4 trên toolbar (2, 3, 4 và ô này: 6–16)">
            <Select options={COLUMN_EXTRA_OPTIONS} />
          </Form.Item>
          <Form.Item name="category_use_poster" label="Loại ảnh">
            <Select options={IMAGE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
