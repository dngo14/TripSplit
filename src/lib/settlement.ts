import type { Expense, Member, Settlement } from './types';

export function calculateSettlements(expenses: Expense[], members: Member[]): Settlement[] {
  if (members.length === 0) {
    return [];
  }

  const memberBalances: { [memberId: string]: number } = {};
  members.forEach(member => {
    memberBalances[member.id] = 0;
  });

  expenses.forEach(expense => {
    memberBalances[expense.paidById] += expense.amount;
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const sharePerMember = totalExpenses / members.length;

  members.forEach(member => {
    memberBalances[member.id] -= sharePerMember;
  });

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  members.forEach(member => {
    if (memberBalances[member.id] < -0.01) { // Using a small epsilon for float comparison
      debtors.push({ id: member.id, amount: -memberBalances[member.id] });
    } else if (memberBalances[member.id] > 0.01) {
      creditors.push({ id: member.id, amount: memberBalances[member.id] });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountToSettle = Math.min(debtor.amount, creditor.amount);

    if (amountToSettle > 0.01) { // Only settle if amount is significant
      const debtorMember = members.find(m => m.id === debtor.id);
      const creditorMember = members.find(m => m.id === creditor.id);

      if (debtorMember && creditorMember) {
        settlements.push({
          from: debtorMember.name,
          to: creditorMember.name,
          amount: amountToSettle,
        });
      }

      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;
    }

    if (debtor.amount < 0.01) {
      debtorIndex++;
    }
    if (creditor.amount < 0.01) {
      creditorIndex++;
    }
  }

  return settlements;
}
