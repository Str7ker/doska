// src/components/AddProjectModal.jsx
import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
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
        participants: [], // [userId, ...]
    });

    useEffect(() => {
        if (!open) return;
        setForm({
            title: "",
            description: "",
            due_date: "",
            participants: [],
        });
    }, [open]);

    if (!open) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const handleParticipants = (e) => {
        const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
        setForm((s) => ({ ...s, participants: selected }));
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
            participants_ids: form.participants, // ожидание бэка
        };
        onSubmit?.(payload);
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray overflow-hidden">
                    {/* Заголовок */}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                            {/* Участники */}
                            <div>
                                <label className="block text-14 text-gray-700 mb-1">Участники</label>
                                <div className="flex items-center border border-[#D8D8D8] rounded-lg px-3">
                                    <MdPeople className="w-4 h-4 text-gray-500 mr-2" />
                                    <select
                                        multiple
                                        value={form.participants}
                                        onChange={handleParticipants}
                                        className="flex-1 py-2 outline-none bg-transparent h-[39px]"
                                        title="Удерживайте Ctrl/Shift для множественного выбора"
                                    >
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.display_name || u.username || u.email || `user#${u.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
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
