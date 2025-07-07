import { defineFlow, runFlow } from '@genkit-ai/next';
import { gemini20FlashPreview } from '@genkit-ai/googleai';
import { z } from 'zod';

const OptimizeExpensesInputSchema = z.object({
  expenses: z.array(z.object({
    description: z.string(),
    amount: z.number(),
    category: z.string(),
    paidBy: z.string(),
  })),
  budget: z.number().optional(),
  currency: z.string().default('USD'),
});

const OptimizeExpensesOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Array of optimization suggestions'),
  totalSavings: z.string().describe('Estimated total potential savings'),
  categoryAnalysis: z.array(z.object({
    category: z.string(),
    totalSpent: z.number(),
    suggestion: z.string(),
  })).describe('Analysis by expense category'),
  budgetAnalysis: z.string().optional().describe('Analysis of spending vs budget if budget provided'),
});

export type OptimizeExpensesInput = z.infer<typeof OptimizeExpensesInputSchema>;
export type OptimizeExpensesOutput = z.infer<typeof OptimizeExpensesOutputSchema>;

export const optimizeExpenses = defineFlow(
  {
    name: 'optimizeExpenses',
    inputSchema: OptimizeExpensesInputSchema,
    outputSchema: OptimizeExpensesOutputSchema,
  },
  async (input) => {
    const { expenses, budget, currency } = input;
    
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Create expense summary for the prompt
    const expenseSummary = expenses.map(e => 
      `${e.description}: ${currency} ${e.amount} (${e.category}) - paid by ${e.paidBy}`
    ).join('\n');
    
    // Group expenses by category
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, total]) => `${category}: ${currency} ${total}`)
      .join('\n');

    const prompt = `
    You are a financial advisor helping travelers optimize their trip expenses. 
    
    Here are the expenses from a recent trip:
    ${expenseSummary}
    
    Category breakdown:
    ${categoryBreakdown}
    
    Total spent: ${currency} ${totalSpent}
    ${budget ? `Budget: ${currency} ${budget}` : 'No budget provided'}
    Currency: ${currency}
    
    Please analyze these expenses and provide:
    1. Practical suggestions for reducing costs on similar future trips
    2. Estimate potential savings amount
    3. Category-wise analysis with specific recommendations
    ${budget ? '4. Analysis of spending vs budget' : ''}
    
    Focus on actionable advice that travelers can implement, such as:
    - Booking strategies
    - Alternative options
    - Timing recommendations
    - Group savings opportunities
    - Local vs tourist pricing tips
    `;

    const result = await runFlow(gemini20FlashPreview, {
      prompt,
      output: { schema: OptimizeExpensesOutputSchema },
    });

    return result;
  }
);