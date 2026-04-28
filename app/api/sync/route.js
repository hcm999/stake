import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const BLOCK_STEP = BigInt(process.env.SYNC_BLOCK_STEP || 1000);

// 质押合约地址/ABI（替换成你的合约）
const STAKING_CONTRACT = "0x你的质押合约地址";
const STAKING_ABI = [
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)"
];

export async function GET() {
  try {
    // 1. 连接免费公共RPC节点
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const latestBlock = await provider.getBlockNumber();
    
    // 2. 获取最后同步区块（避免重复同步）
    let syncRecord = await prisma.syncRecord.findFirst();
    if (!syncRecord) {
      syncRecord = await prisma.syncRecord.create({ data: { lastBlock: 0n } });
    }
    let fromBlock = BigInt(syncRecord.lastBlock) + 1n;
    const toBlock = fromBlock + BLOCK_STEP > latestBlock ? latestBlock : fromBlock + BLOCK_STEP;

    if (fromBlock > latestBlock) {
      return NextResponse.json({ msg: "无新区块" });
    }

    // 3. 遍历区块，获取质押/赎回事件
    const contract = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
    
    // 质押事件
    const stakeEvents = await contract.queryFilter("Staked", fromBlock, toBlock);
    // 赎回事件
    const unstakeEvents = await contract.queryFilter("Unstaked", fromBlock, toBlock);

    // 4. 批量存入数据库
    await prisma.$transaction([
      // 存入质押事件
      ...stakeEvents.map(e => prisma.stakeEvent.create({
        data: {
          user: e.args.user,
          amount: e.args.amount.toString(),
          block: e.blockNumber,
          timestamp: (await e.getBlock()).timestamp
        }
      })),
      // 存入赎回事件
      ...unstakeEvents.map(e => prisma.unstakeEvent.create({
        data: {
          user: e.args.user,
          amount: e.args.amount.toString(),
          block: e.blockNumber,
          timestamp: (await e.getBlock()).timestamp
        }
      })),
      // 更新最后同步区块
      prisma.syncRecord.update({
        where: { id: syncRecord.id },
        data: { lastBlock: toBlock }
      })
    ]);

    // 5. 累加统计数据（更新页面卡片）
    await updateStats();

    return NextResponse.json({
      msg: "同步成功",
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      stakeCount: stakeEvents.length,
      unstakeCount: unstakeEvents.length
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 统计总数据（累加计算）
async function updateStats() {
  const stakes = await prisma.stakeEvent.findMany();
  const unstakes = await prisma.unstakeEvent.findMany();

  const totalStaked = stakes.reduce((sum, e) => sum + BigInt(e.amount), 0n).toString();
  const totalUnstaked = unstakes.reduce((sum, e) => sum + BigInt(e.amount), 0n).toString();

  await prisma.stats.upsert({
    where: { id: 1 },
    update: {
      totalStaked,
      totalUnstaked,
      totalLp: totalStaked,
      totalRedeem: totalStaked
    },
    create: {
      totalStaked,
      totalUnstaked,
      totalLp: totalStaked,
      totalRedeem: totalStaked
    }
  });
}
