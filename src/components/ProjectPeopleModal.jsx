// src/components/ProjectPeopleModal.jsx
import { useEffect, useMemo, useState } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";
import { MdPeople } from "react-icons/md";

export default function ProjectPeopleModal({
    open,
    onClose,
    onSubmit,          // (ids: number[]) => void
    allUsers = [],     // полный список пользователей
    initialIds = [],   // стартовый набор id участников
    loading = false,
}) {
    // 1) Все хуки — только наверху и всегда вызываются в одном порядке
    const [ids, setIds] = useState([]);
    const [candidateId, setCandidateId] = useState("");

    // доступные к добавлению пользователи
    const availableUsers = useMemo(
        () => allUsers.filter((u) => !ids.includes(u.id)),
        [allUsers, ids]
    );

    // синхронизация при открытии модалки
    useEffect(() => {
        if (!open) return;
        setIds(Array.isArray(initialIds) ? [...initialIds] : []);
        setCandidateId("");
    }, [open, initialIds]);

    // 2) После хуков можно безопасно сделать ранний выход
    if (!open) return null;

    const displayName = (u) =>
        u.display_name || u.username || u.email || `user#${u.id}`;

    const add = () => {
        const id = Number(candidateId);
        if (!id || ids.includes(id)) return;
        setIds((prev) => [...prev, id]);
        setCandidateId("");
    };

    const remove = (id) => setIds((prev) => prev.filter((x) => x !== id));

    const handleSubmit = (e) => {
        e?.preventDefault?.();
        onSubmit?.(ids);
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray overflow-hidden">
                    {/* Заголовок */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEFEF]">
                        <h3 className="text-16 font-medium text-dark">Люди в проекте</h3>
                        <button className="p-2 rounded-lg hover:bg-black/5 transition" onClick={onClose}>
                            <FaTimes className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {/* Тело */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {/* Выбор одного пользователя + плюс */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center flex-1 border border-[#D8D8D8] rounded-lg px-3 h-[39px]">
                                <MdPeople className="w-4 h-4 text-gray-500 mr-2" />
                                <select
                                    value={candidateId}
                                    onChange={(e) => setCandidateId(e.target.value)}
                                    className="flex-1 py-2 outline-none bg-transparent"
                                >
                                    <option value="">Выберите пользователя</option>
                                    {availableUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {displayName(u)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={add}
                                disabled={!candidateId}
                                title="Добавить человека"
                                className="inline-flex items-center gap-2 rounded-[10px] px-3 py-2 border border-dashed border-darkblue text-darkblue hover:bg-darkblue hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <FaPlus className="w-4 h-4" />
                                <span className="text-14 font-medium hidden sm:inline">Добавить</span>
                            </button>
                        </div>

                        {/* Список выбранных */}
                        {ids.length > 0 ? (
                            <div className="mt-2 space-y-2">
                                {ids.map((id) => {
                                    const u = allUsers.find((x) => x.id === id);
                                    if (!u) return null;
                                    return (
                                        <div
                                            key={id}
                                            className="flex items-center justify-between rounded-md border border-[#D8D8D8] bg-[#FAFAFA] px-3 py-2"
                                        >
                                            <span className="text-14 text-dark">{displayName(u)}</span>
                                            <button
                                                type="button"
                                                onClick={() => remove(id)}
                                                className="p-1 rounded-md hover:bg-black/5 transition"
                                                title="Убрать из проекта"
                                            >
                                                <FaTimes className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="mt-2 text-12 text-gray-500">Пока никого не добавили.</p>
                        )}

                        {/* Кнопки */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-[10px] border border-gray hover:bg-gray/10 transition text-14"
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 rounded-[10px] bg-darkblue text-white hover:opacity-90 transition text-14 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? "Сохраняем…" : "Сохранить"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
