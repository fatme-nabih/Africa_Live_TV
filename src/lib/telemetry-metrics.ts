export type StreamSessionMetrics = {
  streamId: string;
  sessions: number;
  startRate: number;
  failureRate: number;
  bufferingRate: number;
  p95StartupMs: number | null;
};

export type Requalification = {
  severity: 'warning' | 'critical';
  reasons: string[];
};

export function assessStreamForRequalification(
  metrics: StreamSessionMetrics,
  minimumSessions = 5,
): Requalification | null {
  if (metrics.sessions < minimumSessions) return null;

  const reasons: string[] = [];
  if (metrics.startRate < 70) reasons.push(`taux de démarrage ${metrics.startRate.toFixed(1)} %`);
  if (metrics.failureRate >= 30) reasons.push(`taux d’échec ${metrics.failureRate.toFixed(1)} %`);
  if (metrics.bufferingRate >= 40) reasons.push(`buffering ${metrics.bufferingRate.toFixed(1)} %`);
  if (metrics.p95StartupMs != null && metrics.p95StartupMs > 8_000) {
    reasons.push(`p95 démarrage ${Math.round(metrics.p95StartupMs)} ms`);
  }
  if (reasons.length === 0) return null;

  return {
    severity: metrics.startRate < 40 || metrics.failureRate >= 60 ? 'critical' : 'warning',
    reasons,
  };
}

export type WindowMetrics = {
  sessions: number;
  startRate: number;
  failureRate: number;
};

export function detectTelemetryAlerts(current: WindowMetrics, previous: WindowMetrics) {
  if (current.sessions < 10) return [];
  const alerts: string[] = [];
  if (current.startRate < 70 || previous.startRate - current.startRate >= 15) {
    alerts.push(`chute du taux de démarrage (${current.startRate.toFixed(1)} %)`);
  }
  if (
    current.failureRate >= 30 ||
    (current.failureRate >= previous.failureRate * 1.5 && current.failureRate - previous.failureRate >= 10)
  ) {
    alerts.push(`hausse du taux d’échec (${current.failureRate.toFixed(1)} %)`);
  }
  return alerts;
}
