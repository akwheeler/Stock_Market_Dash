import type { HMMResult } from "@/types";

const MIN_STD = 1e-6;
const CONVERGENCE_THRESHOLD = 1e-6;

/**
 * Compute the probability density of a Gaussian distribution at point x.
 * Handles edge cases such as zero or near-zero standard deviation.
 *
 * @param x - The observation value
 * @param mean - The mean of the Gaussian distribution
 * @param std - The standard deviation of the Gaussian distribution
 * @returns The probability density at x
 */
export function gaussianPDF(x: number, mean: number, std: number): number {
  const safeStd = Math.max(std, MIN_STD);
  const exponent = -0.5 * ((x - mean) / safeStd) ** 2;
  return (1 / (safeStd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

/**
 * Initialize HMM parameters with uniform transition probabilities,
 * means spread across the data range, and equal standard deviations.
 */
function initializeParameters(
  returns: number[],
  nStates: number
): {
  transitionMatrix: number[][];
  means: number[];
  stds: number[];
  initialProbs: number[];
} {
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const globalStd = Math.max(
    Math.sqrt(
      returns.reduce((sum, r) => sum + (r - returns.reduce((s, v) => s + v, 0) / returns.length) ** 2, 0) /
        returns.length
    ),
    MIN_STD
  );

  // Spread initial means across quantiles of the data
  const means: number[] = [];
  for (let i = 0; i < nStates; i++) {
    const quantileIndex = Math.floor(((i + 0.5) / nStates) * sortedReturns.length);
    means.push(sortedReturns[Math.min(quantileIndex, sortedReturns.length - 1)]);
  }

  const stds = Array(nStates).fill(globalStd);

  // Uniform initial state probabilities
  const initialProbs = Array(nStates).fill(1 / nStates);

  // Uniform transition matrix with slight self-bias for stability
  const transitionMatrix: number[][] = [];
  for (let i = 0; i < nStates; i++) {
    const row: number[] = [];
    for (let j = 0; j < nStates; j++) {
      row.push(i === j ? 0.6 : 0.4 / (nStates - 1));
    }
    transitionMatrix.push(row);
  }

  return { transitionMatrix, means, stds, initialProbs };
}

/**
 * Scaled forward pass. Returns alpha values and scaling factors.
 * Uses scaling at each time step to prevent underflow.
 */
function forwardPass(
  returns: number[],
  nStates: number,
  initialProbs: number[],
  transitionMatrix: number[][],
  means: number[],
  stds: number[]
): { alpha: number[][]; scalingFactors: number[] } {
  const T = returns.length;
  const alpha: number[][] = Array.from({ length: T }, () => Array(nStates).fill(0));
  const scalingFactors: number[] = Array(T).fill(0);

  // Initialization step (t = 0)
  for (let j = 0; j < nStates; j++) {
    alpha[0][j] = initialProbs[j] * gaussianPDF(returns[0], means[j], stds[j]);
  }
  scalingFactors[0] = alpha[0].reduce((sum, v) => sum + v, 0);
  if (scalingFactors[0] === 0) scalingFactors[0] = MIN_STD;
  for (let j = 0; j < nStates; j++) {
    alpha[0][j] /= scalingFactors[0];
  }

  // Recursion
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < nStates; j++) {
      let sum = 0;
      for (let i = 0; i < nStates; i++) {
        sum += alpha[t - 1][i] * transitionMatrix[i][j];
      }
      alpha[t][j] = sum * gaussianPDF(returns[t], means[j], stds[j]);
    }
    scalingFactors[t] = alpha[t].reduce((sum, v) => sum + v, 0);
    if (scalingFactors[t] === 0) scalingFactors[t] = MIN_STD;
    for (let j = 0; j < nStates; j++) {
      alpha[t][j] /= scalingFactors[t];
    }
  }

  return { alpha, scalingFactors };
}

/**
 * Scaled backward pass using the same scaling factors from the forward pass.
 */
function backwardPass(
  returns: number[],
  nStates: number,
  transitionMatrix: number[][],
  means: number[],
  stds: number[],
  scalingFactors: number[]
): number[][] {
  const T = returns.length;
  const beta: number[][] = Array.from({ length: T }, () => Array(nStates).fill(0));

  // Initialization (t = T - 1)
  for (let j = 0; j < nStates; j++) {
    beta[T - 1][j] = 1 / scalingFactors[T - 1];
  }

  // Recursion
  for (let t = T - 2; t >= 0; t--) {
    for (let i = 0; i < nStates; i++) {
      let sum = 0;
      for (let j = 0; j < nStates; j++) {
        sum += transitionMatrix[i][j] * gaussianPDF(returns[t + 1], means[j], stds[j]) * beta[t + 1][j];
      }
      beta[t][i] = sum / scalingFactors[t];
    }
  }

  return beta;
}

/**
 * Compute log-likelihood from scaling factors.
 * log P(O | lambda) = sum of log(c_t) where c_t are the scaling factors.
 */
function computeLogLikelihood(scalingFactors: number[]): number {
  return scalingFactors.reduce((sum, c) => sum + Math.log(Math.max(c, MIN_STD)), 0);
}

/**
 * Viterbi algorithm for decoding the most likely state sequence.
 */
function viterbi(
  returns: number[],
  nStates: number,
  initialProbs: number[],
  transitionMatrix: number[][],
  means: number[],
  stds: number[]
): number[] {
  const T = returns.length;
  // Work in log space to prevent underflow
  const logDelta: number[][] = Array.from({ length: T }, () => Array(nStates).fill(0));
  const psi: number[][] = Array.from({ length: T }, () => Array(nStates).fill(0));

  // Initialization
  for (let j = 0; j < nStates; j++) {
    const emission = gaussianPDF(returns[0], means[j], stds[j]);
    logDelta[0][j] = Math.log(Math.max(initialProbs[j], MIN_STD)) + Math.log(Math.max(emission, MIN_STD));
    psi[0][j] = 0;
  }

  // Recursion
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < nStates; j++) {
      let bestLogVal = -Infinity;
      let bestState = 0;
      for (let i = 0; i < nStates; i++) {
        const logVal = logDelta[t - 1][i] + Math.log(Math.max(transitionMatrix[i][j], MIN_STD));
        if (logVal > bestLogVal) {
          bestLogVal = logVal;
          bestState = i;
        }
      }
      const emission = gaussianPDF(returns[t], means[j], stds[j]);
      logDelta[t][j] = bestLogVal + Math.log(Math.max(emission, MIN_STD));
      psi[t][j] = bestState;
    }
  }

  // Backtracking
  const states: number[] = Array(T).fill(0);
  let bestFinalState = 0;
  let bestFinalLogVal = -Infinity;
  for (let j = 0; j < nStates; j++) {
    if (logDelta[T - 1][j] > bestFinalLogVal) {
      bestFinalLogVal = logDelta[T - 1][j];
      bestFinalState = j;
    }
  }
  states[T - 1] = bestFinalState;

  for (let t = T - 2; t >= 0; t--) {
    states[t] = psi[t + 1][states[t + 1]];
  }

  return states;
}

/**
 * Sort states by their emission mean so that:
 * - State 0 = Bear (most negative mean return)
 * - State 1 = Neutral
 * - State 2 = Bull (most positive mean return)
 *
 * Remaps all parameters and the decoded state sequence accordingly.
 */
function sortStatesByMean(
  means: number[],
  stds: number[],
  transitionMatrix: number[][],
  states: number[],
  nStates: number
): {
  means: number[];
  stds: number[];
  transitionMatrix: number[][];
  states: number[];
} {
  // Create an index-to-sorted-index mapping
  const indices = Array.from({ length: nStates }, (_, i) => i);
  indices.sort((a, b) => means[a] - means[b]);

  // Build reverse mapping: old index -> new index
  const reverseMap: number[] = Array(nStates).fill(0);
  for (let newIdx = 0; newIdx < nStates; newIdx++) {
    reverseMap[indices[newIdx]] = newIdx;
  }

  const sortedMeans = indices.map((i) => means[i]);
  const sortedStds = indices.map((i) => stds[i]);

  const sortedTransition: number[][] = Array.from({ length: nStates }, () => Array(nStates).fill(0));
  for (let i = 0; i < nStates; i++) {
    for (let j = 0; j < nStates; j++) {
      sortedTransition[reverseMap[i]][reverseMap[j]] = transitionMatrix[i][j];
    }
  }

  const sortedStates = states.map((s) => reverseMap[s]);

  return {
    means: sortedMeans,
    stds: sortedStds,
    transitionMatrix: sortedTransition,
    states: sortedStates,
  };
}

/**
 * Train a Gaussian Hidden Markov Model using the Baum-Welch (EM) algorithm
 * and decode the most likely state sequence via the Viterbi algorithm.
 *
 * States are post-sorted by emission mean so that:
 * - State 0 = Bear (lowest mean)
 * - State 1 = Neutral
 * - State 2 = Bull (highest mean)
 *
 * @param returns - Array of observed return values
 * @param nStates - Number of hidden states (default: 3)
 * @param iterations - Maximum number of EM iterations (default: 30)
 * @returns HMMResult containing decoded states, parameters, and convergence info
 */
export function trainHMM(
  returns: number[],
  nStates: number = 3,
  iterations: number = 30
): HMMResult {
  if (returns.length === 0) {
    return {
      states: [],
      means: [],
      stds: [],
      transitionMatrix: [],
      logLikelihoods: [],
      stateLabels: [],
    };
  }

  const T = returns.length;
  let { transitionMatrix, means, stds, initialProbs } = initializeParameters(returns, nStates);
  const logLikelihoods: number[] = [];

  // Baum-Welch (EM) iterations
  for (let iter = 0; iter < iterations; iter++) {
    // E-step: forward-backward
    const { alpha, scalingFactors } = forwardPass(
      returns, nStates, initialProbs, transitionMatrix, means, stds
    );
    const beta = backwardPass(returns, nStates, transitionMatrix, means, stds, scalingFactors);

    const ll = computeLogLikelihood(scalingFactors);
    logLikelihoods.push(ll);

    // Check convergence
    if (iter > 0 && Math.abs(ll - logLikelihoods[iter - 1]) < CONVERGENCE_THRESHOLD) {
      break;
    }

    // Compute gamma (posterior state probabilities)
    const gamma: number[][] = Array.from({ length: T }, () => Array(nStates).fill(0));
    for (let t = 0; t < T; t++) {
      let norm = 0;
      for (let j = 0; j < nStates; j++) {
        gamma[t][j] = alpha[t][j] * beta[t][j] * scalingFactors[t];
        norm += gamma[t][j];
      }
      if (norm === 0) norm = MIN_STD;
      for (let j = 0; j < nStates; j++) {
        gamma[t][j] /= norm;
      }
    }

    // Compute xi (joint posterior for consecutive state pairs)
    const xi: number[][][] = Array.from({ length: T - 1 }, () =>
      Array.from({ length: nStates }, () => Array(nStates).fill(0))
    );
    for (let t = 0; t < T - 1; t++) {
      let norm = 0;
      for (let i = 0; i < nStates; i++) {
        for (let j = 0; j < nStates; j++) {
          xi[t][i][j] =
            alpha[t][i] *
            transitionMatrix[i][j] *
            gaussianPDF(returns[t + 1], means[j], stds[j]) *
            beta[t + 1][j];
          norm += xi[t][i][j];
        }
      }
      if (norm === 0) norm = MIN_STD;
      for (let i = 0; i < nStates; i++) {
        for (let j = 0; j < nStates; j++) {
          xi[t][i][j] /= norm;
        }
      }
    }

    // M-step: re-estimate parameters
    // Initial state probabilities
    for (let j = 0; j < nStates; j++) {
      initialProbs[j] = gamma[0][j];
    }

    // Transition matrix
    for (let i = 0; i < nStates; i++) {
      let gammaSum = 0;
      for (let t = 0; t < T - 1; t++) {
        gammaSum += gamma[t][i];
      }
      if (gammaSum === 0) gammaSum = MIN_STD;
      for (let j = 0; j < nStates; j++) {
        let xiSum = 0;
        for (let t = 0; t < T - 1; t++) {
          xiSum += xi[t][i][j];
        }
        transitionMatrix[i][j] = xiSum / gammaSum;
      }
    }

    // Emission means and standard deviations
    for (let j = 0; j < nStates; j++) {
      let gammaSum = 0;
      let weightedSum = 0;
      for (let t = 0; t < T; t++) {
        gammaSum += gamma[t][j];
        weightedSum += gamma[t][j] * returns[t];
      }
      if (gammaSum === 0) gammaSum = MIN_STD;

      means[j] = weightedSum / gammaSum;

      let weightedVariance = 0;
      for (let t = 0; t < T; t++) {
        weightedVariance += gamma[t][j] * (returns[t] - means[j]) ** 2;
      }
      stds[j] = Math.max(Math.sqrt(weightedVariance / gammaSum), MIN_STD);
    }
  }

  // Decode most likely state sequence via Viterbi
  const decodedStates = viterbi(returns, nStates, initialProbs, transitionMatrix, means, stds);

  // Sort states by mean return (Bear < Neutral < Bull)
  const sorted = sortStatesByMean(means, stds, transitionMatrix, decodedStates, nStates);

  // Generate state labels
  const labelMap: Record<number, string> = { 0: "Bear", 1: "Neutral", 2: "Bull" };
  const stateLabels: string[] = [];
  for (let i = 0; i < nStates; i++) {
    if (nStates === 3 && labelMap[i] !== undefined) {
      stateLabels.push(labelMap[i]);
    } else {
      stateLabels.push(`State ${i}`);
    }
  }

  return {
    states: sorted.states,
    means: sorted.means,
    stds: sorted.stds,
    transitionMatrix: sorted.transitionMatrix,
    logLikelihoods,
    stateLabels,
  };
}
