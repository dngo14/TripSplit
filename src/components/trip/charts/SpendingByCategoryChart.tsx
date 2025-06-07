
"use client";

import type React from 'react';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingByCategoryChartProps {
  expenses: Expense[];
  tripCurrency: string;
}

const predefinedColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
];

export function SpendingByCategoryChart({ expenses, tripCurrency }: SpendingByCategoryChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    const spendingByCategory: { [key: string]: number } = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      spendingByCategory[category] = (spendingByCategory[category] || 0) + expense.amount;
    });

    const dataForPie = Object.entries(spendingByCategory).map(([category, amount], index) => ({
      name: category,
      value: parseFloat(amount.toFixed(2)),
      fill: predefinedColors[index % predefinedColors.length],
    }));

    const config: ChartConfig = {};
    dataForPie.forEach(item => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    
    // Sort data for consistent pie chart segment order if desired
    dataForPie.sort((a, b) => b.value - a.value);


    return { chartData: dataForPie, chartConfig: config };
  }, [expenses]);

  if (!expenses || expenses.length === 0 || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No category spending data available.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel indicator="line" nameKey="name" labelKey="value" formatter={(value, name) => `${name}: ${value.toLocaleString()} ${tripCurrency}`} />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            labelLine={false}
            // label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} // Can be verbose for many categories
          >
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend content={({ payload }) => {
             if (!payload) return null;
             return (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-3">
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex items-center">
                    <span style={{ backgroundColor: entry.color }} className="w-2.5 h-2.5 rounded-full mr-1.5"></span>
                    {entry.value} ({((entry.payload as any)?.percent * 100 || 0).toFixed(0)}%)
                    </div>
                ))}
                </div>
            );
          }}/>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}


    