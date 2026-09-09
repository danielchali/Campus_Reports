import express from 'express';

const router = express.Router();
const ALLOWED_CONNECTION_TYPES = new Set(['slow-2g', '2g', '3g', '4g', 'unknown']);

function finiteMetric(value, max = 600000) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined;
}

router.post('/performance', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const path = typeof body.path === 'string' ? body.path.slice(0, 120) : '/';
  const connectionType = ALLOWED_CONNECTION_TYPES.has(body.connectionType) ? body.connectionType : undefined;
  const sample = {
    path,
    navigationDuration: finiteMetric(body.navigationDuration),
    domContentLoaded: finiteMetric(body.domContentLoaded),
    firstPaint: finiteMetric(body.firstPaint),
    firstContentfulPaint: finiteMetric(body.firstContentfulPaint),
    largestContentfulPaint: finiteMetric(body.largestContentfulPaint),
    cumulativeLayoutShift: finiteMetric(body.cumulativeLayoutShift, 10),
    connectionType,
    deviceMemory: finiteMetric(body.deviceMemory, 1024),
    receivedAt: new Date().toISOString(),
  };

  console.info('Performance telemetry:', JSON.stringify(sample));
  res.status(202).json({ accepted: true });
});

export default router;
