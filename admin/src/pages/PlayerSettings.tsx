import { useEffect, useState } from 'react';
import { Card, Form, Input, Switch, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

const PLAYER_KEYS = ['available_players', 'default_player', 'warning_enabled_global', 'warning_text'] as const;

function parseJsonSafe<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

export default function PlayerSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('player_settings').select('key, value').then((r) => {
      const rows = r.data ?? [];
      const data: Record<string, any> = {};
      for (const row of rows) {
        data[row.key] = row.value;
      }
      const available = parseJsonSafe(data.available_players, { plyr: 'Plyr', videojs: 'Video.js', jwplayer: 'JWPlayer' });
      const options = Object.entries(available).map(([k, v]) => ({ label: `${k}: ${v}`, value: k }));
      form.setFieldsValue({
        default_player: data.default_player ?? 'plyr',
        warning_enabled_global: data.warning_enabled_global !== false,
        warning_text: typeof data.warning_text === 'string' ? data.warning_text : 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
        available_players_json: JSON.stringify(available, null, 2),
      });
      setLoading(false);
    });
  }, [form]);

  const onFinish = async (values: Record<string, any>) => {
    let available: Record<string, string> = {};
    try {
      available = JSON.parse(values.available_players_json || '{}');
    } catch {
      message.error('available_players phải là JSON hợp lệ');
      return;
    }
    try {
      const rows = [
        { key: 'available_players', value: available },
        { key: 'default_player', value: values.default_player ?? 'plyr' },
        { key: 'warning_enabled_global', value: !!values.warning_enabled_global },
        { key: 'warning_text', value: values.warning_text ?? '' },
      ];
      for (const row of rows) {
        const { error } = await supabase.from('player_settings').upsert(
          { ...row, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
        if (error) throw error;
      }
      message.success('Đã lưu. Chạy Build website để áp dụng lên player.');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
    }
  };

  return (
    <>
      <h1>Cài đặt Player</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Admin chọn player nào thì trang xem sẽ dùng đúng player đó để phát video. Player mặc định áp dụng cho mọi lượt xem (người dùng không đổi được). Build sẽ xuất ra player-settings.json.
      </p>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="available_players_json" label="Danh sách player (JSON: key -> tên hiển thị)">
            <Input.TextArea rows={5} placeholder='{"plyr":"Plyr","videojs":"Video.js","jwplayer":"JWPlayer"}' />
          </Form.Item>
          <Form.Item name="default_player" label="Player dùng để phát video (key trùng trong danh sách trên: plyr, videojs, jwplayer hoặc tên tùy chỉnh)">
            <Input placeholder="plyr" />
          </Form.Item>
          <p style={{ color: '#666', fontSize: 12, marginTop: -8, marginBottom: 16 }}>Với link trực tiếp (m3u8/HLS): plyr hoặc videojs sẽ load thư viện tương ứng. Link iframe/embed thì luôn dùng iframe.</p>
          <Form.Item name="warning_enabled_global" label="Bật cảnh báo toàn cục" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="warning_text" label="Nội dung cảnh báo">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
