/**
 * TradeReviewSection - Lesson learned + Rule compliance for enrichment drawer
 */
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, ClipboardCheck } from "lucide-react";

const DEFAULT_RULES = [
  { id: "followed_plan", label: "Followed trading plan" },
  { id: "proper_sl", label: "Proper stop loss placed" },
  { id: "correct_sizing", label: "Correct position sizing" },
  { id: "waited_confirmation", label: "Waited for confirmation" },
  { id: "no_revenge", label: "No revenge trading" },
  { id: "managed_emotions", label: "Managed emotions well" },
];

export interface RuleCompliance {
  [ruleId: string]: boolean;
}

interface TradeReviewSectionProps {
  lessonLearned: string;
  ruleCompliance: RuleCompliance;
  onLessonChange: (v: string) => void;
  onRuleToggle: (ruleId: string) => void;
}

export function TradeReviewSection({
  lessonLearned,
  ruleCompliance,
  onLessonChange,
  onRuleToggle,
}: TradeReviewSectionProps) {
  return (
    <div className="space-y-4">
      {/* Rule Compliance */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Rule Compliance
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {DEFAULT_RULES.map((rule) => (
            <label
              key={rule.id}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={!!ruleCompliance[rule.id]}
                onCheckedChange={() => onRuleToggle(rule.id)}
              />
              <span>{rule.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Lesson Learned */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Lesson Learned
        </Label>
        <Textarea
          placeholder="What's the key takeaway from this trade?"
          value={lessonLearned}
          onChange={(e) => onLessonChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
