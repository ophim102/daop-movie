import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Tabs } from 'antd';
import { supabase } from '../lib/supabase';

const { TextArea } = Input;

export default function StaticPages() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('static_pages').select('*').then((r) => {
      const pages = r.data ?? [];
      const about = pages.find((p: any) => p.page_key === 'about');
      const appGuide = pages.find((p: any) => p.page_key === 'app_guide');
      form.setFieldsValue({
        about_content: about?.content ?? '',
        app_guide_content: appGuide?.content ?? '',
        apk_link: (appGuide as any)?.apk_link ?? '',
        testflight_link: (appGuide as any)?.testflight_link ?? '',
      });
      setLoading(false);
    });
  }, [form]);

  const onFinish = async (values: any) => {
    await supabase.from('static_pages').upsert([
      { page_key: 'about', content: values.about_content, updated_at: new Date().toISOString() },
      { page_key: 'app_guide', content: values.app_guide_content, apk_link: values.apk_link, testflight_link: values.testflight_link, updated_at: new Date().toISOString() },
    ], { onConflict: 'page_key' });
  };

  return (
    <>
      <h1>Nội dung tĩnh</h1>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Tabs
            items={[
              {
                key: 'about',
                label: 'Trang giới thiệu',
                children: (
                  <Form.Item name="about_content" label="Nội dung (HTML hoặc text)">
                    <TextArea rows={10} />
                  </Form.Item>
                ),
              },
              {
                key: 'app_guide',
                label: 'Hướng dẫn app',
                children: (
                  <>
                    <Form.Item name="app_guide_content" label="Nội dung">
                      <TextArea rows={8} />
                    </Form.Item>
                    <Form.Item name="apk_link" label="Link APK">
                      <Input placeholder="https://..." />
                    </Form.Item>
                    <Form.Item name="testflight_link" label="Link TestFlight">
                      <Input placeholder="https://..." />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
