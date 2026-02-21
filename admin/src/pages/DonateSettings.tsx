import { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Button, message } from 'antd';
import { supabase } from '../lib/supabase';

export default function DonateSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await supabase.from('donate_settings').select('*').limit(1).maybeSingle();
        if (r.data) form.setFieldsValue(r.data);
        else form.setFieldsValue({ target_amount: 0, current_amount: 0, target_currency: 'VND', paypal_link: '' });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onFinish = async (values: any) => {
    try {
      const { id, ...rest } = values;
      if (id) {
        await supabase.from('donate_settings').upsert({ id, ...rest }, { onConflict: 'id' });
      } else {
        const { data, error } = await supabase.from('donate_settings').insert(rest).select('id').single();
        if (error) throw error;
        if (data?.id) form.setFieldValue('id', data.id);
      }
      message.success('Đã lưu Donate');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
    }
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
