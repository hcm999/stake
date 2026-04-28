import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// BSC免费公共节点（无需密钥，直接用）
const RPC_URL = "https://bsc-dataseed.binance.org/";
const BLOCK_STEP = BigInt(1000);

// ====================== 你的合约信息（直接用你昨晚发的！）======================
const STAKING_CONTRACT = "【这里替换成你昨晚发我的合约地址】";
const STAKING_ABI = [
  // 【这里替换成你昨晚发我的完整ABI】
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)"
];
// ==========================================================================

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const latestBlock = await provider.getBlockNumber();
    
    let syncRecord = await prisma.syncRecord.findFirst();
    if (!syncRecord) {
      syncRecord = await prisma.syncRecord.create({ data: { lastBlock: 0n } });
    }
    let fromBlock = BigInt(syncRecord.lastBlock) + 1n;
    const toBlock = fromBlock + BLOCK_STEP > latestBlock ? latestBlock : fromBlock + BLOCK_STEP;

    if (fromBlock > latestBlock) {
      return NextResponse.json({ msg: "无新区块需要同步" });
    }

    const contract = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
    const stakeEvents = await contract.queryFilter("Staked", fromBlock, toBlock);
    const unstakeEvents = await contract.queryFilter("Unstaked", fromBlock, toBlock);

    await prisma.$transaction([
      ...stakeEvents.map(e => prisma.stakeEvent.create({
        data: {
          user: e.args.user,
          amount: e.args.amount.toString(),
          block: e.blockNumber,
          timestamp: (await e.getBlock()).timestamp
        }
      })),
      ...unstakeEvents.map(e => prisma.unstakeEvent.create({
        data: {
          user: e.args.user,
          amount: e.args.amount.toString(),
          block: e.blockNumber,
          timestamp: (await e.getBlock()).timestamp
        }
      })),
      prisma.syncRecord.update({
        where: { id: syncRecord.id },
        data: { lastBlock: toBlock }
      })
    ]);

    await updateStats();
    return NextResponse.json({
      msg: "同步成功",
      range: `${fromBlock} → ${toBlock}`,
      stake: stakeEvents.length,
      unstake: unstakeEvents.length
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateStats() {
  const stakes = await prisma.stakeEvent.findMany();
  const unstakes = await prisma.unstakeEvent.findMany();

  const totalStaked = stakes.reduce((sum, e) => sum + BigInt(e.amount), 0n).toString();
  const totalUnstaked = unstakes.reduce((sum, e) => sum + BigInt(e.amount), 0n).toString();

  await prisma.stats.upsert({
    where: { id: 1 },
    update: { totalStaked, totalUnstaked, totalLp: totalStaked, totalRedeem: totalStaked },
    create: { totalStaked, totalUnstaked, totalLp: totalStaked, totalRedeem: totalStaked }
  });
}
