/**
 * YouTube Transcript Guide - Step-by-step visual instructions
 * for copying transcript from YouTube videos
 */
import { useState } from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Youtube, 
  MoreHorizontal, 
  FileText, 
  Copy, 
  CheckCircle,
  ChevronRight,
  MonitorPlay,
  MousePointer,
  ClipboardCopy,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
}

function Step({ number, title, description, icon, tip }: StepProps) {
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-medium">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {tip && (
          <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 p-2 rounded">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{tip}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function YouTubeTranscriptGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="guide" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>How to get transcript from YouTube</span>
            <Badge variant="secondary" className="text-xs">Guide</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            {/* Introduction */}
            <p className="text-sm text-muted-foreground">
              Follow these steps to copy the transcript from any YouTube video that has captions available:
            </p>

            {/* Steps */}
            <div className="space-y-3">
              <Step
                number={1}
                title="Open the YouTube video"
                description="Go to YouTube and open the trading strategy video you want to import."
                icon={<Youtube className="h-4 w-4 text-red-500" />}
              />

              <Step
                number={2}
                title="Click the three dots menu (...)"
                description="Below the video player, next to Share and Save buttons, click the three horizontal dots (•••) menu."
                icon={<MoreHorizontal className="h-4 w-4" />}
                tip="If you don't see the menu, make sure you're on the main video page, not in a playlist or embed."
              />

              <Step
                number={3}
                title='Select "Show transcript"'
                description='From the dropdown menu, click on "Show transcript". This will open a panel on the right side of the video.'
                icon={<FileText className="h-4 w-4 text-primary" />}
                tip="If this option is missing, the video doesn't have captions available."
              />

              <Step
                number={4}
                title="Select all transcript text"
                description="Click inside the transcript panel and press Ctrl+A (Windows) or Cmd+A (Mac) to select all the text."
                icon={<MousePointer className="h-4 w-4 text-blue-400" />}
              />

              <Step
                number={5}
                title="Copy the transcript"
                description="Press Ctrl+C (Windows) or Cmd+C (Mac) to copy the selected transcript to your clipboard."
                icon={<ClipboardCopy className="h-4 w-4 text-green-400" />}
              />

              <Step
                number={6}
                title="Paste in the text area above"
                description='Switch to the "Paste Transcript" tab above and paste the copied text using Ctrl+V (Windows) or Cmd+V (Mac).'
                icon={<CheckCircle className="h-4 w-4 text-profit" />}
              />
            </div>

            {/* Pro Tips */}
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <MonitorPlay className="h-4 w-4 text-primary" />
                Pro Tips
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>For best results, include the complete transcript - the AI uses context to understand the strategy better.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Timestamps in the transcript are fine - the AI will ignore them automatically.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>If the video is in a language other than English, the AI can still extract the strategy concepts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Longer, more detailed strategy videos typically yield better extraction results.</span>
                </li>
              </ul>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
