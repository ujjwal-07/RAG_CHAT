import { useState, useEffect } from "react";
import { updateProfile } from "@/actions/auth";
import { X, Loader2, Save, Settings, Check, AlertCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

interface ProfileSettingsProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        theme?: string | null;
        provider?: string | null;
    };
    onClose: () => void;
}

export default function ProfileSettings({ user, onClose }: ProfileSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const { theme, setTheme } = useTheme();
    const { update } = useSession();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        setMessage("");

        const res = await updateProfile(formData);

        if (res?.error) {
            setMessage(res.error);
        } else {
            setMessage("Profile updated successfully!");

            // Optimistic update of session
            const newName = formData.get("name") as string;
            const newTheme = formData.get("theme") as string;

            await update({
                user: {
                    name: newName || user.name,
                    theme: newTheme || user.theme
                }
            });

            setTimeout(onClose, 1500);
        }
        setLoading(false);
    };

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Settings size={20} className="text-indigo-500" />
                        Settings
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                    </div>

                    <form action={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Display Name</label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={user.name || ""}
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Interface Theme</label>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-700 dark:text-gray-300">Appearance</span>
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        className={`p-1.5 rounded-md transition cursor-pointer ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        <Sun size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`p-1.5 rounded-md transition cursor-pointer ${theme === 'dark' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        <Moon size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {[
                                    { name: 'indigo', color: 'bg-indigo-500' },
                                    { name: 'emerald', color: 'bg-emerald-500' },
                                    { name: 'rose', color: 'bg-rose-500' },
                                    { name: 'amber', color: 'bg-amber-500' },
                                    { name: 'cyan', color: 'bg-cyan-500' },
                                ].map((t) => (
                                    <label key={t.name} className="cursor-pointer group relative">
                                        <input
                                            type="radio"
                                            name="theme"
                                            value={t.name}
                                            defaultChecked={user.theme === t.name || (t.name === 'indigo' && !user.theme)}
                                            className="peer sr-only"
                                        />
                                        <div className={`w-8 h-8 rounded-full ${t.color} ring-2 ring-transparent peer-checked:ring-offset-2 peer-checked:ring-gray-400 dark:peer-checked:ring-gray-500 transition-all scale-100 peer-checked:scale-110 shadow-sm`}></div>
                                    </label>
                                ))}
                            </div>
                        </div>



                        {user.provider === 'credentials' && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Change Password</label>
                                <div className="space-y-3">
                                    <input
                                        name="currentPassword"
                                        type="password"
                                        placeholder="Current Password (Required)"
                                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition text-sm"
                                    />
                                    <input
                                        name="newPassword"
                                        type="password"
                                        placeholder="New Password"
                                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes("success") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                {message.includes("success") ? <Check size={16} /> : <AlertCircle size={16} />}
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-medium shadow-md hover:shadow-lg mt-2 cursor-pointer"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
