// components/TaskColumn.jsx
import TaskCard from "./TaskCard";

const colorMap = {
    gray: "bg-gray",
    darkblue: "bg-darkblue",
    yellow: "bg-yellow",
    red: "bg-red",
    green: "bg-green",
};

export default function TaskColumn({ title, color, tasks, isOver = false, onEdit, onDelete }) {
    return (
        <div
            className={[
                "relative flex flex-col gap-[10px] rounded-[12px] p-[2px] transition-all overflow-hidden",
                isOver ? "ring-2 ring-darkblue/40 bg-darkblue/5" : ""
            ].join(" ")}
        >
            {isOver && (
                <div
                    className="
            absolute inset-0 z-10 pointer-events-none
            rounded-[12px]
            border-2 border-dashed border-darkblue/60
            bg-white/30
            backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-lg
            opacity-100 transition-opacity duration-150
            motion-safe:animate-none
          "
                >
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="px-3 py-1 rounded-[8px] bg-white/90 text-14 text-darkblue font-medium shadow-sm">
                            Отпустите, чтобы переместить
                        </span>
                    </div>
                </div>
            )}

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 rounded-[10px] bg-white">
                    <div className={`w-9 h-9 rounded-full ${colorMap[color]} mb-2`} />
                    <p className="text-14 text-gray-600 font-medium">Нет задач</p>
                    <p className="text-14 text-gray-400">
                        Переместите задачу сюда
                        <br />
                        или создайте новую
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-[10px] rounded-[10px] bg-white p-0.5">
                    {tasks.map((task, i) => (
                        <TaskCard key={task.id} task={task} index={i} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                    {isOver && (
                        <div className="h-2 -mb-1 rounded-[4px] border border-dashed border-darkblue/50 bg-darkblue/10 transition-all" />
                    )}
                </div>
            )}
        </div>
    );
}
