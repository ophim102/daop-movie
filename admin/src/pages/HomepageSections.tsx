import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { supabase } from '../lib/supabase';

export default function HomepageSections() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('homepage_sections').select('*').order('sort_order').then((r) => {
      setData(r.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <h1>Homepage Sections</h1>
      <Table
        loading={loading}
        dataSource={data}
        rowKey="id"
        columns={[
          { title: 'Thứ tự', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
          { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
          { title: 'Loại nguồn', dataIndex: 'source_type', key: 'source_type', render: (t: string) => <Tag>{t}</Tag> },
          { title: 'Giá trị', dataIndex: 'source_value', key: 'source_value' },
          { title: 'Số lượng', dataIndex: 'limit_count', key: 'limit_count' },
          { title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Bật' : 'Tắt'}</Tag> },
        ]}
      />
    </>
  );
}
