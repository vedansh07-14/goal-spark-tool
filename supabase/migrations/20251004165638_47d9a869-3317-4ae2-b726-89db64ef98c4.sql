-- Create dreams table to store user's big ambitions
CREATE TABLE public.dreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('startup', 'personal', 'academic')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create steps table to store actionable steps for each dream
CREATE TABLE public.steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dreams table
CREATE POLICY "Users can view their own dreams" 
ON public.dreams 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dreams" 
ON public.dreams 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dreams" 
ON public.dreams 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dreams" 
ON public.dreams 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for steps table
CREATE POLICY "Users can view steps for their dreams" 
ON public.steps 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dreams 
  WHERE dreams.id = steps.dream_id 
  AND dreams.user_id = auth.uid()
));

CREATE POLICY "Users can create steps for their dreams" 
ON public.steps 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dreams 
  WHERE dreams.id = steps.dream_id 
  AND dreams.user_id = auth.uid()
));

CREATE POLICY "Users can update steps for their dreams" 
ON public.steps 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.dreams 
  WHERE dreams.id = steps.dream_id 
  AND dreams.user_id = auth.uid()
));

CREATE POLICY "Users can delete steps for their dreams" 
ON public.steps 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.dreams 
  WHERE dreams.id = steps.dream_id 
  AND dreams.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_dreams_updated_at
BEFORE UPDATE ON public.dreams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_steps_updated_at
BEFORE UPDATE ON public.steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();