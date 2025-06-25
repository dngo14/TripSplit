"use client";

import { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Expense } from '@/lib/types';

interface BudgetVsActualChartProps {
  expenses: Expense[];
  tripCurrency: string;
  budget?: number | null;
}

export function BudgetVsActualChart({ expenses, tripCurrency, budget }: BudgetVsActualChartProps) {
  const chartConfig = useMemo<ChartConfig>(() => ({
    actualSpending: {
      label: `Actual Spending (${tripCurrency})`,
      color: "hsl(var(--chart-1))",
    },
    budgetLine: {
      label: `Budget (${tripCurrency})`,
      color: "hsl(var(--chart-2))",
    },
  }), [tripCurrency]);

  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0 || !budget) return [];

    // Calculate cumulative spending
    const sortedExpenses = expenses
      .filter(expense => expense.date && expense.amount > 0)
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : a.date?.toDate?.();
        const dateB = b.date instanceof Date ? b.date : b.date?.toDate?.();
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

    let cumulativeSpending = 0;
    const data = sortedExpenses.map((expense) => {
      cumulativeSpending += expense.amount;
      const expenseDate = expense.date instanceof Date ? expense.date : expense.date?.toDate?.();
      
      return {
        date: expenseDate?.toLocaleDateString() || 'Unknown',
        actualSpending: parseFloat(cumulativeSpending.toFixed(2)),
        budgetLine: budget,
      };
    });

    return data;
  }, [expenses, budget]);

  if (!budget || !expenses || expenses.length === 0 || chartData.length === 0) {
    return <p className="text-sm text-foreground/60 text-center py-8">No budget set or spending data available for comparison.</p>;
  }

  const isOverBudget = chartData[chartData.length - 1]?.actualSpending > budget;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-foreground/70">
            Budget: <span className="font-medium text-foreground">{budget.toFixed(2)} {tripCurrency}</span>
          </p>
          <p className="text-sm text-foreground/70">
            Spent: <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
              {chartData[chartData.length - 1]?.actualSpending.toFixed(2)} {tripCurrency}
            </span>
          </p>
          <p className="text-xs text-foreground/60">
            {isOverBudget ? 'Over budget' : 'Within budget'} by{' '}
            <span className={isOverBudget ? 'text-destructive' : 'text-primary'}>
              {Math.abs(budget - (chartData[chartData.length - 1]?.actualSpending || 0)).toFixed(2)} {tripCurrency}
            </span>
          </p>
        </div>
      </div>
      
      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickFormatter={(value) => `${value.toLocaleString()}`}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <Tooltip
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="actualSpending"
              type="monotone"
              fill="var(--color-actualSpending)"
              fillOpacity={0.3}
              stroke="var(--color-actualSpending)"
              strokeWidth={2}
            />
            <Line
              dataKey="budgetLine"
              type="monotone"
              stroke="var(--color-budgetLine)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}