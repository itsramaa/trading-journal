import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Clock, Play, Star } from "lucide-react";

const learningPaths = [
  {
    id: "1",
    name: "Cryptocurrency Fundamentals",
    progress: 100,
    modules: 8,
    completed: 8,
    competenceGain: 25,
    status: "completed",
  },
  {
    id: "2", 
    name: "Technical Analysis Mastery",
    progress: 60,
    modules: 10,
    completed: 6,
    competenceGain: 20,
    status: "in_progress",
  },
  {
    id: "3",
    name: "DeFi Deep Dive",
    progress: 30,
    modules: 12,
    completed: 4,
    competenceGain: 15,
    status: "in_progress",
  },
  {
    id: "4",
    name: "Indonesian Stock Market",
    progress: 0,
    modules: 6,
    completed: 0,
    competenceGain: 30,
    status: "not_started",
  },
];

export default function LearningPath() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Path</h1>
          <p className="text-muted-foreground">Expand your circle of competence through structured learning</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Competence Gained</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+45%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Learning Hours</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">48h</div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Paths */}
        <div className="space-y-4">
          {learningPaths.map((path) => (
            <Card key={path.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{path.name}</CardTitle>
                    <CardDescription>
                      {path.completed}/{path.modules} modules • +{path.competenceGain}% competence
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      path.status === "completed" ? "default" :
                      path.status === "in_progress" ? "secondary" : "outline"
                    }>
                      {path.status === "completed" ? "Completed" :
                       path.status === "in_progress" ? "In Progress" : "Not Started"}
                    </Badge>
                    <Button size="sm" variant={path.status === "not_started" ? "default" : "outline"}>
                      <Play className="h-4 w-4 mr-1" />
                      {path.status === "not_started" ? "Start" : "Continue"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={path.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{path.progress}% complete</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
