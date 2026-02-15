import { useEffect, useState } from 'react';
import { Table, Button, Tag } from 'antd';
import { supabase } from '../lib/supabase';

export default function ServerSources() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('server_sources').select('*').order('sort_order').then((r) => {
      setData(r.data ?? []);
      setLoading(false);
    });
  }, []);

  const toggleActive = async (row: any) => {
    await supabase.from('server_sources').update({ is_active: !row.is_active }).eq('id', row.id);
    setData((prev) => prev.map((p) => (p.id === row.id ? { ...p, is_active: !p.is_active } : p)));
  };

  return (
    <>
      <h1>Nguồn server</h1>
      <Table
        loading={loading}
        dataSource={data}
        rowKey="id"
        columns={[
          { title: 'Thứ tự', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
          { title: 'Tên', dataIndex: 'name', key: 'name' },
          { title: 'Slug', dataIndex: 'slug', key: 'slug' },
          { title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Bật' : 'Tắt'}</Tag> },
          { title: '', key: 'action', render: (_: any, row: any) => <Button size="small" onClick={() => toggleActive(row)}>{row.is_active ? 'Tắt' : 'Bật'}</Button> },
        ]}
      />
    </>
  );
}
