
import type { Expense, Member, Settlement, Timestamp } from './types';

export function calculateSettlements(
  expenses: Expense[],
  members: Member[]
): Settlement[] {
  if (members.length === 0) {
    return [];
  }

  const memberBalances: { [memberId: string]: number } = {};
  members.forEach(member => {
    memberBalances[member.id] = 0;
  });

  expenses.forEach(expense => {
    // Ensure expense.paidById is valid and exists in members
    const payerExists = members.some(m => m.id === expense.paidById);
    if (payerExists && memberBalances[expense.paidById] !== undefined) {
      memberBalances[expense.paidById] += expense.amount;
    } else if (!payerExists) {
      // console.warn(`Payer ID ${expense.paidById} for expense "${expense.description}" not found in members list. This expense might be miscalculated.`);
      // Decide how to handle this: skip, assign to a default, or log
    }


    const numTripMembers = members.length;

    switch (expense.splitType) {
      case 'equally':
        let membersInEqualSplitIds: string[] = [];
        if (expense.splitDetails && expense.splitDetails.length > 0) {
          // Filter splitDetails to only include members currently in the trip
          membersInEqualSplitIds = expense.splitDetails
            .map(sd => sd.memberId)
            .filter(id => members.some(m => m.id === id));
        } else {
          membersInEqualSplitIds = members.map(m => m.id);
        }
        
        // If, after filtering, no valid members are left for the split (e.g., all original split members were removed from the trip)
        // and the original intent was to split among specific members, this expense effectively isn't split.
        // If the intent was to split among ALL, and there are still members in the trip, proceed.
        if (membersInEqualSplitIds.length > 0) {
          const sharePerMemberForThisExpense = expense.amount / membersInEqualSplitIds.length;
          membersInEqualSplitIds.forEach(memberId => {
            if (memberBalances[memberId] !== undefined) {
              memberBalances[memberId] -= sharePerMemberForThisExpense;
            }
          });
        }
        break;

      case 'byAmount':
        expense.splitDetails?.forEach(detail => {
          // Ensure the memberId in splitDetail exists in the current members list
          if (members.some(m => m.id === detail.memberId) && memberBalances[detail.memberId] !== undefined && detail.amount !== undefined) {
            memberBalances[detail.memberId] -= detail.amount;
          }
        });
        break;

      case 'byPercentage':
        expense.splitDetails?.forEach(detail => {
           // Ensure the memberId in splitDetail exists in the current members list
          if (members.some(m => m.id === detail.memberId) && memberBalances[detail.memberId] !== undefined && detail.percentage !== undefined) {
            memberBalances[detail.memberId] -= expense.amount * (detail.percentage / 100);
          }
        });
        break;

      default: // Fallback, treat as equally among all current trip members
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

  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  Object.keys(memberBalances).forEach(memberId => {
    const balance = memberBalances[memberId];
    const member = members.find(m => m.id === memberId);
    if (!member) return; // Skip if member not found (e.g., removed from trip but still in old expenses)

    // Using a small epsilon for floating point comparisons
    if (balance < -0.001) {
      debtors.push({ id: memberId, name: member.name, amount: -balance });
    } else if (balance > 0.001) {
      creditors.push({ id: memberId, name: member.name, amount: balance });
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

    if (amountToSettle > 0.001) { // Use epsilon for comparison
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        fromId: debtor.id, // Add debtor ID
        toId: creditor.id, // Add creditor ID
        amount: amountToSettle,
      });

      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;
    }

    if (debtor.amount < 0.001) { // Use epsilon
      debtorIndex++;
    }
    if (creditor.amount < 0.001) { // Use epsilon
      creditorIndex++;
    }
  }
  return settlements;
}
