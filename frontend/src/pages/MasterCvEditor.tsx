import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { getMasterCv, saveMasterCv } from '../api/masterCv';
import type { MasterCv, Profile } from '../types/masterCv';

type MasterCvFormValues = {
  profile?: Partial<Profile>;
};

export default function MasterCvEditor() {
  const [form] = Form.useForm<MasterCvFormValues>();
  const [masterCv, setMasterCv] = useState<MasterCv | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    getMasterCv()
      .then((loaded) => {
        if (!mounted) {
          return;
        }

        setMasterCv(loaded);
        form.setFieldsValue(loaded);
      })
      .catch(() => {
        if (mounted) {
          message.error('Unable to load master CV');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [form]);

  async function handleSave(values: MasterCvFormValues) {
    if (!masterCv) {
      message.error('Unable to save master CV');
      return;
    }

    const payload: MasterCv = {
      ...masterCv,
      profile: {
        ...masterCv.profile,
        ...values.profile
      }
    };

    setSaving(true);
    try {
      const saved = await saveMasterCv(payload);
      setMasterCv(saved);
      form.setFieldsValue(saved);
      message.success('Master CV saved');
    } catch {
      message.error('Unable to save master CV');
    } finally {
      setSaving(false);
    }
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
          <Button type="primary" htmlType="submit" disabled={loading || saving || !masterCv} loading={saving}>
            Save Master CV
          </Button>
        </Form>
      </Space>
    </Card>
  );
}
