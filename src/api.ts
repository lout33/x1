import axios from 'axios';

// Current LLM provider
let currentLLM = 'openai';

// API keys for different providers
let apiKeys = {
  openai: '',
  groq: '',
  gemini: '',
  custom: ''
};

// Custom base URL for custom LLM provider
let customBaseUrl = '';

// Default models for each provider
let customModels = {
  openai: 'gpt-3.5-turbo',
  groq: 'mixtral-8x7b-32768',
  gemini: 'gemini-pro',
  custom: 'gpt-3.5-turbo'
};

// Store chat histories
let chatHistories: { [chatId: string]: { role: string; content: string }[] } = {};

/**
 * Set the current LLM provider
 * @param llm - The LLM provider to set
 */
export const setLLM = (llm: string) => {
  if (['openai', 'groq', 'gemini', 'custom'].includes(llm)) {
    currentLLM = llm;
  } else {
    throw new Error('Invalid LLM specified');
  }
};

/**
 * Set the API key for a specific provider
 * @param provider - The provider to set the API key for
 * @param key - The API key
 */
export const setApiKey = (provider: string, key: string) => {
  if (provider in apiKeys) {
    apiKeys[provider as keyof typeof apiKeys] = key;
  } else {
    throw new Error('Invalid provider specified');
  }
};

/**
 * Set the custom base URL for the custom LLM provider
 * @param url - The custom base URL
 */
export const setCustomBaseUrl = (url: string) => {
  customBaseUrl = url;
};

/**
 * Set the custom model for a specific provider
 * @param provider - The provider to set the custom model for
 * @param model - The custom model name
 */
export const setCustomModel = (provider: string, model: string) => {
  if (provider in customModels) {
    customModels[provider as keyof typeof customModels] = model;
  } else {
    throw new Error('Invalid provider specified');
  }
};

// Interface for a reasoning step
export interface Step {
  title: string;
  content: string;
  next_action: 'continue' | 'final_answer';
}

/**
 * Get the API URL for the current LLM provider
 * @returns The API URL
 */
const getApiUrl = () => {
  switch (currentLLM) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${customModels.gemini}:generateContent?key=${apiKeys.gemini}`;
    case 'custom':
      return `${customBaseUrl}/v1/chat/completions`;
    default:
      throw new Error('Invalid LLM specified');
  }
};

/**
 * Get the headers for the API request
 * @returns The headers object
 */
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (currentLLM !== 'gemini') {
    headers['Authorization'] = `Bearer ${apiKeys[currentLLM as keyof typeof apiKeys]}`;
  }

  return headers;
};

/**
 * Get the model name for the current LLM provider
 * @returns The model name
 */
const getModelName = () => {
  return customModels[currentLLM as keyof typeof customModels];
};

/**
 * Sanitize a JSON string by escaping control characters and fixing common issues
 * @param str - The string to sanitize
 * @returns The sanitized string
 */
const sanitizeJSONString = (str: string): string => {
  // Replace any backslash followed by 'n' with an actual newline character
  str = str.replace(/\\n/g, '\n');
  
  // Escape any unescaped control characters
  str = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });

  // Replace single quotes with double quotes for property names
  str = str.replace(/'([^']+)':/g, '"$1":');

  // Ensure all string values are enclosed in double quotes
  str = str.replace(/:\s*'([^']*)'/g, ': "$1"');

  return str;
};

/**
 * Extract JSON objects from a string
 * @param str - The string containing JSON objects
 * @returns An array of Step objects
 */
const extractJSONFromString = (str: string): Step[] => {
  const jsonRegex = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;
  const matches = str.match(jsonRegex);
  
  if (!matches) {
    console.warn('No valid JSON found in the response:', str);
    return [];
  }

  return matches.map(jsonStr => {
    try {
      const sanitizedStr = sanitizeJSONString(jsonStr);
      const parsed = JSON.parse(sanitizedStr) as Step;
      
      // Validate the parsed object
      if (!parsed.title || !parsed.content || !parsed.next_action) {
        console.warn('Parsed JSON is missing required fields:', parsed);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing JSON:', error, 'Original string:', jsonStr);
      return null;
    }
  }).filter((step): step is Step => step !== null);
};

/**
 * Create a new chat
 * @returns The new chat ID
 */
export const createNewChat = (): string => {
  const chatId = Date.now().toString(); // Use timestamp as a simple unique identifier
  chatHistories[chatId] = []; // Initialize an empty history for the new chat
  return chatId;
};

/**
 * Send a message to the LLM and process the response
 * @param chatId - The ID of the chat
 * @param message - The user's message
 * @param onStepGenerated - Callback function for each generated step
 */
export const sendMessage = async (
  chatId: string,
  message: string,
  onStepGenerated: (step: Step) => void
): Promise<void> => {
  const systemMessage = `You are an expert AI assistant that explains your reasoning step by step. For each step, provide a title that describes what you're doing in that step, along with the content. Decide if you need another step or if you're ready to give the final answer. Respond with one or more JSON objects, each representing a step. Each JSON object should have 'title', 'content', and 'next_action' (either 'continue' or 'final_answer') keys. USE AS MANY REASONING STEPS AS POSSIBLE. AT LEAST 3. BE AWARE OF YOUR LIMITATIONS AS AN LLM AND WHAT YOU CAN AND CANNOT DO. IN YOUR REASONING, INCLUDE EXPLORATION OF ALTERNATIVE ANSWERS. CONSIDER YOU MAY BE WRONG, AND IF YOU ARE WRONG IN YOUR REASONING, WHERE IT WOULD BE. FULLY TEST ALL OTHER POSSIBILITIES. YOU CAN BE WRONG. WHEN YOU SAY YOU ARE RE-EXAMINING, ACTUALLY RE-EXAMINE, AND USE ANOTHER APPROACH TO DO SO. DO NOT JUST SAY YOU ARE RE-EXAMINING. USE AT LEAST 3 METHODS TO DERIVE THE ANSWER. USE BEST PRACTICES.
  
  Example of a valid response:
  {"title": "Identifying Key Information","content": "To begin solving this problem, we need to carefully examine the given information and identify the crucial elements that will guide our solution process. This involves...","next_action": "continue"}
  {"title": "Analyzing Possible Approaches","content": "Now that we have identified the key information, let's consider different approaches to solve this problem...","next_action": "continue"}
  `;

  if (!chatHistories[chatId]) {
    chatHistories[chatId] = [];
  }

  let messages = [
    { role: 'system', content: systemMessage },
    ...chatHistories[chatId],
    { role: 'user', content: message },
  ];

  while (true) {
    try {
      const apiUrl = getApiUrl();
      const headers = getHeaders();
      const modelName = getModelName();

      let requestBody: any;

      if (currentLLM === 'gemini') {
        requestBody = {
          contents: [{ parts: messages.map(msg => ({ text: `${msg.role}: ${msg.content}` })) }],
          generationConfig: { maxOutputTokens: 300 }
        };
      } else {
        requestBody = {
          model: modelName,
          messages,
          temperature: 0.2,
          max_tokens: 300,
        };
      }

      const response = await axios.post(apiUrl, requestBody, { headers });

      let stepContent: string;
      if (currentLLM === 'gemini') {
        stepContent = response.data.candidates[0].content.parts[0].text;
      } else {
        stepContent = response.data.choices[0].message.content;
      }

      const steps = extractJSONFromString(stepContent);
      
      for (const step of steps) {
        onStepGenerated(step);
        const stepMessage = { role: 'assistant', content: JSON.stringify(step) };
        messages.push(stepMessage);
        chatHistories[chatId].push(stepMessage);

        if (step.next_action === 'final_answer') {
          return; // End the function if we reach a final answer
        }
      }

      if (steps.length === 0) {
        console.warn('No valid steps extracted from response:', stepContent);
        // You might want to add some fallback behavior here
      }

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};