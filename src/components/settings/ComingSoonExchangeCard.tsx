/**
 * Coming Soon Exchange Card
 * Displays a placeholder card for exchanges that are not yet available
 */

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { EXCHANGE_REGISTRY, type ExchangeType } from "@/types/exchange";

interface ComingSoonExchangeCardProps {
  exchange: ExchangeType;
}

export function ComingSoonExchangeCard({ exchange }: ComingSoonExchangeCardProps) {
  const meta = EXCHANGE_REGISTRY[exchange];

  return (
    <Card className="border-dashed opacity-75">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-muted-foreground text-base font-medium">
            <span>{meta.icon}</span>
            {meta.name}
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        <CardDescription>
          Connect your {meta.name} account when this exchange becomes available.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
