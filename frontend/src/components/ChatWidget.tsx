import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import * as assistantApi from '../services/assistant';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  courses?: Course[];
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const initialAssistantMessage: ChatMessage = {
  id: createMessageId(),
  role: 'assistant',
  content: 'Welcome back. Ask me to find courses by topic and I will share direct links.'
};

const ChatWidget = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatSending]);

  const handleChatSend = async (override?: string) => {
    const content = (override ?? chatInput).trim();
    if (!content || chatSending) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatError(null);
    setChatSending(true);

    try {
      const data = await assistantApi.sendAssistantMessage(content);
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: data.reply,
        courses: data.courses
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setChatError('Apollo AI is unavailable. Please try again.');
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <div className="relative w-10 h-10 group">
        <div
          className={`absolute bottom-0 right-0 w-[360px] h-[550px] bg-zinc-900 rounded-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right border border-zinc-800 shadow-2xl ${
            chatOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 pointer-events-none scale-95 translate-y-4 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
          }`}
        >
          <div className="h-16 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-lime-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l1.8 5.5H19l-4.5 3.3L16 16l-4-2.7L8 16l1.5-5.2L5 7.5h5.2L12 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Apollo AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-acid shadow-[0_0_8px_rgba(184,230,0,0.6)] animate-pulse" />
                  <span className="text-[10px] text-zinc-400 font-mono tracking-wide">SYSTEM ONLINE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14h-2v3h3v-2H7v-1zm12-8h-3v2h2v1h2V6h-1zm-2 10h2v-2h-2v2zm-8-8H7V6h2V4H5v4h4V6z" />
                </svg>
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.3 5.7L12 12l6.3 6.3-1.3 1.3L10.7 13.3 4.4 19.6 3.1 18.3 9.4 12 3.1 5.7 4.4 4.4l6.3 6.3 6.3-6.3z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm scroll-smooth bg-zinc-950/40">
            {chatMessages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div
                  key={message.id}
                  className={`flex gap-4 items-start animate-fade-in-up ${isAssistant ? '' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 6V6a2 2 0 1 1 4 0v2h-4z" />
                      </svg>
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[85%] ${isAssistant ? '' : 'items-end'}`}>
                    <span
                      className={`text-[10px] font-bold ${isAssistant ? 'text-zinc-400 ml-1' : 'text-zinc-500 mr-1'}`}
                    >
                      {isAssistant ? 'APOLLO' : 'YOU'}
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-100 rounded-tl-none'
                          : 'bg-black/70 text-white border border-zinc-800 rounded-tr-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.content}</p>
                      {message.courses && message.courses.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-700 grid gap-2">
                          {message.courses.slice(0, 3).map((course) => (
                            <Link
                              key={course.id}
                              to={`/course/${course.id}`}
                              className="border border-zinc-700 rounded-xl p-2 bg-zinc-900/70 hover:bg-zinc-900 transition-colors"
                            >
                              <p className="text-xs font-semibold text-zinc-100">{course.title}</p>
                              <p className="text-[10px] text-zinc-400">
                                {course.category ?? 'General'} · {course.price && course.price > 0 ? `$${course.price}` : 'Free'}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                      {isAssistant && index === 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-700 flex gap-2">
                          <button
                            onClick={() => handleChatSend('Find courses about data science')}
                            className="text-[11px] bg-zinc-800 hover:bg-acid/10 hover:text-lime-300 hover:border-acid/20 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors font-medium text-zinc-200"
                          >
                            Data Science
                          </button>
                          <button
                            onClick={() => handleChatSend('Find courses about project management')}
                            className="text-[11px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors font-medium text-zinc-200"
                          >
                            Project Mgmt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center shrink-0 border border-zinc-800">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-6 1.34-6 3v1h12v-1c0-1.66-2.67-3-6-3z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
            {chatSending && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Apollo AI is typing...
              </div>
            )}
            {chatError && (
              <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {chatError}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-zinc-900 border-t border-zinc-800">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                disabled={chatSending}
                placeholder="Ask for courses by topic..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-4 pr-12 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:border-zinc-600 shadow-sm transition-all font-medium disabled:opacity-60"
              />
              <button
                onClick={() => handleChatSend()}
                disabled={!chatInput.trim() || chatSending}
                className="absolute right-2 top-2 p-1.5 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-acid hover:text-black transition-colors shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 21l20-9L2 3v7l14 2-14 2v7z" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mt-2">
              <span className="text-[9px] text-zinc-500 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-6 0V6a2 2 0 1 1 4 0v2h-4z" />
                </svg>
                Private & Secure Context
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className={`relative w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-acid/20 border border-white/10 transition-all duration-300 hover:scale-105 active:scale-95 z-50 overflow-hidden ${
            chatOpen ? 'opacity-0 pointer-events-none' : 'group-hover:opacity-0 group-hover:pointer-events-none'
          }`}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_30%_20%,rgba(217,249,157,0.35),transparent_60%)]" />
          <div className="absolute inset-0 rounded-xl border border-acid opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <svg className="w-5 h-5 group-hover:text-lime-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3C7.03 3 3 6.58 3 11c0 2.18 1.05 4.13 2.75 5.56L5 21l4.62-2.01c.77.21 1.57.32 2.38.32 4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
