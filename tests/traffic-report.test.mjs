import test from 'node:test';
import assert from 'node:assert/strict';
import { trafficRange, trafficPoints, trafficComparable, trafficChange, percentage, pageTitle } from '../src/lib/storefront/traffic-report.ts';
test('rolling ranges accept only supported durations and never include future time', () => {
 const now=new Date('2026-11-03T13:15:00Z');
 for(const days of [1,7,30,90]) {const r=trafficRange(String(days),now); assert.equal(r.days,days); assert.equal(r.to.getTime()-r.from.getTime(),days*86400000); assert.equal(r.from.getTime()-r.previousFrom.getTime(),days*86400000);}
 for(const value of ['-1','Infinity','bad','0','2','']) assert.equal(trafficRange(value,now).days,7);
});
test('hourly and daily series preserve counts and fill missing buckets with zero', () => {
 const r=trafficRange(1,new Date('2026-11-03T13:15:00Z'));
 const points=trafficPoints(r,[{bucket:'2026-11-03T12',visits:2n,views:5n}]);
 assert.equal(points.length,25); assert.equal(points[0].key,'2026-11-02T13'); assert.equal(points.at(-1).key,'2026-11-03T13');
 assert.equal(points.reduce((n,p)=>n+p.views,0),5); assert.equal(points.find(p=>p.key==='2026-11-03T12').visits,2); assert.equal(points.at(-1).views,0);
 const daily=trafficPoints(trafficRange(7,new Date('2026-11-03T22:30:00Z')),[{bucket:'2026-11-04',visits:1n,views:3n}]);
 assert.equal(daily.at(-1).key,'2026-11-04'); assert.equal(daily.at(-1).views,3);
 assert.ok(daily.length>=7 && daily.length<=9); assert.equal(new Set(daily.map(p=>p.key)).size,daily.length);
});
test('comparisons distinguish unknown history, new traffic and real declines', () => {
 const r=trafficRange(7,new Date('2026-11-20T12:00:00Z'));
 assert.equal(trafficComparable(r,new Date('2026-11-03T12:00:00Z')),true);
 assert.equal(trafficComparable(r,new Date('2026-11-18T12:00:00Z')),false);
 assert.equal(trafficComparable(r,null),false);
 assert.equal(trafficComparable(trafficRange(90,r.to),new Date('2025-01-01')),false);
 assert.equal(trafficChange(10,5,false),null);
 assert.deepEqual(trafficChange(10,0,true),{kind:'new',percent:null});
 assert.deepEqual(trafficChange(0,0,true),{kind:'flat',percent:0});
 assert.deepEqual(trafficChange(0,10,true),{kind:'down',percent:100});
 assert.deepEqual(trafficChange(15,10,true),{kind:'up',percent:50});
 assert.equal(percentage(2,3),66.7); assert.equal(percentage(0,0),0);
 assert.equal(pageTitle('/checkout'),'إتمام الطلب'); assert.equal(pageTitle('/products/product-id'),'صفحة منتج');
});
