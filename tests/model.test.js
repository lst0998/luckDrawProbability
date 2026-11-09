import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.js';
import * as chart from '../src/chart-data.js';
const base = { ...model.DEFAULTS, prizes: 10000 };
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
  const r=model.calculate(model.DEFAULTS), q=1-.95**10;
  close(r.expected,20*q);
  close(r.atLeast[1],1-.95**200);
  close(r.atLeast[2],1-(1-q)**20-20*q*(1-q)**19);
  assert.deepEqual(model.calculate(model.DEFAULTS),r);
  assert.equal('trials' in r,false);
});
test('cap combines all higher outcomes at the capped win count', () => {
  const r=model.calculate({...base,probability:50,accounts:2,draws:1,prizes:1});
  assert.deepEqual(r.probabilities,[.25,.75]);
  assert.deepEqual(r.atLeast,[1,.75]);
  close(r.expected,.75);
});
test('prize caps support the full calculator pool range without growing the outcome domain', () => {
  const result=model.calculate({...base,accounts:2000,prizes:1000000000});
  assert.equal(result.probabilities.length,2001);
  close(result.expected,2000*(1-.95**10),1e-8);
  assert.throws(()=>model.calculate({...base,prizes:1000000001}));
});
test('total prizes always caps wins while each account can win once', () => {
  const capped=model.calculate({...base,probability:100,prizes:3});
  assert.equal(capped.expected,3);
  assert.deepEqual(capped.probabilities,[0,0,0,1]);
  assert.equal(model.calculate({...base,probability:100,prizes:0}).expected,0);
  const r=model.calculate({...base,probability:100});
  close(r.expected,20);
  assert.equal(r.probabilities[20],1);
  assert.equal(r.atLeast[20],1);
});
test('no draws, accounts, win chance, or available prizes gives no wins', () => {
  for(const patch of [{draws:0},{accounts:0},{probability:0},{prizes:0}]) {
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
test('applying a calculator limits the strategy to the total draw pool', () => {
  const config=model.applyCalculator({...base,accounts:2000},model.ESTIMATOR_DEFAULTS);
  assert.equal(config.poolDrawLimit,2000);
  assert.equal(config.accounts,200);
  assert.equal(config.draws,10);
  assert.equal(config.probability,5);
  assert.equal(config.prizes,100);
  assert.equal(model.theoreticalCosts(config,30).totalDonations,2000);
  assert.deepEqual(model.strategyLimits(config),{accounts:[0,200],draws:[0,10]});
  assert.throws(()=>model.calculate({...config,accounts:201}));
  assert.throws(()=>model.calculate({...config,draws:11}));
  for(const row of model.strategies(config)) {
    assert.equal(row.accounts*row.draws,2000);
    assert.doesNotThrow(()=>model.calculate({...config,...row}));
  }
});
test('draw pool limits preserve valid strategies and handle small or fractional pools', () => {
  const valid=model.applyCalculator(base,model.ESTIMATOR_DEFAULTS);
  assert.equal(valid.accounts,20);
  assert.equal(valid.draws,10);
  assert.deepEqual(model.strategyLimits(valid),{accounts:[0,200],draws:[0,100]});
  const tiny=model.applyCalculator(base,{totalOrders:5,drawsPerOrder:1,totalPrizes:1});
  assert.equal(tiny.accounts,1);
  assert.equal(tiny.draws,5);
  const fractional=model.applyCalculator({...base,accounts:100,draws:1},{totalOrders:100,drawsPerOrder:.29,totalPrizes:1});
  assert.equal(fractional.poolDrawLimit,29);
  assert.equal(fractional.accounts,29);
  const subDraw=model.applyCalculator(base,{totalOrders:1,drawsPerOrder:.75,totalPrizes:1});
  assert.equal(subDraw.poolDrawLimit,0);
  assert.equal(subDraw.accounts*subDraw.draws,0);
  assert.equal(model.calculate(subDraw).expected,0);
  assert.throws(()=>model.applyCalculator(base,{totalOrders:0,drawsPerOrder:2,totalPrizes:1}));
});
test('draw pool constraints handle zero strategies, large pools and manual entry', () => {
  for(const patch of [{accounts:0},{draws:0}]) {
    const config=model.applyCalculator({...base,...patch},model.ESTIMATOR_DEFAULTS);
    assert.equal(config.accounts,({...base,...patch}).accounts);
    assert.equal(config.draws,({...base,...patch}).draws);
    assert.equal(model.calculate(config).expected,0);
  }
  const large=model.applyCalculator(base,{totalOrders:1000000000,drawsPerOrder:10000,totalPrizes:100});
  assert.equal(large.poolDrawLimit,10000000000000);
  assert.equal(large.accounts,base.accounts);
  assert.deepEqual(model.strategyLimits(base),{accounts:model.LIMITS.accounts,draws:model.LIMITS.draws});
  assert.doesNotThrow(()=>model.calculate({...base,accounts:10000,poolDrawLimit:null}));
  for(const poolDrawLimit of [-1,1.5,Infinity,10000000000001,100]) {
    assert.throws(()=>model.calculate({...base,poolDrawLimit}));
  }
});
test('200 to 2000 accounts increases expected wins tenfold when enough prizes are available', () => {
  const small=model.calculate({...base,accounts:200});
  const large=model.calculate({...base,accounts:2000});
  close(large.expected,small.expected*10,1e-8);
  close(large.probabilities.reduce((a,b)=>a+b,0),1);
  const capped=model.calculate({...base,accounts:2000,prizes:100});
  assert.equal(capped.probabilities.length,101);
  assert.ok(capped.expected<=100);
});
test('10000 accounts remain normalized and comparison strategies use the full supported range', () => {
  const config={...base,accounts:10000,draws:1,probability:50};
  const result=model.calculate(config);
  close(result.expected,5000,1e-8);
  close(result.probabilities.reduce((a,b)=>a+b,0),1);
  const rows=model.strategies({...config,accounts:2000,draws:5});
  assert.ok(rows.some(row=>row.accounts===10000 && row.draws===1));
  rows.forEach(row=>{
    assert.equal(row.accounts*row.draws,10000);
    assert.doesNotThrow(()=>model.calculate({...config,...row}));
  });
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
test('cost curve respects the account limit and total prizes', () => {
  const r=model.theoreticalCosts({...base,prizes:3},10);
  assert.equal(r.costByWins.length,4);
  close(r.costByWins[1].costPerTicket,1000);
  close(r.costByWins[2].costPerTicket,500);
  close(r.costByWins[3].costPerTicket,2000/6);
  assert.equal(model.theoreticalCosts({...base,prizes:0},10).costByWins.length,1);
});
test('exact cost includes capped expected wins and all planned donations', () => {
  const r=model.theoreticalCosts({...base,probability:50,accounts:2,draws:1,prizes:1},5);
  close(r.expectedPrizes,.75);close(r.expectedTickets,1.5);close(r.costPerTicket,20/3);
  const certain=model.theoreticalCosts({...base,probability:100,accounts:3,draws:4},7);
  close(certain.totalCost,84);close(certain.expectedTickets,6);close(certain.costPerTicket,14);
});
test('zero wins has no finite ticket cost, while free donations with wins cost zero', () => {
  for(const patch of [{probability:0},{accounts:0},{draws:0},{prizes:0}]) {
    const r=model.theoreticalCosts({...base,...patch},10);
    assert.equal(r.expectedTickets,0);assert.equal(r.costPerTicket,null);
    assert.equal(r.costByWins[0].costPerTicket,null);
  }
  const free=model.theoreticalCosts(base,0);
  assert.equal(free.costPerTicket,0);
  assert.ok(free.costByWins.slice(1).every(row=>row.costPerTicket===0));
});
test('invalid inputs are rejected', () => {
  for(const patch of [{accounts:-1},{accounts:10001},{probability:NaN},{prizes:undefined},{prizes:-1},{prizes:1.5}]) assert.throws(()=>model.calculate({...base,...patch}));
  for(const cost of [-1,NaN,Infinity,1000001]) assert.throws(()=>model.theoreticalCosts(base,cost));
});


test('charts hide individual outcomes below 0.1% without grouping or renormalizing', () => {
  const result={probabilities:[.000001,.4,.599998,.000001],atLeast:[1,.999999,.599999,.000001]};
  const snapshot=structuredClone(result);
  const view=chart.visibleOutcomes(result);
  assert.deepEqual(view.points,[{wins:1,chance:.4,tail:.999999},{wins:2,chance:.599998,tail:.599999}]);
  close(view.omittedProbability,.000002);
  assert.equal(view.trimmed,true);
  assert.deepEqual(result,snapshot);
});
test('high account counts retain every outcome meeting the 0.1% cutoff', () => {
  const result=model.calculate({...base,accounts:1000,probability:50,draws:1});
  const view=chart.visibleOutcomes(result);
  assert.deepEqual(view.points.map(row=>row.wins),result.probabilities.flatMap((p,wins)=>p>=.001 ? [wins] : []));
  assert.ok(view.points[0].wins>0 && view.points.at(-1).wins<1000);
  close(view.omittedProbability+view.points.reduce((sum,row)=>sum+row.chance,0),1);
  view.points.forEach((row,i)=>{
    assert.equal(row.wins,view.points[0].wins+i);
    assert.equal(row.chance,result.probabilities[row.wins]);
    assert.equal(row.tail,result.atLeast[row.wins]);
  });
});
test('all outcome charts share the exact cutoff and preserve cumulative sums across hidden counts', () => {
  const result={probabilities:[.9980001,.0009999,.001],atLeast:[1,.0019999,.001]};
  const view=chart.visibleOutcomes(result);
  assert.deepEqual(view.points,[{wins:0,chance:.9980001,tail:1},{wins:2,chance:.001,tail:.001}]);
  close(view.omittedProbability,.0009999);
  const exact=model.calculate({...base,accounts:1,draws:1,probability:.1});
  assert.deepEqual(chart.visibleOutcomes(exact).points.map(row=>row.wins),[0,1]);
  const below=model.calculate({...base,accounts:1,draws:1,probability:.0999999});
  assert.deepEqual(chart.visibleOutcomes(below).points.map(row=>row.wins),[0]);
});
test('cutoff retains qualifying capped outcomes while omitting intervening rare counts', () => {
  const config={...base,accounts:1000,draws:1,probability:50,prizes:548};
  const result=model.calculate(config);
  const view=chart.visibleOutcomes(result);
  assert.equal(view.points.at(-1).wins,548);
  assert.ok(view.points.at(-2).wins<547);
  assert.deepEqual(view.points.filter(row=>row.wins>0).map(row=>row.wins),chart.visibleCostOutcomes(model.theoreticalCosts(config,30)).map(row=>row.wins));
  view.points.forEach(row=>assert.equal(row.tail,result.atLeast[row.wins]));
});
test('outcome filtering supports an empty view when every outcome is below the cutoff', () => {
  const result={probabilities:Array(2000).fill(.0005),atLeast:Array.from({length:2000},(_,i)=>1-i*.0005)};
  const view=chart.visibleOutcomes(result);
  assert.equal(view.points.length,0);
  close(view.omittedProbability,1);
});
test('chart keeps the certain outcome for zero, full, and capped wins', () => {
  for(const [patch,wins] of [[{accounts:0},0],[{probability:0},0],[{probability:100},20],[{probability:100,prizes:3},3]]) {
    const view=chart.visibleOutcomes(model.calculate({...base,...patch}));
    assert.deepEqual(view.points,[{wins,chance:1,tail:1}]);
    assert.equal(view.omittedProbability,0);
  }
});

test('cost chart excludes outcomes below 0.1% and retains exactly 0.1%', () => {
  const costs={costByWins:[
    {wins:0,probability:.997,costPerTicket:null},
    {wins:1,probability:.0009999,costPerTicket:150},
    {wins:2,probability:.001,costPerTicket:75},
    {wins:3,probability:.0010001,costPerTicket:50},
  ]};
  const original=structuredClone(costs);
  assert.deepEqual(chart.visibleCostOutcomes(costs),costs.costByWins.slice(2));
  assert.deepEqual(costs,original);
  const atCutoff=model.theoreticalCosts({...base,accounts:1,draws:1,probability:.1},30);
  assert.equal(chart.visibleCostOutcomes(atCutoff).length,1);
  const belowCutoff=model.theoreticalCosts({...base,accounts:1,draws:1,probability:.0999999},30);
  assert.deepEqual(chart.visibleCostOutcomes(belowCutoff),[]);
});
test('filtering cost points preserves theoretical expectations and full outcome data', () => {
  const costs=model.theoreticalCosts(base,30);
  const visible=chart.visibleCostOutcomes(costs);
  assert.ok(visible.length<costs.costByWins.length-1);
  assert.ok(visible.every(row=>row.probability>=.001 && row.wins>0));
  close(costs.costPerTicket,6000/(40*(1-.95**10)));
  assert.equal(costs.costByWins.length,21);
  const rare=model.theoreticalCosts({...base,accounts:1,draws:1,probability:.05},30);
  assert.deepEqual(chart.visibleCostOutcomes(rare),[]);
  close(rare.costPerTicket,30000);
});
test('cost filter handles certainty, prize totals, and no possible wins', () => {
  for(const [patch,wins] of [[{probability:100},20],[{probability:100,prizes:3},3]]) {
    const visible=chart.visibleCostOutcomes(model.theoreticalCosts({...base,...patch},30));
    assert.equal(visible.length,1);
    assert.equal(visible[0].wins,wins);
    assert.equal(visible[0].probability,1);
  }
  assert.deepEqual(chart.visibleCostOutcomes(model.theoreticalCosts({...base,probability:0},30)),[]);
});

test('orders calculator estimates draw probability from the total draw pool', () => {
  const estimate=model.estimateWinProbability({totalOrders:1000,drawsPerOrder:2,totalPrizes:100});
  assert.equal(estimate.totalDraws,2000);
  assert.equal(estimate.probability,.05);
  assert.equal(estimate.capped,false);
});
test('draws-per-order coefficient accepts fractional averages and preserves precision', () => {
  const estimate=model.estimateWinProbability({totalOrders:1000,drawsPerOrder:1.5,totalPrizes:100});
  assert.equal(estimate.totalDraws,1500);
  close(estimate.probability,1/15);
  assert.equal(estimate.probabilityPercent,6.67);
  assert.equal(model.estimateWinProbability({totalOrders:3,drawsPerOrder:1,totalPrizes:1}).probability,1/3);
});
test('calculated percentages round decimal midpoints up to two places', () => {
  for (const [totalOrders, drawsPerOrder, totalPrizes, expected] of [
    [4000, 1, 107, 2.68],
    [4000, 1, 403, 10.08],
    [2000, 0.2, 23, 5.75],
    [4000, 1.000001, 107, 2.67],
    [4000, 0.999999, 107, 2.68],
  ]) {
    assert.equal(model.estimateWinProbability({totalOrders, drawsPerOrder, totalPrizes}).probabilityPercent, expected);
  }
});
test('orders calculator handles empty pools, no prizes, and more prizes than draws', () => {
  for(const patch of [{totalOrders:0},{drawsPerOrder:0}]) {
    const estimate=model.estimateWinProbability({totalOrders:1000,drawsPerOrder:2,totalPrizes:100,...patch});
    assert.equal(estimate.totalDraws,0);
    assert.equal(estimate.probability,null);
    assert.equal(estimate.probabilityPercent,null);
  }
  assert.equal(model.estimateWinProbability({totalOrders:1000,drawsPerOrder:2,totalPrizes:0}).probability,0);
  const capped=model.estimateWinProbability({totalOrders:10,drawsPerOrder:2,totalPrizes:30});
  assert.equal(capped.probability,1);
  assert.equal(capped.capped,true);
});
test('orders calculator validates counts, coefficient, and numerical bounds', () => {
  for(const patch of [{totalOrders:-1},{totalOrders:1.5},{totalOrders:1000000001},{drawsPerOrder:-.1},{drawsPerOrder:Infinity},{drawsPerOrder:10001},{totalPrizes:NaN},{totalPrizes:1.5}]) {
    assert.throws(()=>model.estimateWinProbability({totalOrders:1000,drawsPerOrder:2,totalPrizes:100,...patch}));
  }
  const large=model.estimateWinProbability({totalOrders:1000000000,drawsPerOrder:10000,totalPrizes:1});
  assert.equal(large.totalDraws,10000000000000);
  assert.ok(large.probability>0 && large.probability<.0000001);
});
