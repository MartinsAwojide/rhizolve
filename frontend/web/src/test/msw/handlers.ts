import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/v1/dashboard/attention', () =>
    HttpResponse.json({ assignedGemba: [], conflicts: [], quorum: [] }),
  ),
  http.get('/api/v1/dashboard/metrics', () =>
    HttpResponse.json({
      active_investigations: 0,
      root_causes_found: 0,
      average_depth_to_cause: null,
      gemba_completion_rate: null,
    }),
  ),
  http.get('/api/v1/projects', () => HttpResponse.json([])),
]
