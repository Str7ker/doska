// src/pages/ProjectBoard.jsx
import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaCircle, FaSearch } from 'react-icons/fa';
import { MdChecklist, MdPeople } from 'react-icons/md';
import { IoChevronBack } from "react-icons/io5";

import { DragDropContext, Droppable } from "@hello-pangea/dnd";

import { useParams, useNavigate } from "react-router-dom";

import TaskColumn from '../components/TaskColumn';
import AddTaskModal from "../components/TaskModal";
import Switch from '../components/Switch';

export default function ProjectBoard({ baseUrl, me }) {
    const { id } = useParams();
    const navigate = useNavigate(); // ← вот это
    const projectId = Number(id);

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [enabled, setEnabled] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [saving, setSaving] = useState(false);

    const columnTypes = { new: "Новые", in_progress: "Выполняются", testing: "Тестирование", review: "Правки", done: "Выполнено" };
    const colorByColumn = { new: "gray", in_progress: "darkblue", testing: "yellow", review: "red", done: "green" };

    const getCookie = (name) => (document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '');

    // Загружаем проект, задачи, пользователей
    useEffect(() => {
        fetch(`${baseUrl}/api/projects/${projectId}/`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null).then(setProject).catch(() => setProject(null));
    }, [baseUrl, projectId]);

    useEffect(() => {
        fetch(`${baseUrl}/api/tasks/?project=${projectId}`, { credentials: 'include' })
            .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
            .then((data) => setTasks(Array.isArray(data) ? data : []))
            .catch(() => setTasks([]));

        // ВАЖНО: только участники проекта
        fetch(`${baseUrl}/api/users/?project=${projectId}`, { credentials: 'include' })
            .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
            .then((data) => setUsers(Array.isArray(data) ? data : []))
            .catch(() => setUsers([]));
    }, [baseUrl, projectId]);

    // API методов (сокращённая версия; возьмите из вашего App.jsx при необходимости)
    const createTask = async (payload) => {
        const res = await fetch(`${baseUrl}/api/tasks/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('createTask failed');
        return res.json();
    };
    const patchTask = async (id, payload) => {
        const res = await fetch(`${baseUrl}/api/tasks/${id}/`, {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('patchTask failed');
        return res.json();
    };
    const deleteTask = async (id) => {
        const res = await fetch(`${baseUrl}/api/tasks/${id}/`, {
            method: 'DELETE', credentials: 'include',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
        });
        if (!res.ok && res.status !== 204) throw new Error('deleteTask failed');
    };

    const computeDoneColor = (task) => {
        if (task.column !== 'done') return '';
        if (!task.completed_at) return 'bg-gray border border-gray text-gray-700';

        // НЕТ дедлайна → серый
        if (!task.due_date) return 'bg-gray border border-gray text-gray-700';

        // С дедлайном: успели → зелёный, иначе красный
        if (task.completed_at <= task.due_date) {
            return 'bg-[#A6FFC3] border border-green text-green-700';
        }
        return 'bg-[#FFBCBC] border border-red text-red';
    };

    // Drag&Drop и остальная логика — как у вас (опускаю детали для краткости)
    // ProjectBoard.jsx — onDragEnd
    // ProjectBoard.jsx — ЗАМЕНИ функцию onDragEnd целиком
    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;

        const fromCol = source.droppableId;
        const toCol = destination.droppableId;
        const taskId = Number(draggableId);
        if (fromCol === toCol) return;

        const prev = tasks;

        // 1) Оптимистическое обновление: колонка, completed_at, done_color
        setTasks(ts => ts.map(t => {
            if (t.id !== taskId) return t;
            const next = { ...t, column: toCol };

            if (toCol === 'done') {
                const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
                next.completed_at = next.completed_at || today;
            }
            if (fromCol === 'done' && toCol !== 'done') {
                next.completed_at = null;
            }

            next.done_color = computeDoneColor(next);
            return next;
        }));

        try {
            // 2) Сохраняем на бэке
            await patchTask(taskId, { column: toCol });

            // 3) Тянем актуальную карточку с бэка и кладём в стейт
            const refreshed = await fetch(`${baseUrl}/api/tasks/${taskId}/`, { credentials: 'include' })
                .then(r => r.json());
            const normalized = { ...refreshed, responsible: toRespObj(refreshed.responsible, users) };

            setTasks(ts => ts.map(t => (t.id === taskId ? normalized : t)));
        } catch (e) {
            // Откатываемся при ошибке
            setTasks(prev);
        }
    };



    const toRespObj = (val, usersList) => {
        if (!val) return null;
        if (typeof val === 'object') return val;
        if (typeof val === 'number') return usersList.find(u => u.id === val) || { id: val };
        return null;
    };

    const openCreate = () => { setEditingTask(null); setModalOpen(true); };
    const openEdit = (task) => { setEditingTask(task); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditingTask(null); };

    const handleSubmitTask = async (formPayload) => {
        try {
            setSaving(true);
            if (editingTask) {
                await patchTask(editingTask.id, formPayload);
                const refreshed = await fetch(`${baseUrl}/api/tasks/${editingTask.id}/`, { credentials: 'include' }).then(r => r.json());
                const normalized = { ...refreshed, responsible: toRespObj(refreshed.responsible, users) };
                setTasks(prev => prev.map(t => (t.id === refreshed.id ? normalized : t)));
                setModalOpen(false);
                setEditingTask(null);
            } else {
                // важно: при создании передаём project_id
                const created = await createTask({ ...formPayload, project_id: projectId });
                const createdFull = await fetch(`${baseUrl}/api/tasks/${created.id}/`, { credentials: 'include' }).then(r => r.json());
                const normalized = { ...createdFull, responsible: toRespObj(createdFull.responsible, users) };
                setTasks(prev => [normalized, ...prev]);
                setModalOpen(false);
                setEditingTask(null);
            }
        } catch {
            alert('Не удалось сохранить задачу.');
        } finally {
            setSaving(false);
        }
    };

    // Фильтры и раскладка
    const q = searchQuery.trim().toLowerCase();
    const myFiltered = useMemo(() => {
        const base = q ? tasks.filter(t =>
            (t.title || "").toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q)
        ) : tasks;
        if (enabled && me?.id) return base.filter(t => t.responsible?.id === me.id);
        return base;
    }, [tasks, q, enabled, me]);

    const tasksByColumn = useMemo(() => {
        const dict = { new: [], in_progress: [], testing: [], review: [], done: [] };
        myFiltered.forEach(task => { if (dict[task.column]) dict[task.column].push(task); });
        return dict;
    }, [myFiltered]);

    return (

        <div className="py-10 px-4">
            <div className="max-w-screen-2xl mx-auto">
                <div className="mb-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.history.length > 1) navigate(-1);
                            else navigate("/projects");
                        }}
                        className="inline-flex items-center gap-1 rounded-[10px] border border-transparent hover:border-darkblue
               text-darkblue pr-[10px] pl-0 transition"
                    >
                        {/* Левая часть без левого паддинга */}
                        <span className="inline-flex items-center justify-center w-8 h-8">
                            <IoChevronBack className="w-4 h-4" />
                        </span>
                        <span className="text-16">Назад</span>
                    </button>
                </div>
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h1 className="text-18 font-medium">{project?.title || `Проект #${projectId}`}</h1>
                        <h1 className="text-16 text-gray-600">{project?.description}</h1>
                    </div>
                    <button
                        onClick={openCreate}
                        className="group flex items-center gap-2 rounded-[20px] px-[20px] py-[10px] border border-dashed border-darkblue text-darkblue transition hover:bg-darkblue hover:text-white"
                    >
                        <FaPlus className="w-4 h-4" />
                        <span className="text-14 font-medium">ДОБАВИТЬ ЗАДАЧУ</span>
                    </button>
                </div>

                <div className="flex gap-3 items-center mb-3">
                    <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33]">
                        <MdChecklist className="w-4 h-4 text-dark" />
                        <span className="text-14 font-medium">{tasks.length} Всего</span>
                    </div>
                    <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33]">
                        <FaCircle className="w-2 h-2 text-blue" />
                        <span className="text-14 font-medium">
                            {tasks.filter(t => ['in_progress', 'testing', 'review'].includes(t.column)).length} Выполняется
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33]">
                        <FaCircle className="w-2 h-2 text-green" />
                        <span className="text-14 font-medium">{tasks.filter(t => t.column === 'done').length} Сделано</span>
                    </div>
                    <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33]">
                        <MdPeople className="w-4 h-4 text-dark" />
                        <span className="text-14 font-medium">{users.length} В проекте</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch enabled={enabled} setEnabled={setEnabled} />
                        <p className="text-sm">{enabled ? 'Мои задачи' : 'Все задачи'}</p>
                    </div>
                    <div className="flex-grow flex items-center gap-2 px-[15px] py-[4px] rounded-[10px] border border-[#D8D8D8] bg-[#CACACA33] min-w-0">
                        <FaSearch className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Поиск задач"
                            className="bg-transparent outline-none text-sm w-full placeholder-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <hr className="w-full h-[1px] bg-[#D8D8D8] border-none mb-3" />


                {/* Заголовки колонок */}
                <div className="flex gap-[15px] w-full mb-3">
                    {['gray', 'darkblue', 'yellow', 'red', 'green'].map((color, i) => (
                        <div key={i} className="relative flex-1 px-[20px] py-[10px] rounded-[15px] border border-gray bg-white overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-[11px] bg-${color} z-10`} />
                            <div className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[30px] h-[50px] bg-white rounded-full z-10" />
                            <div className="relative z-20 flex justify-between items-center">
                                <span className="text-16 text-dark">
                                    {['Новые', 'Выполняются', 'Тестирование', 'Правки', 'Выполнено'][i]}
                                </span>
                                <div className="w-6 h-6 rounded-full bg-gray/50 flex items-center justify-center ml-2">
                                    <span className="text-16 text-black">{
                                        [
                                            tasksByColumn.new.length,
                                            tasksByColumn.in_progress.length,
                                            tasksByColumn.testing.length,
                                            tasksByColumn.review.length,
                                            tasksByColumn.done.length
                                        ][i]
                                    }</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-[15px] w-full items-start">
                        {Object.entries(tasksByColumn).map(([colKey, colTasks]) => (
                            <Droppable droppableId={colKey} key={colKey}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1">
                                        <TaskColumn
                                            title={columnTypes[colKey]}
                                            color={colorByColumn[colKey]}
                                            tasks={colTasks}
                                            isOver={snapshot.isDraggingOver}
                                            onEdit={openEdit}
                                            onDelete={async (task) => {
                                                if (confirm(`Удалить задачу №${task.id}?`)) {
                                                    const prev = tasks; setTasks(ts => ts.filter(t => t.id !== task.id));
                                                    try { await deleteTask(task.id); } catch { setTasks(prev); }
                                                }
                                            }}
                                        />
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </DragDropContext>

                <AddTaskModal
                    open={modalOpen}
                    onClose={closeModal}
                    onSubmit={handleSubmitTask}
                    users={users}
                    loading={saving}
                    initialTask={editingTask}
                />
            </div>
        </div>
    );
}
