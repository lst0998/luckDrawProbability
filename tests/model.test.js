import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.js';
import * as chart from '../src/chart-data.js';
const base = { probability: 5, accounts: 20, draws: 10, prizes: 20, limitPrizes: false };
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);

test('repeated draws give at most one win per account', () => {
  close(model.accountWinChance(50,2),.75);
  close(model.accountWinChance(0,100),0);
  close(model.accountWinChance(100,0),0);
  close(model.accountWinChance(100,1),1);
});
test('two independent fair draws have exact binomial and inclusive probabilities', () => {
  const r=model.calculate({...base,probability:50,accounts:2,draws:1});
  assert.deepEqual(r.probabilities,[.25,.5,.25]);
  assert.deepEqual(r.atLeast,[1,.75,.25]);
  close(r.expected,1);
  assert.deepEqual(r.range,[0,2]);
});
test('four fair accounts match enumerated win counts', () => {
  const r=model.calculate({...base,probability:50,accounts:4,draws:1});
  [1,4,6,4,1].forEach((count,k)=>close(r.probabilities[k],count/16));
  [16,15,11,5,1].forEach((count,k)=>close(r.atLeast[k],count/16));
});
test('default scenario matches analytical expectation and inclusive tails', () => {
  const r=model.calculate(base), q=1-.95**10;
  close(r.expected,20*q);
  close(r.atLeast[1],1-.95**200);
  close(r.atLeast[2],1-(1-q)**20-20*q*(1-q)**19);
  assert.deepEqual(model.calculate(base),r);
  assert.equal('trials' in r,false);
});
test('cap combines all higher outcomes at the capped win count', () => {
  const r=model.calculate({...base,probability:50,accounts:2,draws:1,limitPrizes:true,prizes:1});
  assert.deepEqual(r.probabilities,[.25,.75]);
  assert.deepEqual(r.atLeast,[1,.75]);
  close(r.expected,.75);
});
test('disabled cap is ignored and certain draws respect one win per account', () => {
  const r=model.calculate({...base,probability:100,prizes:0});
  close(r.expected,20);
  assert.equal(r.probabilities[20],1);
  assert.equal(r.atLeast[20],1);
});
test('no draws, accounts, win chance, or available prizes gives no wins', () => {
  for(const patch of [{draws:0},{accounts:0},{probability:0},{limitPrizes:true,prizes:0}]) {
    const r=model.calculate({...base,...patch});
    assert.equal(r.probabilities[0],1);
    assert.equal(r.atLeast[0],1);
    assert.equal(r.atLeast[1] ?? 0,0);
    assert.equal(r.expected,0);
  }
});
test('large and rare distributions stay normalized and retain positive small tails', () => {
  for(const probability of [.000001,50,99.999999]) {
    const r=model.calculate({...base,accounts:1000,draws:1,probability});
    close(r.probabilities.reduce((a,b)=>a+b,0),1);
    for(let i=1;i<r.atLeast.length;i++) assert.ok(r.atLeast[i]<=r.atLeast[i-1]);
    close(r.expected,1000*probability/100,1e-8);
  }
  const rare=model.calculate({...base,accounts:2,draws:1,probability:1e-12});
  assert.ok(rare.atLeast[2]>0);
});
test('equal budget strategies preserve all draws', () => {
  const rows=model.strategies(base);
  assert.ok(rows.some(r=>r.accounts===20 && r.draws===10));
  rows.forEach(r=>assert.equal(r.accounts*r.draws,200));
});
test('ticket expectation and exact-win costs use two tickets per prize', () => {
  const r=model.theoreticalCosts({...base,probability:50,accounts:2,draws:1},5);
  close(r.expectedPrizes,1);close(r.expectedTickets,2);close(r.totalCost,10);close(r.costPerTicket,5);
  assert.deepEqual(r.costByWins,[
    {wins:0,tickets:0,costPerTicket:null,probability:.25},
    {wins:1,tickets:2,costPerTicket:5,probability:.5},
    {wins:2,tickets:4,costPerTicket:2.5,probability:.25},
  ]);
});
test('cost curve respects the account limit and optional prize cap', () => {
  const r=model.theoreticalCosts({...base,limitPrizes:true,prizes:3},10);
  assert.equal(r.costByWins.length,4);
  close(r.costByWins[1].costPerTicket,1000);
  close(r.costByWins[2].costPerTicket,500);
  close(r.costByWins[3].costPerTicket,2000/6);
  assert.equal(model.theoreticalCosts({...base,limitPrizes:true,prizes:0},10).costByWins.length,1);
});
test('exact cost includes capped expected wins and all planned donations', () => {
  const r=model.theoreticalCosts({...base,probability:50,accounts:2,draws:1,limitPrizes:true,prizes:1},5);
  close(r.expectedPrizes,.75);close(r.expectedTickets,1.5);close(r.costPerTicket,20/3);
  const certain=model.theoreticalCosts({...base,probability:100,accounts:3,draws:4},7);
  close(certain.totalCost,84);close(certain.expectedTickets,6);close(certain.costPerTicket,14);
});
test('zero wins has no finite ticket cost, while free donations with wins cost zero', () => {
  for(const patch of [{probability:0},{accounts:0},{draws:0},{limitPrizes:true,prizes:0}]) {
    const r=model.theoreticalCosts({...base,...patch},10);
    assert.equal(r.expectedTickets,0);assert.equal(r.costPerTicket,null);
    assert.equal(r.costByWins[0].costPerTicket,null);
  }
  const free=model.theoreticalCosts(base,0);
  assert.equal(free.costPerTicket,0);
  assert.ok(free.costByWins.slice(1).every(row=>row.costPerTicket===0));
});
test('invalid inputs are rejected', () => {
  for(const patch of [{accounts:-1},{probability:NaN},{limitPrizes:'false'}]) assert.throws(()=>model.calculate({...base,...patch}));
  for(const cost of [-1,NaN,Infinity,1000001]) assert.throws(()=>model.theoreticalCosts(base,cost));
});


test('chart trims negligible tails without grouping or renormalizing outcomes', () => {
  const result={probabilities:[.000001,.4,.599998,.000001],atLeast:[1,.999999,.599999,.000001]};
  const snapshot=structuredClone(result);
  const view=chart.visibleOutcomes(result);
  assert.deepEqual(view.points,[{wins:1,chance:.4,tail:.999999},{wins:2,chance:.599998,tail:.599999}]);
  close(view.omittedProbability,.000002);
  assert.equal(view.trimmed,true);
  assert.deepEqual(result,snapshot);
});
test('high account counts keep consecutive individual wins and at least 99.99% of probability', () => {
  const result=model.calculate({...base,accounts:1000,probability:50,draws:1});
  const view=chart.visibleOutcomes(result);
  assert.ok(view.points.length>100 && view.points.length<200);
  assert.ok(view.points[0].wins>0 && view.points.at(-1).wins<1000);
  assert.ok(view.omittedProbability<.0001);
  assert.ok(view.points.reduce((sum,row)=>sum+row.chance,0)>.9999);
  view.points.forEach((row,i)=>{
    assert.equal(row.wins,view.points[0].wins+i);
    assert.equal(row.chance,result.probabilities[row.wins]);
    assert.equal(row.tail,result.atLeast[row.wins]);
  });
});
test('chart keeps the certain outcome for zero, full, and capped wins', () => {
  for(const [patch,wins] of [[{accounts:0},0],[{probability:0},0],[{probability:100},20],[{probability:100,limitPrizes:true,prizes:3},3]]) {
    const view=chart.visibleOutcomes(model.calculate({...base,...patch}));
    assert.deepEqual(view.points,[{wins,chance:1,tail:1}]);
    assert.equal(view.omittedProbability,0);
  }
});
