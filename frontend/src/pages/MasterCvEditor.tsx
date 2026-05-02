import { Card, Typography } from 'antd';

export default function MasterCvEditor() {
  return (
    <Card>
      <Typography.Title level={2}>Master CV</Typography.Title>
      <Typography.Paragraph>
        Edit structured profile, skills, work, and project narrative data.
      </Typography.Paragraph>
    </Card>
  );
}
