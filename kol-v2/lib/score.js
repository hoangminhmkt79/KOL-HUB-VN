/**
 * KOC Scoring System
 * engagement_rate = avg_views / followers
 * koc_score = engagement_rate * log10(expected_monthly_gmv + 1)
 */
function calcEngagement(avg_views, followers) {
  if (!followers || followers <= 0) return 0;
  return avg_views / followers;
}

function calcKocScore(avg_views, followers, expected_monthly_gmv) {
  const er = calcEngagement(avg_views, followers);
  const gmv = Math.max(0, parseInt(expected_monthly_gmv) || 0);
  return er * Math.log10(gmv + 1);
}

function calcPotential(engagement) {
  if (engagement >= 0.3) return 'high';
  if (engagement >= 0.15) return 'medium';
  return 'low';
}

function calcLifecycle(creator) {
  const { status, video_views, updated_at } = creator;
  if (status === 'applied') return 'Applied';
  if (status === 'approved') return 'Approved';
  if (status === 'sample_sent') return 'Sample Sent';
  if (status === 'content_posted') {
    if (video_views > 50000) return 'Scaling';
    return 'Content Posted';
  }
  if (status === 'scaling') return 'Scaling';
  if (status === 'inactive') return 'Inactive';
  return status;
}

module.exports = { calcEngagement, calcKocScore, calcPotential, calcLifecycle };
