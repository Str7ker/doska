// src/pages/ProjectsPage.jsx
import { useEffect, useState } from "react";
import ProjectCard from "../components/ProjectCard";

export default function ProjectsPage({ baseUrl, me }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch(`${baseUrl}/api/projects/`, { credentials: "include" })
            .then(async (r) => (r.ok ? r.json() : []))
            .then((data) => { if (alive) setProjects(data); })
            .catch(() => { if (alive) setProjects([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [baseUrl]);

    return (
        <div className="py-10 px-4">
            <div className="max-w-screen-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-18 font-medium">Проекты</h1>
                    <p className="text-14 text-gray-600">Выберите проект для работы с задачами</p>
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
        </div>
    );
}
