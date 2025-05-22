import type { Expense, Member, Settlement, SplitDetail } from './types';

export function calculateSettlements(expenses: Expense[], members: Member[]): Settlement[] {
  if (members.length === 0) {
    return [];
  }

  const memberBalances: { [memberId: string]: number } = {};
  members.forEach(member => {
    memberBalances[member.id] = 0;
  });

  expenses.forEach(expense => {
    // The payer initially gets credited the full amount they paid
    if (memberBalances[expense.paidById] !== undefined) {
      memberBalances[expense.paidById] += expense.amount;
    }

    const numTripMembers = members.length;

    switch (expense.splitType) {
      case 'equally':
        let membersInEqualSplit: string[] = [];
        if (expense.splitDetails && expense.splitDetails.length > 0) {
          // Split among specified members in splitDetails
          membersInEqualSplit = expense.splitDetails.map(sd => sd.memberId);
        } else {
          // Default to all trip members if splitDetails is empty for 'equally'
          membersInEqualSplit = members.map(m => m.id);
        }
        
        if (membersInEqualSplit.length > 0) {
          const sharePerMemberForThisExpense = expense.amount / membersInEqualSplit.length;
          membersInEqualSplit.forEach(memberId => {
            if (memberBalances[memberId] !== undefined) {
              memberBalances[memberId] -= sharePerMemberForThisExpense;
            }
          });
        }
        break;

      case 'byAmount':
        expense.splitDetails?.forEach(detail => {
          if (memberBalances[detail.memberId] !== undefined && detail.amount !== undefined) {
            memberBalances[detail.memberId] -= detail.amount;
          }
        });
        break;

      case 'byPercentage':
        expense.splitDetails?.forEach(detail => {
          if (memberBalances[detail.memberId] !== undefined && detail.percentage !== undefined) {
            memberBalances[detail.memberId] -= expense.amount * (detail.percentage / 100);
          }
        });
        break;
      
      default: // Fallback for old data or undefined splitType, treat as 'equally' among all
        if (numTripMembers > 0) {
          const defaultShare = expense.amount / numTripMembers;
          members.forEach(member => {
            if (memberBalances[member.id] !== undefined) {
              memberBalances[member.id] -= defaultShare;
            }
          });
        }
        break;
    }
  });

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.keys(memberBalances).forEach(memberId => {
    const balance = memberBalances[memberId];
    if (balance < -0.001) { // Use a small epsilon for floating point comparisons
      debtors.push({ id: memberId, amount: -balance });
    } else if (balance > 0.001) {
      creditors.push({ id: memberId, amount: balance });
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

    if (amountToSettle > 0.001) { 
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

    if (debtor.amount < 0.001) {
      debtorIndex++;
    }
    if (creditor.amount < 0.001) {
      creditorIndex++;
    }
  }
  return settlements;
}
