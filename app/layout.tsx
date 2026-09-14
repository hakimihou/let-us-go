import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "饭点｜南大仙林即时饭搭子",
  description: "半小时后，一起吃饭。面向南大仙林学生的即时饭搭子匹配工具。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
