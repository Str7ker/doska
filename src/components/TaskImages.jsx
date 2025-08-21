// components/TaskImages.jsx
import { useEffect, useRef, useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { FaTimes } from 'react-icons/fa';

export default function TaskImages({
    existing = [],               // [{id, url, position}]
    onChange                     // ({ files, deleteIds, reorder }) -> void
}) {
    const [localExisting, setLocalExisting] = useState(existing.slice(0, 4));
    const [newFiles, setNewFiles] = useState([]); // File[]
    const [newFileUrls, setNewFileUrls] = useState([]); // string[]
    const dropRef = useRef(null);

    useEffect(() => { setLocalExisting(existing.slice(0, 4)); }, [existing]);

    // Генерируем objectURL для новых файлов и чистим при изменении
    useEffect(() => {
        const urls = newFiles.map(f => URL.createObjectURL(f));
        setNewFileUrls(urls);
        return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
    }, [newFiles]);

    const totalCount = localExisting.length + newFiles.length;

    const emit = (nextExisting, nextNew) => {
        const deleteIds = existing
            .filter(e => !nextExisting.find(x => x.id === e.id))
            .map(e => e.id);

        const reorder = nextExisting.map((e, idx) => ({ id: e.id, position: idx }));

        onChange?.({
            files: nextNew,
            deleteIds,
            reorder,
        });
    };

    const addFiles = (files) => {
        if (!files?.length) return;
        const allowed = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!allowed.length) return;

        const free = Math.max(0, 4 - (localExisting.length + newFiles.length));
        const toAdd = allowed.slice(0, free);

        const nextNew = [...newFiles, ...toAdd];
        setNewFiles(nextNew);
        emit(localExisting, nextNew);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addFiles(e.dataTransfer.files);
    };

    const onPaste = (e) => {
        const items = e.clipboardData?.items || [];
        const files = [];
        for (const it of items) {
            if (it.kind === 'file') {
                const f = it.getAsFile();
                if (f && f.type.startsWith('image/')) files.push(f);
            }
        }
        if (files.length) addFiles(files);
    };

    const removeExisting = (id) => {
        const next = localExisting.filter(i => i.id !== id);
        setLocalExisting(next);
        emit(next, newFiles);
    };

    const removeNew = (idx) => {
        const next = newFiles.slice();
        next.splice(idx, 1);
        setNewFiles(next);
        emit(localExisting, next);
    };

    // Перестановка существующих изображений drag&drop внутри сетки
    const [dragIdx, setDragIdx] = useState(null);
    const onDragStart = (idx) => () => setDragIdx(idx);
    const onDragOver = () => (e) => { e.preventDefault(); };
    const onDropReorder = (idx) => (e) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        const next = localExisting.slice();
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        setLocalExisting(next);
        setDragIdx(null);
        emit(next, newFiles);
    };

    // ===== Lightbox (полноэкранный просмотр) =====
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    // Источник данных для просмотра: сначала существующие, затем новые
    const viewerSources = [
        ...localExisting.map(e => e.url),
        ...newFileUrls,
    ];

    const openViewerAt = (idx) => {
        setViewerIndex(idx);
        setViewerOpen(true);
    };

    const closeViewer = () => setViewerOpen(false);
    const prevViewer = () => setViewerIndex((i) => (i - 1 + viewerSources.length) % viewerSources.length);
    const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerSources.length);

    // Закрываем скролл фона и вешаем hotkeys для стрелок/esc
    useEffect(() => {
        if (!viewerOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKey = (e) => {
            if (e.key === 'Escape') closeViewer();
            if (e.key === 'ArrowLeft') prevViewer();
            if (e.key === 'ArrowRight') nextViewer();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [viewerOpen, viewerSources.length]);

    return (
        <div
            ref={dropRef}
            className="rounded-lg border border-[#D8D8D8] p-3"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={onDrop}
            onPaste={onPaste}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="text-14 text-gray-700">Фото (до 4)</div>
                <div className="text-12 text-gray-500">{totalCount}/4</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {/* существующие */}
                {localExisting.map((img, idx) => (
                    <div
                        key={img.id}
                        className="relative group rounded-md overflow-hidden border border-gray bg-[#fafafa] cursor-zoom-in"
                        draggable
                        onDragStart={onDragStart(idx)}
                        onDragOver={onDragOver(idx)}
                        onDrop={onDropReorder(idx)}
                        title="Перетащите для изменения порядка / Нажмите для просмотра"
                        onClick={() => openViewerAt(idx)}
                    >
                        <img src={img.url} alt="" className="w-full h-20 object-cover" />
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeExisting(img.id); }}
                            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                            title="Удалить"
                        >×</button>
                    </div>
                ))}

                {/* новые (предпросмотр) */}
                {newFiles.map((f, idx) => {
                    const url = newFileUrls[idx] || '';
                    const globalIdx = localExisting.length + idx;
                    return (
                        <div
                            key={`new-${idx}`}
                            className="relative group rounded-md overflow-hidden border border-gray bg-[#fafafa] cursor-zoom-in"
                            title="Нажмите для просмотра"
                            onClick={() => openViewerAt(globalIdx)}
                        >
                            <img src={url} alt="" className="w-full h-20 object-cover" />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeNew(idx); }}
                                className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                                title="Удалить"
                            >×</button>
                        </div>
                    );
                })}

                {/* пустые слоты */}
                {Array.from({ length: Math.max(0, 4 - totalCount) }).map((_, idx) => (
                    <label
                        key={`slot-${idx}`}
                        className="flex items-center justify-center h-20 border border-dashed border-gray rounded-md text-12 text-gray-500 cursor-pointer bg-white hover:bg-gray/10"
                        title="Добавить фото"
                    >
                        + Добавить
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                        />
                    </label>
                ))}
            </div>

            <p className="mt-2 text-12 text-gray-500">
                Перетащи файлы сюда, нажми «+ Добавить», вставь из буфера (Ctrl+V) или меняй порядок перетаскиванием. Нажми на фото, чтобы открыть просмотр.
            </p>

            {/* ===== Полноэкранная модалка просмотра ===== */}
            {viewerOpen && viewerSources.length > 0 && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={(e) => {
                        // закрываем ТОЛЬКО если кликнули именно по подложке
                        if (e.target === e.currentTarget) closeViewer();
                    }}
                >
                    {/* Кнопка закрытия */}
                    <button
                        className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeViewer(); }}
                        aria-label="Закрыть"
                        title="Закрыть (Esc)"
                    >
                        <FaTimes className="w-5 h-5 text-white" />
                    </button>

                    {/* Предыдущий */}
                    {viewerSources.length > 1 && (
                        <button
                            className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevViewer(); }}
                            aria-label="Предыдущее"
                            title="Предыдущее (←)"
                        >
                            <IoChevronBack className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* Следующий */}
                    {viewerSources.length > 1 && (
                        <button
                            className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextViewer(); }}
                            aria-label="Следующее"
                            title="Следующее (→)"
                        >
                            <IoChevronForward className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* Счётчик */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-12"
                        onClick={(e) => e.stopPropagation()}>
                        {viewerIndex + 1} / {viewerSources.length}
                    </div>

                    {/* Картинка */}
                    <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={viewerSources[viewerIndex]}
                            alt=""
                            className="w-auto h-auto max-w-[90vw] max-h-[90vh] object-contain select-none"
                            draggable={false}
                        />
                    </div>
                </div>
            )}

        </div>
    );
}
