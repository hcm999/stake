import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const statsResult = await sql`
      SELECT * FROM stake_stats 
      ORDER BY date DESC 
      LIMIT 1
    `;

    const recordsResult = await sql`
      SELECT * FROM stake_records 
      WHERE stake_time > EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')
      ORDER BY stake_time DESC
    `;

    const stats = statsResult.rows[0] || {};
    
    const responseData = {
      success: true,
      data: {
        stats: {
          totalStaked: parseFloat(stats.total_staked || 0),
          totalStaked1d: parseFloat(stats.total_staked_1d || 0),
          totalStaked15d: parseFloat(stats.total_staked_15d || 0),
          totalStaked30d: parseFloat(stats.total_staked_30d || 0),
          count1d: parseInt(stats.count_1d || 0),
          count15d: parseInt(stats.count_15d || 0),
          count30d: parseInt(stats.count_30d || 0),
          unlock2d: parseFloat(stats.unlock_2d || 0),
          unlock7d: parseFloat(stats.unlock_7d || 0),
          unlock15d: parseFloat(stats.unlock_15d || 0),
          lpWithdrawable: parseFloat(stats.lp_withdrawable || 0)
        },
        allRecords: recordsResult.rows.map(row => ({
          address: row.address,
          amount: parseFloat(row.amount),
          stakeTime: parseInt(row.stake_time),
          stakeIndex: parseInt(row.stake_index),
          isRedeemed: row.is_redeemed
        })),
        lastUpdate: stats.date ? new Date(stats.date).getTime() : Date.now()
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      data: {
        stats: {
          totalStaked: 0,
          totalStaked1d: 0,
          totalStaked15d: 0,
          totalStaked30d: 0,
          count1d: 0,
          count15d: 0,
          count30d: 0,
          unlock2d: 0,
          unlock7d: 0,
          unlock15d: 0,
          lpWithdrawable: 0
        },
        allRecords: [],
        lastUpdate: Date.now()
      }
    });
  }
}
