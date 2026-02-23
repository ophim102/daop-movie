import { useState, useEffect } from 'react';
import { Card, Button, List, message, Spin, Typography, InputNumber, Form, Space, Input } from 'antd';
import { PlayCircleOutlined, InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Text } = Typography;

const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
const OPHIM_BASE = (((import.meta as any).env?.VITE_OPHIM_BASE_URL) || 'https://ophim1.com/v1/api').replace(/\/$/, '');
const OPHIM_KEYS = {
  max_pages: 'ophim_max_pages',
  max_movies: 'ophim_max_movies',
  start_page: 'ophim_start_page',
  end_page: 'ophim_end_page',
  schedule: 'update_data_schedule',
};
const OPHIM_AUTO_KEYS = {
  max_pages: 'ophim_auto_max_pages',
  max_movies: 'ophim_auto_max_movies',
  start_page: 'ophim_auto_start_page',
  end_page: 'ophim_auto_end_page',
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
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [fetchingTotalPages, setFetchingTotalPages] = useState(false);
  const [form] = Form.useForm();

  const loadUpdateSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        OPHIM_KEYS.max_pages,
        OPHIM_KEYS.max_movies,
        OPHIM_KEYS.start_page,
        OPHIM_KEYS.end_page,
        OPHIM_KEYS.schedule,
        OPHIM_AUTO_KEYS.max_pages,
        OPHIM_AUTO_KEYS.max_movies,
        OPHIM_AUTO_KEYS.start_page,
        OPHIM_AUTO_KEYS.end_page,
      ]);
    const map: Record<string, string> = {};
    (data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
    const max_pages = map[OPHIM_KEYS.max_pages] != null ? Number(map[OPHIM_KEYS.max_pages]) : 5;
    const max_movies = map[OPHIM_KEYS.max_movies] != null ? Number(map[OPHIM_KEYS.max_movies]) : 500;
    const start_page = map[OPHIM_KEYS.start_page] != null ? Number(map[OPHIM_KEYS.start_page]) : 1;
    const end_page = map[OPHIM_KEYS.end_page] != null ? Number(map[OPHIM_KEYS.end_page]) : 0;
    const schedule = map[OPHIM_KEYS.schedule] ?? '';
    const auto_max_pages = map[OPHIM_AUTO_KEYS.max_pages] != null ? Number(map[OPHIM_AUTO_KEYS.max_pages]) : max_pages;
    const auto_max_movies = map[OPHIM_AUTO_KEYS.max_movies] != null ? Number(map[OPHIM_AUTO_KEYS.max_movies]) : max_movies;
    const auto_start_page = map[OPHIM_AUTO_KEYS.start_page] != null ? Number(map[OPHIM_AUTO_KEYS.start_page]) : start_page;
    const auto_end_page = map[OPHIM_AUTO_KEYS.end_page] != null ? Number(map[OPHIM_AUTO_KEYS.end_page]) : end_page;

    setUpdateSettings({ max_pages, max_movies, start_page, end_page, schedule });
    form.setFieldsValue({
      max_pages,
      max_movies,
      start_page,
      end_page,
      schedule,
      auto_max_pages,
      auto_max_movies,
      auto_start_page,
      auto_end_page,
    });
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
          { key: OPHIM_AUTO_KEYS.max_pages, value: String(values.auto_max_pages ?? values.max_pages ?? 5), updated_at: now },
          { key: OPHIM_AUTO_KEYS.max_movies, value: String(values.auto_max_movies ?? values.max_movies ?? 500), updated_at: now },
          { key: OPHIM_AUTO_KEYS.start_page, value: String(values.auto_start_page ?? values.start_page ?? 1), updated_at: now },
          { key: OPHIM_AUTO_KEYS.end_page, value: String(values.auto_end_page ?? values.end_page ?? 0), updated_at: now },
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

  const handleFetchTotalPages = async () => {
    setFetchingTotalPages(true);
    try {
      const res = await fetch(`${OPHIM_BASE}/danh-sach/phim-moi?page=1&limit=1`);
      const data = await res.json().catch(() => ({}));
      const pagination = data?.data?.params?.pagination;
      const totalItems = pagination?.totalItems;
      const perPage = pagination?.totalItemsPerPage || 1;
      if (!totalItems || !perPage) {
        throw new Error('Không đọc được tổng số trang từ API OPhim.');
      }
      const pages = Math.ceil(Number(totalItems) / Number(perPage));
      setTotalPages(pages);
      message.success(`Tổng số trang OPhim hiện tại: ${pages}`);
    } catch (e: any) {
      message.error(e?.message || 'Không lấy được tổng số trang từ OPhim.');
    } finally {
      setFetchingTotalPages(false);
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
          Cài đặt OPhim cho build thủ công (nút Kích hoạt) và build tự động (0h, 6h, 12h, 18h). Để 0 = không giới hạn.
        </Text>
        <Form form={form} layout="inline" initialValues={updateSettings}>
          <Text strong style={{ width: '100%' }}>Thủ công (khi bấm Kích hoạt):</Text>
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
          <Text strong style={{ width: '100%', marginTop: 16 }}>Tự động (0h, 6h, 12h, 18h):</Text>
          <Form.Item name="auto_max_pages" label="Auto: Số trang tối đa">
            <InputNumber min={0} max={100} placeholder="5" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="auto_max_movies" label="Auto: Số phim tối đa">
            <InputNumber min={0} max={10000} placeholder="500" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="auto_start_page" label="Auto: Trang bắt đầu">
            <InputNumber min={1} max={100000} placeholder="1" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="auto_end_page" label="Auto: Trang kết thúc">
            <InputNumber min={0} max={100000} placeholder="0 (không giới hạn)" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item>
            <Space direction="vertical" size={4}>
              <Button onClick={handleFetchTotalPages} loading={fetchingTotalPages}>
                Lấy tổng số trang
              </Button>
              {totalPages != null && (
                <Text type="secondary">Tổng số trang hiện tại: {totalPages}</Text>
              )}
            </Space>
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
