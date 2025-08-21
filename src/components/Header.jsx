// src/components/Header.jsx
import { MdOutlineApps } from "react-icons/md";
import { IoNotificationsOutline, IoLogOutOutline } from "react-icons/io5";

export default function Header({
    logoSrc = "/logo.svg",
    projectLabel = "Проекты",
    username = "Пользователь",
    role = "Администратор",
    unreadCount = 0,
    onLogout,
}) {
    const handleLogoutClick = () => {
        if (window.confirm("Вы точно хотите выйти?")) {
            onLogout?.();
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-[#EAEAEA] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="max-w-screen-2xl mx-auto py-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    {/* Лево: логотип */}
                    <div className="flex items-center gap-2">
                        <a href="/" className="flex items-center gap-2">
                            <img
                                src={logoSrc}
                                alt="Логотип"
                            />
                            <span className="text-16 font-medium text-dark hidden sm:inline">Доска</span>
                        </a>
                    </div>

                    {/* Центр: иконка + "Проекты" */}
                    <div className="flex items-center justify-center">
                        <div className="inline-flex items-center gap-2 rounded-[10px] border border-gray bg-white px-3 py-1.5">
                            <MdOutlineApps className="w-5 h-5 text-dark" />
                            <span className="text-14 text-dark font-medium">{projectLabel}</span>
                        </div>
                    </div>

                    {/* Право: уведомления | разделитель | ФИО + должность | иконка выхода */}
                    <div className="flex justify-end items-center gap-3">
                        {/* Колокольчик */}
                        <button
                            type="button"
                            className="relative rounded-full p-2 hover:bg-[#F2F2F2] transition"
                            aria-label="Уведомления"
                            title="Уведомления"
                        >
                            <IoNotificationsOutline className="w-5 h-5 text-dark" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red text-white text-[11px] flex items-center justify-center">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Вертикальный разделитель */}
                        <div className="h-6 w-px bg-[#D8D8D8]" aria-hidden="true" />

                        {/* Имя пользователя + должность (без рамок и аватарок) */}
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                            <span className="text-142 text-dark font-medium">{username}</span>
                            <span className="text-122 text-gray-500 mt-0.5">{role}</span>
                        </div>

                        {/* Иконка выхода с подтверждением */}
                        <button
                            type="button"
                            onClick={handleLogoutClick}
                            className="p-2 rounded-lg hover:bg-[#F2F2F2] transition"
                            aria-label="Выйти"
                            title="Выйти"
                        >
                            <IoLogOutOutline className="w-5 h-5 text-dark" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
