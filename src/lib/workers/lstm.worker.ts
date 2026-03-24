import { trainLSTM } from '@/lib/models/lstm';

interface WorkerMessage {
  prices: number[];
  hiddenSize: number;
  lookback: number;
  epochs: number;
  lr: number;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { prices, hiddenSize, lookback, epochs, lr } = event.data;
  try {
    const result = trainLSTM(prices, hiddenSize, lookback, epochs, lr, (epoch, loss) => {
      self.postMessage({ type: 'progress', epoch, loss, totalEpochs: epochs });
    });
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error) });
  }
};
