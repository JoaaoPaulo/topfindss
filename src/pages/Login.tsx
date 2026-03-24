import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Lock, Mail, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
    onLogin: (token: string, user: any) => void;
    adminFlow?: boolean;
}

export default function Login({ onLogin, adminFlow }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (res.ok) {
                onLogin(data.token, data.user);
                if (adminFlow) {
                    if (data.user?.is_admin) navigate("/admin");
                    else {
                        setError("Acesso negado. Esta conta não possui privilégios administrativos.");
                        return;
                    }
                } else {
                    navigate("/");
                }
            } else {
                setError(data.error || "Erro ao fazer login");
            }
        } catch (err) {
            setError("Erro de conexão com o servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-brand/5 border border-neutral-200 p-8 md:p-10"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <Link to="/" className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-brand/20 hover:scale-105 transition-transform cursor-pointer">
                        <ShoppingBag className="w-8 h-8 text-white" />
                    </Link>
                    <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                        {adminFlow ? "Painel Administrativo" : "Acessar Conta"}
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        {adminFlow ? "Entre com suas credenciais de administrador" : "Entre na sua conta para continuar comprando"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-brand/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand/10 mt-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Entrar
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-neutral-100 flex flex-col items-center gap-4">
                    {!adminFlow && (
                        <p className="text-sm text-neutral-500">
                            Novo por aqui?{" "}
                            <Link to="/register" className="font-semibold text-brand hover:text-brand/80 transition-colors">
                                Cadastre-se
                            </Link>
                        </p>
                    )}
                    <button
                        onClick={() => navigate("/")}
                        className="text-sm font-semibold text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        Voltar para o site
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
