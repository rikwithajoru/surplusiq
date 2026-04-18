export interface PredictionInput {
  history: Array<{
    foodType: string;
    quantity: number;
    expiryDatetime: Date;
    createdAt: Date;
  }>;
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  foodType: string;
}

export interface PredictionResult {
  predictedQty: number;
  foodType: string;
  targetDay: number;
  confidence: 'low' | 'medium' | 'high';
  message?: string;
}

export function predictSurplus(input: PredictionInput): PredictionResult {
  const { history, dayOfWeek, foodType } = input;

  const matching = history.filter(
    (record) =>
      record.foodType.toLowerCase() === foodType.toLowerCase() &&
      record.createdAt.getDay() === dayOfWeek
  );

  if (matching.length < 3) {
    return {
      predictedQty: 5,
      foodType,
      targetDay: dayOfWeek,
      confidence: 'low',
      message: 'Insufficient historical data; using default estimate of 5 kg.',
    };
  }

  const sorted = [...matching].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  let weightedSum = 0;
  let totalWeight = 0;
  sorted.forEach((record, index) => {
    const weight = index + 1;
    weightedSum += record.quantity * weight;
    totalWeight += weight;
  });

  const predictedQty = weightedSum / totalWeight;
  const confidence: 'medium' | 'high' = matching.length >= 10 ? 'high' : 'medium';

  return { predictedQty, foodType, targetDay: dayOfWeek, confidence };
}
