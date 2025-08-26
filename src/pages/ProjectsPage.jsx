// src/pages/ProjectsPage.jsx
import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import ProjectCard from "../components/ProjectCard";
import AddProjectModal from "../components/AddProjectModal";

export default function ProjectsPage({ baseUrl, me }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProject, setEditingProject] = useState(null); // ← режим редактирования

    const getCookie = (name) =>
        document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() || "";

    // загрузка проектов
    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch(`${baseUrl}/api/projects/`, { credentials: "include" })
            .then(async (r) => (r.ok ? r.json() : []))
            .then((data) => { if (alive) setProjects(Array.isArray(data) ? data : []); })
            .catch(() => { if (alive) setProjects([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [baseUrl]);

    // все пользователи для выбора «людей в проекте»
    useEffect(() => {
        let alive = true;
        fetch(`${baseUrl}/api/users/`, { credentials: "include" })
            .then(async (r) => (r.ok ? r.json() : []))
            .then((data) => { if (alive) setUsers(Array.isArray(data) ? data : []); })
            .catch(() => { if (alive) setUsers([]); });
        return () => { alive = false; };
    }, [baseUrl]);

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
        if (!res.ok) {
            let msg = "Не удалось создать проект";
            try { msg += ": " + (await res.text()); } catch { }
            throw new Error(msg);
        }
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
        if (!res.ok) {
            let msg = "Не удалось сохранить проект";
            try { msg += ": " + (await res.text()); } catch { }
            throw new Error(msg);
        }
        return res.json();
    };

    const deleteProject = async (id) => {
        const res = await fetch(`${baseUrl}/api/projects/${id}/`, {
            method: "DELETE",
            credentials: "include",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        if (!res.ok && res.status !== 204) {
            let msg = "Не удалось удалить проект";
            try { msg += ": " + (await res.text()); } catch { }
            throw new Error(msg);
        }
    };

    const handleCreate = async (payload) => {
        try {
            setSaving(true);
            const created = await createProject(payload);
            setProjects((prev) => [created, ...prev]);
            setModalOpen(false);
        } catch (e) {
            alert(e.message);
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
            alert(e.message);
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
            alert(e.message);
            setProjects(prev);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProject(null);
    };

    return (
        <div className="py-10 px-4">
            <div className="max-w-screen-2xl mx-auto">
                {/* Шапка и кнопка ДОБАВИТЬ ПРОЕКТ */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-18 font-medium">Проекты</h1>
                        <p className="text-14 text-gray-600">Выберите проект для работы с задачами</p>
                    </div>
                    <button
                        onClick={() => { setEditingProject(null); setModalOpen(true); }}
                        className="group flex items-center gap-2 rounded-[20px] px-[20px] py-[10px] border border-dashed border-darkblue text-darkblue transition hover:bg-darkblue hover:text-white"
                        title="Создать проект"
                    >
                        <FaPlus className="w-4 h-4" />
                        <span className="text-14 font-medium">ДОБАВИТЬ ПРОЕКТ</span>
                    </button>
                </div>

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

            <AddProjectModal
                open={modalOpen}
                onClose={closeModal}
                onSubmit={editingProject ? handleEditSubmit : handleCreate}
                users={users}
                loading={saving}
                initialProject={editingProject} // ← режим редактирования
            />
        </div>
    );
}
