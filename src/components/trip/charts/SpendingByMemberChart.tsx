
"use client";

import type React from 'react';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Expense, Member } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingByMemberChartProps {
  expenses: Expense[];
  members: Member[];
  tripCurrency: string;
}

const memberColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function SpendingByMemberChart({ expenses, members, tripCurrency }: SpendingByMemberChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    const spendingByMember: { [memberId: string]: number } = {};
    members.forEach(member => {
      spendingByMember[member.id] = 0;
    });

    expenses.forEach(expense => {
      if (spendingByMember.hasOwnProperty(expense.paidById)) {
        spendingByMember[expense.paidById] += expense.amount;
      }
    });

    const data = members.map((member, index) => ({
      memberId: member.id,
      memberName: member.name,
      amountPaid: parseFloat(spendingByMember[member.id]?.toFixed(2) || "0"),
      fill: memberColors[index % memberColors.length],
    })).filter(item => item.amountPaid > 0) // Only show members who paid something
       .sort((a,b) => b.amountPaid - a.amountPaid);


    const config: ChartConfig = {};
    data.forEach(item => {
      config[item.memberId] = { // Use memberId as key for config
        label: item.memberName,
        color: item.fill,
      };
    });

    return { chartData: data, chartConfig: config };
  }, [expenses, members]);

  if (!expenses || expenses.length === 0 || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No spending data by members available.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ right: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value) => `${value.toLocaleString()} ${tripCurrency}`} />
          <YAxis dataKey="memberName" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<ChartTooltipContent hideLabel formatter={(value, name, props) => {
                const memberId = props.payload.memberId;
                return (
                    <div className="flex items-center">
                       <div style={{width: '10px', height: '10px', borderRadius: '50%', backgroundColor: chartConfig[memberId]?.color, marginRight: '8px' }}></div>
                       {chartConfig[memberId]?.label}: {Number(value).toLocaleString()} {tripCurrency}
                    </div>
                )
            }} />}
          />
          <Bar dataKey="amountPaid" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.memberId}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

    