import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Rocket, GraduationCap, Heart } from "lucide-react";

interface DreamFormProps {
  onDreamCreated: () => void;
}

export const DreamForm = ({ onDreamCreated }: DreamFormProps) => {
  const [dream, setDream] = useState("");
  const [domain, setDomain] = useState<"startup" | "personal" | "academic">("startup");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dream.trim()) {
      toast.error("Please describe your dream");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log('Calling generate-steps function...');
      const { data: stepsData, error: functionError } = await supabase.functions.invoke('generate-steps', {
        body: { dream, domain }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw functionError;
      }

      console.log('Steps generated:', stepsData);

      const { data: dreamData, error: dreamError } = await supabase
        .from('dreams')
        .insert({ 
          title: dream.slice(0, 100),
          description: dream,
          domain,
          user_id: user.id
        })
        .select()
        .single();

      if (dreamError) throw dreamError;

      const stepsToInsert = stepsData.steps.map((step: any, index: number) => ({
        dream_id: dreamData.id,
        title: step.title,
        description: step.description,
        order_index: index,
        completed: false
      }));

      const { error: stepsError } = await supabase
        .from('steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      toast.success("Dream created with actionable steps!");
      setDream("");
      onDreamCreated();
    } catch (error: any) {
      console.error('Error creating dream:', error);
      toast.error(error.message || "Failed to create dream");
    } finally {
      setLoading(false);
    }
  };

  const domainIcons = {
    startup: Rocket,
    personal: Heart,
    academic: GraduationCap
  };

  const DomainIcon = domainIcons[domain];

  return (
    <Card className="p-8 backdrop-blur-xl bg-card/50 border-primary/20 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            What's your dream?
          </h2>
          <p className="text-muted-foreground">
            Describe your big, ambitious goal. Don't worry about the details—we'll break it down for you.
          </p>
        </div>

        <div className="space-y-4">
          <Select value={domain} onValueChange={(value: any) => setDomain(value)}>
            <SelectTrigger className="bg-background/50 border-primary/20">
              <div className="flex items-center gap-2">
                <DomainIcon className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startup">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  Startup Goal
                </div>
              </SelectItem>
              <SelectItem value="personal">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Personal Goal
                </div>
              </SelectItem>
              <SelectItem value="academic">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Academic Goal
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder='e.g., "I want to build the next Google" or "I want to become fluent in 5 languages"'
            className="min-h-[120px] bg-background/50 border-primary/20 focus:border-primary resize-none"
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90 transition-all transform hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Creating your roadmap...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Action Plan
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};
