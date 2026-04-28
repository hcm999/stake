// 这个文件缺失 = 直接404，必须加！
export const metadata = {
  title: '质押数据分析',
  description: 'Staking Analytics Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui' }}>
        {children}
      </body>
    </html>
  );
}
