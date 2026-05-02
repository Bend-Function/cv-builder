import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { getMasterCv, saveMasterCv } from '../api/masterCv';
import type { MasterCv } from '../types/masterCv';

export default function MasterCvEditor() {
  const [form] = Form.useForm<MasterCv>();
  const [masterCv, setMasterCv] = useState<MasterCv | null>(null);

  useEffect(() => {
    getMasterCv().then((loaded) => {
      setMasterCv(loaded);
      form.setFieldsValue(loaded);
    });
  }, [form]);

  async function handleSave(values: MasterCv) {
    const saved = await saveMasterCv({ ...masterCv, ...values } as MasterCv);
    setMasterCv(saved);
    message.success('Master CV saved');
  }

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Typography.Title level={2}>Master CV</Typography.Title>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="Full name" name={['profile', 'full_name']}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name={['profile', 'email']}>
            <Input />
          </Form.Item>
          <Form.Item label="GitHub" name={['profile', 'github_url']}>
            <Input />
          </Form.Item>
          <Form.Item label="LinkedIn" name={['profile', 'linkedin_url']}>
            <Input />
          </Form.Item>
          <Form.Item label="Portfolio" name={['profile', 'portfolio_url']}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">Save Master CV</Button>
        </Form>
      </Space>
    </Card>
  );
}
