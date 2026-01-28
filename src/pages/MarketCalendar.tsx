import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Globe, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MarketCalendar = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Market</h1>
          <p className="text-muted-foreground">
            Economic calendar and market analysis
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Economic Calendar</CardTitle>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardDescription>
                Track important economic events that may impact your trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p>Economic calendar integration will be available soon.</p>
                <p className="text-sm mt-2">
                  Features: FOMC meetings, NFP, CPI, GDP releases, and more.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Market Sessions</CardTitle>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardDescription>
                Track global market sessions and trading hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-50" />
                <p>Market session tracker will be available soon.</p>
                <p className="text-sm mt-2">
                  Features: London, New York, Tokyo, Sydney sessions.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Market Analysis</CardTitle>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardDescription>
                AI-powered market sentiment and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                <p>Market analysis features will be available soon.</p>
                <p className="text-sm mt-2">
                  Features: Sentiment analysis, trend detection, volatility alerts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketCalendar;
