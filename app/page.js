"use client";
import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Tabs, DatePicker } from 'antd';
import { LineChart, BarChart } from '@ant-design/charts';
import { formatUnits } from 'ethers';

const { RangePicker } = DatePicker;

export default function Home() {
  const [data, setData] = useState({ stats: {}, stakes: [], unstakes: [] });

  // 加载数据
  useEffect(() => {
    fetch("/api/data").then(res => res.json()).then(setData);
  }, []);

  // 表格列
  const stakeColumns = [
    { title: "用户地址", dataIndex: "user", width: 300 },
    { title: "质押数量", dataIndex: "amount", render: v => formatUnits(v, 18) },
    { title: "时间", dataIndex: "timestamp", render: t => new Date(t*1000).toLocaleString() }
  ];

  // 图表数据
  const chartData = data.stakes.map((s, i) => ({
    date: new Date(s.timestamp*1000).toLocaleDateString(),
    stake: Number(formatUnits(s.amount, 18)),
    unstake: data.unstakes[i] ? Number(formatUnits(data.unstakes[i].amount, 18)) : 0
  }));

  return (
    <div style={{ padding: 20, maxWidth: 1600, margin: "0 auto" }}>
      {/* 顶部核心卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card title="LP余额">{data.stats?.totalLp || 0}</Card></Col>
        <Col span={6}><Card title="可兑付总余额">{data.stats?.totalRedeem || 0}</Card></Col>
        <Col span={6}><Card title="场内质押">{data.stats?.totalStaked || 0}</Card></Col>
        <Col span={6}><Card title="到期未赎回">{data.stats?.totalUnstaked || 0}</Card></Col>
      </Row>

      {/* 图表区 */}
      <Card title="质押/赎回趋势" style={{ marginBottom: 20 }}>
        <LineChart data={chartData} xField="date" yField={["stake", "unstake"]} />
      </Card>

      {/* 数据列表 */}
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="质押列表" key="1">
          <Table columns={stakeColumns} dataSource={data.stakes} rowKey="id" pagination={{ pageSize: 10 }} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="赎回列表" key="2">
          <Table columns={stakeColumns} dataSource={data.unstakes} rowKey="id" pagination={{ pageSize: 10 }} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
