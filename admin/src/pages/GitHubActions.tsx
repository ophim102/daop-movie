import { useState, useEffect } from 'react';
import { Card, Button, List, message, Spin, Typography, InputNumber, Form, Space, Input } from 'antd';
import { PlayCircleOutlined, InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Text } = Typography;

const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
const OPHIM_KEYS = {
  max_pages: 'ophim_max_pages',
  max_movies: 'ophim_max_movies',
  start_page: 'ophim_start_page',
  end_page: 'ophim_end_page',
  schedule: 'update_data_schedule',
};

type ActionItem = {
  id: string;
  name: string;
  description: string;
};

const EXTRA_ACTIONS = [
  {
    id: 'deploy',
    name: 'Deploy to Cloudflare Pages',
    description: 'Tự chạy khi push lên nhánh main. Không kích hoạt thủ công.',
    triggerable: false,
  },
];

export default function GitHubActions() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [updateSettings, setUpdateSettings] = useState<{ max_pages: number; max_movies: number; start_page: number; end_page: number; schedule?: string }>({
    max_pages: 5,
    max_movies: 500,
    start_page: 1,
    end_page: 0,
    schedule: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [form] = Form.useForm();

  const loadUpdateSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [OPHIM_KEYS.max_pages, OPHIM_KEYS.max_movies, OPHIM_KEYS.start_page, OPHIM_KEYS.end_page, OPHIM_KEYS.schedule]);
    const map: Record<string, string> = {};
    (data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
    const max_pages = map[OPHIM_KEYS.max_pages] != null ? Number(map[OPHIM_KEYS.max_pages]) : 5;
    const max_movies = map[OPHIM_KEYS.max_movies] != null ? Number(map[OPHIM_KEYS.max_movies]) : 500;
    const start_page = map[OPHIM_KEYS.start_page] != null ? Number(map[OPHIM_KEYS.start_page]) : 1;
    const end_page = map[OPHIM_KEYS.end_page] != null ? Number(map[OPHIM_KEYS.end_page]) : 0;
    const schedule = map[OPHIM_KEYS.schedule] ?? '';
    setUpdateSettings({ max_pages, max_movies, start_page, end_page, schedule });
    form.setFieldsValue({ max_pages, max_movies, start_page, end_page, schedule });
  };

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/trigger-action`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.actions)) {
        setActions(data.actions);
      } else {
        setActions([
          { id: 'build-on-demand', name: 'Build on demand', description: 'Build incremental (config + category pages).' },
          { id: 'update-data', name: 'Update data daily', description: 'Full build (OPhim, TMDB, Sheets…).' },
        ]);
      }
    } catch {
      setActions([
        { id: 'build-on-demand', name: 'Build on demand', description: 'Build incremental (config + category pages).' },
        { id: 'update-data', name: 'Update data daily', description: 'Full build (OPhim, TMDB, Sheets…).' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    loadUpdateSettings();
  }, []);

  const handleSaveUpdateSettings = async () => {
    const values = await form.validateFields();
    setSavingSettings(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('site_settings').upsert(
        [
          { key: OPHIM_KEYS.max_pages, value: String(values.max_pages ?? 5), updated_at: now },
          { key: OPHIM_KEYS.max_movies, value: String(values.max_movies ?? 500), updated_at: now },
          { key: OPHIM_KEYS.start_page, value: String(values.start_page ?? 1), updated_at: now },
          { key: OPHIM_KEYS.end_page, value: String(values.end_page ?? 0), updated_at: now },
          { key: OPHIM_KEYS.schedule, value: String(values.schedule ?? ''), updated_at: now },
        ],
        { onConflict: 'key' }
      );
      if (error) throw error;
      setUpdateSettings((prev) => ({
        ...prev,
        max_pages: values.max_pages ?? 5,
        max_movies: values.max_movies ?? 500,
        start_page: values.start_page ?? prev.start_page,
        end_page: values.end_page ?? prev.end_page,
        schedule: values.schedule ?? prev.schedule,
      }));
      message.success('Đã lưu cài đặt.');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTrigger = async (actionId: string) => {
    setTriggering(actionId);
    try {
      const body: { action: string; max_pages?: number; max_movies?: number; start_page?: number; end_page?: number } = { action: actionId };
      if (actionId === 'update-data') {
        const values = form.getFieldsValue();
        if (values.max_pages != null) body.max_pages = values.max_pages;
        if (values.max_movies != null) body.max_movies = values.max_movies;
        if (values.start_page != null) body.start_page = values.start_page;
        if (values.end_page != null) body.end_page = values.end_page;
      }
      const res = await fetch(`${API_URL}/api/trigger-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(async () => ({ error: await res.text() }));
      if (res.ok && data?.ok) {
        message.success(data?.message || 'Đã kích hoạt.');
      } else {
        message.error(data?.error || data?.message || `Lỗi ${res.status}`);
      }
    } catch (e: any) {
      message.error(e?.message || 'Không kết nối được API. Kiểm tra GITHUB_TOKEN, GITHUB_REPO trên Vercel.');
    } finally {
      setTriggering(null);
    }
  };

  const triggerableList = actions.map((a) => ({ ...a, triggerable: true }));
  const allList = [...triggerableList, ...EXTRA_ACTIONS];

  return (
    <>
      <h1>GitHub Actions</h1>
      <Text type="secondary">
        Gom tất cả workflow có thể kích hoạt. Mỗi nút gọi API trigger tương ứng trên GitHub.
      </Text>

      <Card title="Cài đặt Update data" style={{ marginTop: 24 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Số trang và số phim dùng khi chạy &quot;Update data daily&quot; (OPhim). Để 0 = không giới hạn.
        </Text>
        <Form form={form} layout="inline" initialValues={updateSettings}>
          <Form.Item name="max_pages" label="Số trang tối đa" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} placeholder="5" style={{ width: 100 }} />
          </Form.Item>
          <Form.Item name="max_movies" label="Số phim tối đa" rules={[{ required: true }]}>
            <InputNumber min={0} max={10000} placeholder="500" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="start_page" label="Trang bắt đầu" rules={[{ required: true }]}>
            <InputNumber min={1} max={100000} placeholder="1" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="end_page" label="Trang kết thúc">
            <InputNumber min={0} max={100000} placeholder="0 (không giới hạn)" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="schedule" label="Giờ chạy (ghi chú)">
            <Input placeholder="Ví dụ: 02:00 hoặc cron" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button icon={<SaveOutlined />} onClick={handleSaveUpdateSettings} loading={savingSettings}>
              Lưu mặc định
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <Spin tip="Đang tải danh sách..." />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
            dataSource={allList}
            renderItem={(item: ActionItem & { triggerable?: boolean }) => (
              <List.Item>
                <Card
                  title={item.name}
                  extra={
                    item.triggerable !== false ? (
                      <Button
                        type="primary"
                        icon={triggering === item.id ? <Spin size="small" /> : <PlayCircleOutlined />}
                        onClick={() => handleTrigger(item.id)}
                        loading={triggering === item.id}
                        disabled={!!triggering}
                      >
                        Kích hoạt
                      </Button>
                    ) : (
                      <Button type="text" icon={<InfoCircleOutlined />} disabled>
                        Tự động (push main)
                      </Button>
                    )
                  }
                >
                  <Text type="secondary">{item.description}</Text>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </>
  );
}
