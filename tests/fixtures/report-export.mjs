export function reportFixture() { return {
 range:{period:'custom',from:'2026-10-01',to:'2026-10-31',timeZone:'Africa/Cairo'},currency:'EGP',
 notes:{excludedDifferentCurrencyOrders:2},sales:{total:1200,shipping:60,gross:1360,discounts:100,refunded:40,net:1220,orders:2,units:4,averageOrderValue:610},
 cash:{deposits:300,deliveryBalances:920,received:1220},salesByDay:[{date:'2026-10-04',gross:1360,net:1220,orders:2}],
 returns:{count:1,units:1,value:40,costs:10,restocked:1,notRestocked:0},returnsByDay:[{date:'2026-10-05',count:1,value:40}],
 returnedProducts:[{product:'عود عربي',variant:'50 ml',units:1}],products:Array.from({length:100},(_,i)=>({key:String(i),product:i?'عطر ورد وعود شرقي اسم طويل للاختبار': '=SUM(A1:A9)',variant:'100 ml',units:4,gross:1300,discounts:100,refunds:40,net:1160,returnedUnits:1,estimatedCost:700})),
 expenses:{total:300,returnCosts:10,materialPurchases:150,byCategory:[{category:'إيجار ومصاريف تشغيل',amount:150}],rows:[{id:'one',category:'مصاريف سوشيال ميديا',amount:150,date:'2026-10-04T23:30:00Z',description:'اختبار وصف عربي ومبلغ',reference:null}]},
 consumption:[{id:'mat',name:'زيت عود',unit:'ml',consumed:25,orders:2,products:1}],inventory:[{id:'mat',name:'زيت عود',type:'زيوت',unit:'ml',stock:12.5,reorderLevel:20,purchased:50,consumed:25,wasted:1,returned:2,adjusted:-3,estimatedValue:null}],
 lowStock:[{id:'mat',name:'زيت عود',unit:'ml',stock:12.5,reorderLevel:20}],profit:{revenue:1160,recipeCost:700,profit:null,margin:null,incomplete:true,missingLines:1,estimated:true},
 profitability:{estimatedProductCost:700,estimatedGrossProfit:null,estimatedGrossMargin:null,incomplete:true,estimated:true},roas:{sales:1200,spend:150,ratio:8}
 }; }
