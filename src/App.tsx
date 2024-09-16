import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, Step, setApiKey, setLLM, setCustomBaseUrl as setApiCustomBaseUrl, setCustomModel, createNewChat } from './api';
import './App.css';

// Define interfaces for type checking
interface Message {
  id: number;
  role: string;
  content: string;
  steps?: Step[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

interface ApiKeys {
  openai: string;
  groq: string;
  gemini: string;
  custom: string;
}

interface CustomModels {
  openai: string;
  groq: string;
  gemini: string;
  custom: string;
}

const App: React.FC = () => {
  // State variables
  const [input, setInput] = useState('');
  const [chats, setChats] = useState<Chat[]>(() => {
    const defaultChatId = createNewChat();
    return [{
      id: defaultChatId,
      title: 'Welcome Chat',
      messages: [
        {
          id: Date.now(),
          role: 'assistant',
          content: 'Welcome! How can I assist you today?'
        }
      ]
    }];
  });
  const [currentChatId, setCurrentChatId] = useState<string>(() => chats[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    groq: '',
    gemini: '',
    custom: '',
  });
  const [customModels, setCustomModels] = useState<CustomModels>({
    openai: 'gpt-4o',
    groq: 'mixtral-8x7b-32768',
    gemini: 'gemini-1.5-flash',
    custom: 'antropic-vertex',
  });
  const [selectedLLM, setSelectedLLM] = useState('openai');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chats]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentChatId) return;

    // Add user message to chat
    const newUserMessage: Message = { id: Date.now(), role: 'user', content: input };
    setChats(prevChats => prevChats.map(chat => 
      chat.id === currentChatId 
        ? { ...chat, messages: [...chat.messages, newUserMessage] }
        : chat
    ));
    setInput('');
    setIsLoading(true);

    try {
      // Add assistant message placeholder
      const assistantMessageId = Date.now() + 1;
      setChats(prevChats => prevChats.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, { id: assistantMessageId, role: 'assistant', content: '', steps: [] }] }
          : chat
      ));

      // Send message to API and update assistant message with response
      await sendMessage(currentChatId, input, (step: Step) => {
        setChats((prevChats) => {
          return prevChats.map(chat => {
            if (chat.id === currentChatId) {
              const updatedMessages = [...chat.messages];
              const assistantMessageIndex = updatedMessages.findIndex(msg => msg.id === assistantMessageId);
              if (assistantMessageIndex !== -1) {
                updatedMessages[assistantMessageIndex] = {
                  ...updatedMessages[assistantMessageIndex],
                  content: step.content,
                  steps: [...(updatedMessages[assistantMessageIndex].steps || []), step]
                };
              }
              return { ...chat, messages: updatedMessages };
            }
            return chat;
          });
        });
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Select a chat
  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  // Save configuration
  const handleConfigSave = () => {
    setApiKey(selectedLLM, apiKeys[selectedLLM as keyof ApiKeys]);
    setCustomModel(selectedLLM, customModels[selectedLLM as keyof CustomModels]);
    setLLM(selectedLLM);
    if (selectedLLM === 'custom') {
      if (customBaseUrl.trim() !== '') {
        setApiCustomBaseUrl(customBaseUrl);
      } else {
        alert('Please provide a valid custom base URL.');
        return;
      }
    }
    setShowConfig(false);
  };

  // Create a new chat
  const handleNewChat = () => {
    const newChatId = createNewChat();
    const newChatNumber = chats.length + 1;
    const newChat: Chat = {
      id: newChatId,
      title: `Chat ${newChatNumber}`,
      messages: [
        {
          id: Date.now(),
          role: 'assistant',
          content: 'How can I help you with this new chat?'
        }
      ]
    };
    setChats(prevChats => [...prevChats, newChat]);
    setCurrentChatId(newChatId);
  };

  // Remove a chat
  const handleRemoveChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking the remove button
    if (chats.length === 1) {
      alert("You can't remove the last chat. Create a new chat first.");
      return;
    }
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats[remainingChats.length - 1].id);
    }
  };

  const currentChat = chats.find(chat => chat.id === currentChatId);

  // Render configuration fields
  const renderConfigFields = () => {
    return (
      <div className="provider-config">
        <label>
          API Key:
          <input
            type="password"
            value={apiKeys[selectedLLM as keyof ApiKeys]}
            onChange={(e) => setApiKeys({ ...apiKeys, [selectedLLM]: e.target.value })}
            placeholder={`Enter ${selectedLLM.toUpperCase()} API Key`}
          />
        </label>
        <label>
          Model:
          <input
            type="text"
            value={customModels[selectedLLM as keyof CustomModels]}
            onChange={(e) => setCustomModels({ ...customModels, [selectedLLM]: e.target.value })}
            placeholder={`e.g., ${customModels[selectedLLM as keyof CustomModels]}`}
          />
        </label>
        {selectedLLM === 'custom' && (
          <label>
            Custom Base URL:
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder="https://your-custom-api-url.com"
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="chat-app">
      {/* Chat sidebar */}
      <div className="chat-sidebar">
        <h2>Chat History</h2>
        <button onClick={handleNewChat}>New Chat</button>
        <ul>
          {chats.map((chat) => (
            <li
              key={chat.id}
              onClick={() => handleChatSelect(chat.id)}
              className={currentChatId === chat.id ? 'selected' : ''}
            >
              <span className="chat-title">{chat.title}</span>
              <button 
                className="remove-chat-btn"
                onClick={(e) => handleRemoveChat(chat.id, e)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
        <button className="config-button" onClick={() => setShowConfig(true)}>Config</button>
      </div>
      {/* Main chat area */}
      <div className="chat-main">
        {currentChat && (
          <>
            {/* Chat messages */}
            <div className="chat-messages">
              {currentChat.messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You: ' : 'Assistant: '}</strong>
                  {message.content}
                  {message.role === 'assistant' && message.steps && message.steps.length > 0 && (
                    <div className="reasoning-steps">
                      <h4>Reasoning Steps:</h4>
                      {message.steps.map((step, index) => (
                        <details key={index} open={index === message.steps!.length - 1}>
                          <summary>{step.title}</summary>
                          <p>{step.content}</p>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="message assistant">
                  <div className="loading-indicator">Thinking...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Chat input form */}
            <form onSubmit={handleSubmit} className="chat-input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="chat-input"
                disabled={isLoading}
              />
              <button type="submit" className="chat-submit" disabled={isLoading}>
                Send
              </button>
            </form>
          </>
        )}
      </div>
      {/* Configuration modal */}
      {showConfig && (
        <div className="config-modal">
          <div className="config-content">
            <h2>Configuration</h2>
            <label>
              Select LLM:
              <select value={selectedLLM} onChange={(e) => setSelectedLLM(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {renderConfigFields()}
            <div className="config-actions">
              <button onClick={handleConfigSave}>Save</button>
              <button onClick={() => setShowConfig(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
