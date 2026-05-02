import { Card, Typography } from 'antd';

export default function Settings() {
  return (
    <Card>
      <Typography.Title level={2}>Settings</Typography.Title>
      <Typography.Paragraph>
        Configure OpenAI gpt-5.4 generation settings for CV Builder.
      </Typography.Paragraph>
    </Card>
  );
}
