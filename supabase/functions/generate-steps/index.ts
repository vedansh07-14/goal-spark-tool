import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dream, domain } = await req.json();
    console.log('Generating steps for dream:', dream, 'in domain:', domain);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
    }

    const systemPrompt = `You are an expert goal-planning assistant that breaks down ambitious dreams into actionable, realistic steps. 
Your task is to analyze the user's dream and create a clear, step-by-step roadmap to achieve it.

For ${domain} goals:
${domain === 'startup' ? '- Focus on business fundamentals, product development, user acquisition, and scaling' : ''}
${domain === 'personal' ? '- Focus on skill development, habit formation, resource gathering, and personal growth' : ''}
${domain === 'academic' ? '- Focus on learning pathways, research methods, knowledge building, and academic milestones' : ''}

Return EXACTLY 5-7 actionable steps in JSON format. Each step should be:
- Specific and actionable
- Realistic and achievable
- Ordered from foundational to advanced
- Clear about what success looks like`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Break down this dream into actionable steps: "${dream}"` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_action_steps',
              description: 'Create a structured list of actionable steps to achieve a dream',
              parameters: {
                type: 'object',
                properties: {
                  steps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Short, action-oriented title' },
                        description: { type: 'string', description: 'Detailed explanation of what to do and why' }
                      },
                      required: ['title', 'description'],
                      additionalProperties: false
                    },
                    minItems: 5,
                    maxItems: 7
                  }
                },
                required: ['steps'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_action_steps' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits depleted. Please add credits to continue.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const stepsData = JSON.parse(toolCall.function.arguments);
    console.log('Generated steps:', stepsData);

    return new Response(
      JSON.stringify({ steps: stepsData.steps }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-steps function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
