import test from 'node:test';
import assert from 'node:assert/strict';
import { qualificationChance, binomialCDF, simulate, summarize, strategies, seededRandom, sampleHypergeometric } from '../src/model.js';
const base = { probability: 5, accounts: 20, draws: 10, prizes: 20, others: 100, otherDraws: 10 };
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);

test('repeated draws give at most one qualification per account', () => {
  close(qualificationChance(50, 2), .75);
  close(qualificationChance(0, 100), 0);
  close(qualificationChance(100, 0), 0);
  close(qualificationChance(100, 1), 1);
});
test('binomial sampler remains normalized for large and extreme inputs', () => {
  for (const [n,p] of [[20000,.8],[1000,.00001],[1000,.99999],[0,.3],[4,0],[4,1]]) {
    const cdf = binomialCDF(n,p);
    close(cdf.at(-1),1);
    for(let i=1;i<cdf.length;i++) assert.ok(cdf[i]>=cdf[i-1]);
  }
  assert.deepEqual(Array.from(binomialCDF(2,.5)), [.25,.75,1]);
});
test('uncontested certain draws respect both account and prize caps', () => {
  for(const prizes of [0,3,100]) {
    const result=simulate({...base,probability:100,others:0,prizes},1000,1);
    close(result.expected,Math.min(20,prizes));
  }
});
test('no draws, no accounts, and zero probability yield zero prizes', () => {
  for(const patch of [{draws:0},{accounts:0},{probability:0}]) {
    assert.equal(simulate({...base,...patch},1000,1).histogram[0],1000);
  }
});
test('shared pool: one of two equally eligible accounts gets the sole prize with probability one half', () => {
  const result=simulate({probability:100,accounts:1,draws:1,others:1,otherDraws:1,prizes:1},40000,42);
  close(result.expected,.5,.01);
});
test('shared pool with uncertain qualification matches enumerated exact expectation', () => {
  // One own/one rival account, each qualifies with 1/2. Own wins: 1/4 alone + 1/4 * 1/2 in tie.
  const result=simulate({probability:50,accounts:1,draws:1,others:1,otherDraws:1,prizes:1},40000,21);
  close(result.expected,.375,.01);
});
test('unlimited pool matches independent-account expectation', () => {
  const result=simulate({...base,prizes:1000},30000,42);
  close(result.expected,20*(1-.95**10),.05);
});
test('cumulative series is strictly more than k, includes all higher outcomes', () => {
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
test('hypergeometric allocation stays within feasible bounds and has correct mean', () => {
  const rng=seededRandom(123);
  for(const [n,k,d] of [[10,3,8],[10,8,3],[10,8,8],[10,2,2]]) {
    let total=0;
    for(let i=0;i<20000;i++) {
      const x=sampleHypergeometric(n,k,d,rng);
      assert.ok(x>=Math.max(0,d-(n-k)) && x<=Math.min(k,d));
      total+=x;
    }
    close(total/20000,d*k/n,.035);
  }
});
test('invalid domain values are rejected', () => {
  assert.throws(()=>simulate({...base,accounts:-1},100,1));
  assert.throws(()=>simulate({...base,probability:NaN},100,1));
  assert.throws(()=>simulate(base,0,1));
});
