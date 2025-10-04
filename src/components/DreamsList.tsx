import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, Rocket, Heart, GraduationCap, CheckCircle2 } from "lucide-react";

interface Dream {
  id: string;
  title: string;
  description: string;
  domain: string;
  created_at: string;
}

interface Step {
  id: string;
  dream_id: string;
  title: string;
  description: string;
  order_index: number;
  completed: boolean;
}

export const DreamsList = ({ refresh }: { refresh: number }) => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [steps, setSteps] = useState<{ [key: string]: Step[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDreams();
  }, [refresh]);

  const loadDreams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dreamsData, error: dreamsError } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dreamsError) throw dreamsError;

      const { data: stepsData, error: stepsError } = await supabase
        .from('steps')
        .select('*')
        .in('dream_id', dreamsData?.map(d => d.id) || [])
        .order('order_index', { ascending: true });

      if (stepsError) throw stepsError;

      setDreams(dreamsData || []);
      
      const stepsMap: { [key: string]: Step[] } = {};
      stepsData?.forEach(step => {
        if (!stepsMap[step.dream_id]) {
          stepsMap[step.dream_id] = [];
        }
        stepsMap[step.dream_id].push(step);
      });
      setSteps(stepsMap);
    } catch (error: any) {
      console.error('Error loading dreams:', error);
      toast.error("Failed to load dreams");
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = async (stepId: string, dreamId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('steps')
        .update({ completed: !currentState })
        .eq('id', stepId);

      if (error) throw error;

      setSteps(prev => ({
        ...prev,
        [dreamId]: prev[dreamId].map(s => 
          s.id === stepId ? { ...s, completed: !currentState } : s
        )
      }));

      toast.success(currentState ? "Step unchecked" : "Step completed! 🎉");
    } catch (error: any) {
      toast.error("Failed to update step");
    }
  };

  const deleteDream = async (dreamId: string) => {
    try {
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId);

      if (error) throw error;

      setDreams(prev => prev.filter(d => d.id !== dreamId));
      toast.success("Dream deleted");
    } catch (error: any) {
      toast.error("Failed to delete dream");
    }
  };

  const domainIcons = {
    startup: Rocket,
    personal: Heart,
    academic: GraduationCap
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading your dreams...</div>;
  }

  if (dreams.length === 0) {
    return (
      <Card className="p-12 text-center backdrop-blur-xl bg-card/50 border-primary/20">
        <div className="space-y-4">
          <div className="text-6xl">✨</div>
          <h3 className="text-2xl font-bold">No dreams yet</h3>
          <p className="text-muted-foreground">Start by creating your first dream above!</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {dreams.map(dream => {
        const DomainIcon = domainIcons[dream.domain as keyof typeof domainIcons];
        const dreamSteps = steps[dream.id] || [];
        const completedSteps = dreamSteps.filter(s => s.completed).length;
        const progress = dreamSteps.length > 0 ? (completedSteps / dreamSteps.length) * 100 : 0;

        return (
          <Card key={dream.id} className="p-6 backdrop-blur-xl bg-card/50 border-primary/20 hover:border-primary/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                    <DomainIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{dream.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{dream.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{completedSteps} of {dreamSteps.length} steps completed</span>
                      <span className="text-primary">({Math.round(progress)}%)</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDream(dream.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {dreamSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-all"
                  >
                    <Checkbox
                      checked={step.completed}
                      onCheckedChange={() => toggleStep(step.id, dream.id, step.completed)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">Step {index + 1}</span>
                        <h4 className={`font-medium ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {step.title}
                        </h4>
                      </div>
                      <p className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
