import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';

function ChatMessage({ message, isConsecutive }) {
  // Enhanced null check to catch both null and undefined messages
  // Also check for required properties before any property access
  if (!message || typeof message !== 'object') {
    console.warn('Invalid message object received:', message);
    return null;
  }

  // Additional validation for required properties
  if (!message.type || !message.text || !message.timestamp) {
    console.warn('Message object missing required properties:', message);
    return null;
  }
  
  // Only access message.type after validation
  const isCustomer = message.type === 'customer';
  
  return (
    <div className={clsx(
      'flex gap-3',
      isCustomer ? 'justify-start' : 'justify-end',
      isConsecutive ? 'mt-1' : 'mt-4'
    )}>
      <div className={clsx(
        'max-w-[70%] rounded-2xl px-4 py-2',
        isCustomer 
          ? 'bg-gray-100 dark:bg-dark-hover' 
          : 'bg-primary text-white'
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p className={clsx(
          'text-xs mt-1',
          isCustomer ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'
        )}>
          {format(new Date(message.timestamp), 'HH:mm')}
        </p>
      </div>
    </div>
  );
}

export function ChatView({ conversation, onSendMessage }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  // Add safety check for conversation and messages
  if (!conversation || !Array.isArray(conversation.messages)) {
    console.warn('Invalid conversation object:', conversation);
    return null;
  }

  // Enhanced validation for messages array
  const validMessages = (conversation.messages || []).filter(msg => 
    msg && 
    typeof msg === 'object' && 
    typeof msg.type === 'string' && 
    typeof msg.text === 'string' && 
    msg.timestamp
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <img
            src={conversation.customer?.avatar || '/default-avatar.png'}
            alt={conversation.customer?.name || 'Customer'}
            className="w-10 h-10 rounded-full"
          />
          <span className={clsx(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-card',
            conversation.customer?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
          )} />
        </div>
        <div>
          <h2 className="text-base font-medium text-gray-900 dark:text-white">
            {conversation.customer?.name || 'Unknown Customer'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {conversation.customer?.status === 'online' ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {validMessages.map((message, index) => {
          const previousMessage = index > 0 ? validMessages[index - 1] : null;
          const isConsecutive = previousMessage && 
            previousMessage.type === message.type &&
            new Date(message.timestamp).getTime() - 
            new Date(previousMessage.timestamp).getTime() < 300000;

          return (
            <ChatMessage
              key={message.id || index}
              message={message}
              isConsecutive={isConsecutive}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary-light disabled:opacity-50 disabled:hover:bg-primary text-white font-medium rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </>
  );
}