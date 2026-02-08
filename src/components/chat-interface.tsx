'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { Send, Paperclip, Camera, Plus, MessageSquare, Menu, X, Loader2, UploadCloud, Image as ImageIcon, FileText, Pencil, Trash2, Check, User, LogOut, Settings, Copy } from "lucide-react";
import ReactWebcam from "react-webcam";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/actions/auth";
import { deleteLastMessage } from "@/actions/chat";
import ProfileSettings from "./profile-settings";
import { toast } from "sonner";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
}

interface ChatInterfaceProps {
    initialChatId?: string;
    initialMessages?: Message[];
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        theme?: string | null;
        provider?: string | null;
    };
}

export default function ChatInterface({ initialChatId, initialMessages = [], user }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(initialChatId || null);
    const [fileId, setFileId] = useState<string | null>(null); // If new chat, fileId comes from upload
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editMessageContent, setEditMessageContent] = useState("");

    // Missing States
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [uploading, setUploading] = useState(false);
    const [showProfileSettings, setShowProfileSettings] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // Refs & Router
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const webcamRef = useRef<ReactWebcam>(null);
    const router = useRouter();

    // Theme Config
    const themes: Record<string, string> = {
        indigo: "bg-indigo-600",
        emerald: "bg-emerald-600",
        rose: "bg-rose-600",
        amber: "bg-amber-600",
        cyan: "bg-cyan-600",
    };
    const themeColor = themes[user?.theme || 'indigo'] || themes.indigo;

    // Fetch chat history on mount or when chatId changes
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await axios.get("/api/chats");
                setChatHistory(res.data);
            } catch (err) {
                console.error("Failed to fetch chat history");
            }
        };
        fetchChats();
    }, [chatId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const startEditing = (chat: any) => {
        setEditingChatId(chat._id);
        setEditTitle(chat.title);
    };

    const saveTitle = async (id: string) => {
        try {
            await axios.patch(`/api/chats/${id}`, { title: editTitle });
            setChatHistory((prev: any[]) => prev.map(c => c._id === id ? { ...c, title: editTitle } : c));
            setEditingChatId(null);
        } catch (error) {
            console.error("Failed to update title");
        }
    };

    const deleteChat = async (id: string) => {
        if (!confirm("Are you sure you want to delete this chat?")) return;
        try {
            await axios.delete(`/api/chats/${id}`);
            setChatHistory((prev: any[]) => prev.filter(c => c._id !== id));
            if (chatId === id) {
                setChatId(null);
                setMessages([]);
                router.push("/");
            }
        } catch (error) {
            console.error("Failed to delete chat");
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];
        await handleFileUpload(file);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxFiles: 1
    });

    const handleLogout = async () => {
        if (loading && chatId) {
            // Cleanup pending question if logging out during generation
            await deleteLastMessage(chatId);
        }
        await logout();
    };

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post("/api/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.fileId) {
                setFileId(response.data.fileId);
                setMessages([{
                    id: 'system-1',
                    role: 'assistant',
                    content: response.data.message || "File processed. You can now ask questions."
                }]);
                toast.success("File uploaded successfully");
            }
        } catch (error: any) {
            console.error("Upload failed", error);
            const errorMsg = error.response?.data?.error || "Failed to upload file. Please try again.";
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const captureCamera = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                    handleFileUpload(file);
                    setShowCamera(false);
                });
        }
    }, [webcamRef, handleFileUpload]);

    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        if (!chatId && !fileId) {
            toast.error("Please upload a file to start chatting.");
            return;
        }

        const userMessage = input;
        setInput("");

        const tempId = Date.now().toString();
        setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const response = await axios.post("/api/chat", {
                chatId,
                fileId,
                message: userMessage
            });

            if (response.data.chatId && !chatId) {
                setChatId(response.data.chatId);
                router.push(`/chat/${response.data.chatId}`, { scroll: false });
            }

            setMessages(prev => [...prev, { id: Date.now().toString() + '-a', role: 'assistant', content: response.data.message }]);
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { id: Date.now().toString() + '-e', role: 'assistant', content: "Something went wrong. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleEditMessage = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditMessageContent(msg.content);
    };

    const submitEdit = async () => {
        if (!editingMessageId) return;

        // Find the index of the edited message
        const editIndex = messages.findIndex(m => m.id === editingMessageId);
        if (editIndex === -1) return;

        // Optimistic update: Update the user message and remove all subsequent messages
        const updatedMessages = [...messages.slice(0, editIndex), { ...messages[editIndex], content: editMessageContent }];
        setMessages(updatedMessages);
        setEditingMessageId(null);

        setLoading(true);
        try {
            const response = await axios.post("/api/chat", {
                chatId,
                fileId,
                message: editMessageContent
            });

            // Add the new assistant response
            setMessages(prev => [...prev, { id: Date.now().toString() + '-a', role: 'assistant', content: response.data.message }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString() + '-e', role: 'assistant', content: "Failed to get a new response." }]);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    };

    const lastUserMessageId = messages.slice().reverse().find(m => m.role === 'user')?.id;
    const showUploadScreen = !chatId && !fileId;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                    <h2 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600`}>RAG Chat</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <Link href="/" onClick={() => {
                        setChatId(null);
                        setFileId(null);
                        setMessages([]);
                        setIsSidebarOpen(false);
                    }} className={`flex items-center justify-center w-full gap-2 px-4 py-3 text-white rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${themeColor}`}>
                        <Plus size={18} /> New Chat
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-2">Recent Chats</p>
                    <div className="space-y-1">
                        {chatHistory.length === 0 ? (
                            <div className="text-sm text-gray-500 italic pl-2">No recent chats</div>
                        ) : (
                            chatHistory.map(chat => (
                                <div key={chat._id} className="group flex items-center gap-1">
                                    {editingChatId === chat._id ? (
                                        <div className="flex-1 flex items-center gap-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg animate-in fade-in">
                                            <input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="flex-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 outline-none"
                                                autoFocus
                                            />
                                            <button onClick={() => saveTitle(chat._id)} className="text-green-600 hover:text-green-700 p-1"><Check size={14} /></button>
                                            <button onClick={() => setEditingChatId(null)} className="text-red-500 hover:text-red-600 p-1"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <Link
                                                href={`/chat/${chat._id}`}
                                                className={cn(
                                                    "flex-1 block p-3 rounded-xl text-sm truncate transition-all duration-200",
                                                    chatId === chat._id
                                                        ? `${themeColor.replace('bg-', 'bg-opacity-10 text-')} font-medium bg-opacity-10`
                                                        : "hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                                                )}
                                                style={chatId === chat._id ? { color: 'var(--theme-color)', backgroundColor: 'var(--theme-bg)' } : {}}
                                            >
                                                {chat.title || "Untitled Chat"}
                                            </Link>
                                            <div className="hidden group-hover:flex items-center gap-1 pr-1">
                                                <button onClick={(e) => { e.preventDefault(); startEditing(chat); }} className="p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); deleteChat(chat._id); }} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center h-16 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <Menu size={20} />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">
                            {chatId ? "Chat Session" : "New Conversation"}
                        </h1>
                    </div>

                    {/* Top Right Profile */}
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">{user.name}</span>
                                <button
                                    onClick={() => setShowProfileSettings(true)}
                                    className={`w-9 h-9 rounded-full ${themeColor} flex items-center justify-center text-white font-bold shadow-md hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 transition-all`}
                                >
                                    {user.name?.[0]?.toUpperCase() || "U"}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition"
                                    title="Log out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className={`px-4 py-2 ${themeColor} text-white rounded-lg text-sm font-medium shadow-sm hover:opacity-90 transition`}>
                            Sign In
                        </Link>
                    )}
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth" id="messages-container">
                    {showUploadScreen ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="text-center space-y-3">
                                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                                    Upload & Chat
                                </h2>
                                <p className="text-lg text-gray-500 dark:text-gray-400">
                                    Your AI assistant for documents and images.
                                </p>
                            </div>

                            <div {...getRootProps()} className={cn(
                                "w-full p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 gap-4 group",
                                isDragActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105" : "border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                            )}>
                                <input {...getInputProps()} />
                                {uploading ? (
                                    <Loader2 className={`w-12 h-12 ${themeColor.replace('bg-', 'text-')} animate-spin`} />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform">
                                        <div className={`p-5 ${themeColor.replace('bg-', 'bg-opacity-10 text-')} bg-opacity-10 rounded-full`}>
                                            <UploadCloud className={`w-8 h-8 ${themeColor.replace('bg-', 'text-')}`} />
                                        </div>
                                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                            Click to upload or drag & drop
                                        </p>
                                        <div className="flex gap-2 text-xs text-gray-400 uppercase tracking-wide">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">PDF</span>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">DOCX</span>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">IMG</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative w-full text-center">
                                <span className="absolute inset-x-0 top-1/2 border-t border-gray-200 dark:border-gray-700" />
                                <span className="relative bg-gray-50 dark:bg-gray-900 px-4 text-sm text-gray-500 uppercase tracking-widest">or</span>
                            </div>

                            <button
                                onClick={() => setShowCamera(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition transform hover:-translate-y-0.5"
                            >
                                <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                <span className="font-medium text-gray-700 dark:text-gray-200">Open Camera</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-3xl mx-auto pb-6">
                            {messages.map((msg, index) => (
                                <div key={msg.id || index} className={cn("flex gap-4 group", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    {msg.role === 'assistant' && (
                                        <div className={`w-8 h-8 rounded-full ${themeColor} flex flex-shrink-0 items-center justify-center text-white text-xs mt-1 shadow-md`}>
                                            AI
                                        </div>
                                    )}

                                    <div className="max-w-[85%] relative">
                                        {msg.role === 'user' && editingMessageId === msg.id ? (
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-lg border border-indigo-200 dark:border-indigo-900 animate-in zoom-in-95">
                                                <input
                                                    value={editMessageContent}
                                                    onChange={e => setEditMessageContent(e.target.value)}
                                                    className="w-full text-wrap  bg-transparent border-none outline-none text-gray-800 dark:text-white"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2 justify-end mt-2">
                                                    <button onClick={() => setEditingMessageId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                                    <button onClick={submitEdit} className={`text-xs ${themeColor} text-white px-2 py-1 rounded`}>Save & Ask</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "rounded-2xl p-4 shadow-sm text-sm leading-relaxed",
                                                msg.role === 'user'
                                                    ? `${themeColor} text-white rounded-br-none`
                                                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none"
                                            )}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                                {/* Selective Copy Button */}
                                                {msg.role === 'assistant' && !msg.content.includes("supposed to answer based on the context") && (
                                                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                                        <button
                                                            onClick={() => copyToClipboard(msg.content, msg.id)}
                                                            className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-indigo-500 transition-colors"
                                                            title="Copy to clipboard"
                                                        >
                                                            {copiedMessageId === msg.id ? (
                                                                <>
                                                                    <Check size={12} className="text-green-500" />
                                                                    <span className="text-green-500">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={12} />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Edit Button for Last User Message */}
                                        {msg.role === 'user' && msg.id === lastUserMessageId && !editingMessageId && (
                                            <button
                                                onClick={() => handleEditMessage(msg)}
                                                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 transition-all custom-edit-btn"
                                                title="Edit message"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {msg.role === 'user' && (user?.image ? (
                                        <img
                                            src={user.image}
                                            alt="User"
                                            className="w-8 h-8 rounded-full mt-1 object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className={`w-8 h-8 rounded-full ${themeColor} flex flex-shrink-0 items-center justify-center text-white text-xs mt-1 font-bold shadow-sm`}>
                                            {user?.name?.[0] || 'U'}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start gap-4 animate-pulse">
                                    <div className={`w-8 h-8 rounded-full ${themeColor} flex items-center justify-center text-white text-xs mt-1 opacity-70`}>AI</div>
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 rounded-bl-none flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        <span className="text-sm text-gray-400">Processing document context...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area (Only visible in Chat Mode) */}
                {!showUploadScreen && (
                    <div className="p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-3 relative">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask a follow-up question..."
                                    className="w-full p-4 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white shadow-sm transition-shadow hover:shadow-md focus:shadow-lg"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 ${themeColor} text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95`}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                        <p className="text-center text-xs text-gray-400 mt-2">AI can make mistakes. Verify important information.</p>
                    </div>
                )}

            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-md w-full relative border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm transition">
                            <X size={20} />
                        </button>
                        <div className="aspect-[4/3] bg-black relative">
                            <ReactWebcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="p-6 flex justify-center bg-gray-900">
                            <button onClick={captureCamera} className="w-16 h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
                                <Camera className="w-8 h-8 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Settings Modal */}
            {showProfileSettings && user && (
                <ProfileSettings user={user} onClose={() => setShowProfileSettings(false)} />
            )}
        </div>
    );
}
