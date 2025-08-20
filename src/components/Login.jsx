// src/components/Login.jsx
import { useState } from "react";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

export default function Login({ baseUrl = "http://localhost:8000", onSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const getCookie = (name) => {
        const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? m.pop() : '';
    };

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        if (!username.trim() || !password) {
            setErr("Введите логин и пароль");
            return;
        }
        setLoading(true);
        try {
            // подтягиваем CSRF (выставит csrftoken в cookie)
            await fetch(`${baseUrl}/api/csrf/`, { credentials: "include" });

            const res = await fetch(`${baseUrl}/api/login/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErr(data?.detail || "Не удалось войти");
                return;
            }
            onSuccess?.(data); // передаем объект пользователя наверх
        } catch (e) {
            setErr("Сетевая ошибка");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E9ECEF] p-6">
                <h1 className="text-18 font-medium text-dark mb-4 text-center">Вход в личный кабинет</h1>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-14 text-gray-700 mb-1">Введите логин</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            className="w-full rounded-lg border border-[#D8D8D8] px-3 py-2 outline-none focus:ring-2 focus:ring-darkblue/30 bg-white"
                            placeholder="Логин"
                        />
                    </div>

                    <div>
                        <label className="block text-14 text-gray-700 mb-1">Введите пароль</label>
                        <div className="flex items-center border border-[#D8D8D8] rounded-lg px-3 bg-white">
                            <input
                                type={show ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                className="flex-1 py-2 outline-none bg-transparent"
                                placeholder="Пароль"
                            />
                            <button
                                type="button"
                                onClick={() => setShow((s) => !s)}
                                className="p-1 rounded hover:bg-black/5 transition"
                                aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                                title={show ? "Скрыть пароль" : "Показать пароль"}
                            >
                                {show ? <MdVisibilityOff className="w-5 h-5 text-gray-600" /> : <MdVisibility className="w-5 h-5 text-gray-600" />}
                            </button>
                        </div>
                    </div>

                    {err && <div className="text-13 text-red">{err}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-[10px] bg-darkblue text-white py-2 text-14 font-medium hover:opacity-90 transition disabled:opacity-60"
                    >
                        {loading ? "Входим…" : "Войти"}
                    </button>
                </form>
            </div>
        </div>
    );
}
