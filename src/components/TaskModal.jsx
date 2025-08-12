import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { MdPeople } from "react-icons/md";

const PRIORITY_VIEW = {
    low: { label: 'Низкий', cls: 'bg-[#C3FFBC] border border-green text-[#258419]' },
    medium: { label: 'Средний', cls: 'bg-[#FFFED7] border border-yellow text-yellow' },
    high: { label: 'Высокий', cls: 'bg-[#FFBCBC] border border-[#FFAAAA] text-red' },
    critical: { label: 'Критичный', cls: 'bg-red text-white border border-red' },
};

const COLUMNS = [
    { value: "new", label: "Новые", color: "bg-gray" },
    { value: "in_progress", label: "Выполняются", color: "bg-darkblue" },
    { value: "testing", label: "Тестирование", color: "bg-yellow" },
    { value: "review", label: "Правки", color: "bg-red" },
    { value: "done", label: "Выполнено", color: "bg-green" },
];

/**
 * Универсальная модалка:
 * - если initialTask передан → режим редактирования
 * - если нет → режим создания
 */
export default function AddTaskModal({
    open,
    onClose,
    onSubmit,
    users = [],
    loading = false,
    initialTask = null,
}) {
    const isEdit = Boolean(initialTask);

    const [form, setForm] = useState({
        title: "",
        description: "",
        column: "new",
        responsible: "",
        priority: "medium",
        due_date: "",
    });

    // При открытии модалки: сбрасываем либо заполняем из initialTask
    useEffect(() => {
        if (!open) return;

        if (isEdit) {
            setForm({
                title: initialTask.title || "",
                description: initialTask.description || "",
                column: initialTask.column || "new",
                responsible: initialTask.responsible ? String(initialTask.responsible.id) : "",
                priority: initialTask.priority || "medium",
                // приводим к yyyy-mm-dd если есть
                due_date: initialTask.due_date || "",
            });
        } else {
            setForm({
                title: "",
                description: "",
                column: "new",
                responsible: "",
                priority: "medium",
                due_date: "",
            });
        }
    }, [open, isEdit, initialTask]);

    if (!open) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return alert("Введите заголовок задачи");

        // Готовим полезную нагрузку для API
        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            column: form.column,
            priority: form.priority,
            due_date: form.due_date || null,
            responsible: form.responsible ? Number(form.responsible) : null,
        };

        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 z-50">
            {/* затемнение */}
            <div className="absolute inset-0 bg-black/40 " onClick={onClose} />
            {/* модалка */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray overflow-hidden">
                    {/* заголовок */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEFEF]">
                        {isEdit ? (
                            <div className="border border-gray rounded-[5px] px-[10px] py-[2px] text-sm text-dark w-fit">
                                №{initialTask?.id}
                            </div>
                        ) : (
                            <h3 className="text-16 font-medium text-dark">Добавить задачу</h3>
                        )}
                        <button
                            className="p-2 rounded-lg hover:bg-black/5 transition"
                            onClick={onClose}
                        >
                            <FaTimes className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {/* Заголовок */}
                        <div>
                            <label className="block text-14 text-gray-700 mb-1">Заголовок *</label>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-[#D8D8D8] px-3 py-2 outline-none focus:ring-2 focus:ring-darkblue/30"
                                placeholder="Короткий заголовок"
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
                                placeholder="Подробности задачи"
                            />
                        </div>

                        {/* Статус + Ответственный */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-14 text-gray-700 mb-1">Статус</label>
                                <div className="flex items-center border border-[#D8D8D8] rounded-lg px-3">
                                    <div className={`w-4 h-4 rounded-full mr-2 ${COLUMNS.find(c => c.value === form.column)?.color}`} />
                                    <select
                                        name="column"
                                        value={form.column}
                                        onChange={handleChange}
                                        className="flex-1 py-2 outline-none bg-transparent"
                                    >
                                        {COLUMNS.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-14 text-gray-700 mb-1">Ответственный</label>
                                <div className="flex items-center border border-[#D8D8D8] rounded-lg px-3">
                                    <MdPeople className="w-4 h-4 text-gray-500 mr-2" />
                                    <select
                                        name="responsible"
                                        value={form.responsible}
                                        onChange={handleChange}
                                        className="flex-1 py-2 outline-none bg-transparent"
                                    >
                                        <option value="">Не назначен</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.username || u.email || `user#${u.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Приоритет + Дедлайн */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-14 text-gray-700 mb-1">Приоритет</label>
                                <div className="flex items-center border border-[#D8D8D8] rounded-lg px-3">
                                    <div className={`${PRIORITY_VIEW[form.priority]?.cls || ''} text-12 px-[5px] py-[2px] rounded-[5px]`}>
                                        {PRIORITY_VIEW[form.priority]?.label}
                                    </div>
                                    <select
                                        name="priority"
                                        value={form.priority}
                                        onChange={handleChange}
                                        className="flex-1 py-2 outline-none bg-transparent ml-2"
                                    >
                                        {Object.entries(PRIORITY_VIEW).map(([val, info]) => (
                                            <option key={val} value={val}>{info.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

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
                                {loading ? (isEdit ? "Сохраняем…" : "Сохраняем…") : (isEdit ? "Сохранить" : "Создать задачу")}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
}
