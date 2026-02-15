import { useEffect, useState } from 'react';
import { Table } from 'antd';
import { supabase } from '../lib/supabase';

export default function AuditLogs() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).then((r) => {
      setData(r.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <h1>Nhật ký (Audit Logs)</h1>
      <Table
        loading={loading}
        dataSource={data}
        rowKey="id"
        columns={[
          { title: 'Thời gian', dataIndex: 'created_at', key: 'created_at', render: (t: string) => new Date(t).toLocaleString() },
          { title: 'User', dataIndex: 'user_id', key: 'user_id' },
          { title: 'Hành động', dataIndex: 'action', key: 'action' },
          { title: 'Đối tượng', dataIndex: 'entity_type', key: 'entity_type' },
          { title: 'ID', dataIndex: 'entity_id', key: 'entity_id' },
          { title: 'IP', dataIndex: 'ip_address', key: 'ip_address' },
        ]}
        pagination={{ pageSize: 20 }}
      />
    </>
  );
}
