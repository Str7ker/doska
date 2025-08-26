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

    const getCookie = (name) =>
        document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() || "";

    // загрузка проектов
    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch(`${baseUrl}/api/projects/`, { credentials: "include" })
            .then(async (r) => (r.ok ? r.json() : []))
            .then((data) => {
                if (alive) setProjects(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (alive) setProjects([]);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [baseUrl]);

    // загрузка всех пользователей для выбора «людей в проекте»
    useEffect(() => {
        let alive = true;
        fetch(`${baseUrl}/api/users/`, { credentials: "include" })
            .then(async (r) => (r.ok ? r.json() : []))
            .then((data) => {
                if (alive) setUsers(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (alive) setUsers([]);
            });
        return () => {
            alive = false;
        };
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
            try {
                msg += ": " + (await res.text());
            } catch { }
            throw new Error(msg);
        }
        return res.json();
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

    return (
        <div className="py-10 px-4">
            <div className="max-w-screen-2xl mx-auto">
                {/* Шапка и кнопка ДОБАВИТЬ ПРОЕКТ (как у задач) */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-18 font-medium">Проекты</h1>
                        <p className="text-14 text-gray-600">Выберите проект для работы с задачами</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
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
                            <ProjectCard key={p.id} baseUrl={baseUrl} project={p} me={me} />
                        ))}
                    </div>
                )}
            </div>

            <AddProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleCreate}
                users={users}
                loading={saving}
            />
        </div>
    );
}
