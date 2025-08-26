// src/pages/ProjectsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import {
    IoPlayCircleOutline,
    IoTimerOutline,
    IoAlertCircleOutline,
    IoFolderOpenOutline,
} from "react-icons/io5";
import ProjectCard from "../components/ProjectCard";
import AddProjectModal from "../components/AddProjectModal";

export default function ProjectsPage({ baseUrl, me }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    // для сводных метрик
    const [tasksAll, setTasksAll] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);

    const getCookie = (name) =>
        document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() || "";

    // --- загрузки ---
    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch(`${baseUrl}/api/projects/`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => alive && setProjects(Array.isArray(data) ? data : []))
            .finally(() => alive && setLoading(false));
        return () => (alive = false);
    }, [baseUrl]);

    useEffect(() => {
        let alive = true;
        fetch(`${baseUrl}/api/users/`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => alive && setUsers(Array.isArray(data) ? data : []))
            .catch(() => alive && setUsers([]));
        return () => (alive = false);
    }, [baseUrl]);

    useEffect(() => {
        let alive = true;
        setLoadingStats(true);
        fetch(`${baseUrl}/api/tasks/`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => alive && setTasksAll(Array.isArray(data) ? data : []))
            .finally(() => alive && setLoadingStats(false));
        return () => (alive = false);
    }, [baseUrl]);

    // --- helpers API ---
    const createProject = async (payload) => {
        const res = await fetch(`${baseUrl}/api/projects/`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Create error"));
        return res.json();
    };

    const patchProject = async (id, payload) => {
        const res = await fetch(`${baseUrl}/api/projects/${id}/`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Patch error"));
        return res.json();
    };

    const deleteProject = async (id) => {
        const res = await fetch(`${baseUrl}/api/projects/${id}/`, {
            method: "DELETE",
            credentials: "include",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        if (!res.ok && res.status !== 204) {
            throw new Error(await res.text().catch(() => "Delete error"));
        }
    };

    // --- handlers ---
    const handleCreate = async (payload) => {
        try {
            setSaving(true);
            const created = await createProject(payload);
            setProjects((prev) => [created, ...prev]);
            setModalOpen(false);
        } catch (e) {
            alert(e.message || "Не удалось создать проект");
        } finally {
            setSaving(false);
        }
    };

    const handleEditOpen = (project) => {
        setEditingProject(project);
        setModalOpen(true);
    };

    const handleEditSubmit = async (payload) => {
        if (!editingProject) return;
        try {
            setSaving(true);
            const updated = await patchProject(editingProject.id, payload);
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setModalOpen(false);
            setEditingProject(null);
        } catch (e) {
            alert(e.message || "Не удалось сохранить проект");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (project) => {
        const prev = projects;
        setProjects((ps) => ps.filter((p) => p.id !== project.id));
        try {
            await deleteProject(project.id);
        } catch (e) {
            alert(e.message || "Не удалось удалить проект");
            setProjects(prev);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProject(null);
    };

    // --- сводные метрики ---
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const stats = useMemo(() => {
        const tasks = tasksAll || [];
        const myId = me?.id;

        // мои задачи
        const mine = tasks.filter(t => t.responsible?.id === myId);

        // 1) действующие (всё, что не выполнено)
        const activeAllMine = mine.filter(t => t.column !== "done").length;

        // 2) активные (всё, что не new и не done)
        const myActive = mine.filter(t => !["new", "done"].includes(t.column)).length;

        // 3) просрочено (не done и дедлайн раньше сегодняшней даты)
        const today0 = new Date(); today0.setHours(0, 0, 0, 0);
        const myOverdue = mine.filter(t => {
            if (t.column === "done") return false;
            if (!t.due_date) return false;
            const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
            return d < today0; // вчера и раньше
        }).length;

        const projectsCount = projects.length;

        return { activeAllMine, myActive, myOverdue, projectsCount };
    }, [tasksAll, projects, me]);

    const rgba = (hex, a = 0.2) => {
        let h = hex.replace("#", "");
        if (h.length === 3) h = h.split("").map((c) => c + c).join("");
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    // хелпер русской плюрализации
    const ruPlural = (n, one, few, many) => {
        const mod10 = n % 10, mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;                 // 1
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few; // 2–4
        return many;                                                  // 0,5–20, …
    };

    // вместо const tiles = [...] со строковыми label:
    const tiles = [
        {
            key: "activeAllMine",
            value: stats.activeAllMine,
            Icon: IoPlayCircleOutline,
            color: "#153D8A",
            label: (n) => ruPlural(n, "Действующая задача", "Действующие задачи", "Действующих задач"),
        },
        {
            key: "myActive",
            value: stats.myActive,
            Icon: IoTimerOutline,
            color: "#E3AA41",
            label: (n) => ruPlural(n, "Активная задача", "Активные задачи", "Активных задач"),
        },
        {
            key: "myOverdue",
            value: stats.myOverdue,
            Icon: IoAlertCircleOutline,
            color: "#E44F4F",
            label: (n) => ruPlural(n, "Просроченная задача", "Просроченные задачи", "Просроченных задач"),
        },
        {
            key: "projects",
            value: stats.projectsCount,
            Icon: IoFolderOpenOutline,
            color: "#46DD32",
            label: (n) => ruPlural(n, "Проект", "Проекта", "Проектов"),
        },
    ];


    return (
        <div className="py-10 px-4">
            <div className="max-w-screen-2xl mx-auto">
                {/* ===== Шапка ===== */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-18 font-medium">Проекты</h1>
                        <p className="text-14 text-gray-600">Выберите проект для работы с задачами</p>
                    </div>
                    <button
                        onClick={() => { setEditingProject(null); setModalOpen(true); }}
                        className="group flex items-center gap-2 rounded-[20px] px-[20px] py-[10px] border border-dashed border-darkblue text-darkblue transition hover:bg-darkblue hover:text-white"
                    >
                        <FaPlus className="w-4 h-4" />
                        <span className="text-14 font-medium">ДОБАВИТЬ ПРОЕКТ</span>
                    </button>
                </div>

                {/* ИТОГО — 4 карточки в ряд (замените весь ваш блок рендера плиток) */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {tiles.map(({ label, value, Icon, color }) => (
                        <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#E6E6E6] bg-white p-4">
                            <div className="rounded-[10px] p-[10px]" style={{ backgroundColor: rgba(color, 0.2) }}>
                                <Icon style={{ color, width: 24, height: 24 }} />
                            </div>
                            <div className="flex flex-col text-left">
                                <div className="text-20 font-semibold text-dark">{loadingStats ? "—" : value}</div>
                                <div className="text-14 text-gray-600">{loadingStats ? "" : label(value)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ===== Сетка проектов ===== */}
                {loading ? (
                    <div className="text-14 text-gray-600">Загрузка…</div>
                ) : projects.length === 0 ? (
                    <div className="text-14 text-gray-600">Проектов пока нет.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((p) => (
                            <ProjectCard
                                key={p.id}
                                baseUrl={baseUrl}
                                project={p}
                                me={me}
                                onEdit={handleEditOpen}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка добавления/редактирования проекта */}
            <AddProjectModal
                open={modalOpen}
                onClose={closeModal}
                onSubmit={editingProject ? handleEditSubmit : handleCreate}
                users={users}
                loading={saving}
                initialProject={editingProject}
            />
        </div>
    );
}
