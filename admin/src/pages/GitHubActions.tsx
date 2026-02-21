import { useState, useEffect } from 'react';
import { Card, Button, List, message, Spin, Typography } from 'antd';
import { PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');

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
  }, []);

  const handleTrigger = async (actionId: string) => {
    setTriggering(actionId);
    try {
      const res = await fetch(`${API_URL}/api/trigger-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId }),
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
