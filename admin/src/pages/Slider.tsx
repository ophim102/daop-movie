import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Image,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

type SlideItem = {
  image_url: string;
  link_url?: string;
  title?: string;
  sort_order?: number;
};

const SLIDER_KEY = 'homepage_slider';

export default function Slider() {
  const [list, setList] = useState<SlideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('value').eq('key', SLIDER_KEY).single();
    try {
      const parsed = data?.value ? JSON.parse(data.value) : [];
      setList(Array.isArray(parsed) ? parsed : []);
    } catch {
      setList([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveList = async (newList: SlideItem[]) => {
    await supabase.from('site_settings').upsert(
      { key: SLIDER_KEY, value: JSON.stringify(newList), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    message.success('Đã lưu slider');
    setList(newList);
  };

  const openAdd = () => {
    setEditingIndex(null);
    form.resetFields();
    form.setFieldsValue({ sort_order: list.length });
    setModalVisible(true);
  };

  const openEdit = (idx: number) => {
    setEditingIndex(idx);
    form.setFieldsValue(list[idx] || {});
    setModalVisible(true);
  };

  const handleDelete = async (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    await saveList(next);
  };

  const handleSubmit = async (values: any) => {
    const slide: SlideItem = {
      image_url: values.image_url || '',
      link_url: values.link_url || '',
      title: values.title || '',
      sort_order: typeof values.sort_order === 'number' ? values.sort_order : list.length,
    };
    let next: SlideItem[];
    if (editingIndex !== null) {
      next = list.map((s, i) => (i === editingIndex ? slide : s));
    } else {
      next = [...list, slide];
    }
    next.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    await saveList(next);
    setModalVisible(false);
  };

  return (
    <>
      <h1>Slider trang chủ</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Các slide hiển thị dạng carousel trên trang chủ. Lưu trong Cài đặt chung (site_settings).
      </p>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Thêm slide
        </Button>
      </div>
      <Table
        loading={loading}
        dataSource={list.map((item, idx) => ({ ...item, key: idx, _index: idx }))}
        rowKey="_index"
        pagination={false}
        columns={[
          {
            title: 'Ảnh',
            dataIndex: 'image_url',
            key: 'img',
            render: (url: string) =>
              url ? <Image src={url} width={80} height={45} style={{ objectFit: 'cover' }} alt="" /> : '-',
          },
          { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
          { title: 'Link', dataIndex: 'link_url', key: 'link_url', ellipsis: true },
          { title: 'Thứ tự', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
          {
            title: '',
            key: 'action',
            width: 140,
            render: (_: any, row: any) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row._index)}>Sửa</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row._index)}>Xóa</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editingIndex !== null ? 'Sửa slide' : 'Thêm slide'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="image_url" label="URL ảnh" rules={[{ required: true }]}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="https://... hoặc Upload R2" style={{ flex: 1 }} />
              <label style={{ marginBottom: 0 }}>
                <input
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
                        const apiBase = (import.meta as any).env?.VITE_API_URL || '';
                        const r = await fetch(apiBase + '/api/upload-image', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ image: base64, contentType: file.type || 'image/jpeg' }),
                        });
                        const data = await r.json();
                        if (data.url) {
                          form.setFieldValue('image_url', data.url);
                          message.success('Đã upload ảnh');
                        } else message.error(data.error || 'Upload thất bại');
                      } catch {
                        message.error('Lỗi kết nối API upload');
                      }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Button type="default" size="small">Upload R2</Button>
              </label>
            </div>
          </Form.Item>
          <Form.Item name="link_url" label="Link khi click">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề">
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="Thứ tự">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
