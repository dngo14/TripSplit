"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Expense } from '@/lib/types';
import { format, isValid } from 'date-fns';

interface ExpenseFrequencyChartProps {
  expenses: Expense[];
}

export function ExpenseFrequencyChart({ expenses }: ExpenseFrequencyChartProps) {
  const chartConfig = useMemo<ChartConfig>(() => ({
    count: {
      label: "Number of Expenses",
      color: "hsl(var(--chart-3))",
    },
  }), []);

  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const dailyCount: { [dateStr: string]: number } = {};
    
    expenses.forEach(expense => {
      const expenseDateObj = expense.date instanceof Date ? expense.date : expense.date?.toDate?.();
      
      if (expenseDateObj && isValid(expenseDateObj)) {
        const dateStr = format(expenseDateObj, 'yyyy-MM-dd');
        dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;
      }
    });
    
    return Object.entries(dailyCount)
      .map(([date, count]) => ({
        date: format(new Date(date), 'MMM d'),
        count,
        fullDate: date,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .slice(0, 15); // Show last 15 days to prevent overcrowding
  }, [expenses]);

  if (!expenses || expenses.length === 0 || chartData.length === 0) {
    return <p className="text-sm text-foreground/60 text-center py-8">No expense frequency data available.</p>;
  }

  const totalExpenses = chartData.reduce((sum, item) => sum + item.count, 0);
  const averagePerDay = (totalExpenses / chartData.length).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="space-y-1">
          <p className="text-foreground/70">
            Total Expenses: <span className="font-medium text-foreground">{totalExpenses}</span>
          </p>
          <p className="text-foreground/70">
            Average per Day: <span className="font-medium text-foreground">{averagePerDay}</span>
          </p>
        </div>
      </div>
      
      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
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
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <Tooltip
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}