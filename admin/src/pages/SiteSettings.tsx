import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Switch, message } from 'antd';
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
        logo_url: data.logo_url ?? '',
        favicon_url: data.favicon_url ?? '',
        google_analytics_id: data.google_analytics_id ?? '',
        simple_analytics_script: data.simple_analytics_script ?? '',
        twikoo_env_id: data.twikoo_env_id ?? '',
        supabase_user_url: data.supabase_user_url ?? '',
        supabase_user_anon_key: data.supabase_user_anon_key ?? '',
        player_warning_enabled: data.player_warning_enabled !== 'false',
        player_warning_text: data.player_warning_text ?? 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
        movies_data_url: data.movies_data_url ?? '',
        social_facebook: data.social_facebook ?? '',
        social_twitter: data.social_twitter ?? '',
        social_instagram: data.social_instagram ?? '',
        social_youtube: data.social_youtube ?? '',
        footer_content: data.footer_content ?? '',
        tmdb_attribution: data.tmdb_attribution !== 'false',
      });
      setLoading(false);
    });
  }, [form]);

  const onFinish = async (values: Record<string, any>) => {
    try {
      const toSave: Record<string, string> = {};
      for (const [key, value] of Object.entries(values)) {
        toSave[key] = value === true || value === false ? String(value) : (value ?? '');
      }
      for (const [key, value] of Object.entries(toSave)) {
        await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      message.success('Đã lưu cài đặt');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
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
          <Form.Item name="logo_url" label="Logo (URL ảnh)">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="favicon_url" label="Favicon (URL ảnh)">
            <Input placeholder="https://..." />
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
          <Form.Item name="movies_data_url" label="URL dữ liệu phim (movies-light.js)">
            <Input placeholder="https://your-site.com/data/movies-light.js" />
            <span style={{ color: '#666', fontSize: 12 }}>Dùng cho Slider: thêm slide từ link phim. Để trống = tắt.</span>
          </Form.Item>
          <Form.Item name="social_facebook" label="Facebook (URL)">
            <Input placeholder="https://facebook.com/..." />
          </Form.Item>
          <Form.Item name="social_twitter" label="Twitter / X (URL)">
            <Input placeholder="https://twitter.com/..." />
          </Form.Item>
          <Form.Item name="social_instagram" label="Instagram (URL)">
            <Input placeholder="https://instagram.com/..." />
          </Form.Item>
          <Form.Item name="social_youtube" label="YouTube (URL)">
            <Input placeholder="https://youtube.com/..." />
          </Form.Item>
          <Form.Item name="footer_content" label="Nội dung footer (HTML, để trống = dùng mặc định)">
            <Input.TextArea rows={4} placeholder="<p>Donate</p><p>Trường Sa, Hoàng Sa...</p>" />
          </Form.Item>
          <Form.Item name="tmdb_attribution" label="Hiển thị ghi nhận TMDB" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
