import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, Step } from './api';
import './App.css';

interface Message {
  id: number;
  role: string;
  content: string;
  steps?: Step[];
}

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newUserMessage: Message = { id: Date.now(), role: 'user', content: input };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantMessageId = Date.now() + 1;
      setMessages(prevMessages => [
        ...prevMessages,
        { id: assistantMessageId, role: 'assistant', content: '', steps: [] }
      ]);

      await sendMessage(input, (step: Step) => {
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const assistantMessageIndex = updatedMessages.findIndex(msg => msg.id === assistantMessageId);
          if (assistantMessageIndex !== -1) {
            updatedMessages[assistantMessageIndex] = {
              ...updatedMessages[assistantMessageIndex],
              content: step.content,
              steps: [...(updatedMessages[assistantMessageIndex].steps || []), step]
            };
          }
          return updatedMessages;
        });
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSelect = (id: number) => {
    setSelectedChat(id);
  };

  const filteredMessages = selectedChat
    ? messages.filter((message) => message.id === selectedChat || message.id === selectedChat + 1)
    : messages;

  return (
    <div className="chat-app">
      <div className="chat-sidebar">
        <h2>Chat History</h2>
        <ul>
          {messages
            .filter((message) => message.role === 'user')
            .map((message) => (
              <li
                key={message.id}
                onClick={() => handleChatSelect(message.id)}
                className={selectedChat === message.id ? 'selected' : ''}
              >
                {message.content.slice(0, 30)}...
              </li>
            ))}
        </ul>
      </div>
      <div className="chat-main">
        <div className="chat-messages">
          {filteredMessages.map((message) => (
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
      </div>
    </div>
  );
};

export default App;
