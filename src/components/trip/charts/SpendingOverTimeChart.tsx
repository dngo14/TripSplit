
"use client";

import type React from 'react';
import { useMemo } from 'react';
import { format, isValid, isDate } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingOverTimeChartProps {
  expenses: Expense[];
  tripCurrency: string;
}

export function SpendingOverTimeChart({ expenses, tripCurrency }: SpendingOverTimeChartProps) {
  
  const chartConfig = useMemo<ChartConfig>(() => ({
    totalSpent: {
      label: `Spent (${tripCurrency})`,
      color: "hsl(var(--chart-1))",
    },
  }), [tripCurrency]);

  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const dailySpending: { [dateStr: string]: number } = {};
    expenses.forEach(expense => {
      // Ensure expense.date is a valid Date object
      const expenseDateObj = expense.date instanceof Date ? expense.date : (expense.date as any)?.toDate?.();
      
      if (expenseDateObj && isDate(expenseDateObj) && isValid(expenseDateObj)) {
        const dateStr = format(expenseDateObj, 'yyyy-MM-dd');
        dailySpending[dateStr] = (dailySpending[dateStr] || 0) + expense.amount;
      } else {
        // console.warn("Invalid or missing date for expense:", expense.description, expense.date);
      }
    });
    
    return Object.entries(dailySpending)
      .map(([date, totalSpent]) => ({
        date,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({ ...item, date: format(new Date(item.date), 'MMM d') })); // Format date for display

  }, [expenses]);

  if (!expenses || expenses.length === 0 || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No spending data over time available.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: 10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false}/>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            // tickFormatter={(value) => format(new Date(value), "MMM d")}
          />
          <YAxis
            tickFormatter={(value) => `${value.toLocaleString()}`}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            // label={{ value: `Amount (${tripCurrency})`, angle: -90, position: 'insideLeft', offset: -5 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Line
            dataKey="totalSpent"
            type="monotone"
            stroke="var(--color-totalSpent)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-totalSpent)",
              r: 4,
            }}
            activeDot={{
              r:6,
              strokeWidth: 1,
              fill: "hsl(var(--background))",
              stroke: "var(--color-totalSpent)"
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

    