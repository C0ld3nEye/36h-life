/**
 * 36H Life Simulator - AI Architecture & Engine Manager
 * 
 * Powered by Gemini Cloud (Gemini 3.5 Flash / Gemini 3.7) via secure server-side API routes.
 */

import { ActionRequest, ActionResponse } from '../types';

export interface AIExecutionMetadata {
  executionSource: 'cloud-gemini';
  latencyMs: number;
  model: string;
}

export interface HybridActionResponse extends ActionResponse {
  _meta?: AIExecutionMetadata;
}

export class HybridAIRouter {
  private lastLatencyMs: number | undefined = undefined;

  public async routeAction(
    req: ActionRequest, 
    cloudExecutor: (req: ActionRequest) => Promise<ActionResponse>
  ): Promise<HybridActionResponse> {
    const startTime = performance.now();

    const cloudResponse = await cloudExecutor(req);
    const elapsed = Math.round(performance.now() - startTime);
    this.lastLatencyMs = elapsed;

    return {
      ...cloudResponse,
      _meta: {
        executionSource: 'cloud-gemini',
        latencyMs: elapsed,
        model: 'Gemini Cloud'
      }
    };
  }

  public getLastLatency(): number | undefined {
    return this.lastLatencyMs;
  }
}

export const hybridAIRouter = new HybridAIRouter();
