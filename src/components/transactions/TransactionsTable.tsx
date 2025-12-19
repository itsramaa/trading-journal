import { ArrowDownLeft, ArrowUpRight, MoreHorizontal } from "lucide-react";
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
import type { Transaction } from "@/lib/demo-data";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
            <TableHead>Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="group">
              <TableCell className="pl-6">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      transaction.type === "BUY" ? "bg-profit-muted" : "bg-loss-muted"
                    )}
                  >
                    {transaction.type === "BUY" ? (
                      <ArrowDownLeft className="h-4 w-4 text-profit" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-loss" />
                    )}
                  </div>
                  <Badge
                    className={cn(
                      "font-medium",
                      transaction.type === "BUY"
                        ? "bg-profit-muted text-profit hover:bg-profit-muted"
                        : "bg-loss-muted text-loss hover:bg-loss-muted"
                    )}
                  >
                    {transaction.type}
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
                {transaction.quantity}
              </TableCell>
              <TableCell className="text-right font-medium">
                ${transaction.price.toLocaleString()}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  transaction.type === "BUY" ? "text-foreground" : "text-profit"
                )}
              >
                {transaction.type === "BUY" ? "-" : "+"}$
                {transaction.total.toLocaleString()}
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
                  <DropdownMenuContent align="end">
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
