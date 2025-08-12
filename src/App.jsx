import { useState, useEffect } from 'react';
import { FaPlus, FaCircle, FaSearch } from 'react-icons/fa';
import { MdChecklist, MdPeople } from "react-icons/md";
import TaskColumn from './components/TaskColumn';
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import AddTaskModal from "./components/TaskModal"; // 👈 та же модалка, теперь и редактирует

import Switch from './components/Switch';

const BASE_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);

  const columnTypes = {
    new: "Новые",
    in_progress: "Выполняются",
    testing: "Тестирование",
    review: "Правки",
    done: "Выполнено"
  };

  const colorByColumn = {
    new: "gray",
    in_progress: "darkblue",
    testing: "yellow",
    review: "red",
    done: "green",
  };

  // Фильтр
  const q = searchQuery.trim().toLowerCase();
  const filteredTasks = q
    ? tasks.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    )
    : tasks;

  // Раскладка по колонкам
  const tasksByColumn = { new: [], in_progress: [], testing: [], review: [], done: [] };
  filteredTasks.forEach(task => {
    if (tasksByColumn[task.column]) {
      tasksByColumn[task.column].push(task);
    }
  });

  useEffect(() => {
    fetch(`${BASE_URL}/api/tasks/`)
      .then(res => res.json())
      .then(data => setTasks(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/users/`)
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(console.error);
  }, []);

  // API helpers
  const createTask = async (payload) => {
    const res = await fetch(`${BASE_URL}/api/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST failed: ${res.status} ${text}`);
    }
    return res.json();
  };

  const patchTask = async (id, payload) => {
    const res = await fetch(`${BASE_URL}/api/tasks/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`PATCH ${id} failed: ${res.status} ${text}`);
    }
    return res.json();
  };

  // DnD
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const fromCol = source.droppableId;
    const toCol = destination.droppableId;
    const taskId = Number(draggableId);

    if (fromCol === toCol) return;

    const targetTask = tasks.find(t => t.id === taskId);
    const patchPayload = { column: toCol };

    if (toCol === 'done') {
      const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      patchPayload.completed_at = todayISO;
      patchPayload.done_color = computeDoneColor(todayISO, targetTask?.due_date || null);
    }

    // оптимистичное обновление
    const prevTasks = tasks;
    const nextTasks = tasks.map(t =>
      t.id === taskId
        ? {
          ...t,
          column: toCol,
          ...(toCol === 'done' ? {
            completed_at: patchPayload.completed_at,
            done_color: patchPayload.done_color,
          } : {})
        }
        : t
    );
    setTasks(nextTasks);

    try {
      await patchTask(taskId, patchPayload);
    } catch (e) {
      console.error(e);
      setTasks(prevTasks);
      alert('Не удалось сохранить статус на сервере.');
    }
  };

  const computeDoneColor = (completedISO, dueISO) => {
    if (!completedISO || !dueISO) return 'bg-gray border border-gray text-gray-700';
    const c = new Date(completedISO);
    const d = new Date(dueISO);
    c.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return c.getTime() > d.getTime()
      ? 'bg-[#FFBCBC] border border-red text-red'
      : 'bg-[#A6FFC3] border border-green text-green-700';
  };

  // Превращаем responsible (id или объект) в объект пользователя из списка users
  const toRespObj = (val, users) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    if (typeof val === 'number') return users.find(u => u.id === val) || { id: val };
    return null;
  };

  // Handlers
  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmitTask = async (formPayload) => {
    try {
      setSaving(true);

      const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const goingDone = formPayload.column === 'done';
      const dueForColor = editingTask?.due_date ?? formPayload.due_date ?? null;

      // Готовим payload для API
      let payload = { ...formPayload };
      if (goingDone) {
        payload.completed_at = todayISO;
        // computeDoneColor должен быть объявлен выше (зелёный если в срок, красный если просрочено)
        payload.done_color = computeDoneColor(todayISO, dueForColor);
      }
      // Если нужно очищать дату/цвет при выходе из done — раскомментируй:
      // else {
      //   payload.completed_at = null;
      //   payload.done_color = null;
      // }

      if (editingTask) {
        // ===== Оптимистичное обновление в списке =====
        const prevTasks = tasks;

        // Ответственного кладём в state как ОБЪЕКТ (карточка ждёт object, не id)
        const optimisticPayload = {
          ...payload,
          ...(payload.responsible !== undefined
            ? { responsible: toRespObj(payload.responsible, users) }
            : {}),
        };

        const optimistic = tasks.map(t =>
          t.id === editingTask.id ? { ...t, ...optimisticPayload } : t
        );
        setTasks(optimistic);

        try {
          // ===== PATCH на сервер =====
          const updated = await patchTask(editingTask.id, payload);

          // Сервер мог вернуть responsible как id → приводим к объекту
          const normalized = {
            ...updated,
            ...(updated.responsible !== undefined
              ? { responsible: toRespObj(updated.responsible, users) }
              : {}),
          };

          // Страхуемся: если сервер не вернул/переопределил completed_at/done_color — оставим наши
          const merged = {
            ...normalized,
            ...(payload.completed_at !== undefined ? { completed_at: payload.completed_at } : {}),
            ...(payload.done_color !== undefined ? { done_color: payload.done_color } : {}),
          };

          setTasks(prev => prev.map(t => (t.id === merged.id ? merged : t)));
        } catch (e) {
          console.error(e);
          setTasks(prevTasks); // откат
          alert('Не удалось сохранить задачу.');
        }
      } else {
        // ===== Создание =====
        const created = await createTask(payload);

        const createdNormalized = {
          ...created,
          ...(created.responsible !== undefined
            ? { responsible: toRespObj(created.responsible, users) }
            : (payload.responsible !== undefined
              ? { responsible: toRespObj(payload.responsible, users) }
              : {})),
          ...(payload.completed_at !== undefined ? { completed_at: payload.completed_at } : {}),
          ...(payload.done_color !== undefined ? { done_color: payload.done_color } : {}),
        };

        setTasks(prev => [createdNormalized, ...prev]);
      }

      setModalOpen(false);
      setEditingTask(null);
    } catch (e) {
      console.error(e);
      alert('Не удалось сохранить задачу.');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="min-h-screen bg-white py-10 px-4 ">
      <div className="max-w-screen-2xl mx-auto  ">
        <div className="flex justify-between items-center mb-3 ">
          <div>
            <h1 className="text-18 font-medium">Заголовок проекта</h1>
            <h1 className="text-16">Описание проекта</h1>
          </div>
          <button
            onClick={openCreate}
            className="group flex items-center gap-2 rounded-[20px] px-[20px] py-[10px] border border-dashed border-darkblue text-darkblue transition hover:bg-darkblue"
          >
            <FaPlus className="w-4 h-4 text-darkblue transition group-hover:text-white" />
            <span className="text-14 font-medium transition group-hover:text-white">ДОБАВИТЬ ЗАДАЧУ</span>
          </button>
        </div>

        <div className="flex gap-3 items-center mb-3">
          <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33]">
            <MdChecklist className="w-4 h-4 text-dark" />
            <span className="text-14 font-medium">{tasks.length} Всего</span>
          </div>
          <div className="flex items-center gap-2 px-[10px] py-[2px] rounded-[10px] bg-[#CACACA33]">
            <FaCircle className="w-2 h-2 text-blue" />
            <span className="text-14 font-medium">{tasks.filter(t => t.column === 'in_progress').length} Выполняется</span>
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

        {/* Контейнеры задач с DnD */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-[15px] w-full items-start">
            {Object.entries(tasksByColumn).map(([colKey, colTasks]) => (
              <Droppable droppableId={colKey} key={colKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1"
                  >
                    <TaskColumn
                      title={columnTypes[colKey]}
                      color={colorByColumn[colKey]}
                      tasks={colTasks}
                      isOver={snapshot.isDraggingOver}
                      onEdit={openEdit} // 👈 прокидываем коллбек редактирования
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {/* Единая модалка "создать/изменить" */}
        <AddTaskModal
          open={modalOpen}
          onClose={closeModal}
          onSubmit={handleSubmitTask}
          users={users}
          loading={saving}
          initialTask={editingTask} // 👈 если есть — редактируем
        />
      </div>
    </div>
  );
}
