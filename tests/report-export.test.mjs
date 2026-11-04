import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';import ts from 'typescript';import {createRequire} from 'node:module';import {PDFDocument} from 'pdf-lib';import ExcelJS from 'exceljs';import {reportFixture} from './fixtures/report-export.mjs';
const require=createRequire(import.meta.url);const cache=new Map();
function load(file){file=resolve(file);if(cache.has(file))return cache.get(file);const compiled={exports:{}};cache.set(file,compiled.exports);const local=name=>name.startsWith('.')?load(resolve(dirname(file),name+'.ts')):require(name);new Function('require','module','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(local,compiled,compiled.exports);return compiled.exports;}
test('report exports preserve period, currency, typed values, full detail and missing profit',async()=>{
 const r=reportFixture();const {tables}=load('src/lib/reports/export-data.ts').reportExportData(r);
 assert.equal(tables.find(t=>t.name==='أداء المنتجات').rows.length,100);
 assert.equal(tables[0].rows.find(x=>x[0]==='الربح بعد تكلفة الوصفات')[1],null);
 const bytes=await load('src/lib/reports/xlsx.ts').reportXlsx(r);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(bytes));
 assert.equal(workbook.worksheets.length,tables.length);const products=workbook.getWorksheet('أداء المنتجات');assert.equal(products.rowCount,104);assert.equal(products.getCell('A5').value,'=SUM(A1:A9)');assert.equal(products.getCell('A5').type,ExcelJS.ValueType.String);assert.equal(products.getCell('G5').value,1160);assert.equal(products.views[0].rightToLeft,true);
 assert.match(workbook.getWorksheet('الملخص').getCell('A2').value,/2026-10-01.*2026-10-31.*EGP/);
 const pdf=await load('src/lib/reports/pdf.ts').reportPdf(r);assert.ok((await PDFDocument.load(pdf)).getPageCount()>12);
 if(process.env.REPORT_QA_DIR){mkdirSync(process.env.REPORT_QA_DIR,{recursive:true});writeFileSync(resolve(process.env.REPORT_QA_DIR,'report.xlsx'),bytes);writeFileSync(resolve(process.env.REPORT_QA_DIR,'report.pdf'),pdf);}
});
