'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface Message {
	text: string;
	isUser: boolean;
}

interface AIChatPopupProps {
	isOpen: boolean;
	onClose: () => void;
	anchorEl: HTMLElement | null;
}

export const AIChatPopup: React.FC<AIChatPopupProps> = ({
	isOpen,
	onClose,
	anchorEl,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputText, setInputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Load chat history from localStorage on component mount
	useEffect(() => {
		const savedMessages = localStorage.getItem('exchron-chat-history');
		if (savedMessages) {
			try {
				setMessages(JSON.parse(savedMessages));
			} catch (error) {
				console.error('Failed to load chat history:', error);
			}
		} else {
			// Add welcome message if no chat history exists
			setMessages([{
				text: "Hi! I'm your AI assistant for the Exchron dashboard. I can help you with questions about the application features, UI components, routing, and more. How can I assist you today?",
				isUser: false
			}]);
		}
	}, []);

	// Save messages to localStorage whenever messages change (excluding welcome message)
	useEffect(() => {
		if (messages.length > 1 || (messages.length === 1 && messages[0].isUser)) {
			localStorage.setItem('exchron-chat-history', JSON.stringify(messages));
		}
	}, [messages]);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);

	const [position, setPosition] = useState({ top: 0, left: 0 });

	useEffect(() => {
		if (anchorEl) {
			const rect = anchorEl.getBoundingClientRect();
			const popupWidth = popupRef.current ? popupRef.current.offsetWidth : 320;
			setPosition({
				top: rect.bottom + window.scrollY + 10,
				left: rect.right + window.scrollX - popupWidth,
			});
		}
	}, [anchorEl]);

	// Scroll to bottom when new messages arrive
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isLoading]);

	// Close popup when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				popupRef.current &&
				!popupRef.current.contains(event.target as Node) &&
				anchorEl &&
				!anchorEl.contains(event.target as Node)
			) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen, onClose, anchorEl]);

	const sendMessage = async () => {
		if (!inputText.trim()) return;

		const userMessage: Message = {
			text: inputText.trim(),
			isUser: true,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputText('');
		setIsLoading(true);

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: userMessage.text }),
			});

			if (!response.ok) {
				throw new Error('API request failed');
			}

			const data = await response.json();

			setMessages((prev) => [
				...prev,
				{
					text: data.response,
					isUser: false,
				},
			]);
		} catch (error) {
			console.error('Failed to get AI response:', error);
			setMessages((prev) => [
				...prev,
				{
					text: 'Sorry, I encountered an error. Please try again.',
					isUser: false,
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			ref={popupRef}
			className="fixed bg-white rounded-lg shadow-2xl w-[420px] h-[550px] flex flex-col border border-gray-200"
			style={{
				top: `${position.top}px`,
				left: `${position.left}px`,
				zIndex: 1000,
			}}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 relative">
						<Image
							src="/ai-assistant.svg"
							alt="AI Assistant"
							fill
							className="p-1"
						/>
					</div>
					<span className="font-semibold text-gray-800">Exchron-AI-Assist</span>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => {
							setMessages([]);
							localStorage.removeItem('exchron-chat-history');
						}}
						className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200"
						aria-label="Clear chat history"
						title="Clear chat history"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200"
						aria-label="Close chat"
					>
						<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clipRule="evenodd"
						/>
						</svg>
					</button>
				</div>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
				{messages.map((msg, idx) => (
					<div
						key={idx}
						className={`flex items-end gap-2 ${
							msg.isUser ? 'justify-end' : 'justify-start'
						}`}
					>
						<div
							className={`max-w-[80%] rounded-lg p-3 text-sm ${
								msg.isUser
									? 'bg-black text-white rounded-br-none'
									: 'bg-white text-black rounded-bl-none border border-gray-200'
							}`}
						>
							<p>{msg.text}</p>
						</div>
					</div>
				))}
				{isLoading && (
					<div className="flex justify-start">
						<div className="bg-white rounded-lg p-3 rounded-bl-none border border-gray-200">
							<div className="flex space-x-1">
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '0ms' }}
								/>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '150ms' }}
								/>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '300ms' }}
								/>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg">
				<div className="flex gap-2">
					<input
						type="text"
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="Ask me anything..."
						className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:outline-none"
					/>
					<button
						onClick={sendMessage}
						disabled={!inputText.trim() || isLoading}
						className="bg-black text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Send
					</button>
				</div>
			</div>
		</div>
	);
};
