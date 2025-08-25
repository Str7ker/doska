// src/components/ProjectCard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoAlertCircleOutline, IoPeopleOutline, IoCalendarOutline, IoChevronForward } from "react-icons/io5";

function ruPlural(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;                 // 1 задача
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) // 2–4 задачи
        return few;
    return many;                                                   // 0, 5–20 задач
}

export default function ProjectCard({ baseUrl, project, me }) {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // грузим задачи этого проекта
    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch(`${baseUrl}/api/tasks/?project=${project.id}`, { credentials: "include" })
            .then(async (r) => (r.ok ? r.json() : []))
            .then((data) => { if (alive) setTasks(Array.isArray(data) ? data : []); })
            .catch(() => { if (alive) setTasks([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [baseUrl, project.id]);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // расчёты
    const metrics = useMemo(() => {
        const totalAll = tasks.length;
        const doneAll = tasks.filter(t => t.column === "done").length;
        const newAll = tasks.filter(t => t.column === "new").length;
        const activeAll = tasks.filter(t => ["in_progress", "testing", "review"].includes(t.column)).length;

        const mine = tasks.filter(t => t.responsible?.id === me?.id);
        const totalMine = mine.length;
        const doneMine = mine.filter(t => t.column === "done").length;
        const newMine = mine.filter(t => t.column === "new").length;
        const activeMine = mine.filter(t => ["in_progress", "testing", "review"].includes(t.column)).length;

        const overdueMine = mine.filter(t => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            d.setHours(0, 0, 0, 0);
            return d < today && t.column !== "done";
        }).length;

        const progress = totalAll ? Math.round((doneAll / totalAll) * 100) : 0;

        // участники: уникальные ответственные (не null)
        const peopleIds = new Set(tasks.map(t => t.responsible?.id).filter(Boolean));
        const peopleCount = peopleIds.size;

        return {
            totalAll, doneAll, newAll, activeAll,
            totalMine, doneMine, newMine, activeMine,
            overdueMine, progress, peopleCount,
        };
    }, [tasks, me, today]);

    const gotoProject = () => navigate(`/projects/${project.id}`);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={gotoProject}
            onKeyDown={(e) => { if (e.key === "Enter") gotoProject(); }}
            className="group rounded-2xl border border-[#D8D8D8] bg-white p-4 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)] transition cursor-pointer flex flex-col gap-[10px]"
            title="Открыть проект"
        >
            {/* Заголовок + описание */}
            <div>
                <div className="text-18 font-medium text-dark mb-1">{project.title}</div>
                <div className="text-16 text-gray-600">
                    {project.description || "Без описания"}
                </div>
            </div>

            {/* Прогресс */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-14 text-dark">Прогресс выполнения задач проекта</span>
                    <span className="text-14 font-medium">{metrics.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#EFEFEF] overflow-hidden">
                    <div
                        className="h-full bg-darkblue transition-all"
                        style={{ width: `${metrics.progress}%` }}
                    />
                </div>
            </div>

            {/* Метрики пользователя (и общее в скобках) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="Всего" mine={metrics.totalMine} all={metrics.totalAll} />
                <Metric label="Новые" mine={metrics.newMine} all={metrics.newAll} />
                <Metric label="Активные" mine={metrics.activeMine} all={metrics.activeAll} colorClass="text-blue" />
                <Metric label="Сделано" mine={metrics.doneMine} all={metrics.doneAll} colorClass="text-green" />
            </div>

            {/* Просрочено у пользователя */}
            {(() => {
                const n = metrics.overdueMine;
                const color = n > 0 ? "text-red" : "text-green";
                return (
                    <div className={`flex items-center gap-2 text-142 ${color}`}>
                        <IoAlertCircleOutline className="w-5 h-5" />
                        <span className="font-medium">
                            {n} {ruPlural(n, "задача просрочена", "задачи просрочены", "задач просрочено")}
                        </span>
                    </div>
                );
            })()}

            <hr className="w-full h-[1px] bg-[#D8D8D8] border-none" />

            {/* Люди в проекте и срок сдачи */}
            <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-14">
                    <IoPeopleOutline className="w-5 h-5 text-dark" />
                    <span>
                        <span className="font-medium">{metrics.peopleCount}</span> в проекте
                    </span>
                </div>
                <div className="flex items-center gap-2 text-14">
                    <IoCalendarOutline className="w-5 h-5 text-dark" />
                    <span>
                        Срок сдачи — <span className="font-medium">{formatRuDateLabel(project.due_date)}</span>
                    </span>
                </div>
            </div>

            {/* Кнопка перехода */}
            <div>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); gotoProject(); }}
                    className="group w-full rounded-[10px] border border-darkblue text-darkblue px-4 py-2 text-14 font-medium
               hover:bg-darkblue hover:text-white transition flex items-center justify-center gap-2"
                >
                    <span>Перейти в проект</span>
                    <IoChevronForward className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>

            {loading && (
                <div className="absolute inset-0 rounded-2xl bg-white/40 pointer-events-none" />
            )}
        </div>
    );
}

function Metric({ label, mine, all, colorClass = "" }) {
    return (
        <div>

            <div className="text-18 font-medium text-center">
                <span className={colorClass || "text-dark"}>{mine}</span>{" "}
                <span className={`text-16 ${colorClass || "text-gray-500"}`}>({all})</span>
            </div>
            <div className="text-16 text-gray-600 text-center">{label}</div>
        </div>
    );
}

function formatRuDateLabel(dateStr) {
    if (!dateStr) return "Не задан";
    const d = new Date(dateStr);
    if (isNaN(d)) return "Не задан";
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return `${d.getDate()} ${months[d.getMonth()]}${sameYear ? "" : " " + d.getFullYear()}`;
}

