export function calculateOrderDiscount(input: {
  total: number; discount: number; adminDiscount: number; deposit: number;
  amount: number; items: { finalLinePrice: number; discount: number; adminDiscount: number }[];
}) {
  const cents = (n: number) => Math.round(n * 100);
  if (!Number.isFinite(input.amount) || input.amount < 0 || Math.abs(input.amount * 100 - cents(input.amount)) > 0.00001)
    throw new Error("أدخل مبلغ خصم صحيحًا بحد أقصى منزلتين عشريتين");
  const amount = cents(input.amount);
  const bases = input.items.map(item => cents(item.finalLinePrice) + cents(item.adminDiscount));
  const base = bases.reduce((sum, value) => sum + value, 0);
  if (amount > base) throw new Error("الخصم أكبر من قيمة المنتجات بعد خصم الكوبون");
  const total = cents(input.total) + cents(input.adminDiscount) - amount;
  if (total < cents(input.deposit)) throw new Error("الإجمالي بعد الخصم لا يمكن أن يقل عن المقدم المستلم؛ يلزم تسوية المبلغ أولًا");
  let cumulative = 0;
  let allocated = 0;
  const items = input.items.map((item, index) => {
    cumulative += bases[index];
    const next = base ? Math.round(amount * cumulative / base) : 0;
    const share = next - allocated; allocated = next;
    return { adminDiscount: share / 100, finalLinePrice: (bases[index] - share) / 100,
      discount: (cents(item.discount) - cents(item.adminDiscount) + share) / 100 };
  });
  return { total: total / 100, discount: (cents(input.discount) - cents(input.adminDiscount) + amount) / 100,
    adminDiscount: amount / 100, items };
}
