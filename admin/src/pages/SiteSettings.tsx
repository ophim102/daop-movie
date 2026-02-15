import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Switch } from 'antd';
import { supabase } from '../lib/supabase';

export default function SiteSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('site_settings').select('key, value').then((r) => {
      const data = (r.data ?? []).reduce((acc: Record<string, any>, row: any) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      form.setFieldsValue({
        site_name: data.site_name ?? 'DAOP Phim',
        google_analytics_id: data.google_analytics_id ?? '',
        simple_analytics_script: data.simple_analytics_script ?? '',
        twikoo_env_id: data.twikoo_env_id ?? '',
        supabase_user_url: data.supabase_user_url ?? '',
        supabase_user_anon_key: data.supabase_user_anon_key ?? '',
        player_warning_enabled: data.player_warning_enabled !== 'false',
        player_warning_text: data.player_warning_text ?? 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
      });
      setLoading(false);
    });
  }, [form]);

  const onFinish = async (values: Record<string, any>) => {
    const toSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      toSave[key] = value === true || value === false ? String(value) : (value ?? '');
    }
    for (const [key, value] of Object.entries(toSave)) {
      await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
  };

  return (
    <>
      <h1>Cài đặt chung</h1>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="site_name" label="Tên website">
            <Input />
          </Form.Item>
          <Form.Item name="google_analytics_id" label="Google Analytics ID">
            <Input placeholder="G-XXXXXXXXXX" />
          </Form.Item>
          <Form.Item name="simple_analytics_script" label="SimpleAnalytics (mã nhúng)">
            <Input.TextArea rows={3} placeholder="<script>...</script>" />
          </Form.Item>
          <Form.Item name="twikoo_env_id" label="Twikoo Env ID (URL hoặc id)">
            <Input placeholder="https://xxx.vercel.app" />
          </Form.Item>
          <Form.Item name="supabase_user_url" label="Supabase User URL (website dùng)">
            <Input placeholder="https://xxx.supabase.co" />
          </Form.Item>
          <Form.Item name="supabase_user_anon_key" label="Supabase User Anon Key">
            <Input.Password placeholder="eyJ..." />
          </Form.Item>
          <Form.Item name="player_warning_enabled" label="Hiển thị cảnh báo dưới player" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="player_warning_text" label="Nội dung cảnh báo">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
