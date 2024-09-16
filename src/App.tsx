import React, { useState } from 'react';
import { sendMessage } from './api';
import './App.css';

interface Message {
  id: number;
  role: string;
  content: string;
}

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = { id: Date.now(), role: 'user', content: input };
    setMessages([...messages, newMessage]);
    setInput('');

    try {
      const response = await sendMessage(input);
      const assistantMessage: Message = { id: Date.now(), role: 'assistant', content: response };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleChatSelect = (id: number) => {
    setSelectedChat(id);
  };

  const filteredMessages = selectedChat
    ? messages.filter((message) => message.id === selectedChat)
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
              {message.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
          />
          <button type="submit" className="chat-submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default App;
