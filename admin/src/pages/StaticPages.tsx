import { useEffect, useRef, useState } from 'react';
import { Card, Form, Input, Button, Tabs, message } from 'antd';
import { supabase } from '../lib/supabase';

type RichTextEditorProps = {
  value?: string;
  onChange?: (val: string) => void;
};

function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && typeof value === 'string' && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (!onChange || !ref.current) return;
    onChange(ref.current.innerHTML);
  };

  return (
    <div>
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        style={{
          minHeight: 180,
          padding: 8,
          borderRadius: 4,
          border: '1px solid #d9d9d9',
          background: '#ffffff',
          overflowY: 'auto',
        }}
      />
      <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
        Soạn nội dung trực tiếp (hỗ trợ định dạng cơ bản qua trình duyệt).
      </div>
    </div>
  );
}

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
    try {
      await supabase.from('static_pages').upsert([
        { page_key: 'about', content: values.about_content, updated_at: new Date().toISOString() },
        { page_key: 'app_guide', content: values.app_guide_content, apk_link: values.apk_link, testflight_link: values.testflight_link, updated_at: new Date().toISOString() },
      ], { onConflict: 'page_key' });
      message.success('Đã lưu trang tĩnh');
    } catch (e: any) {
      message.error(e?.message || 'Lưu thất bại');
    }
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
                  <Form.Item name="about_content" label="Nội dung (HTML)">
                    <RichTextEditor />
                  </Form.Item>
                ),
              },
              {
                key: 'app_guide',
                label: 'Hướng dẫn app',
                children: (
                  <>
                    <Form.Item name="app_guide_content" label="Nội dung">
                      <RichTextEditor />
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
