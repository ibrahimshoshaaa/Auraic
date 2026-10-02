import test from 'node:test';
import assert from 'node:assert/strict';
import { profitMetrics, roasMetrics, recipeLineCost } from '../src/services/profit.math.ts';

test('450 sale less 300 recipe means 150 profit and 33.33% margin, independently of expense purchases', () => {
  assert.deepEqual(profitMetrics(450, 300, 0, false), { revenue: 450, recipeCost: 300, profit: 150, margin: 33.33, incomplete: false, missingLines: 0, estimated: false });
});
test('recipe quantities include multiple units and only restocked returns reverse their recipe costs', () => {
  const parts = [{ quantity: 60, unitCost: 5 }, { quantity: 2, unitCost: 20 }, { quantity: 2, unitCost: 5 }];
  assert.equal(recipeLineCost(parts, 0, 2), 350);
  assert.equal(recipeLineCost(parts, 1, 2), 175);
  assert.equal(recipeLineCost(parts, 2, 2), 0);
  assert.equal(recipeLineCost([{ quantity: 30, unitCost: null }]), null);
  assert.equal(recipeLineCost([{ quantity: 30, unitCost: 0 }]), 0);
});
test('unknown recipe costs do not turn missing costs into misleading profit; zero revenue has no margin', () => {
  assert.equal(profitMetrics(450, 0, 1, false).profit, null);
  assert.equal(profitMetrics(450, 0, 1, false).margin, null);
  assert.equal(profitMetrics(0, 0, 0, false).margin, null);
  assert.equal(profitMetrics(250, 300, 0, false).profit, -50);
});
test('ROAS sums both months, has no percentage unit, and no spend gives an undefined ratio', () => {
  assert.equal(roasMetrics(15000 + 25000, 10000 + 10000).ratio, 2);
  assert.equal(roasMetrics(0, 10000).ratio, 0);
  assert.equal(roasMetrics(40000, 0).ratio, null);
  assert.equal(roasMetrics(900, 20000).ratio, 0.045);
});
