import { useState, useEffect } from 'react';
import { Card, Button, List, message, Spin, Typography, InputNumber, Form, Space } from 'antd';
import { PlayCircleOutlined, InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Text } = Typography;

const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
const OPHIM_BASE = (((import.meta as any).env?.VITE_OPHIM_BASE_URL) || 'https://ophim1.com/v1/api').replace(/\/$/, '');
const OPHIM_KEYS = {
  start_page: 'ophim_start_page',
  end_page: 'ophim_end_page',
};
const OPHIM_AUTO_KEYS = {
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
  const [updateSettings, setUpdateSettings] = useState<{ start_page: number; end_page: number }>({
    start_page: 1,
    end_page: 1,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalMovies, setTotalMovies] = useState<number | null>(null);
  const [fetchingTotalPages, setFetchingTotalPages] = useState(false);
  const [form] = Form.useForm();

  const loadUpdateSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        OPHIM_KEYS.start_page,
        OPHIM_KEYS.end_page,
        OPHIM_AUTO_KEYS.start_page,
        OPHIM_AUTO_KEYS.end_page,
      ]);
    const map: Record<string, string> = {};
    (data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
    const start_page = map[OPHIM_KEYS.start_page] != null ? Number(map[OPHIM_KEYS.start_page]) : 1;
    const end_page = map[OPHIM_KEYS.end_page] != null ? Number(map[OPHIM_KEYS.end_page]) : 1;
    const auto_start_page = map[OPHIM_AUTO_KEYS.start_page] != null ? Number(map[OPHIM_AUTO_KEYS.start_page]) : start_page;
    const auto_end_page = map[OPHIM_AUTO_KEYS.end_page] != null ? Number(map[OPHIM_AUTO_KEYS.end_page]) : end_page;

    setUpdateSettings({ start_page, end_page });
    form.setFieldsValue({
      start_page,
      end_page,
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
          { key: OPHIM_KEYS.start_page, value: String(values.start_page ?? 1), updated_at: now },
          { key: OPHIM_KEYS.end_page, value: String(values.end_page ?? 1), updated_at: now },
          { key: OPHIM_AUTO_KEYS.start_page, value: String(values.auto_start_page ?? values.start_page ?? 1), updated_at: now },
          { key: OPHIM_AUTO_KEYS.end_page, value: String(values.auto_end_page ?? values.end_page ?? 1), updated_at: now },
        ],
        { onConflict: 'key' }
      );
      if (error) throw error;
      setUpdateSettings((prev) => ({
        ...prev,
        start_page: values.start_page ?? prev.start_page,
        end_page: values.end_page ?? prev.end_page,
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
      const body: { action: string; start_page?: number; end_page?: number } = { action: actionId };
      if (actionId === 'update-data') {
        const values = form.getFieldsValue();
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
      // API mặc định: 24 phim/trang, trang 1 là mới nhất
      const res = await fetch(`${OPHIM_BASE}/danh-sach/phim-moi?page=1&limit=24`);
      const data = await res.json().catch(() => ({}));
      const pagination = data?.data?.params?.pagination;
      const totalItems = pagination?.totalItems;
      const perPage = 24;
      if (totalItems == null) {
        throw new Error('Không đọc được tổng số phim từ API OPhim.');
      }
      const pages = Math.ceil(Number(totalItems) / perPage);
      setTotalPages(pages);
      setTotalMovies(Number(totalItems));
      message.success(`OPhim: tổng phim ${Number(totalItems)} • tổng trang ${pages} (24 phim/trang)`);
    } catch (e: any) {
      message.error(e?.message || 'Không lấy được tổng số trang/phim từ OPhim.');
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
          Chỉ chọn khoảng trang để lấy. API mặc định: 24 phim/trang, trang 1 là mới nhất. Lấy theo kiểu lùi và kết thúc ở trang 1.
        </Text>
        <Form form={form} layout="inline" initialValues={updateSettings}>
          <Text strong style={{ width: '100%' }}>Thủ công (khi bấm Kích hoạt):</Text>
          <Form.Item name="start_page" label="Trang bắt đầu" rules={[{ required: true }]}>
            <InputNumber min={1} max={100000} placeholder="1" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="end_page" label="Trang kết thúc">
            <InputNumber min={1} max={100000} placeholder="1" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item>
            <Button icon={<SaveOutlined />} onClick={handleSaveUpdateSettings} loading={savingSettings}>
              Lưu mặc định
            </Button>
          </Form.Item>
          <Text strong style={{ width: '100%', marginTop: 16 }}>Tự động (0h, 6h, 12h, 18h):</Text>
          <Form.Item name="auto_start_page" label="Auto: Trang bắt đầu">
            <InputNumber min={1} max={100000} placeholder="1" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="auto_end_page" label="Auto: Trang kết thúc">
            <InputNumber min={1} max={100000} placeholder="1" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item>
            <Space direction="vertical" size={4}>
              <Button onClick={handleFetchTotalPages} loading={fetchingTotalPages}>
                Lấy tổng số trang/phim
              </Button>
              {totalMovies != null && totalPages != null && (
                <Text type="secondary">Tổng phim: {totalMovies} • Tổng trang: {totalPages}</Text>
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
