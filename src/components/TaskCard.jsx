// components/TaskCard.jsx
import { useRef, useEffect, useState } from "react";
import { BsThreeDots } from "react-icons/bs";
import {
    MdPeople,
    MdOutlineAccessTime,
    MdDragIndicator,
    MdEdit,
    MdDelete,
} from "react-icons/md";
import { IoCalendarOutline } from "react-icons/io5";
import { Draggable } from "@hello-pangea/dnd";

const pluralDays = (n) => {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return 'дней';
    if (last === 1) return 'день';
    if (last >= 2 && last <= 4) return 'дня';
    return 'дней';
};

const formatDDMM = (isoDateStr) => {
    if (!isoDateStr) return '';
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${dd}.${mm}`;
};

export default function TaskCard({ task, index, onEdit, onDelete }) {
    const [openMenu, setOpenMenu] = useState(false);
    const menuRef = useRef(null);

    const PRIORITY_VIEW = {
        low: { label: 'Низкий', cls: 'bg-[#C3FFBC] border border-green text-[#258419]' },
        medium: { label: 'Средний', cls: 'bg-[#FFFED7] border border-yellow text-yellow' },
        high: { label: 'Высокий', cls: 'bg-[#FFBCBC] border border-[#FFAAAA] text-red' },
        critical: { label: 'Критичный', cls: 'bg-red text-white border border-red' },
    };

    const formatDateRu = (isoDateStr) => {
        if (!isoDateStr) return '';
        const [y, m, d] = isoDateStr.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        const opts = { day: 'numeric', month: 'long' };
        const label = date.toLocaleDateString('ru-RU', opts);
        const now = new Date();
        const yearPart = date.getUTCFullYear() !== now.getUTCFullYear() ? ` ${date.getUTCFullYear()}` : '';
        return label + yearPart;
    };

    const getDaysInfo = (dueDateStr) => {
        if (!dueDateStr) return { days: null, color: 'bg-gray border-gray text-gray-700' };

        const today = new Date();
        const dueDate = new Date(dueDateStr);
        const diffTime = dueDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
        let daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let colorClass = '';
        if (daysLeft >= 5) {
            colorClass = 'bg-[#A6FFC3] border border-green text-green-700';
        } else if (daysLeft >= 3) {
            colorClass = 'bg-[#FFF3B0] border border-yellow text-yellow-700';
        } else {
            colorClass = 'bg-[#FFBCBC] border border-red text-red';
        }

        return { days: daysLeft, color: colorClass };
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <Draggable draggableId={String(task.id)} index={index}>
            {(provided) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="relative rounded-[15px] border border-gray bg-white overflow-hidden flex flex-col hover:shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-shadow group"
                >
                    {/* Меню три точки */}
                    <div className="absolute top-[15px] right-[15px] z-30" ref={menuRef}>
                        <div
                            onClick={() => setOpenMenu(!openMenu)}
                            className="cursor-pointer p-[2px] rounded-[5px] hover:bg-[#F0F0F0] transition-colors"
                        >
                            <BsThreeDots className="text-gray-400 text-xl" />
                        </div>

                        {openMenu && (
                            <div className="absolute right-0 bg-white border border-gray rounded-[10px] shadow-md">
                                <button
                                    className="flex items-center gap-2 px-3 py-1 w-full hover:bg-[#CACACA]/20 transition text-14 text-dark"
                                    onClick={() => {
                                        setOpenMenu(false);
                                        onEdit?.(task);
                                    }}
                                >
                                    <MdEdit className="w-4 h-4" />
                                    Изменить
                                </button>
                                <button
                                    className="flex items-center gap-2 px-3 py-1 w-full hover:bg-[#CACACA]/20 transition text-14 text-red-500"
                                    onClick={() => {
                                        setOpenMenu(false);
                                        onDelete?.(task);
                                    }}
                                >
                                    <MdDelete className="w-4 h-4" />
                                    Удалить
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-4 flex flex-col gap-[10px]">
                        <div className="flex items-center gap-[6px]">
                            <div
                                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
                                {...provided.dragHandleProps}
                            >
                                <MdDragIndicator className="w-4 h-4" />
                            </div>
                            <div className="border border-gray rounded-[5px] px-[10px] py-[2px] text-sm text-dark w-fit">
                                №{task.id}
                            </div>
                        </div>

                        <h3 className="text-16 text-dark">{task.title}</h3>
                        <p className="text-142 text-gray-700 line-clamp-3">{task.description}</p>

                        <div className="flex justify-between items-center mt-2">
                            <div className={`${PRIORITY_VIEW[task.priority]?.cls || 'bg-gray text-dark border border-gray'} text-12 px-[5px] py-[2px] rounded-[5px] w-fit`}>
                                {PRIORITY_VIEW[task.priority]?.label || 'Без приоритета'}
                            </div>
                            <div className="flex items-center gap-[5px] text-sm text-gray-700">
                                <IoCalendarOutline className="w-4 h-4 text-gray-500" />
                                <span>{task.due_date ? formatDateRu(task.due_date) : 'Без срока'}</span>
                            </div>
                        </div>

                        <hr className="w-full h-[1px] bg-[#D8D8D8] border-none my-2" />

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33] w-fit">
                                <MdPeople className="w-4 h-4 text-dark" />
                                <span className="text-14 font-medium">
                                    {task.responsible ? task.responsible.username : "Не назначен"}
                                </span>
                            </div>
                            {task.column === 'done' ? (
                                <div className={`flex items-center gap-[5px] rounded-[10px] px-[10px] py-[2px] text-sm w-fit ${task.done_color || 'bg-gray border border-gray text-gray-700'}`}>
                                    <IoCalendarOutline className="w-4 h-4 text-gray-700" />
                                    <span>{formatDDMM(task.completed_at) || '—'}</span>
                                </div>
                            ) : (
                                (() => {
                                    const { days, color } = getDaysInfo(task.due_date);
                                    return (
                                        <div className={`flex items-center gap-[5px] rounded-[10px] px-[10px] py-[2px] text-sm w-fit ${color}`}>
                                            <MdOutlineAccessTime className="w-4 h-4" />
                                            <span>
                                                {days !== null ? `${days} ${pluralDays(days)}` : 'Без срока'}
                                            </span>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
