import { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Button } from 'antd';
import { supabase } from '../lib/supabase';

export default function DonateSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('donate_settings').select('*').limit(1).single().then((r) => {
      if (r.data) form.setFieldsValue(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [form]);

  const onFinish = async (values: any) => {
    await supabase.from('donate_settings').upsert(values, { onConflict: 'id' });
  };

  return (
    <>
      <h1>Quản lý Donate</h1>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="id" hidden><Input type="hidden" /></Form.Item>
          <Form.Item name="target_amount" label="Mục tiêu (số tiền)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="target_currency" label="Đơn vị tiền tệ">
            <Input placeholder="VND" />
          </Form.Item>
          <Form.Item name="current_amount" label="Đã quyên góp">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paypal_link" label="Link PayPal">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
