import { useEffect, useState } from 'react';
import { Table, Button, Space, Image, Tag } from 'antd';
import { supabase } from '../lib/supabase';

export default function Banners() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('ad_banners').select('*').order('created_at', { ascending: false }).then((r) => {
      setData(r.data ?? []);
      setLoading(false);
    });
  }, []);

  const toggleActive = async (row: any) => {
    await supabase.from('ad_banners').update({ is_active: !row.is_active }).eq('id', row.id);
    setData((prev) => prev.map((p) => (p.id === row.id ? { ...p, is_active: !p.is_active } : p)));
  };

  return (
    <>
      <h1>Quản lý quảng cáo / Banner</h1>
      <Table
        loading={loading}
        dataSource={data}
        rowKey="id"
        columns={[
          { title: 'Ảnh', dataIndex: 'image_url', key: 'img', render: (url: string) => url ? <Image src={url} width={80} height={45} style={{ objectFit: 'cover' }} alt="" /> : '-' },
          { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
          { title: 'Vị trí', dataIndex: 'position', key: 'position' },
          { title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Bật' : 'Tắt'}</Tag> },
          {
            title: '',
            key: 'action',
            render: (_: any, row: any) => (
              <Space>
                <Button size="small" onClick={() => toggleActive(row)}>{row.is_active ? 'Tắt' : 'Bật'}</Button>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
