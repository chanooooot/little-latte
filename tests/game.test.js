import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, ORDERS, targetMask, scoreMask, pourSegment, secondsLeft, inCup, tiltAim } from '../dist/game.js';

test('tilt centers, follows screen rotation, ignores tiny motion, and clamps edges', () => {
  assert.deepEqual(tiltAim(20, 10, [20, 10]), [.5, .5]);
  assert.deepEqual(tiltAim(20, 11, [20, 10]), [.5, .5]);
  assert.ok(tiltAim(20, 20, [20, 10])[0] > .5);
  assert.ok(tiltAim(30, 10, [20, 10], 90)[0] > .5);
  assert.deepEqual(tiltAim(20, 90, [20, 10]), [1, .5]);
});

test('heart rewards its shape, not an empty or flooded cup', () => {
  const empty = new Float32Array(SIZE * SIZE);
  const flooded = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) flooded[y * SIZE + x] = +inCup((x + .5) / SIZE, (y + .5) / SIZE);
  const target = targetMask();
  assert.equal(scoreMask(target, target), 100);
  assert.equal(scoreMask(empty, target), 0);
  assert.ok(scoreMask(flooded, target) < 60);
});

test('every order has a distinct, scoreable target', () => {
  const targets = [...new Map(ORDERS.map(order => [order.id, targetMask(order.id)])).values()];
  assert.equal(ORDERS.length, 6);
  assert.equal(targets.length, 3);
  for (const target of targets) assert.equal(scoreMask(target, target), 100);
  assert.notDeepEqual(targets[0], targets[1]);
  assert.notDeepEqual(targets[1], targets[2]);
});

test('pouring interpolates fast movement, clips foam to cup, and stays bounded', () => {
  const mask = new Float32Array(SIZE * SIZE);
  for (let n = 0; n < 60; n++) pourSegment(mask, [0.05, .5], [.95, .5], .06, 1 / 60);
  for (let x = 15; x < 113; x++) assert.ok(mask[64 * SIZE + x] > .9);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const value = mask[y * SIZE + x];
    assert.ok(value >= 0 && value <= 1);
    if (!inCup((x + .5) / SIZE, (y + .5) / SIZE)) assert.equal(value, 0);
  }
});

test('stationary pour deposits milk independently of frame rate', () => {
  const slow = new Float32Array(SIZE * SIZE), fast = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < 30; i++) pourSegment(slow, [.5, .5], [.5, .5], .06, 1 / 30);
  for (let i = 0; i < 120; i++) pourSegment(fast, [.5, .5], [.5, .5], .06, 1 / 120);
  assert.ok(Math.abs(slow[64 * SIZE + 64] - fast[64 * SIZE + 64]) < .0001);
});

test('clock ends exactly at deadline, including after a suspended tab', () => {
  assert.equal(secondsLeft(31000, 1000), 30);
  assert.equal(secondsLeft(31000, 16500), 14.5);
  assert.equal(secondsLeft(31000, 31000), 0);
  assert.equal(secondsLeft(31000, 99000), 0);
});
