/**
 * Feature: ai-surplus-food-management, Property 6: Prediction Confidence and Default Estimate
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import { predictSurplus, PredictionInput } from '../services/predictionEngine';

const foodTypeArb = fc.constantFrom('cooked', 'raw', 'bakery', 'dairy', 'frozen');
const dayOfWeekArb = fc.integer({ min: 0, max: 6 });

function historyRecordArb(foodType: string, dayOfWeek: number) {
  const anchorSunday = new Date('2025-01-05T00:00:00.000Z').getTime();
  const targetMs = anchorSunday + dayOfWeek * 86400000;

  return fc.record({
    foodType: fc.constant(foodType),
    quantity: fc.integer({ min: 1, max: 500 }),
    expiryDatetime: fc.constant(new Date(targetMs + 3600000)),
    createdAt: fc.integer({ min: 0, max: 52 }).map(
      (weekOffset) => new Date(targetMs + weekOffset * 7 * 86400000)
    ),
  });
}

function matchingHistoryArb(foodType: string, dayOfWeek: number, size: number) {
  return fc.array(historyRecordArb(foodType, dayOfWeek), {
    minLength: size,
    maxLength: size,
  });
}

describe(
  'Feature: ai-surplus-food-management, Property 6: Prediction Confidence and Default Estimate',
  () => {
    it('result always contains predictedQty, foodType, targetDay, and confidence', () => {
      fc.assert(
        fc.property(
          foodTypeArb,
          dayOfWeekArb,
          fc.array(
            fc.record({
              foodType: foodTypeArb,
              quantity: fc.integer({ min: 1, max: 500 }),
              expiryDatetime: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-01-01') }),
              createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (foodType, dayOfWeek, history) => {
            const result = predictSurplus({ history, dayOfWeek, foodType });
            return (
              typeof result.predictedQty === 'number' &&
              typeof result.foodType === 'string' &&
              typeof result.targetDay === 'number' &&
              ['low', 'medium', 'high'].includes(result.confidence)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns confidence low and predictedQty 5 when fewer than 3 matching records exist', () => {
      fc.assert(
        fc.property(
          foodTypeArb,
          dayOfWeekArb,
          fc.integer({ min: 0, max: 2 }),
          (foodType, dayOfWeek, matchingCount) => {
            return fc.sample(matchingHistoryArb(foodType, dayOfWeek, matchingCount), 1).every(
              (matchingHistory) => {
                const result = predictSurplus({ history: matchingHistory, dayOfWeek, foodType });
                return result.confidence === 'low' && result.predictedQty === 5;
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns confidence medium when 3 to 9 matching records exist', () => {
      fc.assert(
        fc.property(
          foodTypeArb,
          dayOfWeekArb,
          fc.integer({ min: 3, max: 9 }),
          (foodType, dayOfWeek, matchingCount) => {
            return fc.sample(matchingHistoryArb(foodType, dayOfWeek, matchingCount), 1).every(
              (matchingHistory) => {
                const result = predictSurplus({ history: matchingHistory, dayOfWeek, foodType });
                return result.confidence === 'medium';
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns confidence high when 10 or more matching records exist', () => {
      fc.assert(
        fc.property(
          foodTypeArb,
          dayOfWeekArb,
          fc.integer({ min: 10, max: 20 }),
          (foodType, dayOfWeek, matchingCount) => {
            return fc.sample(matchingHistoryArb(foodType, dayOfWeek, matchingCount), 1).every(
              (matchingHistory) => {
                const result = predictSurplus({ history: matchingHistory, dayOfWeek, foodType });
                return result.confidence === 'high';
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  }
);
