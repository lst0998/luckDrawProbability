import test from 'node:test';
import assert from 'node:assert/strict';
import { accountWinChance, binomialCDF, simulate, summarize, strategies } from '../src/model.js';
const base = { probability: 5, accounts: 20, draws: 10, prizes: 20, limitPrizes: false };
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);

test('repeated draws give at most one win per account', () => {
  close(accountWinChance(50, 2), .75);
  close(accountWinChance(0, 100), 0);
  close(accountWinChance(100, 0), 0);
  close(accountWinChance(100, 1), 1);
});
test('binomial sampler remains normalized for large and extreme inputs', () => {
  for (const [n,p] of [[1000,.8],[1000,.00001],[1000,.99999],[0,.3],[4,0],[4,1]]) {
    const cdf = binomialCDF(n,p);
    close(cdf.at(-1),1);
    for(let i=1;i<cdf.length;i++) assert.ok(cdf[i]>=cdf[i-1]);
  }
  assert.deepEqual(Array.from(binomialCDF(2,.5)), [.25,.75,1]);
});
test('fixed per-draw probability works without any competitor parameters', () => {
  const result = simulate(base, 40000, 42);
  const q = 1 - .95 ** 10;
  close(result.expected, 20*q, .06);
  const probabilityMoreThanOne = 1 - (1-q)**20 - 20*q*(1-q)**19;
  close(result.moreThan[1], probabilityMoreThanOne, .001);
  assert.equal(result.histogram.reduce((sum,n)=>sum+n,0),40000);
});
test('irrelevant competitor fields cannot reduce the supplied win probability', () => {
  const a = simulate({...base,others:0,otherDraws:0},1000,1);
  const b = simulate({...base,others:20000,otherDraws:10000},1000,1);
  assert.deepEqual(a,b);
});
test('disabled cap never limits wins even when stored prize count is zero', () => {
  const result=simulate({...base,probability:100,prizes:0},1000,1);
  assert.equal(result.expected,20);
});
test('enabled cap respects both account and prize limits', () => {
  for(const prizes of [0,3,100]) {
    const result=simulate({...base,probability:100,limitPrizes:true,prizes},1000,1);
    close(result.expected,Math.min(20,prizes));
  }
});
test('capped outcomes combine all wins above the cap', () => {
  const result=simulate({...base,probability:50,accounts:2,draws:1,limitPrizes:true,prizes:1},40000,42);
  close(result.expected,.75,.01);
  assert.equal(result.moreThan[1],0);
});
test('no draws, no accounts, and zero probability yield zero prizes', () => {
  for(const patch of [{draws:0},{accounts:0},{probability:0}]) {
    assert.equal(simulate({...base,...patch},1000,1).histogram[0],1000);
  }
});
test('cumulative series is strictly more than k and includes all higher outcomes', () => {
  const r=summarize([10,20,30,40],100);
  assert.deepEqual(r.moreThan,[.9,.7,.4,0]);
  close(r.expected,2);
  assert.deepEqual(r.range,[0,3]);
});
test('equal budget strategies use every draw and contain the current allocation', () => {
  const rows=strategies(base);
  assert.ok(rows.some(r=>r.accounts===20 && r.draws===10));
  for(const row of rows) assert.equal(row.accounts*row.draws,200);
});
test('invalid domain values are rejected', () => {
  assert.throws(()=>simulate({...base,accounts:-1},100,1));
  assert.throws(()=>simulate({...base,probability:NaN},100,1));
  assert.throws(()=>simulate({...base,limitPrizes:'false'},100,1));
  assert.throws(()=>simulate(base,0,1));
});
