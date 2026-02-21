import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

type SectionRow = {
  id: string;
  sort_order: number;
  title: string;
  source_type: string;
  source_value: string;
  limit_count: number;
  more_link?: string;
  display_type?: string;
  is_active: boolean;
};

const SOURCE_TYPE_OPTIONS = [
  { value: 'type', label: 'Type (series, single, tvshows, hoathinh)' },
  { value: 'genre', label: 'Thể loại (slug)' },
  { value: 'country', label: 'Quốc gia (slug)' },
  { value: 'year', label: 'Năm phát hành' },
  { value: 'status', label: 'Trạng thái (current, upcoming, theater)' },
  { value: 'quality_4k', label: 'Phim 4K (quality_4k)' },
];

const DISPLAY_TYPE_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'slider', label: 'Slider' },
  { value: 'list', label: 'List' },
];

export default function HomepageSections() {
  const [data, setData] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<SectionRow>();

  const loadData = async () => {
    setLoading(true);
    const r = await supabase.from('homepage_sections').select('*').order('sort_order');
    setData((r.data as SectionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      sort_order: (data[data.length - 1]?.sort_order ?? 0) + 1,
      limit_count: 24,
      display_type: 'grid',
      is_active: true,
    } as any);
    setModalVisible(true);
  };

  const openEdit = (row: SectionRow) => {
    setEditingId(row.id);
    form.setFieldsValue({
      ...row,
      is_active: !!row.is_active,
    } as any);
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      is_active: !!values.is_active,
      sort_order: Number(values.sort_order ?? 0),
      limit_count: Number(values.limit_count ?? 24),
    };
    if (editingId) {
      await supabase.from('homepage_sections').update(payload).eq('id', editingId);
      message.success('Đã cập nhật section');
    } else {
      await supabase.from('homepage_sections').insert(payload);
      message.success('Đã thêm section');
    }
    setModalVisible(false);
    await loadData();
  };

  const toggleActive = async (row: SectionRow) => {
    await supabase
      .from('homepage_sections')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    await loadData();
  };

  const changeOrder = async (row: SectionRow, direction: 'up' | 'down') => {
    const index = data.findIndex((d) => d.id === row.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.length) return;
    const other = data[targetIndex];
    await Promise.all([
      supabase
        .from('homepage_sections')
        .update({ sort_order: other.sort_order })
        .eq('id', row.id),
      supabase
        .from('homepage_sections')
        .update({ sort_order: row.sort_order })
        .eq('id', other.id),
    ]);
    await loadData();
  };

  return (
    <>
      <h1>Homepage Sections</h1>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Thêm section
        </Button>
      </div>
      <Table
        loading={loading}
        dataSource={data}
        rowKey="id"
        pagination={false}
        columns={[
          { title: 'Thứ tự', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
          { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
          {
            title: 'Loại nguồn',
            dataIndex: 'source_type',
            key: 'source_type',
            render: (t: string) => <Tag>{t}</Tag>,
          },
          { title: 'Giá trị', dataIndex: 'source_value', key: 'source_value' },
          { title: 'Số lượng', dataIndex: 'limit_count', key: 'limit_count' },
          {
            title: 'Hiển thị',
            dataIndex: 'display_type',
            key: 'display_type',
            render: (t: string) => (t ? <Tag>{t}</Tag> : <Tag>grid</Tag>),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (v: boolean) => (
              <Tag color={v ? 'green' : 'default'}>{v ? 'Bật' : 'Tắt'}</Tag>
            ),
          },
          {
            title: '',
            key: 'action',
            width: 220,
            render: (_: any, row: SectionRow, index: number) => (
              <Space>
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0}
                  onClick={() => changeOrder(row, 'up')}
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={index === data.length - 1}
                  onClick={() => changeOrder(row, 'down')}
                />
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
                  Sửa
                </Button>
                <Button size="small" onClick={() => toggleActive(row)}>
                  {row.is_active ? 'Tắt' : 'Bật'}
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editingId ? 'Sửa section' : 'Thêm section'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="source_type"
            label="Loại nguồn"
            rules={[{ required: true }]}
          >
            <Select options={SOURCE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="source_value"
            label="Giá trị (slug hoặc giá trị tương ứng)"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="limit_count" label="Số lượng">
            <InputNumber min={1} max={120} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="display_type" label="Kiểu hiển thị">
            <Select allowClear options={DISPLAY_TYPE_OPTIONS} placeholder="Mặc định: grid" />
          </Form.Item>
          <Form.Item name="more_link" label='Link "Xem thêm"'>
            <Input placeholder="Ví dụ: /phim-bo.html" />
          </Form.Item>
          <Form.Item name="sort_order" label="Thứ tự">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Kích hoạt"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
