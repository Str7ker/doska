import { useState, useEffect } from 'react';
import { FaPlus, FaCircle, FaSearch } from 'react-icons/fa';
import { MdChecklist, MdPeople } from "react-icons/md";
import TaskColumn from './components/TaskColumn';
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import AddTaskModal from "./components/TaskModal"; // 👈 та же модалка, теперь и редактирует

import Switch from './components/Switch';

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:8000";

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

  // === API helper ===
  const deleteTask = async (id) => {
    const getCookie = (name) => (document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '');

    const doDelete = async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text().catch(() => '');
        throw new Error(`DELETE ${id} failed: ${res.status} ${text}`);
      }
    };

    try {
      await doDelete();
    } catch (e) {
      // если токена нет/просрочен — подтянуть и попробовать ещё раз
      if (String(e.message).includes('403') && /CSRF|csrf/i.test(e.message)) {
        await fetch(`${BASE_URL}/api/csrf/`, { credentials: 'include' });
        await doDelete();
      } else {
        throw e;
      }
    }
  };

  // === Handler ===
  const handleDeleteTask = async (task) => {
    if (!task?.id) return;

    // подтверждение
    if (!confirm(`Удалить задачу №${task.id} "${task.title}"? Это действие необратимо.`)) {
      return;
    }

    // оптимистичное удаление
    const prev = tasks;
    setTasks((ts) => ts.filter(t => t.id !== task.id));

    try {
      await deleteTask(task.id);
    } catch (e) {
      console.error(e);
      setTasks(prev); // откат
      alert('Не удалось удалить задачу на сервере.');
    }
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
    fetch(`${BASE_URL}/api/csrf/`, { credentials: 'include' }).catch(() => { });
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/tasks/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`GET /tasks ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setTasks([]); // не даём упасть рендеру
        alert('Не удалось загрузить задачи (возможно, не авторизован).');
      });
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/users/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`GET /users ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setUsers([]);
      });
  }, []);

  // API helpers
  const getCookie = (name) => {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  };

  // === Images API ===
  const uploadOneImage = async (taskId, file, position = 0) => {
    if (!taskId) throw new Error("Не указан ID задачи для загрузки изображения");
    if (!(file instanceof File)) throw new Error("Передан невалидный файл");

    const fd = new FormData();
    fd.append("task", String(taskId)); // ID задачи как строка
    fd.append("image", file);          // сам файл
    fd.append("position", String(position)); // позиция

    const res = await fetch(`${BASE_URL}/api/task-images/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: fd,
    });

    // Логируем, если сервер вернул ошибку
    if (!res.ok) {
      let errorText = await res.text().catch(() => "");
      try {
        const jsonErr = JSON.parse(errorText);
        console.error("Ошибка загрузки изображения:", jsonErr);
        throw new Error(`Upload failed: ${res.status} ${JSON.stringify(jsonErr)}`);
      } catch {
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }
    }

    return res.json(); // Вернёт объект с id, url и т.п.
  };


  const deleteImage = async (imageId) => {
    const res = await fetch(`${BASE_URL}/api/task-images/${imageId}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    });
    if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
  };

  const patchImage = async (imageId, patch) => {
    const res = await fetch(`${BASE_URL}/api/task-images/${imageId}/`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(patch), // например { position: 2 } или { task: 5, position: 0 }
    });
    if (!res.ok) throw new Error(`Patch image failed: ${res.status}`);
    return res.json();
  };

  // createTask
  // === API helper: create ===
  const createTask = async (payload) => {
    const doPost = async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        // попробуем распарсить JSON-ошибку DRF
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        const msg = data ? JSON.stringify(data) : text;
        throw new Error(`POST /tasks ${res.status}: ${msg || 'Unknown error'}`);
      }
      return JSON.parse(text);
    };

    try {
      return await doPost();
    } catch (e) {
      // если CSRF отсутствует — подтянем и повторим ОДИН раз
      if (String(e.message).includes('403') && /CSRF|csrf/i.test(e.message)) {
        await fetch(`${BASE_URL}/api/csrf/`, { credentials: 'include' });
        return await doPost();
      }
      throw e;
    }
  };


  // patchTask
  const patchTask = async (id, payload) => {
    const res = await fetch(`${BASE_URL}/api/tasks/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`PATCH ${id} failed: ${res.status} ${t}`); }
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

      const todayISO = new Date().toISOString().slice(0, 10);
      const goingDone = formPayload.column === 'done';
      const dueForColor = editingTask?.due_date ?? formPayload.due_date ?? null;

      // Базовый payload в API
      let payload = { ...formPayload };
      if (goingDone) {
        payload.completed_at = todayISO;
        payload.done_color = computeDoneColor(todayISO, dueForColor);
      }
      // Если нужно очищать при уходе из done — раскомментируй:
      // else { payload.completed_at = null; payload.done_color = null; }

      if (editingTask) {
        // ===== РЕЖИМ РЕДАКТИРОВАНИЯ =====
        const prevTasks = tasks;

        // Оптимистичное обновление (ответственного кладём объектом)
        const optimisticPatch = {
          ...payload,
          ...(payload.responsible_id !== undefined
            ? { responsible: toRespObj(payload.responsible_id, users) }
            : {}),
        };
        setTasks(ts => ts.map(t => t.id === editingTask.id ? { ...t, ...optimisticPatch } : t));

        try {
          // 1) PATCH самой задачи
          await patchTask(editingTask.id, payload);

          const {
            __newFiles = [],
            __deleteImageIds = [],
            __reorder = [],
          } = formPayload;

          // 2) Сначала УДАЛЯЕМ те, что помечены
          for (const id of __deleteImageIds) {
            try { await deleteImage(id); } catch (err) { console.warn('deleteImage:', err); }
          }

          // 3) Подтягиваем свежую задачу (после удаления), чтобы знать актуальную длину массива
          let refreshed = await fetch(`${BASE_URL}/api/tasks/${editingTask.id}/`, { credentials: 'include' })
            .then(r => r.json());

          // 4) Загружаем НОВЫЕ файлы подряд (позиции от текущей длины)
          const startPos = Array.isArray(refreshed.images) ? refreshed.images.length : 0;
          for (let i = 0; i < __newFiles.length; i++) {
            try {
              await uploadOneImage(editingTask.id, __newFiles[i], startPos + i);
            } catch (err) {
              console.warn('uploadOneImage:', err);
            }
          }

          // 5) Если есть перестановки, применяем их
          for (const { id, position } of __reorder) {
            try {
              await patchImage(id, { position });
            } catch { }
          }

          // 6) Финальный рефреш задачи (с уже загруженными/переставленными фотками)
          refreshed = await fetch(`${BASE_URL}/api/tasks/${editingTask.id}/`, { credentials: 'include' })
            .then(r => r.json());

          // 7) Нормализуем responsible и страхуем done-поля
          const normalized = {
            ...refreshed,
            ...(refreshed.responsible !== undefined
              ? { responsible: toRespObj(refreshed.responsible, users) }
              : (payload.responsible_id !== undefined
                ? { responsible: toRespObj(payload.responsible_id, users) }
                : {})),
            ...(payload.completed_at !== undefined ? { completed_at: payload.completed_at } : {}),
            ...(payload.done_color !== undefined ? { done_color: payload.done_color } : {}),
          };

          // 8) Обновляем в общем списке
          setTasks(prev => prev.map(t => (t.id === refreshed.id ? normalized : t)));

          // Закрываем модалку
          setModalOpen(false);
          setEditingTask(null);
        } catch (e) {
          console.error(e);
          setTasks(prevTasks); // откат оптимистики
          alert('Не удалось сохранить задачу.');
        }
      } else {
        // ===== РЕЖИМ СОЗДАНИЯ =====
        // 1) Создаём задачу
        const created = await createTask(payload);

        // 2) Если прикладывали файлы — грузим их
        const { __newFiles = [] } = formPayload;
        for (let i = 0; i < __newFiles.length; i++) {
          try {
            await uploadOneImage(created.id, __newFiles[i], i);
          } catch (err) {
            console.warn('uploadOneImage:', err);
          }
        }

        // 3) Подтягиваем полную задачу с сервера (важно: с credentials)
        const createdFull = await fetch(`${BASE_URL}/api/tasks/${created.id}/`, { credentials: 'include' })
          .then(r => r.json());

        const createdNormalized = {
          ...createdFull,
          ...(createdFull.responsible !== undefined
            ? { responsible: toRespObj(createdFull.responsible, users) }
            : (payload.responsible_id !== undefined
              ? { responsible: toRespObj(payload.responsible_id, users) }
              : {})),
          ...(payload.completed_at !== undefined ? { completed_at: payload.completed_at } : {}),
          ...(payload.done_color !== undefined ? { done_color: payload.done_color } : {}),
        };

        // 4) Вставляем в начало списка
        setTasks(prev => [createdNormalized, ...prev]);
        setSearchQuery(""); // чтобы новая задача не спряталась под поиском
        setModalOpen(false);
        setEditingTask(null);
      }
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
            <span className="text-14 font-medium">
              {tasks.filter(t => ['in_progress', 'testing', 'review'].includes(t.column)).length} Выполняется
            </span>          </div>
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
                      onEdit={openEdit}
                      onDelete={handleDeleteTask}
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
