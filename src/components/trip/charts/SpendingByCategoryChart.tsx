
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
            content={<ChartTooltipContent hideLabel indicator="line" nameKey="name" formatter={(value, name) => `${name}: ${value.toLocaleString()} ${tripCurrency}`} />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70} // Reduced outerRadius
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend content={({ payload }) => {
             if (!payload) return null;
             return (
                <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-xs mt-2 px-2"> {/* Adjusted gap and padding */}
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex items-center text-left"> {/* Removed max-width, rely on flex-wrap */}
                      <span style={{ backgroundColor: entry.color, minWidth: '8px' }} className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"></span> {/* Smaller indicator */}
                      <span className="whitespace-normal break-words leading-tight"> {/* Allow wrapping, tight leading */}
                        {entry.value} ({((entry.payload as any)?.percent * 100 || 0).toFixed(0)}%)
                      </span>
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
