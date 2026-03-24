import { trainHMM } from '@/lib/models/hmm';

interface WorkerMessage {
  returns: number[];
  nStates: number;
  iterations: number;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { returns, nStates, iterations } = event.data;
  try {
    const result = trainHMM(returns, nStates, iterations);
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error) });
  }
};
