import { ArrowDownLeft, ArrowUpRight, RefreshCw, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/formatters";
import type { Transaction } from "@/types/portfolio";

interface TransactionsTableProps {
  transactions: Transaction[];
}

const getTransactionBadgeStyle = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return "bg-profit-muted text-profit hover:bg-profit-muted";
    case 'SELL':
    case 'TRANSFER_OUT':
      return "bg-loss-muted text-loss hover:bg-loss-muted";
    default:
      return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
};

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return <ArrowDownLeft className="h-4 w-4 text-profit" />;
    case 'SELL':
    case 'TRANSFER_OUT':
      return <ArrowUpRight className="h-4 w-4 text-loss" />;
    default:
      return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTransactionIconBg = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return "bg-profit-muted";
    case 'SELL':
    case 'TRANSFER_OUT':
      return "bg-loss-muted";
    default:
      return "bg-secondary";
  }
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6">Type</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Fees</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="group">
              <TableCell className="pl-6">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    getTransactionIconBg(transaction.type)
                  )}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <Badge className={cn("font-medium", getTransactionBadgeStyle(transaction.type))}>
                    {transaction.type.replace('_', ' ')}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{transaction.assetSymbol}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.assetName}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatQuantity(transaction.quantity, 'US')}
              </TableCell>
              <TableCell className="text-right font-medium">
                {transaction.price > 0 ? formatCurrency(transaction.price, 'USD') : '--'}
              </TableCell>
              <TableCell className={cn(
                "text-right font-medium",
                transaction.type === "BUY" ? "text-foreground" : "text-profit"
              )}>
                {transaction.totalAmount > 0 ? (
                  <>
                    {transaction.type === "BUY" ? "-" : "+"}
                    {formatCurrency(transaction.totalAmount, 'USD')}
                  </>
                ) : '--'}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {transaction.fees > 0 ? formatCurrency(transaction.fees, 'USD') : '--'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-loss">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}