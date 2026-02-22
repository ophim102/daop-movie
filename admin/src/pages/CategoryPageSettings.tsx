import { useEffect, useState } from 'react';
import { Card, Form, Select, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

const KEYS = ['category_grid_column_type', 'category_use_poster'] as const;

const COLUMN_TYPE_OPTIONS = [
  { value: 'A', label: 'Loại A (2, 3, 4, 6, 8 cột)' },
  { value: 'B', label: 'Loại B (3, 4, 6, 8 cột - ít nhất 3 cột)' },
];

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
          category_grid_column_type: data.category_grid_column_type || 'A',
          category_use_poster: data.category_use_poster || 'thumb',
        });
        setLoading(false);
      });
  }, [form]);

  const onFinish = async (values: Record<string, string>) => {
    try {
      for (const key of KEYS) {
        const value = values[key] ?? (key === 'category_grid_column_type' ? 'A' : 'thumb');
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
          <Form.Item
            name="category_grid_column_type"
            label="Loại cột"
          >
            <Select options={COLUMN_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="category_use_poster"
            label="Loại ảnh"
          >
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
