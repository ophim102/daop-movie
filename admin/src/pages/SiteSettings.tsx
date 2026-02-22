import { useEffect, useState, useRef } from 'react';
import { Card, Form, Input, Button, Switch, message } from 'antd';
import { supabase } from '../lib/supabase';

const SITE_SETTINGS_KEYS = [
  'site_name',
  'logo_url',
  'favicon_url',
  'google_analytics_id',
  'simple_analytics_script',
  'twikoo_env_id',
  'supabase_user_url',
  'supabase_user_anon_key',
  'player_warning_enabled',
  'player_warning_text',
  'player_visible',
  'movies_data_url',
  'social_facebook',
  'social_twitter',
  'social_instagram',
  'social_youtube',
  'footer_content',
  'tmdb_attribution',
  'loading_screen_enabled',
  'loading_screen_min_seconds',
] as const;

export default function SiteSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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
        player_visible: data.player_visible !== 'false',
        movies_data_url: data.movies_data_url ?? '',
        social_facebook: data.social_facebook ?? '',
        social_twitter: data.social_twitter ?? '',
        social_instagram: data.social_instagram ?? '',
        social_youtube: data.social_youtube ?? '',
        footer_content: data.footer_content ?? '',
        tmdb_attribution: data.tmdb_attribution !== 'false',
        loading_screen_enabled: data.loading_screen_enabled !== 'false',
        loading_screen_min_seconds: data.loading_screen_min_seconds ?? '0',
      });
      setLoading(false);
    });
  }, [form]);

  const onFinish = async (values: Record<string, any>) => {
    try {
      const toSave: Record<string, string> = {};
      for (const key of SITE_SETTINGS_KEYS) {
        const raw = values[key];
        toSave[key] = raw === true || raw === false ? String(raw) : (raw ?? '');
      }
      for (const [key, value] of Object.entries(toSave)) {
        const { error } = await supabase
          .from('site_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
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
            <Input
              placeholder="https://... hoặc bấm nút bên cạnh để tải ảnh"
              addonAfter={
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || file.size > 4 * 1024 * 1024) {
                        message.warning('Chọn ảnh ≤ 4MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result as string)?.split(',')[1];
                        if (!base64) return;
                        try {
                          const apiBase = ((import.meta as any).env?.VITE_API_URL || window.location.origin).replace(/\/$/, '');
                          const r = await fetch(apiBase + '/api/upload-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image: base64, contentType: file.type || 'image/jpeg' }),
                          });
                          const data = await r.json();
                          if (data.url) {
                            form.setFieldValue('logo_url', data.url);
                            message.success('Đã upload ảnh logo');
                          } else {
                            message.error(data.error || 'Upload thất bại');
                          }
                        } catch {
                          message.error('Lỗi kết nối API upload. Cần deploy Admin lên Vercel và cấu hình R2.');
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                  <Button type="link" size="small" onClick={() => logoInputRef.current?.click()}>
                    Chọn ảnh / Tải lên
                  </Button>
                </span>
              }
            />
          </Form.Item>
          <Form.Item name="favicon_url" label="Favicon (URL ảnh)">
            <Input
              placeholder="https://... hoặc bấm nút bên cạnh để tải ảnh"
              addonAfter={
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || file.size > 4 * 1024 * 1024) {
                        message.warning('Chọn ảnh ≤ 4MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result as string)?.split(',')[1];
                        if (!base64) return;
                        try {
                          const apiBase = ((import.meta as any).env?.VITE_API_URL || window.location.origin).replace(/\/$/, '');
                          const r = await fetch(apiBase + '/api/upload-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image: base64, contentType: file.type || 'image/png' }),
                          });
                          const data = await r.json();
                          if (data.url) {
                            form.setFieldValue('favicon_url', data.url);
                            message.success('Đã upload ảnh favicon');
                          } else {
                            message.error(data.error || 'Upload thất bại');
                          }
                        } catch {
                          message.error('Lỗi kết nối API upload. Cần deploy Admin lên Vercel và cấu hình R2.');
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                  <Button type="link" size="small" onClick={() => faviconInputRef.current?.click()}>
                    Chọn ảnh / Tải lên
                  </Button>
                </span>
              }
            />
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
          <Form.Item name="player_visible" label="Hiển thị player trên trang xem phim" valuePropName="checked">
            <Switch />
          </Form.Item>
          <p style={{ color: '#666', fontSize: 12, marginTop: -8, marginBottom: 16 }}>Tắt = không hiển thị nút Xem / danh sách tập phát trên trang chi tiết phim.</p>
          <Form.Item name="player_warning_enabled" label="Hiển thị cảnh báo dưới player" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="player_warning_text" label="Nội dung cảnh báo">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="movies_data_url" label="URL dữ liệu phim (movies-light.js)">
            <Input placeholder="https://your-site.com/data/movies-light.js" />
          </Form.Item>
          <p style={{ color: '#666', fontSize: 12, marginTop: -8, marginBottom: 16 }}>Dùng cho Slider: thêm slide từ link phim. Để trống = tắt.</p>
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
          <Form.Item name="loading_screen_enabled" label="Màn hình Loading khi mở trang" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="loading_screen_min_seconds" label="Thời gian tối thiểu hiển thị Loading (giây)">
            <Input type="number" min={0} max={30} placeholder="0" />
          </Form.Item>
          <p style={{ color: '#666', fontSize: 12, marginTop: -8, marginBottom: 16 }}>Bật = hiện logo + chữ &quot;Loading...&quot;. Thời gian tối thiểu = màn Loading luôn hiện ít nhất X giây trước khi ẩn (0 = ẩn ngay khi tải xong).</p>
          <p style={{ color: '#888', fontSize: 12 }}>Grid &amp; Ảnh cho trang lọc/tìm kiếm: cấu hình tại <strong>Trang danh mục</strong> trong menu.</p>
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
