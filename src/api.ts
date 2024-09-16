import axios from 'axios';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const API_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with your actual API key

export interface Step {
  title: string;
  content: string;
  next_action: 'continue' | 'final_answer';
}

export const sendMessage = async (
  message: string,
  onStepGenerated: (step: Step) => void
): Promise<void> => {
  const systemMessage = `You are an expert AI assistant that explains your reasoning step by step. For each step, provide a title that describes what you're doing in that step, along with the content. Decide if you need another step or if you're ready to give the final answer. Respond in JSON format with 'title', 'content', and 'next_action' (either 'continue' or 'final_answer') keys. USE AS MANY REASONING STEPS AS POSSIBLE. AT LEAST 3. BE AWARE OF YOUR LIMITATIONS AS AN LLM AND WHAT YOU CAN AND CANNOT DO. IN YOUR REASONING, INCLUDE EXPLORATION OF ALTERNATIVE ANSWERS. CONSIDER YOU MAY BE WRONG, AND IF YOU ARE WRONG IN YOUR REASONING, WHERE IT WOULD BE. FULLY TEST ALL OTHER POSSIBILITIES. YOU CAN BE WRONG. WHEN YOU SAY YOU ARE RE-EXAMINING, ACTUALLY RE-EXAMINE, AND USE ANOTHER APPROACH TO DO SO. DO NOT JUST SAY YOU ARE RE-EXAMINING. USE AT LEAST 3 METHODS TO DERIVE THE ANSWER. USE BEST PRACTICES.`;

  let messages = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: message },
  ];

  while (true) {
    try {
      const response = await axios.post(
        API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.2,
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
        }
      );

      const step: Step = JSON.parse(response.data.choices[0].message.content);
      onStepGenerated(step);
      messages.push({ role: 'assistant', content: JSON.stringify(step) });

      if (step.next_action === 'final_answer') {
        break;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Generate final answer
  messages.push({ role: 'user', content: 'Please provide the final answer based on your reasoning above.' });
  
  try {
    const finalResponse = await axios.post(
      API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.2,
        max_tokens: 200,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );

    const finalStep: Step = JSON.parse(finalResponse.data.choices[0].message.content);
    finalStep.next_action = 'final_answer';
    onStepGenerated(finalStep);
  } catch (error) {
    console.error('Error generating final answer:', error);
    throw error;
  }
};