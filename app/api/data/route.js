import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  // 1. 统计数据
  const stats = await prisma.stats.findUnique({ where: { id: 1 } });
  // 2. 质押列表
  const stakes = await prisma.stakeEvent.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
  // 3. 赎回列表
  const unstakes = await prisma.unstakeEvent.findMany({ orderBy: { timestamp: "desc" }, take: 100 });

  return NextResponse.json({ stats, stakes, unstakes });
}
