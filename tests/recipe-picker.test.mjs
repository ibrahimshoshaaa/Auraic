import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleRecipeMaterial, adjustRecipeQuantity } from '../src/lib/products/recipe-picker.ts';
test('recipe shortcuts select one line per material and preserve existing quantities', () => {
 const original = [{materialId:'oil',quantity:30}];
 const added = toggleRecipeMaterial(original,'bottle');
 assert.deepEqual(added,[{materialId:'oil',quantity:30},{materialId:'bottle',quantity:1}]);
 assert.deepEqual(toggleRecipeMaterial(added,'bottle'),original);
 assert.deepEqual(original,[{materialId:'oil',quantity:30}]);
 assert.equal(toggleRecipeMaterial(Array.from({length:30},(_,i)=>({materialId:String(i),quantity:1})),'new').length,30);
});
test('quantity controls retain fractions and enforce storage limits', () => {
 assert.equal(adjustRecipeQuantity(2.5,0.5),3);
 assert.equal(adjustRecipeQuantity(0.5,-0.5),0.000001);
 assert.equal(adjustRecipeQuantity(10000000,1),10000000);
 assert.equal(adjustRecipeQuantity('invalid',0.5),1.5);
});
