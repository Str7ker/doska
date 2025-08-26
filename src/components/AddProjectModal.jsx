// src/components/AddProjectModal.jsx
import { useEffect, useMemo, useState } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";
import { MdPeople } from "react-icons/md";

export default function AddProjectModal({
    open,
    onClose,
    onSubmit,
    users = [],
    loading = false,
}) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        due_date: "",
        participants: [], // массив ID выбранных пользователей
    });

    // локальный выбор "кандидата" для добавления
    const [candidateId, setCandidateId] = useState("");

    useEffect(() => {
        if (!open) return;
        setForm({
            title: "",
            description: "",
            due_date: "",
            participants: [],
        });
        setCandidateId("");
    }, [open]);

    const availableUsers = useMemo(
        () => users.filter((u) => !form.participants.includes(u.id)),
        [users, form.participants]
    );

    if (!open) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const addParticipant = () => {
        const id = Number(candidateId);
        if (!id) return;
        if (form.participants.includes(id)) return;
        setForm((s) => ({ ...s, participants: [...s.participants, id] }));
        setCandidateId("");
    };

    const removeParticipant = (id) => {
        setForm((s) => ({
            ...s,
            participants: s.participants.filter((p) => p !== id),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert("Введите название проекта");
            return;
        }
        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            due_date: form.due_date || null,
            participants_ids: form.participants, // поле, которое ждёт ваш ProjectSerializer
        };
        onSubmit?.(payload);
    };

    const displayName = (u) => u.display_name || u.username || u.email || `user#${u.id}`;

    return (
        <div className="fixed inset-0 z-50">
            {/* затемнение */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            {/* модалка */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray overflow-hidden">
                    {/* заголовок */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEFEF]">
                        <h3 className="text-16 font-medium text-dark">Добавить проект</h3>
                        <button className="p-2 rounded-lg hover:bg-black/5 transition" onClick={onClose}>
                            <FaTimes className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {/* Заголовок проекта */}
                        <div>
                            <label className="block text-14 text-gray-700 mb-1">Заголовок *</label>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-[#D8D8D8] px-3 py-2 outline-none focus:ring-2 focus:ring-darkblue/30"
                                placeholder="Название проекта"
                            />
                        </div>

                        {/* Описание */}
                        <div>
                            <label className="block text-14 text-gray-700 mb-1">Описание</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full rounded-lg border border-[#D8D8D8] px-3 py-2 outline-none focus:ring-2 focus:ring-darkblue/30"
                                placeholder="Коротко о проекте"
                            />
                        </div>

                        {/* Дедлайн */}
                        <div>
                            <label className="block text-14 text-gray-700 mb-1">Дедлайн</label>
                            <div className="flex items-center border border-[#D8D8D8] rounded-lg px-3 h-[39px]">
                                <input
                                    type="date"
                                    name="due_date"
                                    value={form.due_date || ""}
                                    onChange={handleChange}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.showPicker?.();
                                    }}
                                    className="flex-1 py-2 outline-none bg-transparent select-none"
                                />
                            </div>
                        </div>

                        {/* Люди в проекте (ниже дедлайна) */}
                        <div>
                            <label className="block text-14 text-gray-700 mb-1">Люди в проекте</label>

                            {/* строка выбора одного пользователя + плюс */}
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
                                    onClick={addParticipant}
                                    disabled={!candidateId}
                                    title="Добавить человека"
                                    className="inline-flex items-center gap-2 rounded-[10px] px-3 py-2 border border-dashed border-darkblue text-darkblue hover:bg-darkblue hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <FaPlus className="w-4 h-4" />
                                    <span className="text-14 font-medium hidden sm:inline">Добавить</span>
                                </button>
                            </div>

                            {/* выбранные участники списком */}
                            {form.participants.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                    {form.participants.map((id) => {
                                        const u = users.find((x) => x.id === id);
                                        if (!u) return null;
                                        return (
                                            <div
                                                key={id}
                                                className="flex items-center justify-between rounded-md border border-[#D8D8D8] bg-[#FAFAFA] px-3 py-2"
                                            >
                                                <span className="text-14 text-dark">{displayName(u)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeParticipant(id)}
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
                        </div>

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
                                {loading ? "Сохраняем…" : "Создать проект"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
