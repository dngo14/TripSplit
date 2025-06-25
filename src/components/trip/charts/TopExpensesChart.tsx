"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { Expense } from '@/lib/types';

interface TopExpensesChartProps {
  expenses: Expense[];
  tripCurrency: string;
  topCount?: number;
}

export function TopExpensesChart({ expenses, tripCurrency, topCount = 10 }: TopExpensesChartProps) {
  const chartConfig = useMemo<ChartConfig>(() => ({
    amount: {
      label: `Amount (${tripCurrency})`,
      color: "hsl(var(--chart-4))",
    },
  }), [tripCurrency]);

  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    // Filter out settlement payments and invalid expenses
    const validExpenses = expenses
      .filter(expense => 
        expense.amount > 0 && 
        expense.description && 
        expense.description.trim() !== '' &&
        !expense.description.toLowerCase().includes('settlement payment')
      )
      .sort((a, b) => b.amount - a.amount)
      .slice(0, topCount);

    return validExpenses.map((expense, index) => ({
      description: expense.description.length > 25 
        ? expense.description.substring(0, 25) + '...' 
        : expense.description,
      amount: parseFloat(expense.amount.toFixed(2)),
      fullDescription: expense.description,
      paidBy: expense.paidBy || 'Unknown',
      rank: index + 1,
    }));
  }, [expenses, topCount]);

  if (!expenses || expenses.length === 0 || chartData.length === 0) {
    return <p className="text-sm text-foreground/60 text-center py-8">No expense data available.</p>;
  }

  const totalShown = chartData.reduce((sum, item) => sum + item.amount, 0);
  const totalAll = expenses
    .filter(expense => 
      expense.amount > 0 && 
      !expense.description?.toLowerCase().includes('settlement payment')
    )
    .reduce((sum, expense) => sum + expense.amount, 0);
  const percentageShown = totalAll > 0 ? ((totalShown / totalAll) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="space-y-1">
          <p className="text-foreground/70">
            Top {chartData.length} expenses: <span className="font-medium text-foreground">{totalShown.toFixed(2)} {tripCurrency}</span>
          </p>
          <p className="text-foreground/70">
            {percentageShown}% of actual spending
          </p>
        </div>
        {chartData.length > 0 && (
          <div className="text-right space-y-1">
            <p className="text-xs text-foreground/60">Highest: {chartData[0].amount.toFixed(2)} {tripCurrency}</p>
            {chartData.length > 1 && (
              <p className="text-xs text-foreground/60">Lowest: {chartData[chartData.length - 1].amount.toFixed(2)} {tripCurrency}</p>
            )}
          </div>
        )}
      </div>
      
      <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 80,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="description"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={70}
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis
              tickFormatter={(value) => `${value.toLocaleString()} ${tripCurrency}`}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-card text-card-foreground p-4 shadow-lg max-w-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            #{data.rank}
                          </span>
                          <span className="text-xs text-foreground/60">Top Expense</span>
                        </div>
                        <p className="font-medium text-foreground break-words">{data.fullDescription}</p>
                        <div className="space-y-1">
                          <p className="text-sm text-foreground/70">
                            Amount: <span className="font-bold text-primary">{data.amount.toFixed(2)} {tripCurrency}</span>
                          </p>
                          <p className="text-xs text-foreground/60">Paid by: <span className="font-medium">{data.paidBy}</span></p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[0, 4, 4, 0]}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}